/**
 * @swagger
 * /orders:
 *   post:
 *     tags: [Order]
 *     summary: Create a new order
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [deliveryAddress, shippingMethod]
 *             properties:
 *               deliveryAddress:
 *                 type: object
 *                 required: [street, city, state, zip, country]
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zip:
 *                     type: string
 *                   country:
 *                     type: string
 *               shippingMethod:
 *                 type: string
 *                 enum: [standard, express, overnight]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Cart is empty or invalid data
 */

/**
 * @swagger
 * /crew-orders/confirm/{token}:
 *   get:
 *     tags: [Order]
 *     summary: Confirm order with token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order confirmed successfully
 *       400:
 *         description: Invalid or expired token
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /crew-orders/decline/{token}:
 *   post:
 *     tags: [Order]
 *     summary: Decline order with token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order declined successfully
 *       400:
 *         description: Invalid or expired token
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /orders/status:
 *   patch:
 *     tags: [Order]
 *     summary: Update order status
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, status]
 *             properties:
 *               orderId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [confirmed, processing, shipped, out_for_delivery, cancelled]
 *               reason:
 *                 type: string
 *               trackingNumber:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
