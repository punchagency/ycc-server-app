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

/**
 * @swagger
 * /webhook/easypost:
 *   post:
 *     summary: EasyPost webhook endpoint
 *     description: Handles EasyPost webhook events for tracking updates
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
 *       500:
 *         description: Server error
 */