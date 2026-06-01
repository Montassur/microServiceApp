const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');
const { createClient } = require('redis');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3001;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'product-service' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

// Database Setup (PostgreSQL)
const pool = new Pool({
    host: process.env.DB_HOST || 'database',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'auraweb_db',
    user: process.env.DB_USER || 'auraweb_user',
    password: process.env.DB_PASSWORD,
});

// Cache Setup (Redis)
const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'redis'}:6379`
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Connected to Redis'));

// Application Setup
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'product-service' });
});

// Routes
// TODO: Abstract into separate route files
app.get('/api/products', async (req, res) => {
    try {
        // Try to get from cache first
        const cacheKey = 'products:all';
        const cachedProducts = await redisClient.get(cacheKey);

        if (cachedProducts) {
            return res.json(JSON.parse(cachedProducts));
        }

        // If not in cache, query DB
        const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');

        // Save to cache (expire in 1 hour)
        await redisClient.set(cacheKey, JSON.stringify(result.rows), {
            EX: 3600
        });

        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching products', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/products', async (req, res) => {
    // Basic implementation - needs auth middleware
    const { name, description, price, category, stock } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (name, description, price, category, stock, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
            [name, description, price, category, stock]
        );

        // Invalidate cache
        await redisClient.del('products:all');

        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error('Error creating product', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Initialization
const start = async () => {
    try {
        // Connect to Redis
        await redisClient.connect();

        // Create Products Table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                category VARCHAR(100),
                stock INTEGER DEFAULT 0,
                image_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Database initialized');

        // Seed Demo Data if empty
        const countRes = await pool.query('SELECT COUNT(*) FROM products');
        if (parseInt(countRes.rows[0].count) === 0) {
            logger.info('Seeding demo products...');
            const demoProducts = [
                {
                    name: 'Cloud Platform',
                    category: 'infrastructure',
                    price: 99.00,
                    description: 'Scalable cloud infrastructure for modern applications',
                    stock: 100
                },
                {
                    name: 'Analytics Suite',
                    category: 'software',
                    price: 149.00,
                    description: 'Real-time analytics and business intelligence',
                    stock: 50
                },
                {
                    name: 'Security Shield',
                    category: 'security',
                    price: 199.00,
                    description: 'Enterprise-grade security and compliance',
                    stock: 75
                },
                {
                    name: 'DevOps Tools',
                    category: 'software',
                    price: 79.00,
                    description: 'Complete CI/CD pipeline and automation',
                    stock: 200
                },
                {
                    name: 'Database Pro',
                    category: 'infrastructure',
                    price: 129.00,
                    description: 'Managed database with automatic backups',
                    stock: 60
                },
                {
                    name: 'API Gateway',
                    category: 'software',
                    price: 89.00,
                    description: 'Secure and scalable API management',
                    stock: 150
                }
            ];

            for (const p of demoProducts) {
                await pool.query(
                    'INSERT INTO products (name, description, price, category, stock) VALUES ($1, $2, $3, $4, $5)',
                    [p.name, p.description, p.price, p.category, p.stock]
                );
            }
            logger.info('Demo products seeded');
        }

        app.listen(PORT, () => {
            logger.info(`Product Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
