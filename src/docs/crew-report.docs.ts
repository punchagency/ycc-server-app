/**
 * @swagger
 * /api/v2/crew-report/dashboard:
 *   get:
 *     summary: Get dashboard summary statistics
 *     tags: [Crew Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: orderPeriod
 *         schema:
 *           type: string
 *           enum: [all, today, week, month, year]
 *       - in: query
 *         name: bookingPeriod
 *         schema:
 *           type: string
 *           enum: [all, today, week, month, year]
 *       - in: query
 *         name: activityPeriod
 *         schema:
 *           type: string
 *           enum: [all, today, week, month, year]
 *       - in: query
 *         name: orderStartDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: orderEndDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: bookingStartDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: bookingEndDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: activityStartDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: activityEndDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Dashboard summary generated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/v2/crew-report/generate:
 *   post:
 *     summary: Generate detailed report
 *     tags: [Crew Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileType
 *             properties:
 *               reportType:
 *                 type: string
 *                 enum: [all, orders, bookings, activities]
 *                 default: all
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               fileType:
 *                 type: string
 *                 enum: [pdf, csv]
 *     responses:
 *       200:
 *         description: Report generated successfully
 *       400:
 *         description: Invalid file type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
