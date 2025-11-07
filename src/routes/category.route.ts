import { Router } from 'express';
import { CategoryController } from '../controller/category.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { fileUploadService, UPLOAD_CONFIGS } from '../integration/fileUpload';

const router = Router();
const categoryUpload = fileUploadService.createUploadMiddleware(UPLOAD_CONFIGS.CATEGORY_FILES);

router.post('/', authenticateToken, categoryUpload, CategoryController.createCategory);
router.get('/', CategoryController.getAllCategories);
router.get('/:id', CategoryController.getCategoryById);
router.put('/:id', authenticateToken, categoryUpload, CategoryController.updateCategory);
router.delete('/:id', authenticateToken, CategoryController.deleteCategory);

export default router;