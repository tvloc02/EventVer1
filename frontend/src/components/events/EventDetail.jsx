import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEventById } from '../../store/slices/eventSlice';
import {
    Calendar, MapPin, Users, Clock, Star,
    Share2, Bookmark, ArrowLeft, Edit, Trash2,
    CheckCircle, XCircle, UserPlus
} from 'lucide-react';
import EventRegistration from './EventRegistration';
import EventAttendees from './EventAttendees';

const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { currentEvent: event, loading } = useSelector(state => state.events);
    const { user } = useSelector(state => state.auth);
    const [activeTab, setActiveTab] = useState('overview');
    const [isRegistered, setIsRegistered] = useState(false);

    useEffect(() => {
        if (id) {
            dispatch(fetchEventById(id));
        }
    }, [dispatch, id]);

    const tabs = [
        { key: 'overview', label: 'Tổng quan' },
        { key: 'attendees', label: 'Người tham gia' },
        { key: 'schedule', label: 'Lịch trình' },
        { key: 'materials', label: 'Tài liệu' }
    ];

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Sắp diễn ra':
                return <Clock className="w-5 h-5" />;
            case 'Đang diễn ra':
                return <CheckCircle className="w-5 h-5" />;
            case 'Đã kết thúc':
                return <XCircle className="w-5 h-5" />;
            default:
                return <Clock className="w-5 h-5" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Sắp diễn ra':
                return 'text-blue-600 bg-blue-100';
            case 'Đang diễn ra':
                return 'text-green-600 bg-green-100';
            case 'Đã kết thúc':
                return 'text-gray-600 bg-gray-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Không tìm thấy sự kiện</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Quay lại</span>
                </button>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="relative h-64 bg-gradient-to-br from-blue-100 to-blue-200">
                        {event.image ? (
                            <img
                                src={event.image}
                                alt={event.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <Calendar className="w-24 h-24 text-blue-600" />
                            </div>
                        )}

                        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                        <div className="absolute bottom-6 left-6 right-6 text-white">
                            <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
                            <div className="flex items-center space-x-4 text-white/90">
                                <div className="flex items-center space-x-1">
                                    <Calendar className="w-5 h-5" />
                                    <span>{new Date(event.date).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Clock className="w-5 h-5" />
                                    <span>{event.time}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <MapPin className="w-5 h-5" />
                                    <span>{event.location}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                <div className={`flex items-center space-x-2 px-3 py-2 rounded-full ${getStatusColor(event.status)}`}>
                                    {getStatusIcon(event.status)}
                                    <span className="font-medium">{event.status}</span>
                                </div>
                                <span className="text-gray-600">Tổ chức bởi: {event.organizer}</span>
                            </div>

                            <div className="flex items-center space-x-3">
                                <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                    <Share2 className="w-5 h-5" />
                                </button>
                                <button className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg">
                                    <Star className="w-5 h-5" />
                                </button>
                                <button className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg">
                                    <Edit className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-gray-200 mb-6">
                            <nav className="flex space-x-8">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === tab.key
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-96">
                            {activeTab === 'overview' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Mô tả sự kiện</h3>
                                            <div className="prose max-w-none">
                                                <p className="text-gray-700 leading-relaxed">
                                                    {event.description || 'Chưa có mô tả cho sự kiện này.'}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Yêu cầu tham gia</h3>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                <li>Sinh viên đang theo học tại trường</li>
                                                <li>Đăng ký trước thời hạn quy định</li>
                                                <li>Tuân thủ quy định của sự kiện</li>
                                            </ul>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Lợi ích khi tham gia</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex items-center space-x-2">
                                                    <Award className="w-5 h-5 text-blue-600" />
                                                    <span className="text-gray-700">Nhận chứng nhận tham gia</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Star className="w-5 h-5 text-yellow-500" />
                                                    <span className="text-gray-700">Tích điểm rèn luyện</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Users className="w-5 h-5 text-green-600" />
                                                    <span className="text-gray-700">Kết nối bạn bè</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Calendar className="w-5 h-5 text-purple-600" />
                                                    <span className="text-gray-700">Kinh nghiệm thực tế</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-gray-50 rounded-lg p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin chi tiết</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-sm text-gray-600">Thời gian</p>
                                                    <p className="font-medium">{new Date(event.date).toLocaleDateString('vi-VN')} - {event.time}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Địa điểm</p>
                                                    <p className="font-medium">{event.location}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Số lượng</p>
                                                    <p className="font-medium">{event.participants}/{event.maxParticipants} người</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Danh mục</p>
                                                    <p className="font-medium">{event.category}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Tổ chức</p>
                                                    <p className="font-medium">{event.organizer}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {event.status === 'Sắp diễn ra' && (
                                            <EventRegistration
                                                event={event}
                                                isRegistered={isRegistered}
                                                onRegistrationChange={setIsRegistered}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'attendees' && (
                                <EventAttendees eventId={event.id} />
                            )}

                            {activeTab === 'schedule' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-gray-900">Lịch trình sự kiện</h3>
                                    <div className="space-y-4">
                                        {event.schedule?.map((item, index) => (
                                            <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                                                <div className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium">
                                                    {item.time}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                                                    <p className="text-gray-600 mt-1">{item.description}</p>
                                                    {item.speaker && (
                                                        <p className="text-sm text-blue-600 mt-2">Diễn giả: {item.speaker}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )) || (
                                            <p className="text-gray-500">Chưa có lịch trình chi tiết</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'materials' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-gray-900">Tài liệu sự kiện</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {event.materials?.map((material, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <Calendar className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-900">{material.name}</h4>
                                                        <p className="text-sm text-gray-600">{material.size}</p>
                                                    </div>
                                                    <button className="text-blue-600 hover:text-blue-800">
                                                        Tải xuống
                                                    </button>
                                                </div>
                                            </div>
                                        )) || (
                                            <p className="text-gray-500 col-span-2">Chưa có tài liệu</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetail;