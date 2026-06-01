const pool = require('../../lib/db');
const logger = require('../../lib/logger');

const initCartModule = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cart_items (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER DEFAULT 1,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Cart Table initialized');
    } catch (err) {
        logger.error('Error initializing cart module', err);
        throw err;
    }
};

module.exports = initCartModule;
