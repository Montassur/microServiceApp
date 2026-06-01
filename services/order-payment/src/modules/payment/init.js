const pool = require('../../lib/db');
const logger = require('../../lib/logger');

const initPaymentModule = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'USD',
                status VARCHAR(50),
                stripe_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Payment Table initialized');
    } catch (err) {
        logger.error('Error initializing payment module', err);
        throw err;
    }
};

module.exports = initPaymentModule;
