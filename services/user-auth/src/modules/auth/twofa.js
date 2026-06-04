/**
 * Email-based two-factor authentication (2FA).
 *
 * Flow:
 *   1. POST /api/auth/2fa/request   — send a 6-digit code to the user's email.
 *      Used both when ENABLING 2FA and during LOGIN if 2FA is on.
 *   2. POST /api/auth/2fa/verify    — verify the code.
 *      - If the user wasn't 2FA-enabled yet → enables it.
 *      - If they were logging in → returns a JWT.
 *   3. POST /api/auth/2fa/disable   — disables 2FA after verifying password.
 *
 * Storage: three columns added on the `users` table — `is_2fa_enabled`,
 * `email_otp`, `email_otp_expires_at`. The OTP is hashed before being saved.
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../../lib/db');
const logger = require('../../lib/logger');
const { sendMail } = require('../../lib/mailer');

const OTP_TTL_MIN = 10;   // codes expire after 10 minutes
const OTP_LENGTH = 6;

const generateOtp = () => {
    // Simple zero-padded 6-digit code: 000000..999999
    return String(crypto.randomInt(0, 1_000_000)).padStart(OTP_LENGTH, '0');
};

const hashOtp = (otp) => bcrypt.hashSync(otp, 8);

const sendOtpEmail = async (to, otp, purpose) => {
    const subject = purpose === 'login'
        ? 'Your Ecommerce login verification code'
        : 'Your Ecommerce 2FA setup code';

    const text = `Your code is ${otp}\n\nIt expires in ${OTP_TTL_MIN} minutes.\n\nIf you didn't request this, you can ignore this email.`;

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 500px; margin: auto;">
            <h2 style="color: #0f3460;">Ecommerce — verification code</h2>
            <p>Use the following code to ${purpose === 'login' ? 'sign in' : 'enable two-factor authentication'}:</p>
            <p style="font-size: 32px; letter-spacing: 8px; text-align: center; padding: 16px 0; background: #f4f7fa; border-radius: 8px; font-weight: 700;">${otp}</p>
            <p style="color: #666; font-size: 14px;">This code expires in ${OTP_TTL_MIN} minutes. If you didn't request it, you can safely ignore this email.</p>
        </div>
    `;

    await sendMail({ to, subject, text, html });
};

// ─── 1) Request a fresh OTP ────────────────────────────────────────────────
// Used both when ENABLING 2FA on a logged-in user and during LOGIN.
// Body: { email }   (we identify the user by email)
router.post('/2fa/request', async (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
        const result = await pool.query(
            'SELECT id, email, is_2fa_enabled FROM users WHERE email = $1',
            [email]
        );
        const user = result.rows[0];
        // Even if the user does not exist we return 200 — avoids leaking
        // which emails are registered.
        if (!user) {
            logger.info(`2FA request for unknown email ${email} — silent OK`);
            return res.json({ ok: true });
        }

        const otp = generateOtp();
        const otpHash = hashOtp(otp);
        const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60_000);

        await pool.query(
            'UPDATE users SET email_otp = $1, email_otp_expires_at = $2 WHERE id = $3',
            [otpHash, expiresAt, user.id]
        );

        const purpose = user.is_2fa_enabled ? 'login' : 'setup';
        await sendOtpEmail(user.email, otp, purpose);

        logger.info(`2FA OTP sent to ${user.email} (purpose=${purpose})`);
        res.json({ ok: true });
    } catch (err) {
        logger.error('Error issuing 2FA OTP', err);
        res.status(500).json({ error: 'Failed to issue OTP' });
    }
});

// ─── 2) Verify the OTP ─────────────────────────────────────────────────────
// Body: { email, code }
// If user.is_2fa_enabled == false → flips it to true (enrollment).
// If user.is_2fa_enabled == true  → returns a JWT (login step 2).
router.post('/2fa/verify', async (req, res) => {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: 'email and code are required' });

    try {
        const result = await pool.query(
            `SELECT id, email, name, role, is_2fa_enabled, email_otp, email_otp_expires_at
             FROM users WHERE email = $1`,
            [email]
        );
        const user = result.rows[0];
        if (!user || !user.email_otp || !user.email_otp_expires_at) {
            return res.status(400).json({ error: 'No pending verification' });
        }
        if (new Date(user.email_otp_expires_at) < new Date()) {
            return res.status(400).json({ error: 'Code expired — request a new one' });
        }
        if (!bcrypt.compareSync(code, user.email_otp)) {
            return res.status(400).json({ error: 'Invalid code' });
        }

        // Code consumed — clear it.
        await pool.query(
            'UPDATE users SET email_otp = NULL, email_otp_expires_at = NULL WHERE id = $1',
            [user.id]
        );

        if (!user.is_2fa_enabled) {
            // First-time enrollment.
            await pool.query('UPDATE users SET is_2fa_enabled = true WHERE id = $1', [user.id]);
            return res.json({ ok: true, enrolled: true });
        }

        // Login step 2 — issue the real JWT.
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1h' }
        );
        res.json({
            ok: true,
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        });
    } catch (err) {
        logger.error('Error verifying 2FA OTP', err);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// ─── 3) Disable 2FA ────────────────────────────────────────────────────────
// Body: { email, password }  — require password re-entry as a safety check.
router.post('/2fa/disable', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    try {
        const result = await pool.query(
            'SELECT id, password_hash FROM users WHERE email = $1',
            [email]
        );
        const user = result.rows[0];
        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        await pool.query(
            `UPDATE users
             SET is_2fa_enabled = false,
                 email_otp = NULL,
                 email_otp_expires_at = NULL
             WHERE id = $1`,
            [user.id]
        );
        res.json({ ok: true });
    } catch (err) {
        logger.error('Error disabling 2FA', err);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

// ─── 4) Status (lets the UI check if the current user has 2FA on) ────────
// Used by the admin Settings page to show "Enabled" / "Enable" correctly.
router.get('/2fa/status', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const result = await pool.query(
            'SELECT email, is_2fa_enabled FROM users WHERE id = $1',
            [decoded.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ email: result.rows[0].email, enabled: !!result.rows[0].is_2fa_enabled });
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
