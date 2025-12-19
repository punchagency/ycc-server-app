import { Router } from 'express';
import OrderController from '../controller/order.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticateToken, OrderController.createOrder);
router.get('/', authenticateToken, OrderController.getOrders);
router.get('/:id', authenticateToken, OrderController.getOrderById);
router.get('/confirm/:token', OrderController.confirmOrder);
router.post('/decline/:token', OrderController.declineOrder);
router.patch('/status', authenticateToken, OrderController.updateUserOrderStatus);
router.patch('/distributor-status', authenticateToken, OrderController.updateDistributorOrderStatus);

export default router;
