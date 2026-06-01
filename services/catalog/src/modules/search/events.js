const { getChannel } = require('../../lib/rabbitmq');
const { getRedisSearchClient } = require('../../lib/redisearch');
const logger = require('../../lib/logger');

/**
 * Setup event handlers for product indexing
 */
const setupSearchEvents = async () => {
    try {
        const channel = getChannel();
        const client = getRedisSearchClient();

        // Ensure queues exist before consuming
        await channel.assertQueue('PRODUCT_CREATED', { durable: true });
        await channel.assertQueue('PRODUCT_UPDATED', { durable: true });
        await channel.assertQueue('PRODUCT_DELETED', { durable: true });

        // Listen for PRODUCT_CREATED events
        await channel.consume('PRODUCT_CREATED', async (msg) => {
            if (msg) {
                try {
                    const product = JSON.parse(msg.content.toString());

                    // Index product in RediSearch
                    await client.json.set(`product:${product.id}`, '$', {
                        name: product.name || '',
                        description: product.description || '',
                        category: product.category || '',
                        price: parseFloat(product.price) || 0,
                        brand: product.brand || '',
                        inStock: product.inStock ? 'true' : 'false',
                        stock: parseInt(product.stock) || 0
                    });

                    logger.info(`Product ${product.id} indexed in RediSearch`);
                    channel.ack(msg);
                } catch (err) {
                    logger.error('Error indexing product', { error: err.message });
                    channel.nack(msg, false, true);
                }
            }
        });

        // Listen for PRODUCT_UPDATED events
        await channel.consume('PRODUCT_UPDATED', async (msg) => {
            if (msg) {
                try {
                    const product = JSON.parse(msg.content.toString());

                    // Update product in RediSearch
                    await client.json.set(`product:${product.id}`, '$', {
                        name: product.name || '',
                        description: product.description || '',
                        category: product.category || '',
                        price: parseFloat(product.price) || 0,
                        brand: product.brand || '',
                        inStock: product.inStock ? 'true' : 'false',
                        stock: parseInt(product.stock) || 0
                    });

                    logger.info(`Product ${product.id} updated in RediSearch`);
                    channel.ack(msg);
                } catch (err) {
                    logger.error('Error updating product', { error: err.message });
                    channel.nack(msg, false, true);
                }
            }
        });

        // Listen for PRODUCT_DELETED events
        await channel.consume('PRODUCT_DELETED', async (msg) => {
            if (msg) {
                try {
                    const { id } = JSON.parse(msg.content.toString());

                    // Delete product from RediSearch
                    await client.del(`product:${id}`);

                    logger.info(`Product ${id} deleted from RediSearch`);
                    channel.ack(msg);
                } catch (err) {
                    logger.error('Error deleting product', { error: err.message });
                    channel.nack(msg, false, true);
                }
            }
        });

        logger.info('Search event handlers setup complete');
    } catch (err) {
        logger.error('Error setting up search events', { error: err.message, stack: err.stack });
        throw err;
    }
};

module.exports = setupSearchEvents;

