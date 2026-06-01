const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');
const amqp = require('amqplib');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3002;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'order-service' },
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

// RabbitMQ Setup
let channel;
const connectRabbitMQ = async () => {
    try {
        const amqpServer = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
        const connection = await amqp.connect(amqpServer);
        channel = await connection.createChannel();
        await channel.assertQueue('ORDER_CREATED');
        logger.info('Connected to RabbitMQ');
    } catch (err) {
        logger.error('Failed to connect to RabbitMQ', err);
        // Retry logic could go here
        setTimeout(connectRabbitMQ, 5000);
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
    res.status(200).json({ status: 'UP', service: 'order-service' });
});

// Routes
// Get orders for a specific user
app.get('/api/orders/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching user orders', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin: Get all orders
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching orders', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/orders', async (req, res) => {
    const { user_id, products, total_amount } = req.body;
    try {
        // 1. Save Order to DB
        const result = await pool.query(
            'INSERT INTO orders (user_id, status, total_amount, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
            [user_id, 'PENDING', total_amount]
        );
        const newOrder = result.rows[0];

        // 2. Insert Order Items (Simplified for demo)
        // In real app, would iterate products and insert into order_items table

        // 3. Publish Event
        if (channel) {
            channel.sendToQueue(
                'ORDER_CREATED',
                Buffer.from(JSON.stringify({
                    orderId: newOrder.id,
                    userId: user_id,
                    products: products,
                    amount: total_amount
                }))
            );
            logger.info(`Event published: ORDER_CREATED for Order ${newOrder.id}`);
        }

        res.status(201).json(newOrder);
    } catch (err) {
        logger.error('Error creating order', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Initialization
const start = async () => {
    try {
        // Connect to RabbitMQ
        await connectRabbitMQ();

        // Create Orders Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'PENDING',
                total_amount DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        // Note: In a real microservice, user_id might refer to a User in the Auth Service.
        // Since databases are shared or separate, we assume logical reference here.

        logger.info('Database initialized');

        app.listen(PORT, () => {
            logger.info(`Order Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
