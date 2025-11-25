import { Response } from 'express';
import { DocumentService } from '../service/document.service';
import catchError from '../utils/catchError';
import Validate from '../utils/Validate';
import { DOCUMENT_CATEGORIES } from '../models/document.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class DocumentController {
    static async uploadDocument(req: AuthenticatedRequest, res: Response) {
        const { category, businessId } = req.body;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        if (!category || !Validate.oneOf({value: category, allowedValues: DOCUMENT_CATEGORIES as any})) {
            return res.status(400).json({
                success: false,
                message: `Invalid category. Allowed: ${DOCUMENT_CATEGORIES.join(', ')}`,
                code: 'VALIDATION_ERROR'
            });
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (!files?.document?.[0]) {
            return res.status(400).json({ success: false, message: 'No document file uploaded', code: 'VALIDATION_ERROR' });
        }

        const [error, document] = await catchError(
            DocumentService.uploadDocument(userId, category, files.document[0], businessId)
        );

        if (error) {
            return res.status(500).json({ success: false, message: error.message, code: 'UPLOAD_ERROR' });
        }

        return res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: document
        });
    }

    static async getDocumentByCategory(req: AuthenticatedRequest, res: Response) {
        const { category } = req.params;
        const { page = '1', limit = '10', businessId } = req.query;
        const userId = req.user?._id;
        const isAdmin = req.user?.role === 'admin';

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        if (!category || !Validate.oneOf({value: category, allowedValues: DOCUMENT_CATEGORIES as any})) {
            return res.status(400).json({
                success: false,
                message: `Invalid category. Allowed: ${DOCUMENT_CATEGORIES.join(', ')}`,
                code: 'VALIDATION_ERROR'
            });
        }

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);

        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, message: 'Invalid page number', code: 'VALIDATION_ERROR' });
        }

        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({ success: false, message: 'Invalid limit (1-100)', code: 'VALIDATION_ERROR' });
        }

        const [error, result] = await catchError(
            DocumentService.getDocumentByCategory(
                userId,
                category,
                pageNum,
                limitNum,
                isAdmin,
                businessId as string | undefined
            )
        );

        if (error) {
            return res.status(500).json({ success: false, message: error.message, code: 'FETCH_ERROR' });
        }

        return res.status(200).json({
            success: true,
            message: 'Documents retrieved successfully',
            data: result.documents,
            pagination: result.pagination
        });
    }

    static async deleteDocument(req: AuthenticatedRequest, res: Response) {
        const { documentId } = req.params;
        const userId = req.user?._id;
        const isAdmin = req.user?.role === 'admin';

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        if (!documentId) {
            return res.status(400).json({ success: false, message: 'Document ID is required', code: 'VALIDATION_ERROR' });
        }

        const [error] = await catchError(
            DocumentService.deleteDocument(documentId, userId, isAdmin)
        );

        if (error) {
            if (error.message === 'Document not found') {
                return res.status(404).json({ success: false, message: error.message, code: 'NOT_FOUND' });
            }
            return res.status(500).json({ success: false, message: error.message, code: 'DELETE_ERROR' });
        }

        return res.status(200).json({
            success: true,
            message: 'Document deleted successfully'
        });
    }

    static async getDocumentDownloadUrl(req: AuthenticatedRequest, res: Response) {
        const { documentId } = req.params;
        const userId = req.user?._id;
        const isAdmin = req.user?.role === 'admin';

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        if (!documentId) {
            return res.status(400).json({ success: false, message: 'Document ID is required', code: 'VALIDATION_ERROR' });
        }

        const [error, result] = await catchError(
            DocumentService.getDocumentDownloadUrl(documentId, userId, isAdmin)
        );

        if (error) {
            if (error.message === 'Document not found') {
                return res.status(404).json({ success: false, message: error.message, code: 'NOT_FOUND' });
            }
            return res.status(500).json({ success: false, message: error.message, code: 'DOWNLOAD_ERROR' });
        }

        return res.status(200).json({
            success: true,
            message: 'Download URL generated successfully',
            data: {
                url: result.url,
                expiresIn: 3600,
                document: result.document
            }
        });
    }

    static async getDocumentCountsByCategory(req: AuthenticatedRequest, res: Response) {
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        const [error, counts] = await catchError(
            DocumentService.getDocumentCountsByCategory(userId)
        );

        if (error) {
            return res.status(500).json({ success: false, message: error.message, code: 'FETCH_ERROR' });
        }

        return res.status(200).json({
            success: true,
            message: 'Document counts retrieved successfully',
            data: counts
        });
    }
}