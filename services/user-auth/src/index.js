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
const authRoutes = require('./modules/auth/routes');
const initAuthModule = require('./modules/auth/init');

const notificationRoutes = require('./modules/notification/routes');
const initNotificationModule = require('./modules/notification/init');
const setupNotificationEvents = require('./modules/notification/events');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // 1. Connect to Infrastructure
        await redisClient.connect();
        await connectRabbitMQ();

        // 2. Initialize Modules
        await initAuthModule();
        await initNotificationModule();

        // 3. Setup Events
        await setupNotificationEvents();

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
                service: 'user-communication-service',
                modules: ['auth', 'notification']
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
        app.use('/api/auth', authRoutes);
        app.use('/api/notifications', notificationRoutes);
        app.use('/api/users', require('./modules/users/routes'));
        app.use('/api/users', require('./modules/users/routes'));
        app.use('/api/users', require('./modules/users/routes'));
        app.use('/api/users', require('./modules/users/routes'));

        // Start Server
        app.listen(PORT, () => {
            logger.info(`User-Communication Service running on port ${PORT}`);
        });

    } catch (err) {
        logger.error('Failed to start User-Communication Service', err);
        process.exit(1);
    }
};

startServer();
