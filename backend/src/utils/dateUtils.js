const moment = require('moment-timezone');

// Set default timezone to Vietnam
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
moment.tz.setDefault(DEFAULT_TIMEZONE);

class DateUtils {
    /**
     * Get current date in Vietnam timezone
     * @returns {moment.Moment}
     */
    static now() {
        return moment().tz(DEFAULT_TIMEZONE);
    }

    /**
     * Parse date string or Date object to moment with Vietnam timezone
     * @param {string|Date} date
     * @returns {moment.Moment}
     */
    static parse(date) {
        return moment(date).tz(DEFAULT_TIMEZONE);
    }

    /**
     * Format date to string
     * @param {string|Date|moment.Moment} date
     * @param {string} format - Default: 'YYYY-MM-DD HH:mm:ss'
     * @returns {string}
     */
    static format(date, format = 'YYYY-MM-DD HH:mm:ss') {
        return this.parse(date).format(format);
    }

    /**
     * Format date for display in Vietnamese locale
     * @param {string|Date|moment.Moment} date
     * @param {string} format - Default: 'DD/MM/YYYY HH:mm'
     * @returns {string}
     */
    static formatVN(date, format = 'DD/MM/YYYY HH:mm') {
        return this.parse(date).locale('vi').format(format);
    }

    /**
     * Get start of day
     * @param {string|Date|moment.Moment} date
     * @returns {moment.Moment}
     */
    static startOfDay(date) {
        return this.parse(date).startOf('day');
    }

    /**
     * Get end of day
     * @param {string|Date|moment.Moment} date
     * @returns {moment.Moment}
     */
    static endOfDay(date) {
        return this.parse(date).endOf('day');
    }

    /**
     * Get start of week (Monday)
     * @param {string|Date|moment.Moment} date
     * @returns {moment.Moment}
     */
    static startOfWeek(date) {
        return this.parse(date).startOf('isoWeek');
    }

    /**
     * Get end of week (Sunday)
     * @param {string|Date|moment.Moment} date
     * @returns {moment.Moment}
     */
    static endOfWeek(date) {
        return this.parse(date).endOf('isoWeek');
    }

    /**
     * Get start of month
     * @param {string|Date|moment.Moment} date
     * @returns {moment.Moment}
     */
    static startOfMonth(date) {
        return this.parse(date).startOf('month');
    }

    /**
     * Get end of month
     * @param {string|Date|moment.Moment} date
     * @returns {moment.Moment}
     */
    static endOfMonth(date) {
        return this.parse(date).endOf('month');
    }

    /**
     * Add time to date
     * @param {string|Date|moment.Moment} date
     * @param {number} amount
     * @param {string} unit - 'days', 'hours', 'minutes', etc.
     * @returns {moment.Moment}
     */
    static add(date, amount, unit) {
        return this.parse(date).add(amount, unit);
    }

    /**
     * Subtract time from date
     * @param {string|Date|moment.Moment} date
     * @param {number} amount
     * @param {string} unit - 'days', 'hours', 'minutes', etc.
     * @returns {moment.Moment}
     */
    static subtract(date, amount, unit) {
        return this.parse(date).subtract(amount, unit);
    }

    /**
     * Check if date is before another date
     * @param {string|Date|moment.Moment} date1
     * @param {string|Date|moment.Moment} date2
     * @returns {boolean}
     */
    static isBefore(date1, date2) {
        return this.parse(date1).isBefore(this.parse(date2));
    }

    /**
     * Check if date is after another date
     * @param {string|Date|moment.Moment} date1
     * @param {string|Date|moment.Moment} date2
     * @returns {boolean}
     */
    static isAfter(date1, date2) {
        return this.parse(date1).isAfter(this.parse(date2));
    }

    /**
     * Check if date is between two dates
     * @param {string|Date|moment.Moment} date
     * @param {string|Date|moment.Moment} startDate
     * @param {string|Date|moment.Moment} endDate
     * @returns {boolean}
     */
    static isBetween(date, startDate, endDate) {
        return this.parse(date).isBetween(this.parse(startDate), this.parse(endDate));
    }

    /**
     * Check if date is same as another date
     * @param {string|Date|moment.Moment} date1
     * @param {string|Date|moment.Moment} date2
     * @param {string} unit - 'day', 'month', 'year', etc.
     * @returns {boolean}
     */
    static isSame(date1, date2, unit = 'day') {
        return this.parse(date1).isSame(this.parse(date2), unit);
    }

    /**
     * Get difference between two dates
     * @param {string|Date|moment.Moment} date1
     * @param {string|Date|moment.Moment} date2
     * @param {string} unit - 'days', 'hours', 'minutes', etc.
     * @returns {number}
     */
    static diff(date1, date2, unit = 'days') {
        return this.parse(date1).diff(this.parse(date2), unit);
    }

    /**
     * Get human readable time from now
     * @param {string|Date|moment.Moment} date
     * @returns {string}
     */
    static fromNow(date) {
        return this.parse(date).locale('vi').fromNow();
    }

    /**
     * Get human readable time to date
     * @param {string|Date|moment.Moment} date
     * @returns {string}
     */
    static toNow(date) {
        return this.parse(date).locale('vi').toNow();
    }

    /**
     * Check if date is valid
     * @param {string|Date|moment.Moment} date
     * @returns {boolean}
     */
    static isValid(date) {
        return moment(date).isValid();
    }

    /**
     * Get age from birth date
     * @param {string|Date|moment.Moment} birthDate
     * @returns {number}
     */
    static getAge(birthDate) {
        return this.now().diff(this.parse(birthDate), 'years');
    }

    /**
     * Check if date is in the past
     * @param {string|Date|moment.Moment} date
     * @returns {boolean}
     */
    static isPast(date) {
        return this.parse(date).isBefore(this.now());
    }

    /**
     * Check if date is in the future
     * @param {string|Date|moment.Moment} date
     * @returns {boolean}
     */
    static isFuture(date) {
        return this.parse(date).isAfter(this.now());
    }

    /**
     * Check if date is today
     * @param {string|Date|moment.Moment} date
     * @returns {boolean}
     */
    static isToday(date) {
        return this.parse(date).isSame(this.now(), 'day');
    }

    /**
     * Check if date is tomorrow
     * @param {string|Date|moment.Moment} date
     * @returns {boolean}
     */
    static isTomorrow(date) {
        return this.parse(date).isSame(this.add(this.now(), 1, 'day'), 'day');
    }

    /**
     * Check if date is yesterday
     * @param {string|Date|moment.Moment} date
     * @returns {boolean}
     */
    static isYesterday(date) {
        return this.parse(date).isSame(this.subtract(this.now(), 1, 'day'), 'day');
    }

    /**
     * Check if date is this week
     * @param {string|Date|moment.Moment} date
     * @returns {boolean}
     */
    static isThisWeek(date) {
        return this.parse(date).isSame(this.now(), 'week');
    }

    /**
     * Check if date is this month
     * @param {string|Date|moment.Moment} date
     * @returns {boolean}
     */
    static isThisMonth(date) {
        return this.parse(date).isSame(this.now(), 'month');
    }

    /**
     * Check if date is this year
     * @param {string|Date|moment.Moment} date
     * @returns {boolean}
     */
    static isThisYear(date) {
        return this.parse(date).isSame(this.now(), 'year');
    }

    /**
     * Get days between two dates
     * @param {string|Date|moment.Moment} startDate
     * @param {string|Date|moment.Moment} endDate
     * @returns {number}
     */
    static daysBetween(startDate, endDate) {
        return this.parse(endDate).diff(this.parse(startDate), 'days');
    }

    /**
     * Get business days between two dates (excluding weekends)
     * @param {string|Date|moment.Moment} startDate
     * @param {string|Date|moment.Moment} endDate
     * @returns {number}
     */
    static businessDaysBetween(startDate, endDate) {
        let start = this.parse(startDate);
        let end = this.parse(endDate);
        let businessDays = 0;

        while (start.isSameOrBefore(end, 'day')) {
            if (start.day() !== 0 && start.day() !== 6) { // Not Sunday or Saturday
                businessDays++;
            }
            start.add(1, 'day');
        }

        return businessDays;
    }

    /**
     * Get next business day (excluding weekends)
     * @param {string|Date|moment.Moment} date
     * @returns {moment.Moment}
     */
    static nextBusinessDay(date) {
        let nextDay = this.parse(date).add(1, 'day');
        while (nextDay.day() === 0 || nextDay.day() === 6) {
            nextDay.add(1, 'day');
        }
        return nextDay;
    }

    /**
     * Get previous business day (excluding weekends)
     * @param {string|Date|moment.Moment} date
     * @returns {moment.Moment}
     */
    static previousBusinessDay(date) {
        let prevDay = this.parse(date).subtract(1, 'day');
        while (prevDay.day() === 0 || prevDay.day() === 6) {
            prevDay.subtract(1, 'day');
        }
        return prevDay;
    }

    /**
     * Check if date is weekend
     * @param {string|Date|moment.Moment} date
     * @returns {boolean}
     */
    static isWeekend(date) {
        const day = this.parse(date).day();
        return day === 0 || day === 6; // Sunday or Saturday
    }

    /**
     * Check if date is weekday
     * @param {string|Date|moment.Moment} date
     * @returns {boolean}
     */
    static isWeekday(date) {
        return !this.isWeekend(date);
    }

    /**
     * Get quarter of the year
     * @param {string|Date|moment.Moment} date
     * @returns {number}
     */
    static getQuarter(date) {
        return this.parse(date).quarter();
    }

    /**
     * Get start of quarter
     * @param {string|Date|moment.Moment} date
     * @returns {moment.Moment}
     */
    static startOfQuarter(date) {
        return this.parse(date).startOf('quarter');
    }

    /**
     * Get end of quarter
     * @param {string|Date|moment.Moment} date
     * @returns {moment.Moment}
     */
    static endOfQuarter(date) {
        return this.parse(date).endOf('quarter');
    }

    /**
     * Get academic year from date (September to August)
     * @param {string|Date|moment.Moment} date
     * @returns {string}
     */
    static getAcademicYear(date) {
        const momentDate = this.parse(date);
        const year = momentDate.year();
        const month = momentDate.month(); // 0-based (0 = January)

        if (month >= 8) { // September onwards
            return `${year}-${year + 1}`;
        } else { // January to August
            return `${year - 1}-${year}`;
        }
    }

    /**
     * Get semester from date
     * @param {string|Date|moment.Moment} date
     * @returns {string}
     */
    static getSemester(date) {
        const month = this.parse(date).month(); // 0-based

        if (month >= 8 && month <= 11) { // Sep-Dec
            return 'fall';
        } else if (month >= 0 && month <= 4) { // Jan-May
            return 'spring';
        } else { // Jun-Aug
            return 'summer';
        }
    }

    /**
     * Get Vietnamese lunar date
     * @param {string|Date|moment.Moment} date
     * @returns {object}
     */
    static getLunarDate(date) {
        // This is a simplified implementation
        // For accurate lunar calendar conversion, use specialized libraries
        const solarDate = this.parse(date);
        return {
            day: solarDate.date(),
            month: solarDate.month() + 1,
            year: solarDate.year(),
            isLunar: false // Placeholder - would need lunar calendar library
        };
    }

    /**
     * Check if year is leap year
     * @param {number} year
     * @returns {boolean}
     */
    static isLeapYear(year) {
        return moment().year(year).isLeapYear();
    }

    /**
     * Get days in month
     * @param {string|Date|moment.Moment} date
     * @returns {number}
     */
    static daysInMonth(date) {
        return this.parse(date).daysInMonth();
    }

    /**
     * Get week number of the year
     * @param {string|Date|moment.Moment} date
     * @returns {number}
     */
    static weekOfYear(date) {
        return this.parse(date).week();
    }

    /**
     * Get day of year
     * @param {string|Date|moment.Moment} date
     * @returns {number}
     */
    static dayOfYear(date) {
        return this.parse(date).dayOfYear();
    }

    /**
     * Convert to different timezone
     * @param {string|Date|moment.Moment} date
     * @param {string} timezone
     * @returns {moment.Moment}
     */
    static toTimezone(date, timezone) {
        return this.parse(date).tz(timezone);
    }

    /**
     * Get timezone offset
     * @param {string|Date|moment.Moment} date
     * @param {string} timezone
     * @returns {number}
     */
    static getTimezoneOffset(date, timezone = DEFAULT_TIMEZONE) {
        return this.parse(date).tz(timezone).utcOffset();
    }

    /**
     * Create date range array
     * @param {string|Date|moment.Moment} startDate
     * @param {string|Date|moment.Moment} endDate
     * @param {string} unit - 'days', 'weeks', 'months', etc.
     * @returns {moment.Moment[]}
     */
    static createDateRange(startDate, endDate, unit = 'days') {
        const start = this.parse(startDate);
        const end = this.parse(endDate);
        const range = [];
        let current = start.clone();

        while (current.isSameOrBefore(end)) {
            range.push(current.clone());
            current.add(1, unit);
        }

        return range;
    }

    /**
     * Get event duration in human readable format
     * @param {string|Date|moment.Moment} startDate
     * @param {string|Date|moment.Moment} endDate
     * @returns {string}
     */
    static getDurationText(startDate, endDate) {
        const start = this.parse(startDate);
        const end = this.parse(endDate);
        const duration = moment.duration(end.diff(start));

        if (duration.asDays() >= 1) {
            const days = Math.floor(duration.asDays());
            const hours = duration.hours();
            return `${days} ngày${hours > 0 ? ` ${hours} giờ` : ''}`;
        } else if (duration.asHours() >= 1) {
            const hours = Math.floor(duration.asHours());
            const minutes = duration.minutes();
            return `${hours} giờ${minutes > 0 ? ` ${minutes} phút` : ''}`;
        } else {
            return `${duration.minutes()} phút`;
        }
    }

    /**
     * Get time until event starts
     * @param {string|Date|moment.Moment} eventDate
     * @returns {object}
     */
    static getTimeUntilEvent(eventDate) {
        const now = this.now();
        const event = this.parse(eventDate);
        const duration = moment.duration(event.diff(now));

        if (duration.asMilliseconds() <= 0) {
            return {
                isPast: true,
                text: 'Đã qua',
                days: 0,
                hours: 0,
                minutes: 0
            };
        }

        return {
            isPast: false,
            text: event.fromNow(),
            days: Math.floor(duration.asDays()),
            hours: duration.hours(),
            minutes: duration.minutes(),
            totalMinutes: Math.floor(duration.asMinutes())
        };
    }

    /**
     * Check if event registration is still open
     * @param {string|Date|moment.Moment} registrationStart
     * @param {string|Date|moment.Moment} registrationEnd
     * @returns {boolean}
     */
    static isRegistrationOpen(registrationStart, registrationEnd) {
        const now = this.now();
        return now.isBetween(this.parse(registrationStart), this.parse(registrationEnd));
    }

    /**
     * Get registration status text
     * @param {string|Date|moment.Moment} registrationStart
     * @param {string|Date|moment.Moment} registrationEnd
     * @returns {object}
     */
    static getRegistrationStatus(registrationStart, registrationEnd) {
        const now = this.now();
        const start = this.parse(registrationStart);
        const end = this.parse(registrationEnd);

        if (now.isBefore(start)) {
            return {
                status: 'not_started',
                text: 'Chưa mở đăng ký',
                timeText: `Mở ${start.fromNow()}`
            };
        } else if (now.isBetween(start, end)) {
            return {
                status: 'open',
                text: 'Đang mở đăng ký',
                timeText: `Đóng ${end.fromNow()}`
            };
        } else {
            return {
                status: 'closed',
                text: 'Đã đóng đăng ký',
                timeText: `Đã đóng ${end.fromNow()}`
            };
        }
    }

    /**
     * Format date range for display
     * @param {string|Date|moment.Moment} startDate
     * @param {string|Date|moment.Moment} endDate
     * @returns {string}
     */
    static formatDateRange(startDate, endDate) {
        const start = this.parse(startDate);
        const end = this.parse(endDate);

        if (start.isSame(end, 'day')) {
            // Same day
            return `${start.format('DD/MM/YYYY')} từ ${start.format('HH:mm')} - ${end.format('HH:mm')}`;
        } else if (start.isSame(end, 'month')) {
            // Same month
            return `${start.format('DD')}-${end.format('DD/MM/YYYY')}`;
        } else if (start.isSame(end, 'year')) {
            // Same year
            return `${start.format('DD/MM')}-${end.format('DD/MM/YYYY')}`;
        } else {
            // Different years
            return `${start.format('DD/MM/YYYY')}-${end.format('DD/MM/YYYY')}`;
        }
    }

    /**
     * Get reminder times for events
     * @param {string|Date|moment.Moment} eventDate
     * @returns {moment.Moment[]}
     */
    static getReminderTimes(eventDate) {
        const event = this.parse(eventDate);
        return [
            event.clone().subtract(7, 'days'),  // 1 week before
            event.clone().subtract(1, 'day'),   // 1 day before
            event.clone().subtract(1, 'hour'),  // 1 hour before
            event.clone().subtract(15, 'minutes') // 15 minutes before
        ].filter(time => time.isAfter(this.now()));
    }

    /**
     * Parse date with multiple formats
     * @param {string} dateString
     * @param {string[]} formats
     * @returns {moment.Moment|null}
     */
    static parseMultipleFormats(dateString, formats = [
        'YYYY-MM-DD',
        'DD/MM/YYYY',
        'DD-MM-YYYY',
        'YYYY-MM-DD HH:mm:ss',
        'DD/MM/YYYY HH:mm',
        'DD-MM-YYYY HH:mm'
    ]) {
        for (const format of formats) {
            const parsed = moment(dateString, format, true);
            if (parsed.isValid()) {
                return parsed.tz(DEFAULT_TIMEZONE);
            }
        }
        return null;
    }

    /**
     * Get calendar events for a date range
     * @param {string|Date|moment.Moment} startDate
     * @param {string|Date|moment.Moment} endDate
     * @returns {object[]}
     */
    static getCalendarDates(startDate, endDate) {
        const start = this.startOfMonth(startDate);
        const end = this.endOfMonth(endDate);
        const dates = [];
        let current = start.clone();

        while (current.isSameOrBefore(end)) {
            dates.push({
                date: current.clone(),
                formatted: current.format('YYYY-MM-DD'),
                display: current.format('D'),
                isCurrentMonth: current.isSame(startDate, 'month'),
                isToday: current.isSame(this.now(), 'day'),
                isWeekend: this.isWeekend(current),
                dayOfWeek: current.format('dddd')
            });
            current.add(1, 'day');
        }

        return dates;
    }

    /**
     * Convert duration to milliseconds
     * @param {number} amount
     * @param {string} unit
     * @returns {number}
     */
    static toMilliseconds(amount, unit) {
        return moment.duration(amount, unit).asMilliseconds();
    }

    /**
     * Get default timezone
     * @returns {string}
     */
    static getDefaultTimezone() {
        return DEFAULT_TIMEZONE;
    }

    /**
     * Set locale for moment
     * @param {string} locale
     */
    static setLocale(locale = 'vi') {
        moment.locale(locale);
    }

    /**
     * Get available timezones
     * @returns {string[]}
     */
    static getAvailableTimezones() {
        return moment.tz.names();
    }

    /**
     * Format duration
     * @param {number} milliseconds
     * @returns {string}
     */
    static formatDuration(milliseconds) {
        const duration = moment.duration(milliseconds);

        if (duration.asDays() >= 1) {
            return `${Math.floor(duration.asDays())} ngày`;
        } else if (duration.asHours() >= 1) {
            return `${Math.floor(duration.asHours())} giờ`;
        } else if (duration.asMinutes() >= 1) {
            return `${Math.floor(duration.asMinutes())} phút`;
        } else {
            return `${Math.floor(duration.asSeconds())} giây`;
        }
    }
}

// Set Vietnamese locale
moment.updateLocale('vi', {
    months: [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ],
    monthsShort: [
        'T1', 'T2', 'T3', 'T4', 'T5', 'T6',
        'T7', 'T8', 'T9', 'T10', 'T11', 'T12'
    ],
    weekdays: [
        'Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'
    ],
    weekdaysShort: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    weekdaysMin: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    relativeTime: {
        future: '%s tới',
        past: '%s trước',
        s: 'vài giây',
        ss: '%d giây',
        m: '1 phút',
        mm: '%d phút',
        h: '1 giờ',
        hh: '%d giờ',
        d: '1 ngày',
        dd: '%d ngày',
        M: '1 tháng',
        MM: '%d tháng',
        y: '1 năm',
        yy: '%d năm'
    }
});

module.exports = DateUtils;