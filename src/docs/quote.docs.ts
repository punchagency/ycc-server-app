/**
 * @swagger
 * /api/v2/quote/{id}/approve:
 *   post:
 *     tags: [Quote]
 *     summary: Approve quote and proceed with payment
 *     description: Approve a quote and create a Stripe invoice for payment. The invoice will be created in the quote's currency, with service items converted to the quote currency if needed.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote ID
 *     responses:
 *       200:
 *         description: Quote approved and payment initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     quote:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                           description: Total amount in quote currency
 *                         platformFee:
 *                           type: number
 *                           description: Platform fee (5%) in quote currency
 *                         currency:
 *                           type: string
 *                           description: Quote currency code
 *                           example: usd
 *                     invoiceUrl:
 *                       type: string
 *                       description: Stripe hosted invoice URL
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/v2/quote/{id}/decline:
 *   post:
 *     tags: [Quote]
 *     summary: Decline a quote
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Quote declined successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quote not found
 */
