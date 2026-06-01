const { pool } = require('../config/database');
const { hashPassword } = require('../utils/password');

// Get all users (admin only)
const getAllUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search = '', role = '' } = req.query;
        const offset = (page - 1) * limit;

        let query = `
      SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, last_login
      FROM users
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;

        // Search filter
        if (search) {
            query += ` AND (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Role filter
        if (role) {
            query += ` AND role = $${paramIndex}`;
            params.push(role);
            paramIndex++;
        }

        // Count total
        const countResult = await pool.query(
            query.replace('SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, last_login', 'SELECT COUNT(*)'),
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // Add pagination
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                users: result.rows.map(user => ({
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    isActive: user.is_active,
                    emailVerified: user.email_verified,
                    createdAt: user.created_at,
                    lastLogin: user.last_login
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get user by ID
const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, last_login
       FROM users WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                isActive: user.is_active,
                emailVerified: user.email_verified,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        });
    } catch (error) {
        next(error);
    }
};

// Create new user (admin only)
const createUser = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, role = 'user' } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
             VALUES ($1, $2, $3, $4, $5, true, true)
             RETURNING id, email, first_name, last_name, role, is_active, created_at`,
            [email, hashedPassword, firstName || '', lastName || '', role]
        );

        const user = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                isActive: user.is_active,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        next(error);
    }
};

// Update user
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { email, password, firstName, lastName, role, isActive } = req.body;

        // Check if user exists
        const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (email !== undefined) {
            updates.push(`email = $${paramIndex}`);
            values.push(email);
            paramIndex++;
        }

        if (password && password.trim() !== '') {
            const hashedPassword = await hashPassword(password);
            updates.push(`password_hash = $${paramIndex}`);
            values.push(hashedPassword);
            paramIndex++;
        }

        if (firstName !== undefined) {
            updates.push(`first_name = $${paramIndex}`);
            values.push(firstName);
            paramIndex++;
        }

        if (lastName !== undefined) {
            updates.push(`last_name = $${paramIndex}`);
            values.push(lastName);
            paramIndex++;
        }

        if (role !== undefined) {
            updates.push(`role = $${paramIndex}`);
            values.push(role);
            paramIndex++;
        }

        if (isActive !== undefined) {
            updates.push(`is_active = $${paramIndex}`);
            values.push(isActive);
            paramIndex++;
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, email, first_name, last_name, role, is_active, created_at
        `;

        const result = await pool.query(query, values);
        const user = result.rows[0];

        res.json({
            success: true,
            message: 'User updated successfully',
            data: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                isActive: user.is_active,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        next(error);
    }
};

// Delete user
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Toggle user status
const toggleUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE users 
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING id, is_active`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: `User ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: result.rows[0].id,
                isActive: result.rows[0].is_active
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get dashboard stats
const getDashboardStats = async (req, res, next) => {
    try {
        // Total users
        const totalUsers = await pool.query('SELECT COUNT(*) FROM users');

        // Active users
        const activeUsers = await pool.query('SELECT COUNT(*) FROM users WHERE is_active = true');

        // Users by role
        const usersByRole = await pool.query(
            'SELECT role, COUNT(*) as count FROM users GROUP BY role'
        );

        // Recent users (last 7 days)
        const recentUsers = await pool.query(
            "SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'"
        );

        // Active sessions
        const activeSessions = await pool.query(
            'SELECT COUNT(*) FROM sessions WHERE expires_at > NOW()'
        );

        res.json({
            success: true,
            data: {
                totalUsers: parseInt(totalUsers.rows[0].count),
                activeUsers: parseInt(activeUsers.rows[0].count),
                usersByRole: usersByRole.rows,
                recentUsers: parseInt(recentUsers.rows[0].count),
                activeSessions: parseInt(activeSessions.rows[0].count)
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    getDashboardStats
};
