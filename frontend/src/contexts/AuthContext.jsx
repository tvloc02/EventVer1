import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Kiểm tra auth khi component mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    // TODO: Gọi API để verify token và lấy user info
                    // const userData = await authService.getCurrentUser();

                    // Mock data for development
                    const mockUser = {
                        id: 1,
                        name: 'Nguyễn Văn A',
                        email: 'user@example.com',
                        role: 'STUDENT',
                        avatar: null
                    };

                    setUser(mockUser);
                    setIsAuthenticated(true);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (credentials) => {
        try {
            setLoading(true);

            // TODO: Replace with actual API call
            // const response = await authService.login(credentials);

            // Mock login for development
            const mockResponse = {
                token: 'mock-jwt-token',
                user: {
                    id: 1,
                    name: 'Nguyễn Văn A',
                    email: credentials.email,
                    role: 'STUDENT',
                    avatar: null
                }
            };

            localStorage.setItem('token', mockResponse.token);
            setUser(mockResponse.user);
            setIsAuthenticated(true);

            message.success('Đăng nhập thành công!');
            return mockResponse;

        } catch (error) {
            console.error('Login error:', error);
            message.error('Đăng nhập thất bại!');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const register = async (userData) => {
        try {
            setLoading(true);

            // TODO: Replace with actual API call
            // const response = await authService.register(userData);

            message.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
            return { success: true };

        } catch (error) {
            console.error('Register error:', error);
            message.error('Đăng ký thất bại!');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        message.success('Đăng xuất thành công!');
    };

    const updateProfile = async (userData) => {
        try {
            // TODO: Replace with actual API call
            // const response = await authService.updateProfile(userData);

            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            message.success('Cập nhật thông tin thành công!');
            return { user: updatedUser };
        } catch (error) {
            console.error('Update profile error:', error);
            message.error('Cập nhật thông tin thất bại!');
            throw error;
        }
    };

    const forgotPassword = async (email) => {
        try {
            // TODO: Replace with actual API call
            // await authService.forgotPassword(email);

            message.success('Email đặt lại mật khẩu đã được gửi!');
        } catch (error) {
            console.error('Forgot password error:', error);
            message.error('Gửi email thất bại!');
            throw error;
        }
    };

    const resetPassword = async (token, newPassword) => {
        try {
            // TODO: Replace with actual API call
            // await authService.resetPassword(token, newPassword);

            message.success('Đặt lại mật khẩu thành công!');
        } catch (error) {
            console.error('Reset password error:', error);
            message.error('Đặt lại mật khẩu thất bại!');
            throw error;
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
        forgotPassword,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};