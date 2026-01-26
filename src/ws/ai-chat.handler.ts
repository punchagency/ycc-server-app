import { Socket } from 'socket.io';
import { AIService } from '../service/ai.service';
import ChatModel from '../models/chat.model';
import { logError } from '../utils/SystemLogs';
import jwt from 'jsonwebtoken';

export const handleAIChat = (socket: Socket) => {
    socket.on('ai:chat', async (data: { message: string; sessionId?: string; token?: string }) => {
        try {
            const { message, sessionId, token } = data;

            if (!message) {
                socket.emit('ai:error', { error: 'Message is required' });
                return;
            }

            let userId: string | undefined;
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
                    userId = decoded.userId;
                } catch (err) {
                    socket.emit('ai:error', { error: 'Invalid token' });
                    return;
                }
            }

            const result = await AIService.chat({ message, userId, sessionId, stream: false });

            if ('stream' in result) {
                const stream = result.stream as any;
                let fullResponse = '';

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullResponse += content;
                        socket.emit('ai:stream', { content, sessionId: result.sessionId });
                    }
                }

                socket.emit('ai:complete', { response: fullResponse, sessionId: result.sessionId });

                const updateQuery = userId ? { userId, sessionId: result.sessionId } : { sessionId: result.sessionId, userId: { $exists: false } };
                await ChatModel.findOneAndUpdate(
                    updateQuery,
                    {
                        $push: {
                            messages: {
                                $each: [
                                    { type: 'human', data: { content: message, tool_calls: [], invalid_tool_calls: [], additional_kwargs: {}, response_metadata: {} }, createdAt: new Date() },
                                    { type: 'ai', data: { content: fullResponse, tool_calls: [], invalid_tool_calls: [], additional_kwargs: {}, response_metadata: {} }, createdAt: new Date() }
                                ]
                            }
                        },
                        $setOnInsert: { createdAt: new Date(), ...(userId && { userId }) }
                    },
                    { upsert: true }
                );
            }else{
                socket.emit('ai:complete', { response: result.response, sessionId: result.sessionId });
            }
        } catch (error: any) {
            await logError({ message: 'AI chat error', source: 'handleAIChat', error });
            socket.emit('ai:error', { error: 'Failed to process message' });
        }
    });
};
