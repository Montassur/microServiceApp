const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Config & Libs
dotenv.config();
const logger = require('./lib/logger');
const pool = require('./lib/db');
const redisClient = require('./lib/redis');
const { connectRedisSearch } = require('./lib/redisearch');
const { connectRabbitMQ } = require('./lib/rabbitmq');
const { register } = require('./lib/metrics');
const metricsMiddleware = require('./middleware/metrics');

// Modules
const productRoutes = require('./modules/product/routes');
const initProductModule = require('./modules/product/init');

const reviewRoutes = require('./modules/review/routes');
const initReviewModule = require('./modules/review/init');

const searchRoutes = require('./modules/search/routes');
const initSearchModule = require('./modules/search/init');
const setupSearchEvents = require('./modules/search/events');

const recommendationRoutes = require('./modules/recommendation/routes');
const initRecommendationModule = require('./modules/recommendation/init');

const PORT = process.env.PORT || 3001; // Core Catalog Port

const startServer = async () => {
    try {
        // 1. Connect to Infrastructure
        await redisClient.connect();
        await connectRedisSearch(); // Connect to RediSearch
        await connectRabbitMQ();

        // 2. Initialize Modules
        await initProductModule();
        await initReviewModule();
        await initSearchModule();
        await initRecommendationModule();

        // 3. Setup Event Listeners
        await setupSearchEvents();

        // 4. Setup Express App
        const app = express();

        // Middleware
        app.use(helmet());
        app.use(cors());
        app.use(express.json());
        app.use(morgan('combined'));
        app.use(metricsMiddleware); // Prometheus metrics tracking

        // Health Check
        app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'UP',
                service: 'catalog-service',
                modules: ['product', 'review', 'search', 'recommendation']
            });
        });

        // Prometheus Metrics Endpoint
        app.get('/metrics', async (req, res) => {
            try {
                res.set('Content-Type', register.contentType);
                res.end(await register.metrics());
            } catch (err) {
                res.status(500).end(err);
            }
        });

        // Mount Routes
        app.use('/api/products', productRoutes);
        app.use('/api/reviews', reviewRoutes);
        app.use('/api/search', searchRoutes);
        app.use('/api/recommendations', recommendationRoutes);

        // Start Server
        app.listen(PORT, () => {
            logger.info(`Catalog Service running on port ${PORT}`);
        });

    } catch (err) {
        logger.error('Failed to start Catalog Service', err);
        process.exit(1);
    }
};

startServer();
