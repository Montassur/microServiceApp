const Stripe = require('stripe');
const logger = require('./logger');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

module.exports = stripe;
