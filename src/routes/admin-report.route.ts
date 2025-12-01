import { Router } from 'express';
import { AdminReportController } from '../controller/admin-report.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/authorization.middleware';

const router = Router();
const controller = new AdminReportController();

router.get('/revenue', authenticateToken, requireRole('admin'), controller.getRevenueStats);
router.get('/active-users', authenticateToken, requireRole('admin'), controller.getActiveUsersStats);
router.get('/inventory-health', authenticateToken, requireRole('admin'), controller.getInventoryHealthStats);
router.get('/booking-performance', authenticateToken, requireRole('admin'), controller.getBookingPerformanceStats);
router.get('/charts', authenticateToken, requireRole('admin'), controller.getReportsCharts);

export default router;
