const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
    constructor() {
        this.defaultTTL = 3600; // 1 hour default
        this.keyPrefix = 'sem:'; // Student Event Management prefix
    }

    // Generate cache key with prefix
    getKey(key) {
        return `${this.keyPrefix}${key}`;
    }

    // Set cache with TTL
    async set(key, value, ttl = this.defaultTTL) {
        try {
            const cacheKey = this.getKey(key);
            const serializedValue = JSON.stringify(value);

            if (ttl > 0) {
                await redisClient.set(cacheKey, serializedValue, ttl);
            } else {
                await redisClient.set(cacheKey, serializedValue);
            }

            logger.debug(`Cache set: ${cacheKey} (TTL: ${ttl}s)`);
            return true;
        } catch (error) {
            logger.error('Cache set error:', error);
            return false;
        }
    }

    // Get from cache
    async get(key) {
        try {
            const cacheKey = this.getKey(key);
            const value = await redisClient.get(cacheKey);

            if (value === null) {
                logger.debug(`Cache miss: ${cacheKey}`);
                return null;
            }

            logger.debug(`Cache hit: ${cacheKey}`);
            return JSON.parse(value);
        } catch (error) {
            logger.error('Cache get error:', error);
            return null;
        }
    }

    // Delete from cache
    async del(key) {
        try {
            const cacheKey = this.getKey(key);
            const result = await redisClient.del(cacheKey);

            logger.debug(`Cache deleted: ${cacheKey}`);
            return result > 0;
        } catch (error) {
            logger.error('Cache delete error:', error);
            return false;
        }
    }

    // Check if key exists
    async exists(key) {
        try {
            const cacheKey = this.getKey(key);
            const result = await redisClient.exists(cacheKey);
            return result === 1;
        } catch (error) {
            logger.error('Cache exists error:', error);
            return false;
        }
    }

    // Set TTL for existing key
    async expire(key, ttl) {
        try {
            const cacheKey = this.getKey(key);
            const result = await redisClient.expire(cacheKey, ttl);
            return result === 1;
        } catch (error) {
            logger.error('Cache expire error:', error);
            return false;
        }
    }

    // Get TTL for key
    async ttl(key) {
        try {
            const cacheKey = this.getKey(key);
            return await redisClient.ttl(cacheKey);
        } catch (error) {
            logger.error('Cache TTL error:', error);
            return -1;
        }
    }

    // Clear cache by pattern
    async clearPattern(pattern) {
        try {
            const searchPattern = this.getKey(pattern);
            const keys = await redisClient.keys(searchPattern);

            if (keys.length === 0) {
                return 0;
            }

            const result = await redisClient.del(...keys);
            logger.info(`Cache pattern cleared: ${pattern} (${result} keys deleted)`);
            return result;
        } catch (error) {
            logger.error('Cache clear pattern error:', error);
            return 0;
        }
    }

    // Get or set cache (cache-aside pattern)
    async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
        try {
            // Try to get from cache first
            let value = await this.get(key);

            if (value !== null) {
                return value;
            }

            // Cache miss - fetch from source
            value = await fetchFunction();

            if (value !== null && value !== undefined) {
                await this.set(key, value, ttl);
            }

            return value;
        } catch (error) {
            logger.error('Cache getOrSet error:', error);
            // Return result from fetch function even if cache fails
            try {
                return await fetchFunction();
            } catch (fetchError) {
                logger.error('Fetch function error:', fetchError);
                throw fetchError;
            }
        }
    }

    // Increment counter
    async increment(key, amount = 1, ttl = this.defaultTTL) {
        try {
            const cacheKey = this.getKey(key);
            const result = await redisClient.incrby(cacheKey, amount);

            // Set TTL if this is a new key
            if (result === amount) {
                await redisClient.expire(cacheKey, ttl);
            }

            return result;
        } catch (error) {
            logger.error('Cache increment error:', error);
            return 0;
        }
    }

    // Decrement counter
    async decrement(key, amount = 1) {
        try {
            const cacheKey = this.getKey(key);
            return await redisClient.decrby(cacheKey, amount);
        } catch (error) {
            logger.error('Cache decrement error:', error);
            return 0;
        }
    }

    // Add to set
    async sAdd(key, ...members) {
        try {
            const cacheKey = this.getKey(key);
            return await redisClient.sadd(cacheKey, ...members);
        } catch (error) {
            logger.error('Cache sAdd error:', error);
            return 0;
        }
    }

    // Remove from set
    async sRem(key, ...members) {
        try {
            const cacheKey = this.getKey(key);
            return await redisClient.srem(cacheKey, ...members);
        } catch (error) {
            logger.error('Cache sRem error:', error);
            return 0;
        }
    }

    // Check if member exists in set
    async sIsMember(key, member) {
        try {
            const cacheKey = this.getKey(key);
            const result = await redisClient.sismember(cacheKey, member);
            return result === 1;
        } catch (error) {
            logger.error('Cache sIsMember error:', error);
            return false;
        }
    }

    // Get all members of set
    async sMembers(key) {
        try {
            const cacheKey = this.getKey(key);
            return await redisClient.smembers(cacheKey);
        } catch (error) {
            logger.error('Cache sMembers error:', error);
            return [];
        }
    }

    // Get set size
    async sCard(key) {
        try {
            const cacheKey = this.getKey(key);
            return await redisClient.scard(cacheKey);
        } catch (error) {
            logger.error('Cache sCard error:', error);
            return 0;
        }
    }

    // Hash operations
    async hSet(key, field, value) {
        try {
            const cacheKey = this.getKey(key);
            const serializedValue = JSON.stringify(value);
            return await redisClient.hset(cacheKey, field, serializedValue);
        } catch (error) {
            logger.error('Cache hSet error:', error);
            return false;
        }
    }

    async hGet(key, field) {
        try {
            const cacheKey = this.getKey(key);
            const value = await redisClient.hget(cacheKey, field);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Cache hGet error:', error);
            return null;
        }
    }

    async hGetAll(key) {
        try {
            const cacheKey = this.getKey(key);
            const hash = await redisClient.hgetall(cacheKey);

            const result = {};
            for (const [field, value] of Object.entries(hash)) {
                try {
                    result[field] = JSON.parse(value);
                } catch (parseError) {
                    result[field] = value;
                }
            }

            return result;
        } catch (error) {
            logger.error('Cache hGetAll error:', error);
            return {};
        }
    }

    async hDel(key, ...fields) {
        try {
            const cacheKey = this.getKey(key);
            return await redisClient.hdel(cacheKey, ...fields);
        } catch (error) {
            logger.error('Cache hDel error:', error);
            return 0;
        }
    }

    // List operations
    async lPush(key, ...values) {
        try {
            const cacheKey = this.getKey(key);
            const serializedValues = values.map(v => JSON.stringify(v));
            return await redisClient.lpush(cacheKey, ...serializedValues);
        } catch (error) {
            logger.error('Cache lPush error:', error);
            return 0;
        }
    }

    async lPop(key) {
        try {
            const cacheKey = this.getKey(key);
            const value = await redisClient.lpop(cacheKey);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Cache lPop error:', error);
            return null;
        }
    }

    async lLen(key) {
        try {
            const cacheKey = this.getKey(key);
            return await redisClient.llen(cacheKey);
        } catch (error) {
            logger.error('Cache lLen error:', error);
            return 0;
        }
    }

    async lRange(key, start, stop) {
        try {
            const cacheKey = this.getKey(key);
            const values = await redisClient.lrange(cacheKey, start, stop);
            return values.map(value => {
                try {
                    return JSON.parse(value);
                } catch (parseError) {
                    return value;
                }
            });
        } catch (error) {
            logger.error('Cache lRange error:', error);
            return [];
        }
    }

    // Predefined cache methods for common use cases

    // User cache
    async cacheUser(userId, userData, ttl = 3600) {
        return await this.set(`user:${userId}`, userData, ttl);
    }

    async getCachedUser(userId) {
        return await this.get(`user:${userId}`);
    }

    async invalidateUser(userId) {
        await this.del(`user:${userId}`);
        await this.clearPattern(`user:${userId}:*`);
    }

    // Event cache
    async cacheEvent(eventId, eventData, ttl = 1800) { // 30 minutes
        return await this.set(`event:${eventId}`, eventData, ttl);
    }

    async getCachedEvent(eventId) {
        return await this.get(`event:${eventId}`);
    }

    async invalidateEvent(eventId) {
        await this.del(`event:${eventId}`);
        await this.clearPattern(`event:${eventId}:*`);
        await this.clearPattern(`events:*`); // Clear event lists
    }

    // Search cache
    async cacheSearchResults(query, filters, results, ttl = 300) { // 5 minutes
        const cacheKey = `search:${this.hashQuery(query, filters)}`;
        return await this.set(cacheKey, results, ttl);
    }

    async getCachedSearchResults(query, filters) {
        const cacheKey = `search:${this.hashQuery(query, filters)}`;
        return await this.get(cacheKey);
    }

    // Session cache
    async setSession(sessionId, sessionData, ttl = 86400) { // 24 hours
        return await this.set(`session:${sessionId}`, sessionData, ttl);
    }

    async getSession(sessionId) {
        return await this.get(`session:${sessionId}`);
    }

    async deleteSession(sessionId) {
        return await this.del(`session:${sessionId}`);
    }

    // Rate limiting cache
    async incrementRateLimit(identifier, window = 3600, limit = 100) {
        try {
            const key = `rate_limit:${identifier}`;
            const current = await this.increment(key, 1, window);

            return {
                count: current,
                limit,
                remaining: Math.max(0, limit - current),
                resetTime: Date.now() + (window * 1000),
                exceeded: current > limit
            };
        } catch (error) {
            logger.error('Rate limit increment error:', error);
            return {
                count: 0,
                limit,
                remaining: limit,
                resetTime: Date.now() + (window * 1000),
                exceeded: false
            };
        }
    }

    // Statistics cache
    async cacheStats(type, data, ttl = 300) { // 5 minutes
        return await this.set(`stats:${type}`, data, ttl);
    }

    async getCachedStats(type) {
        return await this.get(`stats:${type}`);
    }

    // Configuration cache
    async cacheConfig(configKey, configData, ttl = 3600) {
        return await this.set(`config:${configKey}`, configData, ttl);
    }

    async getCachedConfig(configKey) {
        return await this.get(`config:${configKey}`);
    }

    // Notification cache
    async cacheNotifications(userId, notifications, ttl = 600) { // 10 minutes
        return await this.set(`notifications:${userId}`, notifications, ttl);
    }

    async getCachedNotifications(userId) {
        return await this.get(`notifications:${userId}`);
    }

    async invalidateNotifications(userId) {
        return await this.del(`notifications:${userId}`);
    }

    // Utility methods
    hashQuery(query, filters = {}) {
        const crypto = require('crypto');
        const queryString = JSON.stringify({ query, filters });
        return crypto.createHash('md5').update(queryString).digest('hex');
    }

    // Get cache statistics
    async getStats() {
        try {
            const info = await redisClient.info('memory');
            const keyspace = await redisClient.info('keyspace');

            // Parse Redis info
            const memoryStats = this.parseRedisInfo(info);
            const keyspaceStats = this.parseRedisInfo(keyspace);

            return {
                memory: {
                    used: memoryStats.used_memory_human,
                    peak: memoryStats.used_memory_peak_human,
                    rss: memoryStats.used_memory_rss_human
                },
                keyspace: keyspaceStats,
                uptime: memoryStats.uptime_in_seconds,
                connections: memoryStats.connected_clients
            };
        } catch (error) {
            logger.error('Get cache stats error:', error);
            return {
                memory: { used: 'N/A', peak: 'N/A', rss: 'N/A' },
                keyspace: {},
                uptime: 0,
                connections: 0
            };
        }
    }

    parseRedisInfo(info) {
        const lines = info.split('\r\n');
        const result = {};

        lines.forEach(line => {
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split(':');
                if (key && value) {
                    result[key] = isNaN(value) ? value : Number(value);
                }
            }
        });

        return result;
    }

    // Warm up cache
    async warmUpCache() {
        try {
            logger.info('Starting cache warm-up...');

            // Warm up common data
            const Event = require('../models/Event');
            const Category = require('../models/Category');

            // Cache featured events
            const featuredEvents = await Event.findFeatured(10);
            await this.set('events:featured', featuredEvents, 1800);

            // Cache upcoming events
            const upcomingEvents = await Event.findUpcoming(20);
            await this.set('events:upcoming', upcomingEvents, 900);

            // Cache categories
            const categories = await Category.find({ active: true });
            await this.set('categories:active', categories, 3600);

            logger.info('Cache warm-up completed');
            return true;
        } catch (error) {
            logger.error('Cache warm-up error:', error);
            return false;
        }
    }

    // Clear all cache
    async clearAll() {
        try {
            const keys = await redisClient.keys(`${this.keyPrefix}*`);

            if (keys.length === 0) {
                return 0;
            }

            const result = await redisClient.del(...keys);
            logger.info(`All cache cleared: ${result} keys deleted`);
            return result;
        } catch (error) {
            logger.error('Clear all cache error:', error);
            return 0;
        }
    }

    // Health check
    async healthCheck() {
        try {
            const testKey = 'health_check';
            const testValue = { timestamp: Date.now(), test: true };

            await this.set(testKey, testValue, 10);
            const retrieved = await this.get(testKey);
            await this.del(testKey);

            const isHealthy = retrieved && retrieved.timestamp === testValue.timestamp;

            return {
                healthy: isHealthy,
                timestamp: new Date().toISOString(),
                latency: Date.now() - testValue.timestamp
            };
        } catch (error) {
            logger.error('Cache health check error:', error);
            return {
                healthy: false,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    // Bulk operations
    async mSet(keyValuePairs, ttl = this.defaultTTL) {
        try {
            const pipeline = redisClient.pipeline();

            for (const [key, value] of keyValuePairs) {
                const cacheKey = this.getKey(key);
                const serializedValue = JSON.stringify(value);

                pipeline.set(cacheKey, serializedValue, ttl);
            }

            await pipeline.exec();
            logger.debug(`Bulk cache set: ${keyValuePairs.length} items`);
            return true;
        } catch (error) {
            logger.error('Cache mSet error:', error);
            return false;
        }
    }

    async mGet(keys) {
        try {
            const cacheKeys = keys.map(key => this.getKey(key));
            const values = await redisClient.mget(...cacheKeys);

            const result = {};
            keys.forEach((key, index) => {
                try {
                    result[key] = values[index] ? JSON.parse(values[index]) : null;
                } catch (parseError) {
                    result[key] = null;
                }
            });

            return result;
        } catch (error) {
            logger.error('Cache mGet error:', error);
            return {};
        }
    }

    // Cache invalidation patterns
    async invalidateUserRelatedCache(userId) {
        await Promise.all([
            this.invalidateUser(userId),
            this.clearPattern(`notifications:${userId}*`),
            this.clearPattern(`registrations:user:${userId}*`),
            this.clearPattern(`certificates:user:${userId}*`)
        ]);
    }

    async invalidateEventRelatedCache(eventId) {
        await Promise.all([
            this.invalidateEvent(eventId),
            this.clearPattern(`registrations:event:${eventId}*`),
            this.clearPattern(`certificates:event:${eventId}*`),
            this.clearPattern(`stats:event:${eventId}*`),
            this.clearPattern('events:*') // Clear all event lists
        ]);
    }

    // Memory optimization
    async optimizeMemory() {
        try {
            // Get memory info
            const beforeStats = await this.getStats();

            // Remove expired keys
            const expiredKeys = await redisClient.keys(`${this.keyPrefix}*`);
            let removedCount = 0;

            for (const key of expiredKeys) {
                const ttl = await redisClient.ttl(key);
                if (ttl === -1) { // Keys without expiration
                    const age = await this.getKeyAge(key);
                    if (age > 24 * 60 * 60) { // Older than 24 hours
                        await redisClient.del(key);
                        removedCount++;
                    }
                }
            }

            const afterStats = await this.getStats();

            logger.info(`Cache optimization completed: ${removedCount} keys removed`);
            return {
                keysRemoved: removedCount,
                memoryBefore: beforeStats.memory.used,
                memoryAfter: afterStats.memory.used
            };
        } catch (error) {
            logger.error('Cache optimization error:', error);
            return { keysRemoved: 0 };
        }
    }

    async getKeyAge(key) {
        try {
            // This is a simplified approach - in production you might store creation timestamps
            return 0;
        } catch (error) {
            return 0;
        }
    }
}

module.exports = new CacheService();