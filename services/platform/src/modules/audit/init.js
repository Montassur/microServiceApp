const pool = require('../../lib/db');
const logger = require('../../lib/logger');

const initAuditModule = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                service VARCHAR(50),
                event VARCHAR(100),
                details TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Audit Table initialized');
    } catch (err) {
        logger.error('Error initializing audit module', err);
        throw err;
    }
};

module.exports = initAuditModule;
