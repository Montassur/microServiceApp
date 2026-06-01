const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const logger = require('../../lib/logger');

// GET /api/notifications/:userId
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching notifications', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
