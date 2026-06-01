const { createClient } = require('redis');
const logger = require('./logger');

const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'redis'}:6379`
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Connected to Redis'));

module.exports = redisClient;
