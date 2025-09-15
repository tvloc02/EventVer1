import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Calendar, MapPin, Users, Clock, Star,
    Share2, Bookmark, ArrowLeft, Edit, Trash2,
    CheckCircle, XCircle, UserPlus, Award,
    Phone, Mail
} from 'lucide-react';

const EventDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [isRegistered, setIsRegistered] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEventDetail();
    }, [id]);

    const loadEventDetail = () => {
        // Mock event detail data
        const mockEvent = {
            id: parseInt(id),
            title: 'Hội thảo Khởi nghiệp 2025',
            category: 'Học thuật',
            date: '2025-03-15',
            time: '08:00',
            endTime: '17:00',
            location: 'Hội trường A, Tòa nhà chính',
            participants: 150,
            maxParticipants: 200,
            status: 'Sắp diễn ra',
            organizer: 'Khoa Công nghệ thông tin',
            description: `Hội thảo Khởi nghiệp 2025 là sự kiện quan trọng nhằm trang bị kiến thức và kỹ năng khởi nghiệp cho sinh viên. 

Sự kiện sẽ có sự tham gia của các chuyên gia hàng đầu trong lĩnh vực khởi nghiệp, các doanh nhân thành đạt và đại diện từ các quỹ đầu tư.

Đây là cơ hội tuyệt vời để sinh viên học hỏi kinh nghiệm, mở rộng mạng lưới quan hệ và tìm hiểu về các cơ hội khởi nghiệp.`,
            fee: 0,
            image: null,
            requirements: [
                'Sinh viên đang theo học tại trường',
                'Đăng ký trước thời hạn quy định',
                'Mang theo thẻ sinh viên',
                'Trang phục lịch sự'
            ],
            benefits: [
                'Nhận chứng nhận tham gia',
                'Tích điểm rèn luyện',
                'Networking với doanh nghiệp',
                'Tài liệu học tập miễn phí'
            ],
            schedule: [
                {
                    time: '08:00 - 08:30',
                    title: 'Đăng ký và tiếp đón',
                    description: 'Check-in, nhận tài liệu và networking coffee',
                    speaker: null
                },
                {
                    time: '08:30 - 09:00',
                    title: 'Khai mạc hội thảo',
                    description: 'Phát biểu khai mạc và giới thiệu chương trình',
                    speaker: 'ThS. Nguyễn Văn A - Trưởng khoa CNTT'
                },
                {
                    time: '09:00 - 10:30',
                    title: 'Xu hướng khởi nghiệp 2025',
                    description: 'Phân tích thị trường và cơ hội khởi nghiệp trong năm 2025',
                    speaker: 'TS. Trần Thị B - CEO VietTech Ventures'
                },
                {
                    time: '10:30 - 10:45',
                    title: 'Giải lao',
                    description: 'Coffee break và networking',
                    speaker: null
                }
            ],
            materials: [
                {
                    name: 'Tài liệu hội thảo - Khởi nghiệp 2025.pdf',
                    size: '2.5 MB',
                    downloadUrl: '#'
                },
                {
                    name: 'Slide thuyết trình - Xu hướng công nghệ.pptx',
                    size: '5.2 MB',
                    downloadUrl: '#'
                }
            ],
            attendees: [
                {
                    id: 1,
                    name: 'Nguyễn Văn An',
                    studentId: 'SV001',
                    email: 'an.nguyen@student.edu.vn',
                    phone: '0901234567',
                    registeredAt: '2025-02-15T10:00:00',
                    status: 'confirmed'
                },
                {
                    id: 2,
                    name: 'Trần Thị Bình',
                    studentId: 'SV002',
                    email: 'binh.tran@student.edu.vn',
                    phone: '0907654321',
                    registeredAt: '2025-02-16T14:30:00',
                    status: 'confirmed'
                }
            ]
        };

        setEvent(mockEvent);
        setLoading(false);
    };

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
        <div className="min-h-screen bg-gray-50">
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
                                <div className="flex flex-wrap items-center space-x-4 text-white/90">
                                    <div className="flex items-center space-x-1">
                                        <Calendar className="w-5 h-5" />
                                        <span>{new Date(event.date).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Clock className="w-5 h-5" />
                                        <span>{event.time} - {event.endTime}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <MapPin className="w-5 h-5" />
                                        <span>{event.location}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Users className="w-5 h-5" />
                                        <span>{event.participants}/{event.maxParticipants}</span>
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
                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    {event.category}
                  </span>
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
                                                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                                        {event.description}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Yêu cầu tham gia</h3>
                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                    {event.requirements.map((req, index) => (
                                                        <li key={index}>{req}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Lợi ích khi tham gia</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {event.benefits.map((benefit, index) => (
                                                        <div key={index} className="flex items-center space-x-2">
                                                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                                            <span className="text-gray-700">{benefit}</span>
                                                        </div>
                                                    ))}
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
                                                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                                style={{ width: `${(event.participants / event.maxParticipants) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Phí tham gia</p>
                                                        <p className="font-medium">
                                                            {event.fee === 0 ? 'Miễn phí' : `${event.fee.toLocaleString('vi-VN')} VND`}
                                                        </p>
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
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                                    <h3 className="font-semibold text-blue-800 mb-2">Đăng ký tham gia</h3>
                                                    <p className="text-sm text-blue-600 mb-4">
                                                        Hãy đăng ký ngay để không bỏ lỡ cơ hội tham gia sự kiện thú vị này
                                                    </p>
                                                    <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                                        <UserPlus className="w-4 h-4 inline mr-2" />
                                                        Đăng ký ngay
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'attendees' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Danh sách người tham gia ({event.attendees.length})
                                            </h3>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {event.attendees.map((attendee) => (
                                                <div key={attendee.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {attendee.name.charAt(0).toUpperCase()}
                              </span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-gray-900">{attendee.name}</h4>
                                                            <p className="text-sm text-gray-600">{attendee.studentId}</p>
                                                            <div className="flex items-center space-x-4 mt-1">
                                                                <div className="flex items-center space-x-1">
                                                                    <Mail className="w-3 h-3 text-gray-400" />
                                                                    <span className="text-xs text-gray-500">{attendee.email}</span>
                                                                </div>
                                                                <div className="flex items-center space-x-1">
                                                                    <Phone className="w-3 h-3 text-gray-400" />
                                                                    <span className="text-xs text-gray-500">{attendee.phone}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Đã xác nhận
                              </span>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {new Date(attendee.registeredAt).toLocaleDateString('vi-VN')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'schedule' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Lịch trình sự kiện</h3>
                                        <div className="space-y-4">
                                            {event.schedule.map((item, index) => (
                                                <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                                                    <div className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium min-w-fit">
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
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'materials' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Tài liệu sự kiện</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {event.materials.map((material, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                            <FileText className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-gray-900">{material.name}</h4>
                                                            <p className="text-sm text-gray-600">{material.size}</p>
                                                        </div>
                                                        <button className="text-blue-600 hover:text-blue-800 p-2">
                                                            <Download className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetailPage;