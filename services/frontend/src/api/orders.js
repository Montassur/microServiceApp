import api from './client';

export const orderAPI = {
    // Create new order
    createOrder: (orderData) => api.post('/orders', orderData),

    // Get user orders - Matching backend route /api/orders/user/:userId
    getOrders: (userId) => api.get(`/orders/user/${userId}`),

    // Get single order
    getOrderById: (orderId) => api.get(`/orders/${orderId}`)
};
