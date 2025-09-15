const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {
    constructor() {
        this.client = null;
        this.publisher = null;
        this.subscriber = null;
    }

    async connect() {
        try {
            const config = {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                retryDelayOnFailover: 100,
                enableReadyCheck: false,
                maxRetriesPerRequest: null,
            };

            this.client = redis.createClient(config);
            this.publisher = redis.createClient(config);
            this.subscriber = redis.createClient(config);

            await Promise.all([
                this.client.connect(),
                this.publisher.connect(),
                this.subscriber.connect()
            ]);

            logger.info('Redis connected successfully');

            // Error handling
            this.client.on('error', (error) => {
                logger.error('Redis client error:', error);
            });

            this.publisher.on('error', (error) => {
                logger.error('Redis publisher error:', error);
            });

            this.subscriber.on('error', (error) => {
                logger.error('Redis subscriber error:', error);
            });

            return this.client;
        } catch (error) {
            logger.error('Redis connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await Promise.all([
                this.client?.quit(),
                this.publisher?.quit(),
                this.subscriber?.quit()
            ]);
            logger.info('Redis connections closed');
        } catch (error) {
            logger.error('Error closing Redis connections:', error);
        }
    }

    getClient() {
        return this.client;
    }

    getPublisher() {
        return this.publisher;
    }

    getSubscriber() {
        return this.subscriber;
    }

    async set(key, value, expireInSeconds = 3600) {
        try {
            const serializedValue = JSON.stringify(value);
            if (expireInSeconds) {
                await this.client.setEx(key, expireInSeconds, serializedValue);
            } else {
                await this.client.set(key, serializedValue);
            }
            return true;
        } catch (error) {
            logger.error('Redis set error:', error);
            return false;
        }
    }

    async get(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Redis get error:', error);
            return null;
        }
    }

    async del(key) {
        try {
            return await this.client.del(key);
        } catch (error) {
            logger.error('Redis delete error:', error);
            return 0;
        }
    }

    async exists(key) {
        try {
            return await this.client.exists(key);
        } catch (error) {
            logger.error('Redis exists error:', error);
            return false;
        }
    }

    async increment(key, value = 1) {
        try {
            return await this.client.incrBy(key, value);
        } catch (error) {
            logger.error('Redis increment error:', error);
            return null;
        }
    }

    async expire(key, seconds) {
        try {
            return await this.client.expire(key, seconds);
        } catch (error) {
            logger.error('Redis expire error:', error);
            return false;
        }
    }

    async publish(channel, message) {
        try {
            const serializedMessage = JSON.stringify(message);
            return await this.publisher.publish(channel, serializedMessage);
        } catch (error) {
            logger.error('Redis publish error:', error);
            return 0;
        }
    }

    async subscribe(channel, callback) {
        try {
            await this.subscriber.subscribe(channel, (message) => {
                try {
                    const parsedMessage = JSON.parse(message);
                    callback(parsedMessage);
                } catch (error) {
                    logger.error('Redis message parse error:', error);
                    callback(message);
                }
            });
        } catch (error) {
            logger.error('Redis subscribe error:', error);
        }
    }
}

module.exports = new RedisClient();