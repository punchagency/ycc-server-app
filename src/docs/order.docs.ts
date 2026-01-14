/**
 * @swagger
 * /api/v2/order:
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
 *             required: [products, deliveryAddress]
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       minimum: 1
 *                     discount:
 *                       type: number
 *               deliveryAddress:
 *                 type: object
 *                 required: [street, zipcode, city, state, country]
 *                 properties:
 *                   street:
 *                     type: string
 *                   zipcode:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *               estimatedDeliveryDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *       400:
 *         description: Validation error or order creation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 */

/**
 * @swagger
 * /api/v2/order/confirm/{token}:
 *   get:
 *     tags: [Order]
 *     summary: Confirm order with token (returns HTML page)
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Order confirmation token
 *     responses:
 *       200:
 *         description: HTML page showing confirmation success or failure
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       500:
 *         description: Internal server error (HTML page)
 */

/**
 * @swagger
 * /api/v2/order/decline/{token}:
 *   post:
 *     tags: [Order]
 *     summary: Decline order with token (returns HTML page)
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Order confirmation token
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Optional reason for declining the order
 *     responses:
 *       200:
 *         description: HTML page showing decline success or failure
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       500:
 *         description: Internal server error (HTML page)
 */

/**
 * @swagger
 * /api/v2/order/status:
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
 *                 description: Order ID to update
 *               status:
 *                 type: string
 *                 enum: [confirmed, processing, shipped, out_for_delivery, cancelled, declined]
 *                 description: New status for the order
 *               reason:
 *                 type: string
 *                 description: Optional reason for status change
 *               trackingNumber:
 *                 type: string
 *                 description: Optional tracking number (for shipped status)
 *               notes:
 *                 type: string
 *                 description: Optional notes about the status change
 *               enableShipping:
 *                 type: boolean
 *                 description: Enable platform shipping (distributors only, when confirming)
 *               shipmentCost:
 *                 type: number
 *                 description: Shipment cost when enableShipping is false (distributors only)
 *               itemPrices:
 *                 type: array
 *                 description: Prices for items without prices (distributors only, when confirming). All items must use the same currency.
 *                 items:
 *                   type: object
 *                   required: [itemId, price, currency]
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       description: Order item ID
 *                     price:
 *                       type: number
 *                       description: Price per item (must be greater than 0)
 *                     currency:
 *                       type: string
 *                       description: Currency code (e.g., USD, EUR, GBP)
 *     responses:
 *       200:
 *         description: Order status updated successfully
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
 *       400:
 *         description: Validation error or update failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 */

/**
 * @swagger
 * /api/v2/order:
 *   get:
 *     tags: [Order]
 *     summary: Get all orders with filters and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, declined, confirmed, processing, out_for_delivery, shipped, delivered, cancelled]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [paid, pending, failed]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, status, paymentStatus, totalAmount]
 *           default: createdAt
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [user, distributor]
 *         description: Filter by order type (distributors only - 'user' for orders from users, 'distributor' for orders to manufacturers)
 *     responses:
 *       200:
 *         description: Orders fetched successfully
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
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       400:
 *         description: Validation error or fetch failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 */

/**
 * @swagger
 * /api/v2/order/{id}:
 *   get:
 *     tags: [Order]
 *     summary: Get order by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order fetched successfully
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
 *       400:
 *         description: Invalid order ID or fetch failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 */

/**
 * @swagger
 * /api/v2/order/distributor-status:
 *   patch:
 *     tags: [Order]
 *     summary: Update distributor order status (for distributor-to-manufacturer orders)
 *     description: Allows distributors to cancel their orders to manufacturers, and manufacturers to update order status (confirm, process, ship, etc.) with optional platform shipping
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
 *                 description: Order ID to update
 *               status:
 *                 type: string
 *                 enum: [confirmed, processing, shipped, out_for_delivery, cancelled]
 *                 description: New status for the order
 *               enableShipping:
 *                 type: boolean
 *                 description: Enable platform shipping system (only for manufacturers when confirming orders). If false, manufacturer handles shipping externally.
 *               shipmentCost:
 *                  type: number
 *                  description: Shipment cost for the order (only for manufacturers when confirming orders). If not provided, manufacturer handles shipping externally.
 *               reason:
 *                 type: string
 *                 description: Optional reason for status change (especially for cancellations)
 *               notes:
 *                 type: string
 *                 description: Optional notes about the status change
 *               trackingNumber:
 *                 type: string
 *                 description: Optional tracking number (for out_for_delivery status)
 *     responses:
 *       200:
 *         description: Order status updated successfully
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
 *       400:
 *         description: Validation error or update failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *       403:
 *         description: Forbidden - Only distributors and manufacturers can access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 */
