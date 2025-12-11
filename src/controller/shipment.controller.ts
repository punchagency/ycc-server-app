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

    static async purchaseLabel(req: AuthenticatedRequest, res: Response) {
        const userId = req.user?._id;
        const { selections } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (!selections || !Array.isArray(selections) || selections.length === 0) {
            return res.status(400).json({ success: false, message: 'Selections array is required' });
        }

        const [error, result] = await catchError(
            ShipmentService.purchaseShipmentLabel(selections, userId)
        );

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(200).json({ 
            success: result.labelsPurchased ? true : false, 
            message: result.labelsPurchased ? 'Labels purchased successfully' : 'Some labels failed to purchase',
            data: result
        });
    }
}
