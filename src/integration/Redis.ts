// This class is a wrapper for the ioredis library, providing methods to connect, disconnect, 
// and perform various Redis operations including caching, session management, pub/sub, and more.
// Redis usage is OPTIONAL - all operations will gracefully fallback when Redis is disabled or unavailable.

// List of methods provided by the RedisObject class along with short instructions for developers:

// connect()
// Description: Establishes connection to Redis server if enabled.
// Usage: Call this method to initialize Redis connection. Safe to call even if Redis is disabled.

// disconnect()
// Description: Closes the Redis connection if active.
// Usage: Call this method when shutting down the application. Safe to call even if Redis is disabled.

// set(key: string, value: any, ttl?: number)
// Description: Sets a key-value pair in Redis with optional TTL. No-op if Redis is disabled.
// Usage: Provide key, value, and optional TTL in seconds. Value can be any JSON serializable data.

// get(key: string)
// Description: Gets a value from Redis by key. Returns null if Redis is disabled.
// Usage: Provide the key to retrieve. Returns null if key doesn't exist or Redis is disabled.

// del(key: string | string[])
// Description: Deletes one or multiple keys from Redis. No-op if Redis is disabled.
// Usage: Provide a single key string or array of keys to delete.

// exists(key: string)
// Description: Checks if a key exists in Redis. Returns false if Redis is disabled.
// Usage: Provide the key to check. Returns boolean.

// expire(key: string, ttl: number)
// Description: Sets TTL for an existing key. No-op if Redis is disabled.
// Usage: Provide the key and TTL in seconds.

// ttl(key: string)  
// Description: Gets the remaining TTL for a key. Returns -2 if Redis is disabled.
// Usage: Provide the key. Returns TTL in seconds, -1 if key has no expiry, -2 if key doesn't exist or Redis disabled.

// increment(key: string, by?: number)
// Description: Increments a numeric value in Redis. Returns 0 if Redis is disabled.
// Usage: Provide the key and optional increment value (default 1).

// decrement(key: string, by?: number)
// Description: Decrements a numeric value in Redis. Returns 0 if Redis is disabled.
// Usage: Provide the key and optional decrement value (default 1).

// hSet(key: string, field: string, value: any)
// Description: Sets a field in a Redis hash. No-op if Redis is disabled.
// Usage: Provide hash key, field name, and value.

// hGet(key: string, field: string)
// Description: Gets a field value from a Redis hash. Returns null if Redis is disabled.
// Usage: Provide hash key and field name.

// hGetAll(key: string)
// Description: Gets all fields and values from a Redis hash. Returns empty object if Redis is disabled.
// Usage: Provide the hash key.

// hDel(key: string, field: string | string[])
// Description: Deletes one or more fields from a Redis hash. No-op if Redis is disabled.
// Usage: Provide hash key and field name(s).

// lPush(key: string, ...values: any[])
// Description: Pushes values to the left of a Redis list. No-op if Redis is disabled.
// Usage: Provide list key and values to push.

// rPush(key: string, ...values: any[])
// Description: Pushes values to the right of a Redis list. No-op if Redis is disabled.
// Usage: Provide list key and values to push.

// lPop(key: string)
// Description: Pops a value from the left of a Redis list. Returns null if Redis is disabled.
// Usage: Provide the list key.

// rPop(key: string)
// Description: Pops a value from the right of a Redis list. Returns null if Redis is disabled.
// Usage: Provide the list key.

// lRange(key: string, start: number, stop: number)
// Description: Gets a range of values from a Redis list. Returns empty array if Redis is disabled.
// Usage: Provide list key, start index, and stop index.

// sAdd(key: string, ...members: any[])
// Description: Adds members to a Redis set. No-op if Redis is disabled.
// Usage: Provide set key and members to add.

// sMembers(key: string)
// Description: Gets all members of a Redis set. Returns empty array if Redis is disabled.
// Usage: Provide the set key.

// sRem(key: string, ...members: any[])
// Description: Removes members from a Redis set. No-op if Redis is disabled.
// Usage: Provide set key and members to remove.

// cache(key: string, fetcher: () => Promise<any>, ttl?: number)
// Description: Cache-aside pattern implementation. Always calls fetcher if Redis is disabled.
// Usage: Provide cache key, async function to fetch data, and optional TTL.

// setSession(userId: string, sessionData: any, ttl?: number)
// Description: Sets user session data in Redis. No-op if Redis is disabled.
// Usage: Provide user ID, session data object, and optional TTL.

// getSession(userId: string)
// Description: Gets user session data from Redis. Returns null if Redis is disabled.
// Usage: Provide user ID to retrieve session data.

// deleteSession(userId: string)
// Description: Deletes user session from Redis. No-op if Redis is disabled.
// Usage: Provide user ID to delete session.

// lock(key: string, ttl?: number)
// Description: Acquires a distributed lock. Returns null if Redis is disabled.
// Usage: Provide lock key and optional TTL. Returns lock token if successful.

// unlock(key: string, token: string)
// Description: Releases a distributed lock. Returns false if Redis is disabled.
// Usage: Provide lock key and lock token.

// publish(channel: string, message: any)
// Description: Publishes a message to a Redis channel. Returns 0 if Redis is disabled.
// Usage: Provide channel name and message to publish.

// subscribe(channel: string, callback: (message: any) => void)
// Description: Subscribes to a Redis channel. No-op if Redis is disabled.
// Usage: Provide channel name and callback function for incoming messages.

// flushPattern(pattern: string)
// Description: Deletes all keys matching a pattern. Returns 0 if Redis is disabled.
// Usage: Provide a pattern (with wildcards) to delete matching keys. Use with caution!

// isAvailable()
// Description: Checks if Redis is enabled and connected.
// Usage: Use this to check if Redis features are available before using them.

import "dotenv/config";
import Redis from "ioredis";
import CONFIG from "../config/config";

let _REDIS: Redis | null = null;
let _REDIS_SUBSCRIBER: Redis | null = null;
let _REDIS_AVAILABLE = false;

export const RedisConnect = async (): Promise<void> => {
    // Skip Redis connection if disabled
    if (!CONFIG.redis.enabled) {
        console.log("Redis is disabled in configuration. Skipping Redis connection.");
        _REDIS_AVAILABLE = false;
        return;
    }

    try {
        _REDIS = new Redis({
            host: CONFIG.redis.host,
            port: CONFIG.redis.port,
            password: CONFIG.redis.password,
            db: CONFIG.redis.db,
            maxRetriesPerRequest: CONFIG.redis.maxRetriesPerRequest,
            lazyConnect: CONFIG.redis.lazyConnect,
            keyPrefix: CONFIG.redis.keyPrefix,
        });

        // Create a separate connection for pub/sub
        _REDIS_SUBSCRIBER = new Redis({
            host: CONFIG.redis.host,
            port: CONFIG.redis.port,
            password: CONFIG.redis.password,
            db: CONFIG.redis.db,
            maxRetriesPerRequest: CONFIG.redis.maxRetriesPerRequest,
            lazyConnect: CONFIG.redis.lazyConnect,
            keyPrefix: CONFIG.redis.keyPrefix,
        });

        // Connect to Redis
        await _REDIS.connect();
        await _REDIS_SUBSCRIBER.connect();

        _REDIS_AVAILABLE = true;
        console.log("Redis connection established successfully.");

        // Set up event listeners
        _REDIS.on('error', (error) => {
            console.error('Redis connection error:', error);
            _REDIS_AVAILABLE = false;
        });

        _REDIS.on('reconnecting', () => {
            console.log('Redis reconnecting...');
            _REDIS_AVAILABLE = false;
        });

        _REDIS.on('ready', () => {
            console.log('Redis connection ready.');
            _REDIS_AVAILABLE = true;
        });

    } catch (error) {
        console.error("Redis connection failed. Continuing without Redis:", error);
        _REDIS_AVAILABLE = false;
        _REDIS = null;
        _REDIS_SUBSCRIBER = null;
        // Don't throw error - allow application to continue without Redis
    }
};

export const RedisDisconnect = async (): Promise<void> => {
    try {
        if (_REDIS) {
            await _REDIS.disconnect();
            _REDIS = null;
        }
        if (_REDIS_SUBSCRIBER) {
            await _REDIS_SUBSCRIBER.disconnect();
            _REDIS_SUBSCRIBER = null;
        }
        _REDIS_AVAILABLE = false;
        console.log("Redis connections closed successfully.");
    } catch (error) {
        console.error("Error closing Redis connections:", error);
        // Don't throw error during cleanup
    }
};

// Helper function to check if Redis is available
const isRedisAvailable = (): boolean => {
    return CONFIG.redis.enabled && _REDIS_AVAILABLE && _REDIS !== null;
};

// Redis operations object
export const RedisObject = {
    // Check if Redis is available
    isAvailable(): boolean {
        return isRedisAvailable();
    },

    // Basic key-value operations
    async set(key: string, value: any, ttl?: number): Promise<void> {
        if (!isRedisAvailable()) return;
        
        try {
            const serializedValue = JSON.stringify(value);
            if (ttl) {
                await _REDIS!.setex(key, ttl, serializedValue);
            } else {
                await _REDIS!.set(key, serializedValue);
            }
        } catch (error: any) {
            console.warn(`Redis SET error for key ${key}: ${error.message}. Continuing without caching.`);
        }
    },

    async get(key: string): Promise<any> {
        if (!isRedisAvailable()) return null;
        
        try {
            const value = await _REDIS!.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error: any) {
            console.warn(`Redis GET error for key ${key}: ${error.message}. Returning null.`);
            return null;
        }
    },

    async del(key: string | string[]): Promise<number> {
        if (!isRedisAvailable()) return 0;
        
        try {
            if (Array.isArray(key)) {
                if (key.length === 0) return 0;
                return await _REDIS!.del(...key);
            } else {
                return await _REDIS!.del(key);
            }
        } catch (error: any) {
            console.warn(`Redis DEL error for key(s) ${key}: ${error.message}`);
            return 0;
        }
    },

    async exists(key: string): Promise<boolean> {
        if (!isRedisAvailable()) return false;
        
        try {
            const result = await _REDIS!.exists(key);
            return result === 1;
        } catch (error: any) {
            console.warn(`Redis EXISTS error for key ${key}: ${error.message}`);
            return false;
        }
    },

    async expire(key: string, ttl: number): Promise<boolean> {
        if (!isRedisAvailable()) return false;
        
        try {
            const result = await _REDIS!.expire(key, ttl);
            return result === 1;
        } catch (error: any) {
            console.warn(`Redis EXPIRE error for key ${key}: ${error.message}`);
            return false;
        }
    },

    async ttl(key: string): Promise<number> {
        if (!isRedisAvailable()) return -2; // Redis convention for key not found
        
        try {
            return await _REDIS!.ttl(key);
        } catch (error: any) {
            console.warn(`Redis TTL error for key ${key}: ${error.message}`);
            return -2;
        }
    },

    // Numeric operations
    async increment(key: string, by: number = 1): Promise<number> {
        if (!isRedisAvailable()) return 0;
        
        try {
            return await _REDIS!.incrby(key, by);
        } catch (error: any) {
            console.warn(`Redis INCRBY error for key ${key}: ${error.message}`);
            return 0;
        }
    },

    async decrement(key: string, by: number = 1): Promise<number> {
        if (!isRedisAvailable()) return 0;
        
        try {
            return await _REDIS!.decrby(key, by);
        } catch (error: any) {
            console.warn(`Redis DECRBY error for key ${key}: ${error.message}`);
            return 0;
        }
    },

    // Hash operations
    async hSet(key: string, field: string, value: any): Promise<number> {
        if (!isRedisAvailable()) return 0;
        
        try {
            const serializedValue = JSON.stringify(value);
            return await _REDIS!.hset(key, field, serializedValue);
        } catch (error: any) {
            console.warn(`Redis HSET error for key ${key}, field ${field}: ${error.message}`);
            return 0;
        }
    },

    async hGet(key: string, field: string): Promise<any> {
        if (!isRedisAvailable()) return null;
        
        try {
            const value = await _REDIS!.hget(key, field);
            return value ? JSON.parse(value) : null;
        } catch (error: any) {
            console.warn(`Redis HGET error for key ${key}, field ${field}: ${error.message}`);
            return null;
        }
    },

    async hGetAll(key: string): Promise<Record<string, any>> {
        if (!isRedisAvailable()) return {};
        
        try {
            const hash = await _REDIS!.hgetall(key);
            const result: Record<string, any> = {};
            for (const [field, value] of Object.entries(hash)) {
                try {
                    result[field] = JSON.parse(value);
                } catch {
                    result[field] = value;
                }
            }
            return result;
        } catch (error: any) {
            console.warn(`Redis HGETALL error for key ${key}: ${error.message}`);
            return {};
        }
    },

    async hDel(key: string, field: string | string[]): Promise<number> {
        if (!isRedisAvailable()) return 0;
        
        try {
            if (Array.isArray(field)) {
                if (field.length === 0) return 0;
                return await _REDIS!.hdel(key, ...field);
            } else {
                return await _REDIS!.hdel(key, field);
            }
        } catch (error: any) {
            console.warn(`Redis HDEL error for key ${key}, field(s) ${field}: ${error.message}`);
            return 0;
        }
    },

    // List operations
    async lPush(key: string, ...values: any[]): Promise<number> {
        if (!isRedisAvailable()) return 0;
        
        try {
            const serializedValues = values.map(v => JSON.stringify(v));
            return await _REDIS!.lpush(key, ...serializedValues);
        } catch (error: any) {
            console.warn(`Redis LPUSH error for key ${key}: ${error.message}`);
            return 0;
        }
    },

    async rPush(key: string, ...values: any[]): Promise<number> {
        if (!isRedisAvailable()) return 0;
        
        try {
            const serializedValues = values.map(v => JSON.stringify(v));
            return await _REDIS!.rpush(key, ...serializedValues);
        } catch (error: any) {
            console.warn(`Redis RPUSH error for key ${key}: ${error.message}`);
            return 0;
        }
    },

    async lPop(key: string): Promise<any> {
        if (!isRedisAvailable()) return null;
        
        try {
            const value = await _REDIS!.lpop(key);
            return value ? JSON.parse(value) : null;
        } catch (error: any) {
            console.warn(`Redis LPOP error for key ${key}: ${error.message}`);
            return null;
        }
    },

    async rPop(key: string): Promise<any> {
        if (!isRedisAvailable()) return null;
        
        try {
            const value = await _REDIS!.rpop(key);
            return value ? JSON.parse(value) : null;
        } catch (error: any) {
            console.warn(`Redis RPOP error for key ${key}: ${error.message}`);
            return null;
        }
    },

    async lRange(key: string, start: number, stop: number): Promise<any[]> {
        if (!isRedisAvailable()) return [];
        
        try {
            const values = await _REDIS!.lrange(key, start, stop);
            return values.map(v => {
                try {
                    return JSON.parse(v);
                } catch {
                    return v;
                }
            });
        } catch (error: any) {
            console.warn(`Redis LRANGE error for key ${key}: ${error.message}`);
            return [];
        }
    },

    // Set operations
    async sAdd(key: string, ...members: any[]): Promise<number> {
        if (!isRedisAvailable()) return 0;
        
        try {
            const serializedMembers = members.map(m => JSON.stringify(m));
            return await _REDIS!.sadd(key, ...serializedMembers);
        } catch (error: any) {
            console.warn(`Redis SADD error for key ${key}: ${error.message}`);
            return 0;
        }
    },

    async sMembers(key: string): Promise<any[]> {
        if (!isRedisAvailable()) return [];
        
        try {
            const members = await _REDIS!.smembers(key);
            return members.map(m => {
                try {
                    return JSON.parse(m);
                } catch {
                    return m;
                }
            });
        } catch (error: any) {
            console.warn(`Redis SMEMBERS error for key ${key}: ${error.message}`);
            return [];
        }
    },

    async sRem(key: string, ...members: any[]): Promise<number> {
        if (!isRedisAvailable()) return 0;
        
        try {
            const serializedMembers = members.map(m => JSON.stringify(m));
            return await _REDIS!.srem(key, ...serializedMembers);
        } catch (error: any) {
            console.warn(`Redis SREM error for key ${key}: ${error.message}`);
            return 0;
        }
    },

    // Cache-aside pattern
    async cache<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
        if (!isRedisAvailable()) {
            // If Redis is not available, always fetch fresh data
            return await fetcher();
        }
        
        try {
            // Try to get from cache first
            const cached = await this.get(key);
            if (cached !== null) {
                return cached;
            }

            // If not in cache, fetch the data
            const data = await fetcher();
            
            // Store in cache
            const cacheTTL = ttl || CONFIG.redis.defaultTTL;
            await this.set(key, data, cacheTTL);
            
            return data;
        } catch (error: any) {
            console.warn(`Redis CACHE error for key ${key}: ${error.message}. Falling back to fetcher.`);
            return await fetcher();
        }
    },

    // Session management
    async setSession(userId: string, sessionData: any, ttl?: number): Promise<void> {
        if (!isRedisAvailable()) return;
        
        const sessionKey = `session:${userId}`;
        const sessionTTL = ttl || CONFIG.redis.cacheTTL.session;
        await this.set(sessionKey, sessionData, sessionTTL);
    },

    async getSession(userId: string): Promise<any> {
        if (!isRedisAvailable()) return null;
        
        const sessionKey = `session:${userId}`;
        return await this.get(sessionKey);
    },

    async deleteSession(userId: string): Promise<void> {
        if (!isRedisAvailable()) return;
        
        const sessionKey = `session:${userId}`;
        await this.del(sessionKey);
    },

    // Distributed locking
    async lock(key: string, ttl: number = 10): Promise<string | null> {
        if (!isRedisAvailable()) return null;
        
        try {
            const lockKey = `lock:${key}`;
            const token = `${Date.now()}-${Math.random()}`;
            const result = await _REDIS!.set(lockKey, token, 'PX', ttl * 1000, 'NX');
            return result === 'OK' ? token : null;
        } catch (error: any) {
            console.warn(`Redis LOCK error for key ${key}: ${error.message}`);
            return null;
        }
    },

    async unlock(key: string, token: string): Promise<boolean> {
        if (!isRedisAvailable()) return false;
        
        try {
            const lockKey = `lock:${key}`;
            const script = `
                if redis.call("get", KEYS[1]) == ARGV[1] then
                    return redis.call("del", KEYS[1])
                else
                    return 0
                end
            `;
            const result = await _REDIS!.eval(script, 1, lockKey, token);
            return result === 1;
        } catch (error: any) {
            console.warn(`Redis UNLOCK error for key ${key}: ${error.message}`);
            return false;
        }
    },

    // Pub/Sub operations
    async publish(channel: string, message: any): Promise<number> {
        if (!isRedisAvailable()) return 0;
        
        try {
            const serializedMessage = JSON.stringify(message);
            return await _REDIS!.publish(channel, serializedMessage);
        } catch (error: any) {
            console.warn(`Redis PUBLISH error for channel ${channel}: ${error.message}`);
            return 0;
        }
    },

    async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
        if (!isRedisAvailable()) return;
        
        try {
            await _REDIS_SUBSCRIBER!.subscribe(channel);
            _REDIS_SUBSCRIBER!.on('message', (receivedChannel, message) => {
                if (receivedChannel === channel) {
                    try {
                        const parsedMessage = JSON.parse(message);
                        callback(parsedMessage);
                    } catch {
                        callback(message);
                    }
                }
            });
        } catch (error: any) {
            console.warn(`Redis SUBSCRIBE error for channel ${channel}: ${error.message}`);
        }
    },

    // Pattern-based operations (use with caution)
    async flushPattern(pattern: string): Promise<number> {
        if (!isRedisAvailable()) return 0;
        
        try {
            const keys = await _REDIS!.keys(pattern);
            if (keys.length === 0) return 0;
            return await _REDIS!.del(...keys);
        } catch (error: any) {
            console.warn(`Redis FLUSH_PATTERN error for pattern ${pattern}: ${error.message}`);
            return 0;
        }
    },

    // Health check
    async ping(): Promise<string> {
        if (!isRedisAvailable()) return 'Redis not available';
        
        try {
            return await _REDIS!.ping();
        } catch (error: any) {
            console.warn(`Redis PING error: ${error.message}`);
            return 'Redis error';
        }
    },

    // Get Redis info
    async info(): Promise<string> {
        if (!isRedisAvailable()) return 'Redis not available';
        
        try {
            return await _REDIS!.info();
        } catch (error: any) {
            console.warn(`Redis INFO error: ${error.message}`);
            return 'Redis info unavailable';
        }
    }
};

// Export Redis instance for advanced operations (may be null)
export { _REDIS as RedisInstance }; 