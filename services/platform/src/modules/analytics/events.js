const pool = require('../../lib/db');
const logger = require('../../lib/logger');
const { getChannel } = require('../../lib/rabbitmq');

const trackEvent = async (eventType, payload) => {
    try {
        await pool.query(
            'INSERT INTO analytics_events (event_type, payload, created_at) VALUES ($1, $2, NOW())',
            [eventType, JSON.stringify(payload)]
        );
    } catch (err) {
        logger.error('Error tracking analytics event', err);
    }
};

const setupAnalyticsEvents = async () => {
    const channel = getChannel();
    if (!channel) return;

    logger.info('Setting up Analytics Event Listeners...');

    channel.consume('ORDER_CREATED', async (data) => {
        if (data) {
            const order = JSON.parse(data.content.toString());
            await trackEvent('ORDER_CREATED', { amount: order.totalAmount, userId: order.userId });
            channel.ack(data);
        }
    });
};

module.exports = setupAnalyticsEvents;
