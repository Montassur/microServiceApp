import api from './client';

export const cartAPI = {
    // Get user's cart
    getCart: (userId) => api.get(`/cart/${userId}`),

    // Add item to cart
    // Add item to cart
    addItem: (userId, data) => api.post('/cart', { userId, ...data }),

    // Clear cart (optional)
    clearCart: (userId) => api.delete(`/cart/${userId}`)
};
