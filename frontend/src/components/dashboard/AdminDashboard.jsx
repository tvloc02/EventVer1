import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Users, Award, TrendingUp,
    Plus, Bell, BookOpen, Clock,
    CheckCircle, ArrowUpRight, Eye
} from 'lucide-react';

const DashboardPage = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalEvents: 10,
        totalTeachers: 50,
        totalStudents: 378,
        totalRewards: 0
    });

    const [recentEvents, setRecentEvents] = useState([
        {
            id: 1,
            title: 'Hội thảo Công nghệ Thông tin',
            date: '2025-03-15',
            participants: 45,
            status: 'Sắp diễn ra'
        },
        {
            id: 2,
            title: 'Cuộc thi Khoa học Kỹ thuật',
            date: '2025-03-20',
            participants: 32,
            status: 'Đang đăng ký'
        },
        {
            id: 3,
            title: 'Workshop React & Node.js',
            date: '2025-03-25',
            participants: 28,
            status: 'Sắp diễn ra'
        }
    ]);

    const [notifications, setNotifications] = useState([
        {
            id: 1,
            title: 'Sự kiện mới được tạo',
            message: 'Hội thảo Công nghệ Thông tin đã được thêm vào hệ thống',
            time: '2 giờ trước',
            read: false
        },
        {
            id: 2,
            title: 'Có sinh viên mới đăng ký',
            message: '5 sinh viên mới đã đăng ký tham gia sự kiện',
            time: '4 giờ trước',
            read: false
        },
        {
            id: 3,
            title: 'Chứng nhận đã được cấp',
            message: 'Đã cấp 15 chứng nhận cho sự kiện vừa kết thúc',
            time: '1 ngày trước',
            read: true
        }
    ]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Chào mừng đến với hệ thống
                                <span className="text-blue-600 ml-2">🎉 SMAS 4.0 🎉</span>
                            </h1>
                            <p className="text-gray-600 mt-1">Cập nhật 1 giờ trước</p>
                        </div>
                        <button
                            onClick={() => navigate('/events/create')}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Tạo sự kiện mới</span>
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Lớp</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Giáo viên</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalTeachers}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <Users className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Học sinh</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <Award className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Gói cước</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalRewards}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Teaching Staff Statistics Chart */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Giảng dạy giáo viên</h3>
                            <div className="flex space-x-2">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-teal-600 rounded-full mr-2"></div>
                                    <span className="text-sm text-gray-600">Số tiết định mức/Tuần</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                                    <span className="text-sm text-gray-600">Số tiết đã phân công</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Tổ bộ môn</span>
                                <span className="text-sm text-gray-600">Tổ hành chính</span>
                            </div>

                            {/* Bar Chart Placeholder */}
                            <div className="h-48 flex items-end justify-between space-x-2">
                                {[28, 21, 14, 7, 0].map((height, index) => (
                                    <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                                        <div className="w-full flex flex-col space-y-1">
                                            <div
                                                className="w-full bg-teal-600 rounded-t"
                                                style={{ height: `${height * 4}px` }}
                                            ></div>
                                            <div
                                                className="w-full bg-yellow-500 rounded-b"
                                                style={{ height: `${(height * 0.7) * 4}px` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-gray-600">{index + 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Teacher Statistics by Years */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Số lượng giáo viên tuyển mới các năm</h3>
                            <div className="bg-blue-100 px-3 py-1 rounded-full">
                                <span className="text-sm text-blue-800">2019-2025</span>
                            </div>
                        </div>

                        {/* Line Chart Placeholder */}
                        <div className="h-48 flex items-end justify-between space-x-4 relative">
                            <div className="absolute inset-0 flex items-center">
                                <svg className="w-full h-full" viewBox="0 0 300 150">
                                    <polyline
                                        points="0,100 60,80 120,60 180,70 240,50 300,40"
                                        stroke="#3b82f6"
                                        strokeWidth="3"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    {[0, 60, 120, 180, 240, 300].map((x, index) => (
                                        <circle
                                            key={index}
                                            cx={x}
                                            cy={[100, 80, 60, 70, 50, 40][index]}
                                            r="4"
                                            fill="#3b82f6"
                                        />
                                    ))}
                                </svg>
                            </div>
                            <div className="flex justify-between w-full mt-12">
                                {['2019', '2020', '2022', '2023', '2025'].map((year) => (
                                    <span key={year} className="text-xs text-gray-600">{year}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Student Gender Statistics */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Học sinh nam nữ</h3>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">2025-2026</span>
                            <div className="bg-green-100 px-2 py-1 rounded flex items-center">
                                <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                                <span className="text-sm text-green-800">436</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center">
                        {/* Pie Chart */}
                        <div className="relative w-48 h-48">
                            <svg className="w-48 h-48 transform -rotate-90">
                                <circle
                                    cx="96"
                                    cy="96"
                                    r="80"
                                    stroke="#ef4444"
                                    strokeWidth="40"
                                    fill="none"
                                    strokeDasharray="188 314"
                                    strokeDashoffset="0"
                                />
                                <circle
                                    cx="96"
                                    cy="96"
                                    r="80"
                                    stroke="#10b981"
                                    strokeWidth="40"
                                    fill="none"
                                    strokeDasharray="126 314"
                                    strokeDashoffset="-188"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="text-center">
                                    <div className="flex items-center space-x-4 text-sm">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                                            <span>46.7%</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                                            <span>53.3%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Events */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Sự kiện gần đây</h3>
                                <button
                                    onClick={() => navigate('/events')}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    Xem tất cả
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {recentEvents.map((event) => (
                                    <div key={event.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-900">{event.title}</h4>
                                                <p className="text-sm text-gray-600">{event.date} • {event.participants} người tham gia</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            event.status === 'Sắp diễn ra'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-green-100 text-green-800'
                                        }`}>
                                            {event.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                    <Bell className="w-5 h-5 mr-2" />
                                    Thông báo
                                </h3>
                                <button
                                    onClick={() => navigate('/notifications')}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    Xem tất cả
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {notifications.map((notification) => (
                                    <div key={notification.id} className={`p-4 rounded-lg border ${
                                        notification.read ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'
                                    }`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900">{notification.title}</h4>
                                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                                <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;