const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../../lib/db');
const logger = require('../../lib/logger');
const { getChannel } = require('../../lib/rabbitmq');
const { sendMail } = require('../../lib/mailer');

// POST /api/auth/register
const registerHandler = async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, name, role',
            [email, hashedPassword, name]
        );

        const user = result.rows[0];

        // Sign a JWT immediately so the client can auto-login
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

        // Publishing the event is best-effort. If RabbitMQ is briefly unavailable
        // we still consider registration successful — the user is in the DB.
        try {
            const channel = getChannel();
            if (channel) {
                channel.sendToQueue('USER_CREATED', Buffer.from(JSON.stringify(user)));
            }
        } catch (mqErr) {
            logger.warn('Failed to publish USER_CREATED event (non-fatal)', mqErr);
        }

        res.status(201).json({ user, token });
    } catch (err) {
        logger.error('Error registering user', err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

router.post('/register', registerHandler);
router.post('/signup', registerHandler); // Alias for frontend compatibility

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // If 2FA is enabled, do NOT issue a token yet. Generate + email a
        // 6-digit code; the client must POST /api/auth/2fa/verify next.
        if (user.is_2fa_enabled) {
            const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
            const otpHash = await bcrypt.hash(otp, 8);
            const expiresAt = new Date(Date.now() + 10 * 60_000);
            await pool.query(
                'UPDATE users SET email_otp = $1, email_otp_expires_at = $2 WHERE id = $3',
                [otpHash, expiresAt, user.id]
            );
            try {
                await sendMail({
                    to: user.email,
                    subject: 'Your Ecommerce login verification code',
                    text: `Your code is ${otp}\n\nIt expires in 10 minutes.`,
                    html: `<p>Your login verification code is:</p>
                           <p style="font-size:28px;letter-spacing:6px;font-weight:700;">${otp}</p>
                           <p style="color:#666">Expires in 10 minutes.</p>`,
                });
            } catch (e) {
                logger.warn('Failed to send 2FA OTP email (non-fatal)', e.message);
            }
            return res.json({ needs_2fa: true, email: user.email });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (err) {
        logger.error('Error logging in', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const result = await pool.query(
            'SELECT id, email, name, first_name, last_name, role FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const u = result.rows[0];
        // Prefer the single `name` column (set by /register) over first/last.
        const displayName = u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;

        res.json({
            user: {
                id: u.id,
                email: u.email,
                name: displayName,
                role: u.role
            }
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
