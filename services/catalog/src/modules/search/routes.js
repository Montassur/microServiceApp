const express = require('express');
const router = express.Router();
const { getRedisSearchClient } = require('../../lib/redisearch');
const logger = require('../../lib/logger');

const INDEX_NAME = 'products';

/**
 * Search products using RediSearch
 * GET /api/search?q=laptop&category=electronics&minPrice=100&maxPrice=1000&limit=20&offset=0
 */
router.get('/', async (req, res) => {
    const {
        q = '*',
        category,
        brand,
        minPrice,
        maxPrice,
        inStock,
        limit = 20,
        offset = 0,
        sortBy = 'name',
        sortOrder = 'ASC'
    } = req.query;

    try {
        const client = getRedisSearchClient();

        // Build search query
        let searchQuery = q || '*';

        // Add filters
        const filters = [];
        if (category) filters.push(`@category:{${category}}`);
        if (brand) filters.push(`@brand:{${brand}}`);
        if (inStock !== undefined) filters.push(`@inStock:{${inStock === 'true' ? 'true' : 'false'}}`);
        if (minPrice !== undefined || maxPrice !== undefined) {
            const min = minPrice || 0;
            const max = maxPrice || '+inf';
            filters.push(`@price:[${min} ${max}]`);
        }

        if (filters.length > 0) {
            searchQuery = `${searchQuery} ${filters.join(' ')}`;
        }

        // Execute search
        const results = await client.ft.search(INDEX_NAME, searchQuery, {
            LIMIT: {
                from: parseInt(offset),
                size: parseInt(limit)
            },
            SORTBY: {
                BY: sortBy,
                DIRECTION: sortOrder
            }
        });

        // Transform results
        const products = results.documents.map(doc => ({
            id: doc.id.replace('product:', ''),
            ...doc.value
        }));

        res.json({
            total: results.total,
            products,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(results.total / limit)
        });
    } catch (err) {
        logger.error('Error searching products', { error: err.message, query: q });

        // Handle index not found gracefully
        if (err.message && err.message.includes('no such index')) {
            return res.json({
                total: 0,
                products: [],
                page: 1,
                totalPages: 0
            });
        }

        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * Get autocomplete suggestions
 * GET /api/search/suggestions?q=lap&limit=10
 */
router.get('/suggestions', async (req, res) => {
    const { q, limit = 10 } = req.query;

    if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
        const client = getRedisSearchClient();

        const results = await client.ft.search(INDEX_NAME, `${q}*`, {
            LIMIT: {
                from: 0,
                size: parseInt(limit)
            },
            RETURN: ['name']
        });

        const suggestions = results.documents.map(doc => doc.value.name);
        res.json(suggestions);
    } catch (err) {
        logger.error('Error getting suggestions', { error: err.message, query: q });

        if (err.message && err.message.includes('no such index')) {
            return res.json([]);
        }

        res.status(500).json({ error: 'Failed to get suggestions' });
    }
});

module.exports = router;
