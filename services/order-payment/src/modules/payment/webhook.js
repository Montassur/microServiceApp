/**
 * Stripe webhook handler.
 *
 * Stripe POSTs events to /api/payments/webhook whenever something happens
 * (payment_intent.succeeded, payment_intent.payment_failed, refunds, …).
 *
 * IMPORTANT: this route must read the *raw* request body to verify the
 * signature header. That is why index.js mounts it with
 * `express.raw({ type: 'application/json' })` BEFORE express.json().
 */
const express = require('express');
const router = express.Router();
const stripe = require('../../lib/stripe');
const pool = require('../../lib/db');
const logger = require('../../lib/logger');
const { getChannel } = require('../../lib/rabbitmq');

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Mounted at /api/payments/webhook in src/index.js — this router handles '/'
router.post('/', async (req, res) => {
    const sig = req.headers['stripe-signature'];

    if (!WEBHOOK_SECRET) {
        logger.warn('STRIPE_WEBHOOK_SECRET not set — accepting unsigned event (DEV ONLY)');
    }

    let event;
    try {
        if (WEBHOOK_SECRET) {
            event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
        } else {
            // dev fallback: parse raw body ourselves, no signature check
            event = JSON.parse(req.body.toString('utf8'));
        }
    } catch (err) {
        logger.error('Webhook signature verification failed', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    logger.info(`Stripe webhook received: ${event.type}`);

    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const pi = event.data.object;
                const orderId = pi.metadata?.orderId || pi.description?.match(/Order #(\d+)/)?.[1];

                if (!orderId) {
                    logger.warn('payment_intent.succeeded with no orderId — ignoring', { piId: pi.id });
                    break;
                }

                // Idempotent update: only flip to PAID if not already.
                await pool.query(
                    `UPDATE orders SET status = 'PAID', updated_at = NOW()
                     WHERE id = $1 AND status <> 'PAID'`,
                    [orderId]
                );
                await pool.query(
                    `UPDATE payments SET status = 'COMPLETED' WHERE stripe_id = $1`,
                    [pi.id]
                );

                // Fan out via RabbitMQ so fulfillment / notifications can react.
                try {
                    const ch = getChannel();
                    if (ch) {
                        ch.sendToQueue('ORDER_PAID', Buffer.from(JSON.stringify({
                            orderId: Number(orderId),
                            paymentIntentId: pi.id,
                            amount: pi.amount / 100,
                            currency: pi.currency,
                        })));
                    }
                } catch (e) {
                    logger.warn('Failed to publish ORDER_PAID from webhook (non-fatal)', e.message);
                }

                logger.info(`Order #${orderId} marked PAID via webhook`);
                break;
            }

            case 'payment_intent.payment_failed': {
                const pi = event.data.object;
                const orderId = pi.metadata?.orderId || pi.description?.match(/Order #(\d+)/)?.[1];
                if (orderId) {
                    await pool.query(
                        `UPDATE orders SET status = 'PAYMENT_FAILED', updated_at = NOW()
                         WHERE id = $1 AND status <> 'PAID'`,
                        [orderId]
                    );
                }
                await pool.query(
                    `UPDATE payments SET status = 'FAILED' WHERE stripe_id = $1`,
                    [pi.id]
                );

                try {
                    const ch = getChannel();
                    if (ch) {
                        ch.sendToQueue('PAYMENT_FAILED', Buffer.from(JSON.stringify({
                            orderId: orderId ? Number(orderId) : null,
                            paymentIntentId: pi.id,
                            error: pi.last_payment_error?.message || 'unknown',
                        })));
                    }
                } catch (e) {
                    logger.warn('Failed to publish PAYMENT_FAILED from webhook (non-fatal)', e.message);
                }

                logger.info(`Order #${orderId || '?'} marked PAYMENT_FAILED via webhook`);
                break;
            }

            case 'charge.refunded':
            case 'charge.dispute.created':
                // Future work — log only for now
                logger.info(`Stripe event ${event.type} received but not yet handled`);
                break;

            default:
                // Unhandled event types are normal — just acknowledge.
                logger.debug(`Unhandled Stripe event type: ${event.type}`);
        }

        // Stripe wants a 2xx response within ~10 seconds, otherwise it retries.
        res.status(200).json({ received: true });
    } catch (err) {
        logger.error('Error processing Stripe webhook', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

module.exports = router;
