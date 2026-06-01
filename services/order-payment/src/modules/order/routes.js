const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const logger = require('../../lib/logger');
const { getChannel } = require('../../lib/rabbitmq');

// POST /api/orders
// POST /api/orders
router.post('/', async (req, res) => {
    const { userId, products } = req.body; // Ignore client totalAmount for security

    if (!products || products.length === 0) {
        return res.status(400).json({ error: 'No products in order' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Fetch current prices for all products to ensure validity and security
        // Extract IDs
        const productIds = products.map(p => p.productId);
        const productsRes = await client.query(
            'SELECT id, price FROM products WHERE id = ANY($1)',
            [productIds]
        );
        const dbProducts = {};
        productsRes.rows.forEach(p => { dbProducts[p.id] = parseFloat(p.price); });

        // 2. Validate and Calculate Total
        let calculatedTotal = 0;
        const finalOrderItems = [];

        for (const p of products) {
            const dbPrice = dbProducts[p.productId];
            if (dbPrice === undefined) {
                // Product might have been deleted
                throw new Error(`Product ${p.productId} not found`);
            }
            const quantity = p.quantity || 1;
            calculatedTotal += dbPrice * quantity;
            finalOrderItems.push({ productId: p.productId, quantity, price: dbPrice });
        }

        // 3. Create Order
        const orderRes = await client.query(
            'INSERT INTO orders (user_id, total_amount, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
            [userId, calculatedTotal, 'PENDING']
        );
        const order = orderRes.rows[0];

        // 4. Create Order Items
        for (const item of finalOrderItems) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [order.id, item.productId, item.quantity, item.price]
            );
        }

        await client.query('COMMIT');

        // Publish Order Created Event
        const channel = getChannel();
        if (channel) {
            channel.sendToQueue('ORDER_CREATED', Buffer.from(JSON.stringify({
                orderId: order.id,
                userId: userId,
                products: finalOrderItems,
                timestamp: new Date()
            })));
            logger.info(`Published ORDER_CREATED for Order #${order.id}`);
        }

        res.status(201).json(order);

    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Error creating order', err);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    } finally {
        client.release();
    }
});

// GET /api/orders/user/:userId (Frontend route)
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching orders', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/orders/:userId
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching orders', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/orders (Admin - List all)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching all orders', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/orders (Admin - List all)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching all orders', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
