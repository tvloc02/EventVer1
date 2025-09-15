const Event = require('../../models/Event');
const Registration = require('../../models/Registration');
const User = require('../../models/User');
const Certificate = require('../../models/Certificate');
const Attendance = require('../../models/Attendance');
const cacheService = require('../cacheService');
const logger = require('../../utils/logger');

class AnalyticsService {
    // Get dashboard analytics
    async getDashboardAnalytics(userId = null, timeRange = '30d') {
        try {
            const cacheKey = userId
                ? `analytics:dashboard:${userId}:${timeRange}`
                : `analytics:dashboard:global:${timeRange}`;

            let analytics = await cacheService.get(cacheKey);
            if (analytics) {
                return analytics;
            }

            const dateRange = this.getDateRange(timeRange);

            analytics = {
                overview: await this.getOverviewStats(dateRange, userId),
                events: await this.getEventAnalytics(dateRange, userId),
                users: await this.getUserAnalytics(dateRange, userId),
                registrations: await this.getRegistrationAnalytics(dateRange, userId),
                certificates: await this.getCertificateAnalytics(dateRange, userId),
                trends: await this.getTrendAnalytics(dateRange, userId),
                performance: await this.getPerformanceMetrics(dateRange, userId)
            };

            // Cache for 15 minutes
            await cacheService.set(cacheKey, analytics, 900);

            return analytics;

        } catch (error) {
            logger.error('Get dashboard analytics error:', error);
            throw error;
        }
    }

    // Overview statistics
    async getOverviewStats(dateRange, userId = null) {
        try {
            const matchQuery = {};
            if (dateRange.start && dateRange.end) {
                matchQuery.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
            }
            if (userId) {
                matchQuery.organizer = userId;
            }

            const [
                totalEvents,
                totalUsers,
                totalRegistrations,
                totalCertificates,
                activeEvents,
                previousPeriodEvents
            ] = await Promise.all([
                Event.countDocuments(matchQuery),
                userId ? null : User.countDocuments(matchQuery),
                Registration.countDocuments(matchQuery),
                Certificate.countDocuments(matchQuery),
                Event.countDocuments({
                    ...matchQuery,
                    status: { $in: ['published', 'ongoing'] }
                }),
                this.getPreviousPeriodStats(dateRange, userId)
            ]);

            const growth = this.calculateGrowthRates(
                { totalEvents, totalUsers, totalRegistrations, totalCertificates },
                previousPeriodEvents
            );

            return {
                totalEvents,
                totalUsers: totalUsers || 0,
                totalRegistrations,
                totalCertificates,
                activeEvents,
                growth
            };

        } catch (error) {
            logger.error('Get overview stats error:', error);
            throw error;
        }
    }

    // Event analytics
    async getEventAnalytics(dateRange, userId = null) {
        try {
            const matchQuery = {};
            if (dateRange.start && dateRange.end) {
                matchQuery.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
            }
            if (userId) {
                matchQuery.organizer = userId;
            }

            const pipeline = [
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$eventType',
                        count: { $sum: 1 },
                        totalViews: { $sum: '$stats.views' },
                        totalRegistrations: { $sum: '$stats.registrations' },
                        averageRating: { $avg: '$stats.averageRating' }
                    }
                },
                { $sort: { count: -1 } }
            ];

            const eventTypeStats = await Event.aggregate(pipeline);

            // Category distribution
            const categoryPipeline = [
                { $match: matchQuery },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'category',
                        foreignField: '_id',
                        as: 'categoryInfo'
                    }
                },
                { $unwind: '$categoryInfo' },
                {
                    $group: {
                        _id: '$categoryInfo.name',
                        count: { $sum: 1 },
                        totalRegistrations: { $sum: '$stats.registrations' }
                    }
                },
                { $sort: { count: -1 } }
            ];

            const categoryStats = await Event.aggregate(categoryPipeline);

            // Popular events
            const popularEvents = await Event.find(matchQuery)
                .select('title slug stats images.thumbnail')
                .sort({ 'stats.views': -1, 'stats.registrations': -1 })
                .limit(10);

            return {
                byType: eventTypeStats,
                byCategory: categoryStats,
                popularEvents,
                totalViews: eventTypeStats.reduce((sum, item) => sum + item.totalViews, 0)
            };

        } catch (error) {
            logger.error('Get event analytics error:', error);
            throw error;
        }
    }

    // User analytics
    async getUserAnalytics(dateRange, userId = null) {
        try {
            if (userId) {
                // Individual user analytics
                return await this.getIndividualUserAnalytics(userId, dateRange);
            }

            // Global user analytics
            const matchQuery = {};
            if (dateRange.start && dateRange.end) {
                matchQuery.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
            }

            const [
                registrationsByRole,
                registrationsByFaculty,
                registrationsByDepartment,
                activeUsers,
                newUsers
            ] = await Promise.all([
                User.aggregate([
                    { $match: matchQuery },
                    { $group: { _id: '$role', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),
                User.aggregate([
                    { $match: matchQuery },
                    { $group: { _id: '$student.faculty', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),
                User.aggregate([
                    { $match: matchQuery },
                    { $group: { _id: '$student.department', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),
                User.countDocuments({
                    lastActivity: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }),
                User.countDocuments({
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                })
            ]);

            return {
                byRole: registrationsByRole,
                byFaculty: registrationsByFaculty.filter(item => item._id), // Remove null faculty
                byDepartment: registrationsByDepartment.filter(item => item._id),
                activeUsers,
                newUsers,
                totalUsers: registrationsByRole.reduce((sum, item) => sum + item.count, 0)
            };

        } catch (error) {
            logger.error('Get user analytics error:', error);
            throw error;
        }
    }

    // Individual user analytics
    async getIndividualUserAnalytics(userId, dateRange) {
        try {
            const matchQuery = { user: userId };
            if (dateRange.start && dateRange.end) {
                matchQuery.registrationDate = { $gte: dateRange.start, $lte: dateRange.end };
            }

            const [
                totalRegistrations,
                attendedEvents,
                certificates,
                averageRating,
                eventTypes,
                monthlyActivity
            ] = await Promise.all([
                Registration.countDocuments(matchQuery),
                Registration.countDocuments({ ...matchQuery, status: 'attended' }),
                Certificate.countDocuments({ user: userId }),
                Registration.aggregate([
                    { $match: { ...matchQuery, 'feedback.rating': { $exists: true } } },
                    { $group: { _id: null, avgRating: { $avg: '$feedback.rating' } } }
                ]),
                Registration.aggregate([
                    { $match: matchQuery },
                    {
                        $lookup: {
                            from: 'events',
                            localField: 'event',
                            foreignField: '_id',
                            as: 'eventInfo'
                        }
                    },
                    { $unwind: '$eventInfo' },
                    { $group: { _id: '$eventInfo.eventType', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),
                this.getMonthlyUserActivity(userId, dateRange)
            ]);

            return {
                totalRegistrations,
                attendedEvents,
                totalCertificates: certificates,
                attendanceRate: totalRegistrations > 0
                    ? Math.round((attendedEvents / totalRegistrations) * 100)
                    : 0,
                averageRating: averageRating[0]?.avgRating || 0,
                eventTypes,
                monthlyActivity
            };

        } catch (error) {
            logger.error('Get individual user analytics error:', error);
            throw error;
        }
    }

    // Registration analytics
    async getRegistrationAnalytics(dateRange, userId = null) {
        try {
            const matchQuery = {};
            if (dateRange.start && dateRange.end) {
                matchQuery.registrationDate = { $gte: dateRange.start, $lte: dateRange.end };
            }

            if (userId) {
                // For organizer - get registrations for their events
                const userEvents = await Event.find({ organizer: userId }).select('_id');
                matchQuery.event = { $in: userEvents.map(e => e._id) };
            }

            const [
                statusDistribution,
                dailyRegistrations,
                sourceAnalysis,
                conversionRates
            ] = await Promise.all([
                Registration.aggregate([
                    { $match: matchQuery },
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),
                Registration.aggregate([
                    { $match: matchQuery },
                    {
                        $group: {
                            _id: {
                                $dateToString: { format: "%Y-%m-%d", date: "$registrationDate" }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]),
                Registration.aggregate([
                    { $match: matchQuery },
                    { $group: { _id: '$source.channel', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),
                this.calculateConversionRates(matchQuery)
            ]);

            return {
                statusDistribution,
                dailyRegistrations,
                sourceAnalysis,
                conversionRates,
                totalRegistrations: statusDistribution.reduce((sum, item) => sum + item.count, 0)
            };

        } catch (error) {
            logger.error('Get registration analytics error:', error);
            throw error;
        }
    }

    // Certificate analytics
    async getCertificateAnalytics(dateRange, userId = null) {
        try {
            const matchQuery = {};
            if (dateRange.start && dateRange.end) {
                matchQuery.issuedDate = { $gte: dateRange.start, $lte: dateRange.end };
            }

            if (userId) {
                matchQuery.issuedBy = userId;
            }

            const [
                typeDistribution,
                dailyIssuance,
                facultyDistribution,
                verificationStats
            ] = await Promise.all([
                Certificate.aggregate([
                    { $match: matchQuery },
                    { $group: { _id: '$type', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),
                Certificate.aggregate([
                    { $match: matchQuery },
                    {
                        $group: {
                            _id: {
                                $dateToString: { format: "%Y-%m-%d", date: "$issuedDate" }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]),
                Certificate.aggregate([
                    { $match: matchQuery },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'user',
                            foreignField: '_id',
                            as: 'userInfo'
                        }
                    },
                    { $unwind: '$userInfo' },
                    { $group: { _id: '$userInfo.student.faculty', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),
                Certificate.aggregate([
                    { $match: matchQuery },
                    {
                        $group: {
                            _id: null,
                            totalIssued: { $sum: 1 },
                            totalVerified: {
                                $sum: { $cond: [{ $gt: ['$verificationCount', 0] }, 1, 0] }
                            },
                            totalShared: {
                                $sum: { $cond: [{ $gt: ['$sharedCount', 0] }, 1, 0] }
                            }
                        }
                    }
                ])
            ]);

            const totalCertificates = typeDistribution.reduce((sum, item) => sum + item.count, 0);
            const verificationData = verificationStats[0] || {};

            return {
                typeDistribution,
                dailyIssuance,
                facultyDistribution: facultyDistribution.filter(item => item._id),
                totalCertificates,
                verificationRate: totalCertificates > 0
                    ? Math.round((verificationData.totalVerified || 0) / totalCertificates * 100)
                    : 0,
                shareRate: totalCertificates > 0
                    ? Math.round((verificationData.totalShared || 0) / totalCertificates * 100)
                    : 0
            };

        } catch (error) {
            logger.error('Get certificate analytics error:', error);
            throw error;
        }
    }

    // Trend analytics
    async getTrendAnalytics(dateRange, userId = null) {
        try {
            const periods = this.generatePeriods(dateRange);
            const trends = {
                events: [],
                registrations: [],
                attendance: [],
                certificates: []
            };

            for (const period of periods) {
                const periodQuery = {
                    createdAt: { $gte: period.start, $lte: period.end }
                };

                if (userId) {
                    periodQuery.organizer = userId;
                }

                const [events, registrations, certificates] = await Promise.all([
                    Event.countDocuments(periodQuery),
                    Registration.countDocuments({
                        registrationDate: { $gte: period.start, $lte: period.end },
                        ...(userId && { event: { $in: await this.getUserEventIds(userId) } })
                    }),
                    Certificate.countDocuments({
                        issuedDate: { $gte: period.start, $lte: period.end },
                        ...(userId && { issuedBy: userId })
                    })
                ]);

                const attendance = await Registration.countDocuments({
                    'attendance.checkInTime': { $gte: period.start, $lte: period.end },
                    ...(userId && { event: { $in: await this.getUserEventIds(userId) } })
                });

                trends.events.push({ period: period.label, value: events });
                trends.registrations.push({ period: period.label, value: registrations });
                trends.attendance.push({ period: period.label, value: attendance });
                trends.certificates.push({ period: period.label, value: certificates });
            }

            return trends;

        } catch (error) {
            logger.error('Get trend analytics error:', error);
            throw error;
        }
    }

    // Performance metrics
    async getPerformanceMetrics(dateRange, userId = null) {
        try {
            const eventQuery = {};
            if (dateRange.start && dateRange.end) {
                eventQuery.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
            }
            if (userId) {
                eventQuery.organizer = userId;
            }

            const events = await Event.find(eventQuery).select('stats registration');

            if (events.length === 0) {
                return {
                    averageRegistrationRate: 0,
                    averageAttendanceRate: 0,
                    averageCompletionRate: 0,
                    averageRating: 0,
                    cancellationRate: 0
                };
            }

            let totalRegRate = 0;
            let totalAttendRate = 0;
            let totalCompletionRate = 0;
            let totalRating = 0;
            let totalCancellationRate = 0;
            let validEvents = 0;

            events.forEach(event => {
                const stats = event.stats;
                const maxParticipants = event.registration.maxParticipants;

                if (maxParticipants > 0) {
                    const regRate = (stats.registrations / maxParticipants) * 100;
                    const attendRate = stats.registrations > 0
                        ? (stats.attendees / stats.registrations) * 100
                        : 0;
                    const completionRate = stats.attendees > 0
                        ? (stats.completions / stats.attendees) * 100
                        : 0;
                    const cancellationRate = stats.registrations > 0
                        ? (stats.cancellations / stats.registrations) * 100
                        : 0;

                    totalRegRate += regRate;
                    totalAttendRate += attendRate;
                    totalCompletionRate += completionRate;
                    totalRating += stats.averageRating || 0;
                    totalCancellationRate += cancellationRate;
                    validEvents++;
                }
            });

            return {
                averageRegistrationRate: validEvents > 0 ? Math.round(totalRegRate / validEvents) : 0,
                averageAttendanceRate: validEvents > 0 ? Math.round(totalAttendRate / validEvents) : 0,
                averageCompletionRate: validEvents > 0 ? Math.round(totalCompletionRate / validEvents) : 0,
                averageRating: validEvents > 0 ? Math.round((totalRating / validEvents) * 10) / 10 : 0,
                cancellationRate: validEvents > 0 ? Math.round(totalCancellationRate / validEvents) : 0
            };

        } catch (error) {
            logger.error('Get performance metrics error:', error);
            throw error;
        }
    }

    // Event performance analysis
    async getEventPerformanceAnalysis(eventId) {
        try {
            const cacheKey = `analytics:event_performance:${eventId}`;

            let analysis = await cacheService.get(cacheKey);
            if (analysis) {
                return analysis;
            }

            const event = await Event.findById(eventId)
                .populate('category', 'name')
                .populate('organizer', 'profile.fullName');

            if (!event) {
                throw new NotFoundError('Sự kiện không tồn tại');
            }

            const registrations = await Registration.find({ event: eventId });
            const certificates = await Certificate.find({ event: eventId });

            // Calculate metrics
            const metrics = {
                registrationMetrics: this.calculateRegistrationMetrics(event, registrations),
                attendanceMetrics: this.calculateAttendanceMetrics(registrations),
                engagementMetrics: this.calculateEngagementMetrics(event, registrations),
                certificateMetrics: this.calculateCertificateMetrics(certificates),
                feedbackMetrics: this.calculateFeedbackMetrics(registrations),
                timelineAnalysis: this.analyzeEventTimeline(event, registrations)
            };

            analysis = {
                event: {
                    id: event._id,
                    title: event.title,
                    category: event.category?.name,
                    organizer: event.organizer.profile.fullName,
                    startDate: event.schedule.startDate,
                    endDate: event.schedule.endDate
                },
                metrics,
                recommendations: this.generateRecommendations(metrics),
                score: this.calculateOverallScore(metrics)
            };

            // Cache for 30 minutes
            await cacheService.set(cacheKey, analysis, 1800);

            return analysis;

        } catch (error) {
            logger.error('Get event performance analysis error:', error);
            throw error;
        }
    }

    // Comparative analytics
    async getComparativeAnalytics(eventIds, metrics = ['registrations', 'attendance', 'ratings']) {
        try {
            const events = await Event.find({ _id: { $in: eventIds } })
                .select('title stats schedule registration');

            const comparisons = [];

            for (const event of events) {
                const eventMetrics = {};

                if (metrics.includes('registrations')) {
                    eventMetrics.registrationRate = event.registration.maxParticipants > 0
                        ? (event.stats.registrations / event.registration.maxParticipants) * 100
                        : 0;
                }

                if (metrics.includes('attendance')) {
                    eventMetrics.attendanceRate = event.stats.registrations > 0
                        ? (event.stats.attendees / event.stats.registrations) * 100
                        : 0;
                }

                if (metrics.includes('ratings')) {
                    eventMetrics.averageRating = event.stats.averageRating || 0;
                }

                if (metrics.includes('completion')) {
                    eventMetrics.completionRate = event.stats.attendees > 0
                        ? (event.stats.completions / event.stats.attendees) * 100
                        : 0;
                }

                comparisons.push({
                    eventId: event._id,
                    title: event.title,
                    metrics: eventMetrics
                });
            }

            return {
                comparisons,
                averages: this.calculateAverageMetrics(comparisons),
                bestPerforming: this.findBestPerforming(comparisons),
                insights: this.generateComparativeInsights(comparisons)
            };

        } catch (error) {
            logger.error('Get comparative analytics error:', error);
            throw error;
        }
    }

    // Real-time analytics
    async getRealTimeAnalytics(eventId) {
        try {
            const now = new Date();
            const event = await Event.findById(eventId);

            if (!event) {
                throw new NotFoundError('Sự kiện không tồn tại');
            }

            const [
                liveAttendance,
                recentCheckIns,
                currentCapacity,
                liveStats
            ] = await Promise.all([
                Registration.countDocuments({
                    event: eventId,
                    'attendance.checkedIn': true,
                    'attendance.checkedOut': { $ne: true }
                }),
                Registration.find({
                    event: eventId,
                    'attendance.checkInTime': { $gte: new Date(now - 30 * 60 * 1000) }
                })
                    .populate('user', 'profile.fullName student.studentId')
                    .sort({ 'attendance.checkInTime': -1 })
                    .limit(10),
                this.getCurrentCapacity(eventId),
                this.getLiveEventStats(eventId)
            ]);

            return {
                liveAttendance,
                recentCheckIns: recentCheckIns.map(reg => ({
                    userName: reg.user.profile.fullName,
                    studentId: reg.user.student?.studentId,
                    checkInTime: reg.attendance.checkInTime,
                    method: reg.attendance.checkInMethod
                })),
                capacity: currentCapacity,
                stats: liveStats,
                lastUpdate: now
            };

        } catch (error) {
            logger.error('Get real-time analytics error:', error);
            throw error;
        }
    }

    // Helper methods
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

    generatePeriods(dateRange) {
        const periods = [];
        const diffDays = Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) {
            // Daily periods
            for (let i = 0; i < diffDays; i++) {
                const date = new Date(dateRange.start.getTime() + i * 24 * 60 * 60 * 1000);
                periods.push({
                    start: new Date(date.setHours(0, 0, 0, 0)),
                    end: new Date(date.setHours(23, 59, 59, 999)),
                    label: date.toLocaleDateString('vi-VN')
                });
            }
        } else if (diffDays <= 30) {
            // Weekly periods
            const weeks = Math.ceil(diffDays / 7);
            for (let i = 0; i < weeks; i++) {
                const start = new Date(dateRange.start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
                const end = new Date(Math.min(
                    start.getTime() + 6 * 24 * 60 * 60 * 1000,
                    dateRange.end.getTime()
                ));
                periods.push({
                    start,
                    end,
                    label: `Tuần ${i + 1}`
                });
            }
        } else {
            // Monthly periods
            const months = Math.ceil(diffDays / 30);
            for (let i = 0; i < months; i++) {
                const start = new Date(dateRange.start.getTime() + i * 30 * 24 * 60 * 60 * 1000);
                const end = new Date(Math.min(
                    start.getTime() + 29 * 24 * 60 * 60 * 1000,
                    dateRange.end.getTime()
                ));
                periods.push({
                    start,
                    end,
                    label: `Tháng ${start.getMonth() + 1}/${start.getFullYear()}`
                });
            }
        }

        return periods;
    }

    async getPreviousPeriodStats(currentRange, userId = null) {
        try {
            const duration = currentRange.end - currentRange.start;
            const previousStart = new Date(currentRange.start.getTime() - duration);
            const previousEnd = new Date(currentRange.start.getTime());

            const query = {
                createdAt: { $gte: previousStart, $lte: previousEnd }
            };

            if (userId) {
                query.organizer = userId;
            }

            return await Promise.all([
                Event.countDocuments(query),
                userId ? 0 : User.countDocuments(query),
                Registration.countDocuments({
                    registrationDate: { $gte: previousStart, $lte: previousEnd },
                    ...(userId && { event: { $in: await this.getUserEventIds(userId) } })
                }),
                Certificate.countDocuments({
                    issuedDate: { $gte: previousStart, $lte: previousEnd },
                    ...(userId && { issuedBy: userId })
                })
            ]);

        } catch (error) {
            logger.error('Get previous period stats error:', error);
            return [0, 0, 0, 0];
        }
    }

    calculateGrowthRates(current, previous) {
        const [prevEvents, prevUsers, prevRegistrations, prevCertificates] = previous;

        const calculateRate = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };

        return {
            events: calculateRate(current.totalEvents, prevEvents),
            users: calculateRate(current.totalUsers, prevUsers),
            registrations: calculateRate(current.totalRegistrations, prevRegistrations),
            certificates: calculateRate(current.totalCertificates, prevCertificates)
        };
    }

    async getUserEventIds(userId) {
        try {
            const events = await Event.find({ organizer: userId }).select('_id');
            return events.map(e => e._id);
        } catch (error) {
            return [];
        }
    }

    async calculateConversionRates(matchQuery) {
        try {
            const funnelData = await Registration.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalRegistrations: { $sum: 1 },
                        approvedRegistrations: {
                            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                        },
                        attendedEvents: {
                            $sum: { $cond: [{ $eq: ['$status', 'attended'] }, 1, 0] }
                        },
                        completedEvents: {
                            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                        },
                        certificatesIssued: {
                            $sum: { $cond: ['$certificate.issued', 1, 0] }
                        }
                    }
                }
            ]);

            const data = funnelData[0] || {};
            const total = data.totalRegistrations || 0;

            return {
                registrationToApproval: total > 0 ? Math.round((data.approvedRegistrations / total) * 100) : 0,
                approvalToAttendance: data.approvedRegistrations > 0
                    ? Math.round((data.attendedEvents / data.approvedRegistrations) * 100)
                    : 0,
                attendanceToCompletion: data.attendedEvents > 0
                    ? Math.round((data.completedEvents / data.attendedEvents) * 100)
                    : 0,
                completionToCertificate: data.completedEvents > 0
                    ? Math.round((data.certificatesIssued / data.completedEvents) * 100)
                    : 0
            };

        } catch (error) {
            logger.error('Calculate conversion rates error:', error);
            return {
                registrationToApproval: 0,
                approvalToAttendance: 0,
                attendanceToCompletion: 0,
                completionToCertificate: 0
            };
        }
    }

    calculateRegistrationMetrics(event, registrations) {
        const total = registrations.length;
        const maxParticipants = event.registration.maxParticipants;

        return {
            totalRegistrations: total,
            capacityUtilization: maxParticipants > 0 ? Math.round((total / maxParticipants) * 100) : 0,
            statusBreakdown: this.groupByStatus(registrations),
            registrationTimeline: this.buildRegistrationTimeline(registrations),
            averageRegistrationTime: this.calculateAverageRegistrationTime(event, registrations)
        };
    }

    calculateAttendanceMetrics(registrations) {
        const attended = registrations.filter(r => r.status === 'attended');
        const checkedIn = registrations.filter(r => r.attendance.checkedIn);

        return {
            totalAttended: attended.length,
            attendanceRate: registrations.length > 0
                ? Math.round((attended.length / registrations.length) * 100)
                : 0,
            checkInRate: registrations.length > 0
                ? Math.round((checkedIn.length / registrations.length) * 100)
                : 0,
            averageAttendanceRate: this.calculateAverageAttendanceRate(attended),
            noShowRate: registrations.length > 0
                ? Math.round((registrations.filter(r => r.status === 'approved' && !r.attendance.checkedIn).length / registrations.length) * 100)
                : 0
        };
    }

    calculateEngagementMetrics(event, registrations) {
        const totalViews = event.stats.views || 0;
        const totalRegistrations = registrations.length;

        return {
            viewToRegistrationRate: totalViews > 0
                ? Math.round((totalRegistrations / totalViews) * 100)
                : 0,
            socialShares: event.stats.shares || 0,
            averageRating: event.stats.averageRating || 0,
            ratingCount: event.stats.totalRatings || 0,
            feedbackSubmissionRate: this.calculateFeedbackSubmissionRate(registrations)
        };
    }

    calculateCertificateMetrics(certificates) {
        const total = certificates.length;
        const verified = certificates.filter(c => c.verificationCount > 0).length;
        const shared = certificates.filter(c => c.sharedCount > 0).length;

        return {
            totalIssued: total,
            verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0,
            shareRate: total > 0 ? Math.round((shared / total) * 100) : 0,
            averageVerifications: total > 0
                ? Math.round(certificates.reduce((sum, c) => sum + c.verificationCount, 0) / total)
                : 0
        };
    }

    calculateFeedbackMetrics(registrations) {
        const withFeedback = registrations.filter(r => r.feedback.submitted);
        const total = registrations.filter(r => r.status === 'attended').length;

        if (withFeedback.length === 0) {
            return {
                submissionRate: 0,
                averageRating: 0,
                ratingDistribution: {},
                commonComplaints: [],
                commonPraises: []
            };
        }

        const ratings = withFeedback.map(r => r.feedback.rating).filter(r => r);
        const ratingDistribution = {};

        ratings.forEach(rating => {
            ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
        });

        return {
            submissionRate: total > 0 ? Math.round((withFeedback.length / total) * 100) : 0,
            averageRating: ratings.length > 0
                ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
                : 0,
            ratingDistribution,
            totalFeedbacks: withFeedback.length
        };
    }

    // Additional helper methods
    groupByStatus(registrations) {
        return registrations.reduce((acc, reg) => {
            acc[reg.status] = (acc[reg.status] || 0) + 1;
            return acc;
        }, {});
    }

    buildRegistrationTimeline(registrations) {
        const timeline = {};

        registrations.forEach(reg => {
            const date = new Date(reg.registrationDate).toISOString().split('T')[0];
            timeline[date] = (timeline[date] || 0) + 1;
        });

        return timeline;
    }

    calculateAverageRegistrationTime(event, registrations) {
        const regStart = new Date(event.schedule.registrationStart);
        const totalTime = registrations.reduce((sum, reg) => {
            return sum + (new Date(reg.registrationDate) - regStart);
        }, 0);

        return registrations.length > 0
            ? Math.round(totalTime / registrations.length / (1000 * 60 * 60 * 24)) // days
            : 0;
    }

    calculateAverageAttendanceRate(attendedRegistrations) {
        const rates = attendedRegistrations
            .map(r => r.attendance.attendanceRate)
            .filter(rate => rate !== null && rate !== undefined);

        return rates.length > 0
            ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
            : 0;
    }

    calculateFeedbackSubmissionRate(registrations) {
        const attended = registrations.filter(r => r.status === 'attended');
        const withFeedback = attended.filter(r => r.feedback.submitted);

        return attended.length > 0
            ? Math.round((withFeedback.length / attended.length) * 100)
            : 0;
    }

    async getCurrentCapacity(eventId) {
        const event = await Event.findById(eventId).select('registration stats');
        const current = event.stats.registrations || 0;
        const max = event.registration.maxParticipants || 0;

        return {
            current,
            maximum: max,
            available: Math.max(0, max - current),
            utilizationRate: max > 0 ? Math.round((current / max) * 100) : 0
        };
    }

    async getLiveEventStats(eventId) {
        const registrations = await Registration.find({ event: eventId });

        return {
            totalRegistrations: registrations.length,
            approvedRegistrations: registrations.filter(r => r.status === 'approved').length,
            currentlyPresent: registrations.filter(r =>
                r.attendance.checkedIn && !r.attendance.checkedOut
            ).length,
            totalCheckedIn: registrations.filter(r => r.attendance.checkedIn).length
        };
    }

    calculateAverageMetrics(comparisons) {
        if (comparisons.length === 0) return {};

        const averages = {};
        const metricKeys = Object.keys(comparisons[0].metrics || {});

        metricKeys.forEach(key => {
            const values = comparisons.map(c => c.metrics[key]).filter(v => v !== undefined);
            averages[key] = values.length > 0
                ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
                : 0;
        });

        return averages;
    }

    findBestPerforming(comparisons) {
        if (comparisons.length === 0) return null;

        return comparisons.reduce((best, current) => {
            const currentScore = this.calculateComparisonScore(current.metrics);
            const bestScore = this.calculateComparisonScore(best.metrics);
            return currentScore > bestScore ? current : best;
        });
    }

    calculateComparisonScore(metrics) {
        const weights = {
            registrationRate: 0.3,
            attendanceRate: 0.4,
            averageRating: 0.2,
            completionRate: 0.1
        };

        return Object.keys(weights).reduce((score, key) => {
            return score + (metrics[key] || 0) * weights[key];
        }, 0);
    }

    generateComparativeInsights(comparisons) {
        const insights = [];

        if (comparisons.length < 2) {
            return ['Cần ít nhất 2 sự kiện để so sánh'];
        }

        const averages = this.calculateAverageMetrics(comparisons);
        const best = this.findBestPerforming(comparisons);

        if (best) {
            insights.push(`Sự kiện "${best.title}" có hiệu suất tốt nhất`);
        }

        // Registration rate insights
        if (averages.registrationRate) {
            const lowRegEvents = comparisons.filter(c =>
                c.metrics.registrationRate < averages.registrationRate * 0.8
            );
            if (lowRegEvents.length > 0) {
                insights.push(`${lowRegEvents.length} sự kiện có tỷ lệ đăng ký thấp hơn trung bình`);
            }
        }

        // Attendance rate insights
        if (averages.attendanceRate) {
            const highAttendance = comparisons.filter(c =>
                c.metrics.attendanceRate > 90
            );
            if (highAttendance.length > 0) {
                insights.push(`${highAttendance.length} sự kiện có tỷ lệ tham gia trên 90%`);
            }
        }

        return insights;
    }

    generateRecommendations(metrics) {
        const recommendations = [];

        // Registration recommendations
        if (metrics.registrationMetrics.capacityUtilization < 50) {
            recommendations.push({
                type: 'marketing',
                priority: 'high',
                message: 'Tăng cường marketing để cải thiện tỷ lệ đăng ký'
            });
        }

        // Attendance recommendations
        if (metrics.attendanceMetrics.attendanceRate < 70) {
            recommendations.push({
                type: 'engagement',
                priority: 'high',
                message: 'Cải thiện chiến lược tương tác để tăng tỷ lệ tham gia'
            });
        }

        // Feedback recommendations
        if (metrics.feedbackMetrics.submissionRate < 50) {
            recommendations.push({
                type: 'feedback',
                priority: 'medium',
                message: 'Khuyến khích người tham gia đánh giá và góp ý'
            });
        }

        // Certificate recommendations
        if (metrics.certificateMetrics.shareRate < 30) {
            recommendations.push({
                type: 'certificates',
                priority: 'low',
                message: 'Tối ưu hóa chứng nhận để tăng tỷ lệ chia sẻ'
            });
        }

        return recommendations;
    }

    calculateOverallScore(metrics) {
        const weights = {
            registration: 0.25,
            attendance: 0.35,
            engagement: 0.25,
            certificates: 0.15
        };

        const scores = {
            registration: Math.min(100, metrics.registrationMetrics.capacityUtilization),
            attendance: metrics.attendanceMetrics.attendanceRate,
            engagement: (metrics.engagementMetrics.averageRating / 5) * 100,
            certificates: metrics.certificateMetrics.verificationRate
        };

        const weightedScore = Object.keys(weights).reduce((total, key) => {
            return total + (scores[key] * weights[key]);
        }, 0);

        return Math.round(weightedScore);
    }

    analyzeEventTimeline(event, registrations) {
        const timeline = [];
        const eventStart = new Date(event.schedule.startDate);
        const regStart = new Date(event.schedule.registrationStart);

        // Registration opening
        timeline.push({
            date: regStart,
            event: 'Mở đăng ký',
            type: 'milestone'
        });

        // Registration milestones
        const regMilestones = [25, 50, 75, 100];
        const maxParticipants = event.registration.maxParticipants;

        regMilestones.forEach(percentage => {
            const target = Math.floor(maxParticipants * percentage / 100);
            const regsAtTarget = registrations.filter(r =>
                registrations.indexOf(r) < target
            );

            if (regsAtTarget.length >= target) {
                timeline.push({
                    date: regsAtTarget[target - 1].registrationDate,
                    event: `Đạt ${percentage}% đăng ký`,
                    type: 'milestone'
                });
            }
        });

        // Event start
        timeline.push({
            date: eventStart,
            event: 'Bắt đầu sự kiện',
            type: 'event'
        });

        return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    async getMonthlyUserActivity(userId, dateRange) {
        try {
            const pipeline = [
                {
                    $match: {
                        user: userId,
                        registrationDate: { $gte: dateRange.start, $lte: dateRange.end }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$registrationDate' },
                            month: { $month: '$registrationDate' }
                        },
                        registrations: { $sum: 1 },
                        attended: {
                            $sum: { $cond: [{ $eq: ['$status', 'attended'] }, 1, 0] }
                        }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ];

            const results = await Registration.aggregate(pipeline);

            return results.map(result => ({
                month: `${result._id.month}/${result._id.year}`,
                registrations: result.registrations,
                attended: result.attended,
                attendanceRate: Math.round((result.attended / result.registrations) * 100)
            }));

        } catch (error) {
            logger.error('Get monthly user activity error:', error);
            return [];
        }
    }

    // Advanced analytics methods
    async getPredictiveAnalytics(eventId) {
        try {
            const event = await Event.findById(eventId);
            if (!event) {
                throw new NotFoundError('Sự kiện không tồn tại');
            }

            const registrations = await Registration.find({ event: eventId });
            const historicalData = await this.getHistoricalEventData(event);

            const predictions = {
                expectedAttendance: this.predictAttendance(registrations, historicalData),
                expectedRating: this.predictRating(event, historicalData),
                riskFactors: this.identifyRiskFactors(event, registrations, historicalData),
                recommendations: this.generatePredictiveRecommendations(event, registrations, historicalData)
            };

            return predictions;

        } catch (error) {
            logger.error('Get predictive analytics error:', error);
            throw error;
        }
    }

    async getHistoricalEventData(currentEvent) {
        try {
            // Find similar past events
            const similarEvents = await Event.find({
                _id: { $ne: currentEvent._id },
                eventType: currentEvent.eventType,
                category: currentEvent.category,
                status: 'completed'
            }).select('stats registration schedule').limit(10);

            return similarEvents;

        } catch (error) {
            logger.error('Get historical event data error:', error);
            return [];
        }
    }

    predictAttendance(currentRegistrations, historicalData) {
        if (historicalData.length === 0) {
            return {
                prediction: currentRegistrations.length * 0.8, // Default 80% attendance
                confidence: 'low',
                method: 'default_rate'
            };
        }

        const historicalRates = historicalData.map(event =>
            event.stats.registrations > 0
                ? event.stats.attendees / event.stats.registrations
                : 0
        );

        const averageRate = historicalRates.reduce((a, b) => a + b, 0) / historicalRates.length;
        const prediction = Math.round(currentRegistrations.length * averageRate);

        return {
            prediction,
            confidence: historicalData.length >= 5 ? 'high' : 'medium',
            method: 'historical_average',
            historicalRate: Math.round(averageRate * 100)
        };
    }

    predictRating(currentEvent, historicalData) {
        if (historicalData.length === 0) {
            return {
                prediction: 4.0,
                confidence: 'low',
                method: 'default'
            };
        }

        const historicalRatings = historicalData
            .map(event => event.stats.averageRating)
            .filter(rating => rating > 0);

        if (historicalRatings.length === 0) {
            return {
                prediction: 4.0,
                confidence: 'low',
                method: 'default'
            };
        }

        const averageRating = historicalRatings.reduce((a, b) => a + b, 0) / historicalRatings.length;

        return {
            prediction: Math.round(averageRating * 10) / 10,
            confidence: historicalRatings.length >= 3 ? 'high' : 'medium',
            method: 'historical_average'
        };
    }

    identifyRiskFactors(event, registrations, historicalData) {
        const risks = [];

        // Low registration risk
        const regRate = event.registration.maxParticipants > 0
            ? registrations.length / event.registration.maxParticipants
            : 0;

        if (regRate < 0.3) {
            risks.push({
                type: 'low_registration',
                level: 'high',
                message: 'Tỷ lệ đăng ký thấp có thể dẫn đến hủy sự kiện'
            });
        }

        // Time-related risks
        const daysUntilEvent = Math.ceil(
            (new Date(event.schedule.startDate) - new Date()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilEvent < 7 && regRate < 0.5) {
            risks.push({
                type: 'late_registrations',
                level: 'medium',
                message: 'Ít thời gian để tăng đăng ký'
            });
        }

        // Capacity risk
        if (regRate > 0.9) {
            risks.push({
                type: 'over_capacity',
                level: 'medium',
                message: 'Gần đạt tối đa, cân nhắc tăng số lượng hoặc mở waitlist'
            });
        }

        return risks;
    }

    generatePredictiveRecommendations(event, registrations, historicalData) {
        const recommendations = [];

        const regRate = event.registration.maxParticipants > 0
            ? registrations.length / event.registration.maxParticipants
            : 0;

        if (regRate < 0.5) {
            recommendations.push({
                action: 'boost_marketing',
                priority: 'high',
                message: 'Tăng cường hoạt động marketing và quảng bá'
            });
        }

        if (regRate > 0.8) {
            recommendations.push({
                action: 'prepare_waitlist',
                priority: 'medium',
                message: 'Chuẩn bị kích hoạt danh sách chờ'
            });
        }

        const avgHistoricalRating = historicalData.length > 0
            ? historicalData.reduce((sum, e) => sum + (e.stats.averageRating || 0), 0) / historicalData.length
            : 0;

        if (avgHistoricalRating < 4.0) {
            recommendations.push({
                action: 'improve_quality',
                priority: 'high',
                message: 'Cải thiện chất lượng sự kiện dựa trên phản hồi trước đây'
            });
        }

        return recommendations;
    }
}

module.exports = new AnalyticsService();