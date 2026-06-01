const redis = require('redis');
const logger = require('./logger');

let redisClient = null;

/**
 * Connect to Redis with RediSearch module
 */
const connectRedisSearch = async () => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

        redisClient = redis.createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger.error('Redis: Max retries reached');
                        return new Error('Max retries reached');
                    }
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        redisClient.on('error', (err) => {
            logger.error('Redis Client Error', { error: err.message });
        });

        redisClient.on('connect', () => {
            logger.info('Redis client connecting...');
        });

        redisClient.on('ready', () => {
            logger.info('Redis client ready');
        });

        await redisClient.connect();
        logger.info('Connected to RediSearch successfully');

        return redisClient;
    } catch (err) {
        logger.error('Failed to connect to RediSearch', { error: err.message, stack: err.stack });
        throw err;
    }
};

/**
 * Get the RediSearch client instance
 */
const getRedisSearchClient = () => {
    if (!redisClient) {
        throw new Error('RediSearch client not initialized. Call connectRedisSearch() first.');
    }
    return redisClient;
};

/**
 * Close the RediSearch connection
 */
const closeRedisSearch = async () => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger.info('RediSearch connection closed');
    }
};

module.exports = {
    connectRedisSearch,
    getRedisSearchClient,
    closeRedisSearch,
};
