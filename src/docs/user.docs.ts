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
 *       400:
 *         description: Invalid business type
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
