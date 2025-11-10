import { Router } from 'express';
import OrderController from '../controller/order.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/orders', authenticateToken, OrderController.createOrder);
router.get('/crew-orders/confirm/:token', OrderController.confirmOrder);
router.post('/crew-orders/decline/:token', OrderController.declineOrder);
router.patch('/orders/status', authenticateToken, OrderController.updateOrderStatus);

export default router;
