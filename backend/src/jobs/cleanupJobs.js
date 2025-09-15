const cron = require('node-cron');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const redisClient = require('../config/redis');
const { TIME_CONSTANTS } = require('../utils/constants');

class CleanupJobs {
    constructor() {
        this.isRunning = false;
        this.cleanupConfig = {
            logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS) || 30,
            sessionRetentionDays: parseInt(process.env.SESSION_RETENTION_DAYS) || 7,
            tempFileRetentionHours: parseInt(process.env.TEMP_FILE_RETENTION_HOURS) || 24,
            deletedDataRetentionDays: parseInt(process.env.DELETED_DATA_RETENTION_DAYS) || 90,
            analyticsRetentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 365
        };
    }

    /**
     * Khởi tạo cleanup jobs
     */
    async initialize() {
        try {
            // Dọn dẹp file tạm mỗi giờ
            cron.schedule('0 * * * *', async () => {
                await this.cleanupTempFiles();
            });

            // Dọn dẹp session hết hạn mỗi 6 giờ
            cron.schedule('0 */6 * * *', async () => {
                await this.cleanupExpiredSessions();
            });

            // Dọn dẹp logs cũ hàng ngày lúc 1 AM
            cron.schedule('0 1 * * *', async () => {
                await this.cleanupOldLogs();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Dọn dẹp dữ liệu đã xóa mềm hàng tuần
            cron.schedule('0 2 * * 0', async () => {
                await this.cleanupSoftDeletedData();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Dọn dẹp cache Redis hàng ngày lúc 3 AM
            cron.schedul
            e('0 3 * * *', async () => {
                await this.cleanupRedisCache();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Dọn dẹp file uploads không sử dụng hàng tuần
            cron.schedule('0 4 * * 0', async () => {
                await this.cleanupOrphanedFiles();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Dọn dẹp analytics data cũ hàng tháng
            cron.schedule('0 5 1 * *', async () => {
                await this.cleanupOldAnalytics();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Tối ưu database hàng tuần
            cron.schedule('0 6 * * 0', async () => {
                await this.optimizeDatabase();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            logger.info('Cleanup jobs đã được khởi tạo thành công');
        } catch (error) {
            logger.error('Không thể khởi tạo cleanup jobs:', error);
            throw error;
        }
    }

    /**
     * Dọn dẹp file tạm thời
     */
    async cleanupTempFiles() {
        if (this.isRunning) return;

        try {
            logger.info('Bắt đầu dọn dẹp file tạm...');

            const tempDirs = [
                './uploads/temp',
                './uploads/processing',
                './temp',
                './cache/temp'
            ];

            let totalDeleted = 0;
            let totalSize = 0;
            const cutoffTime = Date.now() - (this.cleanupConfig.tempFileRetentionHours * TIME_CONSTANTS.HOUR);

            for (const tempDir of tempDirs) {
                try {
                    await fs.access(tempDir);
                    const { deleted, size } = await this.cleanupDirectory(tempDir, cutoffTime);
                    totalDeleted += deleted;
                    totalSize += size;
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        logger.warn(`Không thể truy cập thư mục ${tempDir}:`, error.message);
                    }
                }
            }

            if (totalDeleted > 0) {
                logger.info(`Đã dọn dẹp ${totalDeleted} file tạm, giải phóng ${this.formatBytes(totalSize)}`);
            }

        } catch (error) {
            logger.error('Dọn dẹp file tạm thất bại:', error);
        }
    }

    /**
     * Dọn dẹp session hết hạn
     */
    async cleanupExpiredSessions() {
        try {
            logger.info('Bắt đầu dọn dẹp session hết hạn...');

            const Session = require('../models/Session');
            const cutoffTime = new Date(Date.now() - (this.cleanupConfig.sessionRetentionDays * TIME_CONSTANTS.DAY));

            // Xóa session hết hạn
            const expiredSessions = await Session.deleteMany({
                $or: [
                    { expiresAt: { $lt: new Date() } },
                    { lastAccessed: { $lt: cutoffTime } },
                    { isActive: false }
                ]
            });

            // Dọn dẹp Redis session data
            const pattern = 'sess:*';
            const keys = await redisClient.keys(pattern);
            let deletedRedisKeys = 0;

            for (const key of keys) {
                try {
                    const ttl = await redisClient.ttl(key);
                    if (ttl === -1 || ttl === 0) { // Key hết hạn hoặc không có TTL
                        await redisClient.del(key);
                        deletedRedisKeys++;
                    }
                } catch (error) {
                    logger.warn(`Lỗi kiểm tra Redis key ${key}:`, error.message);
                }
            }

            logger.info(`Đã dọn dẹp ${expiredSessions.deletedCount} session DB và ${deletedRedisKeys} Redis keys`);

        } catch (error) {
            logger.error('Dọn dẹp session thất bại:', error);
        }
    }

    /**
     * Dọn dẹp logs cũ
     */
    async cleanupOldLogs() {
        try {
            logger.info('Bắt đầu dọn dẹp logs cũ...');

            // Dọn dẹp file logs
            const logDirs = [
                './logs',
                process.env.LOG_FILE_PATH
            ].filter(Boolean);

            let totalDeleted = 0;
            let totalSize = 0;
            const cutoffTime = Date.now() - (this.cleanupConfig.logRetentionDays * TIME_CONSTANTS.DAY);

            for (const logDir of logDirs) {
                try {
                    await fs.access(logDir);
                    const { deleted, size } = await this.cleanupDirectory(logDir, cutoffTime, /\.log$/);
                    totalDeleted += deleted;
                    totalSize += size;
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        logger.warn(`Không thể truy cập log directory ${logDir}:`, error.message);
                    }
                }
            }

            // Dọn dẹp logs trong database
            const SystemLog = require('../models/SystemLog');
            const oldLogs = await SystemLog.deleteMany({
                createdAt: { $lt: new Date(cutoffTime) }
            });

            // Dọn dẹp error logs
            const ErrorLog = require('../models/ErrorLog');
            const oldErrors = await ErrorLog.deleteMany({
                createdAt: { $lt: new Date(cutoffTime) },
                resolved: true
            });

            logger.info(`Đã dọn dẹp ${totalDeleted} log files (${this.formatBytes(totalSize)}), ${oldLogs.deletedCount} system logs, ${oldErrors.deletedCount} error logs`);

        } catch (error) {
            logger.error('Dọn dẹp logs thất bại:', error);
        }
    }

    /**
     * Dọn dẹp dữ liệu đã xóa mềm
     */
    async cleanupSoftDeletedData() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            logger.info('Bắt đầu dọn dẹp dữ liệu đã xóa mềm...');

            const cutoffTime = new Date(Date.now() - (this.cleanupConfig.deletedDataRetentionDays * TIME_CONSTANTS.DAY));

            // Dọn dẹp events đã xóa
            const Event = require('../models/Event');
            const deletedEvents = await Event.deleteMany({
                isDeleted: true,
                deletedAt: { $lt: cutoffTime }
            });

            // Dọn dẹp users đã xóa
            const User = require('../models/User');
            const deletedUsers = await User.deleteMany({
                isDeleted: true,
                deletedAt: { $lt: cutoffTime }
            });

            // Dọn dẹp registrations của events đã xóa
            const Registration = require('../models/Registration');
            const orphanedRegistrations = await Registration.deleteMany({
                event: { $in: await Event.find({ isDeleted: true }).distinct('_id') }
            });

            // Dọn dẹp notifications cũ
            const Notification = require('../models/Notification');
            const oldNotifications = await Notification.deleteMany({
                $or: [
                    { isDeleted: true, deletedAt: { $lt: cutoffTime } },
                    { createdAt: { $lt: new Date(Date.now() - 90 * TIME_CONSTANTS.DAY) }, isRead: true }
                ]
            });

            // Dọn dẹp email queue cũ
            const EmailQueue = require('../models/EmailQueue');
            const oldEmails = await EmailQueue.deleteMany({
                $or: [
                    { status: 'sent', sentAt: { $lt: cutoffTime } },
                    { status: 'failed_permanent', failedAt: { $lt: cutoffTime } }
                ]
            });

            logger.info(`Đã dọn dẹp: ${deletedEvents.deletedCount} events, ${deletedUsers.deletedCount} users, ${orphanedRegistrations.deletedCount} registrations, ${oldNotifications.deletedCount} notifications, ${oldEmails.deletedCount} emails`);

        } catch (error) {
            logger.error('Dọn dẹp soft deleted data thất bại:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Dọn dẹp Redis cache
     */
    async cleanupRedisCache() {
        try {
            logger.info('Bắt đầu dọn dẹp Redis cache...');

            let deletedKeys = 0;

            // Dọn dẹp cache hết hạn
            const expiredPatterns = [
                'cache:*',
                'session:*',
                'rate_limit:*',
                'temp:*'
            ];

            for (const pattern of expiredPatterns) {
                try {
                    const keys = await redisClient.keys(pattern);

                    for (const key of keys) {
                        const ttl = await redisClient.ttl(key);

                        // Xóa key hết hạn hoặc không có TTL và tạo từ lâu
                        if (ttl === -1 || ttl === 0) {
                            const keyAge = await this.getRedisKeyAge(key);
                            if (keyAge > 24 * 60 * 60) { // Hơn 24 giờ
                                await redisClient.del(key);
                                deletedKeys++;
                            }
                        }
                    }
                } catch (error) {
                    logger.warn(`Lỗi dọn dẹp pattern ${pattern}:`, error.message);
                }
            }

            // Dọn dẹp rate limit violations cũ
            const violationKeys = await redisClient.keys('violations:*');
            for (const key of violationKeys) {
                const ttl = await redisClient.ttl(key);
                if (ttl <= 0) {
                    await redisClient.del(key);
                    deletedKeys++;
                }
            }

            // Tối ưu Redis memory
            if (deletedKeys > 100) {
                await redisClient.flushdb(); // Chỉ flush nếu có nhiều key cần xóa
                logger.info('Đã flush Redis database để tối ưu memory');
            }

            logger.info(`Đã dọn dẹp ${deletedKeys} Redis keys`);

        } catch (error) {
            logger.error('Dọn dẹp Redis cache thất bại:', error);
        }
    }

    /**
     * Dọn dẹp file uploads không sử dụng
     */
    async cleanupOrphanedFiles() {
        try {
            logger.info('Bắt đầu tìm và dọn dẹp orphaned files...');

            const uploadDirs = [
                './uploads/avatars',
                './uploads/events',
                './uploads/documents',
                './uploads/certificates'
            ];

            let totalDeleted = 0;
            let totalSize = 0;

            for (const uploadDir of uploadDirs) {
                try {
                    await fs.access(uploadDir);
                    const { deleted, size } = await this.findAndCleanOrphanedFiles(uploadDir);
                    totalDeleted += deleted;
                    totalSize += size;
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        logger.warn(`Không thể truy cập ${uploadDir}:`, error.message);
                    }
                }
            }

            logger.info(`Đã dọn dẹp ${totalDeleted} orphaned files, giải phóng ${this.formatBytes(totalSize)}`);

        } catch (error) {
            logger.error('Dọn dẹp orphaned files thất bại:', error);
        }
    }

    /**
     * Dọn dẹp analytics data cũ
     */
    async cleanupOldAnalytics() {
        try {
            logger.info('Bắt đầu dọn dẹp analytics data cũ...');

            const cutoffTime = new Date(Date.now() - (this.cleanupConfig.analyticsRetentionDays * TIME_CONSTANTS.DAY));

            // Dọn dẹp page views cũ
            const PageView = require('../models/PageView');
            const oldPageViews = await PageView.deleteMany({
                createdAt: { $lt: cutoffTime }
            });

            // Dọn dẹp search queries cũ
            const SearchQuery = require('../models/SearchQuery');
            const oldSearches = await SearchQuery.deleteMany({
                createdAt: { $lt: cutoffTime }
            });

            // Dọn dẹp event analytics cũ (giữ lại summary)
            const EventAnalytics = require('../models/EventAnalytics');
            const oldEventAnalytics = await EventAnalytics.deleteMany({
                createdAt: { $lt: cutoffTime },
                type: 'detailed' // Chỉ xóa detailed, giữ summary
            });

            // Archive old analytics thay vì xóa
            await this.archiveOldAnalytics(cutoffTime);

            logger.info(`Đã dọn dẹp ${oldPageViews.deletedCount} page views, ${oldSearches.deletedCount} searches, ${oldEventAnalytics.deletedCount} event analytics`);

        } catch (error) {
            logger.error('Dọn dẹp analytics data thất bại:', error);
        }
    }

    /**
     * Tối ưu database
     */
    async optimizeDatabase() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            logger.info('Bắt đầu tối ưu database...');

            const db = mongoose.connection.db;
            const collections = await db.listCollections().toArray();

            let optimizedCollections = 0;

            for (const collection of collections) {
                try {
                    const collectionName = collection.name;

                    // Reindex collection
                    await db.collection(collectionName).reIndex();

                    // Compact collection (MongoDB 4.4+)
                    try {
                        await db.runCommand({ compact: collectionName });
                    } catch (compactError) {
                        // Compact không khả dụng trên mọi setup
                        logger.debug(`Compact không khả dụng cho ${collectionName}`);
                    }

                    optimizedCollections++;

                    // Delay ngắn giữa các collection
                    await this.sleep(100);

                } catch (error) {
                    logger.warn(`Lỗi tối ưu collection ${collection.name}:`, error.message);
                }
            }

            // Cập nhật statistics
            await db.runCommand({ planCacheClear: 1 });

            logger.info(`Đã tối ưu ${optimizedCollections} collections`);

        } catch (error) {
            logger.error('Tối ưu database thất bại:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Dọn dẹp thư mục
     */
    async cleanupDirectory(dirPath, cutoffTime, filePattern = null) {
        let deletedCount = 0;
        let totalSize = 0;

        try {
            const files = await fs.readdir(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);

                try {
                    const stats = await fs.stat(filePath);

                    // Kiểm tra pattern nếu có
                    if (filePattern && !filePattern.test(file)) {
                        continue;
                    }

                    if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
                        totalSize += stats.size;
                        await fs.unlink(filePath);
                        deletedCount++;
                    } else if (stats.isDirectory()) {
                        // Recursively clean subdirectories
                        const { deleted, size } = await this.cleanupDirectory(filePath, cutoffTime, filePattern);
                        deletedCount += deleted;
                        totalSize += size;

                        // Xóa thư mục rỗng
                        try {
                            const remainingFiles = await fs.readdir(filePath);
                            if (remainingFiles.length === 0) {
                                await fs.rmdir(filePath);
                            }
                        } catch (error) {
                            // Thư mục không rỗng hoặc lỗi khác
                        }
                    }
                } catch (error) {
                    logger.warn(`Lỗi xử lý file ${filePath}:`, error.message);
                }
            }

        } catch (error) {
            logger.error(`Lỗi dọn dẹp thư mục ${dirPath}:`, error);
        }

        return { deleted: deletedCount, size: totalSize };
    }

    /**
     * Tìm và dọn dẹp orphaned files
     */
    async findAndCleanOrphanedFiles(uploadDir) {
        let deletedCount = 0;
        let totalSize = 0;

        try {
            const files = await fs.readdir(uploadDir);

            for (const file of files) {
                const filePath = path.join(uploadDir, file);

                try {
                    const stats = await fs.stat(filePath);
                    if (!stats.isFile()) continue;

                    const isOrphaned = await this.isFileOrphaned(file, uploadDir);

                    if (isOrphaned) {
                        // Kiểm tra tuổi file trước khi xóa (an toàn)
                        const fileAge = Date.now() - stats.mtime.getTime();
                        if (fileAge > 24 * TIME_CONSTANTS.HOUR) { // File cũ hơn 24 giờ
                            totalSize += stats.size;
                            await fs.unlink(filePath);
                            deletedCount++;

                            logger.debug(`Đã xóa orphaned file: ${file}`);
                        }
                    }
                } catch (error) {
                    logger.warn(`Lỗi kiểm tra file ${file}:`, error.message);
                }
            }

        } catch (error) {
            logger.error(`Lỗi dọn dẹp orphaned files trong ${uploadDir}:`, error);
        }

        return { deleted: deletedCount, size: totalSize };
    }

    /**
     * Kiểm tra file có phải orphaned không
     */
    async isFileOrphaned(filename, uploadDir) {
        try {
            // Kiểm tra trong database models khác nhau
            const checks = [];

            if (uploadDir.includes('avatars')) {
                const User = require('../models/User');
                checks.push(User.findOne({ 'profile.avatar': filename }));
            }

            if (uploadDir.includes('events')) {
                const Event = require('../models/Event');
                checks.push(Event.findOne({
                    $or: [
                        { 'media.banner': filename },
                        { 'media.images': filename },
                        { 'media.documents': filename }
                    ]
                }));
            }

            if (uploadDir.includes('certificates')) {
                const Certificate = require('../models/Certificate');
                checks.push(Certificate.findOne({ filePath: filename }));
            }

            const results = await Promise.all(checks);
            return results.every(result => result === null);

        } catch (error) {
            logger.error(`Lỗi kiểm tra orphaned file ${filename}:`, error);
            return false; // An toàn - không xóa nếu không chắc chắn
        }
    }

    /**
     * Archive analytics data cũ
     */
    async archiveOldAnalytics(cutoffTime) {
        try {
            const Analytics = require('../models/Analytics');

            // Tạo summary data từ detailed data cũ
            const oldAnalytics = await Analytics.find({
                createdAt: { $lt: cutoffTime },
                type: 'detailed'
            });

            if (oldAnalytics.length > 0) {
                // Group by month và tạo summary
                const monthlyGroups = {};

                oldAnalytics.forEach(item => {
                    const monthKey = item.createdAt.toISOString().substring(0, 7); // YYYY-MM
                    if (!monthlyGroups[monthKey]) {
                        monthlyGroups[monthKey] = [];
                    }
                    monthlyGroups[monthKey].push(item);
                });

                // Tạo monthly summaries
                for (const [month, items] of Object.entries(monthlyGroups)) {
                    const summary = this.createMonthlySummary(items);

                    const AnalyticsSummary = require('../models/AnalyticsSummary');
                    await AnalyticsSummary.findOneAndUpdate(
                        { month },
                        { ...summary, month },
                        { upsert: true }
                    );
                }

                // Xóa detailed data sau khi archive
                await Analytics.deleteMany({
                    createdAt: { $lt: cutoffTime },
                    type: 'detailed'
                });

                logger.info(`Đã archive ${oldAnalytics.length} analytics records thành ${Object.keys(monthlyGroups).length
                } monthly summaries`);
            }

        } catch (error) {
            logger.error('Archive analytics thất bại:', error);
        }
    }

    /**
     * Tạo monthly summary từ detailed data
     */
    createMonthlySummary(items) {
        const summary = {
            totalEvents: 0,
            totalRegistrations: 0,
            totalUsers: 0,
            totalPageViews: 0,
            avgSessionDuration: 0,
            topEventTypes: {},
            topCategories: {},
            greater_equal
        };

        items.forEach(item => {
            if (item.events) summary.totalEvents += item.events;
            if (item.registrations) summary.totalRegistrations += item.registrations;
            if (item.users) summary.totalUsers += item.users;
            if (item.pageViews) summary.totalPageViews += item.pageViews;

            // Aggregate other metrics
            if (item.eventTypes) {
                Object.entries(item.eventTypes).forEach(([type, count]) => {
                    summary.topEventTypes[type] = (summary.topEventTypes[type] || 0) + count;
                });
            }
        });

        // Tính average
        if (items.length > 0) {
            summary.avgSessionDuration = items.reduce((sum, item) =>
                sum + (item.avgSessionDuration || 0), 0) / items.length;
        }

        return summary;
    }

    /**
     * Lấy tuổi của Redis key
     */
    async getRedisKeyAge(key) {
        try {
            // Giả sử key có timestamp trong tên hoặc dùng OBJECT IDLETIME
            const idleTime = await redisClient.object('IDLETIME', key);
            return idleTime || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Dọn dẹp error logs đã resolved
     */
    async cleanupResolvedErrors() {
        try {
            const ErrorLog = require('../models/ErrorLog');
            const cutoffTime = new Date(Date.now() - (30 * TIME_CONSTANTS.DAY)); // 30 ngày

            const deletedErrors = await ErrorLog.deleteMany({
                resolved: true,
                resolvedAt: { $lt: cutoffTime }
            });

            logger.info(`Đã dọn dẹp ${deletedErrors.deletedCount} error logs đã resolved`);

        } catch (error) {
            logger.error('Dọn dẹp error logs thất bại:', error);
        }
    }

    /**
     * Dọn dẹp audit logs cũ
     */
    async cleanupOldAuditLogs() {
        try {
            const AuditLog = require('../models/AuditLog');
            const cutoffTime = new Date(Date.now() - (365 * TIME_CONSTANTS.DAY)); // 1 năm

            // Archive audit logs thay vì xóa
            const oldLogs = await AuditLog.find({
                createdAt: { $lt: cutoffTime }
            });

            if (oldLogs.length > 0) {
                // Tạo archive file
                const archivePath = path.join('./archives', `audit-logs-${new Date().getFullYear()}.json`);
                await fs.mkdir('./archives', { recursive: true });
                await fs.writeFile(archivePath, JSON.stringify(oldLogs, null, 2));

                // Xóa từ database
                const deleted = await AuditLog.deleteMany({
                    createdAt: { $lt: cutoffTime }
                });

                logger.info(`Đã archive ${deleted.deletedCount} audit logs cũ`);
            }

        } catch (error) {
            logger.error('Dọn dẹp audit logs thất bại:', error);
        }
    }

    /**
     * Cleanup job toàn diện
     */
    async performFullCleanup() {
        if (this.isRunning) {
            logger.warn('Cleanup đang chạy, bỏ qua full cleanup');
            return;
        }

        this.isRunning = true;

        try {
            logger.info('Bắt đầu full system cleanup...');

            const startTime = Date.now();
            const results = {};

            // Thực hiện tất cả cleanup tasks
            results.tempFiles = await this.cleanupTempFiles();
            results.sessions = await this.cleanupExpiredSessions();
            results.logs = await this.cleanupOldLogs();
            results.softDeleted = await this.cleanupSoftDeletedData();
            results.redis = await this.cleanupRedisCache();
            results.orphanedFiles = await this.cleanupOrphanedFiles();
            results.analytics = await this.cleanupOldAnalytics();
            results.errors = await this.cleanupResolvedErrors();
            results.auditLogs = await this.cleanupOldAuditLogs();

            // Optimize database
            await this.optimizeDatabase();

            const duration = Date.now() - startTime;
            logger.info(`Full cleanup hoàn thành trong ${duration}ms`, results);

            // Gửi báo cáo cleanup cho admin
            await this.sendCleanupReport(results, duration);

        } catch (error) {
            logger.error('Full cleanup thất bại:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Gửi báo cáo cleanup
     */
    async sendCleanupReport(results, duration) {
        try {
            const User = require('../models/User');
            const admins = await User.find({
                roles: 'admin',
                'preferences.notifications.systemReports': true,
                isActive: true
            });

            const reportContent = this.generateCleanupReportContent(results, duration);

            for (const admin of admins) {
                await emailService.sendEmail({
                    to: admin.email,
                    subject: `🧹 Báo cáo System Cleanup - ${new Date().toLocaleDateString('vi-VN')}`,
                    html: reportContent
                });
            }

        } catch (error) {
            logger.error('Gửi cleanup report thất bại:', error);
        }
    }

    /**
     * Tạo nội dung báo cáo cleanup
     */
    generateCleanupReportContent(results, duration) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                <h2>🧹 Báo cáo System Cleanup</h2>
                <p><strong>Thời gian thực hiện:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                <p><strong>Thời gian xử lý:</strong> ${Math.round(duration / 1000)} giây</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3>📊 Kết quả Cleanup</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        ${Object.entries(results).filter(([key, value]) => value && typeof value === 'object').map(([key, value]) => `
                            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <h4 style="margin-top: 0; color: #007bff;">${key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                                ${Object.entries(value).map(([subKey, subValue]) => `
                                    <p style="margin: 5px 0;"><strong>${subKey}:</strong> ${subValue}</p>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>💡 Ghi chú:</strong> Cleanup được thực hiện tự động để duy trì hiệu suất hệ thống tốt nhất.</p>
                    <p>Nếu có vấn đề gì, vui lòng kiểm tra system logs để biết thêm chi tiết.</p>
                </div>
            </div>
        `;
    }

    /**
     * Cleanup cache theo pattern
     */
    async cleanupCacheByPattern(pattern, maxAge = 24 * TIME_CONSTANTS.HOUR) {
        try {
            const keys = await redisClient.keys(pattern);
            let deletedCount = 0;

            for (const key of keys) {
                try {
                    const ttl = await redisClient.ttl(key);
                    const keyAge = await this.getRedisKeyAge(key);

                    if (ttl === -1 && keyAge > maxAge) {
                        await redisClient.del(key);
                        deletedCount++;
                    }
                } catch (error) {
                    logger.warn(`Lỗi cleanup cache key ${key}:`, error.message);
                }
            }

            logger.info(`Đã xóa ${deletedCount} keys theo pattern ${pattern}`);
            return deletedCount;
        } catch (error) {
            logger.error(`Cleanup cache pattern ${pattern} thất bại:`, error);
            return 0;
        }
    }

    /**
     * Dọn dẹp upload thumbnails không sử dụng
     */
    async cleanupUnusedThumbnails() {
        try {
            const thumbnailDir = './uploads/thumbnails';
            await fs.access(thumbnailDir);

            const files = await fs.readdir(thumbnailDir);
            let deletedCount = 0;
            let totalSize = 0;

            for (const file of files) {
                if (!file.includes('_thumb.')) continue;

                const originalFile = file.replace('_thumb.', '.');
                const originalPath = path.join('./uploads', originalFile);

                try {
                    await fs.access(originalPath);
                } catch (error) {
                    // Original file không tồn tại, xóa thumbnail
                    const thumbnailPath = path.join(thumbnailDir, file);
                    const stats = await fs.stat(thumbnailPath);
                    totalSize += stats.size;
                    await fs.unlink(thumbnailPath);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                logger.info(`Đã dọn dẹp ${deletedCount} unused thumbnails, giải phóng ${this.formatBytes(totalSize)}`);
            }

        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.error('Cleanup thumbnails thất bại:', error);
            }
        }
    }

    /**
     * Dọn dẹp database indexes không sử dụng
     */
    async cleanupUnusedIndexes() {
        try {
            const db = mongoose.connection.db;
            const collections = await db.listCollections().toArray();

            for (const collection of collections) {
                try {
                    const collectionName = collection.name;
                    const indexes = await db.collection(collectionName).indexes();

                    // Lấy index usage stats (MongoDB 3.2+)
                    try {
                        const stats = await db.collection(collectionName).aggregate([
                            { $indexStats: {} }
                        ]).toArray();

                        for (const indexStat of stats) {
                            // Nếu index không được sử dụng trong 30 ngày và không phải _id
                            if (indexStat.name !== '_id_' &&
                                indexStat.accesses.ops === 0 &&
                                indexStat.accesses.since) {

                                const daysSinceCreated = (Date.now() - new Date(indexStat.accesses.since)) / TIME_CONSTANTS.DAY;

                                if (daysSinceCreated > 30) {
                                    logger.warn(`Index ${indexStat.name} trên ${collectionName} không được sử dụng trong 30 ngày`);
                                    // Có thể drop index nếu cần (cẩn trọng)
                                    // await db.collection(collectionName).dropIndex(indexStat.name);
                                }
                            }
                        }
                    } catch (statsError) {
                        // $indexStats không khả dụng trên version cũ
                    }

                } catch (error) {
                    logger.warn(`Lỗi kiểm tra indexes cho ${collection.name}:`, error.message);
                }
            }

        } catch (error) {
            logger.error('Cleanup unused indexes thất bại:', error);
        }
    }

    /**
     * Monitor và report disk usage
     */
    async monitorDiskUsage() {
        try {
            const { execSync } = require('child_process');

            // Lấy disk usage (Linux/Mac)
            try {
                const diskUsage = execSync('df -h /', { encoding: 'utf8' });
                const lines = diskUsage.split('\n');
                const dataLine = lines[1].split(/\s+/);
                const usagePercent = parseInt(dataLine[4]);

                if (usagePercent > 85) {
                    logger.warn(`Disk usage cao: ${usagePercent}%`);

                    // Gửi cảnh báo
                    await this.sendDiskUsageAlert(usagePercent);

                    // Thực hiện emergency cleanup
                    await this.emergencyCleanup();
                }

            } catch (error) {
                // Fallback cho Windows hoặc lỗi command
                logger.debug('Không thể lấy disk usage:', error.message);
            }

        } catch (error) {
            logger.error('Monitor disk usage thất bại:', error);
        }
    }

    /**
     * Emergency cleanup khi disk đầy
     */
    async emergencyCleanup() {
        try {
            logger.warn('Thực hiện emergency cleanup do disk usage cao...');

            // Dọn dẹp aggressive hơn
            await this.cleanupTempFiles();
            await this.cleanupRedisCache();

            // Xóa logs cũ hơn 7 ngày
            const emergencyCutoff = Date.now() - (7 * TIME_CONSTANTS.DAY);
            await this.cleanupDirectory('./logs', emergencyCutoff);

            // Compress logs cũ thay vì xóa
            await this.compressOldLogs();

        } catch (error) {
            logger.error('Emergency cleanup thất bại:', error);
        }
    }

    /**
     * Compress logs cũ
     */
    async compressOldLogs() {
        try {
            const zlib = require('zlib');
            const logDir = './logs';

            const files = await fs.readdir(logDir);
            const cutoffTime = Date.now() - (7 * TIME_CONSTANTS.DAY);

            for (const file of files) {
                if (!file.endsWith('.log') || file.endsWith('.gz')) continue;

                const filePath = path.join(logDir, file);
                const stats = await fs.stat(filePath);

                if (stats.mtime.getTime() < cutoffTime) {
                    // Compress file
                    const compressedPath = `${filePath}.gz`;
                    const readStream = require('fs').createReadStream(filePath);
                    const writeStream = require('fs').createWriteStream(compressedPath);
                    const gzip = zlib.createGzip();

                    await new Promise((resolve, reject) => {
                        readStream.pipe(gzip).pipe(writeStream)
                            .on('finish', resolve)
                            .on('error', reject);
                    });

                    // Xóa file gốc
                    await fs.unlink(filePath);
                    logger.debug(`Đã compress log file: ${file}`);
                }
            }

        } catch (error) {
            logger.error('Compress logs thất bại:', error);
        }
    }

    /**
     * Gửi cảnh báo disk usage
     */
    async sendDiskUsageAlert(usagePercent) {
        try {
            const emailService = require('../config/email');
            const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];

            for (const email of adminEmails) {
                await emailService.sendEmail({
                    to: email.trim(),
                    subject: `⚠️ Cảnh báo: Disk Usage cao (${usagePercent}%)`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                                <h3 style="color: #856404; margin-top: 0;">⚠️ Cảnh báo Disk Usage</h3>
                                <p>Disk usage hiện tại: <strong>${usagePercent}%</strong></p>
                                <p>Hệ thống đã tự động thực hiện emergency cleanup.</p>
                                <p>Vui lòng kiểm tra và giải phóng thêm dung lượng nếu cần thiết.</p>
                            </div>
                        </div>
                    `
                });
            }
        } catch (error) {
            logger.error('Gửi disk usage alert thất bại:', error);
        }
    }

    // Helper methods
    formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Lấy trạng thái cleanup jobs
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            config: this.cleanupConfig,
            nextRuns: {
                tempFiles: 'Mỗi giờ',
                sessions: 'Mỗi 6 giờ',
                logs: 'Hàng ngày lúc 1:00',
                softDeleted: 'Chủ nhật lúc 2:00',
                redis: 'Hàng ngày lúc 3:00',
                orphanedFiles: 'Chủ nhật lúc 4:00',
                analytics: 'Ngày 1 hàng tháng lúc 5:00',
                optimization: 'Chủ nhật lúc 6:00'
            }
        };
    }

    /**
     * Thực hiện manual cleanup
     */
    async performManualCleanup(type, options = {}) {
        if (this.isRunning) {
            throw new Error('Cleanup job đang chạy, vui lòng đợi');
        }

        try {
            switch (type) {
                case 'temp':
                    return await this.cleanupTempFiles();
                case 'sessions':
                    return await this.cleanupExpiredSessions();
                case 'logs':
                    return await this.cleanupOldLogs();
                case 'redis':
                    return await this.cleanupRedisCache();
                case 'files':
                    return await this.cleanupOrphanedFiles();
                case 'analytics':
                    return await this.cleanupOldAnalytics();
                case 'full':
                    return await this.performFullCleanup();
                default:
                    throw new Error(`Loại cleanup không hỗ trợ: ${type}`);
            }
        } catch (error) {
            logger.error(`Manual cleanup ${type} thất bại:`, error);
            throw error;
        }
    }

    /**
     * Tính toán storage statistics
     */
    async getStorageStats() {
        try {
            const dirs = [
                { name: 'uploads', path: './uploads' },
                { name: 'logs', path: './logs' },
                { name: 'reports', path: './reports' },
                { name: 'backups', path: './backups' },
                { name: 'temp', path: './temp' }
            ];

            const stats = {};

            for (const dir of dirs) {
                try {
                    const dirStats = await this.calculateDirectorySize(dir.path);
                    stats[dir.name] = {
                        size: dirStats.size,
                        files: dirStats.files,
                        formattedSize: this.formatBytes(dirStats.size)
                    };
                } catch (error) {
                    stats[dir.name] = { size: 0, files: 0, formattedSize: '0 Bytes', error: error.message };
                }
            }

            return stats;
        } catch (error) {
            logger.error('Lấy storage stats thất bại:', error);
            return {};
        }
    }

    /**
     * Tính kích thước thư mục
     */
    async calculateDirectorySize(dirPath) {
        let totalSize = 0;
        let fileCount = 0;

        const calculateSize = async (currentPath) => {
            try {
                const items = await fs.readdir(currentPath);

                for (const item of items) {
                    const itemPath = path.join(currentPath, item);
                    const stats = await fs.stat(itemPath);

                    if (stats.isDirectory()) {
                        await calculateSize(itemPath);
                    } else {
                        totalSize += stats.size;
                        fileCount++;
                    }
                }
            } catch (error) {
                // Bỏ qua lỗi truy cập
            }
        };

        await calculateSize(dirPath);
        return { size: totalSize, files: fileCount };
    }

    /**
     * Cleanup job health check
     */
    async healthCheck() {
        try {
            const health = {
                status: 'healthy',
                lastRun: new Date().toISOString(),
                checks: {
                    tempFiles: await this.checkTempFilesHealth(),
                    database: await this.checkDatabaseHealth(),
                    redis: await this.checkRedisHealth(),
                    storage: await this.checkStorageHealth()
                }
            };

            // Kiểm tra overall health
            const failedChecks = Object.values(health.checks).filter(check => !check.healthy);
            if (failedChecks.length > 0) {
                health.status = 'degraded';
            }

            return health;
        } catch (error) {
            logger.error('Cleanup health check thất bại:', error);
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkTempFilesHealth() {
        try {
            const tempDirs = ['./uploads/temp', './temp'];
            let totalFiles = 0;

            for (const dir of tempDirs) {
                try {
                    const files = await fs.readdir(dir);
                    totalFiles += files.length;
                } catch (error) {
                    // Directory không tồn tại
                }
            }

            return {
                healthy: totalFiles < 1000,
                details: { tempFiles: totalFiles },
                message: totalFiles >= 1000 ? 'Quá nhiều file tạm' : 'OK'
            };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }

    async checkDatabaseHealth() {
        try {
            const db = mongoose.connection.db;
            const stats = await db.stats();

            return {
                healthy: stats.ok === 1,
                details: {
                    collections: stats.collections,
                    dataSize: this.formatBytes(stats.dataSize),
                    storageSize: this.formatBytes(stats.storageSize)
                },
                message: 'Database OK'
            };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }

    async checkRedisHealth() {
        try {
            const info = await redisClient.info('memory');
            const usedMemory = parseInt(info.match(/used_memory:(\d+)/)?.[1] || 0);
            const maxMemory = parseInt(info.match(/maxmemory:(\d+)/)?.[1] || 0);

            const usage = maxMemory > 0 ? (usedMemory / maxMemory) * 100 : 0;

            return {
                healthy: usage < 80,
                details: {
                    usedMemory: this.formatBytes(usedMemory),
                    usage: `${usage.toFixed(2)}%`
                },
                message: usage >= 80 ? 'Redis memory usage cao' : 'Redis OK'
            };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }

    async checkStorageHealth() {
        try {
            const storageStats = await this.getStorageStats();
            const totalSize = Object.values(storageStats).reduce((sum, stat) => sum + stat.size, 0);

            // Cảnh báo nếu storage > 5GB
            const warningSize = 5 * 1024 * 1024 * 1024; // 5GB

            return {
                healthy: totalSize < warningSize,
                details: {
                    totalSize: this.formatBytes(totalSize),
                    breakdown: storageStats
                },
                message: totalSize >= warningSize ? 'Storage usage cao' : 'Storage OK'
            };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }
}

module.exports = new CleanupJobs();