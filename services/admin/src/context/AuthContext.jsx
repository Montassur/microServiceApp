import { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const token = localStorage.getItem('adminAccessToken');
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        try {
            const response = await authAPI.me();
            const userData = response.data.data;

            // Verify user is admin
            if (userData.role !== 'admin') {
                throw new Error('Access denied: Admin role required');
            }

            setUser(userData);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            localStorage.removeItem('adminAccessToken');
            localStorage.removeItem('adminRefreshToken');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const response = await authAPI.login({ email, password });
        const { user, token } = response.data;
        const accessToken = token;
        const refreshToken = token; // Temporary fallback

        // Verify user is admin
        if (user.role !== 'admin') {
            throw new Error('Access denied: Admin role required');
        }

        localStorage.setItem('adminAccessToken', accessToken);
        localStorage.setItem('adminRefreshToken', refreshToken);
        setUser(user);

        return user;
    };

    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem('adminRefreshToken');
            if (refreshToken) {
                await authAPI.logout(refreshToken);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('adminAccessToken');
            localStorage.removeItem('adminRefreshToken');
            setUser(null);
        }
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user && user.role === 'admin'
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
