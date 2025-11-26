import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { DistributorAnalyticsController } from "../controller/distributor-analytics.controller";

const router = Router();

router.get('/total-products', authenticateToken, DistributorAnalyticsController.getTotalProducts);
router.get('/total-services', authenticateToken, DistributorAnalyticsController.getTotalServices);
router.get('/low-stock-items', authenticateToken, DistributorAnalyticsController.getLowStockItemsNumber);
router.get('/customer-rating', authenticateToken, DistributorAnalyticsController.getCustomerRating);
router.get('/active-orders', authenticateToken, DistributorAnalyticsController.getActiveOrdersNumber);
router.get('/total-bookings', authenticateToken, DistributorAnalyticsController.getTotalBookings);
router.get('/popular-services', authenticateToken, DistributorAnalyticsController.getPopularServicesNumber);
router.get('/popular-products', authenticateToken, DistributorAnalyticsController.getPopularProductsNumber);
router.get('/total-revenue', authenticateToken, DistributorAnalyticsController.getTotalRevenue);

export default router;