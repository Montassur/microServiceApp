const { getRedisSearchClient } = require('../../lib/redisearch');
const logger = require('../../lib/logger');

const INDEX_NAME = 'products';

/**
 * Initialize RediSearch index for products
 */
const initSearchModule = async () => {
    try {
        const client = getRedisSearchClient();

        // Check if index exists
        try {
            await client.ft.info(INDEX_NAME);
            logger.info(`RediSearch index "${INDEX_NAME}" already exists`);
        } catch (err) {
            // Index doesn't exist, create it
            logger.info(`Creating RediSearch index "${INDEX_NAME}"...`);

            await client.ft.create(INDEX_NAME, {
                '$.name': {
                    type: 'TEXT',
                    AS: 'name',
                    SORTABLE: true
                },
                '$.description': {
                    type: 'TEXT',
                    AS: 'description'
                },
                '$.category': {
                    type: 'TAG',
                    AS: 'category'
                },
                '$.price': {
                    type: 'NUMERIC',
                    AS: 'price',
                    SORTABLE: true
                },
                '$.brand': {
                    type: 'TAG',
                    AS: 'brand'
                },
                '$.inStock': {
                    type: 'TAG',
                    AS: 'inStock'
                },
                '$.stock': {
                    type: 'NUMERIC',
                    AS: 'stock'
                }
            }, {
                ON: 'JSON',
                PREFIX: 'product:'
            });

            logger.info(`RediSearch index "${INDEX_NAME}" created successfully`);
        }
    } catch (err) {
        logger.error('Error initializing search module', { error: err.message, stack: err.stack });
        throw err;
    }
};

module.exports = initSearchModule;
