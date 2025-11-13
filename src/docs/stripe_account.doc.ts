/**
 * @swagger
 * tags:
 *   name: Stripe Account
 *   description: Stripe Connect account management for business users
 */

/**
 * @swagger
 * /stripe-account/create:
 *   post:
 *     summary: Create a Stripe Connect Express account for a business
 *     tags: [Stripe Account]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: MongoDB ObjectId of the user
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Stripe account created successfully
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
 *                   example: Stripe account created successfully
 *                 code:
 *                   type: string
 *                   example: STRIPE_ACCOUNT_CREATED
 *                 data:
 *                   type: object
 *                   properties:
 *                     stripeAccountId:
 *                       type: string
 *                       example: acct_1234567890
 *                     accountLink:
 *                       type: string
 *                       example: https://connect.stripe.com/setup/s/...
 *                     expiresAt:
 *                       type: number
 *                       example: 1234567890
 *       400:
 *         description: Invalid user id or business validation failed
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /stripe-account/get:
 *   post:
 *     summary: Get Stripe account details (local and live from Stripe)
 *     tags: [Stripe Account]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: MongoDB ObjectId of the user
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Stripe account retrieved successfully
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
 *                   example: Stripe account retrieved successfully
 *                 code:
 *                   type: string
 *                   example: GET_STRIPE_ACCOUNT
 *                 data:
 *                   type: object
 *                   properties:
 *                     local:
 *                       type: object
 *                       description: Data stored in local database
 *                     stripe:
 *                       type: object
 *                       description: Live data from Stripe API
 *       400:
 *         description: Invalid user id
 *       500:
 *         description: Internal server error
 */

/**
  * @swagger
  * /stripe-account/refresh-link:
  *   post:
  *     summary: Refresh Stripe account link
  *     tags: [Stripe Account]
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - userId
  *             properties:
  *               userId:
  *                 type: string
  *                 description: MongoDB ObjectId of the user
  *                 example: "507f1f77bcf86cd799439011"
  *     responses:
  *       200:
  *         description: Stripe account link refreshed successfully
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
  *                   example: Stripe account link refreshed successfully
  *                 code:
  *                   type: string
  *                   example: STRIPE_ACCOUNT_LINK_REFRESHED
  *                 data:
  *                   type: object
  *                   properties:
  *                     stripeAccountId:
  *                       type: string
  *                       example: acct_1234567890
  *                     accountLink:
  *                       type: string
  *                       example: https://connect.stripe.com/setup/s/...
  *                     expiresAt:
  *                       type: number
  *                       example: 1234567890
  *       400:
  *         description: Invalid user id
  *       500:
  *         description: Internal server error
 */