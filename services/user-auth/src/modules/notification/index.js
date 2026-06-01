const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const amqp = require('amqplib');
const nodemailer = require('nodemailer');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3003;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'notification-service' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

// Email Transporter (Mock or SMTP)
// For dev, we'll just log or use Ethereal if needed. 
// Here we mock the sending process.
const sendEmail = async (to, subject, text) => {
    logger.info(`[MOCK EMAIL] To: ${to}, Subject: ${subject}, Body: ${text}`);
    // In production: await transporter.sendMail({...})
    return true;
};

// RabbitMQ Consumer Setup
const connectRabbitMQ = async () => {
    try {
        const amqpServer = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
        const connection = await amqp.connect(amqpServer);
        const channel = await connection.createChannel();
        await channel.assertQueue('ORDER_CREATED');

        logger.info('Connected to RabbitMQ - Waiting for messages...');

        channel.consume('ORDER_CREATED', async (data) => {
            if (data) {
                const orderData = JSON.parse(data.content.toString());
                logger.info(`Received ORDER_CREATED event for Order #${orderData.orderId}`);

                // Process Notification
                await sendEmail(
                    `user${orderData.userId}@example.com`,
                    `Order Confirmation #${orderData.orderId}`,
                    `Thank you for your order! Total: $${orderData.amount}`
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
    res.status(200).json({ status: 'UP', service: 'notification-service' });
});

// API to send manual notification (e.g. for testing)
app.post('/api/notifications/email', async (req, res) => {
    const { to, subject, body } = req.body;
    await sendEmail(to, subject, body);
    res.json({ message: 'Email sent (mock)' });
});

// Initialization
const start = async () => {
    try {
        await connectRabbitMQ();

        app.listen(PORT, () => {
            logger.info(`Notification Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
