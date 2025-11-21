/**
 * @swagger
 * /api/v2/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password, role, address]
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123!
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               nationality:
 *                 type: string
 *                 example: United States
 *               address:
 *                 type: object
 *                 required: true
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: 123 Main Street
 *                   zipcode:
 *                     type: string
 *                     example: 12345
 *                   city:
 *                     type: string
 *                     example: New York
 *                   state:
 *                     type: string
 *                     example: NY
 *                   country:
 *                     type: string
 *                     example: United States
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture image file (JPEG, PNG, JPG, WEBP - max 5MB)
 *               role:
 *                 type: string
 *                 enum: [user, admin, distributor, manufacturer]
 *                 example: user
 *               businessName:
 *                 type: string
 *                 description: Required for distributor/manufacturer roles
 *                 example: ABC Distribution
 *               businessType:
 *                 type: string
 *                 enum: [distributor, manufacturer]
 *                 description: Required for distributor/manufacturer roles
 *               businessEmail:
 *                 type: string
 *                 format: email
 *                 description: Required for distributor/manufacturer roles
 *                 example: contact@abcdistribution.com
 *               businessPhone:
 *                 type: string
 *                 description: Required for distributor/manufacturer roles
 *                 example: +1234567890
 *               website:
 *                 type: string
 *                 description: Required for distributor/manufacturer roles
 *                 example: https://example.com
 *               taxId:
 *                 type: string
 *                 description: Required for distributor/manufacturer roles
 *                 example: 12-3456789
 *               license:
 *                 type: string
 *                 description: Required for distributor/manufacturer roles
 *                 example: LIC-123456
 *     responses:
 *       201:
 *         description: User registered successfully. Activation code sent to email.
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
 *                   example: Registration successful. Please check your email for activation code.
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       400:
 *         description: Validation error or user already exists
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
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v2/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     user:
 *                       type: object
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v2/auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */

/**
 * @swagger
 * /api/v2/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change user password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: OldPass123!
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: NewPass123!
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid old password or validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v2/auth/profile:
 *   get:
 *     tags: [Authentication]
 *     summary: Get user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/auth/profile:
 *   put:
 *     tags: [Authentication]
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               nationality:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *               address:
 *                 type: object
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
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/auth/distributor-profile:
 *   put:
 *     tags: [Authentication]
 *     summary: Update distributor/manufacturer business profile
 *     description: Update business information for distributor and manufacturer accounts. Only accessible to users with distributor or manufacturer roles.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *                 description: Name of the business
 *                 example: ABC Distribution Co.
 *               businessEmail:
 *                 type: string
 *                 format: email
 *                 description: Business contact email address
 *                 example: contact@abcdistribution.com
 *               businessPhone:
 *                 type: string
 *                 description: Business contact phone number
 *                 example: +1234567890
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Business website URL
 *                 example: https://www.abcdistribution.com
 *               address:
 *                 type: object
 *                 description: Business address details
 *                 properties:
 *                   street:
 *                     type: string
 *                     description: Street address
 *                     example: 123 Business Blvd
 *                   zipcode:
 *                     type: string
 *                     description: ZIP or postal code
 *                     example: 12345
 *                   city:
 *                     type: string
 *                     description: City name
 *                     example: New York
 *                   state:
 *                     type: string
 *                     description: State or province
 *                     example: NY
 *                   country:
 *                     type: string
 *                     description: Country name
 *                     example: United States
 *     responses:
 *       200:
 *         description: Business profile updated successfully
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
 *                   example: Business profile updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         role:
 *                           type: string
 *                           enum: [distributor, manufacturer]
 *                         businessName:
 *                           type: string
 *                         businessEmail:
 *                           type: string
 *                         businessPhone:
 *                           type: string
 *                         website:
 *                           type: string
 *                         address:
 *                           type: object
 *                         isVerified:
 *                           type: boolean
 *                         isActive:
 *                           type: boolean
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error - Invalid email or phone format
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
 *                   example: Valid business email is required
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *       401:
 *         description: Authentication required - No valid token provided
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
 *                   example: UNAUTHORIZED
 *       403:
 *         description: Forbidden - User role is not distributor or manufacturer
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
 *                   example: This endpoint is only for distributor and manufacturer accounts
 *                 code:
 *                   type: string
 *                   example: FORBIDDEN
 *       404:
 *         description: User not found
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
 *                   example: USER_NOT_FOUND
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
 *                   example: Business profile update failed
 */

/**
 * @swagger
 * /api/v2/auth/activate-account:
 *   post:
 *     tags: [Authentication]
 *     summary: Activate user account with code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Account activated successfully
 *       400:
 *         description: Invalid or expired code
 */

/**
 * @swagger
 * /api/v2/auth/resend-activation-code:
 *   post:
 *     tags: [Authentication]
 *     summary: Resend activation code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Activation code sent successfully
 *       400:
 *         description: Invalid request
 */

/**
 * @swagger
 * /api/v2/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset code sent to email
 *       400:
 *         description: Invalid request
 */

/**
 * @swagger
 * /api/v2/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password with code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired code
 */

/**
 * @swagger
 * /api/v2/auth/resend-reset-code:
 *   post:
 *     tags: [Authentication]
 *     summary: Resend password reset code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset code sent successfully
 *       400:
 *         description: Invalid request
 */
