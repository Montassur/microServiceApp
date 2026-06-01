const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');
const amqp = require('amqplib');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3008;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'recommendation-service' },
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

// RabbitMQ Setup (For learning from orders)
const connectRabbitMQ = async () => {
    try {
        const amqpServer = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
        const connection = await amqp.connect(amqpServer);
        const channel = await connection.createChannel();
        await channel.assertQueue('ORDER_CREATED');

        logger.info('Connected to RabbitMQ - Listening for Order events to update recommendations...');

        channel.consume('ORDER_CREATED', async (data) => {
            if (data) {
                // Mock Learning Process: In a real app, this would update a model or similarity matrix
                const order = JSON.parse(data.content.toString());
                logger.info(`Updating recommendation model based on Order #${order.orderId}`);
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
    res.status(200).json({ status: 'UP', service: 'recommendation-service' });
});

// Recommendations API
app.get('/api/recommendations', async (req, res) => {
    const { userId, type } = req.query; // type: 'trending', 'personal', 'bestseller'

    try {
        let query = 'SELECT * FROM products ORDER BY RANDOM() LIMIT 5';

        if (type === 'trending') {
            // Mock trending logic
            query = 'SELECT * FROM products ORDER BY created_at DESC LIMIT 5';
        }

        const result = await pool.query(query);
        res.json({
            type: type || 'random',
            recommendations: result.rows
        });
    } catch (err) {
        logger.error('Error fetching recommendations', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create Recommendations Table (Mock storage for pre-calculated recs)
const start = async () => {
    try {
        await connectRabbitMQ();

        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_recommendations (
                id SERIAL PRIMARY KEY,
                product_id INTEGER,
                related_product_id INTEGER,
                score DECIMAL(3, 2)
            );
        `);
        logger.info('Database initialized');

        app.listen(PORT, () => {
            logger.info(`Recommendation Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
