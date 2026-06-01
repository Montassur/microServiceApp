const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');
const { createClient } = require('redis');
const amqp = require('amqplib');

// Configuration
require('dotenv').config();
const { register } = require('./lib/metrics');
const metricsMiddleware = require('./middleware/metrics');
const PORT = process.env.PORT || 3009;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'inventory-service' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

// Database Setup
const pool = new Pool({
    host: process.env.DB_HOST || 'database',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'auraweb_db',
    user: process.env.DB_USER || 'auraweb_user',
    password: process.env.DB_PASSWORD,
});

// Redis Setup (for locking if needed, though PG handles transactions well)
const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'redis'}:6379`
});
redisClient.on('error', (err) => logger.error('Redis Client Error', err));

// RabbitMQ Setup
let channel;
const connectRabbitMQ = async () => {
    try {
        const amqpServer = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
        const connection = await amqp.connect(amqpServer);
        channel = await connection.createChannel();
        await channel.assertQueue('ORDER_CREATED');
        await channel.assertQueue('STOCK_LOW');

        logger.info('Connected to RabbitMQ - Listening for Order events...');

        // Listen for Order Creation to Reserve Stock
        channel.consume('ORDER_CREATED', async (data) => {
            if (data) {
                const order = JSON.parse(data.content.toString());
                await reserveStock(order);
                channel.ack(data);
            }
        });
    } catch (err) {
        logger.error('Failed to connect to RabbitMQ', err);
        setTimeout(connectRabbitMQ, 5000);
    }
};

const reserveStock = async (order) => {
    logger.info(`Reserving stock for Order #${order.orderId}`);
    // Ideally this should use a transaction
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Logic: Iterate through order items and update inventory
        // Simplified Logic: Just logging for demo, assuming 'products' in order object
        if (order.products && Array.isArray(order.products)) {
            for (const item of order.products) {
                // Check and Update
                const res = await client.query(
                    'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2 RETURNING quantity',
                    [item.quantity || 1, item.productId]
                );

                if (res.rows.length > 0 && res.rows[0].quantity < 10) {
                    // Publish Low Stock Alert
                    if (channel) {
                        channel.sendToQueue('STOCK_LOW', Buffer.from(JSON.stringify({
                            productId: item.productId,
                            quantity: res.rows[0].quantity,
                            timestamp: new Date()
                        })));
                        logger.warn(`Low stock alert for Product ${item.productId}`);
                    }
                }
            }
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Error reserving stock', err);
        // Could publish ORDER_FAILED event here if stock reservation fails
    } finally {
        client.release();
    }
};

// Application Setup
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
app.use(metricsMiddleware);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'inventory-service' });
});

// Prometheus Metrics
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

// GET /api/inventory (List all - Simplified)
app.get('/api/inventory', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inventory LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching inventory list', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/inventory/:productId
app.get('/api/inventory/:productId', async (req, res) => {
    const { productId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM inventory WHERE product_id = $1', [productId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found in inventory' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Error fetching inventory', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/inventory/update', async (req, res) => {
    const { productId, quantity } = req.body;
    try {
        // Upsert
        const result = await pool.query(
            `INSERT INTO inventory (product_id, quantity, updated_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (product_id) 
             DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW() 
             RETURNING *`,
            [productId, quantity]
        );
        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Error updating inventory', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Initialization
const start = async () => {
    try {
        await redisClient.connect();
        await connectRabbitMQ();

        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                id SERIAL PRIMARY KEY,
                product_id INTEGER UNIQUE NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                warehouse_location VARCHAR(100),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Database initialized');

        app.listen(PORT, () => {
            logger.info(`Inventory Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
