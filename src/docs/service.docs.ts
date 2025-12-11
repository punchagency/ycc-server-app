/**
 * @swagger
 * /api/v2/service:
 *   post:
 *     tags: [Service]
 *     summary: Create a new service (Distributor or Admin)
 *     description: Distributors create services for their own business. Admins can create services for any distributor's business by providing businessId.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, price, categoryId]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               price:
 *                 type: number
 *                 minimum: 1
 *               categoryId:
 *                 type: string
 *                 description: Category ID (valid MongoDB ObjectId) or category name. If name provided and doesn't exist, a new unapproved category will be created.
 *               isQuotable:
 *                 type: boolean
 *               businessId:
 *                 type: string
 *                 description: Required for admins - the distributor's business ID
 *               serviceImage:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *     responses:
 *       201:
 *         description: Service created successfully
 *       400:
 *         description: Validation error or business not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only distributors and admins can create services
 */

/**
 * @swagger
 * /api/v2/service/business:
 *   get:
 *     tags: [Service]
 *     summary: Get all services for authenticated user's business
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of services per page
 *     responses:
 *       200:
 *         description: Services retrieved successfully with pagination
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only distributors can view their services
 */

/**
 * @swagger
 * /api/v2/service/{id}:
 *   get:
 *     tags: [Service]
 *     summary: Get service by ID
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
 *         description: Service retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found
 */

/**
 * @swagger
 * /api/v2/service/{id}:
 *   put:
 *     tags: [Service]
 *     summary: Update service (Distributor or Admin)
 *     description: Distributors can update their own services. Admins can update any distributor's service.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               price:
 *                 type: number
 *                 minimum: 0
 *               categoryId:
 *                 type: string
 *                 description: Category ID (valid MongoDB ObjectId) or category name. If name provided and doesn't exist, a new unapproved category will be created.
 *               isQuotable:
 *                 type: boolean
 *               serviceImage:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *     responses:
 *       200:
 *         description: Service updated successfully
 *       400:
 *         description: Invalid service ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied or only distributors and admins can update services
 *       404:
 *         description: Service not found or business not found
 */

/**
 * @swagger
 * /api/v2/service/{id}:
 *   delete:
 *     tags: [Service]
 *     summary: Delete service
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
 *         description: Service deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found
 */

/**
 * @swagger
 * /api/v2/service/bulk-upload:
 *   post:
 *     tags: [Service]
 *     summary: Upload multiple services at once
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, services]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Distributor user ID
 *               services:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, price, categoryName]
 *                   properties:
 *                     name:
 *                       type: string
 *                       minLength: 2
 *                       maxLength: 50
 *                     description:
 *                       type: string
 *                     price:
 *                       type: number
 *                       minimum: 1
 *                     categoryName:
 *                       type: string
 *                       description: Category name (will be created if doesn't exist)
 *                     isQuotable:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Bulk upload completed
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
 *                     created:
 *                       type: array
 *                       items:
 *                         type: object
 *                     failed:
 *                       type: array
 *                       items:
 *                         type: object
 *                     newCategories:
 *                       type: array
 *                       items:
 *                         type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     newCategoriesCreated:
 *                       type: integer
 *       400:
 *         description: Validation error
 *       403:
 *         description: User must be a distributor
 */

/**
 * @swagger
 * /api/v2/service/crew-services:
 *   get:
 *     tags: [Service]
 *     summary: Fetch services for crew members
 *     description: Retrieve a paginated list of services available to crew members. Services are filtered to only show those from approved categories. Supports search, filtering by category, price range, and multiple sorting options.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter services by name or description (case-insensitive)
 *         example: yacht cleaning
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter services by category name (case-insensitive)
 *         example: Maintenance
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           format: float
 *         description: Minimum price filter
 *         example: 50
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           format: float
 *         description: Maximum price filter
 *         example: 500
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of items per page
 *         example: 12
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [random, name, price_asc, price_desc]
 *           default: random
 *         description: Sort order for results
 *         example: price_asc
 *     responses:
 *       200:
 *         description: Services fetched successfully
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
 *                   example: Services fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                             example: Professional Yacht Cleaning
 *                           description:
 *                             type: string
 *                           price:
 *                             type: number
 *                             example: 250
 *                           imageURLs:
 *                             type: array
 *                             items:
 *                               type: string
 *                           isQuotable:
 *                             type: boolean
 *                           category:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               imageURL:
 *                                 type: string
 *                           business:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               businessName:
 *                                 type: string
 *                               businessPhone:
 *                                 type: string
 *                               businessEmail:
 *                                 type: string
 *                               address:
 *                                 type: object
 *                               website:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalServices:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                         limit:
 *                           type: integer
 *       403:
 *         description: Only crew members can access this endpoint
 *       500:
 *         description: Server error
 */
