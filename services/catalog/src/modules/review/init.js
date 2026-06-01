const pool = require('../../lib/db');
const logger = require('../../lib/logger');

const initReviewModule = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Review Table initialized');
    } catch (err) {
        logger.error('Error initializing review module', err);
        throw err;
    }
};

module.exports = initReviewModule;
