const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const stripe = require('../../lib/stripe');
const logger = require('../../lib/logger');
const { getChannel } = require('../../lib/rabbitmq');

// POST /api/payments
router.post('/', async (req, res) => {
    const { orderId, amount, currency, token } = req.body;

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100,
            currency: currency || 'usd',
            payment_method: token,
            description: `Payment for Order #${orderId}`,
            confirm: true,
            return_url: `https://example.com/checkout/complete`
        });

        const status = paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'FAILED';

        const result = await pool.query(
            'INSERT INTO payments (order_id, amount, currency, status, stripe_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
            [orderId, amount, currency, status, paymentIntent.id]
        );

        const channel = getChannel();
        if (channel) {
            const eventName = status === 'COMPLETED' ? 'PAYMENT_PROCESSED' : 'PAYMENT_FAILED';
            channel.sendToQueue(eventName, Buffer.from(JSON.stringify({
                orderId,
                paymentId: result.rows[0].id,
                success: status === 'COMPLETED'
            })));
        }

        res.status(201).json(result.rows[0]);

    } catch (err) {
        logger.error('Error processing payment', err);

        try {
            await pool.query(
                'INSERT INTO payments (order_id, amount, status, created_at) VALUES ($1, $2, $3, NOW())',
                [orderId, amount, 'FAILED']
            );
        } catch (e) { /* ignore */ }

        const channel = getChannel();
        if (channel) {
            channel.sendToQueue('PAYMENT_FAILED', Buffer.from(JSON.stringify({
                orderId,
                error: err.message
            })));
        }

        res.status(500).json({ error: 'Payment Failed', details: err.message });
    }
});

module.exports = router;
