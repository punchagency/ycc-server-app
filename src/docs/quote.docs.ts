/**
 * @swagger
 * /api/v2/quote/{id}/approve:
 *   post:
 *     tags: [Quote]
 *     summary: Approve quote and proceed with payment
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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quote not found
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
