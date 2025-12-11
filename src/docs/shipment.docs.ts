/**
 * @swagger
 * /api/v2/shipments/order/{orderId}:
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
 * /api/v2/shipments/purchase-label:
 *   post:
 *     summary: Purchase shipping labels for multiple shipments and create invoice
 *     tags: [Shipments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - selections
 *             properties:
 *               selections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - shipmentId
 *                     - rateId
 *                   properties:
 *                     shipmentId:
 *                       type: string
 *                       description: ID of the shipment
 *                     rateId:
 *                       type: string
 *                       description: ID of the selected rate
 *           example:
 *             selections:
 *               - shipmentId: "507f1f77bcf86cd799439011"
 *                 rateId: "rate_abc123"
 *               - shipmentId: "507f1f77bcf86cd799439012"
 *                 rateId: "rate_def456"
 *     responses:
 *       200:
 *         description: Labels purchased successfully with invoice created
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
 *                     status:
 *                       type: boolean
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           shipmentId:
 *                             type: string
 *                           success:
 *                             type: boolean
 *                           trackingCode:
 *                             type: string
 *                           labelUrl:
 *                             type: string
 *                           message:
 *                             type: string
 *                           errorCode:
 *                             type: string
 *                     invoiceUrl:
 *                       type: string
 *                     labelsPurchased:
 *                       type: boolean
 *       400:
 *         description: Invalid request or label purchase failed
 *       401:
 *         description: Unauthorized
 */