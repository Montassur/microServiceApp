const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const httpRequestErrors = new client.Counter({
    name: 'http_request_errors_total',
    help: 'Total number of HTTP request errors',
    labelNames: ['method', 'route', 'error_type']
});

const activeConnections = new client.Gauge({
    name: 'http_active_connections',
    help: 'Number of active HTTP connections'
});

const databaseQueryDuration = new client.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['query_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const authAttempts = new client.Counter({
    name: 'auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['type', 'status']
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrors);
register.registerMetric(activeConnections);
register.registerMetric(databaseQueryDuration);
register.registerMetric(authAttempts);

/**
 * Metrics Middleware
 * Tracks HTTP request metrics
 */
const metricsMiddleware = (req, res, next) => {
    const start = Date.now();

    // Increment active connections
    activeConnections.inc();

    // Track response
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;

        // Record metrics
        httpRequestDuration.observe(
            { method: req.method, route, status_code: res.statusCode },
            duration
        );

        httpRequestTotal.inc({
            method: req.method,
            route,
            status_code: res.statusCode
        });

        // Track errors (4xx and 5xx)
        if (res.statusCode >= 400) {
            const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
            httpRequestErrors.inc({
                method: req.method,
                route,
                error_type: errorType
            });
        }

        // Decrement active connections
        activeConnections.dec();
    });

    next();
};

/**
 * Metrics endpoint handler
 */
const metricsHandler = async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
};

/**
 * Helper to track database queries
 */
const trackDatabaseQuery = (queryType, duration) => {
    databaseQueryDuration.observe({ query_type: queryType }, duration / 1000);
};

/**
 * Helper to track auth attempts
 */
const trackAuthAttempt = (type, status) => {
    authAttempts.inc({ type, status });
};

module.exports = {
    metricsMiddleware,
    metricsHandler,
    trackDatabaseQuery,
    trackAuthAttempt,
    register
};
