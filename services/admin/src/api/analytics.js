import api from './client';

export const analyticsAPI = {
    getDashboardStats: () => api.get('/analytics/dashboard'),
    getRecentEvents: () => api.get('/analytics/events'),
    getSales: (range) => api.get('/analytics/sales', { params: { range } }),
    getUsers: (range) => api.get('/analytics/users', { params: { range } })
};
