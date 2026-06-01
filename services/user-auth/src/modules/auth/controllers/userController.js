const { pool } = require('../config/database');
const { hashPassword, validatePasswordStrength } = require('../utils/password');

// Get user profile
const getProfile = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, email, first_name, last_name, role, created_at, last_login
       FROM users WHERE id = $1`,
            [req.user.id]
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
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        });
    } catch (error) {
        next(error);
    }
};

// Update user profile
const updateProfile = async (req, res, next) => {
    try {
        const { firstName, lastName } = req.body;

        const result = await pool.query(
            `UPDATE users SET first_name = $1, last_name = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, first_name, last_name, role`,
            [firstName, lastName, req.user.id]
        );

        const user = result.rows[0];

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// Change password
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        // Validate new password strength
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.message
            });
        }

        // Get current password hash
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const { comparePassword } = require('../utils/password');
        const isValid = await comparePassword(currentPassword, userResult.rows[0].password_hash);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const newPasswordHash = await hashPassword(newPassword);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newPasswordHash, req.user.id]
        );

        // Invalidate all sessions
        await pool.query(
            'DELETE FROM sessions WHERE user_id = $1',
            [req.user.id]
        );

        res.json({
            success: true,
            message: 'Password changed successfully. Please login again.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword
};
