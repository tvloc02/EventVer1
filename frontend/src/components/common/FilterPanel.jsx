// frontend/src/components/common/FilterPanel.jsx
import React, { useState, useEffect } from 'react';
import {
    Filter, X, Search, Calendar, MapPin, Users,
    DollarSign, Clock, Tag, ChevronDown, ChevronUp,
    RotateCcw, Check, Star, Zap
} from 'lucide-react';
import DateTimePicker from './DateTimePicker';

const FilterPanel = ({
                         filters = {},
                         onFiltersChange,
                         onReset,
                         availableFilters = [],
                         isOpen = false,
                         onToggle,
                         className = '',
                         showFilterCount = true,
                         position = 'left' // 'left' | 'right' | 'top' | 'bottom'
                     }) => {
    const [localFilters, setLocalFilters] = useState(filters);
    const [expandedSections, setExpandedSections] = useState(['basic']);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleFilterChange = (key, value) => {
        const newFilters = {
            ...localFilters,
            [key]: value
        };
        setLocalFilters(newFilters);

        if (onFiltersChange) {
            onFiltersChange(newFilters);
        }
    };

    const handleReset = () => {
        setLocalFilters({});
        if (onReset) {
            onReset();
        }
        if (onFiltersChange) {
            onFiltersChange({});
        }
    };

    const toggleSection = (section) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    const getActiveFilterCount = () => {
        return Object.values(localFilters).filter(value =>
            value !== null && value !== undefined && value !== '' &&
            (Array.isArray(value) ? value.length > 0 : true)
        ).length;
    };

    const defaultFilters = [
        {
            section: 'basic',
            title: 'Tìm kiếm cơ bản',
            filters: [
                {
                    key: 'search',
                    type: 'search',
                    label: 'Tìm kiếm',
                    placeholder: 'Tìm kiếm sự kiện...',
                    icon: Search
                },
                {
                    key: 'category',
                    type: 'select',
                    label: 'Danh mục',
                    placeholder: 'Chọn danh mục',
                    options: [
                        { value: 'workshop', label: 'Workshop' },
                        { value: 'seminar', label: 'Hội thảo' },
                        { value: 'conference', label: 'Hội nghị' },
                        { value: 'training', label: 'Đào tạo' },
                        { value: 'competition', label: 'Thi đấu' },
                        { value: 'cultural', label: 'Văn hóa' },
                        { value: 'volunteer', label: 'Tình nguyện' }
                    ],
                    icon: Tag
                },
                {
                    key: 'status',
                    type: 'select',
                    label: 'Trạng thái',
                    placeholder: 'Chọn trạng thái',
                    options: [
                        { value: 'upcoming', label: 'Sắp diễn ra' },
                        { value: 'ongoing', label: 'Đang diễn ra' },
                        { value: 'completed', label: 'Đã hoàn thành' },
                        { value: 'cancelled', label: 'Đã hủy' }
                    ],
                    icon: Clock
                }
            ]
        },
        {
            section: 'datetime',
            title: 'Thời gian',
            filters: [
                {
                    key: 'dateFrom',
                    type: 'date',
                    label: 'Từ ngày',
                    icon: Calendar
                },
                {
                    key: 'dateTo',
                    type: 'date',
                    label: 'Đến ngày',
                    icon: Calendar
                },
                {
                    key: 'timeRange',
                    type: 'select',
                    label: 'Khoảng thời gian',
                    placeholder: 'Chọn khoảng thời gian',
                    options: [
                        { value: 'today', label: 'Hôm nay' },
                        { value: 'tomorrow', label: 'Ngày mai' },
                        { value: 'this_week', label: 'Tuần này' },
                        { value: 'next_week', label: 'Tuần sau' },
                        { value: 'this_month', label: 'Tháng này' },
                        { value: 'next_month', label: 'Tháng sau' }
                    ],
                    icon: Clock
                }
            ]
        },
        {
            section: 'details',
            title: 'Chi tiết',
            filters: [
                {
                    key: 'location',
                    type: 'search',
                    label: 'Địa điểm',
                    placeholder: 'Tìm theo địa điểm...',
                    icon: MapPin
                },
                {
                    key: 'organizer',
                    type: 'search',
                    label: 'Tổ chức',
                    placeholder: 'Tìm theo tổ chức...',
                    icon: Users
                },
                {
                    key: 'participantRange',
                    type: 'range',
                    label: 'Số lượng tham gia',
                    min: 0,
                    max: 1000,
                    step: 10,
                    icon: Users
                },
                {
                    key: 'fee',
                    type: 'select',
                    label: 'Phí tham gia',
                    placeholder: 'Chọn loại phí',
                    options: [
                        { value: 'free', label: 'Miễn phí' },
                        { value: 'paid', label: 'Có phí' }
                    ],
                    icon: DollarSign
                }
            ]
        },
        {
            section: 'advanced',
            title: 'Nâng cao',
            filters: [
                {
                    key: 'tags',
                    type: 'multiselect',
                    label: 'Thẻ',
                    placeholder: 'Chọn thẻ',
                    options: [
                        { value: 'online', label: 'Trực tuyến' },
                        { value: 'offline', label: 'Trực tiếp' },
                        { value: 'hybrid', label: 'Kết hợp' },
                        { value: 'certification', label: 'Có chứng chỉ' },
                        { value: 'beginner', label: 'Người mới' },
                        { value: 'advanced', label: 'Nâng cao' },
                        { value: 'english', label: 'Tiếng Anh' },
                        { value: 'vietnamese', label: 'Tiếng Việt' }
                    ],
                    icon: Tag
                },
                {
                    key: 'rating',
                    type: 'rating',
                    label: 'Đánh giá tối thiểu',
                    icon: Star
                },
                {
                    key: 'featured',
                    type: 'checkbox',
                    label: 'Sự kiện nổi bật',
                    icon: Zap
                }
            ]
        }
    ];

    const filtersToUse = availableFilters.length > 0 ? availableFilters : defaultFilters;

    const renderFilterInput = (filter) => {
        const value = localFilters[filter.key];

        switch (filter.type) {
            case 'search':
                return (
                    <div className="relative">
                        {filter.icon && (
                            <filter.icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        )}
                        <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                            placeholder={filter.placeholder}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                filter.icon ? 'pl-10' : ''
                            }`}
                        />
                    </div>
                );

            case 'select':
                return (
                    <select
                        value={value || ''}
                        onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">{filter.placeholder}</option>
                        {filter.options?.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            case 'multiselect':
                const selectedValues = Array.isArray(value) ? value : [];
                return (
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                            {selectedValues.map(val => {
                                const option = filter.options?.find(opt => opt.value === val);
                                return (
                                    <span
                                        key={val}
                                        className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                                    >
                                        {option?.label || val}
                                        <button
                                            onClick={() => {
                                                const newValue = selectedValues.filter(v => v !== val);
                                                handleFilterChange(filter.key, newValue);
                                            }}
                                            className="ml-1 text-blue-600 hover:text-blue-800"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                        <select
                            onChange={(e) => {
                                if (e.target.value && !selectedValues.includes(e.target.value)) {
                                    handleFilterChange(filter.key, [...selectedValues, e.target.value]);
                                    e.target.value = '';
                                }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{filter.placeholder}</option>
                            {filter.options?.filter(opt => !selectedValues.includes(opt.value)).map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                );

            case 'date':
                return (
                    <DateTimePicker
                        value={value}
                        onChange={(date) => handleFilterChange(filter.key, date)}
                        showTime={false}
                        placeholder={filter.placeholder}
                    />
                );

            case 'range':
                const rangeValue = value || { min: filter.min, max: filter.max };
                return (
                    <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                            <input
                                type="number"
                                value={rangeValue.min || filter.min}
                                onChange={(e) => handleFilterChange(filter.key, {
                                    ...rangeValue,
                                    min: parseInt(e.target.value)
                                })}
                                min={filter.min}
                                max={filter.max}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <span className="text-gray-500">đến</span>
                            <input
                                type="number"
                                value={rangeValue.max || filter.max}
                                onChange={(e) => handleFilterChange(filter.key, {
                                    ...rangeValue,
                                    max: parseInt(e.target.value)
                                })}
                                min={filter.min}
                                max={filter.max}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        <input
                            type="range"
                            min={filter.min}
                            max={filter.max}
                            step={filter.step || 1}
                            value={rangeValue.min || filter.min}
                            onChange={(e) => handleFilterChange(filter.key, {
                                ...rangeValue,
                                min: parseInt(e.target.value)
                            })}
                            className="w-full"
                        />
                    </div>
                );

            case 'rating':
                return (
                    <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map(rating => (
                            <button
                                key={rating}
                                onClick={() => handleFilterChange(filter.key, rating)}
                                className={`p-1 rounded ${
                                    (value || 0) >= rating
                                        ? 'text-yellow-500'
                                        : 'text-gray-300 hover:text-yellow-400'
                                }`}
                            >
                                <Star className="w-5 h-5 fill-current" />
                            </button>
                        ))}
                        {value && (
                            <button
                                onClick={() => handleFilterChange(filter.key, null)}
                                className="ml-2 text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                );

            case 'checkbox':
                return (
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => handleFilterChange(filter.key, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{filter.label}</span>
                    </label>
                );

            default:
                return null;
        }
    };

    const activeFilterCount = getActiveFilterCount();

    return (
        <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium text-gray-900">Bộ lọc</h3>
                    {showFilterCount && activeFilterCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {activeFilterCount}
                        </span>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    {activeFilterCount > 0 && (
                        <button
                            onClick={handleReset}
                            className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                            title="Đặt lại bộ lọc"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Đặt lại</span>
                        </button>
                    )}

                    {onToggle && (
                        <button
                            onClick={onToggle}
                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        >
                            {isOpen ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Content */}
            {(isOpen !== false) && (
                <div className="p-4 space-y-6">
                    {filtersToUse.map((section) => {
                        const isExpanded = expandedSections.includes(section.section);

                        return (
                            <div key={section.section} className="space-y-3">
                                {section.title && (
                                    <button
                                        onClick={() => toggleSection(section.section)}
                                        className="flex items-center justify-between w-full text-left"
                                    >
                                        <h4 className="text-sm font-medium text-gray-900">
                                            {section.title}
                                        </h4>
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4 text-gray-500" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                        )}
                                    </button>
                                )}

                                {isExpanded && (
                                    <div className="space-y-4">
                                        {section.filters.map((filter) => (
                                            <div key={filter.key} className="space-y-2">
                                                {filter.type !== 'checkbox' && (
                                                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                        {filter.icon && (
                                                            <filter.icon className="w-4 h-4 text-gray-400" />
                                                        )}
                                                        <span>{filter.label}</span>
                                                    </label>
                                                )}
                                                {renderFilterInput(filter)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
                <div className="border-t border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                            Đang áp dụng {activeFilterCount} bộ lọc
                        </span>
                        <div className="flex items-center space-x-2">
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-600">Đã áp dụng</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterPanel;