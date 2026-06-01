const pool = require('../../lib/db');
const logger = require('../../lib/logger');
const { getChannel } = require('../../lib/rabbitmq');

const createNotification = async (userId, message) => {
    try {
        await pool.query(
            'INSERT INTO notifications (user_id, message, created_at) VALUES ($1, $2, NOW())',
            [userId, message]
        );
        logger.info(`Notification created for User #${userId}: ${message}`);
        // Here you would also trigger Email/SMS via Nodemailer/Twilio
    } catch (err) {
        logger.error('Error creating notification', err);
    }
};

const setupNotificationEvents = async () => {
    const channel = getChannel();
    if (!channel) return;

    logger.info('Setting up Notification Event Listeners...');

    channel.consume('ORDER_PAID', async (data) => {
        if (data) {
            try {
                const { orderId } = JSON.parse(data.content.toString());
                // In a real app, we'd look up the User ID from the Order ID (or have it in the event)
                // Assuming event has userId for simplicity or we skip lookup code for brevity
                logger.info(`Processing ORDER_PAID for notification: Order #${orderId}`);
                // await createNotification(userId, `Your order #${orderId} was paid successfully!`);
                channel.ack(data);
            } catch (err) {
                channel.nack(data);
            }
        }
    });
};

module.exports = setupNotificationEvents;
