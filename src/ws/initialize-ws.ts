import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisObject } from '../integration/Redis';
import Redis from 'ioredis';
import CONFIG from '../config/config';
import { handleAIChat } from './ai-chat.handler';

let io: SocketIOServer | null = null;
const connectedSockets = new Map<string, Socket>();

export const initializeWebSocket = (httpServer: HTTPServer, allowedOrigins: string[]): SocketIOServer => {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'development' ? '*' : allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Use Redis adapter if available
    if (RedisObject.isAvailable()) {
        const pubClient = new Redis({
            host: CONFIG.redis.host,
            port: CONFIG.redis.port,
            password: CONFIG.redis.password,
            db: CONFIG.redis.db
        });
        const subClient = pubClient.duplicate();

        io.adapter(createAdapter(pubClient, subClient));
        console.log('WebSocket using Redis adapter');
    }

    io.on('connection', socket => {
        console.log('New client connected');

        handleAIChat(socket);

        socket.on('authenticate', async userId => {
            try {
                if (!userId) {
                    socket.emit('error', { message: 'userId is required' });
                    return;
                }

                // Close existing connection if user reconnects
                const existingSocket = connectedSockets.get(userId);
                if (existingSocket && existingSocket !== socket) {
                    existingSocket.disconnect();
                }

                connectedSockets.set(userId, socket);
                socket.emit('authenticated', { userId });
                console.log(`User ${userId} authenticated`);
            } catch (error) {
                console.error('Socket authentication error:', error);
                socket.emit('error', { message: 'Authentication failed' });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            for (const [userId, sock] of connectedSockets.entries()) {
                if (sock === socket) {
                    connectedSockets.delete(userId);
                    console.log(`Crew member ${userId} disconnected`);
                    break;
                }
            }
        });
    });

    return io;
};

export const getIO = (): SocketIOServer | null => io;
export const getConnectedSockets = (): Map<string, Socket> => connectedSockets;
