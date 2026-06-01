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
const { connectRabbitMQ } = require('./lib/rabbitmq');
const { register } = require('./lib/metrics');
const metricsMiddleware = require('./middleware/metrics');

// Modules
const shippingRoutes = require('./modules/shipping/routes');
const initShippingModule = require('./modules/shipping/init');
const setupShippingEvents = require('./modules/shipping/events');

const couponRoutes = require('./modules/coupon/routes');
const initCouponModule = require('./modules/coupon/init');

const PORT = process.env.PORT || 3003;

const startServer = async () => {
    try {
        // 1. Connect to Infrastructure
        await redisClient.connect();
        await connectRabbitMQ();

        // 2. Initialize Modules
        await initShippingModule();
        await initCouponModule();

        // 3. Setup Event Listeners
        await setupShippingEvents();

        // 4. Setup Express App
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
                service: 'fulfillment-service',
                modules: ['shipping', 'coupon']
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
        app.use('/api/shipping', shippingRoutes);
        app.use('/api/coupons', couponRoutes);

        // Start Server
        app.listen(PORT, () => {
            logger.info(`Fulfillment Service running on port ${PORT}`);
        });

    } catch (err) {
        logger.error('Failed to start Fulfillment Service', err);
        process.exit(1);
    }
};

startServer();
