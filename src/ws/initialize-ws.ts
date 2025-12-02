import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisObject } from '../integration/Redis';
import Redis from 'ioredis';
import CONFIG from '../config/config';

let io: SocketIOServer | null = null;

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

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = (): SocketIOServer | null => io;
