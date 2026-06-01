const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');
const amqp = require('amqplib');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3004;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'payment-service' },
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
        await channel.assertQueue('PAYMENT_COMPLETED');
        logger.info('Connected to RabbitMQ');
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
    res.status(200).json({ status: 'UP', service: 'payment-service' });
});

// Payment Routes
app.post('/api/payments/process', async (req, res) => {
    const { orderId, amount, currency, paymentMethodId } = req.body;

    // Simulating Stripe Payment
    // const paymentIntent = await stripe.paymentIntents.create({...});

    // MOCK Payment Success
    const success = true;
    const transactionId = `txn_${Date.now()}`;

    if (success) {
        try {
            // Save Transaction
            const result = await pool.query(
                'INSERT INTO payments (order_id, amount, status, transaction_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
                [orderId, amount, 'COMPLETED', transactionId]
            );

            const payment = result.rows[0];

            // Publish Event
            if (channel) {
                channel.sendToQueue(
                    'PAYMENT_COMPLETED',
                    Buffer.from(JSON.stringify({
                        paymentId: payment.id,
                        orderId: orderId,
                        amount: amount,
                        status: 'COMPLETED'
                    }))
                );
                logger.info(`Event published: PAYMENT_COMPLETED for Order #${orderId}`);
            }

            return res.status(200).json({ success: true, payment });
        } catch (err) {
            logger.error('Error processing payment', err);
            return res.status(500).json({ error: 'Payment failed' });
        }
    } else {
        return res.status(400).json({ error: 'Payment declined' });
    }
});

app.get('/api/payments/order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching payments', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Initialization
const start = async () => {
    try {
        await connectRabbitMQ();

        // Create Payments Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                status VARCHAR(50) NOT NULL,
                transaction_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Database initialized');

        app.listen(PORT, () => {
            logger.info(`Payment Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
