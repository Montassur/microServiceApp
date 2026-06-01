const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');
const amqp = require('amqplib');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3016;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq';

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'audit-service' },
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

// Application Setup
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'audit-service' });
});

// Audit API (Direct logging)
app.post('/api/audit', async (req, res) => {
    const { eventType, entityId, userId, details, severity } = req.body;

    try {
        await pool.query(
            `INSERT INTO audit_logs (event_type, entity_id, user_id, details, severity, created_at) 
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [eventType, entityId, userId, JSON.stringify(details), severity || 'INFO']
        );
        res.status(201).json({ message: 'Audit log recorded' });
    } catch (err) {
        logger.error('Error creating audit log', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/audit', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching audit logs', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// RabbitMQ Consumer (System Wide Audit)
const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        const exchange = 'ecommerce_events';

        await channel.assertExchange(exchange, 'topic', { durable: true });

        // Bind to all relevant topics
        const q = await channel.assertQueue('audit_queue', { exclusive: false });
        // Corrected bind pattern: '#' matches ALL routing keys
        channel.bindQueue(q.queue, exchange, '#');

        logger.info('Audit Service waiting for events...');

        channel.consume(q.queue, async (msg) => {
            if (msg.content) {
                const routingKey = msg.fields.routingKey;
                const content = JSON.parse(msg.content.toString());

                logger.info(`Auditing event: ${routingKey}`);

                try {
                    await pool.query(
                        `INSERT INTO audit_logs (event_type, entity_id, details, severity, created_at) 
                         VALUES ($1, $2, $3, $4, NOW())`,
                        [
                            routingKey,
                            content.id || content.orderId || content.productId || 'UNKNOWN',
                            JSON.stringify(content),
                            'INFO'
                        ]
                    );
                } catch (dbErr) {
                    logger.error('Failed to persist audit log to DB', dbErr);
                }

                channel.ack(msg);
            }
        });

    } catch (error) {
        logger.error('RabbitMQ connection error:', error);
        // Retry logic could go here
        setTimeout(connectRabbitMQ, 5000);
    }
};


// Initialization
const start = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(100) NOT NULL,
                entity_id VARCHAR(100),
                user_id INTEGER,
                details JSONB,
                severity VARCHAR(20) DEFAULT 'INFO',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Database initialized');

        // Start Server
        app.listen(PORT, () => {
            logger.info(`Audit Service running on port ${PORT}`);
        });

        // Start Consumer
        connectRabbitMQ();

    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
