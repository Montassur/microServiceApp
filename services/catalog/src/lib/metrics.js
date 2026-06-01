const client = require('prom-client');

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({
    register,
    prefix: 'nodejs_'
});

// ==========================================
// Custom Application Metrics
// ==========================================

// HTTP Request Duration Histogram
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register]
});

// HTTP Request Counter
const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

// Active Connections Gauge
const activeConnections = new client.Gauge({
    name: 'http_active_connections',
    help: 'Number of active HTTP connections',
    registers: [register]
});

// Database Query Duration
const dbQueryDuration = new client.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register]
});

// Redis Operation Duration
const redisOperationDuration = new client.Histogram({
    name: 'redis_operation_duration_seconds',
    help: 'Duration of Redis operations in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
    registers: [register]
});

// RabbitMQ Message Counter
const rabbitmqMessagesTotal = new client.Counter({
    name: 'rabbitmq_messages_total',
    help: 'Total number of RabbitMQ messages',
    labelNames: ['queue', 'action'], // action: published, consumed
    registers: [register]
});

// Error Counter
const errorTotal = new client.Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'severity'],
    registers: [register]
});

// Business Metrics (customize per service)
const businessMetrics = {
    // Example: Track specific business events
    eventCounter: new client.Counter({
        name: 'business_events_total',
        help: 'Total number of business events',
        labelNames: ['event_type'],
        registers: [register]
    })
};

module.exports = {
    register,
    httpRequestDuration,
    httpRequestTotal,
    activeConnections,
    dbQueryDuration,
    redisOperationDuration,
    rabbitmqMessagesTotal,
    errorTotal,
    businessMetrics
};
