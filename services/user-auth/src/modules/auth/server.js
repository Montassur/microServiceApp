const express = require('express');
const { validateEnv } = require('./config/validateEnv');
const { initSentry } = require('./config/sentry');
const logger = require('./config/logger');
const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 3000;

// Validate environment variables before starting
validateEnv();

// Initialize Sentry for error tracking
initSentry(app);

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        logger.error('❌ Database connection failed:', { error: err.message });
        process.exit(1);
    }
    logger.info('✅ Database connected successfully');
    logger.info('📅 Database time:', { time: res.rows[0].now });
});

// Start server
const server = app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
});

// Graceful shutdown
const shutdown = (signal) => {
    logger.info(`${signal} signal received: closing HTTP server`);
    server.close(() => {
        logger.info('HTTP server closed');
        pool.end(() => {
            logger.info('Database pool closed');
            process.exit(0);
        });
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise });
});
