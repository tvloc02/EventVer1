import React, { useState, useEffect } from 'react';
import {
    BarChart3, Download, Calendar, Users,
    Award, TrendingUp, FileText, Filter,
    DateRange, PieChart, LineChart
} from 'lucide-react';

const ReportsPage = () => {
    const [selectedReport, setSelectedReport] = useState('events');
    const [dateRange, setDateRange] = useState({
        from: '2025-01-01',
        to: '2025-12-31'
    });
    const [reportData, setReportData] = useState({});
    const [loading, setLoading] = useState(false);

    const reportTypes = [
        {
            key: 'events',
            label: 'Báo cáo sự kiện',
            icon: Calendar,
            description: 'Thống kê về các sự kiện đã tổ chức'
        },
        {
            key: 'users',
            label: 'Báo cáo người dùng',
            icon: Users,
            description: 'Thống kê về người dùng và tham gia'
        },
        {
            key: 'certificates',
            label: 'Báo cáo chứng nhận',
            icon: Award,
            description: 'Thống kê về chứng nhận đã cấp'
        },
        {
            key: 'financial',
            label: 'Báo cáo tài chính',
            icon: TrendingUp,
            description: 'Thống kê doanh thu và chi phí'
        }
    ];

    useEffect(() => {
        loadReportData();
    }, [selectedReport, dateRange]);

    const loadReportData = () => {
        setLoading(true);

        // Mock report data
        const mockData = {
            events: {
                summary: {
                    total: 45,
                    completed: 32,
                    ongoing: 3,
                    upcoming: 10,
                    cancelled: 0
                },
                byCategory: [
                    { name: 'Học thuật', value: 15, color: '#3b82f6' },
                    { name: 'Văn hóa', value: 12, color: '#10b981' },
                    { name: 'Thể thao', value: 8, color: '#f59e0b' },
                    { name: 'Công nghệ', value: 10, color: '#8b5cf6' }
                ],
                monthly: [
                    { month: 'T1', events: 5, participants: 150 },
                    { month: 'T2', events: 8, participants: 280 },
                    { month: 'T3', events: 6, participants: 200 },
                    { month: 'T4', events: 7, participants: 220 },
                    { month: 'T5', events: 4, participants: 120 },
                    { month: 'T6', events: 9, participants: 320 }
                ]
            },
            users: {
                summary: {
                    total: 1250,
                    active: 1180,
                    inactive: 70,
                    newThisMonth: 45
                },
                byRole: [
                    { name: 'Sinh viên', value: 1100, color: '#3b82f6' },
                    { name: 'Giảng viên', value: 120, color: '#10b981' },
                    { name: 'Quản trị', value: 30, color: '#f59e0b' }
                ],
                growth: [
                    { month: 'T1', users: 1000 },
                    { month: 'T2', users: 1050 },
                    { month: 'T3', users: 1120 },
                    { month: 'T4', users: 1180 },
                    { month: 'T5', users: 1200 },
                    { month: 'T6', users: 1250 }
                ]
            }
        };

        setTimeout(() => {
            setReportData(mockData);
            setLoading(false);
        }, 1000);
    };

    const exportReport = () => {
        // Export logic
        console.log('Exporting report:', selectedReport, dateRange);
    };

    const EventsReport = () => {
        const data = reportData.events;
        if (!data) return null;

        return (
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Tổng sự kiện</p>
                                <p className="text-2xl font-bold text-blue-600">{data.summary.total}</p>
                            </div>
                            <Calendar className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Đã hoàn thành</p>
                                <p className="text-2xl font-bold text-green-600">{data.summary.completed}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Đang diễn ra</p>
                                <p className="text-2xl font-bold text-orange-600">{data.summary.ongoing}</p>
                            </div>
                            <Clock className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Sắp diễn ra</p>
                                <p className="text-2xl font-bold text-purple-600">{data.summary.upcoming}</p>
                            </div>
                            <Calendar className="w-8 h-8 text-purple-600" />
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sự kiện theo danh mục</h3>
                        <div className="h-64 flex items-center justify-center">
                            <div className="relative w-48 h-48">
                                <svg className="w-48 h-48 transform -rotate-90">
                                    {data.byCategory.map((item, index) => {
                                        const total = data.byCategory.reduce((sum, cat) => sum + cat.value, 0);
                                        const percentage = (item.value / total) * 100;
                                        const strokeDasharray = `${percentage * 3.14} 314`;
                                        const strokeDashoffset = index === 0 ? 0 :
                                            -data.byCategory.slice(0, index).reduce((sum, cat) => sum + (cat.value / total) * 314, 0);

                                        return (
                                            <circle
                                                key={index}
                                                cx="96"
                                                cy="96"
                                                r="50"
                                                stroke={item.color}
                                                strokeWidth="20"
                                                fill="none"
                                                strokeDasharray={strokeDasharray}
                                                strokeDashoffset={strokeDashoffset}
                                            />
                                        );
                                    })}
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-900">{data.summary.total}</div>
                                        <div className="text-sm text-gray-500">Sự kiện</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            {data.byCategory.map((item, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Xu hướng theo tháng</h3>
                        <div className="h-64 flex items-end justify-between space-x-2">
                            {data.monthly.map((item, index) => (
                                <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                                    <div
                                        className="w-full bg-blue-600 rounded-t"
                                        style={{ height: `${(item.events / 9) * 180}px` }}
                                    ></div>
                                    <span className="text-xs text-gray-600">{item.month}</span>
                                    <span className="text-xs text-gray-500">{item.events}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const UsersReport = () => {
        const data = reportData.users;
        if (!data) return null;

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Tổng người dùng</p>
                                <p className="text-2xl font-bold text-blue-600">{data.summary.total}</p>
                            </div>
                            <Users className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Đang hoạt động</p>
                                <p className="text-2xl font-bold text-green-600">{data.summary.active}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Không hoạt động</p>
                                <p className="text-2xl font-bold text-red-600">{data.summary.inactive}</p>
                            </div>
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Mới tháng này</p>
                                <p className="text-2xl font-bold text-purple-600">{data.summary.newThisMonth}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố theo vai trò</h3>
                        <div className="space-y-3">
                            {data.byRole.map((role, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }}></div>
                                        <span className="text-sm text-gray-700">{role.name}</span>
                                    </div>
                                    <span className="font-medium text-gray-900">{role.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tăng trưởng người dùng</h3>
                        <div className="h-48 flex items-end justify-between space-x-2">
                            {data.growth.map((item, index) => (
                                <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                                    <div
                                        className="w-full bg-green-600 rounded-t"
                                        style={{ height: `${(item.users / 1250) * 160}px` }}
                                    ></div>
                                    <span className="text-xs text-gray-600">{item.month}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <BarChart3 className="w-6 h-6" />
                        <span>Báo cáo thống kê</span>
                    </h1>
                    <p className="text-gray-600 mt-1">Xem báo cáo chi tiết về hoạt động hệ thống</p>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <DateRange className="w-5 h-5 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700">Thời gian:</span>
                            </div>
                            <input
                                type="date"
                                value={dateRange.from}
                                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                            <span className="text-gray-500">đến</span>
                            <input
                                type="date"
                                value={dateRange.to}
                                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        <button
                            onClick={exportReport}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            <Download className="w-4 h-4" />
                            <span>Xuất báo cáo</span>
                        </button>
                    </div>
                </div>

                {/* Report Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {reportTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                            <button
                                key={type.key}
                                onClick={() => setSelectedReport(type.key)}
                                className={`p-6 rounded-lg border-2 transition-all ${
                                    selectedReport === type.key
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                <Icon className={`w-8 h-8 mx-auto mb-3 ${
                                    selectedReport === type.key ? 'text-blue-600' : 'text-gray-600'
                                }`} />
                                <h3 className={`font-medium mb-2 ${
                                    selectedReport === type.key ? 'text-blue-900' : 'text-gray-900'
                                }`}>
                                    {type.label}
                                </h3>
                                <p className="text-sm text-gray-600">{type.description}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Report Content */}
                <div className="min-h-96">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {selectedReport === 'events' && <EventsReport />}
                            {selectedReport === 'users' && <UsersReport />}
                            {selectedReport === 'certificates' && (
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Báo cáo chứng nhận</h3>
                                    <p className="text-gray-600">Đang phát triển...</p>
                                </div>
                            )}
                            {selectedReport === 'financial' && (
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Báo cáo tài chính</h3>
                                    <p className="text-gray-600">Đang phát triển...</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;