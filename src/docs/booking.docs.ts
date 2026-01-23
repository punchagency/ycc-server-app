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
 *           enum: [pending, deposit_paid, paid, failed, cancelled, refunded]
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
 * /api/v2/booking/{id}/payment:
 *   post:
 *     tags: [Booking]
 *     summary: Create 50% deposit invoice (Crew/User only)
 *     description: Creates a Stripe invoice for 50% deposit payment. Booking must be confirmed and quote accepted (if quotable). The remaining 50% balance will be due upon service completion.
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
 *         description: Deposit invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Payment invoice created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoiceUrl:
 *                       type: string
 *                       description: Stripe hosted invoice URL
 *                     invoiceId:
 *                       type: string
 *                       description: Stripe invoice ID
 *                     status:
 *                       type: string
 *                       example: "pending"
 *                     dueDate:
 *                       type: number
 *                       description: Unix timestamp
 *                     amount:
 *                       type: number
 *                       description: Deposit amount (50% of total)
 *                     invoiceType:
 *                       type: string
 *                       example: "deposit"
 *       400:
 *         description: Invalid request or business rule violation
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *
 * @swagger
 * /api/v2/booking/{id}/balance-payment:
 *   post:
 *     tags: [Booking]
 *     summary: Create 50% balance invoice (Crew/User only)
 *     description: Creates a Stripe invoice for the remaining 50% balance payment. Requires deposit to be paid and service to be marked as completed by distributor.
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
 *         description: Balance invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Balance invoice created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoiceUrl:
 *                       type: string
 *                       description: Stripe hosted invoice URL
 *                     invoiceId:
 *                       type: string
 *                       description: Stripe invoice ID
 *                     status:
 *                       type: string
 *                       example: "pending"
 *                     dueDate:
 *                       type: number
 *                       description: Unix timestamp
 *                     amount:
 *                       type: number
 *                       description: Balance amount (50% of total)
 *                     invoiceType:
 *                       type: string
 *                       example: "balance"
 *       400:
 *         description: Invalid request - deposit not paid or service not completed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *
 * @swagger
 * /api/v2/booking/{id}/completed-status:
 *   patch:
 *     tags: [Booking]
 *     summary: Update booking completion status
 *     description: |
 *       Distributor: Mark service as completed (completedStatus: 'request_completed'). Requires deposit to be paid.
 *       
 *       Customer: Confirm service completion (completedStatus: 'completed') or reject (completedStatus: 'rejected'). Requires balance to be paid for confirmation.
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
 *             required: [completedStatus]
 *             properties:
 *               completedStatus:
 *                 type: string
 *                 enum: [pending, request_completed, completed, rejected]
 *                 description: |
 *                   - pending: Initial state
 *                   - request_completed: Distributor marks as done (triggers balance invoice)
 *                   - completed: Customer confirms completion (triggers payout)
 *                   - rejected: Customer rejects completion claim
 *               rejectionReason:
 *                 type: string
 *                 description: Required when completedStatus is 'rejected'
 *     responses:
 *       200:
 *         description: Completion status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *                   example: "STATUS_UPDATED"
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request or business rule violation
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
