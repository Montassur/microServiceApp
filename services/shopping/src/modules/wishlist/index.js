const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3012;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'wishlist-service' },
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
    res.status(200).json({ status: 'UP', service: 'wishlist-service' });
});

// Wishlist Routes
app.get('/api/wishlist/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM wishlists WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching wishlist', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/wishlist', async (req, res) => {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Upsert to avoid duplicates
        const result = await pool.query(
            `INSERT INTO wishlists (user_id, product_id, created_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (user_id, product_id) DO NOTHING 
             RETURNING *`,
            [userId, productId]
        );

        if (result.rows.length === 0) {
            return res.json({ message: 'Item already in wishlist' });
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error('Error adding to wishlist', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/api/wishlist/:userId/:productId', async (req, res) => {
    const { userId, productId } = req.params;
    try {
        await pool.query(
            'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );
        res.json({ message: 'Removed from wishlist' });
    } catch (err) {
        logger.error('Error removing from wishlist', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Initialization
const start = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wishlists (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, product_id)
            );
        `);
        logger.info('Database initialized');

        app.listen(PORT, () => {
            logger.info(`Wishlist Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
