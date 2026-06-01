const pool = require('../../lib/db');
const logger = require('../../lib/logger');

const initWishlistModule = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wishlists (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, product_id)
            );
        `);
        logger.info('Wishlist Table initialized');
    } catch (err) {
        logger.error('Error initializing wishlist module', err);
        throw err;
    }
};

module.exports = initWishlistModule;
