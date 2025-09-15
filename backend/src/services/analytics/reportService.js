const Event = require('../../models/Event');
const Registration = require('../../models/Registration');
const User = require('../../models/User');
const Certificate = require('../../models/Certificate');
const Attendance = require('../../models/Attendance');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const cacheService = require('../cacheService');
const logger = require('../../utils/logger');

class ReportService {
    constructor() {
        this.reportTemplates = {
            event_summary: 'Báo cáo tổng quan sự kiện',
            attendance_report: 'Báo cáo điểm danh',
            registration_report: 'Báo cáo đăng ký',
            certificate_report: 'Báo cáo chứng nhận',
            user_activity: 'Báo cáo hoạt động người dùng',
            financial_report: 'Báo cáo tài chính',
            performance_analysis: 'Phân tích hiệu suất'
        };
    }

    // Generate comprehensive event report
    async generateEventReport(eventId, reportType = 'comprehensive', format = 'excel') {
        try {
            const event = await Event.findById(eventId)
                .populate('organizer', 'profile.fullName email')
                .populate('category', 'name');

            if (!event) {
                throw new Error('Sự kiện không tồn tại');
            }

            const reportData = await this.collectEventReportData(eventId);

            let reportBuffer;
            switch (format.toLowerCase()) {
                case 'excel':
                    reportBuffer = await this.generateExcelReport(event, reportData, reportType);
                    break;
                case 'pdf':
                    reportBuffer = await this.generatePDFReport(event, reportData, reportType);
                    break;
                case 'csv':
                    reportBuffer = await this.generateCSVReport(event, reportData, reportType);
                    break;
                default:
                    throw new Error('Định dạng báo cáo không được hỗ trợ');
            }

            const filename = `${this.slugify(event.title)}_${reportType}_${new Date().toISOString().split('T')[0]}.${format}`;

            logger.info(`Report generated: ${filename} for event ${event.title}`);

            return {
                buffer: reportBuffer,
                filename,
                contentType: this.getContentType(format),
                generatedAt: new Date()
            };

        } catch (error) {
            logger.error('Generate event report error:', error);
            throw error;
        }
    }

    // Collect all data needed for event report
    async collectEventReportData(eventId) {
        try {
            const [
                registrations,
                certificates,
                attendanceRecords,
                eventStats
            ] = await Promise.all([
                Registration.find({ event: eventId })
                    .populate('user', 'profile.fullName email student phone')
                    .sort({ registrationDate: 1 }),
                Certificate.find({ event: eventId })
                    .populate('user', 'profile.fullName email'),
                Attendance.find({ event: eventId })
                    .populate('user', 'profile.fullName email')
                    .sort({ timestamp: 1 }),
                this.calculateEventStatistics(eventId)
            ]);

            return {
                registrations,
                certificates,
                attendanceRecords,
                statistics: eventStats
            };

        } catch (error) {
            logger.error('Collect event report data error:', error);
            throw error;
        }
    }

    // Generate Excel report
    async generateExcelReport(event, data, reportType) {
        try {
            const workbook = new ExcelJS.Workbook();

            // Add metadata
            workbook.creator = 'Student Event Management System';
            workbook.created = new Date();
            workbook.title = `Báo cáo ${event.title}`;

            // Overview sheet
            await this.addOverviewSheet(workbook, event, data);

            // Registrations sheet
            if (['comprehensive', 'registration_report'].includes(reportType)) {
                await this.addRegistrationsSheet(workbook, data.registrations);
            }

            // Attendance sheet
            if (['comprehensive', 'attendance_report'].includes(reportType)) {
                await this.addAttendanceSheet(workbook, data.attendanceRecords);
            }

            // Certificates sheet
            if (['comprehensive', 'certificate_report'].includes(reportType)) {
                await this.addCertificatesSheet(workbook, data.certificates);
            }

            // Statistics sheet
            await this.addStatisticsSheet(workbook, data.statistics);

            const buffer = await workbook.xlsx.writeBuffer();
            return buffer;

        } catch (error) {
            logger.error('Generate Excel report error:', error);
            throw error;
        }
    }

    // Add overview sheet to workbook
    async addOverviewSheet(workbook, event, data) {
        const worksheet = workbook.addWorksheet('Tổng quan');

        // Event information
        worksheet.addRow(['THÔNG TIN SỰ KIỆN']);
        worksheet.addRow(['Tên sự kiện:', event.title]);
        worksheet.addRow(['Người tổ chức:', event.organizer.profile.fullName]);
        worksheet.addRow(['Email:', event.organizer.email]);
        worksheet.addRow(['Thể loại:', event.category?.name || 'N/A']);
        worksheet.addRow(['Loại sự kiện:', event.eventType]);
        worksheet.addRow(['Thời gian bắt đầu:', event.schedule.startDate.toLocaleString('vi-VN')]);
        worksheet.addRow(['Thời gian kết thúc:', event.schedule.endDate.toLocaleString('vi-VN')]);
        worksheet.addRow(['Địa điểm:', event.location.venue?.name || event.location.online?.platform || 'Online']);
        worksheet.addRow(['Số lượng tối đa:', event.registration.maxParticipants]);
        worksheet.addRow([]);

        // Statistics
        worksheet.addRow(['THỐNG KÊ']);
        worksheet.addRow(['Tổng đăng ký:', data.statistics.totalRegistrations]);
        worksheet.addRow(['Đã duyệt:', data.statistics.approved]);
        worksheet.addRow(['Đã tham gia:', data.statistics.attended]);
        worksheet.addRow(['Tỷ lệ tham gia:', `${data.statistics.attendanceRate}%`]);
        worksheet.addRow(['Chứng nhận đã cấp:', data.certificates.length]);
        worksheet.addRow(['Đánh giá trung bình:', data.statistics.averageRating]);

        // Style header rows
        worksheet.getRow(1).font = { bold: true, size: 14 };
        worksheet.getRow(12).font = { bold: true, size: 14 };

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 30;
        });
    }

    // Add registrations sheet
    async addRegistrationsSheet(workbook, registrations) {
        const worksheet = workbook.addWorksheet('Danh sách đăng ký');

        // Headers
        const headers = [
            'STT', 'Họ và tên', 'Email', 'Mã sinh viên', 'Khoa', 'Khoa/Bộ môn',
            'Số điện thoại', 'Ngày đăng ký', 'Trạng thái', 'Loại đăng ký',
            'Check-in', 'Thời gian check-in', 'Check-out', 'Thời gian check-out',
            'Thời gian tham gia (phút)', 'Tỷ lệ tham gia (%)', 'Đánh giá', 'Ghi chú'
        ];

        worksheet.addRow(headers);

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        registrations.forEach((reg, index) => {
            const row = [
                index + 1,
                reg.user.profile.fullName,
                reg.user.email,
                reg.user.student?.studentId || '',
                reg.user.student?.faculty || '',
                reg.user.student?.department || '',
                reg.user.phone || '',
                reg.registrationDate.toLocaleDateString('vi-VN'),
                this.getStatusText(reg.status),
                this.getRegistrationTypeText(reg.registrationType),
                reg.attendance.checkedIn ? 'Có' : 'Không',
                reg.attendance.checkInTime
                    ? reg.attendance.checkInTime.toLocaleString('vi-VN')
                    : '',
                reg.attendance.checkedOut ? 'Có' : 'Không',
                reg.attendance.checkOutTime
                    ? reg.attendance.checkOutTime.toLocaleString('vi-VN')
                    : '',
                reg.attendance.duration || 0,
                reg.attendance.attendanceRate || 0,
                reg.feedback.rating || '',
                reg.feedback.comment || ''
            ];

            worksheet.addRow(row);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 15;
        });

        // Add borders
        const lastRow = worksheet.rowCount;
        for (let i = 1; i <= lastRow; i++) {
            const row = worksheet.getRow(i);
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        }
    }

    // Add attendance sheet
    async addAttendanceSheet(workbook, attendanceRecords) {
        const worksheet = workbook.addWorksheet('Lịch sử điểm danh');

        const headers = [
            'STT', 'Họ và tên', 'Email', 'Mã sinh viên', 'Loại',
            'Thời gian', 'Phương thức', 'Địa điểm', 'Thời gian tham gia', 'Ghi chú'
        ];

        worksheet.addRow(headers);

        // Style header
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data
        attendanceRecords.forEach((record, index) => {
            const row = [
                index + 1,
                record.user.profile.fullName,
                record.user.email,
                record.user.student?.studentId || '',
                this.getAttendanceTypeText(record.type),
                record.timestamp.toLocaleString('vi-VN'),
                this.getAttendanceMethodText(record.method),
                record.location || '',
                record.duration || 0,
                record.notes || ''
            ];

            worksheet.addRow(row);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 18;
        });
    }

    // Add certificates sheet
    async addCertificatesSheet(workbook, certificates) {
        const worksheet = workbook.addWorksheet('Chứng nhận');

        const headers = [
            'STT', 'Họ và tên', 'Email', 'Mã chứng nhận', 'Loại chứng nhận',
            'Ngày cấp', 'Trạng thái', 'Số lần xác thực', 'Số lần chia sẻ', 'Điểm training'
        ];

        worksheet.addRow(headers);

        // Style header
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data
        certificates.forEach((cert, index) => {
            const row = [
                index + 1,
                cert.user.profile.fullName,
                cert.user.email,
                cert.certificateId,
                this.getCertificateTypeText(cert.type),
                cert.issuedDate.toLocaleDateString('vi-VN'),
                this.getCertificateStatusText(cert.status),
                cert.verificationCount || 0,
                cert.sharedCount || 0,
                cert.trainingPoints || 0
            ];

            worksheet.addRow(row);
        });

        worksheet.columns.forEach(column => {
            column.width = 20;
        });
    }

    // Add statistics sheet
    async addStatisticsSheet(workbook, statistics) {
        const worksheet = workbook.addWorksheet('Thống kê chi tiết');

        // Overview statistics
        worksheet.addRow(['TỔNG QUAN']);
        worksheet.addRow(['Tổng số đăng ký:', statistics.totalRegistrations]);
        worksheet.addRow(['Đã duyệt:', statistics.approved]);
        worksheet.addRow(['Đang chờ:', statistics.pending]);
        worksheet.addRow(['Đã từ chối:', statistics.rejected]);
        worksheet.addRow(['Đã hủy:', statistics.cancelled]);
        worksheet.addRow(['Đã tham gia:', statistics.attended]);
        worksheet.addRow(['Vắng mặt:', statistics.noShow]);
        worksheet.addRow(['Tỷ lệ tham gia:', `${statistics.attendanceRate}%`]);
        worksheet.addRow([]);

        // Demographic breakdown
        worksheet.addRow(['PHÂN TÍCH THEO KHOA']);
        Object.entries(statistics.byFaculty || {}).forEach(([faculty, count]) => {
            worksheet.addRow([faculty, count]);
        });
        worksheet.addRow([]);

        worksheet.addRow(['PHÂN TÍCH THEO BỘ MÔN']);
        Object.entries(statistics.byDepartment || {}).forEach(([dept, count]) => {
            worksheet.addRow([dept, count]);
        });

        // Style section headers
        [1, 11, 16].forEach(rowNum => {
            const row = worksheet.getRow(rowNum);
            row.font = { bold: true, size: 12 };
        });
    }

    // Generate PDF report
    async generatePDFReport(event, data, reportType) {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));

            // Header
            doc.fontSize(20).font('Helvetica-Bold');
            doc.text('BÁO CÁO SỰ KIỆN', 50, 50);

            doc.fontSize(16).font('Helvetica');
            doc.text(event.title, 50, 80);

            // Event information
            doc.fontSize(12).font('Helvetica-Bold');
            doc.text('Thông tin sự kiện:', 50, 120);

            doc.font('Helvetica');
            doc.text(`Người tổ chức: ${event.organizer.profile.fullName}`, 50, 140);
            doc.text(`Thời gian: ${event.schedule.startDate.toLocaleString('vi-VN')} - ${event.schedule.endDate.toLocaleString('vi-VN')}`, 50, 155);
            doc.text(`Địa điểm: ${event.location.venue?.name || event.location.online?.platform || 'Online'}`, 50, 170);

            // Statistics
            doc.fontSize(12).font('Helvetica-Bold');
            doc.text('Thống kê:', 50, 210);

            doc.font('Helvetica');
            const stats = data.statistics;
            doc.text(`Tổng đăng ký: ${stats.totalRegistrations}`, 50, 230);
            doc.text(`Đã tham gia: ${stats.attended}`, 50, 245);
            doc.text(`Tỷ lệ tham gia: ${stats.attendanceRate}%`, 50, 260);
            doc.text(`Chứng nhận đã cấp: ${data.certificates.length}`, 50, 275);

            // Registrations table (if space allows)
            if (reportType === 'comprehensive' && data.registrations.length <= 20) {
                doc.addPage();
                doc.fontSize(14).font('Helvetica-Bold');
                doc.text('Danh sách đăng ký', 50, 50);

                let yPos = 80;
                data.registrations.forEach((reg, index) => {
                    if (yPos > 700) {
                        doc.addPage();
                        yPos = 50;
                    }

                    doc.fontSize(10).font('Helvetica');
                    doc.text(`${index + 1}. ${reg.user.profile.fullName} (${reg.user.email})`, 50, yPos);
                    doc.text(`   Trạng thái: ${this.getStatusText(reg.status)} | Check-in: ${reg.attendance.checkedIn ? 'Có' : 'Không'}`, 70, yPos + 12);
                    yPos += 30;
                });
            }

            doc.end();

            return new Promise((resolve) => {
                doc.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
            });

        } catch (error) {
            logger.error('Generate PDF report error:', error);
            throw error;
        }
    }

    // Generate CSV report
    async generateCSVReport(event, data, reportType) {
        try {
            let csvContent = '';

            if (reportType === 'registration_report') {
                csvContent = this.generateRegistrationCSV(data.registrations);
            } else if (reportType === 'attendance_report') {
                csvContent = this.generateAttendanceCSV(data.attendanceRecords);
            } else if (reportType === 'certificate_report') {
                csvContent = this.generateCertificateCSV(data.certificates);
            } else {
                // Comprehensive CSV
                csvContent = this.generateComprehensiveCSV(event, data);
            }

            return Buffer.from(csvContent, 'utf8');

        } catch (error) {
            logger.error('Generate CSV report error:', error);
            throw error;
        }
    }

    generateRegistrationCSV(registrations) {
        const headers = [
            'STT', 'Họ và tên', 'Email', 'Mã sinh viên', 'Khoa', 'Bộ môn',
            'Số điện thoại', 'Ngày đăng ký', 'Trạng thái', 'Loại đăng ký',
            'Check-in', 'Thời gian check-in', 'Tỷ lệ tham gia (%)', 'Đánh giá'
        ];

        let csv = headers.join(',') + '\n';

        registrations.forEach((reg, index) => {
            const row = [
                index + 1,
                `"${reg.user.profile.fullName}"`,
                reg.user.email,
                reg.user.student?.studentId || '',
                `"${reg.user.student?.faculty || ''}"`,
                `"${reg.user.student?.department || ''}"`,
                reg.user.phone || '',
                reg.registrationDate.toLocaleDateString('vi-VN'),
                this.getStatusText(reg.status),
                this.getRegistrationTypeText(reg.registrationType),
                reg.attendance.checkedIn ? 'Có' : 'Không',
                reg.attendance.checkInTime
                    ? reg.attendance.checkInTime.toLocaleString('vi-VN')
                    : '',
                reg.attendance.attendanceRate || 0,
                reg.feedback.rating || ''
            ];

            csv += row.join(',') + '\n';
        });

        return csv;
    }

    generateAttendanceCSV(attendanceRecords) {
        const headers = [
            'STT', 'Họ và tên', 'Email', 'Mã sinh viên', 'Loại điểm danh',
            'Thời gian', 'Phương thức', 'Địa điểm', 'Thời gian tham gia (phút)', 'Ghi chú'
        ];

        let csv = headers.join(',') + '\n';

        attendanceRecords.forEach((record, index) => {
            const row = [
                index + 1,
                `"${record.user.profile.fullName}"`,
                record.user.email,
                record.user.student?.studentId || '',
                this.getAttendanceTypeText(record.type),
                record.timestamp.toLocaleString('vi-VN'),
                this.getAttendanceMethodText(record.method),
                `"${record.location || ''}"`,
                record.duration || 0,
                `"${record.notes || ''}"`
            ];

            csv += row.join(',') + '\n';
        });

        return csv;
    }

    generateCertificateCSV(certificates) {
        const headers = [
            'STT', 'Họ và tên', 'Email', 'Mã chứng nhận', 'Loại chứng nhận',
            'Ngày cấp', 'Trạng thái', 'Số lần xác thực', 'Số lần chia sẻ', 'Điểm training'
        ];

        let csv = headers.join(',') + '\n';

        certificates.forEach((cert, index) => {
            const row = [
                index + 1,
                `"${cert.user.profile.fullName}"`,
                cert.user.email,
                cert.certificateId,
                this.getCertificateTypeText(cert.type),
                cert.issuedDate.toLocaleDateString('vi-VN'),
                this.getCertificateStatusText(cert.status),
                cert.verificationCount || 0,
                cert.sharedCount || 0,
                cert.trainingPoints || 0
            ];

            csv += row.join(',') + '\n';
        });

        return csv;
    }

    // Calculate event statistics
    async calculateEventStatistics(eventId) {
        try {
            const cacheKey = `report_stats:${eventId}`;

            let stats = await cacheService.get(cacheKey);
            if (stats) {
                return stats;
            }

            const [
                registrationStats,
                attendanceStats,
                feedbackStats,
                demographicStats
            ] = await Promise.all([
                this.getRegistrationStatistics(eventId),
                this.getAttendanceStatistics(eventId),
                this.getFeedbackStatistics(eventId),
                this.getDemographicStatistics(eventId)
            ]);

            stats = {
                ...registrationStats,
                ...attendanceStats,
                ...feedbackStats,
                ...demographicStats,
                generatedAt: new Date()
            };

            // Cache for 10 minutes
            await cacheService.set(cacheKey, stats, 600);

            return stats;

        } catch (error) {
            logger.error('Calculate event statistics error:', error);
            throw error;
        }
    }

    async getRegistrationStatistics(eventId) {
        const pipeline = [
            { $match: { event: eventId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ];

        const results = await Registration.aggregate(pipeline);
        const stats = {
            totalRegistrations: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            cancelled: 0,
            attended: 0,
            waitlist: 0,
            noShow: 0
        };

        results.forEach(result => {
            stats[result._id] = result.count;
            stats.totalRegistrations += result.count;
        });

        // Calculate rates
        stats.approvalRate = stats.totalRegistrations > 0
            ? Math.round((stats.approved / stats.totalRegistrations) * 100)
            : 0;
        stats.attendanceRate = stats.approved > 0
            ? Math.round((stats.attended / stats.approved) * 100)
            : 0;
        stats.cancellationRate = stats.totalRegistrations > 0
            ? Math.round((stats.cancelled / stats.totalRegistrations) * 100)
            : 0;

        return stats;
    }

    async getAttendanceStatistics(eventId) {
        const registrations = await Registration.find({
            event: eventId,
            'attendance.checkedIn': true
        });

        const attendanceRates = registrations
            .map(r => r.attendance.attendanceRate)
            .filter(rate => rate !== null && rate !== undefined);

        const durations = registrations
            .map(r => r.attendance.duration)
            .filter(duration => duration > 0);

        return {
            totalCheckedIn: registrations.length,
            averageAttendanceRate: attendanceRates.length > 0
                ? Math.round(attendanceRates.reduce((a, b) => a + b, 0) / attendanceRates.length)
                : 0,
            averageDuration: durations.length > 0
                ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
                : 0,
            checkInMethods: this.analyzeCheckInMethods(registrations)
        };
    }

    async getFeedbackStatistics(eventId) {
        const registrations = await Registration.find({
            event: eventId,
            'feedback.submitted': true
        });

        const ratings = registrations
            .map(r => r.feedback.rating)
            .filter(rating => rating > 0);

        const ratingDistribution = {};
        ratings.forEach(rating => {
            ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
        });

        return {
            totalFeedbacks: registrations.length,
            averageRating: ratings.length > 0
                ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
                : 0,
            ratingDistribution,
            feedbackSubmissionRate: registrations.length > 0 ? 100 : 0 // Will be calculated properly in full implementation
        };
    }

    async getDemographicStatistics(eventId) {
        const registrations = await Registration.find({ event: eventId })
            .populate('user', 'student.faculty student.department student.year student.major');

        const demographics = {
            byFaculty: {},
            byDepartment: {},
            byYear: {},
            byMajor: {}
        };

        registrations.forEach(reg => {
            const student = reg.user.student || {};

            const faculty = student.faculty || 'Khác';
            demographics.byFaculty[faculty] = (demographics.byFaculty[faculty] || 0) + 1;

            const department = student.department || 'Khác';
            demographics.byDepartment[department] = (demographics.byDepartment[department] || 0) + 1;

            const year = student.year || 'Khác';
            demographics.byYear[year] = (demographics.byYear[year] || 0) + 1;

            const major = student.major || 'Khác';
            demographics.byMajor[major] = (demographics.byMajor[major] || 0) + 1;
        });

        return demographics;
    }

    // Generate multiple reports batch
    async generateBatchReports(eventIds, reportType, format) {
        try {
            const results = {
                successful: 0,
                failed: 0,
                reports: [],
                errors: []
            };

            for (const eventId of eventIds) {
                try {
                    const report = await this.generateEventReport(eventId, reportType, format);
                    results.reports.push({
                        eventId,
                        filename: report.filename,
                        size: report.buffer.length
                    });
                    results.successful++;

                    // Save to temporary storage
                    await this.saveTemporaryReport(report.filename, report.buffer);

                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        eventId,
                        error: error.message
                    });
                }

                // Small delay between reports
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            logger.info(`Batch reports generated: ${results.successful} successful, ${results.failed} failed`);
            return results;

        } catch (error) {
            logger.error('Generate batch reports error:', error);
            throw error;
        }
    }

    // Generate user activity report
    async generateUserActivityReport(userId, timeRange, format = 'excel') {
        try {
            const user = await User.findById(userId)
                .populate('student.faculty')
                .populate('student.department');

            if (!user) {
                throw new Error('Người dùng không tồn tại');
            }

            const dateRange = this.getDateRange(timeRange);
            const activityData = await this.collectUserActivityData(userId, dateRange);

            let reportBuffer;
            switch (format.toLowerCase()) {
                case 'excel':
                    reportBuffer = await this.generateUserActivityExcel(user, activityData);
                    break;
                case 'pdf':
                    reportBuffer = await this.generateUserActivityPDF(user, activityData);
                    break;
                case 'csv':
                    reportBuffer = await this.generateUserActivityCSV(user, activityData);
                    break;
                default:
                    throw new Error('Định dạng không được hỗ trợ');
            }

            const filename = `hoat_dong_${this.slugify(user.profile.fullName)}_${timeRange}_${new Date().toISOString().split('T')[0]}.${format}`;

            return {
                buffer: reportBuffer,
                filename,
                contentType: this.getContentType(format),
                generatedAt: new Date()
            };

        } catch (error) {
            logger.error('Generate user activity report error:', error);
            throw error;
        }
    }

    async collectUserActivityData(userId, dateRange) {
        try {
            const [
                registrations,
                certificates,
                attendanceHistory
            ] = await Promise.all([
                Registration.find({
                    user: userId,
                    registrationDate: { $gte: dateRange.start, $lte: dateRange.end }
                }).populate('event', 'title eventType schedule location'),
                Certificate.find({
                    user: userId,
                    issuedDate: { $gte: dateRange.start, $lte: dateRange.end }
                }).populate('event', 'title'),
                Attendance.find({
                    user: userId,
                    timestamp: { $gte: dateRange.start, $lte: dateRange.end }
                }).populate('event', 'title')
            ]);

            return {
                registrations,
                certificates,
                attendanceHistory,
                summary: {
                    totalEvents: registrations.length,
                    attendedEvents: registrations.filter(r => r.status === 'attended').length,
                    certificatesEarned: certificates.length,
                    totalTrainingPoints: certificates.reduce((sum, c) => sum + (c.trainingPoints || 0), 0)
                }
            };

        } catch (error) {
            logger.error('Collect user activity data error:', error);
            throw error;
        }
    }

    // System-wide reports
    async generateSystemReport(reportType, timeRange, format = 'excel') {
        try {
            const dateRange = this.getDateRange(timeRange);
            const systemData = await this.collectSystemData(dateRange);

            let reportBuffer;
            switch (format.toLowerCase()) {
                case 'excel':
                    reportBuffer = await this.generateSystemExcelReport(systemData, reportType);
                    break;
                case 'pdf':
                    reportBuffer = await this.generateSystemPDFReport(systemData, reportType);
                    break;
                default:
                    throw new Error('Định dạng không được hỗ trợ');
            }

            const filename = `bao_cao_he_thong_${reportType}_${timeRange}_${new Date().toISOString().split('T')[0]}.${format}`;

            return {
                buffer: reportBuffer,
                filename,
                contentType: this.getContentType(format),
                generatedAt: new Date()
            };

        } catch (error) {
            logger.error('Generate system report error:', error);
            throw error;
        }
    }

    async collectSystemData(dateRange) {
        try {
            const [
                eventStats,
                userStats,
                registrationStats,
                certificateStats
            ] = await Promise.all([
                Event.aggregate([
                    { $match: { createdAt: { $gte: dateRange.start, $lte: dateRange.end } } },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 },
                            totalViews: { $sum: '$stats.views' },
                            totalRegistrations: { $sum: '$stats.registrations' }
                        }
                    }
                ]),
                User.aggregate([
                    { $match: { createdAt: { $gte: dateRange.start, $lte: dateRange.end } } },
                    {
                        $group: {
                            _id: '$role',
                            count: { $sum: 1 }
                        }
                    }
                ]),
                Registration.aggregate([
                    { $match: { registrationDate: { $gte: dateRange.start, $lte: dateRange.end } } },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 }
                        }
                    }
                ]),
                Certificate.aggregate([
                    { $match: { issuedDate: { $gte: dateRange.start, $lte: dateRange.end } } },
                    {
                        $group: {
                            _id: '$type',
                            count: { $sum: 1 },
                            totalVerifications: { $sum: '$verificationCount' }
                        }
                    }
                ])
            ]);

            return {
                events: eventStats,
                users: userStats,
                registrations: registrationStats,
                certificates: certificateStats,
                dateRange
            };

        } catch (error) {
            logger.error('Collect system data error:', error);
            throw error;
        }
    }

    // Utility methods
    getDateRange(timeRange) {
        const now = new Date();
        const ranges = {
            '7d': new Date(now - 7 * 24 * 60 * 60 * 1000),
            '30d': new Date(now - 30 * 24 * 60 * 60 * 1000),
            '90d': new Date(now - 90 * 24 * 60 * 60 * 1000),
            '1y': new Date(now - 365 * 24 * 60 * 60 * 1000)
        };

        return {
            start: ranges[timeRange] || ranges['30d'],
            end: now
        };
    }

    getContentType(format) {
        const contentTypes = {
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'pdf': 'application/pdf',
            'csv': 'text/csv'
        };

        return contentTypes[format.toLowerCase()] || 'application/octet-stream';
    }

    getStatusText(status) {
        const statusTexts = {
            'pending': 'Chờ duyệt',
            'approved': 'Đã duyệt',
            'rejected': 'Đã từ chối',
            'cancelled': 'Đã hủy',
            'attended': 'Đã tham gia',
            'completed': 'Hoàn thành',
            'waitlist': 'Danh sách chờ',
            'no_show': 'Vắng mặt'
        };

        return statusTexts[status] || status;
    }

    getRegistrationTypeText(type) {
        const typeTexts = {
            'individual': 'Cá nhân',
            'group': 'Nhóm',
            'waitlist': 'Danh sách chờ',
            'special': 'Đặc biệt'
        };

        return typeTexts[type] || type;
    }

    getAttendanceTypeText(type) {
        const typeTexts = {
            'check_in': 'Check-in',
            'check_out': 'Check-out',
            'manual_record': 'Ghi nhận thủ công',
            'break_start': 'Bắt đầu nghỉ',
            'break_end': 'Kết thúc nghỉ'
        };

        return typeTexts[type] || type;
    }

    getAttendanceMethodText(method) {
        const methodTexts = {
            'manual': 'Thủ công',
            'qr_code': 'Mã QR',
            'nfc': 'NFC',
            'rfid': 'RFID',
            'biometric': 'Sinh trắc học',
            'mobile_app': 'Ứng dụng di động'
        };

        return methodTexts[method] || method;
    }

    getCertificateTypeText(type) {
        const typeTexts = {
            'participation': 'Tham gia',
            'completion': 'Hoàn thành',
            'achievement': 'Thành tích',
            'excellence': 'Xuất sắc'
        };

        return typeTexts[type] || type;
    }

    getCertificateStatusText(status) {
        const statusTexts = {
            'issued': 'Đã cấp',
            'revoked': 'Đã thu hồi',
            'expired': 'Đã hết hạn',
            'pending': 'Chờ cấp'
        };

        return statusTexts[status] || status;
    }

    analyzeCheckInMethods(registrations) {
        const methods = {};

        registrations.forEach(reg => {
            if (reg.attendance.checkedIn) {
                const method = reg.attendance.checkInMethod || 'manual';
                methods[method] = (methods[method] || 0) + 1;
            }
        });

        return methods;
    }

    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
            .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
            .replace(/[ìíịỉĩ]/g, 'i')
            .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
            .replace(/[ùúụủũưừứựửữ]/g, 'u')
            .replace(/[ỳýỵỷỹ]/g, 'y')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    async saveTemporaryReport(filename, buffer) {
        try {
            const reportsDir = path.join(process.cwd(), 'uploads/reports');
            await fs.mkdir(reportsDir, { recursive: true });

            const filePath = path.join(reportsDir, filename);
            await fs.writeFile(filePath, buffer);

            // Set cleanup after 24 hours
            setTimeout(async () => {
                try {
                    await fs.unlink(filePath);
                } catch (error) {
                    logger.warn(`Failed to cleanup report file: ${filename}`);
                }
            }, 24 * 60 * 60 * 1000);

            return filePath;

        } catch (error) {
            logger.error('Save temporary report error:', error);
            throw error;
        }
    }

    // Schedule report generation
    async scheduleReport(reportConfig, scheduleData) {
        try {
            const scheduledReport = {
                id: this.generateReportId(),
                config: reportConfig,
                schedule: scheduleData,
                createdAt: new Date(),
                status: 'scheduled'
            };

            // Store in cache for background processing
            await cacheService.set(
                `scheduled_report:${scheduledReport.id}`,
                scheduledReport,
                7 * 24 * 60 * 60 // 7 days
            );

            logger.info(`Report scheduled: ${scheduledReport.id}`);
            return scheduledReport;

        } catch (error) {
            logger.error('Schedule report error:', error);
            throw error;
        }
    }

    generateReportId() {
        return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async getScheduledReports(userId = null) {
        try {
            // This would typically come from a proper database
            // For now, return cached scheduled reports
            const keys = await redisClient.keys('scheduled_report:*');
            const reports = [];

            for (const key of keys) {
                const report = await cacheService.get(key.replace(cacheService.keyPrefix, ''));
                if (report && (!userId || report.config.userId === userId)) {
                    reports.push(report);
                }
            }

            return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        } catch (error) {
            logger.error('Get scheduled reports error:', error);
            return [];
        }
    }

    // Report templates
    getAvailableReportTemplates() {
        return Object.entries(this.reportTemplates).map(([key, name]) => ({
            key,
            name,
            description: this.getTemplateDescription(key)
        }));
    }

    getTemplateDescription(templateKey) {
        const descriptions = {
            'event_summary': 'Tổng quan về sự kiện bao gồm đăng ký, tham gia và phản hồi',
            'attendance_report': 'Chi tiết về điểm danh và thời gian tham gia',
            'registration_report': 'Danh sách và thống kê đăng ký',
            'certificate_report': 'Thông tin về chứng nhận đã cấp',
            'user_activity': 'Hoạt động của người dùng trong hệ thống',
            'financial_report': 'Báo cáo tài chính và thanh toán',
            'performance_analysis': 'Phân tích hiệu suất và xu hướng'
        };

        return descriptions[templateKey] || 'Báo cáo tùy chỉnh';
    }
}

module.exports = new ReportService();