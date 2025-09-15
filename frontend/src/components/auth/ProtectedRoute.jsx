import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Spin } from 'antd';

const ProtectedRoute = ({ children, requiredRole = null }) => {
    const { isAuthenticated, loading, user } = useAuth();
    const location = useLocation();

    // Hiển thị loading khi đang kiểm tra auth
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column'
            }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: '#666' }}>
                    Đang kiểm tra quyền truy cập...
                </div>
            </div>
        );
    }

    // Chưa đăng nhập - redirect về login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Kiểm tra quyền truy cập theo role (nếu có yêu cầu)
    if (requiredRole && user?.role !== requiredRole) {
        // Redirect về trang phù hợp với role của user
        const roleBasedRedirect = {
            'ADMIN': '/admin/dashboard',
            'ORGANIZER': '/organizer/dashboard',
            'STUDENT': '/dashboard'
        };

        const redirectPath = roleBasedRedirect[user?.role] || '/';
        return <Navigate to={redirectPath} replace />;
    }

    return children;
};

// HOC để bảo vệ route dành cho Admin
export const AdminRoute = ({ children }) => (
    <ProtectedRoute requiredRole="ADMIN">
        {children}
    </ProtectedRoute>
);

// HOC để bảo vệ route dành cho Organizer
export const OrganizerRoute = ({ children }) => (
    <ProtectedRoute requiredRole="ORGANIZER">
        {children}
    </ProtectedRoute>
);

// HOC để bảo vệ route dành cho Student
export const StudentRoute = ({ children }) => (
    <ProtectedRoute requiredRole="STUDENT">
        {children}
    </ProtectedRoute>
);

export default ProtectedRoute;