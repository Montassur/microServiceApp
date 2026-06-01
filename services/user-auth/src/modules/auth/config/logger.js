const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
        let msg = `${timestamp} [${level}]`;

        if (requestId) {
            msg += ` [${requestId}]`;
        }

        msg += `: ${message}`;

        // Add metadata if present
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        if (metaStr) {
            msg += ` ${metaStr}`;
        }

        return msg;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: logFormat,
    defaultMeta: {
        service: 'auraweb-backend',
        environment: process.env.NODE_ENV
    },
    transports: []
});

// Add transports based on environment
if (process.env.NODE_ENV === 'production') {
    // Production: JSON logs to files with rotation
    logger.add(new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5
    }));

    logger.add(new winston.transports.File({
        filename: path.join('logs', 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 10
    }));

    // Also log to console in production for container logs
    logger.add(new winston.transports.Console({
        format: logFormat
    }));
} else {
    // Development: Colorized console output
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// Create a stream object for Morgan
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

// Helper methods for structured logging
logger.logRequest = (req, message, meta = {}) => {
    logger.info(message, {
        requestId: req.id,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        ...meta
    });
};

logger.logError = (req, error, meta = {}) => {
    logger.error(error.message, {
        requestId: req.id,
        method: req.method,
        url: req.url,
        ip: req.ip,
        stack: error.stack,
        ...meta
    });
};

logger.logAuth = (req, action, userId, meta = {}) => {
    logger.info(`Auth: ${action}`, {
        requestId: req.id,
        userId,
        ip: req.ip,
        ...meta
    });
};

logger.logDatabase = (query, duration, meta = {}) => {
    logger.debug('Database query', {
        query: query.substring(0, 100), // Truncate long queries
        duration: `${duration}ms`,
        ...meta
    });
};

module.exports = logger;
