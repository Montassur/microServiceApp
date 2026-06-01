const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../lib/db');
const logger = require('../../lib/logger');
const { getChannel } = require('../../lib/rabbitmq');

// POST /api/auth/register
// POST /api/auth/register
// POST /api/auth/register
const registerHandler = async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, name',
            [email, hashedPassword, name]
        );

        const user = result.rows[0];

        // Publish Event
        const channel = getChannel();
        if (channel) {
            channel.sendToQueue('USER_CREATED', Buffer.from(JSON.stringify(user)));
        }

        res.status(201).json(user);
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
        const result = await pool.query('SELECT id, email, first_name, last_name, role FROM users WHERE id = $1', [decoded.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                role: user.role
            }
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
