const pool = require('../../lib/db');
const logger = require('../../lib/logger');
const { getChannel } = require('../../lib/rabbitmq');

const logAudit = async (service, event, details) => {
    try {
        await pool.query(
            'INSERT INTO audit_logs (service, event, details, created_at) VALUES ($1, $2, $3, NOW())',
            [service, event, JSON.stringify(details)]
        );
    } catch (err) {
        logger.error('Error logging audit', err);
    }
};

const setupAuditEvents = async () => {
    const channel = getChannel();
    if (!channel) return;

    logger.info('Setting up Audit Event Listeners...');

    channel.consume('USER_CREATED', async (data) => {
        if (data) {
            const user = JSON.parse(data.content.toString());
            await logAudit('user-service', 'USER_CREATED', { email: user.email });
            channel.ack(data);
        }
    });

    channel.consume('PRODUCT_CREATED', async (data) => {
        if (data) {
            const product = JSON.parse(data.content.toString());
            await logAudit('catalog-service', 'PRODUCT_CREATED', { name: product.name });
            channel.ack(data);
        }
    });
};

module.exports = setupAuditEvents;
