import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AIService } from '../service/ai.service';
import ChatModel from '../models/chat.model';

export class AIStreamController {
    static async chatStream(req: AuthenticatedRequest, res: Response) {
        const { message, sessionId } = req.body;

        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        const userId = req.user?._id;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
            const result = await AIService.chat({ message, userId, sessionId, stream: true });

            if ('stream' in result) {
                const stream = result.stream as any;
                let fullResponse = '';

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullResponse += content;
                        res.write(`data: ${JSON.stringify({ content, sessionId: result.sessionId })}\n\n`);
                    }
                }

                res.write(`data: ${JSON.stringify({ done: true, sessionId: result.sessionId })}\n\n`);
                res.end();

                if (userId) {
                    await ChatModel.findOneAndUpdate(
                        { userId, sessionId: result.sessionId },
                        {
                            $push: {
                                messages: {
                                    $each: [
                                        { type: 'human', data: { content: message, tool_calls: [], invalid_tool_calls: [], additional_kwargs: {}, response_metadata: {} }, createdAt: new Date() },
                                        { type: 'ai', data: { content: fullResponse, tool_calls: [], invalid_tool_calls: [], additional_kwargs: {}, response_metadata: {} }, createdAt: new Date() }
                                    ]
                                }
                            },
                            $setOnInsert: { createdAt: new Date() }
                        },
                        { upsert: true }
                    );
                }
            }
        } catch (error) {
            res.write(`data: ${JSON.stringify({ error: 'Failed to process message' })}\n\n`);
            res.end();
        }
    }
}
