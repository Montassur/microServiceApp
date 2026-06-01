const { v4: uuidv4 } = require('uuid');

/**
 * Request ID Middleware
 * Generates a unique ID for each request to track it across logs
 */
const requestId = (req, res, next) => {
    // Check if request ID already exists in header (from load balancer/proxy)
    req.id = req.get('X-Request-ID') || uuidv4();

    // Add request ID to response headers for client tracking
    res.setHeader('X-Request-ID', req.id);

    next();
};

module.exports = requestId;
