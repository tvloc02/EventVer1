const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const Event = require('../../models/Event');
const Registration = require('../../models/Registration');
const User = require('../../models/User');
const Certificate = require('../../models/Certificate');
const cacheService = require('../cacheService');
const logger = require('../../utils/logger');

class ExportService {
    constructor() {
        this.exportFormats = ['excel', 'csv', 'json', 'xml'];
        this.maxExportSize = 10000; // Max 10k records per export
    }

    // Export events data
    async exportEvents(filters = {}, format = 'excel', options = {}) {
        try {
            const {
                page = 1,
                limit = this.maxExportSize,
                includeStats = true,
                includeRegistrations = false
            } = options;

            // Build query
            const query = this.buildEventQuery(filters);

            // Get events
            let eventsQuery = Event.find(query)
                .populate('organizer', 'profile.fullName email')
                .populate('category', 'name color')
                .populate('coOrganizers', 'profile.fullName email')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const events = await eventsQuery.exec();

            if (events.length === 0) {
                throw new Error('Không có dữ liệu để xuất');
            }

            // Include registration data if requested
            if (includeRegistrations) {
                for (const event of events) {
                    event.registrationData = await Registration.find({ event: event._id })
                        .populate('user', 'profile.fullName email student')
                        .select('user status registrationDate attendance payment');
                }
            }

            let exportData;
            switch (format.toLowerCase()) {
                case 'excel':
                    exportData = await this.generateEventsExcel(events, options);
                    break;
                case 'csv':
                    exportData = await this.generateEventsCSV(events, options);
                    break;
                case 'json':
                    exportData = await this.generateEventsJSON(events, options);
                    break;
                case 'xml':
                    exportData = await this.generateEventsXML(events, options);
                    break;
                default:
                    throw new Error('Định dạng xuất không được hỗ trợ');
            }

            const filename = `su_kien_${new Date().toISOString().split('T')[0]}.${format}`;

            logger.info(`Events exported: ${events.length} events in ${format} format`);

            return {
                buffer: exportData,
                filename,
                contentType: this.getContentType(format),
                recordCount: events.length,
                generatedAt: new Date()
            };

        } catch (error) {
            logger.error('Export events error:', error);
            throw error;
        }
    }

    // Export users data
    async exportUsers(filters = {}, format = 'excel', options = {}) {
        try {
            const {
                page = 1,
                limit = this.maxExportSize,
                includeActivity = false,
                includeRegistrations = false
            } = options;

            const query = this.buildUserQuery(filters);

            const users = await User.find(query)
                .select('-password -oauth -emailVerificationToken -passwordResetToken')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            if (users.length === 0) {
                throw new Error('Không có dữ liệu để xuất');
            }

            // Include activity data if requested
            if (includeActivity || includeRegistrations) {
                for (const user of users) {
                    if (includeRegistrations) {
                        user.registrationData = await Registration.find({ user: user._id })
                            .populate('event', 'title eventType schedule')
                            .select('event status registrationDate attendance');
                    }

                    if (includeActivity) {
                        user.activityData = {
                            totalEvents: await Registration.countDocuments({ user: user._id }),
                            attendedEvents: await Registration.countDocuments({
                                user: user._id,
                                status: 'attended'
                            }),
                            certificatesEarned: await Certificate.countDocuments({ user: user._id })
                        };
                    }
                }
            }

            let exportData;
            switch (format.toLowerCase()) {
                case 'excel':
                    exportData = await this.generateUsersExcel(users, options);
                    break;
                case 'csv':
                    exportData = await this.generateUsersCSV(users, options);
                    break;
                case 'json':
                    exportData = await this.generateUsersJSON(users, options);
                    break;
                case 'xml':
                    exportData = await this.generateUsersXML(users, options);
                    break;
                default:
                    throw new Error('Định dạng xuất không được hỗ trợ');
            }

            const filename = `nguoi_dung_${new Date().toISOString().split('T')[0]}.${format}`;

            logger.info(`Users exported: ${users.length} users in ${format} format`);

            return {
                buffer: exportData,
                filename,
                contentType: this.getContentType(format),
                recordCount: users.length,
                generatedAt: new Date()
            };

        } catch (error) {
            logger.error('Export users error:', error);
            throw error;
        }
    }

    // Export registrations data
    async exportRegistrations(filters = {}, format = 'excel', options = {}) {
        try {
            const {
                page = 1,
                limit = this.maxExportSize,
                includeUserDetails = true,
                includeEventDetails = true
            } = options;

            const query = this.buildRegistrationQuery(filters);

            let registrationsQuery = Registration.find(query)
                .sort({ registrationDate: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            if (includeUserDetails) {
                registrationsQuery = registrationsQuery.populate('user', 'profile email student phone');
            }

            if (includeEventDetails) {
                registrationsQuery = registrationsQuery.populate('event', 'title eventType schedule location organizer');
            }

            const registrations = await registrationsQuery.exec();

            if (registrations.length === 0) {
                throw new Error('Không có dữ liệu để xuất');
            }

            let exportData;
            switch (format.toLowerCase()) {
                case 'excel':
                    exportData = await this.generateRegistrationsExcel(registrations, options);
                    break;
                case 'csv':
                    exportData = await this.generateRegistrationsCSV(registrations, options);
                    break;
                case 'json':
                    exportData = await this.generateRegistrationsJSON(registrations, options);
                    break;
                default:
                    throw new Error('Định dạng xuất không được hỗ trợ');
            }

            const filename = `dang_ky_${new Date().toISOString().split('T')[0]}.${format}`;

            return {
                buffer: exportData,
                filename,
                contentType: this.getContentType(format),
                recordCount: registrations.length,
                generatedAt: new Date()
            };

        } catch (error) {
            logger.error('Export registrations error:', error);
            throw error;
        }
    }

    // Export certificates data
    async exportCertificates(filters = {}, format = 'excel', options = {}) {
        try {
            const query = this.buildCertificateQuery(filters);

            const certificates = await Certificate.find(query)
                .populate('user', 'profile.fullName email student')
                .populate('event', 'title eventType schedule')
                .populate('issuedBy', 'profile.fullName email')
                .sort({ issuedDate: -1 })
                .limit(this.maxExportSize);

            if (certificates.length === 0) {
                throw new Error('Không có dữ liệu để xuất');
            }

            let exportData;
            switch (format.toLowerCase()) {
                case 'excel':
                    exportData = await this.generateCertificatesExcel(certificates, options);
                    break;
                case 'csv':
                    exportData = await this.generateCertificatesCSV(certificates, options);
                    break;
                case 'json':
                    exportData = await this.generateCertificatesJSON(certificates, options);
                    break;
                default:
                    throw new Error('Định dạng xuất không được hỗ trợ');
            }

            const filename = `chung_nhan_${new Date().toISOString().split('T')[0]}.${format}`;

            return {
                buffer: exportData,
                filename,
                contentType: this.getContentType(format),
                recordCount: certificates.length,
                generatedAt: new Date()
            };

        } catch (error) {
            logger.error('Export certificates error:', error);
            throw error;
        }
    }

    // Generate Excel workbook for events
    async generateEventsExcel(events, options = {}) {
        try {
            const workbook = new ExcelJS.Workbook();

            // Events overview sheet
            const overviewSheet = workbook.addWorksheet('Tổng quan sự kiện');

            const headers = [
                'STT', 'Tên sự kiện', 'Người tổ chức', 'Thể loại', 'Loại sự kiện',
                'Ngày tạo', 'Ngày bắt đầu', 'Ngày kết thúc', 'Địa điểm', 'Trạng thái',
                'Số lượng tối đa', 'Đã đăng ký', 'Đã tham gia', 'Tỷ lệ tham gia (%)',
                'Lượt xem', 'Đánh giá TB', 'Số đánh giá'
            ];

            overviewSheet.addRow(headers);

            // Style header
            const headerRow = overviewSheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            headerRow.font.color = { argb: 'FFFFFFFF' };

            // Add event data
            events.forEach((event, index) => {
                const attendanceRate = event.stats.registrations > 0
                    ? Math.round((event.stats.attendees / event.stats.registrations) * 100)
                    : 0;

                const row = [
                    index + 1,
                    event.title,
                    event.organizer.profile.fullName,
                    event.category?.name || '',
                    event.eventType,
                    event.createdAt.toLocaleDateString('vi-VN'),
                    event.schedule.startDate.toLocaleDateString('vi-VN'),
                    event.schedule.endDate.toLocaleDateString('vi-VN'),
                    event.location.venue?.name || event.location.online?.platform || 'Online',
                    this.getEventStatusText(event.status),
                    event.registration.maxParticipants,
                    event.stats.registrations || 0,
                    event.stats.attendees || 0,
                    attendanceRate,
                    event.stats.views || 0,
                    event.stats.averageRating || 0,
                    event.stats.totalRatings || 0
                ];

                overviewSheet.addRow(row);
            });

            // Auto-fit columns
            overviewSheet.columns.forEach(column => {
                column.width = 15;
            });

            // Add registration details if included
            if (options.includeRegistrations) {
                for (const event of events) {
                    if (event.registrationData && event.registrationData.length > 0) {
                        const regSheet = workbook.addWorksheet(`Đăng ký - ${event.title.substring(0, 25)}`);
                        await this.addRegistrationDataToSheet(regSheet, event.registrationData);
                    }
                }
            }

            return await workbook.xlsx.writeBuffer();

        } catch (error) {
            logger.error('Generate events Excel error:', error);
            throw error;
        }
    }

    // Generate Excel for users
    async generateUsersExcel(users, options = {}) {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Danh sách người dùng');

            const headers = [
                'STT', 'Họ và tên', 'Email', 'Tên đăng nhập', 'Vai trò',
                'Mã sinh viên', 'Khoa', 'Bộ môn', 'Chuyên ngành', 'Năm học',
                'Số điện thoại', 'Ngày tham gia', 'Lần đăng nhập cuối',
                'Trạng thái', 'Email đã xác thực'
            ];

            if (options.includeActivity) {
                headers.push('Tổng sự kiện', 'Đã tham gia', 'Chứng nhận');
            }

            worksheet.addRow(headers);

            // Style header
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            headerRow.font.color = { argb: 'FFFFFFFF' };

            // Add user data
            users.forEach((user, index) => {
                const row = [
                    index + 1,
                    user.profile.fullName,
                    user.email,
                    user.username,
                    this.getRoleText(user.role),
                    user.student?.studentId || '',
                    user.student?.faculty || '',
                    user.student?.department || '',
                    user.student?.major || '',
                    user.student?.year || '',
                    user.phone || '',
                    user.createdAt.toLocaleDateString('vi-VN'),
                    user.lastLogin ? user.lastLogin.toLocaleDateString('vi-VN') : 'Chưa đăng nhập',
                    this.getUserStatusText(user.status),
                    user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'
                ];

                if (options.includeActivity && user.activityData) {
                    row.push(
                        user.activityData.totalEvents,
                        user.activityData.attendedEvents,
                        user.activityData.certificatesEarned
                    );
                }

                worksheet.addRow(row);
            });

            // Auto-fit columns
            worksheet.columns.forEach(column => {
                column.width = 15;
            });

            return await workbook.xlsx.writeBuffer();

        } catch (error) {
            logger.error('Generate users Excel error:', error);
            throw error;
        }
    }

    // Generate Excel for registrations
    async generateRegistrationsExcel(registrations, options = {}) {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Danh sách đăng ký');

            const headers = [
                'STT', 'Họ và tên', 'Email', 'Mã sinh viên', 'Khoa', 'Bộ môn',
                'Tên sự kiện', 'Loại sự kiện', 'Ngày đăng ký', 'Trạng thái',
                'Loại đăng ký', 'Check-in', 'Thời gian check-in', 'Check-out',
                'Thời gian check-out', 'Thời gian tham gia', 'Tỷ lệ tham gia',
                'Đánh giá', 'Nhận xét', 'Thanh toán'
            ];

            worksheet.addRow(headers);

            // Style header
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            headerRow.font.color = { argb: 'FFFFFFFF' };

            // Add registration data
            registrations.forEach((reg, index) => {
                const row = [
                    index + 1,
                    reg.user?.profile?.fullName || '',
                    reg.user?.email || '',
                    reg.user?.student?.studentId || '',
                    reg.user?.student?.faculty || '',
                    reg.user?.student?.department || '',
                    reg.event?.title || '',
                    reg.event?.eventType || '',
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
                    reg.feedback.comment || '',
                    this.getPaymentStatusText(reg.payment.status)
                ];

                worksheet.addRow(row);
            });

            worksheet.columns.forEach(column => {
                column.width = 15;
            });

            return await workbook.xlsx.writeBuffer();

        } catch (error) {
            logger.error('Generate registrations Excel error:', error);
            throw error;
        }
    }

    // Generate CSV exports
    async generateEventsCSV(events, options = {}) {
        try {
            const headers = [
                'STT', 'Tên sự kiện', 'Người tổ chức', 'Email tổ chức', 'Thể loại',
                'Loại sự kiện', 'Ngày tạo', 'Ngày bắt đầu', 'Ngày kết thúc',
                'Địa điểm', 'Trạng thái', 'Số lượng tối đa', 'Đã đăng ký',
                'Đã tham gia', 'Tỷ lệ tham gia (%)', 'Lượt xem', 'Đánh giá TB'
            ];

            let csv = headers.join(',') + '\n';

            events.forEach((event, index) => {
                const attendanceRate = event.stats.registrations > 0
                    ? Math.round((event.stats.attendees / event.stats.registrations) * 100)
                    : 0;

                const row = [
                    index + 1,
                    `"${event.title}"`,
                    `"${event.organizer.profile.fullName}"`,
                    event.organizer.email,
                    `"${event.category?.name || ''}"`,
                    event.eventType,
                    event.createdAt.toLocaleDateString('vi-VN'),
                    event.schedule.startDate.toLocaleDateString('vi-VN'),
                    event.schedule.endDate.toLocaleDateString('vi-VN'),
                    `"${event.location.venue?.name || event.location.online?.platform || 'Online'}"`,
                    this.getEventStatusText(event.status),
                    event.registration.maxParticipants,
                    event.stats.registrations || 0,
                    event.stats.attendees || 0,
                    attendanceRate,
                    event.stats.views || 0,
                    event.stats.averageRating || 0
                ];

                csv += row.join(',') + '\n';
            });

            return Buffer.from(csv, 'utf8');

        } catch (error) {
            logger.error('Generate events CSV error:', error);
            throw error;
        }
    }

    async generateUsersCSV(users, options = {}) {
        try {
            const headers = [
                'STT', 'Họ và tên', 'Email', 'Tên đăng nhập', 'Vai trò',
                'Mã sinh viên', 'Khoa', 'Bộ môn', 'Chuyên ngành', 'Năm học',
                'Số điện thoại', 'Ngày tham gia', 'Lần đăng nhập cuối', 'Trạng thái'
            ];

            if (options.includeActivity) {
                headers.push('Tổng sự kiện', 'Đã tham gia', 'Chứng nhận');
            }

            let csv = headers.join(',') + '\n';

            users.forEach((user, index) => {
                const row = [
                    index + 1,
                    `"${user.profile.fullName}"`,
                    user.email,
                    user.username,
                    this.getRoleText(user.role),
                    user.student?.studentId || '',
                    `"${user.student?.faculty || ''}"`,
                    `"${user.student?.department || ''}"`,
                    `"${user.student?.major || ''}"`,
                    user.student?.year || '',
                    user.phone || '',
                    user.createdAt.toLocaleDateString('vi-VN'),
                    user.lastLogin ? user.lastLogin.toLocaleDateString('vi-VN') : '',
                    this.getUserStatusText(user.status)
                ];

                if (options.includeActivity && user.activityData) {
                    row.push(
                        user.activityData.totalEvents,
                        user.activityData.attendedEvents,
                        user.activityData.certificatesEarned
                    );
                }

                csv += row.join(',') + '\n';
            });

            return Buffer.from(csv, 'utf8');

        } catch (error) {
            logger.error('Generate users CSV error:', error);
            throw error;
        }
    }

    // Generate JSON exports
    async generateEventsJSON(events, options = {}) {
        try {
            const exportData = {
                metadata: {
                    exportType: 'events',
                    generatedAt: new Date().toISOString(),
                    recordCount: events.length,
                    options
                },
                data: events.map(event => ({
                    id: event._id,
                    title: event.title,
                    description: event.description.short,
                    organizer: {
                        id: event.organizer._id,
                        name: event.organizer.profile.fullName,
                        email: event.organizer.email
                    },
                    category: event.category?.name,
                    eventType: event.eventType,
                    schedule: {
                        startDate: event.schedule.startDate,
                        endDate: event.schedule.endDate,
                        duration: event.schedule.duration
                    },
                    location: {
                        type: event.location.type,
                        venue: event.location.venue?.name,
                        online: event.location.online?.platform
                    },
                    registration: {
                        maxParticipants: event.registration.maxParticipants,
                        currentRegistrations: event.stats.registrations || 0
                    },
                    statistics: event.stats,
                    status: event.status,
                    createdAt: event.createdAt,
                    registrations: options.includeRegistrations ? event.registrationData : undefined
                }))
            };

            return Buffer.from(JSON.stringify(exportData, null, 2), 'utf8');

        } catch (error) {
            logger.error('Generate events JSON error:', error);
            throw error;
        }
    }

    // Bulk export with compression
    async bulkExport(exportRequests, format = 'zip') {
        try {
            const tempDir = path.join(process.cwd(), 'uploads/temp');
            await fs.mkdir(tempDir, { recursive: true });

            const exportResults = [];
            const timestamp = new Date().toISOString().split('T')[0];

            // Generate individual exports
            for (const request of exportRequests) {
                try {
                    let exportResult;

                    switch (request.type) {
                        case 'events':
                            exportResult = await this.exportEvents(request.filters, request.format, request.options);
                            break;
                        case 'users':
                            exportResult = await this.exportUsers(request.filters, request.format, request.options);
                            break;
                        case 'registrations':
                            exportResult = await this.exportRegistrations(request.filters, request.format, request.options);
                            break;
                        case 'certificates':
                            exportResult = await this.exportCertificates(request.filters, request.format, request.options);
                            break;
                        default:
                            continue;
                    }

                    // Save to temp directory
                    const tempFilePath = path.join(tempDir, exportResult.filename);
                    await fs.writeFile(tempFilePath, exportResult.buffer);

                    exportResults.push({
                        filename: exportResult.filename,
                        path: tempFilePath,
                        size: exportResult.buffer.length,
                        recordCount: exportResult.recordCount
                    });

                } catch (error) {
                    logger.error(`Failed to export ${request.type}:`, error);
                }
            }

            if (exportResults.length === 0) {
                throw new Error('Không có dữ liệu nào được xuất thành công');
            }

            // Create ZIP archive
            if (format === 'zip') {
                const zipBuffer = await this.createZipArchive(exportResults);

                // Cleanup temp files
                await this.cleanupTempFiles(exportResults.map(r => r.path));

                return {
                    buffer: zipBuffer,
                    filename: `xuat_du_lieu_${timestamp}.zip`,
                    contentType: 'application/zip',
                    files: exportResults.map(r => ({
                        filename: r.filename,
                        size: r.size,
                        records: r.recordCount
                    }))
                };
            }

            return { exportResults };

        } catch (error) {
            logger.error('Bulk export error:', error);
            throw error;
        }
    }

    // Create ZIP archive
    async createZipArchive(files) {
        try {
            return new Promise((resolve, reject) => {
                const chunks = [];
                const archive = archiver('zip', { zlib: { level: 9 } });

                archive.on('data', chunk => chunks.push(chunk));
                archive.on('end', () => resolve(Buffer.concat(chunks)));
                archive.on('error', reject);

                // Add files to archive
                files.forEach(file => {
                    archive.file(file.path, { name: file.filename });
                });

                archive.finalize();
            });

        } catch (error) {
            logger.error('Create ZIP archive error:', error);
            throw error;
        }
    }

    // Import data from Excel/CSV
    async importData(fileBuffer, dataType, options = {}) {
        try {
            const {
                format,
                validateOnly = false,
                skipErrors = false
            } = options;

            let importData;

            if (format === 'excel') {
                importData = await this.parseExcelFile(fileBuffer, dataType);
            } else if (format === 'csv') {
                importData = await this.parseCSVFile(fileBuffer, dataType);
            } else {
                throw new Error('Định dạng tệp không được hỗ trợ');
            }

            // Validate data
            const validation = await this.validateImportData(importData, dataType);

            if (!validation.valid && !skipErrors) {
                return {
                    success: false,
                    errors: validation.errors,
                    validRecords: validation.validRecords,
                    invalidRecords: validation.invalidRecords
                };
            }

            if (validateOnly) {
                return {
                    success: true,
                    message: 'Dữ liệu hợp lệ',
                    totalRecords: importData.length,
                    validRecords: validation.validRecords,
                    invalidRecords: validation.invalidRecords
                };
            }

            // Process import
            const result = await this.processImport(validation.validData, dataType);

            logger.info(`Data imported: ${result.successful} records of type ${dataType}`);

            return result;

        } catch (error) {
            logger.error('Import data error:', error);
            throw error;
        }
    }

    // Template downloads
    async getImportTemplate(dataType, format = 'excel') {
        try {
            const templates = {
                users: {
                    headers: [
                        'Họ và tên', 'Email', 'Tên đăng nhập', 'Mã sinh viên',
                        'Khoa', 'Bộ môn', 'Chuyên ngành', 'Năm học', 'Số điện thoại', 'Vai trò'
                    ],
                    sampleData: [
                        'Nguyễn Văn A', 'a@student.edu.vn', 'nguyenvana', 'SV001',
                        'Công nghệ thông tin', 'Khoa học máy tính', 'CNTT', '2023', '0123456789', 'student'
                    ]
                },
                events: {
                    headers: [
                        'Tên sự kiện', 'Mô tả ngắn', 'Loại sự kiện', 'Ngày bắt đầu',
                        'Ngày kết thúc', 'Địa điểm', 'Số lượng tối đa', 'Phí tham gia'
                    ],
                    sampleData: [
                        'Hội thảo AI', 'Hội thảo về trí tuệ nhân tạo', 'seminar',
                        '2024-12-15', '2024-12-15', 'Hội trường A', '100', '0'
                    ]
                }
            };

            const template = templates[dataType];
            if (!template) {
                throw new Error('Loại dữ liệu không được hỗ trợ');
            }

            let templateBuffer;

            if (format === 'excel') {
                templateBuffer = await this.generateExcelTemplate(template);
            } else if (format === 'csv') {
                templateBuffer = await this.generateCSVTemplate(template);
            } else {
                throw new Error('Định dạng template không được hỗ trợ');
            }

            return {
                buffer: templateBuffer,
                filename: `template_${dataType}.${format}`,
                contentType: this.getContentType(format)
            };

        } catch (error) {
            logger.error('Get import template error:', error);
            throw error;
        }
    }

    async generateExcelTemplate(template) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Template');

        // Add headers
        worksheet.addRow(template.headers);

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add sample data
        if (template.sampleData) {
            worksheet.addRow(template.sampleData);

            // Style sample row
            const sampleRow = worksheet.getRow(2);
            sampleRow.font = { italic: true };
        }

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        return await workbook.xlsx.writeBuffer();
    }

    // Utility methods
    buildEventQuery(filters) {
        const query = {};

        if (filters.status) {
            query.status = Array.isArray(filters.status)
                ? { $in: filters.status }
                : filters.status;
        }

        if (filters.eventType) {
            query.eventType = filters.eventType;
        }

        if (filters.category) {
            query.category = filters.category;
        }

        if (filters.organizer) {
            query.organizer = filters.organizer;
        }

        if (filters.startDate && filters.endDate) {
            query['schedule.startDate'] = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        }

        return query;
    }

    buildUserQuery(filters) {
        const query = {};

        if (filters.role) {
            query.role = Array.isArray(filters.role)
                ? { $in: filters.role }
                : filters.role;
        }

        if (filters.faculty) {
            query['student.faculty'] = filters.faculty;
        }

        if (filters.department) {
            query['student.department'] = filters.department;
        }

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.verified !== undefined) {
            query.emailVerified = filters.verified;
        }

        if (filters.joinedAfter) {
            query.createdAt = { $gte: new Date(filters.joinedAfter) };
        }

        return query;
    }

    buildRegistrationQuery(filters) {
        const query = {};

        if (filters.event) {
            query.event = filters.event;
        }

        if (filters.user) {
            query.user = filters.user;
        }

        if (filters.status) {
            query.status = Array.isArray(filters.status)
                ? { $in: filters.status }
                : filters.status;
        }

        if (filters.registrationType) {
            query.registrationType = filters.registrationType;
        }

        if (filters.startDate && filters.endDate) {
            query.registrationDate = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        }

        if (filters.attended !== undefined) {
            query['attendance.checkedIn'] = filters.attended;
        }

        return query;
    }

    buildCertificateQuery(filters) {
        const query = {};

        if (filters.event) {
            query.event = filters.event;
        }

        if (filters.user) {
            query.user = filters.user;
        }

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.issuedAfter) {
            query.issuedDate = { $gte: new Date(filters.issuedAfter) };
        }

        return query;
    }

    getContentType(format) {
        const contentTypes = {
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv': 'text/csv',
            'json': 'application/json',
            'xml': 'application/xml',
            'zip': 'application/zip'
        };

        return contentTypes[format.toLowerCase()] || 'application/octet-stream';
    }

    getEventStatusText(status) {
        const statusTexts = {
            'draft': 'Bản nháp',
            'published': 'Đã xuất bản',
            'ongoing': 'Đang diễn ra',
            'completed': 'Đã hoàn thành',
            'cancelled': 'Đã hủy',
            'postponed': 'Đã hoãn'
        };

        return statusTexts[status] || status;
    }

    getRoleText(role) {
        const roleTexts = {
            'student': 'Sinh viên',
            'organizer': 'Người tổ chức',
            'moderator': 'Kiểm duyệt viên',
            'admin': 'Quản trị viên'
        };

        return roleTexts[role] || role;
    }

    getUserStatusText(status) {
        const statusTexts = {
            'active': 'Hoạt động',
            'inactive': 'Không hoạt động',
            'suspended': 'Tạm khóa',
            'pending': 'Chờ kích hoạt'
        };

        return statusTexts[status] || status;
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

    getPaymentStatusText(status) {
        const statusTexts = {
            'pending': 'Chờ thanh toán',
            'paid': 'Đã thanh toán',
            'failed': 'Thất bại',
            'refunded': 'Đã hoàn tiền',
            'free': 'Miễn phí'
        };

        return statusTexts[status] || status;
    }

    async cleanupTempFiles(filePaths) {
        try {
            await Promise.all(filePaths.map(async (filePath) => {
                try {
                    await fs.unlink(filePath);
                } catch (error) {
                    logger.warn(`Failed to cleanup temp file: ${filePath}`);
                }
            }));
        } catch (error) {
            logger.error('Cleanup temp files error:', error);
        }
    }

    // Advanced export features
    async exportWithTemplate(templateId, data, format = 'excel') {
        try {
            // Load custom template
            const template = await this.loadExportTemplate(templateId);

            if (!template) {
                throw new Error('Template không tồn tại');
            }

            // Apply template to data
            const processedData = await this.applyTemplate(template, data);

            // Generate export based on format
            let exportBuffer;
            switch (format.toLowerCase()) {
                case 'excel':
                    exportBuffer = await this.generateTemplatedExcel(template, processedData);
                    break;
                case 'csv':
                    exportBuffer = await this.generateTemplatedCSV(template, processedData);
                    break;
                default:
                    throw new Error('Định dạng không được hỗ trợ cho template');
            }

            return {
                buffer: exportBuffer,
                filename: `${template.name}_${new Date().toISOString().split('T')[0]}.${format}`,
                contentType: this.getContentType(format)
            };

        } catch (error) {
            logger.error('Export with template error:', error);
            throw error;
        }
    }

    async loadExportTemplate(templateId) {
        try {
            // This would load from database in a real implementation
            const templates = {
                'student_list': {
                    name: 'Danh sách sinh viên',
                    type: 'users',
                    columns: [
                        { key: 'profile.fullName', header: 'Họ và tên', width: 25 },
                        { key: 'email', header: 'Email', width: 30 },
                        { key: 'student.studentId', header: 'Mã sinh viên', width: 15 },
                        { key: 'student.faculty', header: 'Khoa', width: 30 },
                        { key: 'student.department', header: 'Bộ môn', width: 30 }
                    ]
                },
                'event_attendance': {
                    name: 'Điểm danh sự kiện',
                    type: 'registrations',
                    columns: [
                        { key: 'user.profile.fullName', header: 'Họ và tên', width: 25 },
                        { key: 'user.student.studentId', header: 'Mã sinh viên', width: 15 },
                        { key: 'attendance.checkedIn', header: 'Check-in', width: 10 },
                        { key: 'attendance.checkInTime', header: 'Thời gian', width: 20 },
                        { key: 'attendance.attendanceRate', header: 'Tỷ lệ (%)', width: 10 }
                    ]
                }
            };

            return templates[templateId] || null;

        } catch (error) {
            logger.error('Load export template error:', error);
            return null;
        }
    }

    async applyTemplate(template, data) {
        try {
            return data.map(item => {
                const processedItem = {};

                template.columns.forEach(column => {
                    const value = this.getNestedValue(item, column.key);
                    processedItem[column.header] = this.formatValue(value, column);
                });

                return processedItem;
            });

        } catch (error) {
            logger.error('Apply template error:', error);
            throw error;
        }
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : '';
        }, obj);
    }

    formatValue(value, column) {
        if (value === null || value === undefined) {
            return '';
        }

        // Format based on column type or key
        if (column.key.includes('Date') || column.key.includes('Time')) {
            return value instanceof Date ? value.toLocaleString('vi-VN') : value;
        }

        if (typeof value === 'boolean') {
            return value ? 'Có' : 'Không';
        }

        return value.toString();
    }

    // Export job management
    async createExportJob(jobData) {
        try {
            const job = {
                id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...jobData,
                status: 'queued',
                createdAt: new Date(),
                progress: 0
            };

            // Store job in cache
            await cacheService.set(`export_job:${job.id}`, job, 24 * 60 * 60); // 24 hours

            // Queue for background processing
            await this.queueExportJob(job);

            return job;

        } catch (error) {
            logger.error('Create export job error:', error);
            throw error;
        }
    }

    async queueExportJob(job) {
        try {
            // Add to processing queue
            await cacheService.lPush('export_queue', job);

            logger.info(`Export job queued: ${job.id}`);
            return true;

        } catch (error) {
            logger.error('Queue export job error:', error);
            return false;
        }
    }

    async getExportJobStatus(jobId) {
        try {
            const job = await cacheService.get(`export_job:${jobId}`);

            if (!job) {
                return { status: 'not_found' };
            }

            return job;

        } catch (error) {
            logger.error('Get export job status error:', error);
            return { status: 'error' };
        }
    }

    async processExportQueue() {
        try {
            const queueLength = await cacheService.lLen('export_queue');

            if (queueLength === 0) {
                return 0;
            }

            let processed = 0;
            const maxProcessPerRun = 5;

            for (let i = 0; i < Math.min(queueLength, maxProcessPerRun); i++) {
                const job = await cacheService.lPop('export_queue');

                if (job) {
                    await this.executeExportJob(job);
                    processed++;
                }
            }

            logger.info(`Processed ${processed} export jobs`);
            return processed;

        } catch (error) {
            logger.error('Process export queue error:', error);
            return 0;
        }
    }

    async executeExportJob(job) {
        try {
            // Update job status
            job.status = 'processing';
            job.startedAt = new Date();
            await cacheService.set(`export_job:${job.id}`, job, 24 * 60 * 60);

            // Execute export based on job type
            let result;
            switch (job.type) {
                case 'events':
                    result = await this.exportEvents(job.filters, job.format, job.options);
                    break;
                case 'users':
                    result = await this.exportUsers(job.filters, job.format, job.options);
                    break;
                case 'registrations':
                    result = await this.exportRegistrations(job.filters, job.format, job.options);
                    break;
                case 'certificates':
                    result = await this.exportCertificates(job.filters, job.format, job.options);
                    break;
                default:
                    throw new Error('Loại export không được hỗ trợ');
            }

            // Save export file
            const filePath = await this.saveExportFile(result.filename, result.buffer);

            // Update job completion
            job.status = 'completed';
            job.completedAt = new Date();
            job.filePath = filePath;
            job.fileSize = result.buffer.length;
            job.recordCount = result.recordCount;
            job.progress = 100;

            await cacheService.set(`export_job:${job.id}`, job, 24 * 60 * 60);

            logger.info(`Export job completed: ${job.id}`);

        } catch (error) {
            logger.error(`Export job failed: ${job.id}`, error);

            // Update job failure
            job.status = 'failed';
            job.error = error.message;
            job.failedAt = new Date();
            await cacheService.set(`export_job:${job.id}`, job, 24 * 60 * 60);
        }
    }

    async saveExportFile(filename, buffer) {
        try {
            const exportsDir = path.join(process.cwd(), 'uploads/exports');
            await fs.mkdir(exportsDir, { recursive: true });

            const filePath = path.join(exportsDir, filename);
            await fs.writeFile(filePath, buffer);

            return filePath;

        } catch (error) {
            logger.error('Save export file error:', error);
            throw error;
        }
    }

    // Cleanup old export files
    async cleanupOldExports() {
        try {
            const exportsDir = path.join(process.cwd(), 'uploads/exports');
            const files = await fs.readdir(exportsDir);

            let cleaned = 0;
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

            for (const file of files) {
                const filePath = path.join(exportsDir, file);
                const stats = await fs.stat(filePath);

                if (Date.now() - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    cleaned++;
                }
            }

            logger.info(`Cleaned up ${cleaned} old export files`);
            return cleaned;

        } catch (error) {
            logger.error('Cleanup old exports error:', error);
            return 0;
        }
    }
}

// Schedule export queue processing and cleanup
const exportService = new ExportService();

// Process export queue every 2 minutes
setInterval(() => {
    exportService.processExportQueue().catch(error => {
        logger.error('Scheduled export queue processing failed:', error);
    });
}, 2 * 60 * 1000);

// Cleanup old exports daily
setInterval(() => {
    exportService.cleanupOldExports().catch(error => {
        logger.error('Scheduled export cleanup failed:', error);
    });
}, 24 * 60 * 60 * 1000);

module.exports = exportService;