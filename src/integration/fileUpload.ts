import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer, { FileFilterCallback } from 'multer';
import multerS3 from 'multer-s3';
import { Request } from 'express';
import path from 'path';
import crypto from 'crypto';
import { logError, logInfo } from '../utils/SystemLogs';
import catchError from '../utils/catchError';
import 'dotenv/config';

interface IFileUploadConfig {
    maxFileSize: number;
    allowedMimeTypes: string[];
    maxCount: number;
}

interface IUploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    bucket: string;
    key: string;
    location: string;
    etag: string;
}

interface IFileUploadResult {
    success: boolean;
    files?: { [fieldname: string]: IUploadedFile[] };
    error?: string;
}

class FileUploadService {
    private s3Client: S3Client;
    private bucketName: string;

    private readonly FILE_CONFIGS: Record<string, IFileUploadConfig> = {
        profilePicture: {
            maxFileSize: 5 * 1024 * 1024, // 5MB
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
            maxCount: 1
        },
        cv: {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            maxCount: 1
        },
        document: {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            maxCount: 20
        },
        certificationFiles: {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
            maxCount: 5
        },
        licenseFile: {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
            maxCount: 1
        },
        liabilityInsurance: {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
            maxCount: 1
        },
        inventoryImage: {
            maxFileSize: 5 * 1024 * 1024, // 5MB
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
            maxCount: 10
        },
        productImage: {
            maxFileSize: 5 * 1024 * 1024, // 5MB
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
            maxCount: 10
        },
        serviceImage: {
            maxFileSize: 5 * 1024 * 1024, // 5MB
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
            maxCount: 10
        },
        categoryImage: {
            maxFileSize: 5 * 1024 * 1024, // 5MB
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
            maxCount: 1
        },
        attachments: {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            maxCount: 10
        }
    };

    constructor() {
        this.bucketName = process.env.AWS_BUCKET_NAME || '';

        if (!this.bucketName) {
            throw new Error('AWS_BUCKET_NAME environment variable is required');
        }

        this.s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
        });
    }

    private generateFileName(originalName: string): string {
        const ext = path.extname(originalName);
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        return `${timestamp}-${randomString}${ext}`;
    }

    private fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
        const config = this.FILE_CONFIGS[file.fieldname];

        if (!config) {
            cb(new Error(`Unsupported field: ${file.fieldname}`));
            return;
        }

        if (!config.allowedMimeTypes.includes(file.mimetype)) {
            cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${config.allowedMimeTypes.join(', ')}`));
            return;
        }

        cb(null, true);
    };

    public createUploadMiddleware(fieldConfigs: Array<{ name: string; maxCount?: number }>) {
        return multer({
            storage: multerS3({
                s3: this.s3Client,
                bucket: this.bucketName,
                contentType: multerS3.AUTO_CONTENT_TYPE,
                key: (_req: Request, file: Express.Multer.File, cb) => {
                    const fileName = this.generateFileName(file.originalname);
                    const key = `${file.fieldname}/${fileName}`;
                    cb(null, key);
                },
                metadata: (req: Request, file: Express.Multer.File, cb) => {
                    cb(null, {
                        originalName: file.originalname,
                        uploadedBy: (req as any).user?._id || 'anonymous',
                        uploadedAt: new Date().toISOString()
                    });
                }
            }),
            fileFilter: this.fileFilter,
            limits: {
                fileSize: Math.max(...Object.values(this.FILE_CONFIGS).map(config => config.maxFileSize))
            }
        }).fields(fieldConfigs.map(config => ({
            name: config.name,
            maxCount: config.maxCount || this.FILE_CONFIGS[config.name]?.maxCount || 1
        })));
    }

    public async deleteFile(key: string): Promise<boolean> {
        const [error] = await catchError(
            this.s3Client.send(new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key
            }))
        );

        if (error) {
            await logError({
                message: `Failed to delete file: ${key}`,
                source: 'FileUploadService.deleteFile',
                additionalData: { key, error: error.message }
            });
            return false;
        }

        await logInfo({
            message: `File deleted successfully: ${key}`,
            source: 'FileUploadService.deleteFile',
            additionalData: { key }
        });

        return true;
    }

    public async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
        const [error, url] = await catchError(
            getSignedUrl(this.s3Client, new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key
            }), { expiresIn })
        );

        if (error) {
            await logError({
                message: `Failed to generate presigned URL for: ${key}`,
                source: 'FileUploadService.generatePresignedUrl',
                additionalData: { key, error: error.message }
            });
            return null;
        }

        return url;
    }

    public getFileConfig(fieldName: string): IFileUploadConfig | null {
        return this.FILE_CONFIGS[fieldName] || null;
    }

    public validateFileSize(fieldName: string, fileSize: number): boolean {
        const config = this.FILE_CONFIGS[fieldName];
        return config ? fileSize <= config.maxFileSize : false;
    }

    public validateMimeType(fieldName: string, mimeType: string): boolean {
        const config = this.FILE_CONFIGS[fieldName];
        return config ? config.allowedMimeTypes.includes(mimeType) : false;
    }
};

// Export singleton instance
export const fileUploadService = new FileUploadService();

// Common upload configurations
export const UPLOAD_CONFIGS = {
    CREW_FILES: [
        { name: 'profilePicture', maxCount: 1 },
        { name: 'cv', maxCount: 1 },
        { name: 'certificationFiles', maxCount: 5 },
        { name: 'document', maxCount: 20 }
    ],
    VENDOR_FILES: [
        { name: 'licenseFile', maxCount: 1 },
        { name: 'liabilityInsurance', maxCount: 1 }
    ],
    PRODUCT_FILES: [
        { name: 'productImage', maxCount: 10 },
        { name: 'inventoryImage', maxCount: 10 }
    ],
    SERVICE_FILES: [
        { name: 'serviceImage', maxCount: 10 }
    ],
    CATEGORY_FILES: [
        { name: 'categoryImage', maxCount: 1 }
    ],
    BOOKING_FILES: [
        { name: 'attachments', maxCount: 10 }
    ]
};

export { FileUploadService, IUploadedFile, IFileUploadResult };
export default fileUploadService;