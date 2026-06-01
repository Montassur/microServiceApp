const { httpRequestDuration, httpRequestTotal } = require('../lib/metrics');

const metricsMiddleware = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const route = req.route ? req.route.path : req.path;

        httpRequestDuration.observe(
            {
                method: req.method,
                route: route,
                status_code: res.statusCode
            },
            duration / 1000
        );

        httpRequestTotal.inc({
            method: req.method,
            route: route,
            status_code: res.statusCode
        });
    });

    next();
};

module.exports = metricsMiddleware;
