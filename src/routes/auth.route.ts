import { Router } from 'express';
import { AuthController } from '../controller/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { fileUploadService } from '../integration/fileUpload';

const router = Router();

const uploadProfilePicture = fileUploadService.createUploadMiddleware([{ name: 'profilePicture', maxCount: 1 }]);

// Public routes
router.post('/register', uploadProfilePicture, AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/activate-account', AuthController.activateAccount);
router.post('/resend-activation-code', AuthController.resendActivationCode);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/resend-reset-code', AuthController.resendResetPasswordCode);

// Protected routes
router.post('/logout', authenticateToken, AuthController.logout);
router.post('/change-password', authenticateToken, AuthController.changePassword);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, uploadProfilePicture, AuthController.updateProfile);
router.put('/distributor-profile', authenticateToken, AuthController.updateDistributorProfile);

export default router;