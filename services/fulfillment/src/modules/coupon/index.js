const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3013;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'coupon-service' },
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
    res.status(200).json({ status: 'UP', service: 'coupon-service' });
});

// Coupon Routes
app.post('/api/coupons/validate', async (req, res) => {
    const { code, cartAmount } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM coupons WHERE code = $1 AND is_active = true AND expires_at > NOW()',
            [code]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ valid: false, message: 'Invalid or expired coupon' });
        }

        const coupon = result.rows[0];

        // Minimum spend check
        if (coupon.min_spend && cartAmount < parseFloat(coupon.min_spend)) {
            return res.status(400).json({
                valid: false,
                message: `Minimum spend of $${coupon.min_spend} required`
            });
        }

        // Usage limit check (Mock logic - would check usages table in real app)
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({ valid: false, message: 'Coupon usage limit reached' });
        }

        res.json({
            valid: true,
            discountType: coupon.discount_type, // 'percentage' or 'fixed'
            discountValue: coupon.discount_value,
            code: coupon.code
        });

    } catch (err) {
        logger.error('Error validating coupon', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/coupons', async (req, res) => {
    // Admin only - needs auth middleware
    const { code, discountType, discountValue, minSpend, expiresAt, usageLimit } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO coupons (code, discount_type, discount_value, min_spend, expires_at, usage_limit, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
            [code, discountType, discountValue, minSpend || 0, expiresAt, usageLimit]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error('Error creating coupon', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Initialization
const start = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                discount_type VARCHAR(20) NOT NULL, -- 'percentage' or 'fixed'
                discount_value DECIMAL(10, 2) NOT NULL,
                min_spend DECIMAL(10, 2) DEFAULT 0,
                expires_at TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                usage_limit INTEGER,
                used_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Database initialized');

        app.listen(PORT, () => {
            logger.info(`Coupon Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
