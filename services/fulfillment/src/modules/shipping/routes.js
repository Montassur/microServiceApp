const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const logger = require('../../lib/logger');

// GET /api/shipping/rates
router.get('/rates', (req, res) => {
    // Mock Rates
    res.json([
        { id: 'standard', name: 'Standard Shipping', price: 5.00, days: '3-5' },
        { id: 'express', name: 'Express Shipping', price: 15.00, days: '1-2' }
    ]);
});

// GET /api/shipping/:userId
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM shipments WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching shipments', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
