/**
 * @swagger
 * /api/v2/booking:
 *   post:
 *     tags: [Booking]
 *     summary: Create a new booking
 *     description: Create a new booking for a service. The booking will inherit the currency from the service.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [serviceId, serviceLocation, dateTime]
 *             properties:
 *               serviceId:
 *                 type: string
 *               serviceLocation:
 *                 type: object
 *                 required: [street, city, state, zip, country]
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zip:
 *                     type: string
 *                   country:
 *                     type: string
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *               contact:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Booking created successfully
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
 *                     currency:
 *                       type: string
 *                       description: Booking currency inherited from service
 *                       example: usd
 *                     totalAmount:
 *                       type: number
 *                       description: Total amount in booking currency
 *                     platformFee:
 *                       type: number
 *                       description: Platform fee (5%) in booking currency
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/booking:
 *   get:
 *     tags: [Booking]
 *     summary: Get all bookings
 *     description: Retrieve bookings with currency information. All amounts are returned in the booking's currency.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, declined]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed, cancelled, refunded]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [dateTime, createdAt, bookingStatus, paymentStatus, vendorName]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
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
 *                       currency:
 *                         type: string
 *                         description: Booking currency code
 *                       totalAmount:
 *                         type: number
 *                         description: Total amount in booking currency
 *                       platformFee:
 *                         type: number
 *                         description: Platform fee in booking currency
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/booking/{id}:
 *   get:
 *     tags: [Booking]
 *     summary: Get booking by ID
 *     description: Retrieve a single booking with currency information. All amounts are in the booking's currency.
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
 *         description: Booking retrieved successfully
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
 *                     currency:
 *                       type: string
 *                       description: Booking currency code
 *                       example: usd
 *                     totalAmount:
 *                       type: number
 *                       description: Total amount in booking currency
 *                     platformFee:
 *                       type: number
 *                       description: Platform fee (5%) in booking currency
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/v2/booking/{id}/confirm:
 *   patch:
 *     tags: [Booking]
 *     summary: Confirm a booking
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
 *         description: Booking confirmed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/v2/booking/{id}/status:
 *   patch:
 *     tags: [Booking]
 *     summary: Update booking status
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed, declined]
 *               reason:
 *                 type: string
 *               notes:
 *                 type: string
 *               requiresQuote:
 *                 type: boolean
 *               quoteItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     quantity:
 *                       type: number
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/v2/booking/{id}/quotes:
 *   post:
 *     tags: [Booking]
 *     summary: Add quotes to a booking (Distributor only)
 *     description: Add quote items to a quotable booking. Quote will be created in the booking's currency. All quote items must have the same currency. After adding quotes, the booking is automatically confirmed.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quoteItems]
 *             properties:
 *               quoteItems:
 *                 type: array
 *                 description: Array of quote items (all must have same currency)
 *                 items:
 *                   type: object
 *                   required: [name, price]
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Item name
 *                       example: "Cleaning Supplies"
 *                     description:
 *                       type: string
 *                       description: Item description
 *                       example: "Professional grade cleaning products"
 *                     price:
 *                       type: number
 *                       description: Unit price in booking currency
 *                       example: 25.00
 *                     quantity:
 *                       type: number
 *                       description: Quantity (defaults to 1)
 *                       example: 5
 *     responses:
 *       200:
 *         description: Quotes added successfully
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
 *                     booking:
 *                       type: object
 *                       properties:
 *                         currency:
 *                           type: string
 *                           description: Booking currency
 *                         totalAmount:
 *                           type: number
 *                           description: Total amount in booking currency
 *                         platformFee:
 *                           type: number
 *                           description: Platform fee (5%) in booking currency
 *                     quote:
 *                       type: object
 *                       properties:
 *                         quoteAmount:
 *                           type: number
 *                           description: Quote amount in booking currency
 *                         platformFee:
 *                           type: number
 *                           description: Platform fee in booking currency
 *                         amount:
 *                           type: number
 *                           description: Total amount in booking currency
 *                         currency:
 *                           type: string
 *                           description: Quote currency (matches booking)
 *       400:
 *         description: Invalid request or business rule violation
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/v2/booking/{id}/accept-quote:
 *   put:
 *     tags: [Booking]
 *     summary: Accept a quote (Crew/User only)
 *     description: Accept the provided quote for a confirmed booking. After acceptance, crew member can proceed to payment.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Quote accepted successfully
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
 *                     quoteStatus:
 *                       type: string
 *                       example: "accepted"
 *                     crewAcceptedQuoteAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request or business rule violation
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/v2/booking/{id}/reject-quote:
 *   put:
 *     tags: [Booking]
 *     summary: Reject a quote (Crew/User only)
 *     description: Reject the provided quote for a confirmed booking. This will cancel the booking and payment.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejecting the quote
 *                 example: "Quote is too expensive for my budget"
 *     responses:
 *       200:
 *         description: Quote rejected successfully
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
 *                     quoteStatus:
 *                       type: string
 *                       example: "rejected"
 *                     status:
 *                       type: string
 *                       example: "cancelled"
 *                     crewRejectedQuoteAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request or business rule violation
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/v2/booking/{id}/confirm-completion:
 *   put:
 *     tags: [Booking]
 *     summary: Confirm job completion (Crew/User only)
 *     description: Confirm satisfaction with the completed job. This triggers payment release to the distributor. Requires booking to be in 'completed' status and payment to be 'paid'.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Job completion confirmed successfully
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
 *                     notes:
 *                       type: string
 *                       description: Updated notes with confirmation
 *       400:
 *         description: Invalid request or business rule violation
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
