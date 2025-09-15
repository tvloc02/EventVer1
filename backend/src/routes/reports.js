const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const reportsController = require('../controllers/reports/reportsController');
const analyticsController = require('../controllers/reports/analyticsController');
const exportController = require('../controllers/reports/exportController');
const router = express.Router();

// All report routes require authentication
router.use(authMiddleware.authenticate);

// Dashboard Reports (available to all authenticated users)
router.get('/dashboard',
    query('timeframe').optional().isIn(['24h', '7d', '30d', '90d', '1y']),
    reportsController.getDashboardReport
);

// Personal Reports (for students)
router.get('/my/activity',
    authMiddleware.requireStudent,
    query('timeframe').optional().isIn(['30d', '90d', '1y']),
    query('format').optional().isIn(['json', 'pdf']),
    reportsController.getPersonalActivityReport
);

router.get('/my/events',
    authMiddleware.requireStudent,
    query('timeframe').optional().isIn(['30d', '90d', '1y']),
    query('status').optional().isIn(['registered', 'attended', 'cancelled']),
    query('format').optional().isIn(['json', 'xlsx', 'pdf']),
    reportsController.getPersonalEventsReport
);

router.get('/my/certificates',
    authMiddleware.requireStudent,
    query('format').optional().isIn(['json', 'pdf']),
    reportsController.getPersonalCertificatesReport
);

// Organizer Reports
router.get('/organizer/events',
    authMiddleware.requireOrganizer,
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('eventId').optional().isMongoId(),
    query('format').optional().isIn(['json', 'xlsx', 'pdf']),
    reportsController.getOrganizerEventsReport
);

router.get('/organizer/registrations',
    authMiddleware.requireOrganizer,
    query('eventId').optional().isMongoId(),
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    query('status').optional().isString(),
    query('format').optional().isIn(['json', 'xlsx', 'csv']),
    reportsController.getOrganizerRegistrationsReport
);

router.get('/organizer/feedback',
    authMiddleware.requireOrganizer,
    query('eventId').optional().isMongoId(),
    query('timeframe').optional().isIn(['30d', '90d', '1y']),
    query('format').optional().isIn(['json', 'xlsx', 'pdf']),
    reportsController.getOrganizerFeedbackReport
);

router.get('/organizer/performance',
    authMiddleware.requireOrganizer,
    query('timeframe').optional().isIn(['3m', '6m', '1y']),
    query('format').optional().isIn(['json', 'pdf']),
    reportsController.getOrganizerPerformanceReport
);

// Event-specific Reports
router.get('/events/:eventId/summary',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canViewEventReports,
    query('format').optional().isIn(['json', 'pdf']),
    reportsController.getEventSummaryReport
);

router.get('/events/:eventId/registrations',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canViewEventReports,
    query('format').optional().isIn(['json', 'xlsx', 'csv']),
    query('includePersonalData').optional().isBoolean(),
    reportsController.getEventRegistrationsReport
);

router.get('/events/:eventId/attendance',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canViewEventReports,
    query('format').optional().isIn(['json', 'xlsx', 'csv']),
    reportsController.getEventAttendanceReport
);

router.get('/events/:eventId/feedback',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canViewEventReports,
    query('format').optional().isIn(['json', 'xlsx', 'pdf']),
    reportsController.getEventFeedbackReport
);

router.get('/events/:eventId/demographics',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canViewEventReports,
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getEventDemographicsReport
);

router.get('/events/:eventId/timeline',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canViewEventReports,
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getEventTimelineReport
);

// Analytics Reports (moderator and above)
router.get('/analytics/overview',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
    query('format').optional().isIn(['json', 'pdf']),
    analyticsController.getOverviewAnalytics
);

router.get('/analytics/events',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('category').optional().isMongoId(),
    query('eventType').optional().isString(),
    query('format').optional().isIn(['json', 'xlsx']),
    analyticsController.getEventAnalytics
);

router.get('/analytics/users',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('segment').optional().isString(),
    query('format').optional().isIn(['json', 'xlsx']),
    analyticsController.getUserAnalytics
);

router.get('/analytics/engagement',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    query('metric').optional().isIn(['registrations', 'attendance', 'feedback']),
    query('format').optional().isIn(['json', 'xlsx']),
    analyticsController.getEngagementAnalytics
);

router.get('/analytics/revenue',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('breakdown').optional().isIn(['daily', 'weekly', 'monthly']),
    query('format').optional().isIn(['json', 'xlsx']),
    analyticsController.getRevenueAnalytics
);

router.get('/analytics/geographic',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['30d', '90d', '1y']),
    query('level').optional().isIn(['province', 'city', 'district']),
    query('format').optional().isIn(['json', 'xlsx']),
    analyticsController.getGeographicAnalytics
);

router.get('/analytics/trends',
    authMiddleware.requireModerator,
    query('metric').isIn(['events', 'registrations', 'users', 'revenue']).withMessage('Valid metric is required'),
    query('timeframe').optional().isIn(['3m', '6m', '1y', '2y']),
    query('granularity').optional().isIn(['daily', 'weekly', 'monthly']),
    query('format').optional().isIn(['json', 'xlsx']),
    analyticsController.getTrendsAnalytics
);

// Comparative Reports
router.get('/analytics/compare',
    authMiddleware.requireModerator,
    query('metric').isIn(['events', 'registrations', 'users']).withMessage('Valid metric is required'),
    query('period1Start').isISO8601().withMessage('Valid period 1 start date is required'),
    query('period1End').isISO8601().withMessage('Valid period 1 end date is required'),
    query('period2Start').isISO8601().withMessage('Valid period 2 start date is required'),
    query('period2End').isISO8601().withMessage('Valid period 2 end date is required'),
    query('format').optional().isIn(['json', 'xlsx']),
    analyticsController.getComparativeAnalytics
);

// Cohort Analysis
router.get('/analytics/cohort',
    authMiddleware.requireModerator,
    query('cohortType').isIn(['registration', 'signup']).withMessage('Valid cohort type is required'),
    query('timeframe').optional().isIn(['weekly', 'monthly']),
    query('format').optional().isIn(['json', 'xlsx']),
    analyticsController.getCohortAnalysis
);

// Funnel Analysis
router.get('/analytics/funnel',
    authMiddleware.requireModerator,
    query('funnelType').isIn(['registration', 'engagement']).withMessage('Valid funnel type is required'),
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    query('format').optional().isIn(['json', 'xlsx']),
    analyticsController.getFunnelAnalysis
);

// Export Routes
router.get('/export/events',
    authMiddleware.requireOrganizer,
    query('format').isIn(['xlsx', 'csv', 'pdf']).withMessage('Valid format is required'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isString(),
    query('category').optional().isMongoId(),
    query('includeRegistrations').optional().isBoolean(),
    exportController.exportEvents
);

router.get('/export/registrations',
    authMiddleware.requireOrganizer,
    query('format').isIn(['xlsx', 'csv']).withMessage('Valid format is required'),
    query('eventId').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isString(),
    query('includePersonalData').optional().isBoolean(),
    exportController.exportRegistrations
);

router.get('/export/users',
    authMiddleware.requireModerator,
    query('format').isIn(['xlsx', 'csv']).withMessage('Valid format is required'),
    query('roles').optional().isArray(),
    query('faculty').optional().isString(),
    query('year').optional().isInt(),
    query('isActive').optional().isBoolean(),
    query('includePersonalData').optional().isBoolean(),
    exportController.exportUsers
);

router.get('/export/feedback',
    authMiddleware.requireOrganizer,
    query('format').isIn(['xlsx', 'csv', 'pdf']).withMessage('Valid format is required'),
    query('eventId').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('rating').optional().isInt({ min: 1, max: 5 }),
    exportController.exportFeedback
);

router.get('/export/analytics',
    authMiddleware.requireModerator,
    query('format').isIn(['xlsx', 'pdf']).withMessage('Valid format is required'),
    query('reportType').isIn(['overview', 'events', 'users', 'revenue']).withMessage('Valid report type is required'),
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    exportController.exportAnalytics
);

// Custom Reports
router.get('/custom',
    authMiddleware.requireModerator,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    reportsController.getCustomReports
);

router.post('/custom',
    authMiddleware.requireModerator,
    body('name').notEmpty().withMessage('Report name is required'),
    body('description').optional().isString(),
    body('query').isObject().notEmpty().withMessage('Query object is required'),
    body('columns').isArray().notEmpty().withMessage('Columns array is required'),
    body('filters').optional().isObject(),
    body('schedule').optional().isObject(),
    reportsController.createCustomReport
);

router.get('/custom/:reportId',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    authMiddleware.requireModerator,
    query('format').optional().isIn(['json', 'xlsx', 'csv']),
    reportsController.getCustomReport
);

router.put('/custom/:reportId',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    authMiddleware.requireModerator,
    body('name').optional().notEmpty(),
    body('query').optional().isObject(),
    body('columns').optional().isArray(),
    reportsController.updateCustomReport
);

router.delete('/custom/:reportId',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    authMiddleware.requireModerator,
    reportsController.deleteCustomReport
);

router.post('/custom/:reportId/run',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    authMiddleware.requireModerator,
    body('parameters').optional().isObject(),
    body('format').optional().isIn(['json', 'xlsx', 'csv', 'pdf']),
    reportsController.runCustomReport
);

// Scheduled Reports
router.get('/scheduled',
    authMiddleware.requireModerator,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('isActive').optional().isBoolean(),
    reportsController.getScheduledReports
);

router.post('/scheduled',
    authMiddleware.requireModerator,
    body('name').notEmpty().withMessage('Report name is required'),
    body('reportType').notEmpty().withMessage('Report type is required'),
    body('schedule').isObject().notEmpty().withMessage('Schedule object is required'),
    body('recipients').isArray().notEmpty().withMessage('Recipients array is required'),
    body('format').isIn(['xlsx', 'pdf', 'csv']).withMessage('Valid format is required'),
    body('parameters').optional().isObject(),
    reportsController.createScheduledReport
);

router.put('/scheduled/:reportId',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    authMiddleware.requireModerator,
    body('schedule').optional().isObject(),
    body('recipients').optional().isArray(),
    body('isActive').optional().isBoolean(),
    reportsController.updateScheduledReport
);

router.delete('/scheduled/:reportId',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    authMiddleware.requireModerator,
    reportsController.deleteScheduledReport
);

router.post('/scheduled/:reportId/run-now',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    authMiddleware.requireModerator,
    reportsController.runScheduledReportNow
);

// Financial Reports (admin/moderator only)
router.get('/financial/revenue',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('breakdown').optional().isIn(['daily', 'weekly', 'monthly']),
    query('format').optional().isIn(['json', 'xlsx', 'pdf']),
    reportsController.getRevenueReport
);

router.get('/financial/transactions',
    authMiddleware.requireModerator,
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['completed', 'pending', 'failed', 'refunded']),
    query('format').optional().isIn(['json', 'xlsx', 'csv']),
    reportsController.getTransactionsReport
);

router.get('/financial/refunds',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getRefundsReport
);

// Attendance Reports
router.get('/attendance/summary',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('eventType').optional().isString(),
    query('category').optional().isMongoId(),
    query('format').optional().isIn(['json', 'xlsx', 'pdf']),
    reportsController.getAttendanceSummary
);

router.get('/attendance/trends',
    authMiddleware.requireModerator,
    query('metric').isIn(['rate', 'count', 'no_show']).withMessage('Valid metric is required'),
    query('timeframe').optional().isIn(['3m', '6m', '1y']),
    query('granularity').optional().isIn(['daily', 'weekly', 'monthly']),
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getAttendanceTrends
);

// User Behavior Reports
router.get('/behavior/engagement',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('segment').optional().isString(),
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getUserEngagementReport
);

router.get('/behavior/retention',
    authMiddleware.requireModerator,
    query('cohortPeriod').optional().isIn(['weekly', 'monthly']),
    query('timeframe').optional().isIn(['3m', '6m', '1y']),
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getUserRetentionReport
);

router.get('/behavior/churn',
    authMiddleware.requireModerator,
    query('definition').optional().isIn(['30d', '60d', '90d']),
    query('timeframe').optional().isIn(['3m', '6m', '1y']),
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getChurnAnalysis
);

// Performance Reports
router.get('/performance/events',
    authMiddleware.requireModerator,
    query('metric').isIn(['attendance_rate', 'satisfaction', 'registration_speed']).withMessage('Valid metric is required'),
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getEventPerformanceReport
);

router.get('/performance/organizers',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['90d', '6m', '1y']),
    query('metric').optional().isIn(['events_count', 'avg_rating', 'attendance_rate']),
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getOrganizerPerformanceReport
);

router.get('/performance/categories',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['90d', '6m', '1y']),
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getCategoryPerformanceReport
);

// Satisfaction Reports
router.get('/satisfaction/overview',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('format').optional().isIn(['json', 'xlsx', 'pdf']),
    reportsController.getSatisfactionOverview
);

router.get('/satisfaction/trends',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['3m', '6m', '1y']),
    query('granularity').optional().isIn(['weekly', 'monthly']),
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getSatisfactionTrends
);

// Faculty/Department Reports
router.get('/academic/faculty',
    authMiddleware.requireModerator,
    query('faculty').optional().isString(),
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getFacultyReport
);

router.get('/academic/departments',
    authMiddleware.requireModerator,
    query('department').optional().isString(),
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getDepartmentReport
);

router.get('/academic/years',
    authMiddleware.requireModerator,
    query('year').optional().isInt({ min: 1, max: 6 }),
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('format').optional().isIn(['json', 'xlsx']),
    reportsController.getYearReport
);

// Report Templates
router.get('/templates',
    authMiddleware.requireModerator,
    query('category').optional().isString(),
    reportsController.getReportTemplates
);

router.post('/templates',
    authMiddleware.requireModerator,
    body('name').notEmpty().withMessage('Template name is required'),
    body('description').optional().isString(),
    body('config').isObject().notEmpty().withMessage('Config object is required'),
    body('category').optional().isString(),
    reportsController.createReportTemplate
);

router.get('/templates/:templateId',
    param('templateId').isMongoId().withMessage('Valid template ID is required'),
    authMiddleware.requireModerator,
    reportsController.getReportTemplate
);

router.put('/templates/:templateId',
    param('templateId').isMongoId().withMessage('Valid template ID is required'),
    authMiddleware.requireModerator,
    body('name').optional().notEmpty(),
    body('config').optional().isObject(),
    reportsController.updateReportTemplate
);

router.delete('/templates/:templateId',
    param('templateId').isMongoId().withMessage('Valid template ID is required'),
    authMiddleware.requireModerator,
    reportsController.deleteReportTemplate
);

router.post('/templates/:templateId/generate',
    param('templateId').isMongoId().withMessage('Valid template ID is required'),
    authMiddleware.requireModerator,
    body('parameters').optional().isObject(),
    body('format').optional().isIn(['json', 'xlsx', 'csv', 'pdf']),
    reportsController.generateFromTemplate
);

// Report History and Downloads
router.get('/history',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isString(),
    query('status').optional().isIn(['generating', 'completed', 'failed']),
    reportsController.getReportHistory
);

router.get('/download/:reportId',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    reportsController.downloadReport
);

router.delete('/history/:reportId',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    reportsController.deleteReportFromHistory
);

// Advanced Analytics (admin only)
router.get('/advanced/predictive',
    authMiddleware.requireAdmin,
    query('model').isIn(['registration_prediction', 'churn_prediction', 'demand_forecast']).withMessage('Valid model is required'),
    query('timeframe').optional().isIn(['30d', '90d', '6m']),
    query('format').optional().isIn(['json', 'xlsx']),
    analyticsController.getPredictiveAnalytics
);

router.get('/advanced/anomaly-detection',
    authMiddleware.requireAdmin,
    query('metric').isIn(['registrations', 'attendance', 'revenue']).withMessage('Valid metric is required'),
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    analyticsController.getAnomalyDetection
);

router.get('/advanced/correlation',
    authMiddleware.requireAdmin,
    query('variables').isArray().notEmpty().withMessage('Variables array is required'),
    query('timeframe').optional().isIn(['30d', '90d', '6m', '1y']),
    query('format').optional().isIn(['json', 'xlsx']),
    analyticsController.getCorrelationAnalysis
);

// Real-time Reports
router.get('/realtime/events',
    authMiddleware.requireModerator,
    reportsController.getRealtimeEventStats
);

router.get('/realtime/registrations',
    authMiddleware.requireModerator,
    reportsController.getRealtimeRegistrationStats
);

router.get('/realtime/system',
    authMiddleware.requireAdmin,
    reportsController.getRealtimeSystemStats
);

// Benchmark Reports
router.get('/benchmarks/industry',
    authMiddleware.requireAdmin,
    query('metric').isIn(['attendance_rate', 'satisfaction', 'engagement']).withMessage('Valid metric is required'),
    query('timeframe').optional().isIn(['90d', '6m', '1y']),
    reportsController.getIndustryBenchmarksReport
);

router.get('/benchmarks/historical',
    authMiddleware.requireModerator,
    query('metric').isIn(['events', 'registrations', 'users']).withMessage('Valid metric is required'),
    query('compareWith').isISO8601().withMessage('Valid comparison date is required'),
    reportsController.getHistoricalBenchmarksReport
);

// Data Quality Reports
router.get('/data-quality/overview',
    authMiddleware.requireAdmin,
    reportsController.getDataQualityOverview
);

router.get('/data-quality/missing-data',
    authMiddleware.requireAdmin,
    query('collection').optional().isIn(['users', 'events', 'registrations']),
    reportsController.getMissingDataReport
);

router.get('/data-quality/duplicates',
    authMiddleware.requireAdmin,
    query('collection').isIn(['users', 'events']).withMessage('Valid collection is required'),
    reportsController.getDuplicatesReport
);

// Report Sharing
router.post('/:reportId/share',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    authMiddleware.requireModerator,
    body('recipients').isArray().notEmpty().withMessage('Recipients array is required'),
    body('message').optional().isString(),
    body('accessLevel').optional().isIn(['view', 'download']),
    body('expiresAt').optional().isISO8601(),
    reportsController.shareReport
);

router.get('/shared/:shareToken',
    param('shareToken').notEmpty().withMessage('Share token is required'),
    reportsController.getSharedReport
);

router.delete('/shared/:shareToken',
    param('shareToken').notEmpty().withMessage('Share token is required'),
    reportsController.revokeSharedReport
);

// Report Subscriptions
router.get('/subscriptions',
    query('reportType').optional().isString(),
    reportsController.getReportSubscriptions
);

router.post('/subscriptions',
    body('reportType').notEmpty().withMessage('Report type is required'),
    body('frequency').isIn(['daily', 'weekly', 'monthly']).withMessage('Valid frequency is required'),
    body('format').isIn(['xlsx', 'pdf', 'csv']).withMessage('Valid format is required'),
    body('parameters').optional().isObject(),
    reportsController.createReportSubscription
);

router.put('/subscriptions/:subscriptionId',
    param('subscriptionId').isMongoId().withMessage('Valid subscription ID is required'),
    body('frequency').optional().isIn(['daily', 'weekly', 'monthly']),
    body('format').optional().isIn(['xlsx', 'pdf', 'csv']),
    body('isActive').optional().isBoolean(),
    reportsController.updateReportSubscription
);

router.delete('/subscriptions/:subscriptionId',
    param('subscriptionId').isMongoId().withMessage('Valid subscription ID is required'),
    reportsController.deleteReportSubscription
);

// Report Comments and Annotations
router.get('/:reportId/comments',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    authMiddleware.requireModerator,
    reportsController.getReportComments
);

router.post('/:reportId/comments',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    authMiddleware.requireModerator,
    body('comment').notEmpty().withMessage('Comment is required'),
    body('isPublic').optional().isBoolean(),
    reportsController.addReportComment
);

router.put('/comments/:commentId',
    param('commentId').isMongoId().withMessage('Valid comment ID is required'),
    authMiddleware.requireModerator,
    body('comment').notEmpty().withMessage('Comment is required'),
    reportsController.updateReportComment
);

router.delete('/comments/:commentId',
    param('commentId').isMongoId().withMessage('Valid comment ID is required'),
    authMiddleware.requireModerator,
    reportsController.deleteReportComment
);

// Report Favorites
router.get('/favorites',
    reportsController.getFavoriteReports
);

router.post('/:reportId/favorite',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    reportsController.addToFavorites
);

router.delete('/:reportId/favorite',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    reportsController.removeFromFavorites
);

// Error handler for reports routes
router.use((error, req, res, next) => {
    logger.error('Reports route error:', {
        error: error.message,
        stack: error.stack,
        path: req.originalUrl,
        method: req.method,
        user: req.user?.userId,
        ip: req.ip
    });

    res.status(error.status || 500).json({
        success: false,
        message: 'Report operation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;