const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const redisClient = require('../../lib/redis');
const logger = require('../../lib/logger');
const { getChannel } = require('../../lib/rabbitmq');

// GET /api/products
router.get('/', async (req, res) => {
    try {
        const cacheKey = 'products:all';
        const cachedProducts = await redisClient.get(cacheKey);

        if (cachedProducts) {
            return res.json(JSON.parse(cachedProducts));
        }

        const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');

        await redisClient.set(cacheKey, JSON.stringify(result.rows), {
            EX: 3600
        });

        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching products', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/products
router.post('/', async (req, res) => {
    const { name, description, price, category, stock, image_url } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (name, description, price, category, stock, image_url, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
            [name, description, price, category, stock, image_url]
        );

        await redisClient.del('products:all');

        // Publish Event for Search Service (now internal module, but good to keep event driven for decoupling)
        const channel = getChannel();
        if (channel) {
            channel.sendToQueue('PRODUCT_CREATED', Buffer.from(JSON.stringify(result.rows[0])));
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error('Error creating product', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price, category, stock, image_url } = req.body;

    try {
        const result = await pool.query(
            'UPDATE products SET name = $1, description = $2, price = $3, category = $4, stock = $5, image_url = $6 WHERE id = $7 RETURNING *',
            [name, description, price, category, stock, image_url, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await redisClient.del('products:all');

        const channel = getChannel();
        if (channel) {
            channel.sendToQueue('PRODUCT_UPDATED', Buffer.from(JSON.stringify(result.rows[0])));
        }

        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Error updating product', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await redisClient.del('products:all');

        const channel = getChannel();
        if (channel) {
            channel.sendToQueue('PRODUCT_DELETED', Buffer.from(JSON.stringify({ id })));
        }

        res.status(200).json({ message: 'Product deleted', product: result.rows[0] });
    } catch (err) {
        logger.error('Error deleting product', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
