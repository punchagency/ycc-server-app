/**
 * @swagger
 * /api/v2/admin-analytics/users-total:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: Get total users breakdown by role
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users total fetched successfully
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
 *                     totalUsers:
 *                       type: number
 *                     usersByRole:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           role:
 *                             type: string
 *                           count:
 *                             type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/admin-analytics/orders-over-time:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: Get total orders over time with interval grouping
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (optional, defaults to all time)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (optional, defaults to all time)
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Time interval for grouping
 *     responses:
 *       200:
 *         description: Orders over time fetched successfully
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
 *                       period:
 *                         type: string
 *                       count:
 *                         type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/admin-analytics/invoices-by-status:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: Get invoice counts grouped by status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invoices by status fetched successfully
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
 *                       status:
 *                         type: string
 *                       count:
 *                         type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/admin-analytics/user-growth:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: Get new user registrations over time
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (optional, defaults to all time)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (optional, defaults to all time)
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Time interval for grouping
 *     responses:
 *       200:
 *         description: User growth fetched successfully
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
 *                       period:
 *                         type: string
 *                       count:
 *                         type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/admin-analytics/top-users:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: Get top users by number of orders placed
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (optional, defaults to all time)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (optional, defaults to all time)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top users to return
 *     responses:
 *       200:
 *         description: Top users fetched successfully
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
 *                       userId:
 *                         type: string
 *                       orderCount:
 *                         type: number
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       email:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/admin-analytics/top-distributors:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: Get top distributors by number of orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (optional, defaults to all time)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (optional, defaults to all time)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top distributors to return
 *     responses:
 *       200:
 *         description: Top distributors fetched successfully
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
 *                       businessId:
 *                         type: string
 *                       orderCount:
 *                         type: number
 *                       businessName:
 *                         type: string
 *                       email:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/admin-analytics/top-manufacturers:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: Get top manufacturers by number of orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (optional, defaults to all time)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (optional, defaults to all time)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top manufacturers to return
 *     responses:
 *       200:
 *         description: Top manufacturers fetched successfully
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
 *                       businessId:
 *                         type: string
 *                       orderCount:
 *                         type: number
 *                       businessName:
 *                         type: string
 *                       email:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
