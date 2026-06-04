const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../../lib/db');
const logger = require('../../lib/logger');
const { notifySettingsUpdated } = require('./events');

// Tiny inline auth middleware — extracts userId from the Bearer token so the
// preferences endpoints can scope to the caller without trusting body params.
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.userId = decoded.userId;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ─── GET /api/notifications/preferences ────────────────────────────────────
// Returns the calling user's notification settings.
router.get('/preferences', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT email, notifications_enabled FROM users WHERE id = $1',
            [req.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({
            email: result.rows[0].email,
            emailNotifications: !!result.rows[0].notifications_enabled,
        });
    } catch (err) {
        logger.error('Error reading preferences', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ─── PUT /api/notifications/preferences ────────────────────────────────────
// Body: { emailNotifications: boolean }
// Saves the flag AND (if enabled) sends a confirmation email — so the user
// gets immediate feedback that the channel is working.
router.put('/preferences', requireAuth, async (req, res) => {
    const enabled = !!req.body?.emailNotifications;
    try {
        await pool.query(
            'UPDATE users SET notifications_enabled = $1 WHERE id = $2',
            [enabled, req.userId]
        );

        // Confirmation email when the user SAVES settings, regardless of
        // toggle state — this is the "send email when settings change"
        // behaviour the admin asked for. It uses the same notifications
        // template and will only land if the user is opted in.
        if (enabled) {
            await notifySettingsUpdated(req.userId);
        }

        res.json({ ok: true, emailNotifications: enabled });
    } catch (err) {
        logger.error('Error updating preferences', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ─── GET /api/notifications/:userId ────────────────────────────────────────
// Existing legacy endpoint — lists notifications for a given user.
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    // Path collision guard: '/preferences' is matched above first because of
    // express ordering, but reject obvious non-numeric IDs here just in case.
    if (!/^\d+$/.test(userId)) return res.status(404).json({ error: 'Not found' });

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
