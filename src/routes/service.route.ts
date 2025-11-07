import { Router } from 'express';
import { ServiceController } from '../controller/service.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { fileUploadService, UPLOAD_CONFIGS } from '../integration/fileUpload'

const router = Router();

router.post(
    '/',
    authenticateToken,
    fileUploadService.createUploadMiddleware(UPLOAD_CONFIGS.SERVICE_FILES),
    ServiceController.createService
);

router.get('/business', authenticateToken, ServiceController.getBusinessServices);

router.get('/:id', authenticateToken, ServiceController.getService);

router.put(
    '/:id',
    authenticateToken,
    fileUploadService.createUploadMiddleware(UPLOAD_CONFIGS.SERVICE_FILES),
    ServiceController.updateService
);

router.delete('/:id', authenticateToken, ServiceController.deleteService);

export default router;
