import api from './client';

export const couponAPI = {
    getAll: () => api.get('/coupons'),
    create: (data) => api.post('/coupons', data),
    delete: (id) => api.delete(`/coupons/${id}`),
    validate: (code, total) => api.post('/coupons/validate', { code, totalAmount: total })
};
