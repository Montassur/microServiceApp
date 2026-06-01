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
const orderRoutes = require('./modules/order/routes');
const initOrderModule = require('./modules/order/init');
const setupOrderEvents = require('./modules/order/events');

const paymentRoutes = require('./modules/payment/routes');
const initPaymentModule = require('./modules/payment/init');

const PORT = process.env.PORT || 3002;

const startServer = async () => {
    try {
        // 1. Connect to Infrastructure
        await redisClient.connect();
        await connectRabbitMQ();

        // 2. Initialize Modules
        await initOrderModule();
        await initPaymentModule();

        // 3. Setup Event Listeners
        await setupOrderEvents();

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
                service: 'order-payment-service',
                modules: ['order', 'payment']
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
        app.use('/api/orders', orderRoutes);
        app.use('/api/payments', paymentRoutes);

        // Start Server
        app.listen(PORT, () => {
            logger.info(`Order-Payment Service running on port ${PORT}`);
        });

    } catch (err) {
        logger.error('Failed to start Order-Payment Service', err);
        process.exit(1);
    }
};

startServer();
