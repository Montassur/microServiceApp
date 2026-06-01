const pool = require('../../lib/db');
const logger = require('../../lib/logger');

const initShippingModule = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS shipments (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                address TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'PENDING',
                tracking_number VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Shipping Table initialized');
    } catch (err) {
        logger.error('Error initializing shipping module', err);
        throw err;
    }
};

module.exports = initShippingModule;
