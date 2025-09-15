import React, { useState } from 'react';
import {
    Settings, User, Bell, Shield, Eye,
    Save, X, Mail, Phone, Lock
} from 'lucide-react';

const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [settings, setSettings] = useState({
        profile: {
            name: 'Nguyễn Văn A',
            email: 'student@university.edu.vn',
            phone: '0901234567',
            studentId: 'SV001234',
            faculty: 'Công nghệ thông tin'
        },
        notifications: {
            emailNotifications: true,
            pushNotifications: true,
            smsNotifications: false,
            eventReminders: true,
            registrationUpdates: true,
            certificateNotifications: true
        },
        privacy: {
            profileVisibility: 'public',
            showEmail: false,
            showPhone: false,
            allowMessages: true
        },
        security: {
            twoFactorEnabled: false,
            loginAlerts: true,
            sessionTimeout: 60
        }
    });

    const tabs = [
        { key: 'profile', label: 'Thông tin cá nhân', icon: User },
        { key: 'notifications', label: 'Thông báo', icon: Bell },
        { key: 'privacy', label: 'Quyền riêng tư', icon: Eye },
        { key: 'security', label: 'Bảo mật', icon: Shield }
    ];

    const handleSettingChange = (category, key, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
    };

    const handleSave = () => {
        // Save settings logic
        console.log('Saving settings:', settings);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Settings className="w-6 h-6" />
                        <span>Cài đặt</span>
                    </h1>
                    <p className="text-gray-600 mt-1">Quản lý thông tin tài khoản và tùy chỉnh hệ thống</p>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="flex">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 ${
                                            activeTab === tab.key
                                                ? 'border-blue-500 text-blue-600 bg-blue-50'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-900">Thông tin cá nhân</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
                                        <input
                                            type="text"
                                            value={settings.profile.name}
                                            onChange={(e) => handleSettingChange('profile', 'name', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={settings.profile.email}
                                            onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                                        <input
                                            type="tel"
                                            value={settings.profile.phone}
                                            onChange={(e) => handleSettingChange('profile', 'phone', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Mã sinh viên</label>
                                        <input
                                            type="text"
                                            value={settings.profile.studentId}
                                            disabled
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Khoa</label>
                                        <select
                                            value={settings.profile.faculty}
                                            onChange={(e) => handleSettingChange('profile', 'faculty', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="cntt">Công nghệ thông tin</option>
                                            <option value="kinh-te">Kinh tế</option>
                                            <option value="ngoai-ngu">Ngoại ngữ</option>
                                            <option value="su-pham">Sư phạm</option>
                                            <option value="y-duoc">Y dược</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-900">Cài đặt thông báo</h3>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Thông báo qua Email</h4>
                                            <p className="text-sm text-gray-600">Nhận thông báo qua email</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifications.emailNotifications}
                                                onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Thông báo đẩy</h4>
                                            <p className="text-sm text-gray-600">Nhận thông báo đẩy trên trình duyệt</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifications.pushNotifications}
                                                onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Nhắc nhở sự kiện</h4>
                                            <p className="text-sm text-gray-600">Nhận nhắc nhở trước khi sự kiện diễn ra</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifications.eventReminders}
                                                onChange={(e) => handleSettingChange('notifications', 'eventReminders', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Cập nhật đăng ký</h4>
                                            <p className="text-sm text-gray-600">Thông báo về trạng thái đăng ký sự kiện</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifications.registrationUpdates}
                                                onChange={(e) => handleSettingChange('notifications', 'registrationUpdates', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-900">Cài đặt quyền riêng tư</h3>

                                <div className="space-y-4">
                                    <div className="p-4 border border-gray-200 rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-2">Hiển thị hồ sơ</h4>
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    name="profileVisibility"
                                                    value="public"
                                                    checked={settings.privacy.profileVisibility === 'public'}
                                                    onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">Công khai - Mọi người có thể xem</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    name="profileVisibility"
                                                    value="private"
                                                    checked={settings.privacy.profileVisibility === 'private'}
                                                    onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">Riêng tư - Chỉ bạn có thể xem</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Hiển thị email</h4>
                                            <p className="text-sm text-gray-600">Cho phép người khác xem email của bạn</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.privacy.showEmail}
                                                onChange={(e) => handleSettingChange('privacy', 'showEmail', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Hiển thị số điện thoại</h4>
                                            <p className="text-sm text-gray-600">Cho phép người khác xem số điện thoại</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.privacy.showPhone}
                                                onChange={(e) => handleSettingChange('privacy', 'showPhone', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-900">Cài đặt bảo mật</h3>

                                <div className="space-y-4">
                                    <div className="p-4 border border-gray-200 rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-4">Đổi mật khẩu</h4>
                                        <div className="space-y-3">
                                            <input
                                                type="password"
                                                placeholder="Mật khẩu hiện tại"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <input
                                                type="password"
                                                placeholder="Mật khẩu mới"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <input
                                                type="password"
                                                placeholder="Xác nhận mật khẩu mới"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                                Cập nhật mật khẩu
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Xác thực 2 bước</h4>
                                            <p className="text-sm text-gray-600">Tăng cường bảo mật cho tài khoản</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.security.twoFactorEnabled}
                                                onChange={(e) => handleSettingChange('security', 'twoFactorEnabled', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Cảnh báo đăng nhập</h4>
                                            <p className="text-sm text-gray-600">Thông báo khi có đăng nhập từ thiết bị mới</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.security.loginAlerts}
                                                onChange={(e) => handleSettingChange('security', 'loginAlerts', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="p-4 border border-gray-200 rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-2">Thời gian hết hạn phiên</h4>
                                        <select
                                            value={settings.security.sessionTimeout}
                                            onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value={30}>30 phút</option>
                                            <option value={60}>1 giờ</option>
                                            <option value={120}>2 giờ</option>
                                            <option value={480}>8 giờ</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-end space-x-4">
                            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                <X className="w-4 h-4" />
                                <span>Hủy</span>
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Save className="w-4 h-4" />
                                <span>Lưu thay đổi</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;