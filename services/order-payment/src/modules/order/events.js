const pool = require('../../lib/db');
const logger = require('../../lib/logger');
const { getChannel } = require('../../lib/rabbitmq');

const updateOrderStatus = async (orderId, status) => {
    try {
        await pool.query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
            [status, orderId]
        );
        logger.info(`Updated Order #${orderId} status to ${status}`);
    } catch (err) {
        logger.error(`Error updating order #${orderId} status`, err);
    }
};

const setupOrderEvents = async () => {
    const channel = getChannel();
    if (!channel) return;

    logger.info('Setting up Order Event Listeners...');

    channel.consume('PAYMENT_PROCESSED', async (data) => {
        if (data) {
            try {
                const { orderId, success } = JSON.parse(data.content.toString());
                await updateOrderStatus(orderId, success ? 'PAID' : 'PAYMENT_FAILED');

                if (success) {
                    channel.sendToQueue('ORDER_PAID', Buffer.from(JSON.stringify({ orderId })));
                }

                channel.ack(data);
            } catch (err) {
                logger.error('Error processing PAYMENT_PROCESSED', err);
                channel.nack(data);
            }
        }
    });

    channel.consume('PAYMENT_FAILED', async (data) => {
        if (data) {
            const { orderId } = JSON.parse(data.content.toString());
            await updateOrderStatus(orderId, 'PAYMENT_FAILED');
            channel.ack(data);
        }
    });
};

module.exports = setupOrderEvents;
