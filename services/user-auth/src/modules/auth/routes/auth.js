const express = require('express');
const router = express.Router();
const { signup, login, logout, me, refresh } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);

// Protected routes
router.get('/me', authenticate, me);

module.exports = router;
