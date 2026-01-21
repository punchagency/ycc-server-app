/**
 * @swagger
 * /api/v2/ai/chat:
 *   post:
 *     summary: Chat with AI customer service agent
 *     description: Send a message to the AI agent. Supports both authenticated and non-authenticated users. Authenticated users get access to personalized data via function calling.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: User's message to the AI agent
 *                 example: "What is the status of my last order?"
 *               sessionId:
 *                 type: string
 *                 description: Optional session ID to maintain conversation context
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: AI response generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     response:
 *                       type: string
 *                       example: "Your most recent order #ORD-123 is currently being processed and will ship soon."
 *                     sessionId:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                 authenticated:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid request
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
