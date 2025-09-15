import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
    Calendar, Home, User, Bell, Settings, LogOut,
    Menu, X, Search, Plus, Users, Award, BarChart3
} from 'lucide-react';
import Footer from './Footer';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/events?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    const navigation = [
        { name: 'Trang chủ', href: '/', icon: Home, current: location.pathname === '/' },
        { name: 'Dashboard', href: '/dashboard', icon: BarChart3, current: location.pathname === '/dashboard' },
        { name: 'Sự kiện', href: '/events', icon: Calendar, current: location.pathname.startsWith('/events') },
        { name: 'Chứng nhận', href: '/certificates', icon: Award, current: location.pathname === '/certificates' },
        { name: 'Thông báo', href: '/notifications', icon: Bell, current: location.pathname === '/notifications' },
    ];

    const adminNavigation = [
        { name: 'Quản lý người dùng', href: '/admin/users', icon: Users },
        { name: 'Quản lý sự kiện', href: '/admin/events', icon: Calendar },
        { name: 'Báo cáo', href: '/reports', icon: BarChart3 },
        { name: 'Cài đặt', href: '/admin/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo and Mobile menu button */}
                        <div className="flex items-center">
                            <button
                                type="button"
                                className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            >
                                {isSidebarOpen ? (
                                    <X className="h-6 w-6" />
                                ) : (
                                    <Menu className="h-6 w-6" />
                                )}
                            </button>

                            <Link to="/" className="flex items-center space-x-2 ml-2 md:ml-0">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-gray-900">EventHub</span>
                            </Link>
                        </div>

                        {/* Search bar */}
                        <div className="hidden md:block flex-1 max-w-lg mx-8">
                            <form onSubmit={handleSearch} className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm sự kiện..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </form>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center space-x-4">
                            {user && (
                                <>
                                    <Link
                                        to="/events/create"
                                        className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Tạo sự kiện</span>
                                    </Link>

                                    <Link
                                        to="/notifications"
                                        className="p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg relative"
                                    >
                                        <Bell className="w-5 h-5" />
                                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                            3
                                        </span>
                                    </Link>

                                    {/* User menu */}
                                    <div className="relative group">
                                        <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <User className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <span className="hidden sm:block text-sm font-medium text-gray-700">
                                                {user?.name}
                                            </span>
                                        </button>

                                        {/* Dropdown menu */}
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                            <div className="py-1">
                                                <Link
                                                    to="/profile"
                                                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                >
                                                    <User className="w-4 h-4" />
                                                    <span>Thông tin cá nhân</span>
                                                </Link>
                                                <Link
                                                    to="/settings"
                                                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    <span>Cài đặt</span>
                                                </Link>
                                                <hr className="my-1" />
                                                <button
                                                    onClick={handleLogout}
                                                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    <span>Đăng xuất</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {!user && (
                                <div className="flex items-center space-x-2">
                                    <Link
                                        to="/login"
                                        className="px-4 py-2 text-gray-700 hover:text-gray-900"
                                    >
                                        Đăng nhập
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Đăng ký
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile search */}
                <div className="md:hidden px-4 pb-4">
                    <form onSubmit={handleSearch} className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm kiếm sự kiện..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </form>
                </div>
            </header>

            {/* Mobile sidebar */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsSidebarOpen(false)} />
                    <div className="fixed top-0 left-0 w-64 h-full bg-white shadow-xl">
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-xl font-bold text-gray-900">EventHub</span>
                                </div>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="p-2 rounded-md text-gray-500 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <nav className="p-4 space-y-2">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                                            item.current
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}

                            {user?.role === 'admin' && (
                                <>
                                    <hr className="my-4" />
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Quản trị
                                    </div>
                                    {adminNavigation.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.name}
                                                to={item.href}
                                                onClick={() => setIsSidebarOpen(false)}
                                                className="flex items-center space-x-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <Icon className="w-5 h-5" />
                                                <span>{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </>
                            )}
                        </nav>
                    </div>
                </div>
            )}

            {/* Main content */}
            <main className="flex-1">
                {children || <Outlet />}
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default Layout;