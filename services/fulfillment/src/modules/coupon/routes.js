const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const logger = require('../../lib/logger');

// GET /api/coupons/validate/:code
router.get('/validate/:code', async (req, res) => {
    const { code } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM coupons WHERE code = $1 AND is_active = true AND (expiry_date IS NULL OR expiry_date > NOW())',
            [code]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid or expired coupon' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Error validating coupon', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/coupons
router.post('/', async (req, res) => {
    const { code, discountType, value, expirationDate } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO coupons (code, discount_percent, expiry_date, is_active, created_at) VALUES ($1, $2, $3, true, NOW()) RETURNING *',
            [code, value, expirationDate]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error('Error creating coupon', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/coupons
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching coupons', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /api/coupons/:id
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { code, value, expirationDate } = req.body; // value maps to discount_percent

    try {
        const result = await pool.query(
            'UPDATE coupons SET code = $1, discount_percent = $2, expiry_date = $3 WHERE id = $4 RETURNING *',
            [code, value, expirationDate, id]
            // Note: Keeping it simple, might need to handle is_active too if frontend sends it
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Error updating coupon', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /api/coupons/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM coupons WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Coupon not found' });
        }
        res.json({ message: 'Coupon deleted', coupon: result.rows[0] });
    } catch (err) {
        logger.error('Error deleting coupon', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
