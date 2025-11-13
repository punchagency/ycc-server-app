import { Router } from "express";
import { DocumentController } from "../controller/document.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { fileUploadService } from "../integration/fileUpload";

const router = Router();

router.post(
    '/upload',
    authenticateToken,
    fileUploadService.createUploadMiddleware([{ name: 'document', maxCount: 1 }]),
    DocumentController.uploadDocument
);

router.get(
    '/category/:category',
    authenticateToken,
    DocumentController.getDocumentByCategory
);

router.delete(
    '/:documentId',
    authenticateToken,
    DocumentController.deleteDocument
);

router.get(
    '/:documentId/download',
    authenticateToken,
    DocumentController.getDocumentDownloadUrl
);

export default router;