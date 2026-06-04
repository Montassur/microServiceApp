/**
 * Email transport for the user-auth service.
 *
 * SMTP settings come from environment variables — the .env file declares
 * them and docker-compose / K8s pass them into the container.
 *
 * Required env vars:
 *   SMTP_HOST     — e.g. smtp.hostinger.com
 *   SMTP_PORT     — usually 587 (STARTTLS) or 465 (SSL)
 *   SMTP_USER     — full email address used to authenticate
 *   SMTP_PASS     — the email account's password (or app password)
 *   SMTP_FROM     — "From" header (often same as SMTP_USER)
 *
 * If SMTP_HOST is not set, sendMail() logs a warning and silently no-ops,
 * so the service stays functional even without email configuration.
 */
const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        // 465 implies implicit TLS; other ports use STARTTLS upgrade.
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    transporter.verify((err) => {
        if (err) {
            logger.warn('SMTP transport verify failed — emails will likely fail', err.message);
        } else {
            logger.info(`SMTP transport ready (host=${process.env.SMTP_HOST}, port=${port})`);
        }
    });
} else {
    logger.warn('SMTP env vars not set — email sending disabled (mailer.js no-ops)');
}

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';

async function sendMail({ to, subject, text, html }) {
    if (!transporter) {
        logger.warn(`SMTP not configured — skipping email to ${to} (subject="${subject}")`);
        return { skipped: true };
    }
    return transporter.sendMail({
        from: FROM,
        to,
        subject,
        text,
        html,
    });
}

module.exports = { sendMail };
