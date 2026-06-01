const pool = require('../../lib/db');
const logger = require('../../lib/logger');

const initRecommendationModule = async () => {
    try {
        // Just mock table for storing pre-calculated weights if needed
        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_recommendations (
                id SERIAL PRIMARY KEY,
                product_id INTEGER,
                related_product_id INTEGER,
                score DECIMAL(3, 2)
            );
        `);
        logger.info('Recommendation Table initialized');
    } catch (err) {
        logger.error('Error initializing recommendation module', err);
        throw err;
    }
};

module.exports = initRecommendationModule;
