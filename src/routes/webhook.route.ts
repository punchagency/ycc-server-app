import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../webhooks/stripe.webhook';

const router = Router();

// Raw body parser for Stripe webhook signature verification
router.use(express.raw({ type: 'application/json' }));
router.post('/stripe', handleStripeWebhook);

export default router;
