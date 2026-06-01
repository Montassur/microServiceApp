const { pool } = require('../config/database');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../utils/password');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');

// User signup
const signup = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Validate password strength
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.message
            });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role, created_at`,
            [email.toLowerCase(), passwordHash, firstName, lastName, 'user']
        );

        const user = result.rows[0];

        // Generate tokens
        const accessToken = generateAccessToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        const refreshToken = generateRefreshToken({
            id: user.id,
            email: user.email
        });

        // Store refresh token
        await pool.query(
            `INSERT INTO sessions (user_id, refresh_token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
            [user.id, refreshToken, req.ip, req.get('user-agent')]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role
                },
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

// User login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = result.rows[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        // Generate tokens
        const accessToken = generateAccessToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        const refreshToken = generateRefreshToken({
            id: user.id,
            email: user.email
        });

        // Store refresh token
        await pool.query(
            `INSERT INTO sessions (user_id, refresh_token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
            [user.id, refreshToken, req.ip, req.get('user-agent')]
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role
                },
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

// Logout
const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // Delete refresh token
            await pool.query(
                'DELETE FROM sessions WHERE refresh_token = $1',
                [refreshToken]
            );
        }

        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        next(error);
    }
};

// Get current user
const me = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, last_login
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

// Refresh token
const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token exists and is not expired
        const sessionResult = await pool.query(
            'SELECT * FROM sessions WHERE refresh_token = $1 AND expires_at > NOW()',
            [refreshToken]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        const session = sessionResult.rows[0];

        // Get user
        const userResult = await pool.query(
            'SELECT id, email, role FROM users WHERE id = $1 AND is_active = true',
            [session.user_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        const user = userResult.rows[0];

        // Generate new access token
        const newAccessToken = generateAccessToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        res.json({
            success: true,
            data: {
                accessToken: newAccessToken
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    signup,
    login,
    logout,
    me,
    refresh
};
