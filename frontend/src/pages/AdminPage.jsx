import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
    Shield, Users, Calendar, BarChart3,
    Settings, FileText, Mail, Download
} from 'lucide-react';
import UserManagement from '../components/admin/UserManagement';
import EventManagement from '../components/admin/EventManagement';
import ReportsPanel from '../components/admin/ReportsPanel';
import SystemSettings from '../components/admin/SystemSettings';

const AdminPage = () => {
    const location = useLocation();

    const adminMenuItems = [
        {
            path: '/admin/users',
            label: 'Quản lý người dùng',
            icon: Users,
            description: 'Quản lý tài khoản sinh viên và giảng viên'
        },
        {
            path: '/admin/events',
            label: 'Quản lý sự kiện',
            icon: Calendar,
            description: 'Phê duyệt và quản lý các sự kiện'
        },
        {
            path: '/admin/reports',
            label: 'Báo cáo thống kê',
            icon: BarChart3,
            description: 'Xem báo cáo và thống kê hệ thống'
        },
        {
            path: '/admin/settings',
            label: 'Cài đặt hệ thống',
            icon: Settings,
            description: 'Cấu hình và cài đặt hệ thống'
        }
    ];

    const isActiveLink = (path) => {
        return location.pathname === path || location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Shield className="w-6 h-6" />
                        <span>Quản trị hệ thống</span>
                    </h1>
                    <p className="text-gray-600 mt-1">Quản lý và cấu hình hệ thống EventHub</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Admin Navigation */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Menu quản trị</h2>
                            <nav className="space-y-2">
                                {adminMenuItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                                                isActiveLink(item.path)
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <Routes>
                            <Route path="/" element={<AdminDashboard adminMenuItems={adminMenuItems} />} />
                            <Route path="/users" element={<UserManagement />} />
                            <Route path="/events" element={<EventManagement />} />
                            <Route path="/reports" element={<ReportsPanel />} />
                            <Route path="/settings" element={<SystemSettings />} />
                        </Routes>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminDashboard = ({ adminMenuItems }) => {
    const [quickStats, setQuickStats] = useState({
        totalUsers: 1250,
        totalEvents: 45,
        pendingApprovals: 8,
        activeEvents: 3
    });

    return (
        <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Tổng người dùng</p>
                            <p className="text-2xl font-bold text-gray-900">{quickStats.totalUsers}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Tổng sự kiện</p>
                            <p className="text-2xl font-bold text-gray-900">{quickStats.totalEvents}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Chờ phê duyệt</p>
                            <p className="text-2xl font-bold text-gray-900">{quickStats.pendingApprovals}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Đang diễn ra</p>
                            <p className="text-2xl font-bold text-gray-900">{quickStats.activeEvents}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {adminMenuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow group"
                            >
                                <Icon className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
                                <h4 className="font-medium text-gray-900 mb-1">{item.label}</h4>
                                <p className="text-sm text-gray-600">{item.description}</p>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
                <div className="space-y-4">
                    {[
                        { action: 'Tạo sự kiện mới', user: 'Nguyễn Văn A', time: '2 giờ trước', type: 'event' },
                        { action: 'Phê duyệt đăng ký', user: 'Trần Thị B', time: '3 giờ trước', type: 'approval' },
                        { action: 'Cập nhật thông tin', user: 'Lê Văn C', time: '5 giờ trước', type: 'update' }
                    ].map((activity, index) => (
                        <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                                <p className="text-sm text-gray-600">bởi {activity.user} • {activity.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminPage;