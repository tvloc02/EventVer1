// frontend/src/components/common/Sidebar.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSelector } from 'react-redux';
import {
    Calendar, Home, User, Bell, Award, Settings,
    BarChart3, Shield, Users, Mail, FileText,
    ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
    Plus, Search, Filter, HelpCircle, MessageCircle
} from 'lucide-react';

const Sidebar = ({ isCollapsed, onToggle, className = '' }) => {
    const location = useLocation();
    const { user } = useAuth();
    const { unreadCount } = useSelector(state => state.notifications);
    const [expandedGroups, setExpandedGroups] = useState(['main']);

    const isAdmin = user?.role === 'admin' || user?.role === 'moderator';
    const isOrganizer = user?.role === 'organizer' || isAdmin;

    const toggleGroup = (groupKey) => {
        setExpandedGroups(prev =>
            prev.includes(groupKey)
                ? prev.filter(key => key !== groupKey)
                : [...prev, groupKey]
        );
    };

    const isActive = (path) => {
        if (path === '/dashboard' && location.pathname === '/dashboard') return true;
        if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const navigationGroups = [
        {
            key: 'main',
            title: 'Chính',
            items: [
                {
                    name: 'Bảng điều khiển',
                    href: '/dashboard',
                    icon: Home,
                    authRequired: true
                },
                {
                    name: 'Sự kiện',
                    href: '/events',
                    icon: Calendar,
                    badge: null
                },
                {
                    name: 'Chứng nhận',
                    href: '/certificates',
                    icon: Award,
                    authRequired: true
                },
                {
                    name: 'Thông báo',
                    href: '/notifications',
                    icon: Bell,
                    authRequired: true,
                    badge: unreadCount > 0 ? unreadCount : null
                }
            ]
        },
        {
            key: 'organizer',
            title: 'Tổ chức viên',
            items: [
                {
                    name: 'Tạo sự kiện',
                    href: '/events/create',
                    icon: Plus,
                    authRequired: true,
                    roleRequired: ['organizer', 'admin', 'moderator']
                },
                {
                    name: 'Quản lý sự kiện',
                    href: '/organizer/events',
                    icon: Calendar,
                    authRequired: true,
                    roleRequired: ['organizer', 'admin', 'moderator']
                },
                {
                    name: 'Báo cáo',
                    href: '/organizer/reports',
                    icon: BarChart3,
                    authRequired: true,
                    roleRequired: ['organizer', 'admin', 'moderator']
                }
            ],
            showIf: () => isOrganizer
        },
        {
            key: 'admin',
            title: 'Quản trị',
            items: [
                {
                    name: 'Tổng quan',
                    href: '/admin',
                    icon: Shield,
                    authRequired: true,
                    roleRequired: ['admin', 'moderator']
                },
                {
                    name: 'Người dùng',
                    href: '/admin/users',
                    icon: Users,
                    authRequired: true,
                    roleRequired: ['admin', 'moderator']
                },
                {
                    name: 'Sự kiện',
                    href: '/admin/events',
                    icon: Calendar,
                    authRequired: true,
                    roleRequired: ['admin', 'moderator']
                },
                {
                    name: 'Báo cáo',
                    href: '/admin/reports',
                    icon: BarChart3,
                    authRequired: true,
                    roleRequired: ['admin', 'moderator']
                },
                {
                    name: 'Mẫu email',
                    href: '/admin/email-templates',
                    icon: Mail,
                    authRequired: true,
                    roleRequired: ['admin', 'moderator']
                },
                {
                    name: 'Nhật ký',
                    href: '/admin/audit-logs',
                    icon: FileText,
                    authRequired: true,
                    roleRequired: ['admin']
                },
                {
                    name: 'Cài đặt hệ thống',
                    href: '/admin/settings',
                    icon: Settings,
                    authRequired: true,
                    roleRequired: ['admin']
                }
            ],
            showIf: () => isAdmin
        },
        {
            key: 'personal',
            title: 'Cá nhân',
            items: [
                {
                    name: 'Hồ sơ',
                    href: '/profile',
                    icon: User,
                    authRequired: true
                },
                {
                    name: 'Cài đặt',
                    href: '/settings',
                    icon: Settings,
                    authRequired: true
                }
            ]
        },
        {
            key: 'support',
            title: 'Hỗ trợ',
            items: [
                {
                    name: 'Trợ giúp',
                    href: '/help',
                    icon: HelpCircle
                },
                {
                    name: 'Liên hệ',
                    href: '/contact',
                    icon: MessageCircle
                }
            ]
        }
    ];

    const shouldShowItem = (item) => {
        if (item.authRequired && !user) return false;
        if (item.roleRequired && !item.roleRequired.includes(user?.role)) return false;
        return true;
    };

    const shouldShowGroup = (group) => {
        if (group.showIf && !group.showIf()) return false;
        return group.items.some(item => shouldShowItem(item));
    };

    return (
        <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
            isCollapsed ? 'w-16' : 'w-64'
        } ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                {!isCollapsed && (
                    <Link to="/" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">EventHub</span>
                    </Link>
                )}

                <button
                    onClick={onToggle}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Quick Actions */}
            {!isCollapsed && user && isOrganizer && (
                <div className="p-4 border-b border-gray-200">
                    <Link
                        to="/events/create"
                        className="flex items-center justify-center space-x-2 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="font-medium">Tạo sự kiện</span>
                    </Link>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                    {navigationGroups.map((group) => {
                        if (!shouldShowGroup(group)) return null;

                        const isExpanded = expandedGroups.includes(group.key);
                        const hasVisibleItems = group.items.filter(shouldShowItem).length > 0;

                        if (!hasVisibleItems) return null;

                        return (
                            <div key={group.key} className="space-y-1">
                                {/* Group Header */}
                                {!isCollapsed && group.title && (
                                    <button
                                        onClick={() => toggleGroup(group.key)}
                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                                    >
                                        <span>{group.title}</span>
                                        {isExpanded ? (
                                            <ChevronUp className="w-3 h-3" />
                                        ) : (
                                            <ChevronDown className="w-3 h-3" />
                                        )}
                                    </button>
                                )}

                                {/* Group Items */}
                                {(isCollapsed || isExpanded) && (
                                    <div className="space-y-1">
                                        {group.items.map((item) => {
                                            if (!shouldShowItem(item)) return null;

                                            const Icon = item.icon;
                                            const itemIsActive = isActive(item.href);

                                            return (
                                                <Link
                                                    key={item.href}
                                                    to={item.href}
                                                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                                                        itemIsActive
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                                    }`}
                                                    title={isCollapsed ? item.name : undefined}
                                                >
                                                    <Icon className={`w-5 h-5 flex-shrink-0 ${
                                                        itemIsActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'
                                                    }`} />

                                                    {!isCollapsed && (
                                                        <>
                                                            <span className="flex-1">{item.name}</span>
                                                            {item.badge && (
                                                                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                                                                    {item.badge > 9 ? '9+' : item.badge}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}

                                                    {isCollapsed && item.badge && (
                                                        <div className="absolute left-8 top-1 w-3 h-3 bg-red-500 rounded-full"></div>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </nav>

            {/* User Info */}
            {!isCollapsed && user && (
                <div className="p-4 border-t border-gray-200">
                    <Link
                        to="/profile"
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <span className="text-blue-600 font-medium">
                                    {user.name?.charAt(0)?.toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {user.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {user.email}
                            </p>
                            {user.role && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                    {user.role === 'admin' ? 'Quản trị' :
                                        user.role === 'moderator' ? 'Điều hành' :
                                            user.role === 'organizer' ? 'Tổ chức' : 'Sinh viên'}
                                </span>
                            )}
                        </div>
                    </Link>
                </div>
            )}

            {/* Collapsed User Avatar */}
            {isCollapsed && user && (
                <div className="p-2 border-t border-gray-200">
                    <Link
                        to="/profile"
                        className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
                        title={`${user.name} - ${user.email}`}
                    >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                            ) : (
                                <span className="text-blue-600 font-medium text-sm">
                                    {user.name?.charAt(0)?.toUpperCase()}
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                        )}
                    </Link>
                </div>
            )}

            {/* Footer */}
            {!isCollapsed && (
                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>© 2025 EventHub</span>
                        <span>v1.0.0</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;