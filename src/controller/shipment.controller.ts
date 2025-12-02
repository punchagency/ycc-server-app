import { Response, Request } from 'express';
import { ShipmentService } from '../service/shipment.service';
import catchError from '../utils/catchError';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logCritical, logInfo } from '../utils/SystemLogs';

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

    static async handleWebhook(req: Request, res: Response) {
        const webhookEvent = req.body;
        const eventType = webhookEvent.description;

        logInfo({message: `📥 EasyPost webhook received: ${eventType}`, source: "ShipmentController.handleWebhook"});

        if (!eventType) {
            return res.status(400).json({ success: false, message: 'Invalid webhook event' });
        }

        const eventHandlers: Record<string, () => Promise<void>> = {
            'tracker.created': async () => {
                const result = webhookEvent.result;
                if (!result?.tracking_code || !result?.status) throw new Error('Missing tracking data');
                await ShipmentService.processTrackingWebhook(result.tracking_code, result.status, result);
            },
            'tracker.updated': async () => {
                const result = webhookEvent.result;
                if (!result?.tracking_code || !result?.status) throw new Error('Missing tracking data');
                await ShipmentService.processTrackingWebhook(result.tracking_code, result.status, result);
            },
            'batch.created': async () => {
                console.log('Batch created:', webhookEvent.result?.id);
            },
            'batch.updated': async () => {
                console.log('Batch updated:', webhookEvent.result?.id, 'State:', webhookEvent.result?.state);
            },
            'batch.purchased': async () => {
                console.log('Batch purchased:', webhookEvent.result?.id);
            },
            'shipment.created': async () => {
                console.log('Shipment created:', webhookEvent.result?.id);
            },
            'shipment.updated': async () => {
                console.log('Shipment updated:', webhookEvent.result?.id);
            },
            'shipment.rates_updated': async () => {
                console.log('Shipment rates updated:', webhookEvent.result?.id);
            }
        };

        const handler = eventHandlers[eventType];
        
        if (handler) {
            const [error] = await catchError(handler());
            
            if (error) {
                console.error(`Webhook processing error for ${eventType}:`, error);
                await logCritical({ 
                    message: `Webhook processing failed: ${eventType}`, 
                    source: 'ShipmentController.handleWebhook', 
                    error 
                });
                return res.status(500).json({ success: false, message: error.message });
            }
        } else {
            console.log(`Unhandled webhook event: ${eventType}`);
        }

        return res.status(200).json({ success: true });
    }
}
