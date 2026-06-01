const pool = require('../../lib/db');
const logger = require('../../lib/logger');

const initAnalyticsModule = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS analytics_events (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(50),
                payload JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Analytics Table initialized');
    } catch (err) {
        logger.error('Error initializing analytics module', err);
        throw err;
    }
};

module.exports = initAnalyticsModule;
