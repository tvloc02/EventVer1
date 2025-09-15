// frontend/src/components/admin/EventManagement.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEvents, updateEvent, deleteEvent } from '../../store/slices/eventSlice';
import {
    Calendar, Search, Filter, Eye, Edit, Trash2,
    CheckCircle, XCircle, Clock, Users, MapPin,
    Download, Upload, Plus, MoreHorizontal
} from 'lucide-react';

const EventManagement = () => {
    const dispatch = useDispatch();
    const { events, loading, pagination } = useSelector(state => state.events);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [selectedEvents, setSelectedEvents] = useState([]);

    useEffect(() => {
        dispatch(fetchEvents({
            search: searchTerm,
            status: statusFilter,
            category: categoryFilter,
            page: pagination.page,
            limit: pagination.limit
        }));
    }, [dispatch, searchTerm, statusFilter, categoryFilter, pagination.page]);

    const statuses = [
        { value: 'draft', label: 'Bản nháp', color: 'bg-gray-100 text-gray-800' },
        { value: 'pending', label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'approved', label: 'Đã duyệt', color: 'bg-green-100 text-green-800' },
        { value: 'rejected', label: 'Từ chối', color: 'bg-red-100 text-red-800' },
        { value: 'published', label: 'Đã xuất bản', color: 'bg-blue-100 text-blue-800' },
        { value: 'cancelled', label: 'Đã hủy', color: 'bg-red-100 text-red-800' },
        { value: 'completed', label: 'Hoàn thành', color: 'bg-green-100 text-green-800' }
    ];

    const categories = [
        'Học thuật',
        'Hội thảo',
        'Workshop',
        'Thi đấu',
        'Văn hóa',
        'Nghệ thuật',
        'Công nghệ',
        'Tình nguyện'
    ];

    const getStatusLabel = (status) => {
        return statuses.find(s => s.value === status)?.label || status;
    };

    const getStatusColor = (status) => {
        return statuses.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
            case 'published':
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'rejected':
            case 'cancelled':
                return <XCircle className="w-4 h-4 text-red-600" />;
            case 'pending':
                return <Clock className="w-4 h-4 text-yellow-600" />;
            default:
                return <Clock className="w-4 h-4 text-gray-600" />;
        }
    };

    const handleStatusUpdate = async (eventId, newStatus) => {
        try {
            await dispatch(updateEvent({ id: eventId, eventData: { status: newStatus } }));
        } catch (error) {
            console.error('Error updating event status:', error);
        }
    };

    const handleDelete = async (eventId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) {
            try {
                await dispatch(deleteEvent(eventId));
            } catch (error) {
                console.error('Error deleting event:', error);
            }
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedEvents(events.map(event => event.id));
        } else {
            setSelectedEvents([]);
        }
    };

    const handleSelectEvent = (eventId, checked) => {
        if (checked) {
            setSelectedEvents([...selectedEvents, eventId]);
        } else {
            setSelectedEvents(selectedEvents.filter(id => id !== eventId));
        }
    };

    const handleBulkAction = async (action) => {
        if (selectedEvents.length === 0) return;

        switch (action) {
            case 'approve':
                for (const eventId of selectedEvents) {
                    await handleStatusUpdate(eventId, 'approved');
                }
                break;
            case 'reject':
                for (const eventId of selectedEvents) {
                    await handleStatusUpdate(eventId, 'rejected');
                }
                break;
            case 'publish':
                for (const eventId of selectedEvents) {
                    await handleStatusUpdate(eventId, 'published');
                }
                break;
            case 'delete':
                if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedEvents.length} sự kiện?`)) {
                    for (const eventId of selectedEvents) {
                        await handleDelete(eventId);
                    }
                }
                break;
        }
        setSelectedEvents([]);
    };

    const mockEvents = [
        {
            id: 1,
            title: 'Hội thảo Khởi nghiệp 2025',
            category: 'Hội thảo',
            organizer: 'Khoa CNTT',
            date: '2025-03-15',
            time: '08:00',
            location: 'Hội trường A',
            participants: 150,
            maxParticipants: 200,
            status: 'pending',
            createdAt: '2025-01-10'
        },
        {
            id: 2,
            title: 'Workshop React JS',
            category: 'Workshop',
            organizer: 'CLB Lập trình',
            date: '2025-03-20',
            time: '14:00',
            location: 'Phòng Lab 1',
            participants: 45,
            maxParticipants: 50,
            status: 'approved',
            createdAt: '2025-01-12'
        },
        {
            id: 3,
            title: 'Ngày hội Văn hóa',
            category: 'Văn hóa',
            organizer: 'Ban Văn hóa',
            date: '2025-03-25',
            time: '09:00',
            location: 'Sân trường',
            participants: 500,
            maxParticipants: 1000,
            status: 'published',
            createdAt: '2025-01-08'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                        <Calendar className="w-5 h-5" />
                        <span>Quản lý sự kiện</span>
                    </h2>

                    <div className="flex items-center space-x-3">
                        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <Download className="w-4 h-4" />
                            <span>Xuất dữ liệu</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                            <Upload className="w-4 h-4" />
                            <span>Nhập dữ liệu</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <Plus className="w-4 h-4" />
                            <span>Tạo sự kiện</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sự kiện..."
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
                        <option value="">Tất cả trạng thái</option>
                        {statuses.map(status => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                    </select>

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tất cả danh mục</option>
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>

                {/* Bulk Actions */}
                {selectedEvents.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-700">
                                Đã chọn {selectedEvents.length} sự kiện
                            </span>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleBulkAction('approve')}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                >
                                    Duyệt
                                </button>
                                <button
                                    onClick={() => handleBulkAction('reject')}
                                    className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                                >
                                    Từ chối
                                </button>
                                <button
                                    onClick={() => handleBulkAction('publish')}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                    Xuất bản
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

            {/* Events Table */}
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
                                Sự kiện
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Thời gian & Địa điểm
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Người tham gia
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
                                <td colSpan="6" className="px-6 py-8 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                </td>
                            </tr>
                        ) : mockEvents.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center">
                                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">Không có sự kiện nào</p>
                                </td>
                            </tr>
                        ) : (
                            mockEvents.map((event) => (
                                <tr key={event.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedEvents.includes(event.id)}
                                            onChange={(e) => handleSelectEvent(event.id, e.target.checked)}
                                            className="rounded border-gray-300"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 line-clamp-2">
                                                {event.title}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {event.category} • {event.organizer}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Tạo: {new Date(event.createdAt).toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            <div className="flex items-center space-x-1 mb-1">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span>{new Date(event.date).toLocaleDateString('vi-VN')}</span>
                                                <Clock className="w-4 h-4 text-gray-400 ml-2" />
                                                <span>{event.time}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">{event.location}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-2">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-900">
                                                    {event.participants}/{event.maxParticipants}
                                                </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                            <div
                                                className="bg-blue-600 h-1.5 rounded-full"
                                                style={{ width: `${(event.participants / event.maxParticipants) * 100}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-2">
                                            {getStatusIcon(event.status)}
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                                    {getStatusLabel(event.status)}
                                                </span>
                                        </div>
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
                                                className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                                                title="Chỉnh sửa"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(event.id)}
                                                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Xóa"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="relative">
                                                <button
                                                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded"
                                                    title="Thêm"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="bg-white rounded-lg shadow px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} sự kiện
                        </div>
                        <div className="flex items-center space-x-2">
                            {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => (
                                <button
                                    key={index + 1}
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

export default EventManagement;