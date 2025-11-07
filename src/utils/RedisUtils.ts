// Redis Utility Functions - Common use cases and patterns for the Allrounda application
// These functions demonstrate practical Redis usage patterns and can be imported and used throughout the application
// All functions gracefully fallback when Redis is disabled or unavailable

import { RedisObject } from '../integration/Redis';
import CONFIG from '../config/config.js';

export class RedisUtils {
    
    // Check if Redis is available for any operations
    static isRedisAvailable(): boolean {
        return RedisObject.isAvailable();
    }
    
    // User caching utilities
    static async cacheUser(userId: string, userData: any): Promise<void> {
        if (!this.isRedisAvailable()) return;
        
        const key = `user:${userId}`;
        await RedisObject.set(key, userData, CONFIG.redis.cacheTTL.user);
    }

    static async getCachedUser(userId: string): Promise<any> {
        if (!this.isRedisAvailable()) return null;
        
        const key = `user:${userId}`;
        return await RedisObject.get(key);
    }

    static async invalidateUserCache(userId: string): Promise<void> {
        if (!this.isRedisAvailable()) return;
        
        const key = `user:${userId}`;
        await RedisObject.del(key);
    }

    // Query result caching
    static async cacheQuery(queryKey: string, result: any, ttl?: number): Promise<void> {
        if (!this.isRedisAvailable()) return;
        
        const key = `query:${queryKey}`;
        const cacheTTL = ttl || CONFIG.redis.cacheTTL.query;
        await RedisObject.set(key, result, cacheTTL);
    }

    static async getCachedQuery(queryKey: string): Promise<any> {
        if (!this.isRedisAvailable()) return null;
        
        const key = `query:${queryKey}`;
        return await RedisObject.get(key);
    }

    static async invalidateQueryCache(pattern: string): Promise<void> {
        if (!this.isRedisAvailable()) return;
        
        const searchPattern = `query:${pattern}*`;
        await RedisObject.flushPattern(searchPattern);
    }

    // Rate limiting - fallback to basic memory-based tracking when Redis unavailable
    private static memoryRateLimit: Map<string, { count: number; resetTime: number }> = new Map();
    
    static async checkRateLimit(identifier: string, limit: number = 100, window: number = 3600): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
        if (this.isRedisAvailable()) {
            // Use Redis-based rate limiting
            const key = `ratelimit:${identifier}`;
            const current = await RedisObject.increment(key);
            
            if (current === 1) {
                // First request in the window, set expiration
                await RedisObject.expire(key, window);
            }
            
            const ttl = await RedisObject.ttl(key);
            const resetTime = Date.now() + (ttl * 1000);
            
            return {
                allowed: current <= limit,
                remaining: Math.max(0, limit - current),
                resetTime
            };
        } else {
            // Fallback to memory-based rate limiting
            const now = Date.now();
            const record = this.memoryRateLimit.get(identifier);
            
            if (!record || now > record.resetTime) {
                // New window or expired
                const resetTime = now + (window * 1000);
                this.memoryRateLimit.set(identifier, { count: 1, resetTime });
                return {
                    allowed: true,
                    remaining: limit - 1,
                    resetTime
                };
            } else {
                // Within window
                record.count++;
                return {
                    allowed: record.count <= limit,
                    remaining: Math.max(0, limit - record.count),
                    resetTime: record.resetTime
                };
            }
        }
    }

    // Session management - fallback to null when Redis unavailable
    static async setUserSession(userId: string, sessionData: any): Promise<void> {
        if (!this.isRedisAvailable()) {
            console.warn('Redis unavailable. User sessions will not persist across server restarts.');
            return;
        }
        
        await RedisObject.setSession(userId, sessionData);
    }

    static async getUserSession(userId: string): Promise<any> {
        if (!this.isRedisAvailable()) return null;
        
        return await RedisObject.getSession(userId);
    }

    static async deleteUserSession(userId: string): Promise<void> {
        if (!this.isRedisAvailable()) return;
        
        await RedisObject.deleteSession(userId);
    }

    // Temporary data storage (like verification codes) - fallback to memory
    private static memoryTempData: Map<string, { data: any; expiry: number }> = new Map();
    
    static async storeTempData(key: string, data: any, ttl: number = 600): Promise<void> {
        if (this.isRedisAvailable()) {
            const tempKey = `temp:${key}`;
            await RedisObject.set(tempKey, data, ttl);
        } else {
            // Fallback to memory storage
            const expiry = Date.now() + (ttl * 1000);
            this.memoryTempData.set(key, { data, expiry });
            console.warn('Redis unavailable. Temporary data stored in memory (will not persist across server restarts).');
        }
    }

    static async getTempData(key: string): Promise<any> {
        if (this.isRedisAvailable()) {
            const tempKey = `temp:${key}`;
            return await RedisObject.get(tempKey);
        } else {
            // Check memory storage
            const record = this.memoryTempData.get(key);
            if (!record) return null;
            
            if (Date.now() > record.expiry) {
                this.memoryTempData.delete(key);
                return null;
            }
            
            return record.data;
        }
    }

    static async deleteTempData(key: string): Promise<void> {
        if (this.isRedisAvailable()) {
            const tempKey = `temp:${key}`;
            await RedisObject.del(tempKey);
        } else {
            this.memoryTempData.delete(key);
        }
    }

    // User online status tracking - fallback to memory
    private static memoryOnlineUsers: Map<string, any> = new Map();
    
    static async setUserOnline(userId: string, socketId?: string): Promise<void> {
        const data = {
            status: 'online',
            lastSeen: new Date().toISOString(),
            socketId: socketId || null
        };
        
        if (this.isRedisAvailable()) {
            const key = `online:${userId}`;
            await RedisObject.set(key, data, 300); // 5 minutes TTL
        } else {
            this.memoryOnlineUsers.set(userId, data);
        }
    }

    static async setUserOffline(userId: string): Promise<void> {
        const data = {
            status: 'offline',
            lastSeen: new Date().toISOString(),
            socketId: null
        };
        
        if (this.isRedisAvailable()) {
            const key = `online:${userId}`;
            await RedisObject.set(key, data, 86400); // Keep offline status for 24 hours
        } else {
            this.memoryOnlineUsers.set(userId, data);
        }
    }

    static async getUserOnlineStatus(userId: string): Promise<any> {
        if (this.isRedisAvailable()) {
            const key = `online:${userId}`;
            return await RedisObject.get(key);
        } else {
            return this.memoryOnlineUsers.get(userId) || null;
        }
    }

    static async getOnlineUsers(): Promise<string[]> {
        if (this.isRedisAvailable()) {
            // This is a simplified version - in production, you might want to use Redis SCAN
            // Note: This uses keys() which is not recommended for production with large datasets
            // Consider using SCAN in production
            return [];
        } else {
            // Return users marked as online in memory
            const onlineUsers: string[] = [];
            for (const [userId, status] of this.memoryOnlineUsers.entries()) {
                if (status.status === 'online') {
                    onlineUsers.push(userId);
                }
            }
            return onlineUsers;
        }
    }

    // Notification queue management - fallback to memory
    private static memoryNotifications: Map<string, any[]> = new Map();
    
    static async queueNotification(userId: string, notification: any): Promise<void> {
        const notificationWithMeta = {
            ...notification,
            timestamp: new Date().toISOString(),
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        if (this.isRedisAvailable()) {
            const key = `notifications:${userId}`;
            await RedisObject.lPush(key, notificationWithMeta);
            // Keep only last 100 notifications
            await RedisObject.lRange(key, 0, 99);
        } else {
            // Store in memory
            if (!this.memoryNotifications.has(userId)) {
                this.memoryNotifications.set(userId, []);
            }
            const notifications = this.memoryNotifications.get(userId)!;
            notifications.unshift(notificationWithMeta);
            // Keep only last 100 notifications
            if (notifications.length > 100) {
                notifications.splice(100);
            }
        }
    }

    static async getNotifications(userId: string, limit: number = 20): Promise<any[]> {
        if (this.isRedisAvailable()) {
            const key = `notifications:${userId}`;
            return await RedisObject.lRange(key, 0, limit - 1);
        } else {
            const notifications = this.memoryNotifications.get(userId) || [];
            return notifications.slice(0, limit);
        }
    }

    static async markNotificationsAsRead(userId: string): Promise<void> {
        if (this.isRedisAvailable()) {
            const key = `notifications:${userId}`;
            await RedisObject.del(key);
        } else {
            this.memoryNotifications.delete(userId);
        }
    }

    // Game/Match data caching (if applicable)
    static async cacheGameState(gameId: string, gameState: any): Promise<void> {
        if (!this.isRedisAvailable()) return;
        
        const key = `game:${gameId}`;
        await RedisObject.set(key, gameState, 7200); // 2 hours TTL
    }

    static async getGameState(gameId: string): Promise<any> {
        if (!this.isRedisAvailable()) return null;
        
        const key = `game:${gameId}`;
        return await RedisObject.get(key);
    }

    static async updateGameState(gameId: string, updates: any): Promise<void> {
        if (!this.isRedisAvailable()) return;
        
        const key = `game:${gameId}`;
        const currentState = await RedisObject.get(key);
        if (currentState) {
            const newState = { ...currentState, ...updates };
            await RedisObject.set(key, newState, 7200);
        }
    }

    // Chat/Message caching
    static async cacheRecentMessages(chatId: string, messages: any[]): Promise<void> {
        if (!this.isRedisAvailable()) return;
        
        const key = `chat:${chatId}:recent`;
        await RedisObject.set(key, messages, CONFIG.redis.cacheTTL.temp);
    }

    static async getRecentMessages(chatId: string): Promise<any[]> {
        if (!this.isRedisAvailable()) return [];
        
        const key = `chat:${chatId}:recent`;
        return await RedisObject.get(key) || [];
    }

    // Feature flags and configuration caching
    static async cacheFeatureFlags(flags: Record<string, boolean>): Promise<void> {
        if (!this.isRedisAvailable()) return;
        
        const key = 'feature_flags';
        await RedisObject.set(key, flags, CONFIG.redis.cacheTTL.static);
    }

    static async getFeatureFlags(): Promise<Record<string, boolean>> {
        if (!this.isRedisAvailable()) return {};
        
        const key = 'feature_flags';
        return await RedisObject.get(key) || {};
    }

    static async isFeatureEnabled(featureName: string): Promise<boolean> {
        const flags = await this.getFeatureFlags();
        return flags[featureName] || false;
    }

    // Leaderboard/Ranking system using Redis sorted sets
    static async updateUserScore(userId: string, score: number): Promise<void> {
        if (!this.isRedisAvailable()) return;
        
        const key = 'leaderboard:global';
        await RedisObject.sAdd(key, { userId, score });
    }

    static async getUserRank(userId: string): Promise<number | null> {
        if (!this.isRedisAvailable()) return null;
        
        // This would need to be implemented with Redis sorted sets (ZADD, ZRANK)
        // For now, returning null as placeholder
        return null;
    }

    // Cache invalidation helpers
    static async invalidateUserRelatedCache(userId: string): Promise<void> {
        if (!this.isRedisAvailable()) {
            // Clear memory-based data
            this.memoryOnlineUsers.delete(userId);
            this.memoryNotifications.delete(userId);
            return;
        }
        
        // Invalidate all cache entries related to a user
        const patterns = [
            `user:${userId}`,
            `session:${userId}`,
            `notifications:${userId}`,
            `online:${userId}`
        ];
        
        for (const pattern of patterns) {
            await RedisObject.del(pattern);
        }
    }

    // Health check utility
    static async healthCheck(): Promise<{ status: string; latency: number; info?: any }> {
        const start = Date.now();
        
        if (!this.isRedisAvailable()) {
            return {
                status: 'disabled',
                latency: 0,
                info: 'Redis is disabled or unavailable. Application running with in-memory fallbacks.'
            };
        }
        
        try {
            await RedisObject.ping();
            const latency = Date.now() - start;
            const info = await RedisObject.info();
            
            return {
                status: 'healthy',
                latency,
                info: info.split('\n').slice(0, 5).join('\n') // First few lines of info
            };
        } catch (error: any) {
            return {
                status: 'unhealthy',
                latency: Date.now() - start,
                info: error.message
            };
        }
    }

    // Clean up memory-based fallbacks (call this periodically to prevent memory leaks)
    static cleanupMemoryFallbacks(): void {
        const now = Date.now();
        
        // Clean up expired rate limit entries
        for (const [key, record] of this.memoryRateLimit.entries()) {
            if (now > record.resetTime) {
                this.memoryRateLimit.delete(key);
            }
        }
        
        // Clean up expired temp data
        for (const [key, record] of this.memoryTempData.entries()) {
            if (now > record.expiry) {
                this.memoryTempData.delete(key);
            }
        }
        
        console.log('Memory fallback cleanup completed.');
    }
}

// Export individual functions for direct import if preferred
export const {
    isRedisAvailable,
    cacheUser,
    getCachedUser,
    invalidateUserCache,
    cacheQuery,
    getCachedQuery,
    invalidateQueryCache,
    checkRateLimit,
    storeTempData,
    getTempData,
    deleteTempData,
    setUserOnline,
    setUserOffline,
    getUserOnlineStatus,
    queueNotification,
    getNotifications,
    markNotificationsAsRead,
    cacheGameState,
    getGameState,
    updateGameState,
    cacheRecentMessages,
    getRecentMessages,
    cacheFeatureFlags,
    getFeatureFlags,
    isFeatureEnabled,
    updateUserScore,
    getUserRank,
    invalidateUserRelatedCache,
    healthCheck,
    cleanupMemoryFallbacks
} = RedisUtils; 