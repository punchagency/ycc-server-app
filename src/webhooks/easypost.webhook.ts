import { Request, Response } from 'express';

import catchError from '../utils/catchError';
import { ShipmentService } from '../service/shipment.service';
import { logCritical, logInfo, logError, logWarning } from '../utils/SystemLogs';
import 'dotenv/config';


export class EasypostWebhook {
    /**
     * Validates the EasyPost webhook request
     * Note: EasyPost does NOT use HMAC signatures like Stripe.
     * Instead, we validate using the x-webhook-user-id header to confirm the request
     * is from our EasyPost account. For additional security, you can also restrict
     * IP addresses or use a secret in the webhook URL.
     */
    private static validateWebhookRequest(req: Request): boolean {
        const webhookUserId = req.headers['x-webhook-user-id'] as string;
        const expectedPrefix = 'user_'; // EasyPost user IDs start with 'user_'
        
        // Log the validation attempt
        console.log('🔐 Validating webhook - User ID header:', webhookUserId);
        
        // Basic validation: ensure the webhook has a valid user ID header
        if (!webhookUserId || !webhookUserId.startsWith(expectedPrefix)) {
            logWarning({ 
                message: 'Invalid or missing x-webhook-user-id header', 
                source: 'EasypostWebhook.validateWebhookRequest',
                additionalData: { receivedUserId: webhookUserId }
            });
            return false;
        }
        
        // Optional: If EASYPOST_WEBHOOK_USER_ID is set in env, verify it matches
        const expectedUserId = process.env.EASYPOST_WEBHOOK_USER_ID;
        if (expectedUserId && webhookUserId !== expectedUserId) {
            logError({ 
                message: 'Webhook user ID does not match expected', 
                source: 'EasypostWebhook.validateWebhookRequest',
                error: { received: webhookUserId, expected: expectedUserId }
            });
            return false;
        }
        
        console.log('✅ Webhook validation passed');
        return true;
    }

    static async handleWebhook(req: Request, res: Response) {
        const startTime = Date.now();
        const webhookEvent = req.body;
        const eventType = webhookEvent?.description;
        
        // Console logs for debugging
        // console.log('\n========== EASYPOST WEBHOOK RECEIVED ==========');
        // console.log('Event Type:', eventType || 'unknown');
        // console.log('Body exists:', !!req.body);
        // console.log('Body type:', typeof req.body);
        // console.log('Full payload:', JSON.stringify(webhookEvent, null, 2));
        // console.log('Headers:', JSON.stringify(req.headers, null, 2));
        // console.log('================================================\n');
        
        // Log incoming webhook details
        // logInfo({
        //     message: `📥 EasyPost webhook received: ${eventType || 'unknown'}`,
        //     source: 'EasypostWebhook.handleWebhook',
        //     additionalData: {
        //         mode: webhookEvent?.mode,
        //         objectType: webhookEvent?.object,
        //         trackingCode: webhookEvent?.result?.tracking_code,
        //         status: webhookEvent?.result?.status
        //     }
        // });

        // Validate webhook payload structure
        if (!webhookEvent || !eventType) {
            // console.error('❌ Invalid webhook payload - body:', req.body);
            logError({ message: 'Invalid webhook payload - missing event description', source: 'EasypostWebhook.handleWebhook', error: { body: req.body } });
            return res.status(400).json({ success: false, message: 'Invalid webhook event: missing description' });
        }

        // Validate webhook request (using x-webhook-user-id header)
        if (!EasypostWebhook.validateWebhookRequest(req)) {
            console.error('❌ Invalid webhook request');
            return res.status(401).json({ success: false, message: 'Invalid webhook request' });
        }

        const eventHandlers: Record<string, () => Promise<void>> = {
            'tracker.created': async () => {
                const result = webhookEvent.result;
                if (!result?.tracking_code || !result?.status) throw new Error('Missing tracking data');
                logInfo({ message: `Processing tracker.created: ${result.tracking_code} (${result.status})`, source: 'EasypostWebhook.handleWebhook' });
                await ShipmentService.processTrackingWebhook(result.tracking_code, result.status, result);
            },
            'tracker.updated': async () => {
                const result = webhookEvent.result;
                if (!result?.tracking_code || !result?.status) throw new Error('Missing tracking data');
                logInfo({ message: `Processing tracker.updated: ${result.tracking_code} (${result.status})`, source: 'EasypostWebhook.handleWebhook' });
                await ShipmentService.processTrackingWebhook(result.tracking_code, result.status, result);
            },
            'batch.created': async () => {
                logInfo({ message: `Batch created: ${webhookEvent.result?.id}`, source: 'EasypostWebhook.handleWebhook' });
            },
            'batch.updated': async () => {
                logInfo({ message: `Batch updated: ${webhookEvent.result?.id} (State: ${webhookEvent.result?.state})`, source: 'EasypostWebhook.handleWebhook' });
            },
            'batch.purchased': async () => {
                logInfo({ message: `Batch purchased: ${webhookEvent.result?.id}`, source: 'EasypostWebhook.handleWebhook' });
            },
            'shipment.created': async () => {
                logInfo({ message: `Shipment created: ${webhookEvent.result?.id}`, source: 'EasypostWebhook.handleWebhook' });
            },
            'shipment.updated': async () => {
                logInfo({ message: `Shipment updated: ${webhookEvent.result?.id}`, source: 'EasypostWebhook.handleWebhook' });
            },
            'shipment.rates_updated': async () => {
                logInfo({ message: `Shipment rates updated: ${webhookEvent.result?.id}`, source: 'EasypostWebhook.handleWebhook' });
            }
        };

        const handler = eventHandlers[eventType];
        
        if (handler) {
            const [error] = await catchError(handler());
            
            if (error) {
                const duration = Date.now() - startTime;
                logCritical({ 
                    message: `Webhook processing failed: ${eventType}`, 
                    source: 'EasypostWebhook.handleWebhook', 
                    error,
                    additionalData: { duration, trackingCode: webhookEvent.result?.tracking_code }
                });
                return res.status(500).json({ success: false, message: error.message });
            }
        } else {
            logWarning({ message: `Unhandled webhook event: ${eventType}`, source: 'EasypostWebhook.handleWebhook' });
        }

        const duration = Date.now() - startTime;
        logInfo({ message: `✅ EasyPost webhook processed: ${eventType} (${duration}ms)`, source: 'EasypostWebhook.handleWebhook' });
        return res.status(200).json({ success: true });
    }
}