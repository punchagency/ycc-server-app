import { Router } from "express";
import { ManufacturerAnalyticsController } from "../controller/manufacturer-analytics.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/authorization.middleware";

const router = Router();

router.get('/product-count', authenticateToken, requireRole('manufacturer'), ManufacturerAnalyticsController.productCount);
router.get('/active-orders', authenticateToken, requireRole('manufacturer'), ManufacturerAnalyticsController.activeOrderCount);
router.get('/low-stock', authenticateToken, requireRole('manufacturer'), ManufacturerAnalyticsController.lowStockCount);
router.get('/revenue', authenticateToken, requireRole('manufacturer'), ManufacturerAnalyticsController.totalRevenue);
router.get('/popular-products', authenticateToken, requireRole('manufacturer'), ManufacturerAnalyticsController.popularProducts);
router.get('/top-distributors', authenticateToken, requireRole('manufacturer'), ManufacturerAnalyticsController.topDistributors);

export default router;