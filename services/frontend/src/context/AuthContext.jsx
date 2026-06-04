/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const token = localStorage.getItem('accessToken');
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        try {
            // Backend /me returns { user: {...} }
            const response = await authAPI.me();
            setUser(response.data.user);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const response = await authAPI.login({ email, password });
        const { user, token } = response.data;

        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', token); // refresh token not yet implemented
        setUser(user);

        return user;
    };

    const signup = async (email, password, firstName, lastName) => {
        // Backend expects a single `name`; combine first/last from the form.
        const name = [firstName, lastName].filter(Boolean).join(' ').trim() || email;
        const response = await authAPI.signup({ email, password, name });
        const { user, token } = response.data;

        // Auto-login: persist the token from /register and set the user.
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', token);
        setUser(user);

        return user;
    };

    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                await authAPI.logout(refreshToken);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
        }
    };

    const value = {
        user,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user
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
