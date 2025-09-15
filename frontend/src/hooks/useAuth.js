import { useState, useContext, createContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                // Verify token and get user info
                const userData = await verifyToken(token);
                setUser(userData);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Auth initialization failed:', error);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        try {
            setLoading(true);
            // Mock login API call
            const response = await mockLogin(credentials);

            if (response.success) {
                const { user: userData, token } = response.data;
                localStorage.setItem('token', token);
                setUser(userData);
                setIsAuthenticated(true);
                return response;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const register = async (userData) => {
        try {
            setLoading(true);
            // Mock register API call
            const response = await mockRegister(userData);

            if (response.success) {
                return response;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
    };

    const updateProfile = async (profileData) => {
        try {
            setLoading(true);
            // Mock update profile API call
            const response = await mockUpdateProfile(profileData);

            if (response.success) {
                setUser(response.data);
                return response;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const hasRole = (role) => {
        return user?.role === role || user?.roles?.includes(role);
    };

    const hasPermission = (permission) => {
        return user?.permissions?.includes(permission);
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
        hasRole,
        hasPermission,
        initializeAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Mock API functions
const mockLogin = async (credentials) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (credentials.email === 'admin@smas.edu.vn' && credentials.password === 'admin123') {
                resolve({
                    success: true,
                    data: {
                        user: {
                            id: 1,
                            name: 'Quản trị viên',
                            email: 'admin@smas.edu.vn',
                            role: 'admin',
                            avatar: null,
                            permissions: ['manage_events', 'manage_users', 'view_reports']
                        },
                        token: 'mock-token-admin'
                    }
                });
            } else if (credentials.email === 'teacher@smas.edu.vn' && credentials.password === 'teacher123') {
                resolve({
                    success: true,
                    data: {
                        user: {
                            id: 2,
                            name: 'Giáo viên Nguyễn Văn A',
                            email: 'teacher@smas.edu.vn',
                            role: 'teacher',
                            avatar: null,
                            permissions: ['manage_events', 'view_students']
                        },
                        token: 'mock-token-teacher'
                    }
                });
            } else if (credentials.email === 'student@smas.edu.vn' && credentials.password === 'student123') {
                resolve({
                    success: true,
                    data: {
                        user: {
                            id: 3,
                            name: 'Học sinh Trần Thị B',
                            email: 'student@smas.edu.vn',
                            role: 'student',
                            studentId: 'HS001',
                            avatar: null,
                            permissions: ['view_events', 'register_events']
                        },
                        token: 'mock-token-student'
                    }
                });
            } else {
                resolve({
                    success: false,
                    message: 'Email hoặc mật khẩu không đúng'
                });
            }
        }, 1000);
    });
};

const mockRegister = async (userData) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.'
            });
        }, 1000);
    });
};

const mockUpdateProfile = async (profileData) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                data: {
                    id: 1,
                    ...profileData,
                    updatedAt: new Date().toISOString()
                }
            });
        }, 1000);
    });
};

const verifyToken = async (token) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (token.startsWith('mock-token-')) {
                const role = token.split('-')[2];
                const users = {
                    admin: {
                        id: 1,
                        name: 'Quản trị viên',
                        email: 'admin@smas.edu.vn',
                        role: 'admin',
                        avatar: null,
                        permissions: ['manage_events', 'manage_users', 'view_reports']
                    },
                    teacher: {
                        id: 2,
                        name: 'Giáo viên Nguyễn Văn A',
                        email: 'teacher@smas.edu.vn',
                        role: 'teacher',
                        avatar: null,
                        permissions: ['manage_events', 'view_students']
                    },
                    student: {
                        id: 3,
                        name: 'Học sinh Trần Thị B',
                        email: 'student@smas.edu.vn',
                        role: 'student',
                        studentId: 'HS001',
                        avatar: null,
                        permissions: ['view_events', 'register_events']
                    }
                };
                resolve(users[role]);
            } else {
                reject(new Error('Invalid token'));
            }
        }, 500);
    });
};