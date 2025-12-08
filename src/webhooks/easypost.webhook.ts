import { Request, Response } from 'express';
import catchError from '../utils/catchError';
import { ShipmentService } from '../service/shipment.service';
import { logCritical, logInfo } from '../utils/SystemLogs';


export class EasypostWebhook {
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