/**
 * @swagger
 * tags:
 *   name: N8N
 *   description: AI integration endpoints via N8N workflow automation
 */

/**
 * @swagger
 * /api/n8n/ask:
 *   post:
 *     summary: Send a chat message to AI agent
 *     description: Sends user input to N8N AI workflow for processing. Response is delivered via WebSocket to connected user.
 *     tags: [N8N]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chatInput
 *             properties:
 *               chatInput:
 *                 type: string
 *                 description: User's chat message or question
 *                 example: "What is the weather today?"
 *               userId:
 *                 type: string
 *                 description: User ID for WebSocket response delivery
 *                 example: "507f1f77bcf86cd799439011"
 *               sessionId:
 *                 type: string
 *                 description: Session ID for conversation context
 *                 example: "session_123456"
 *     responses:
 *       200:
 *         description: Request accepted and sent to AI workflow
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Missing required chatInput field
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "chatInput is required"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */

/**
 * @swagger
 * /api/n8n/recieve:
 *   post:
 *     summary: Receive AI response from N8N workflow
 *     description: Webhook endpoint for N8N to send AI-generated responses back to connected users via WebSocket
 *     tags: [N8N]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - webhookBody
 *               - agentOutput
 *             properties:
 *               webhookBody:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                     description: User ID to send response to
 *                     example: "507f1f77bcf86cd799439011"
 *               agentOutput:
 *                 type: object
 *                 properties:
 *                   output:
 *                     type: string
 *                     description: AI-generated response
 *                     example: "The weather today is sunny with a high of 75°F"
 *     responses:
 *       200:
 *         description: Response delivered successfully or user not connected
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
 *                   example: "User not connected"
 *       400:
 *         description: Missing required userId field
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "userId is required"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
