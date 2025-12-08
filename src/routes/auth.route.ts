import { Router } from 'express';
import { AuthController } from '../controller/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/security.middleware';
import { fileUploadService } from '../integration/fileUpload';

const router = Router();

const uploadProfilePicture = fileUploadService.createUploadMiddleware([{ name: 'profilePicture', maxCount: 1 }]);

// Public routes
router.post('/register', authRateLimit, uploadProfilePicture, AuthController.register);
router.post('/login', authRateLimit, AuthController.login);
router.post('/refresh-token', authRateLimit, AuthController.refreshToken);
router.post('/activate-account', authRateLimit, AuthController.activateAccount);
router.post('/resend-activation-code', authRateLimit, AuthController.resendActivationCode);
router.post('/forgot-password', authRateLimit, AuthController.forgotPassword);
router.post('/reset-password', authRateLimit, AuthController.resetPassword);
router.post('/resend-reset-code', authRateLimit, AuthController.resendResetPasswordCode);

// Protected routes
router.post('/logout', authenticateToken, AuthController.logout);
router.post('/change-password', authenticateToken, AuthController.changePassword);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, uploadProfilePicture, AuthController.updateProfile);
router.put('/distributor-profile', authenticateToken, AuthController.updateDistributorProfile);

export default router;