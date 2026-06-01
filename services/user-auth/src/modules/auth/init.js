const pool = require('../../lib/db');
const logger = require('../../lib/logger');

const initAuthModule = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('User Table initialized');
    } catch (err) {
        logger.error('Error initializing auth module', err);
        throw err;
    }
};

module.exports = initAuthModule;
