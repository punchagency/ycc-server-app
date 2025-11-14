/**
 * @swagger
 * /api/v2/event:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - start
 *               - end
 *               - allDay
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               start:
 *                 type: string
 *                 format: date-time
 *               end:
 *                 type: string
 *                 format: date-time
 *               allDay:
 *                 type: boolean
 *               color:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [personal, work, reminder, holiday, booking]
 *               location:
 *                 type: string
 *               guestEmails:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/v2/event:
 *   get:
 *     summary: Get all events for authenticated user
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [personal, work, reminder, holiday, booking]
 *         description: Filter by event type
 *       - in: query
 *         name: filterBy
 *         schema:
 *           type: string
 *           enum: [week, month, year, custom]
 *         description: Filter by time period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom start date (for custom filter)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom end date (for custom filter)
 *     responses:
 *       200:
 *         description: Events fetched successfully
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/v2/event/{eventId}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event fetched successfully
 *       404:
 *         description: Event not found
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/v2/event/{eventId}:
 *   put:
 *     summary: Update an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               start:
 *                 type: string
 *                 format: date-time
 *               end:
 *                 type: string
 *                 format: date-time
 *               allDay:
 *                 type: boolean
 *               color:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [personal, work, reminder, holiday, booking]
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       400:
 *         description: Validation error or unauthorized
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/v2/event/{eventId}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       400:
 *         description: Event not found or unauthorized
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/v2/event/{eventId}/guests:
 *   post:
 *     summary: Add guests to an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guestEmails
 *             properties:
 *               guestEmails:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Guests added successfully
 *       400:
 *         description: Validation error or unauthorized
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/v2/event/{eventId}/guests:
 *   delete:
 *     summary: Remove guests from an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guestEmails
 *             properties:
 *               guestEmails:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Guests removed successfully
 *       400:
 *         description: Validation error or unauthorized
 *       401:
 *         description: Authentication required
 */
