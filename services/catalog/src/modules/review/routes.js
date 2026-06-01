const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const logger = require('../../lib/logger');

// GET /api/reviews/product/:productId
router.get('/product/:productId', async (req, res) => {
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

// POST /api/reviews
router.post('/', async (req, res) => {
    const { productId, userId, rating, comment } = req.body;
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

module.exports = router;
