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
const { register } = require('./lib/metrics');
const metricsMiddleware = require('./middleware/metrics');

// Modules
const cartRoutes = require('./modules/cart/routes');
const initCartModule = require('./modules/cart/init');

const wishlistRoutes = require('./modules/wishlist/routes');
const initWishlistModule = require('./modules/wishlist/init');

const PORT = process.env.PORT || 3004;

const startServer = async () => {
    try {
        // 1. Connect to Infrastructure
        await redisClient.connect();

        // 2. Initialize Modules
        await initCartModule();
        await initWishlistModule();

        // 3. Setup Express App
        const app = express();

        // Middleware
        app.use(helmet());
        app.use(cors());
        app.use(express.json());
        app.use(morgan('combined'));
        app.use(metricsMiddleware);

        // Health Check
        app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'UP',
                service: 'shopping-service',
                modules: ['cart', 'wishlist']
            });
        });

        // Prometheus Metrics
        app.get('/metrics', async (req, res) => {
            try {
                res.set('Content-Type', register.contentType);
                res.end(await register.metrics());
            } catch (err) {
                res.status(500).end(err);
            }
        });

        // Mount Routes
        app.use('/api/cart', cartRoutes);
        app.use('/api/wishlist', wishlistRoutes);

        // Start Server
        app.listen(PORT, () => {
            logger.info(`Shopping Service running on port ${PORT}`);
        });

    } catch (err) {
        logger.error('Failed to start Shopping Service', err);
        process.exit(1);
    }
};

startServer();
