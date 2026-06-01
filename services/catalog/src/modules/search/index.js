const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Client } = require('@elastic/elasticsearch');
const amqp = require('amqplib');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3007;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'search-service' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

// Elasticsearch Setup
const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200'
});

const INDEX_NAME = 'products';

// RabbitMQ Setup for Real-time Indexing
const connectRabbitMQ = async () => {
    try {
        const amqpServer = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
        const connection = await amqp.connect(amqpServer);
        const channel = await connection.createChannel();
        await channel.assertQueue('PRODUCT_CREATED');
        await channel.assertQueue('PRODUCT_UPDATED');

        logger.info('Connected to RabbitMQ - Listening for Product events...');

        channel.consume('PRODUCT_CREATED', async (data) => {
            if (data) {
                const product = JSON.parse(data.content.toString());
                await indexProduct(product);
                channel.ack(data);
            }
        });

        // Mock event listeners for now
    } catch (err) {
        logger.error('Failed to connect to RabbitMQ', err);
        setTimeout(connectRabbitMQ, 5000);
    }
};

const indexProduct = async (product) => {
    try {
        await esClient.index({
            index: INDEX_NAME,
            id: product.id,
            document: {
                name: product.name,
                description: product.description,
                category: product.category,
                price: product.price,
                stock: product.stock
            }
        });
        logger.info(`Indexed product: ${product.name}`);
    } catch (err) {
        logger.error('Error indexing product', err);
    }
};

// Application Setup
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'search-service' });
});

// Search API
app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
        const result = await esClient.search({
            index: INDEX_NAME,
            query: {
                multi_match: {
                    query: q,
                    fields: ['name', 'description', 'category'],
                    fuzziness: 'AUTO'
                }
            }
        });

        const hits = result.hits.hits.map(hit => ({
            id: hit._id,
            ...hit._source,
            score: hit._score
        }));

        res.json(hits);
    } catch (err) {
        logger.error('Error searching products', err);
        // Handle index not found error gracefully
        if (err.meta && err.meta.body && err.meta.body.error && err.meta.body.error.type === 'index_not_found_exception') {
            return res.json([]);
        }
        res.status(500).json({ error: 'Search failed' });
    }
});

// Admin Endpoint: Create Index & Bulk Index (Manual Sync)
app.post('/api/search/index/init', async (req, res) => {
    try {
        const exists = await esClient.indices.exists({ index: INDEX_NAME });
        if (!exists) {
            await esClient.indices.create({
                index: INDEX_NAME,
                mappings: {
                    properties: {
                        name: { type: 'text' },
                        description: { type: 'text' },
                        category: { type: 'keyword' },
                        price: { type: 'float' },
                        stock: { type: 'integer' }
                    }
                }
            });
            return res.json({ message: 'Index created' });
        }
        res.json({ message: 'Index already exists' });
    } catch (err) {
        logger.error('Error creating index', err);
        res.status(500).json({ error: 'Failed to create index' });
    }
});

// Initialization
const start = async () => {
    try {
        await connectRabbitMQ();

        // Ensure ES is up
        const info = await esClient.info();
        logger.info(`Connected to Elasticsearch: ${info.version.number}`);

        app.listen(PORT, () => {
            logger.info(`Search Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
