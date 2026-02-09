import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
// socket import will be done via require in useEffect to avoid cycle or just top level if safe.
// services/socket.js depends on nothing usually.
import socket from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { id, name, coins }
    const [loading, setLoading] = useState(true);

    // Load user from token on startup
    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('/user/profile');
                    setUser({
                        ...res.data.user,
                        coins: res.data.user.coins
                    });
                } catch (err) {
                    console.error("Auth Load Error:", err);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    // Listen for real-time balance/stats updates
    useEffect(() => {
        const handleStatsUpdate = (data) => {
            console.log("Stats Update Received:", data);
            setUser(prev => {
                if (!prev) return prev;
                return { ...prev, ...data };
            });
        };

        // socket is a singleton in services/socket.js
        // const socket = require('../services/socket').default; // Removed: use top-level import
        // socket.on('stats_update', handleStatsUpdate);
        // socket.on('balance_update', handleStatsUpdate);

        // Actually, just using 'socket' directly.
        socket.on('stats_update', handleStatsUpdate);
        socket.on('balance_update', handleStatsUpdate);

        return () => {
            socket.off('stats_update', handleStatsUpdate);
            socket.off('balance_update', handleStatsUpdate);
        };
    }, []);

    const login = async (identifier, password) => {
        const res = await api.post('/auth/login', { identifier, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const register = async (userData) => {
        const res = await api.post('/auth/register', userData);
        return res.data;
    };

    const verifyOtp = async (email, emailOtp, phoneOtp) => {
        const res = await api.post('/auth/verify-otp', { email, emailOtp, phoneOtp });
        return res.data;
    };

    const resendOtp = async (email) => {
        const res = await api.post('/api/auth/resend-otp', { email });
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const refreshProfile = async () => {
        if (!localStorage.getItem('token')) return;
        try {
            const res = await api.get('/user/profile');
            setUser(prev => ({ ...prev, ...res.data.user, coins: res.data.user.coins }));
        } catch (err) {
            console.error("Profile Refresh Error:", err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, verifyOtp, resendOtp, logout, refreshProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
