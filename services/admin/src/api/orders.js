import api from './client';

export const orderAPI = {
    getAll: (params) => api.get('/orders', { params }),
    getUserOrders: (userId) => api.get(`/orders/user/${userId}`),
    getById: (id) => api.get(`/orders/${id}`),
    updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status })
};
