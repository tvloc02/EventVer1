// frontend/src/components/c/DateTimePicker.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const DateTimePicker = ({
                            value,
                            onChange,
                            placeholder = "Chọn ngày và giờ",
                            format = "DD/MM/YYYY HH:mm",
                            showTime = true,
                            minDate,
                            maxDate,
                            disabled = false,
                            required = false,
                            error,
                            className = ""
                        }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [timeValue, setTimeValue] = useState(value ? formatTime(new Date(value)) : '00:00');
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (value) {
            const date = new Date(value);
            setSelectedDate(date);
            setCurrentMonth(date);
            setTimeValue(formatTime(date));
        }
    }, [value]);

    const formatTime = (date) => {
        return date.toTimeString().slice(0, 5);
    };

    const formatDate = (date) => {
        if (!date) return '';

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const time = showTime ? ` ${formatTime(date)}` : '';

        return `${day}/${month}/${year}${time}`;
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add empty cells for previous month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const handleDateSelect = (date) => {
        if (!date) return;

        let newDate = new Date(date);

        if (showTime && timeValue) {
            const [hours, minutes] = timeValue.split(':');
            newDate.setHours(parseInt(hours), parseInt(minutes));
        }

        setSelectedDate(newDate);

        if (onChange) {
            onChange(newDate);
        }

        if (!showTime) {
            setIsOpen(false);
        }
    };

    const handleTimeChange = (newTime) => {
        setTimeValue(newTime);

        if (selectedDate) {
            const [hours, minutes] = newTime.split(':');
            const newDate = new Date(selectedDate);
            newDate.setHours(parseInt(hours), parseInt(minutes));

            setSelectedDate(newDate);

            if (onChange) {
                onChange(newDate);
            }
        }
    };

    const handleApply = () => {
        if (selectedDate && showTime) {
            const [hours, minutes] = timeValue.split(':');
            const finalDate = new Date(selectedDate);
            finalDate.setHours(parseInt(hours), parseInt(minutes));

            if (onChange) {
                onChange(finalDate);
            }
        }
        setIsOpen(false);
    };

    const isDateDisabled = (date) => {
        if (!date) return false;
        if (minDate && date < new Date(minDate)) return true;
        if (maxDate && date > new Date(maxDate)) return true;
        return false;
    };

    const isToday = (date) => {
        if (!date) return false;
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date) => {
        if (!date || !selectedDate) return false;
        return date.toDateString() === selectedDate.toDateString();
    };

    const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    const days = getDaysInMonth(currentMonth);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 border rounded-lg cursor-pointer flex items-center justify-between ${
                    disabled
                        ? 'bg-gray-100 cursor-not-allowed text-gray-500'
                        : 'bg-white hover:border-gray-400'
                } ${
                    error
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                } ${
                    isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''
                }`}
            >
                <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className={selectedDate ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedDate ? formatDate(selectedDate) : placeholder}
                    </span>
                </div>
                {showTime && <Clock className="w-4 h-4 text-gray-400" />}
            </div>

            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}

            {isOpen && (
                <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <h3 className="font-medium text-gray-900">
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </h3>

                        <button
                            type="button"
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Day Names */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {dayNames.map(day => (
                            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1 mb-4">
                        {days.map((date, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleDateSelect(date)}
                                disabled={!date || isDateDisabled(date)}
                                className={`
                                    h-8 w-8 text-sm rounded-full flex items-center justify-center
                                    ${!date ? 'invisible' : ''}
                                    ${isDateDisabled(date) ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-100'}
                                    ${isSelected(date) ? 'bg-blue-600 text-white' : ''}
                                    ${isToday(date) && !isSelected(date) ? 'bg-blue-100 text-blue-600 font-medium' : ''}
                                    ${date && !isSelected(date) && !isToday(date) ? 'text-gray-900' : ''}
                                `}
                            >
                                {date && date.getDate()}
                            </button>
                        ))}
                    </div>

                    {/* Time Picker */}
                    {showTime && (
                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700">Thời gian</span>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="time"
                                    value={timeValue}
                                    onChange={(e) => handleTimeChange(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Hủy
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setSelectedDate(null);
                                setTimeValue('00:00');
                                if (onChange) onChange(null);
                                setIsOpen(false);
                            }}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Xóa
                        </button>

                        {showTime ? (
                            <button
                                type="button"
                                onClick={handleApply}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                                Áp dụng
                            </button>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateTimePicker;