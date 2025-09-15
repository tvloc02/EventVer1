import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
    User, Mail, Phone, Calendar, Edit,
    Save, X, Upload, Camera
} from 'lucide-react';

const ProfilePage = () => {
    const { user, updateProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        studentId: user?.studentId || '',
        faculty: user?.faculty || '',
        yearOfStudy: user?.yearOfStudy || '',
        bio: user?.bio || ''
    });

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            await updateProfile(formData);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
            studentId: user?.studentId || '',
            faculty: user?.faculty || '',
            yearOfStudy: user?.yearOfStudy || '',
            bio: user?.bio || ''
        });
        setIsEditing(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Profile Header */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                    <div className="h-32 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                    <div className="relative px-6 pb-6">
                        <div className="flex items-end space-x-6 -mt-16">
                            <div className="relative">
                                <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg overflow-hidden">
                                    {user?.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                                            <User className="w-16 h-16 text-blue-600" />
                                        </div>
                                    )}
                                </div>
                                <button className="absolute bottom-2 right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700">
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
                                        <p className="text-gray-600">{user?.email}</p>
                                        <p className="text-sm text-blue-600">{user?.studentId} - {user?.faculty}</p>
                                    </div>

                                    <button
                                        onClick={() => setIsEditing(!isEditing)}
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        <Edit className="w-4 h-4" />
                                        <span>{isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Thông tin cá nhân</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Họ và tên
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{user?.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{user?.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Số điện thoại
                            </label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{user?.phone}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mã sinh viên
                            </label>
                            <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{user?.studentId}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Khoa
                            </label>
                            {isEditing ? (
                                <select
                                    name="faculty"
                                    value={formData.faculty}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Chọn khoa</option>
                                    <option value="cntt">Công nghệ thông tin</option>
                                    <option value="kinh-te">Kinh tế</option>
                                    <option value="ngoai-ngu">Ngoại ngữ</option>
                                    <option value="su-pham">Sư phạm</option>
                                    <option value="y-duoc">Y dược</option>
                                </select>
                            ) : (
                                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{user?.faculty}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Năm học
                            </label>
                            {isEditing ? (
                                <select
                                    name="yearOfStudy"
                                    value={formData.yearOfStudy}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Chọn năm học</option>
                                    <option value="1">Năm 1</option>
                                    <option value="2">Năm 2</option>
                                    <option value="3">Năm 3</option>
                                    <option value="4">Năm 4</option>
                                </select>
                            ) : (
                                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                                    {user?.yearOfStudy ? `Năm ${user.yearOfStudy}` : 'Chưa cập nhật'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Giới thiệu bản thân
                        </label>
                        {isEditing ? (
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                rows={4}
                                placeholder="Viết vài dòng giới thiệu về bản thân..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        ) : (
                            <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg min-h-[100px]">
                                {user?.bio || 'Chưa có thông tin giới thiệu'}
                            </p>
                        )}
                    </div>

                    {isEditing && (
                        <div className="flex items-center space-x-4 mt-6 pt-6 border-t border-gray-200">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                <span>{loading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex items-center space-x-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                <X className="w-4 h-4" />
                                <span>Hủy</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Activity Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-900">12</h3>
                        <p className="text-gray-600">Sự kiện đã tham gia</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <Award className="w-12 h-12 text-green-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-900">8</h3>
                        <p className="text-gray-600">Chứng nhận đã nhận</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <Users className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-900">3</h3>
                        <p className="text-gray-600">Sự kiện đã tổ chức</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;