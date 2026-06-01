const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const logger = require('../../lib/logger');

// POST /api/wishlist
router.post('/', async (req, res) => {
    const { userId, productId } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO wishlists (user_id, product_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING RETURNING *',
            [userId, productId]
        );
        res.status(201).json(result.rows[0] || { message: 'Already in wishlist' });
    } catch (err) {
        logger.error('Error adding to wishlist', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/wishlist/:userId
router.get('/:userId', async (req, res) => {
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

// DELETE /api/wishlist/:userId/item/:productId
router.delete('/:userId/item/:productId', async (req, res) => {
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

module.exports = router;
