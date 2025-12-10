import { Router } from 'express';
import { ShipmentController } from '../controller/shipment.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/order/:orderId', authenticateToken, ShipmentController.getOrderShipments);
router.post('/:shipmentId/select-rate', authenticateToken, ShipmentController.selectRate);
router.post('/purchase-label', authenticateToken, ShipmentController.purchaseLabel);

export default router;
