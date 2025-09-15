import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from '../store/slices/notificationSlice';
import {
    Bell, Check, CheckCheck, Trash2,
    Calendar, Award, Users, Settings
} from 'lucide-react';

const NotificationsPage = () => {
    const dispatch = useDispatch();
    const { notifications, unreadCount, loading } = useSelector(state => state.notifications);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'event':
                return <Calendar className="w-5 h-5 text-blue-600" />;
            case 'certificate':
                return <Award className="w-5 h-5 text-green-600" />;
            case 'registration':
                return <Users className="w-5 h-5 text-purple-600" />;
            default:
                return <Bell className="w-5 h-5 text-gray-600" />;
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'event':
                return 'bg-blue-100';
            case 'certificate':
                return 'bg-green-100';
            case 'registration':
                return 'bg-purple-100';
            default:
                return 'bg-gray-100';
        }
    };

    const handleMarkAsRead = (id) => {
        dispatch(markAsRead(id));
    };

    const handleMarkAllAsRead = () => {
        dispatch(markAllAsRead());
    };

    const handleDelete = (id) => {
        dispatch(deleteNotification(id));
    };

    const filteredNotifications = notifications.filter(notification => {
        if (filter === 'unread') return !notification.read;
        if (filter === 'read') return notification.read;
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Bell className="w-6 h-6" />
                        <span>Thông báo</span>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
                        )}
                    </h1>
                    <p className="text-gray-600 mt-1">Quản lý tất cả thông báo của bạn</p>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg ${
                                    filter === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                Tất cả ({notifications.length})
                            </button>
                            <button
                                onClick={() => setFilter('unread')}
                                className={`px-4 py-2 rounded-lg ${
                                    filter === 'unread' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                Chưa đọc ({unreadCount})
                            </button>
                            <button
                                onClick={() => setFilter('read')}
                                className={`px-4 py-2 rounded-lg ${
                                    filter === 'read' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                Đã đọc ({notifications.length - unreadCount})
                            </button>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <CheckCheck className="w-4 h-4" />
                                <span>Đánh dấu tất cả đã đọc</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Notifications List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-12 text-center">
                            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Không có thông báo</h3>
                            <p className="text-gray-500">Bạn chưa có thông báo nào.</p>
                        </div>
                    ) : (
                        filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`bg-white rounded-lg shadow p-6 transition-all ${
                                    !notification.read ? 'border-l-4 border-blue-500' : ''
                                }`}
                            >
                                <div className="flex items-start space-x-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                                        {getNotificationIcon(notification.type)}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className={`text-lg font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                                    {notification.title}
                                                </h3>
                                                <p className="text-gray-600 mt-1">{notification.message}</p>
                                                <p className="text-sm text-gray-500 mt-2">
                                                    {new Date(notification.createdAt).toLocaleString('vi-VN')}
                                                </p>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                {!notification.read && (
                                                    <button
                                                        onClick={() => handleMarkAsRead(notification.id)}
                                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                        title="Đánh dấu đã đọc"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(notification.id)}
                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                    title="Xóa thông báo"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {notification.actionUrl && (
                                            <div className="mt-4">
                                                <a
                                                    href={notification.actionUrl}
                                                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                                                >
                                                    <span>Xem chi tiết</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;