import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, deleteUser } from '../../store/slices/userSlice';
import {
    Search, Filter, Plus, Edit, Trash2,
    Eye, MoreHorizontal, UserCheck, UserX,
    Download, Upload, Mail, Shield
} from 'lucide-react';

const UserManagement = () => {
    const dispatch = useDispatch();
    const { users, loading, pagination } = useSelector(state => state.users);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [showUserForm, setShowUserForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        dispatch(fetchUsers({
            search: searchTerm,
            role: roleFilter,
            status: statusFilter,
            page: pagination.page,
            limit: pagination.limit
        }));
    }, [dispatch, searchTerm, roleFilter, statusFilter, pagination.page]);

    const roles = [
        { value: 'student', label: 'Sinh viên' },
        { value: 'teacher', label: 'Giảng viên' },
        { value: 'organizer', label: 'Tổ chức viên' },
        { value: 'admin', label: 'Quản trị viên' }
    ];

    const statuses = [
        { value: 'active', label: 'Hoạt động' },
        { value: 'inactive', label: 'Không hoạt động' },
        { value: 'suspended', label: 'Bị đình chỉ' },
        { value: 'pending', label: 'Chờ xác thực' }
    ];

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedUsers(users.map(user => user.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const handleSelectUser = (userId, checked) => {
        if (checked) {
            setSelectedUsers([...selectedUsers, userId]);
        } else {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
            try {
                await dispatch(deleteUser(userId));
            } catch (error) {
                console.error('Error deleting user:', error);
            }
        }
    };

    const handleBulkAction = async (action) => {
        if (selectedUsers.length === 0) return;

        switch (action) {
            case 'delete':
                if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedUsers.length} người dùng?`)) {
                    // Bulk delete logic
                }
                break;
            case 'activate':
                // Bulk activate logic
                break;
            case 'deactivate':
                // Bulk deactivate logic
                break;
        }
    };

    const getRoleLabel = (role) => {
        return roles.find(r => r.value === role)?.label || role;
    };

    const getStatusLabel = (status) => {
        return statuses.find(s => s.value === status)?.label || status;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'inactive':
                return 'bg-gray-100 text-gray-800';
            case 'suspended':
                return 'bg-red-100 text-red-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Quản lý người dùng</h2>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setShowUserForm(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Thêm người dùng</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <Download className="w-4 h-4" />
                            <span>Xuất dữ liệu</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                            <Upload className="w-4 h-4" />
                            <span>Nhập dữ liệu</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm người dùng..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tất cả vai trò</option>
                        {roles.map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tất cả trạng thái</option>
                        {statuses.map(status => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                    </select>
                </div>

                {/* Bulk Actions */}
                {selectedUsers.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                Đã chọn {selectedUsers.length} người dùng
              </span>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleBulkAction('activate')}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                >
                                    Kích hoạt
                                </button>
                                <button
                                    onClick={() => handleBulkAction('deactivate')}
                                    className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                                >
                                    Vô hiệu
                                </button>
                                <button
                                    onClick={() => handleBulkAction('delete')}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Người dùng
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Vai trò
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Trạng thái
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ngày tham gia
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Thao tác
                            </th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            {user.avatar ? (
                                                <img
                                                    src={user.avatar}
                                                    alt={user.name}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-blue-600 font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                            {user.studentId && (
                                                <div className="text-xs text-gray-400">{user.studentId}</div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getRoleLabel(user.role)}
                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {getStatusLabel(user.status)}
                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Xem chi tiết"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setEditingUser(user)}
                                            className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                                            title="Chỉnh sửa"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            className="p-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                                            title="Gửi email"
                                        >
                                            <Mail className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Xóa"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {users.length === 0 && !loading && (
                    <div className="text-center py-8">
                        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Không tìm thấy người dùng nào</p>
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="bg-white rounded-lg shadow px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} người dùng
                        </div>
                        <div className="flex items-center space-x-2">
                            {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => (
                                <button
                                    key={index + 1}
                                    onClick={() => dispatch(setPagination({ page: index + 1 }))}
                                    className={`px-3 py-1 border rounded ${
                                        pagination.page === index + 1
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;