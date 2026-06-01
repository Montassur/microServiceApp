const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { Sentry } = require('./config/sentry');
const logger = require('./config/logger');
const requestId = require('./middleware/requestId');
const { metricsMiddleware, metricsHandler } = require('./middleware/metrics');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Sentry request handler (must be first)
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Request ID middleware (for tracking)
app.use(requestId);

// Metrics middleware
app.use(metricsMiddleware);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware (using Winston stream)
app.use(morgan('combined', { stream: logger.stream }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// Metrics endpoint for Prometheus
app.get('/metrics', metricsHandler);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
    logger.logRequest(req, 'Route not found', { statusCode: 404 });
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Sentry error handler (must be before other error handlers)
app.use(Sentry.Handlers.errorHandler());

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
