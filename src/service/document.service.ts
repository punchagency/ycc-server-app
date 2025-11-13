import DocumentModel, { DOCUMENT_CATEGORIES } from '../models/document.model';
import { fileUploadService } from '../integration/fileUpload';
import catchError from '../utils/catchError';
import { logInfo, logError } from '../utils/SystemLogs';
import { saveAuditLog } from '../utils/SaveAuditlogs';

export class DocumentService {
    static async uploadDocument(
        userId: string,
        category: string,
        file: any,
        businessId?: string
    ) {
        if (!DOCUMENT_CATEGORIES.includes(category as any)) {
            throw new Error(`Invalid category. Allowed: ${DOCUMENT_CATEGORIES.join(', ')}`);
        }

        const document = new DocumentModel({
            userId,
            businessId,
            category,
            filename: file.key,
            originalName: file.originalname,
            fileUrl: file.location,
            fileSize: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date()
        });

        const [error, savedDoc] = await catchError(document.save());
        if (error) {
            await fileUploadService.deleteFile(file.key);
            throw error;
        }

        await saveAuditLog({
            userId,
            action: 'DOCUMENT_UPLOAD',
            entityType: 'user',
            entityId: savedDoc._id.toString(),
            newValues: { category, filename: file.originalname }
        });

        await logInfo({
            message: 'Document uploaded successfully',
            source: 'DocumentService.uploadDocument',
            additionalData: { documentId: savedDoc._id, category }
        });

        return savedDoc;
    }

    static async getDocumentByCategory(
        userId: string,
        category: string,
        page: number = 1,
        limit: number = 10,
        isAdmin: boolean = false,
        businessId?: string
    ) {
        if (!DOCUMENT_CATEGORIES.includes(category as any)) {
            throw new Error(`Invalid category. Allowed: ${DOCUMENT_CATEGORIES.join(', ')}`);
        }

        const query: any = { category };
        
        if (!isAdmin) {
            query.userId = userId;
        }
        
        if (businessId) {
            query.businessId = businessId;
        }

        const skip = (page - 1) * limit;

        const [error, result] = await catchError(
            Promise.all([
                DocumentModel.find(query)
                    .sort({ uploadedAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .select('-__v')
                    .lean(),
                DocumentModel.countDocuments(query)
            ])
        );

        if (error) throw error;

        const [documents, total] = result;

        return {
            documents,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        };
    }

    static async deleteDocument(
        documentId: string,
        userId: string,
        isAdmin: boolean = false
    ) {
        const query: any = { _id: documentId };
        if (!isAdmin) {
            query.userId = userId;
        }

        const [findError, document] = await catchError(DocumentModel.findOne(query));
        if (findError) throw findError;
        if (!document) throw new Error('Document not found');

        const [deleteError] = await catchError(fileUploadService.deleteFile(document.filename));
        if (deleteError) {
            await logError({
                message: 'Failed to delete file from S3',
                source: 'DocumentService.deleteDocument',
                additionalData: { documentId, error: deleteError.message }
            });
        }

        const [dbError] = await catchError(DocumentModel.deleteOne({ _id: documentId }));
        if (dbError) throw dbError;

        await saveAuditLog({
            userId,
            action: 'DOCUMENT_DELETE',
            entityType: 'user',
            entityId: documentId,
            oldValues: { filename: document.originalName }
        });

        await logInfo({
            message: 'Document deleted successfully',
            source: 'DocumentService.deleteDocument',
            additionalData: { documentId }
        });

        return true;
    }

    static async getDocumentDownloadUrl(
        documentId: string,
        userId: string,
        isAdmin: boolean = false
    ) {
        const query: any = { _id: documentId };
        if (!isAdmin) {
            query.userId = userId;
        }

        const [error, document] = await catchError(DocumentModel.findOne(query));
        if (error) throw error;
        if (!document) throw new Error('Document not found');

        const url = await fileUploadService.generatePresignedUrl(document.filename, 3600);
        if (!url) throw new Error('Failed to generate download URL');

        return { url, document };
    }
}