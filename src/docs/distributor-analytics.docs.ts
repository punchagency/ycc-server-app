/**
 * @swagger
 * /api/v2/distributor-analytics/total-products:
 *   get:
 *     tags: [Distributor Analytics]
 *     summary: Get total count of products owned by distributor
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total products fetched successfully
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
 *                   type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/distributor-analytics/total-services:
 *   get:
 *     tags: [Distributor Analytics]
 *     summary: Get total count of services offered by distributor
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total services fetched successfully
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
 *                   type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/distributor-analytics/low-stock-items:
 *   get:
 *     tags: [Distributor Analytics]
 *     summary: Get count of products with quantity below minimum restock level
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock items fetched successfully
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
 *                   type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/distributor-analytics/customer-rating:
 *   get:
 *     tags: [Distributor Analytics]
 *     summary: Get distributor's average customer rating
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer rating fetched successfully
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
 *                   type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/distributor-analytics/active-orders:
 *   get:
 *     tags: [Distributor Analytics]
 *     summary: Get count of active orders (pending, confirmed, processing, out_for_delivery, shipped)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active orders fetched successfully
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
 *                   type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/distributor-analytics/total-bookings:
 *   get:
 *     tags: [Distributor Analytics]
 *     summary: Get total count of all bookings for distributor's business
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total bookings fetched successfully
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
 *                   type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/distributor-analytics/popular-services:
 *   get:
 *     tags: [Distributor Analytics]
 *     summary: Get top 10 most booked services
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Popular services fetched successfully
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
 *                     properties:
 *                       serviceId:
 *                         type: string
 *                       bookingCount:
 *                         type: number
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/distributor-analytics/popular-products:
 *   get:
 *     tags: [Distributor Analytics]
 *     summary: Get top 10 most ordered products
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Popular products fetched successfully
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
 *                     properties:
 *                       productId:
 *                         type: string
 *                       orderCount:
 *                         type: number
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/distributor-analytics/total-revenue:
 *   get:
 *     tags: [Distributor Analytics]
 *     summary: Get total revenue from paid invoices with breakdown
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total revenue fetched successfully
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
 *                     totalRevenue:
 *                       type: number
 *                     orderRevenue:
 *                       type: number
 *                     bookingRevenue:
 *                       type: number
 *       401:
 *         description: Unauthorized
 */
