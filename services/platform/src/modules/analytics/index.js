const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');
const amqp = require('amqplib');
const { createClient } = require('redis');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3005;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'analytics-service' },
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

// Redis Setup
const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'redis'}:6379`
});
redisClient.on('error', (err) => logger.error('Redis Client Error', err));

// RabbitMQ Consumer Setup
const connectRabbitMQ = async () => {
    try {
        const amqpServer = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
        const connection = await amqp.connect(amqpServer);
        const channel = await connection.createChannel();

        // Assert Queues
        await channel.assertQueue('ORDER_CREATED');
        await channel.assertQueue('PAYMENT_COMPLETED');

        logger.info('Connected to RabbitMQ - Listening for events...');

        // Consume ORDER_CREATED
        channel.consume('ORDER_CREATED', async (data) => {
            if (data) {
                const orderData = JSON.parse(data.content.toString());
                logger.info(`Processing Analytics for Order #${orderData.orderId}`);

                // Update specific metrics (e.g., global order count)
                await redisClient.incr('metrics:total_orders');
                await redisClient.incrByFloat('metrics:total_revenue', parseFloat(orderData.amount));

                // Log event to DB
                await pool.query(
                    'INSERT INTO analytics_events (event_type, payload, created_at) VALUES ($1, $2, NOW())',
                    ['ORDER_CREATED', JSON.stringify(orderData)]
                );

                channel.ack(data);
            }
        });

        // Consume PAYMENT_COMPLETED
        channel.consume('PAYMENT_COMPLETED', async (data) => {
            if (data) {
                const paymentData = JSON.parse(data.content.toString());
                logger.info(`Processing Analytics for Payment #${paymentData.paymentId}`);

                await redisClient.incr('metrics:successful_payments');

                // Log event to DB
                await pool.query(
                    'INSERT INTO analytics_events (event_type, payload, created_at) VALUES ($1, $2, NOW())',
                    ['PAYMENT_COMPLETED', JSON.stringify(paymentData)]
                );

                channel.ack(data);
            }
        });

    } catch (err) {
        logger.error('Failed to connect to RabbitMQ', err);
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
    res.status(200).json({ status: 'UP', service: 'analytics-service' });
});

// Analytics Dashboard API
app.get('/api/analytics/dashboard', async (req, res) => {
    try {
        const totalOrders = await redisClient.get('metrics:total_orders') || 0;
        const totalRevenue = await redisClient.get('metrics:total_revenue') || 0;
        const successfulPayments = await redisClient.get('metrics:successful_payments') || 0;

        res.json({
            totalOrders: parseInt(totalOrders),
            totalRevenue: parseFloat(totalRevenue),
            successfulPayments: parseInt(successfulPayments),
            timestamp: new Date()
        });
    } catch (err) {
        logger.error('Error fetching dashboard', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/analytics/events', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT 10');
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching events', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Initialization
const start = async () => {
    try {
        await redisClient.connect();
        await connectRabbitMQ();

        // Create Analytics Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS analytics_events (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(100) NOT NULL,
                payload JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Database initialized');

        app.listen(PORT, () => {
            logger.info(`Analytics Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
