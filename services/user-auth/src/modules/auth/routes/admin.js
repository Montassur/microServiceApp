const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    getDashboardStats
} = require('../controllers/adminController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorizeRoles('admin'));

// Dashboard stats
router.get('/stats', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/status', toggleUserStatus);

module.exports = router;
