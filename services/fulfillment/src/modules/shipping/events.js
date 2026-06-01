const pool = require('../../lib/db');
const logger = require('../../lib/logger');
const { getChannel } = require('../../lib/rabbitmq');

const createShipment = async (orderId) => {
    try {
        // Mock Address fetch or assume available. Using placeholder.
        const mockAddress = "123 Main St, Springfield";
        const userId = 1; // Placeholder, would need to fetch Order details first

        const result = await pool.query(
            'INSERT INTO shipments (order_id, user_id, address, status, tracking_number, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
            [orderId, userId, mockAddress, 'PREPARING', `TRK-${Date.now()}`]
        );
        logger.info(`Created Shipment #${result.rows[0].id} for Order #${orderId}`);

        const channel = getChannel();
        if (channel) {
            channel.sendToQueue('SHIPMENT_CREATED', Buffer.from(JSON.stringify(result.rows[0])));
        }

    } catch (err) {
        logger.error(`Error creating shipment for Order #${orderId}`, err);
    }
};

const setupShippingEvents = async () => {
    const channel = getChannel();
    if (!channel) return;

    logger.info('Setting up Shipping Event Listeners...');

    channel.consume('ORDER_PAID', async (data) => {
        if (data) {
            try {
                const { orderId } = JSON.parse(data.content.toString());
                await createShipment(orderId);
                channel.ack(data);
            } catch (err) {
                logger.error('Error processing ORDER_PAID', err);
                channel.nack(data);
            }
        }
    });
};

module.exports = setupShippingEvents;
