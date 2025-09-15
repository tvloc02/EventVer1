const Registration = require('../../models/Registration');
const Event = require('../../models/Event');
const User = require('../../models/User');
const Attendance = require('../../models/Attendance');
const qrCodeService = require('../qrCodeService');
const cacheService = require('../cacheService');
const logger = require('../../utils/logger');
const { NotFoundError, ValidationError, PermissionError } = require('../../utils/errors');

class AttendanceService {
    // Check-in user
    async checkInUser(registrationId, checkInData = {}) {
        try {
            const registration = await Registration.findById(registrationId)
                .populate('event', 'title schedule location')
                .populate('user', 'profile.fullName email student.studentId');

            if (!registration) {
                throw new NotFoundError('Đăng ký không tồn tại');
            }

            if (registration.status !== 'approved') {
                throw new ValidationError('Chỉ những đăng ký đã được duyệt mới có thể check-in');
            }

            if (registration.attendance.checkedIn) {
                throw new ValidationError('Người dùng đã check-in rồi');
            }

            const event = registration.event;
            const now = new Date();

            // Check if check-in is allowed (within event time window)
            const checkInStart = new Date(event.schedule.startDate.getTime() - (2 * 60 * 60 * 1000)); // 2h before
            const checkInEnd = new Date(event.schedule.endDate.getTime() + (1 * 60 * 60 * 1000)); // 1h after

            if (now < checkInStart || now > checkInEnd) {
                throw new ValidationError('Không thể check-in ngoài thời gian cho phép');
            }

            // Perform check-in
            registration.attendance.checkedIn = true;
            registration.attendance.checkInTime = now;
            registration.attendance.checkInMethod = checkInData.method || 'manual';
            registration.attendance.checkInLocation = checkInData.location;
            registration.attendance.notes = checkInData.notes;

            // Update status to attended
            registration.status = 'attended';

            await registration.save();

            // Create attendance record
            const attendanceRecord = new Attendance({
                event: event._id,
                user: registration.user._id,
                registration: registration._id,
                type: 'check_in',
                timestamp: now,
                method: checkInData.method || 'manual',
                location: checkInData.location,
                notes: checkInData.notes,
                recordedBy: checkInData.recordedBy
            });

            await attendanceRecord.save();

            // Update event statistics
            await event.incrementAttendees();

            // Clear related caches
            await this.clearAttendanceCaches(event._id, registration.user._id);

            logger.info(`User checked in: ${registration.user.email} -> ${event.title}`);

            return {
                success: true,
                message: 'Check-in thành công',
                registration: await Registration.findById(registrationId)
                    .populate('user', 'profile.fullName email')
                    .populate('event', 'title schedule')
            };

        } catch (error) {
            logger.error('Check-in user error:', error);
            throw error;
        }
    }

    // Check-out user
    async checkOutUser(registrationId, checkOutData = {}) {
        try {
            const registration = await Registration.findById(registrationId)
                .populate('event', 'title schedule')
                .populate('user', 'profile.fullName email');

            if (!registration) {
                throw new NotFoundError('Đăng ký không tồn tại');
            }

            if (!registration.attendance.checkedIn) {
                throw new ValidationError('Người dùng chưa check-in');
            }

            if (registration.attendance.checkedOut) {
                throw new ValidationError('Người dùng đã check-out rồi');
            }

            const now = new Date();

            // Perform check-out
            registration.attendance.checkedOut = true;
            registration.attendance.checkOutTime = now;
            registration.attendance.checkOutMethod = checkOutData.method || 'manual';
            registration.attendance.checkOutNotes = checkOutData.notes;

            // Calculate attendance duration
            const duration = now - registration.attendance.checkInTime;
            registration.attendance.duration = Math.floor(duration / 1000 / 60); // minutes

            // Calculate attendance rate
            const eventDuration = registration.event.schedule.duration;
            registration.attendance.attendanceRate = Math.min(100,
                Math.round((registration.attendance.duration / eventDuration) * 100)
            );

            await registration.save();

            // Create attendance record
            const attendanceRecord = new Attendance({
                event: registration.event._id,
                user: registration.user._id,
                registration: registration._id,
                type: 'check_out',
                timestamp: now,
                method: checkOutData.method || 'manual',
                notes: checkOutData.notes,
                duration: registration.attendance.duration,
                recordedBy: checkOutData.recordedBy
            });

            await attendanceRecord.save();

            // Clear caches
            await this.clearAttendanceCaches(registration.event._id, registration.user._id);

            logger.info(`User checked out: ${registration.user.email} -> ${registration.event.title}`);

            return {
                success: true,
                message: 'Check-out thành công',
                attendanceRate: registration.attendance.attendanceRate,
                duration: registration.attendance.duration
            };

        } catch (error) {
            logger.error('Check-out user error:', error);
            throw error;
        }
    }

    // Bulk check-in
    async bulkCheckIn(eventId, userIds, checkInData = {}) {
        try {
            const event = await Event.findById(eventId);
            if (!event) {
                throw new NotFoundError('Sự kiện không tồn tại');
            }

            const results = {
                successful: 0,
                failed: 0,
                errors: []
            };

            for (const userId of userIds) {
                try {
                    const registration = await Registration.findOne({
                        event: eventId,
                        user: userId,
                        status: 'approved'
                    });

                    if (!registration) {
                        results.failed++;
                        results.errors.push({
                            userId,
                            error: 'Đăng ký không tồn tại hoặc chưa được duyệt'
                        });
                        continue;
                    }

                    if (registration.attendance.checkedIn) {
                        results.failed++;
                        results.errors.push({
                            userId,
                            error: 'Đã check-in rồi'
                        });
                        continue;
                    }

                    await this.checkInUser(registration._id, {
                        ...checkInData,
                        method: 'bulk'
                    });

                    results.successful++;

                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        userId,
                        error: error.message
                    });
                }

                // Small delay to prevent overwhelming
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            logger.info(`Bulk check-in completed: ${results.successful} successful, ${results.failed} failed`);
            return results;

        } catch (error) {
            logger.error('Bulk check-in error:', error);
            throw error;
        }
    }

    // QR Code check-in
    async checkInByQRCode(qrData, checkInData = {}) {
        try {
            // Verify QR code
            const verification = await qrCodeService.verifyQRCode(qrData, 'registration');

            if (!verification.valid) {
                throw new ValidationError(`QR code không hợp lệ: ${verification.reason}`);
            }

            const { registrationId } = verification.data;

            return await this.checkInUser(registrationId, {
                ...checkInData,
                method: 'qr_code'
            });

        } catch (error) {
            logger.error('QR check-in error:', error);
            throw error;
        }
    }

    // Manual attendance tracking
    async recordAttendance(eventId, userId, attendanceData, recordedBy) {
        try {
            const [event, user] = await Promise.all([
                Event.findById(eventId),
                User.findById(userId)
            ]);

            if (!event || !user) {
                throw new NotFoundError('Sự kiện hoặc người dùng không tồn tại');
            }

            const registration = await Registration.findOne({
                event: eventId,
                user: userId
            });

            if (!registration) {
                throw new NotFoundError('Đăng ký không tồn tại');
            }

            // Create attendance record
            const attendance = new Attendance({
                event: eventId,
                user: userId,
                registration: registration._id,
                type: attendanceData.type || 'manual_record',
                timestamp: attendanceData.timestamp || new Date(),
                method: 'manual',
                notes: attendanceData.notes,
                duration: attendanceData.duration,
                location: attendanceData.location,
                recordedBy
            });

            await attendance.save();

            // Update registration if needed
            if (attendanceData.type === 'check_in' && !registration.attendance.checkedIn) {
                registration.attendance.checkedIn = true;
                registration.attendance.checkInTime = attendance.timestamp;
                registration.attendance.checkInMethod = 'manual';
                registration.status = 'attended';
                await registration.save();
            }

            logger.info(`Manual attendance recorded: ${user.email} -> ${event.title}`);
            return attendance;

        } catch (error) {
            logger.error('Record attendance error:', error);
            throw error;
        }
    }

    // Get attendance report
    async getAttendanceReport(eventId, options = {}) {
        try {
            const cacheKey = `attendance:report:${eventId}`;

            // Check cache first
            let report = await cacheService.get(cacheKey);
            if (report && !options.refresh) {
                return report;
            }

            const event = await Event.findById(eventId)
                .populate('organizer', 'profile.fullName email');

            if (!event) {
                throw new NotFoundError('Sự kiện không tồn tại');
            }

            // Get all registrations
            const registrations = await Registration.find({ event: eventId })
                .populate('user', 'profile.fullName email student.studentId student.faculty student.department')
                .sort({ 'attendance.checkInTime': 1 });

            // Calculate statistics
            const stats = {
                totalRegistered: registrations.length,
                totalCheckedIn: registrations.filter(r => r.attendance.checkedIn).length,
                totalCheckedOut: registrations.filter(r => r.attendance.checkedOut).length,
                averageAttendanceRate: 0,
                attendanceByTime: {},
                attendanceByDepartment: {},
                attendanceByFaculty: {}
            };

            const attendanceRates = [];
            const timeSlots = {};
            const departmentStats = {};
            const facultyStats = {};

            registrations.forEach(reg => {
                // Attendance rate calculation
                if (reg.attendance.attendanceRate) {
                    attendanceRates.push(reg.attendance.attendanceRate);
                }

                // Time-based analysis
                if (reg.attendance.checkInTime) {
                    const hour = new Date(reg.attendance.checkInTime).getHours();
                    timeSlots[hour] = (timeSlots[hour] || 0) + 1;
                }

                // Department analysis
                const dept = reg.user.student?.department || 'Khác';
                if (!departmentStats[dept]) {
                    departmentStats[dept] = { total: 0, attended: 0 };
                }
                departmentStats[dept].total++;
                if (reg.attendance.checkedIn) {
                    departmentStats[dept].attended++;
                }

                // Faculty analysis
                const faculty = reg.user.student?.faculty || 'Khác';
                if (!facultyStats[faculty]) {
                    facultyStats[faculty] = { total: 0, attended: 0 };
                }
                facultyStats[faculty].total++;
                if (reg.attendance.checkedIn) {
                    facultyStats[faculty].attended++;
                }
            });

            // Calculate averages
            stats.averageAttendanceRate = attendanceRates.length > 0
                ? Math.round(attendanceRates.reduce((a, b) => a + b, 0) / attendanceRates.length)
                : 0;

            stats.attendanceByTime = timeSlots;
            stats.attendanceByDepartment = departmentStats;
            stats.attendanceByFaculty = facultyStats;
            stats.attendanceRate = Math.round((stats.totalCheckedIn / stats.totalRegistered) * 100);

            report = {
                event: {
                    id: event._id,
                    title: event.title,
                    startDate: event.schedule.startDate,
                    endDate: event.schedule.endDate,
                    organizer: event.organizer
                },
                statistics: stats,
                attendees: registrations.map(reg => ({
                    id: reg._id,
                    user: {
                        id: reg.user._id,
                        fullName: reg.user.profile.fullName,
                        email: reg.user.email,
                        studentId: reg.user.student?.studentId,
                        faculty: reg.user.student?.faculty,
                        department: reg.user.student?.department
                    },
                    registrationDate: reg.registrationDate,
                    attendance: {
                        checkedIn: reg.attendance.checkedIn,
                        checkInTime: reg.attendance.checkInTime,
                        checkInMethod: reg.attendance.checkInMethod,
                        checkedOut: reg.attendance.checkedOut,
                        checkOutTime: reg.attendance.checkOutTime,
                        duration: reg.attendance.duration,
                        attendanceRate: reg.attendance.attendanceRate
                    },
                    status: reg.status
                })),
                generatedAt: new Date()
            };

            // Cache report for 10 minutes
            await cacheService.set(cacheKey, report, 600);

            return report;

        } catch (error) {
            logger.error('Get attendance report error:', error);
            throw error;
        }
    }

    // Get attendance summary
    async getAttendanceSummary(eventId) {
        try {
            const cacheKey = `attendance:summary:${eventId}`;

            let summary = await cacheService.get(cacheKey);
            if (summary) {
                return summary;
            }

            const registrations = await Registration.find({
                event: eventId,
                status: { $in: ['approved', 'attended'] }
            });

            const now = new Date();
            const stats = {
                totalRegistered: registrations.length,
                checkedIn: registrations.filter(r => r.attendance.checkedIn).length,
                checkedOut: registrations.filter(r => r.attendance.checkedOut).length,
                currentlyPresent: registrations.filter(r =>
                    r.attendance.checkedIn && !r.attendance.checkedOut
                ).length,
                noShow: registrations.filter(r =>
                    !r.attendance.checkedIn && r.status === 'approved'
                ).length
            };

            summary = {
                ...stats,
                attendanceRate: stats.totalRegistered > 0
                    ? Math.round((stats.checkedIn / stats.totalRegistered) * 100)
                    : 0,
                completionRate: stats.checkedIn > 0
                    ? Math.round((stats.checkedOut / stats.checkedIn) * 100)
                    : 0
            };

            // Cache for 5 minutes
            await cacheService.set(cacheKey, summary, 300);

            return summary;

        } catch (error) {
            logger.error('Get attendance summary error:', error);
            throw error;
        }
    }

    // Real-time attendance tracking
    async trackRealTimeAttendance(eventId) {
        try {
            const attendanceData = await Registration.find({
                event: eventId,
                'attendance.checkedIn': true
            })
                .populate('user', 'profile.fullName student.studentId')
                .sort({ 'attendance.checkInTime': -1 })
                .limit(50); // Last 50 check-ins

            const recentCheckIns = attendanceData.map(reg => ({
                userId: reg.user._id,
                userName: reg.user.profile.fullName,
                studentId: reg.user.student?.studentId,
                checkInTime: reg.attendance.checkInTime,
                method: reg.attendance.checkInMethod
            }));

            return {
                recentCheckIns,
                totalPresent: attendanceData.length,
                lastUpdate: new Date()
            };

        } catch (error) {
            logger.error('Track real-time attendance error:', error);
            throw error;
        }
    }

    // Export attendance data
    async exportAttendanceData(eventId, format = 'csv') {
        try {
            const report = await this.getAttendanceReport(eventId, { refresh: true });

            if (format === 'csv') {
                return this.generateCSVReport(report);
            } else if (format === 'excel') {
                return this.generateExcelReport(report);
            } else {
                return report;
            }

        } catch (error) {
            logger.error('Export attendance data error:', error);
            throw error;
        }
    }

    // Generate CSV report
    generateCSVReport(report) {
        try {
            const headers = [
                'STT',
                'Họ và tên',
                'Email',
                'Mã sinh viên',
                'Khoa',
                'Khoa/Bộ môn',
                'Ngày đăng ký',
                'Trạng thái',
                'Check-in',
                'Thời gian check-in',
                'Phương thức check-in',
                'Check-out',
                'Thời gian check-out',
                'Thời gian tham gia (phút)',
                'Tỷ lệ tham gia (%)'
            ];

            let csv = headers.join(',') + '\n';

            report.attendees.forEach((attendee, index) => {
                const row = [
                    index + 1,
                    `"${attendee.user.fullName}"`,
                    attendee.user.email,
                    attendee.user.studentId || '',
                    attendee.user.faculty || '',
                    attendee.user.department || '',
                    new Date(attendee.registrationDate).toLocaleDateString('vi-VN'),
                    attendee.status === 'attended' ? 'Đã tham gia' : 'Đã đăng ký',
                    attendee.attendance.checkedIn ? 'Có' : 'Không',
                    attendee.attendance.checkInTime
                        ? new Date(attendee.attendance.checkInTime).toLocaleString('vi-VN')
                        : '',
                    attendee.attendance.checkInMethod || '',
                    attendee.attendance.checkedOut ? 'Có' : 'Không',
                    attendee.attendance.checkOutTime
                        ? new Date(attendee.attendance.checkOutTime).toLocaleString('vi-VN')
                        : '',
                    attendee.attendance.duration || 0,
                    attendee.attendance.attendanceRate || 0
                ];

                csv += row.join(',') + '\n';
            });

            return {
                data: csv,
                filename: `attendance_${report.event.title}_${new Date().toISOString().split('T')[0]}.csv`,
                contentType: 'text/csv'
            };

        } catch (error) {
            logger.error('Generate CSV report error:', error);
            throw error;
        }
    }

    // Get user attendance history
    async getUserAttendanceHistory(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                eventType,
                startDate,
                endDate
            } = options;

            const query = { user: userId, 'attendance.checkedIn': true };

            if (startDate || endDate) {
                query['attendance.checkInTime'] = {};
                if (startDate) query['attendance.checkInTime'].$gte = new Date(startDate);
                if (endDate) query['attendance.checkInTime'].$lte = new Date(endDate);
            }

            const skip = (page - 1) * limit;

            let registrationsQuery = Registration.find(query)
                .populate('event', 'title slug eventType schedule images.thumbnail')
                .sort({ 'attendance.checkInTime': -1 })
                .skip(skip)
                .limit(limit);

            if (eventType) {
                registrationsQuery = registrationsQuery.populate({
                    path: 'event',
                    match: { eventType }
                });
            }

            const [registrations, total] = await Promise.all([
                registrationsQuery.exec(),
                Registration.countDocuments(query)
            ]);

            // Filter out null events (from populate match)
            const filteredRegistrations = registrations.filter(r => r.event);

            const history = filteredRegistrations.map(reg => ({
                event: {
                    id: reg.event._id,
                    title: reg.event.title,
                    slug: reg.event.slug,
                    type: reg.event.eventType,
                    date: reg.event.schedule.startDate,
                    image: reg.event.images.thumbnail
                },
                attendance: {
                    checkInTime: reg.attendance.checkInTime,
                    checkOutTime: reg.attendance.checkOutTime,
                    duration: reg.attendance.duration,
                    attendanceRate: reg.attendance.attendanceRate,
                    method: reg.attendance.checkInMethod
                },
                certificate: {
                    issued: reg.certificate.issued,
                    issuedAt: reg.certificate.issuedAt,
                    certificateId: reg.certificate.certificateId
                }
            }));

            return {
                history,
                pagination: {
                    page,
                    limit,
                    total: filteredRegistrations.length,
                    pages: Math.ceil(filteredRegistrations.length / limit)
                },
                statistics: {
                    totalEvents: total,
                    averageAttendanceRate: this.calculateAverageAttendanceRate(filteredRegistrations)
                }
            };

        } catch (error) {
            logger.error('Get user attendance history error:', error);
            throw error;
        }
    }

    // Get attendance analytics
    async getAttendanceAnalytics(eventId, period = 'daily') {
        try {
            const cacheKey = `attendance:analytics:${eventId}:${period}`;

            let analytics = await cacheService.get(cacheKey);
            if (analytics) {
                return analytics;
            }

            const attendanceRecords = await Attendance.find({ event: eventId })
                .sort({ timestamp: 1 });

            analytics = {
                timeline: this.buildAttendanceTimeline(attendanceRecords, period),
                methods: this.analyzeCheckInMethods(attendanceRecords),
                patterns: this.analyzeAttendancePatterns(attendanceRecords),
                demographics: await this.analyzeAttendeeDemographics(eventId)
            };

            // Cache for 15 minutes
            await cacheService.set(cacheKey, analytics, 900);

            return analytics;

        } catch (error) {
            logger.error('Get attendance analytics error:', error);
            throw error;
        }
    }

    // Helper methods
    buildAttendanceTimeline(records, period) {
        const timeline = {};

        records.forEach(record => {
            if (record.type === 'check_in') {
                let timeKey;
                const date = new Date(record.timestamp);

                switch (period) {
                    case 'hourly':
                        timeKey = `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:00`;
                        break;
                    case 'daily':
                        timeKey = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                        break;
                    default:
                        timeKey = date.toISOString().split('T')[0];
                }

                timeline[timeKey] = (timeline[timeKey] || 0) + 1;
            }
        });

        return timeline;
    }

    analyzeCheckInMethods(records) {
        const methods = {};

        records.forEach(record => {
            if (record.type === 'check_in') {
                const method = record.method || 'manual';
                methods[method] = (methods[method] || 0) + 1;
            }
        });

        return methods;
    }

    analyzeAttendancePatterns(records) {
        const checkIns = records.filter(r => r.type === 'check_in');

        if (checkIns.length === 0) {
            return { peakHour: null, averageCheckInTime: null };
        }

        const hourCounts = {};
        let totalMinutes = 0;

        checkIns.forEach(record => {
            const date = new Date(record.timestamp);
            const hour = date.getHours();
            const minutes = date.getHours() * 60 + date.getMinutes();

            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            totalMinutes += minutes;
        });

        const peakHour = Object.keys(hourCounts).reduce((a, b) =>
            hourCounts[a] > hourCounts[b] ? a : b
        );

        const averageMinutes = totalMinutes / checkIns.length;
        const averageHour = Math.floor(averageMinutes / 60);
        const averageMinute = Math.floor(averageMinutes % 60);

        return {
            peakHour: parseInt(peakHour),
            averageCheckInTime: `${averageHour.toString().padStart(2, '0')}:${averageMinute.toString().padStart(2, '0')}`,
            hourlyDistribution: hourCounts
        };
    }

    async analyzeAttendeeDemographics(eventId) {
        try {
            const registrations = await Registration.find({
                event: eventId,
                'attendance.checkedIn': true
            }).populate('user', 'student.faculty student.department student.year student.major');

            const demographics = {
                byFaculty: {},
                byDepartment: {},
                byYear: {},
                byMajor: {}
            };

            registrations.forEach(reg => {
                const student = reg.user.student || {};

                // By faculty
                const faculty = student.faculty || 'Khác';
                demographics.byFaculty[faculty] = (demographics.byFaculty[faculty] || 0) + 1;

                // By department
                const department = student.department || 'Khác';
                demographics.byDepartment[department] = (demographics.byDepartment[department] || 0) + 1;

                // By year
                const year = student.year || 'Khác';
                demographics.byYear[year] = (demographics.byYear[year] || 0) + 1;

                // By major
                const major = student.major || 'Khác';
                demographics.byMajor[major] = (demographics.byMajor[major] || 0) + 1;
            });

            return demographics;

        } catch (error) {
            logger.error('Analyze attendee demographics error:', error);
            return {
                byFaculty: {},
                byDepartment: {},
                byYear: {},
                byMajor: {}
            };
        }
    }

    calculateAverageAttendanceRate(registrations) {
        const rates = registrations
            .filter(r => r.attendance.attendanceRate !== null)
            .map(r => r.attendance.attendanceRate);

        if (rates.length === 0) return 0;

        return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    }

    async clearAttendanceCaches(eventId, userId = null) {
        try {
            const patterns = [
                `attendance:report:${eventId}`,
                `attendance:summary:${eventId}`,
                `attendance:analytics:${eventId}:*`
            ];

            if (userId) {
                patterns.push(`user:${userId}:*`);
            }

            await Promise.all(patterns.map(pattern => cacheService.clearPattern(pattern)));

        } catch (error) {
            logger.error('Clear attendance caches error:', error);
        }
    }

    // Validate attendance data
    validateAttendanceData(attendanceData) {
        const errors = [];

        if (attendanceData.timestamp && new Date(attendanceData.timestamp) > new Date()) {
            errors.push('Thời gian không thể trong tương lai');
        }

        if (attendanceData.duration && (attendanceData.duration < 0 || attendanceData.duration > 24 * 60)) {
            errors.push('Thời gian tham gia không hợp lệ');
        }

        if (attendanceData.type && !['check_in', 'check_out', 'manual_record'].includes(attendanceData.type)) {
            errors.push('Loại điểm danh không hợp lệ');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Generate attendance QR code for event
    async generateEventAttendanceQR(eventId, options = {}) {
        try {
            const event = await Event.findById(eventId);
            if (!event) {
                throw new NotFoundError('Sự kiện không tồn tại');
            }

            const qrData = {
                type: 'event_attendance',
                eventId,
                eventCode: event.eventCode,
                timestamp: Date.now()
            };

            const qrCode = await qrCodeService.generateQRCode(qrData, options);

            logger.info(`Attendance QR code generated for event: ${eventId}`);
            return {
                qrCode,
                data: qrData,
                validUntil: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours
            };

        } catch (error) {
            logger.error('Generate attendance QR error:', error);
            throw error;
        }
    }

    // Get attendance insights
    async getAttendanceInsights(eventIds = [], userId = null) {
        try {
            let query = {};

            if (eventIds.length > 0) {
                query.event = { $in: eventIds };
            }

            if (userId) {
                query.user = userId;
            }

            const attendanceRecords = await Attendance.find(query)
                .populate('event', 'title eventType category')
                .populate('user', 'student.faculty student.department');

            const insights = {
                totalRecords: attendanceRecords.length,
                uniqueEvents: new Set(attendanceRecords.map(r => r.event._id)).size,
                uniqueUsers: new Set(attendanceRecords.map(r => r.user._id)).size,
                methodDistribution: {},
                typeDistribution: {},
                facultyParticipation: {},
                eventTypeEngagement: {}
            };

            attendanceRecords.forEach(record => {
                // Method distribution
                const method = record.method || 'manual';
                insights.methodDistribution[method] = (insights.methodDistribution[method] || 0) + 1;

                // Type distribution
                const type = record.type || 'unknown';
                insights.typeDistribution[type] = (insights.typeDistribution[type] || 0) + 1;

                // Faculty participation
                if (record.user.student?.faculty) {
                    const faculty = record.user.student.faculty;
                    insights.facultyParticipation[faculty] = (insights.facultyParticipation[faculty] || 0) + 1;
                }

                // Event type engagement
                if (record.event?.eventType) {
                    const eventType = record.event.eventType;
                    insights.eventTypeEngagement[eventType] = (insights.eventTypeEngagement[eventType] || 0) + 1;
                }
            });

            return insights;

        } catch (error) {
            logger.error('Get attendance insights error:', error);
            throw error;
        }
    }
}

module.exports = new AttendanceService();