import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEvents } from '../../store/slices/eventSlice';
import EventCard from './EventCard';
import {
    Search, Filter, Calendar, MapPin, Users,
    Grid, List, ChevronDown
} from 'lucide-react';

const EventList = () => {
    const dispatch = useDispatch();
    const { events, loading, filters, pagination } = useSelector(state => state.events);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortBy, setSortBy] = useState('date');

    useEffect(() => {
        dispatch(fetchEvents({
            search: searchTerm,
            category: categoryFilter,
            status: statusFilter,
            sortBy,
            page: pagination.page,
            limit: pagination.limit
        }));
    }, [dispatch, searchTerm, categoryFilter, statusFilter, sortBy, pagination.page]);

    const categories = [
        'Học thuật',
        'Thi đấu',
        'Văn hóa',
        'Nghệ thuật',
        'Công nghệ',
        'Khoa học'
    ];

    const statuses = [
        'Sắp diễn ra',
        'Đang diễn ra',
        'Đã kết thúc',
        'Đã hủy'
    ];

    const sortOptions = [
        { value: 'date', label: 'Ngày diễn ra' },
        { value: 'name', label: 'Tên sự kiện' },
        { value: 'participants', label: 'Số người tham gia' },
        { value: 'created', label: 'Ngày tạo' }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm sự kiện..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
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

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tất cả trạng thái</option>
                            {statuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {sortOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                            >
                                <Grid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Events Display */}
            {events.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Không có sự kiện nào</h3>
                    <p className="text-gray-500">Chưa có sự kiện nào được tạo hoặc phù hợp với bộ lọc của bạn.</p>
                </div>
            ) : (
                <div className={`${
                    viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                        : 'space-y-4'
                }`}>
                    {events.map(event => (
                        <EventCard key={event.id} event={event} viewMode={viewMode} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-lg shadow px-6 py-4">
                    <div className="text-sm text-gray-600">
                        Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} sự kiện
                    </div>
                    <div className="flex items-center space-x-2">
                        {[...Array(pagination.totalPages)].map((_, index) => (
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
            )}
        </div>
    );
};

export default EventList;