const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const logger = require('../../lib/logger');

// GET /api/users - List all users
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, first_name, last_name, role, created_at FROM users ORDER BY created_at DESC');
        // Return structure matching Admin App expectation: { data: { users: [...] } }
        // Admin client calls: na.getUsers()
        // Client.js: getUsers: (params) => api.get('/admin/users', { params })
        // Standard in this app seems to be res.json(data) or res.json({ data: ... })
        // Let's look at auth response: res.json({ token, user: ... })
        // Admin code: (await na.getUsers()).data.data.users
        // So Axios response.data = { data: { users: [...] } }
        // So we must return { data: { users: [...] } }

        // Map fields to match Frontend expectation (firstName, lastName)
        const users = result.rows.map(u => ({
            id: u.id,
            email: u.email,
            firstName: u.first_name,
            lastName: u.last_name,
            role: u.role,
            isActive: true, // Defaulting for now
            createdAt: u.created_at
        }));

        res.json({ data: { users } });
    } catch (err) {
        logger.error('Error fetching users', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET /api/users/profile
router.get('/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret');
        const result = await pool.query('SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1', [decoded.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ data: result.rows[0] });
    } catch (err) {
        logger.error('Error fetching profile', err);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// PUT /api/users/profile
router.put('/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { firstName, lastName } = req.body;

    try {
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret');
        const result = await pool.query(
            'UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3 RETURNING id, email, first_name, last_name, role',
            [firstName, lastName, decoded.userId]
        );
        res.json({ data: result.rows[0] });
    } catch (err) {
        logger.error('Error updating profile', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const u = result.rows[0];
        const user = {
            id: u.id,
            email: u.email,
            firstName: u.first_name,
            lastName: u.last_name,
            role: u.role,
            createdAt: u.created_at
        };
        res.json({ data: user });
    } catch (err) {
        logger.error('Error fetching user', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// POST /api/users - Create user (Admin)
router.post('/', async (req, res) => {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await require('bcryptjs').hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (email, password_hash, first_name, last_name, role, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, email, first_name, last_name, role, created_at',
            [email, hashedPassword, firstName, lastName, role]
        );

        res.status(201).json({ data: result.rows[0] });
    } catch (err) {
        logger.error('Error creating user', err);
        if (err.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /api/users/:id (Update User)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, role } = req.body;

    try {
        const result = await pool.query(
            'UPDATE users SET first_name = $1, last_name = $2, email = $3, role = $4 WHERE id = $5 RETURNING *',
            [firstName, lastName, email, role, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ data: result.rows[0] });
    } catch (err) {
        logger.error('Error updating user', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// PUT /api/users/:id/status (Toggle Status)
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    try {
        // Toggle is_active
        const result = await pool.query(
            'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ data: result.rows[0] });
    } catch (err) {
        logger.error('Error toggling user status', err);
        res.status(500).json({ error: 'Failed to toggle status' });
    }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Publish Event
        // const channel = getChannel(); ... (if needed)

        res.status(200).json({ message: 'User deleted', user: result.rows[0] });
    } catch (err) {
        logger.error('Error deleting user', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
