const express = require('express');
const router = express.Router();
const redisClient = require('../../lib/redis');
const logger = require('../../lib/logger');

// GET /api/cart (Info)
router.get('/', (req, res) => {
    res.json({ message: 'Cart Endpoint. Use GET /:userId to fetch a cart.' });
});

// POST /api/cart
router.post('/', async (req, res) => {
    const { userId, productId, quantity, price, name, image_url } = req.body;
    try {
        const cacheKey = `cart:${userId}`;
        let cart = JSON.parse(await redisClient.get(cacheKey)) || { items: [] };

        const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += quantity;
            // Update metadata if provided (e.g. price change)
            if (price) cart.items[existingItemIndex].price = price;
        } else {
            cart.items.push({ productId, quantity, price, name, image_url });
        }

        await redisClient.set(cacheKey, JSON.stringify(cart));
        res.json(cart);
    } catch (err) {
        logger.error('Error updating cart', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/cart/:userId
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const cacheKey = `cart:${userId}`;
        const cart = JSON.parse(await redisClient.get(cacheKey)) || { items: [] };
        res.json(cart);
    } catch (err) {
        logger.error('Error fetching cart', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /api/cart/:userId/item/:productId
router.delete('/:userId/item/:productId', async (req, res) => {
    const { userId, productId } = req.params;
    try {
        const cacheKey = `cart:${userId}`;
        let cart = JSON.parse(await redisClient.get(cacheKey)) || { items: [] };

        cart.items = cart.items.filter(item => item.productId !== productId);
        await redisClient.set(cacheKey, JSON.stringify(cart));

        res.json(cart);
    } catch (err) {
        logger.error('Error removing item from cart', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /api/cart/:userId (Clear cart)
router.delete('/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const cacheKey = `cart:${userId}`;
        // Either delete the key or set items to empty.
        // Let's set to empty items to preserve structure if needed, or just delete.
        // Deleting corresponds to "no cart", which is fine.
        await redisClient.del(cacheKey);
        res.json({ items: [] });
    } catch (err) {
        logger.error('Error clearing cart', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
