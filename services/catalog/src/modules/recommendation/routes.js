const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const logger = require('../../lib/logger');

// GET /api/recommendations
router.get('/', async (req, res) => {
    const { type } = req.query; // type: 'trending', 'random'

    try {
        let query = 'SELECT * FROM products ORDER BY RANDOM() LIMIT 5';

        if (type === 'trending') {
            query = 'SELECT * FROM products ORDER BY created_at DESC LIMIT 5';
        }

        // Since Recs are now in the same service as Product, we can query the 'products' table directly!
        const result = await pool.query(query);
        res.json({
            type: type || 'random',
            recommendations: result.rows
        });
    } catch (err) {
        logger.error('Error fetching recommendations', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
