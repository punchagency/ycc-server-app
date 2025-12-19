/**
 * @swagger
 * /api/v2/user/business-users:
 *   get:
 *     summary: Get all business users (distributors and manufacturers)
 *     description: Retrieve a list of all business users with their associated business information. Admin only. Optionally filter by business type.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessType
 *         schema:
 *           type: string
 *           enum: [distributor, manufacturer]
 *         required: false
 *         description: Filter by business type (distributor or manufacturer). If not provided, returns all business users.
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Filter by user verification status. If not provided, returns users regardless of verification status.
 *       - in: query
 *         name: isOnboarded
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Filter by business onboarding status. If not provided, returns users regardless of onboarding status.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         description: Page number for pagination. If not provided, returns all records.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Number of items per page. If not provided, returns all records.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Search term to filter by firstName, lastName, or email (case-insensitive)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         required: false
 *         description: Filter by business approval status. If not provided, returns users regardless of status.
 *     responses:
 *       200:
 *         description: Business users fetched successfully
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
 *                   example: Business users fetched successfully
 *                 code:
 *                   type: string
 *                   example: SUCCESS
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           profilePicture:
 *                             type: string
 *                           role:
 *                             type: string
 *                             enum: [distributor, manufacturer]
 *                           isVerified:
 *                             type: boolean
 *                           isActive:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                       business:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           _id:
 *                             type: string
 *                           userId:
 *                             type: string
 *                           businessName:
 *                             type: string
 *                           businessType:
 *                             type: string
 *                             enum: [distributor, manufacturer]
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
 *                               zipcode:
 *                                 type: string
 *                               city:
 *                                 type: string
 *                               state:
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
 *                           isOnboarded:
 *                             type: boolean
 *                 pagination:
 *                   type: object
 *                   description: Included only when page and limit parameters are provided
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     pages:
 *                       type: integer
 *                       example: 10
 *                 total:
 *                   type: integer
 *                   description: Total count of records (included only when pagination is not used)
 *                   example: 100
 *       400:
 *         description: Invalid query parameters
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
 *                   example: Invalid business type. Must be either "manufacturer" or "distributor"
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
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
 *       403:
 *         description: Forbidden - Admin access required
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
 *                   example: Forbidden
 *                 code:
 *                   type: string
 *                   example: FORBIDDEN
 *       500:
 *         description: Internal server error
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
 *                 code:
 *                   type: string
 *                   example: INTERNAL_SERVER_ERROR
 */

/**
 * @swagger
 * /api/v2/user/business-approval:
 *   post:
 *     summary: Approve or reject business user registration
 *     description: Admin endpoint to approve or reject distributor/manufacturer business registration. Sends email notification to the business owner.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - status
 *               - subject
 *               - emailBody
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user to approve/reject
 *                 example: 507f1f77bcf86cd799439011
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: Approval status
 *                 example: approved
 *               subject:
 *                 type: string
 *                 description: Email subject line
 *                 example: Your Business Registration Has Been Approved
 *               emailBody:
 *                 type: string
 *                 description: Custom message body for the email
 *                 example: We are pleased to inform you that your business registration has been approved.
 *     responses:
 *       200:
 *         description: Business approval processed successfully
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
 *                   example: Business user responded successfully
 *                 code:
 *                   type: string
 *                   example: SUCCESS
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [approved, rejected]
 *                     email:
 *                       type: string
 *                     businessName:
 *                       type: string
 *       400:
 *         description: Validation error
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
 *                   example: User ID and status are required
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
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
 *       403:
 *         description: Forbidden - Admin access required
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
 *                   example: Forbidden
 *                 code:
 *                   type: string
 *                   example: FORBIDDEN
 *       500:
 *         description: Internal server error
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
 *                   example: User not found
 *                 code:
 *                   type: string
 *                   example: INTERNAL_SERVER_ERROR
 */

/**
 * @swagger
 * /api/v2/user/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve user details by user ID. Returns user information and associated business details if the user is a distributor or manufacturer.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: User fetched successfully
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
 *                   example: Business user fetched successfully
 *                 code:
 *                   type: string
 *                   example: SUCCESS
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         profilePicture:
 *                           type: string
 *                         address:
 *                           type: object
 *                           properties:
 *                             street:
 *                               type: string
 *                             zipcode:
 *                               type: string
 *                             city:
 *                               type: string
 *                             state:
 *                               type: string
 *                             country:
 *                               type: string
 *                         role:
 *                           type: string
 *                           enum: [admin, user, distributor, manufacturer]
 *                         isVerified:
 *                           type: boolean
 *                         isActive:
 *                           type: boolean
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                     business:
 *                       type: object
 *                       nullable: true
 *                       description: Business details (only present for distributor/manufacturer roles)
 *                       properties:
 *                         userId:
 *                           type: string
 *                         businessName:
 *                           type: string
 *                         businessType:
 *                           type: string
 *                           enum: [distributor, manufacturer]
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         website:
 *                           type: string
 *                         address:
 *                           type: object
 *                           properties:
 *                             street:
 *                               type: string
 *                             zipcode:
 *                               type: string
 *                             city:
 *                               type: string
 *                             state:
 *                               type: string
 *                             country:
 *                               type: string
 *                         ratings:
 *                           type: object
 *                           properties:
 *                             averageRating:
 *                               type: number
 *                             totalReviews:
 *                               type: number
 *                             totalRatings:
 *                               type: number
 *                         isOnboarded:
 *                           type: boolean
 *       400:
 *         description: Invalid user ID
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
 *                   example: Invalid user id
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
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
 *         description: Internal server error
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
 *                   example: User not found
 *                 code:
 *                   type: string
 *                   example: INTERNAL_SERVER_ERROR
 */