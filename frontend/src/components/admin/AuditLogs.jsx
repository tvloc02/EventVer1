// frontend/src/components/admin/AuditLogs.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Clock, User, Activity, Filter, Search,
    Eye, Download, Calendar, Shield
} from 'lucide-react';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [dateRange, setDateRange] = useState({
        from: '',
        to: ''
    });

    useEffect(() => {
        loadAuditLogs();
    }, [searchTerm, actionFilter, dateRange]);

    const loadAuditLogs = async () => {
        try {
            setLoading(true);
            // Mock audit logs data
            const mockLogs = [
                {
                    id: 1,
                    user: 'Nguyễn Văn A',
                    action: 'Tạo sự kiện',
                    resource: 'Hội thảo Khởi nghiệp 2025',
                    timestamp: '2025-01-15T10:30:00',
                    ip: '192.168.1.100',
                    userAgent: 'Chrome/96.0.4664.110',
                    status: 'success'
                },
                {
                    id: 2,
                    user: 'Trần Thị B',
                    action: 'Cập nhật người dùng',
                    resource: 'User ID: 123',
                    timestamp: '2025-01-15T09:15:00',
                    ip: '192.168.1.101',
                    userAgent: 'Firefox/95.0',
                    status: 'success'
                },
                {
                    id: 3,
                    user: 'Lê Văn C',
                    action: 'Xóa sự kiện',
                    resource: 'Workshop React',
                    timestamp: '2025-01-15T08:45:00',
                    ip: '192.168.1.102',
                    userAgent: 'Safari/15.1',
                    status: 'failed'
                }
            ];

            setLogs(mockLogs);
        } catch (error) {
            console.error('Error loading audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const actions = [
        'Tạo sự kiện',
        'Cập nhật sự kiện',
        'Xóa sự kiện',
        'Tạo người dùng',
        'Cập nhật người dùng',
        'Xóa người dùng',
        'Đăng nhập',
        'Đăng xuất',
        'Thay đổi quyền'
    ];

    const getActionIcon = (action) => {
        if (action.includes('Tạo')) return <Plus className="w-4 h-4 text-green-600" />;
        if (action.includes('Cập nhật')) return <Edit className="w-4 h-4 text-blue-600" />;
        if (action.includes('Xóa')) return <Trash2 className="w-4 h-4 text-red-600" />;
        if (action.includes('Đăng nhập')) return <LogIn className="w-4 h-4 text-green-600" />;
        if (action.includes('Đăng xuất')) return <LogOut className="w-4 h-4 text-orange-600" />;
        return <Activity className="w-4 h-4 text-gray-600" />;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
                return 'bg-green-100 text-green-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const exportLogs = () => {
        // Export logic
        console.log('Exporting audit logs...');
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.resource.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAction = actionFilter === '' || log.action === actionFilter;
        return matchesSearch && matchesAction;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                        <Shield className="w-5 h-5" />
                        <span>Nhật ký hoạt động</span>
                    </h2>

                    <button
                        onClick={exportLogs}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        <Download className="w-4 h-4" />
                        <span>Xuất nhật ký</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm người dùng, hành động..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tất cả hành động</option>
                        {actions.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>

                    <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">đến</span>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Thời gian
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Người dùng
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hành động
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tài nguyên
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                IP Address
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Trạng thái
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Thao tác
                            </th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-8 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                </td>
                            </tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                    Không tìm thấy nhật ký nào
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex items-center space-x-2">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-900">{log.user}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-2">
                                            {getActionIcon(log.action)}
                                            <span className="text-sm text-gray-900">{log.action}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {log.resource}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                        {log.ip}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                                                {log.status === 'success' ? 'Thành công' : 'Thất bại'}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Xem chi tiết"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;