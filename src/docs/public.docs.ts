/**
 * @swagger
 * /api/v2/public/items:
 *   get:
 *     summary: Get services or products (public endpoint)
 *     description: Fetch services or products from onboarded businesses with optional category filtering. Results are returned in random order.
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [service, product]
 *         description: Type of items to fetch (service or product)
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *         description: Category ID to filter by (must be approved)
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Items fetched successfully
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
 *                   example: "services fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       imageURLs:
 *                         type: array
 *                         items:
 *                           type: string
 *                       price:
 *                         type: number
 *                       isQuotable:
 *                         type: boolean
 *                       sku:
 *                         type: string
 *                       business:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           businessName:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           website:
 *                             type: string
 *                           address:
 *                             type: object
 *                             properties:
 *                               street:
 *                                 type: string
 *                               city:
 *                                 type: string
 *                               state:
 *                                 type: string
 *                               zipcode:
 *                                 type: string
 *                               country:
 *                                 type: string
 *                           ratings:
 *                             type: object
 *                             properties:
 *                               averageRating:
 *                                 type: number
 *                               totalReviews:
 *                                 type: number
 *                               totalRatings:
 *                                 type: number
 *                       category:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           imageURL:
 *                             type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pages:
 *                       type: integer
 *                       example: 5
 *                     limit:
 *                       type: integer
 *                       example: 10
 *       400:
 *         description: Invalid parameters
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
 *                   example: "Type parameter is required and must be either \"service\" or \"product\""
 *                 code:
 *                   type: string
 *                   example: "VALIDATION_ERROR"
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
 *                   example: "Failed to fetch data"
 *                 code:
 *                   type: string
 *                   example: "SERVER_ERROR"
 */
