/**
 * @swagger
 * /api/v2/search/global:
 *   get:
 *     summary: Global search across multiple entities
 *     description: Search for products, users, businesses, orders, bookings, categories, and services. Authorization rules apply based on user role.
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search term to match against entity fields
 *         example: laptop
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [products, users, businesses, orders, bookings, categories, services]
 *         description: Filter results by entity type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, declined, processing, out_for_delivery, shipped, delivered, paid, failed, refunded]
 *         description: Filter by status (applies to orders and bookings)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by (default createdAt)
 *         example: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (default desc)
 *         example: desc
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Global search performed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         products:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               type:
 *                                 type: string
 *                                 example: product
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               price:
 *                                 type: number
 *                               quantity:
 *                                 type: number
 *                               category:
 *                                 type: string
 *                               business:
 *                                 type: string
 *                               imageUrl:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                         users:
 *                           type: array
 *                           items:
 *                             type: object
 *                         businesses:
 *                           type: array
 *                           items:
 *                             type: object
 *                         orders:
 *                           type: array
 *                           items:
 *                             type: object
 *                         bookings:
 *                           type: array
 *                           items:
 *                             type: object
 *                         categories:
 *                           type: array
 *                           items:
 *                             type: object
 *                         services:
 *                           type: array
 *                           items:
 *                             type: object
 *                     totalResults:
 *                       type: number
 *                       example: 25
 *                     query:
 *                       type: string
 *                       example: laptop
 *                     filters:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                         status:
 *                           type: string
 *                         sortBy:
 *                           type: string
 *                         order:
 *                           type: string
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Authentication required
 *                 code:
 *                   type: string
 *                   example: AUTH_REQUIRED
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to perform global search
 */
