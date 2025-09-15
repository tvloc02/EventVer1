import React, { useState, useEffect } from 'react';
import { eventService } from '../../services/eventService';
import {
    Users, Search, Download, CheckCircle,
    XCircle, Clock, Mail, Phone
} from 'lucide-react';

const EventAttendees = ({ eventId }) => {
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        loadAttendees();
    }, [eventId]);

    const loadAttendees = async () => {
        try {
            setLoading(true);
            const response = await eventService.getEventRegistrations(eventId);
            setAttendees(response.data || []);
        } catch (error) {
            console.error('Error loading attendees:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAttendees = attendees.filter(attendee => {
        const matchesSearch = attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            attendee.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || attendee.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusIcon = (status) => {
        switch (status) {
            case 'confirmed':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'pending':
                return <Clock className="w-5 h-5 text-yellow-600" />;
            case 'cancelled':
                return <XCircle className="w-5 h-5 text-red-600" />;
            default:
                return <Clock className="w-5 h-5 text-gray-600" />;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'confirmed':
                return 'Đã xác nhận';
            case 'pending':
                return 'Chờ xác nhận';
            case 'cancelled':
                return 'Đã hủy';
            default:
                return 'Không xác định';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header and Stats */}
            <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <Users className="w-5 h-5" />
                        <span>Danh sách người tham gia</span>
                    </h3>

                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Download className="w-4 h-4" />
                        <span>Xuất danh sách</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Tổng đăng ký</p>
                        <p className="text-2xl font-bold text-blue-600">{attendees.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Đã xác nhận</p>
                        <p className="text-2xl font-bold text-green-600">
                            {attendees.filter(a => a.status === 'confirmed').length}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Chờ xác nhận</p>
                        <p className="text-2xl font-bold text-yellow-600">
                            {attendees.filter(a => a.status === 'pending').length}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Đã hủy</p>
                        <p className="text-2xl font-bold text-red-600">
                            {attendees.filter(a => a.status === 'cancelled').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm người tham gia..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="pending">Chờ xác nhận</option>
                    <option value="cancelled">Đã hủy</option>
                </select>
            </div>

            {/* Attendees List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Người tham gia
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Liên hệ
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ngày đăng ký
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
                        {filteredAttendees.map((attendee) => (
                            <tr key={attendee.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            {attendee.avatar ? (
                                                <img
                                                    src={attendee.avatar}
                                                    alt={attendee.name}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-blue-600 font-medium">
                            {attendee.name.charAt(0).toUpperCase()}
                          </span>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{attendee.name}</div>
                                            <div className="text-sm text-gray-500">{attendee.studentId}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="space-y-1">
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Mail className="w-4 h-4 mr-2" />
                                            {attendee.email}
                                        </div>
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Phone className="w-4 h-4 mr-2" />
                                            {attendee.phone}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(attendee.registeredAt).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center space-x-2">
                                        {getStatusIcon(attendee.status)}
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(attendee.status)}`}>
                        {getStatusText(attendee.status)}
                      </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <div className="flex items-center space-x-2">
                                        {attendee.status === 'pending' && (
                                            <>
                                                <button className="text-green-600 hover:text-green-800">Xác nhận</button>
                                                <button className="text-red-600 hover:text-red-800">Từ chối</button>
                                            </>
                                        )}
                                        <button className="text-blue-600 hover:text-blue-800">Chi tiết</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {filteredAttendees.length === 0 && (
                    <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Chưa có người nào đăng ký tham gia</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventAttendees;