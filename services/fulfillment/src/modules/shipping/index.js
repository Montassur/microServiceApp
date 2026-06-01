const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');
const amqp = require('amqplib');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3010;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'shipping-service' },
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
        await channel.assertQueue('SHIPMENT_CREATED');

        logger.info('Connected to RabbitMQ - Listening for Payment events...');

        channel.consume('PAYMENT_COMPLETED', async (data) => {
            if (data) {
                const payment = JSON.parse(data.content.toString());
                if (payment.status === 'COMPLETED') {
                    await createShipment(payment);
                }
                channel.ack(data);
            }
        });
    } catch (err) {
        logger.error('Failed to connect to RabbitMQ', err);
        setTimeout(connectRabbitMQ, 5000);
    }
};

const createShipment = async (payment) => {
    try {
        logger.info(`Creating shipment for Order #${payment.orderId}`);

        // Mock Carrier Logic
        const trackingNumber = `TRK-${Math.floor(Math.random() * 1000000000)}`;
        const carrier = 'FedEx'; // Mock provider

        const result = await pool.query(
            'INSERT INTO shipments (order_id, carrier, tracking_number, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [payment.orderId, carrier, trackingNumber, 'PRE_TRANSIT']
        );

        const shipment = result.rows[0];

        // Publish Shipment Created Event
        if (channel) {
            channel.sendToQueue(
                'SHIPMENT_CREATED',
                Buffer.from(JSON.stringify({
                    shipmentId: shipment.id,
                    orderId: shipment.order_id,
                    trackingNumber: shipment.tracking_number,
                    carrier: shipment.carrier,
                    status: shipment.status
                }))
            );
            logger.info(`Shipment created: ${trackingNumber}`);
        }
    } catch (err) {
        logger.error('Error creating shipment', err);
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
    res.status(200).json({ status: 'UP', service: 'shipping-service' });
});

// Shipping Routes
app.get('/api/shipping/:orderId', async (req, res) => {
    const { orderId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM shipments WHERE order_id = $1', [orderId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Error fetching shipment', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Initialization
const start = async () => {
    try {
        await connectRabbitMQ();

        await pool.query(`
            CREATE TABLE IF NOT EXISTS shipments (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                carrier VARCHAR(100),
                tracking_number VARCHAR(100),
                status VARCHAR(50) DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Database initialized');

        app.listen(PORT, () => {
            logger.info(`Shipping Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
