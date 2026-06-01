const { httpRequestDuration, httpRequestTotal, activeConnections } = require('../lib/metrics');

/**
 * Middleware to track HTTP request metrics
 */
const metricsMiddleware = (req, res, next) => {
    // Increment active connections
    activeConnections.inc();
    
    // Start timer
    const start = Date.now();
    
    // Track response
    res.on('finish', () => {
        // Decrement active connections
        activeConnections.dec();
        
        // Calculate duration
        const duration = (Date.now() - start) / 1000;
        
        // Get route pattern (remove IDs for better grouping)
        const route = req.route ? req.route.path : req.path;
        const normalizedRoute = route.replace(/\/\d+/g, '/:id');
        
        // Record metrics
        httpRequestDuration.observe(
            {
                method: req.method,
                route: normalizedRoute,
                status_code: res.statusCode
            },
            duration
        );
        
        httpRequestTotal.inc({
            method: req.method,
            route: normalizedRoute,
            status_code: res.statusCode
        });
    });
    
    next();
};

module.exports = metricsMiddleware;
