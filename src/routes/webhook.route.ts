import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../webhooks/stripe.webhook';

const router = Router();

// Raw body parser for Stripe webhook signature verification
router.use(express.raw({ type: 'application/json' }));

/**
 * @swagger
 * /webhook/stripe:
 *   post:
 *     summary: Stripe webhook endpoint
 *     description: Handles Stripe webhook events for payment processing
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 *       500:
 *         description: Server error
 */
router.post('/stripe', (req, _res, next) => {
    // Store raw body for signature verification
    (req as any).rawBody = req.body;
    next();
}, handleStripeWebhook);

export default router;
