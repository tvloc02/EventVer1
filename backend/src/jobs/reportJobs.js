const cron = require('node-cron');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const DateUtils = require('../utils/dateUtils');
const emailService = require('../config/email');
const { TIME_CONSTANTS } = require('../utils/constants');

class ReportJobs {
    constructor() {
        this.isRunning = false;
        this.reportsDir = process.env.REPORTS_DIR || './reports';
        this.retentionDays = parseInt(process.env.REPORTS_RETENTION_DAYS) || 90;
    }

    /**
     * Initialize report jobs
     */
    async initialize() {
        try {
            await this.ensureReportsDirectory();

            // Daily analytics report at 6 AM
            cron.schedule('0 6 * * *', async () => {
                await this.generateDailyAnalyticsReport();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Weekly summary report on Monday at 8 AM
            cron.schedule('0 8 * * 1', async () => {
                await this.generateWeeklyReport();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Monthly comprehensive report on 1st at 9 AM
            cron.schedule('0 9 1 * *', async () => {
                await this.generateMonthlyReport();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Event performance reports after events end
            cron.schedule('0 10 * * *', async () => {
                await this.generateEventPerformanceReports();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // User engagement reports - weekly on Friday at 4 PM
            cron.schedule('0 16 * * 5', async () => {
                await this.generateUserEngagementReport();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Financial reports - monthly on 2nd at 10 AM
            cron.schedule('0 10 2 * *', async () => {
                await this.generateFinancialReport();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Cleanup old reports daily at 11 PM
            cron.schedule('0 23 * * *', async () => {
                await this.cleanupOldReports();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            logger.info('Report jobs initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize report jobs:', error);
            throw error;
        }
    }

    /**
     * Generate daily analytics report
     */
    async generateDailyAnalyticsReport() {
        if (this.isRunning) return;

        this.isRunning = true;

        try {
            logger.info('Generating daily analytics report...');

            const yesterday = DateUtils.subtract(DateUtils.now(), 1, 'day');
            const startOfDay = DateUtils.startOfDay(yesterday);
            const endOfDay = DateUtils.endOfDay(yesterday);

            const analytics = await this.getDailyAnalytics(startOfDay.toDate(), endOfDay.toDate());

            // Generate Excel report
            const excelPath = await this.generateDailyExcelReport(analytics, yesterday.format('YYYY-MM-DD'));

            // Generate PDF summary
            const pdfPath = await this.generateDailyPDFReport(analytics, yesterday.format('YYYY-MM-DD'));

            // Send to administrators
            await this.sendReportToAdmins('daily', {
                analytics,
                files: [excelPath, pdfPath],
                date: yesterday.format('DD/MM/YYYY')
            });

            logger.info('Daily analytics report generated successfully', {
                excelPath,
                pdfPath,
                date: yesterday.format('YYYY-MM-DD')
            });

        } catch (error) {
            logger.error('Daily analytics report generation failed:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Generate weekly summary report
     */
    async generateWeeklyReport() {
        if (this.isRunning) return;

        this.isRunning = true;

        try {
            logger.info('Generating weekly summary report...');

            const lastWeek = DateUtils.subtract(DateUtils.now(), 1, 'week');
            const weekStart = DateUtils.startOfWeek(lastWeek);
            const weekEnd = DateUtils.endOfWeek(lastWeek);

            const analytics = await this.getWeeklyAnalytics(weekStart.toDate(), weekEnd.toDate());

            // Generate comprehensive Excel report
            const excelPath = await this.generateWeeklyExcelReport(analytics, weekStart.format('YYYY-MM-DD'));

            // Generate executive summary PDF
            const pdfPath = await this.generateWeeklyPDFReport(analytics, weekStart.format('YYYY-MM-DD'));

            // Send to management
            await this.sendReportToManagement('weekly', {
                analytics,
                files: [excelPath, pdfPath],
                weekStart: weekStart.format('DD/MM/YYYY'),
                weekEnd: weekEnd.format('DD/MM/YYYY')
            });

            logger.info('Weekly summary report generated successfully');

        } catch (error) {
            logger.error('Weekly summary report generation failed:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Generate monthly comprehensive report
     */
    async generateMonthlyReport() {
        if (this.isRunning) return;

        this.isRunning = true;

        try {
            logger.info('Generating monthly comprehensive report...');

            const lastMonth = DateUtils.subtract(DateUtils.now(), 1, 'month');
            const monthStart = DateUtils.startOfMonth(lastMonth);
            const monthEnd = DateUtils.endOfMonth(lastMonth);

            const analytics = await this.getMonthlyAnalytics(monthStart.toDate(), monthEnd.toDate());

            // Generate detailed Excel workbook
            const excelPath = await this.generateMonthlyExcelReport(analytics, lastMonth.format('YYYY-MM'));

            // Generate executive dashboard PDF
            const pdfPath = await this.generateMonthlyPDFReport(analytics, lastMonth.format('YYYY-MM'));

            // Generate trends analysis
            const trendsPath = await this.generateTrendsReport(analytics, lastMonth.format('YYYY-MM'));

            // Send comprehensive report package
            await this.sendReportToStakeholders('monthly', {
                analytics,
                files: [excelPath, pdfPath, trendsPath],
                month: lastMonth.format('MM/YYYY')
            });

            logger.info('Monthly comprehensive report generated successfully');

        } catch (error) {
            logger.error('Monthly comprehensive report generation failed:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Generate event performance reports
     */
    async generateEventPerformanceReports() {
        try {
            const Event = require('../models/Event');
            const Registration = require('../models/Registration');
            const Feedback = require('../models/Feedback');

            // Find events that ended yesterday and don't have reports yet
            const yesterday = DateUtils.subtract(DateUtils.now(), 1, 'day');
            const startOfDay = DateUtils.startOfDay(yesterday);
            const endOfDay = DateUtils.endOfDay(yesterday);

            const completedEvents = await Event.find({
                'schedule.endDate': {
                    $gte: startOfDay.toDate(),
                    $lte: endOfDay.toDate()
                },
                status: 'completed',
                performanceReportGenerated: { $ne: true }
            }).populate('organizer category');

            for (const event of completedEvents) {
                try {
                    const performance = await this.getEventPerformanceData(event);

                    // Generate Excel report
                    const excelPath = await this.generateEventPerformanceExcel(event, performance);

                    // Generate PDF summary
                    const pdfPath = await this.generateEventPerformancePDF(event, performance);

                    // Send to event organizer
                    await this.sendEventReportToOrganizer(event, {
                        performance,
                        files: [excelPath, pdfPath]
                    });

                    // Mark as reported
                    await Event.findByIdAndUpdate(event._id, {
                        performanceReportGenerated: true
                    });

                    logger.info(`Event performance report generated for: ${event.title}`);

                } catch (error) {
                    logger.error(`Failed to generate performance report for event ${event._id}:`, error);
                }
            }

        } catch (error) {
            logger.error('Event performance reports job failed:', error);
        }
    }

    /**
     * Get daily analytics data
     */
    async getDailyAnalytics(startDate, endDate) {
        const Event = require('../models/Event');
        const Registration = require('../models/Registration');
        const User = require('../models/User');

        const [
            newEvents,
            newRegistrations,
            newUsers,
            completedEvents,
            totalActiveUsers,
            totalEvents,
            totalRegistrations
        ] = await Promise.all([
            Event.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
            Registration.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
            User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
            Event.countDocuments({
                'schedule.endDate': { $gte: startDate, $lte: endDate },
                status: 'completed'
            }),
            User.countDocuments({
                lastLoginAt: { $gte: startDate, $lte: endDate },
                isActive: true
            }),
            Event.countDocuments({ status: { $ne: 'deleted' } }),
            Registration.countDocuments({})
        ]);

        // Event type distribution
        const eventTypeDistribution = await Event.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Registration status distribution
        const registrationStatusDistribution = await Registration.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        return {
            date: startDate,
            summary: {
                newEvents,
                newRegistrations,
                newUsers,
                completedEvents,
                totalActiveUsers,
                totalEvents,
                totalRegistrations
            },
            distributions: {
                eventTypes: eventTypeDistribution,
                registrationStatus: registrationStatusDistribution
            }
        };
    }

    /**
     * Get weekly analytics data
     */
    async getWeeklyAnalytics(startDate, endDate) {
        const Event = require('../models/Event');
        const Registration = require('../models/Registration');
        const User = require('../models/User');
        const Feedback = require('../models/Feedback');

        // Basic metrics
        const [
            newEvents,
            newRegistrations,
            newUsers,
            completedEvents,
            averageRating
        ] = await Promise.all([
            Event.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
            Registration.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
            User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
            Event.countDocuments({
                'schedule.endDate': { $gte: startDate, $lte: endDate },
                status: 'completed'
            }),
            Feedback.aggregate([
                { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: null, avgRating: { $avg: '$rating' } } }
            ]).then(result => result[0]?.avgRating || 0)
        ]);

        // Top events by registration
        const topEvents = await Event.aggregate([
            {
                $lookup: {
                    from: 'registrations',
                    localField: '_id',
                    foreignField: 'event',
                    as: 'registrations'
                }
            },
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $addFields: {
                    registrationCount: { $size: '$registrations' }
                }
            },
            {
                $sort: { registrationCount: -1 }
            },
            {
                $limit: 10
            },
            {
                $project: {
                    title: 1,
                    registrationCount: 1,
                    eventType: 1,
                    'schedule.startDate': 1
                }
            }
        ]);

        // User engagement metrics
        const userEngagement = await this.getUserEngagementMetrics(startDate, endDate);

        // Growth metrics (compare with previous week)
        const previousWeekStart = new Date(startDate.getTime() - 7 * TIME_CONSTANTS.DAY);
        const previousWeekEnd = new Date(endDate.getTime() - 7 * TIME_CONSTANTS.DAY);
        const previousWeekData = await this.getBasicMetrics(previousWeekStart, previousWeekEnd);

        const growthMetrics = {
            eventsGrowth: this.calculateGrowthRate(newEvents, previousWeekData.events),
            registrationsGrowth: this.calculateGrowthRate(newRegistrations, previousWeekData.registrations),
            usersGrowth: this.calculateGrowthRate(newUsers, previousWeekData.users)
        };

        return {
            period: { startDate, endDate },
            summary: {
                newEvents,
                newRegistrations,
                newUsers,
                completedEvents,
                averageRating: Math.round(averageRating * 100) / 100
            },
            topEvents,
            userEngagement,
            growthMetrics
        };
    }

    /**
     * Get monthly analytics data
     */
    async getMonthlyAnalytics(startDate, endDate) {
        const Event = require('../models/Event');
        const Registration = require('../models/Registration');
        const User = require('../models/User');
        const Feedback = require('../models/Feedback');

        // Comprehensive metrics
        const basicMetrics = await this.getBasicMetrics(startDate, endDate);

        // Revenue analytics
        const revenueAnalytics = await this.getRevenueAnalytics(startDate, endDate);

        // Geographic distribution
        const geographicData = await this.getGeographicDistribution(startDate, endDate);

        // Faculty/Department analytics
        const facultyAnalytics = await this.getFacultyAnalytics(startDate, endDate);

        // Event category performance
        const categoryPerformance = await this.getCategoryPerformance(startDate, endDate);

        // User behavior analytics
        const userBehavior = await this.getUserBehaviorAnalytics(startDate, endDate);

        // Feedback and satisfaction
        const satisfactionMetrics = await this.getSatisfactionMetrics(startDate, endDate);

        // Trends analysis
        const trends = await this.getTrendsAnalysis(startDate, endDate);

        return {
            period: { startDate, endDate },
            basicMetrics,
            revenueAnalytics,
            geographicData,
            facultyAnalytics,
            categoryPerformance,
            userBehavior,
            satisfactionMetrics,
            trends
        };
    }

    /**
     * Get event performance data
     */
    async getEventPerformanceData(event) {
        const Registration = require('../models/Registration');
        const Feedback = require('../models/Feedback');
        const Analytics = require('../models/Analytics');

        // Registration metrics
        const registrations = await Registration.find({ event: event._id });
        const registrationStats = {
            total: registrations.length,
            approved: registrations.filter(r => r.status === 'approved').length,
            attended: registrations.filter(r => r.status === 'attended').length,
            noShow: registrations.filter(r => r.status === 'no_show').length,
            cancelled: registrations.filter(r => r.status === 'cancelled').length,
            attendanceRate: 0,
            noShowRate: 0
        };

        if (registrationStats.approved > 0) {
            registrationStats.attendanceRate = Math.round((registrationStats.attended / registrationStats.approved) * 100);
            registrationStats.noShowRate = Math.round((registrationStats.noShow / registrationStats.approved) * 100);
        }

        // Feedback metrics
        const feedback = await Feedback.find({ event: event._id });
        const feedbackStats = {
            total: feedback.length,
            averageRating: 0,
            responseRate: 0,
            ratings: {
                1: feedback.filter(f => f.rating === 1).length,
                2: feedback.filter(f => f.rating === 2).length,
                3: feedback.filter(f => f.rating === 3).length,
                4: feedback.filter(f => f.rating === 4).length,
                5: feedback.filter(f => f.rating === 5).length
            }
        };

        if (feedback.length > 0) {
            feedbackStats.averageRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
            feedbackStats.responseRate = Math.round((feedback.length / registrationStats.attended) * 100);
        }

        // Timeline analysis
        const registrationTimeline = await this.getRegistrationTimeline(event._id);

        // Demographics
        const demographics = await this.getEventDemographics(event._id);

        return {
            event: {
                id: event._id,
                title: event.title,
                type: event.eventType,
                startDate: event.schedule.startDate,
                endDate: event.schedule.endDate,
                capacity: event.registration.maxParticipants
            },
            registrationStats,
            feedbackStats,
            registrationTimeline,
            demographics
        };
    }

    /**
     * Generate daily Excel report
     */
    async generateDailyExcelReport(analytics, date) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daily Analytics');

        // Headers
        worksheet.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 15 },
            { header: 'Change', key: 'change', width: 15 },
            { header: 'Notes', key: 'notes', width: 40 }
        ];

        // Add data
        const data = [
            { metric: 'New Events Created', value: analytics.summary.newEvents },
            { metric: 'New Registrations', value: analytics.summary.newRegistrations },
            { metric: 'New Users', value: analytics.summary.newUsers },
            { metric: 'Completed Events', value: analytics.summary.completedEvents },
            { metric: 'Active Users', value: analytics.summary.totalActiveUsers },
            { metric: 'Total Events', value: analytics.summary.totalEvents },
            { metric: 'Total Registrations', value: analytics.summary.totalRegistrations }
        ];

        worksheet.addRows(data);

        // Styling
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add event type distribution
        if (analytics.distributions.eventTypes.length > 0) {
            worksheet.addRow([]);
            worksheet.addRow(['Event Type Distribution']);

            analytics.distributions.eventTypes.forEach(item => {
                worksheet.addRow(['', item._id, item.count]);
            });
        }

        const filePath = path.join(this.reportsDir, `daily-analytics-${date}.xlsx`);
        await workbook.xlsx.writeFile(filePath);

        return filePath;
    }

    /**
     * Generate weekly Excel report
     */
    async generateWeeklyExcelReport(analytics, weekStart) {
        const workbook = new ExcelJS.Workbook();

        // Summary sheet
        const summarySheet = workbook.addWorksheet('Weekly Summary');
        summarySheet.addRow(['Weekly Analytics Report']);
        summarySheet.addRow(['Period:', `${DateUtils.format(analytics.period.startDate, 'DD/MM/YYYY')} - ${DateUtils.format(analytics.period.endDate, 'DD/MM/YYYY')}`]);
        summarySheet.addRow([]);

        // Add summary data
        Object.entries(analytics.summary).forEach(([key, value]) => {
            summarySheet.addRow([key.replace(/([A-Z])/g, ' $1').trim(), value]);
        });

        // Top events sheet
        const eventsSheet = workbook.addWorksheet('Top Events');
        eventsSheet.columns = [
            { header: 'Event Title', key: 'title', width: 40 },
            { header: 'Type', key: 'eventType', width: 15 },
            { header: 'Registrations', key: 'registrationCount', width: 15 },
            { header: 'Start Date', key: 'startDate', width: 20 }
        ];

        eventsSheet.addRows(analytics.topEvents.map(event => ({
            ...event,
            startDate: DateUtils.format(event.schedule.startDate, 'DD/MM/YYYY HH:mm')
        })));

        // User engagement sheet
        const engagementSheet = workbook.addWorksheet('User Engagement');
        Object.entries(analytics.userEngagement).forEach(([key, value]) => {
            engagementSheet.addRow([key, value]);
        });

        const filePath = path.join(this.reportsDir, `weekly-report-${weekStart}.xlsx`);
        await workbook.xlsx.writeFile(filePath);

        return filePath;
    }

    /**
     * Generate event performance Excel report
     */
    async generateEventPerformanceExcel(event, performance) {
        const workbook = new ExcelJS.Workbook();

        // Overview sheet
        const overviewSheet = workbook.addWorksheet('Event Overview');
        overviewSheet.addRow(['Event Performance Report']);
        overviewSheet.addRow(['Event:', event.title]);
        overviewSheet.addRow(['Date:', DateUtils.format(event.schedule.startDate, 'DD/MM/YYYY HH:mm')]);
        overviewSheet.addRow(['Type:', event.eventType]);
        overviewSheet.addRow([]);

        // Registration stats
        overviewSheet.addRow(['Registration Statistics']);
        Object.entries(performance.registrationStats).forEach(([key, value]) => {
            overviewSheet.addRow([key, value]);
        });

        // Feedback sheet
        if (performance.feedbackStats.total > 0) {
            const feedbackSheet = workbook.addWorksheet('Feedback Analysis');
            feedbackSheet.addRow(['Feedback Summary']);
            Object.entries(performance.feedbackStats).forEach(([key, value]) => {
                if (typeof value === 'object') {
                    feedbackSheet.addRow([key]);
                    Object.entries(value).forEach(([subKey, subValue]) => {
                        feedbackSheet.addRow(['', subKey, subValue]);
                    });
                } else {
                    feedbackSheet.addRow([key, value]);
                }
            });
        }

        const filePath = path.join(this.reportsDir, `event-performance-${event._id}-${DateUtils.format(event.schedule.startDate, 'YYYY-MM-DD')}.xlsx`);
        await workbook.xlsx.writeFile(filePath);

        return filePath;
    }

    // Helper methods for analytics calculations
    async getBasicMetrics(startDate, endDate) {
        const Event = require('../models/Event');
        const Registration = require('../models/Registration');
        const User = require('../models/User');

        return {
            events: await Event.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
            registrations: await Registration.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
            users: await User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } })
        };
    }

    calculateGrowthRate(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    }

    async getUserEngagementMetrics(startDate, endDate) {
        const User = require('../models/User');
        const Registration = require('../models/Registration');

        const totalUsers = await User.countDocuments({ isActive: true });
        const activeUsers = await User.countDocuments({
            lastLoginAt: { $gte: startDate, $lte: endDate }
        });
        const registeredUsers = await Registration.distinct('user', {
            createdAt: { $gte: startDate, $lte: endDate }
        });

        return {
            totalUsers,
            activeUsers,
            registeredUsers: registeredUsers.length,
            engagementRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
            registrationRate: activeUsers > 0 ? Math.round((registeredUsers.length / activeUsers) * 100) : 0
        };
    }

    async getRegistrationTimeline(eventId) {
        const Registration = require('../models/Registration');

        const timeline = await Registration.aggregate([
            { $match: { event: mongoose.Types.ObjectId(eventId) } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        return timeline.map(item => ({
            date: item._id,
            registrations: item.count
        }));
    }

    async getEventDemographics(eventId) {
        const Registration = require('../models/Registration');

        const demographics = await Registration.aggregate([
            { $match: { event: mongoose.Types.ObjectId(eventId) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $group: {
                    _id: {
                        faculty: '$userInfo.student.faculty',
                        year: '$userInfo.student.year',
                        gender: '$userInfo.profile.gender'
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        return {
            byFaculty: this.groupBy(demographics, '_id.faculty'),
            byYear: this.groupBy(demographics, '_id.year'),
            byGender: this.groupBy(demographics, '_id.gender')
        };
    }

    groupBy(array, key) {
        return array.reduce((result, item) => {
            const groupKey = this.getNestedValue(item, key) || 'Unknown';
            if (!result[groupKey]) {
                result[groupKey] = 0;
            }
            result[groupKey] += item.count;
            return result;
        }, {});
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    // Send report methods
    async sendReportToAdmins(reportType, data) {
        const User = require('../models/User');
        const admins = await User.find({
            roles: 'admin',
            isActive: true,
            'preferences.notifications.reports': true
        });

        for (const admin of admins) {
            try {
                await emailService.sendEmail({
                    to: admin.email,
                    subject: `📊 ${reportType.toUpperCase()} Analytics Report - ${data.date}`,
                    html: this.generateReportEmail(reportType, data),
                    attachments: data.files?.map(file => ({
                        filename: path.basename(file),
                        path: file
                    }))
                });
            } catch (error) {
                logger.error(`Failed to send report to admin ${admin.email}:`, error);
            }
        }
    }

    async sendReportToManagement(reportType, data) {
        // Implementation for sending to management team
        const managementEmails = process.env.MANAGEMENT_EMAILS?.split(',') || [];

        for (const email of managementEmails) {
            try {
                await emailService.sendEmail({
                    to: email.trim(),
                    subject: `📈 ${reportType.toUpperCase()} Management Report`,
                    html: this.generateManagementReportEmail(reportType, data),
                    attachments: data.files?.map(file => ({
                        filename: path.basename(file),
                        path: file
                    }))
                });
            } catch (error) {
                logger.error(`Failed to send report to management ${email}:`, error);
            }
        }
    }

    async sendEventReportToOrganizer(event, data) {
        try {
            await emailService.sendEmail({
                to: event.organizer.email,
                subject: `📊 Báo cáo hiệu suất sự kiện: ${event.title}`,
                html: this.generateEventPerformanceEmail(event, data),
                attachments: data.files?.map(file => ({
                    filename: path.basename(file),
                    path: file
                }))
            });
        } catch (error) {
            logger.error(`Failed to send event report to organizer ${event.organizer.email}:`, error);
        }
    }

    /**
     * Generate report email content
     */
    generateReportEmail(reportType, data) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                <h2>📊 ${reportType.toUpperCase()} Analytics Report</h2>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3>📈 Key Metrics</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        ${Object.entries(data.analytics.summary).map(([key, value]) => `
                            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="font-size: 24px; font-weight: bold; color: #007bff;">${value}</div>
                                <div style="font-size: 14px; color: #666;">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <p>Chi tiết đầy đủ được đính kèm trong file Excel và PDF.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/admin/analytics" 
                       style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                        📊 Xem Dashboard
                    </a>
                </div>
            </div>
        `;
    }

    generateEventPerformanceEmail(event, data) {
        const { performance } = data;

        return `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                <h2>📊 Báo cáo hiệu suất sự kiện</h2>
                
                <div style="background-color: #e7f3ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #007bff;">${event.title}</h3>
                    <p><strong>📅 Thời gian:</strong> ${DateUtils.format(event.schedule.startDate, 'DD/MM/YYYY HH:mm')}</p>
                    <p><strong>📍 Địa điểm:</strong> ${event.location.venue || 'Trực tuyến'}</p>
                    <p><strong>🎯 Loại sự kiện:</strong> ${event.eventType}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0;">
                    <div style="background: #d4edda; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #155724;">${performance.registrationStats.total}</div>
                        <div style="font-size: 14px; color: #155724;">Tổng đăng ký</div>
                    </div>
                    <div style="background: #cce7ff; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #004085;">${performance.registrationStats.attended}</div>
                        <div style="font-size: 14px; color: #004085;">Đã tham dự</div>
                    </div>
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #856404;">${performance.registrationStats.attendanceRate}%</div>
                        <div style="font-size: 14px; color: #856404;">Tỷ lệ tham dự</div>
                    </div>
                    <div style="background: #f8d7da; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #721c24;">${performance.feedbackStats.averageRating.toFixed(1)}/5</div>
                        <div style="font-size: 14px; color: #721c24;">Đánh giá TB</div>
                    </div>
                </div>
                
                <p>Báo cáo chi tiết được đính kèm. Cảm ơn bạn đã tổ chức sự kiện thành công!</p>
            </div>
        `;
    }

    /**
     * Clean up old reports
     */
    async cleanupOldReports() {
        try {
            const files = await fs.readdir(this.reportsDir);
            const cutoffTime = Date.now() - (this.retentionDays * TIME_CONSTANTS.DAY);
            let deletedCount = 0;
            let freedSpace = 0;

            for (const file of files) {
                const filePath = path.join(this.reportsDir, file);
                try {
                    const stats = await fs.stat(filePath);

                    if (stats.mtime.getTime() < cutoffTime) {
                        freedSpace += stats.size;
                        await fs.unlink(filePath);
                        deletedCount++;
                    }
                } catch (error) {
                    logger.warn(`Error processing report file ${file}:`, error.message);
                }
            }

            if (deletedCount > 0) {
                logger.info(`Cleaned up ${deletedCount} old reports, freed ${this.formatBytes(freedSpace)}`);
            }

        } catch (error) {
            logger.error('Report cleanup failed:', error);
        }
    }

    async ensureReportsDirectory() {
        try {
            await fs.access(this.reportsDir);
        } catch {
            await fs.mkdir(this.reportsDir, { recursive: true });
            logger.info(`Created reports directory: ${this.reportsDir}`);
        }
    }

    formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    /**
     * Generate manual report
     */
    async generateManualReport(type, options = {}) {
        try {
            const { startDate, endDate, format = 'excel', recipients } = options;

            let analytics;
            let filePath;

            switch (type) {
                case 'daily':
                    analytics = await this.getDailyAnalytics(new Date(startDate), new Date(endDate));
                    filePath = await this.generateDailyExcelReport(analytics, startDate);
                    break;
                case 'weekly':
                    analytics = await this.getWeeklyAnalytics(new Date(startDate), new Date(endDate));
                    filePath = await this.generateWeeklyExcelReport(analytics, startDate);
                    break;
                case 'monthly':
                    analytics = await this.getMonthlyAnalytics(new Date(startDate), new Date(endDate));
                    filePath = await this.generateMonthlyExcelReport(analytics, startDate);
                    break;
                default:
                    throw new Error(`Unknown report type: ${type}`);
            }

            // Send to specified recipients
            if (recipients && recipients.length > 0) {
                for (const email of recipients) {
                    await emailService.sendEmail({
                        to: email,
                        subject: `📊 Manual ${type.toUpperCase()} Report`,
                        html: this.generateReportEmail(type, { analytics }),
                        attachments: [{
                            filename: path.basename(filePath),
                            path: filePath
                        }]
                    });
                }
            }

            return {
                success: true,
                filePath,
                analytics
            };

        } catch (error) {
            logger.error('Manual report generation failed:', error);
            throw error;
        }
    }

    /**
     * Get report job status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            reportsDir: this.reportsDir,
            retentionDays: this.retentionDays
        };
    }
}

module.exports = new ReportJobs();