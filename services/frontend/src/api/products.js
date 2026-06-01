import api from './client';

export const productAPI = {
    // Fetch all products with optional query params
    getAll: (params) => api.get('/products', { params }),

    // Fetch single product by ID
    getById: (id) => api.get(`/products/${id}`),

    // Create new product (Admin only)
    create: (data) => api.post('/products', data),

    // Update product (Admin only)
    update: (id, data) => api.put(`/products/${id}`, data),

    // Delete product (Admin only)
    delete: (id) => api.delete(`/products/${id}`),

    // Check stock
    checkStock: (id) => api.get(`/products/${id}/stock`)
};
