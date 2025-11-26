import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { AdminAnalyticsController } from '../controller/admin-analytics.controller';

const router = Router();

router.get('/users-total', authenticateToken, AdminAnalyticsController.getUsersTotal);
router.get('/orders-over-time', authenticateToken, AdminAnalyticsController.getTotalOrderOverTime);
router.get('/invoices-by-status', authenticateToken, AdminAnalyticsController.getTotalInvoicesByStatus);
router.get('/user-growth', authenticateToken, AdminAnalyticsController.getUserGrowthOverTime);
router.get('/top-users', authenticateToken, AdminAnalyticsController.getTopUsers);
router.get('/top-distributors', authenticateToken, AdminAnalyticsController.getTopDistributors);
router.get('/top-manufacturers', authenticateToken, AdminAnalyticsController.getTopManufacturers);

export default router;