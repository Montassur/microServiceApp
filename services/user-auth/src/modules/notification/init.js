const pool = require('../../lib/db');
const logger = require('../../lib/logger');

const initNotificationModule = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Notification Table initialized');
    } catch (err) {
        logger.error('Error initializing notification module', err);
        throw err;
    }
};

module.exports = initNotificationModule;
