/**
 * Notification fanout. Listens for business events on RabbitMQ and:
 *   1. Stores an in-app notification row per recipient
 *   2. Sends a real email if the user has notifications_enabled = true
 *
 * Every email attempt bumps the Prometheus counter
 *   notifications_emails_sent_total{type, status}
 * so it can be plotted in Grafana.
 */
const pool = require('../../lib/db');
const logger = require('../../lib/logger');
const { getChannel } = require('../../lib/rabbitmq');
const { sendMail } = require('../../lib/mailer');
const { emailsSentTotal } = require('../../lib/metrics');

const TEMPLATES = {
    order_paid: (data) => ({
        subject: `New order paid — Order #${data.orderId}`,
        text: `A customer just paid for Order #${data.orderId}.\n\n` +
              `Amount: ${data.currency?.toUpperCase() || 'USD'} ${data.amount ?? 'N/A'}\n` +
              `Payment intent: ${data.paymentIntentId || 'n/a'}\n\n` +
              `Open the admin dashboard to view the order.`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 540px; margin: auto;">
                <h2 style="color: #0f3460;">🛒 A customer just bought something</h2>
                <p>Order <strong>#${data.orderId}</strong> has been paid.</p>
                <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${(data.currency || 'usd').toUpperCase()} ${data.amount ?? '—'}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Payment ID</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;"><code>${data.paymentIntentId || '—'}</code></td></tr>
                </table>
                <p style="color: #666; font-size: 14px;">You're receiving this because Email Notifications are on in your admin Settings.</p>
            </div>
        `,
    }),

    settings_updated: () => ({
        subject: 'Your Ecommerce admin settings were updated',
        text: 'You just saved changes to your admin settings.\n\n' +
              'If this wasn\'t you, sign in and review your account immediately.',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 540px; margin: auto;">
                <h2 style="color: #0f3460;">✅ Settings updated</h2>
                <p>Your admin settings were just modified.</p>
                <p style="color: #666; font-size: 14px;">If this wasn't you, sign in and review your account immediately.</p>
            </div>
        `,
    }),
};

const emailRecipients = async (filterRole = null) => {
    const sql = filterRole
        ? `SELECT id, email FROM users WHERE notifications_enabled = true AND role = $1`
        : `SELECT id, email FROM users WHERE notifications_enabled = true`;
    const params = filterRole ? [filterRole] : [];
    const result = await pool.query(sql, params);
    return result.rows;
};

const sendNotificationEmail = async (recipient, type, data) => {
    const template = TEMPLATES[type];
    if (!template) {
        logger.warn(`No template for notification type "${type}"`);
        emailsSentTotal.inc({ type, status: 'skipped' });
        return;
    }
    const { subject, text, html } = template(data);
    try {
        const result = await sendMail({ to: recipient.email, subject, text, html });
        if (result?.skipped) {
            emailsSentTotal.inc({ type, status: 'skipped' });
            logger.warn(`Email skipped (SMTP not configured): ${type} → ${recipient.email}`);
        } else {
            emailsSentTotal.inc({ type, status: 'sent' });
            logger.info(`Email sent: ${type} → ${recipient.email}`);
        }
    } catch (err) {
        emailsSentTotal.inc({ type, status: 'failed' });
        logger.error(`Email failed: ${type} → ${recipient.email}`, err.message);
    }
};

// Public helper, used by routes.js when admin saves settings
const notifySettingsUpdated = async (userId) => {
    try {
        const result = await pool.query(
            'SELECT id, email FROM users WHERE id = $1 AND notifications_enabled = true',
            [userId]
        );
        if (result.rows.length === 0) return;
        await sendNotificationEmail(result.rows[0], 'settings_updated', {});
    } catch (err) {
        logger.error('notifySettingsUpdated failed (non-fatal)', err.message);
    }
};

const insertNotification = async (userId, message) => {
    try {
        await pool.query(
            'INSERT INTO notifications (user_id, message, created_at) VALUES ($1, $2, NOW())',
            [userId, message]
        );
    } catch (err) {
        logger.error('Failed to insert notification row', err.message);
    }
};

const setupNotificationEvents = async () => {
    const channel = getChannel();
    if (!channel) {
        logger.warn('No RabbitMQ channel — skipping notification consumers');
        return;
    }

    logger.info('Setting up Notification Event Listeners...');

    // ORDER_PAID — fan out to every admin who opted in.
    // (Queue is already declared by the order-payment service; we just consume.)
    channel.consume('ORDER_PAID', async (msg) => {
        if (!msg) return;
        try {
            const data = JSON.parse(msg.content.toString());
            logger.info(`Notifying admins of paid Order #${data.orderId}`);

            const admins = await emailRecipients('admin');
            for (const admin of admins) {
                await insertNotification(admin.id, `Order #${data.orderId} was paid.`);
                await sendNotificationEmail(admin, 'order_paid', data);
            }
            channel.ack(msg);
        } catch (err) {
            logger.error('ORDER_PAID handler failed', err.message);
            channel.nack(msg, false, false);  // don't requeue
        }
    });
};

module.exports = setupNotificationEvents;
module.exports.notifySettingsUpdated = notifySettingsUpdated;
