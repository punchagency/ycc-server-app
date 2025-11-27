/**
 * @swagger
 * /api/v2/admin/dashboard/user-stats:
 *   get:
 *     summary: Get user statistics
 *     description: Returns counts of crew users, distributors, manufacturers, and total users
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     crewUsers:
 *                       type: number
 *                       example: 150
 *                       description: Number of active crew users
 *                     distributors:
 *                       type: number
 *                       example: 25
 *                       description: Number of active distributors
 *                     manufacturers:
 *                       type: number
 *                       example: 15
 *                       description: Number of active manufacturers
 *                     totalUsers:
 *                       type: number
 *                       example: 190
 *                       description: Total number of active users
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v2/admin/dashboard/platform-trends:
 *   get:
 *     summary: Get platform trends
 *     description: Returns chart data for orders, bookings, invoices, and user growth over time
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to look back for trend data
 *     responses:
 *       200:
 *         description: Platform trends retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       description: Orders data over time
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2025-01-15"
 *                             description: Date in YYYY-MM-DD format
 *                           count:
 *                             type: number
 *                             example: 25
 *                             description: Number of orders on this date
 *                           totalAmount:
 *                             type: number
 *                             example: 1250.50
 *                             description: Total revenue from orders on this date
 *                     bookings:
 *                       type: array
 *                       description: Bookings data over time
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2025-01-15"
 *                             description: Date in YYYY-MM-DD format
 *                           count:
 *                             type: number
 *                             example: 12
 *                             description: Number of bookings on this date
 *                     invoices:
 *                       type: object
 *                       description: Invoice status breakdown
 *                       properties:
 *                         paid:
 *                           type: object
 *                           properties:
 *                             count:
 *                               type: number
 *                               example: 45
 *                               description: Number of paid invoices
 *                             totalAmount:
 *                               type: number
 *                               example: 15000.00
 *                               description: Total amount of paid invoices
 *                         pending:
 *                           type: object
 *                           properties:
 *                             count:
 *                               type: number
 *                               example: 12
 *                               description: Number of pending invoices
 *                             totalAmount:
 *                               type: number
 *                               example: 3500.00
 *                               description: Total amount of pending invoices
 *                         failed:
 *                           type: object
 *                           properties:
 *                             count:
 *                               type: number
 *                               example: 3
 *                               description: Number of failed invoices
 *                             totalAmount:
 *                               type: number
 *                               example: 750.00
 *                               description: Total amount of failed invoices
 *                     userGrowth:
 *                       type: array
 *                       description: New user registrations over time by role
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2025-01-15"
 *                             description: Date in YYYY-MM-DD format
 *                           role:
 *                             type: string
 *                             enum: [user, distributor, manufacturer, admin]
 *                             example: "user"
 *                             description: User role
 *                           count:
 *                             type: number
 *                             example: 5
 *                             description: Number of new users registered on this date
 *       400:
 *         description: Invalid parameters - days parameter out of range
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v2/admin/dashboard/leaderboards:
 *   get:
 *     summary: Get leaderboards
 *     description: Returns top 3 users by orders/bookings and top 3 suppliers/service providers
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leaderboards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     topUsers:
 *                       type: object
 *                       properties:
 *                         byOrders:
 *                           type: array
 *                           description: Top 3 users with most orders
 *                           items:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                                 example: "507f1f77bcf86cd799439011"
 *                               name:
 *                                 type: string
 *                                 example: "John Doe"
 *                               email:
 *                                 type: string
 *                                 example: "john.doe@example.com"
 *                               orderCount:
 *                                 type: number
 *                                 example: 45
 *                                 description: Total number of orders
 *                               totalSpent:
 *                                 type: number
 *                                 example: 12500.50
 *                                 description: Total amount spent
 *                         byBookings:
 *                           type: array
 *                           description: Top 3 users with most bookings
 *                           items:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                                 example: "507f1f77bcf86cd799439011"
 *                               name:
 *                                 type: string
 *                                 example: "Jane Smith"
 *                               email:
 *                                 type: string
 *                                 example: "jane.smith@example.com"
 *                               bookingCount:
 *                                 type: number
 *                                 example: 28
 *                                 description: Total number of bookings
 *                     topSuppliers:
 *                       type: array
 *                       description: Top 3 suppliers by products sold
 *                       items:
 *                         type: object
 *                         properties:
 *                           supplierId:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439011"
 *                           name:
 *                             type: string
 *                             example: "Acme Supplies Co."
 *                           email:
 *                             type: string
 *                             example: "contact@acmesupplies.com"
 *                           productsSold:
 *                             type: number
 *                             example: 1250
 *                             description: Total quantity of products sold
 *                           revenue:
 *                             type: number
 *                             example: 85000.00
 *                             description: Total revenue generated
 *                     topServiceProviders:
 *                       type: array
 *                       description: Top 3 service providers by bookings received
 *                       items:
 *                         type: object
 *                         properties:
 *                           businessId:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439011"
 *                           businessName:
 *                             type: string
 *                             example: "Premium Services Inc."
 *                           bookingsReceived:
 *                             type: number
 *                             example: 156
 *                             description: Total number of bookings received
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       500:
 *         description: Server error
 */

export {};
