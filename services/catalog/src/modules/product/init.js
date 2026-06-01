const pool = require('../../lib/db');
const logger = require('../../lib/logger');

const initProductModule = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                category VARCHAR(100),
                stock INTEGER DEFAULT 0,
                image_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Product Table initialized');
    } catch (err) {
        logger.error('Error initializing product module', err);
        throw err;
    }
};

module.exports = initProductModule;
