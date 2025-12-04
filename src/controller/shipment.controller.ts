import { Response } from 'express';
import { ShipmentService } from '../service/shipment.service';
import catchError from '../utils/catchError';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class ShipmentController {

    static async getOrderShipments(req: AuthenticatedRequest, res: Response) {
        const { orderId } = req.params;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const [error, shipments] = await catchError(
            ShipmentService.getShipmentsByOrder(orderId, userId)
        );

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(200).json({ success: true, data: shipments });
    }

    static async selectRate(req: AuthenticatedRequest, res: Response) {
        const { shipmentId } = req.params;
        const { rateId } = req.body;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (!rateId) {
            return res.status(400).json({ success: false, message: 'Rate ID is required' });
        }

        const [error, shipment] = await catchError(
            ShipmentService.selectShipmentRate(shipmentId, rateId, userId)
        );

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Rate selected successfully',
            data: shipment 
        });
    }

    static async purchaseLabel(req: AuthenticatedRequest, res: Response) {
        const { shipmentId } = req.params;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const [error, shipment] = await catchError(
            ShipmentService.purchaseShipmentLabel(shipmentId, userId)
        );

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Label purchased successfully',
            data: shipment 
        });
    }
}
