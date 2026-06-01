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
const auditRoutes = require('./modules/audit/routes');
const initAuditModule = require('./modules/audit/init');
const setupAuditEvents = require('./modules/audit/events');

const analyticsRoutes = require('./modules/analytics/routes');
const initAnalyticsModule = require('./modules/analytics/init');
const setupAnalyticsEvents = require('./modules/analytics/events');

const reportingRoutes = require('./modules/reporting/routes');
const fileRoutes = require('./modules/file/routes');

const PORT = process.env.PORT || 3005;

const startServer = async () => {
    try {
        // 1. Connect to Infrastructure
        await redisClient.connect();
        await connectRabbitMQ();

        // 2. Initialize Modules
        await initAuditModule();
        await initAnalyticsModule();

        // 3. Setup Events
        await setupAuditEvents();
        await setupAnalyticsEvents();

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
                service: 'platform-insights-service',
                modules: ['audit', 'analytics', 'reporting', 'file']
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
        app.use('/api/audit', auditRoutes);
        app.use('/api/analytics', analyticsRoutes);
        app.use('/api/reports', reportingRoutes);
        app.use('/api/files', fileRoutes);

        // Start Server
        app.listen(PORT, () => {
            logger.info(`Platform-Insights Service running on port ${PORT}`);
        });

    } catch (err) {
        logger.error('Failed to start Platform-Insights Service', err);
        process.exit(1);
    }
};

startServer();
