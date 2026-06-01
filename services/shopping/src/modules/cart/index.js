const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');
const { createClient } = require('redis');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3014;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'cart-service' },
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

// Application Setup
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'cart-service' });
});

// Cart Routes
app.get('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // Try Redis first
        const cacheKey = `cart:${userId}`;
        const cachedCart = await redisClient.get(cacheKey);

        if (cachedCart) {
            return res.json(JSON.parse(cachedCart));
        }

        // Fallback to DB
        const result = await pool.query('SELECT * FROM carts WHERE user_id = $1', [userId]);

        if (result.rows.length === 0) {
            return res.json({ items: [], total: 0 });
        }

        const cart = result.rows[0];
        // Cache it
        await redisClient.set(cacheKey, JSON.stringify(cart));

        res.json(cart);
    } catch (err) {
        logger.error('Error fetching cart', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    const { productId, quantity, price } = req.body;

    try {
        // Get current cart from Redis or DB
        const cacheKey = `cart:${userId}`;
        let cart = await redisClient.get(cacheKey);

        if (cart) {
            cart = JSON.parse(cart);
        } else {
            // Check DB
            const dbRes = await pool.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
            if (dbRes.rows.length > 0) {
                cart = dbRes.rows[0];
            } else {
                cart = { user_id: userId, items: [], total: 0 };
            }
        }

        // Update items
        const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            cart.items.push({ productId, quantity, price });
        }

        // Recalculate total (Simplified)
        cart.total = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        // Update Redis
        await redisClient.set(cacheKey, JSON.stringify(cart));

        // Update DB (Persist)
        // Note: In high-scale, might do this async or periodically
        await pool.query(
            `INSERT INTO carts (user_id, items, total, updated_at) 
             VALUES ($1, $2, $3, NOW()) 
             ON CONFLICT (user_id) 
             DO UPDATE SET items = EXCLUDED.items, total = EXCLUDED.total, updated_at = NOW()`,
            [userId, JSON.stringify(cart.items), cart.total]
        );

        res.json(cart);
    } catch (err) {
        logger.error('Error updating cart', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        await redisClient.del(`cart:${userId}`);
        await pool.query('DELETE FROM carts WHERE user_id = $1', [userId]);
        res.json({ message: 'Cart cleared' });
    } catch (err) {
        logger.error('Error clearing cart', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Initialization
const start = async () => {
    try {
        await redisClient.connect();

        await pool.query(`
            CREATE TABLE IF NOT EXISTS carts (
                user_id INTEGER PRIMARY KEY,
                items JSONB DEFAULT '[]',
                total DECIMAL(10, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Database initialized');

        app.listen(PORT, () => {
            logger.info(`Cart Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
