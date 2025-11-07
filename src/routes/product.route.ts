import { Router } from 'express';
import { ProductController } from '../controller/product.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { fileUploadService, UPLOAD_CONFIGS } from '../utils/fileUpload';

const router = Router();
const productUpload = fileUploadService.createUploadMiddleware(UPLOAD_CONFIGS.PRODUCT_FILES);

// Product CRUD operations
router.post('/', authenticateToken, productUpload, ProductController.createProduct);
router.get('/search', ProductController.searchProducts);
router.get('/business', authenticateToken, ProductController.getBusinessProducts);
router.get('/low-stock', authenticateToken, ProductController.getLowStockProducts);
router.get('/:id', ProductController.getProductById);
router.put('/:id', authenticateToken, productUpload, ProductController.updateProduct);
router.delete('/:id', authenticateToken, ProductController.deleteProduct);
router.patch('/:id/stock', authenticateToken, ProductController.updateStock);

export default router;