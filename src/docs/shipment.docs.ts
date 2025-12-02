/**
 * @swagger
 * /api/shipments/order/{orderId}:
 *   get:
 *     summary: Get all shipments for an order
 *     tags: [Shipments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipments retrieved successfully
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/select-rate:
 *   post:
 *     summary: Select shipping rate for a shipment
 *     tags: [Shipments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rateId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rate selected successfully
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/purchase-label:
 *   post:
 *     summary: Purchase shipping label
 *     tags: [Shipments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Label purchased successfully
 */

/**
 * @swagger
 * /api/shipments/webhook:
 *   post:
 *     summary: EasyPost webhook endpoint for tracking updates
 *     tags: [Shipments]
 *     responses:
 *       200:
 *         description: Webhook processed
 */