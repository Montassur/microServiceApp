const pool = require('../../lib/db');
const logger = require('../../lib/logger');

const initCouponModule = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                discount_percent DECIMAL(5, 2) NOT NULL,
                expiry_date TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Coupon Table initialized');
    } catch (err) {
        logger.error('Error initializing coupon module', err);
        throw err;
    }
};

module.exports = initCouponModule;
