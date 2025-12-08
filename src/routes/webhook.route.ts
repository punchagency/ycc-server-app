import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../webhooks/stripe.webhook';
import { EasypostWebhook } from '../webhooks/easypost.webhook';

const router = Router();

router.post('/easypost', EasypostWebhook.handleWebhook)
// Raw body parser for Stripe webhook signature verification
router.use(express.raw({ type: 'application/json' }));
router.post('/stripe', handleStripeWebhook);

export default router;
