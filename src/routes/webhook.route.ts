import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../webhooks/stripe.webhook';
import { EasypostWebhook } from '../webhooks/easypost.webhook';

const router = Router();

// Stripe webhook - needs raw body for signature verification
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// EasyPost webhook - uses standard JSON
router.post('/easypost', express.json(), EasypostWebhook.handleWebhook);

export default router;