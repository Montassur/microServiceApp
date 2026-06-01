const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const logger = require('../../lib/logger');

// GET /api/audit
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching audit logs', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
