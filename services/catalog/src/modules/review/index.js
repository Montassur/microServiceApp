const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3011;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'review-service' },
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
    res.status(200).json({ status: 'UP', service: 'review-service' });
});

// Review Routes
app.get('/api/reviews/product/:productId', async (req, res) => {
    const { productId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC',
            [productId]
        );
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching reviews', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/reviews', async (req, res) => {
    const { productId, userId, rating, comment } = req.body;

    if (!productId || !userId || !rating) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO reviews (product_id, user_id, rating, comment, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [productId, userId, rating, comment]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error('Error creating review', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/reviews/stats/:productId', async (req, res) => {
    const { productId } = req.params;
    try {
        const result = await pool.query(
            'SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews FROM reviews WHERE product_id = $1',
            [productId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Error fetching stats', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Initialization
const start = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Database initialized');

        app.listen(PORT, () => {
            logger.info(`Review Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
