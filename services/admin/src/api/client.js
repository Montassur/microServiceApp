import axios from 'axios';

const API_URL = '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminAccessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('adminRefreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${API_URL}/auth/refresh`, {
                        refreshToken
                    });

                    const { accessToken } = response.data.data;
                    localStorage.setItem('adminAccessToken', accessToken);

                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, logout user
                localStorage.removeItem('adminAccessToken');
                localStorage.removeItem('adminRefreshToken');
                window.location.href = '/admin/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
    me: () => api.get('/auth/me')
};

// Admin API
export const adminAPI = {
    getStats: () => api.get('/analytics/dashboard'),
    getUsers: (params) => api.get('/users', { params }),
    getUserById: (id) => api.get(`/users/${id}`),
    createUser: (data) => api.post('/users', data),
    updateUser: (id, data) => api.put(`/users/${id}`, data),
    deleteUser: (id) => api.delete(`/users/${id}`),
    toggleUserStatus: (id) => api.put(`/users/${id}/status`)
};

export default api;
