const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// All admin routes require authentication and admin role
router.use(authMiddleware.authenticate);
router.use(authMiddleware.requireAdmin);

// Dashboard and Analytics
router.get('/dashboard', require('../controllers/admin/dashboardController').getDashboard);
router.get('/analytics', require('../controllers/admin/analyticsController').getAnalytics);
router.get('/analytics/events', require('../controllers/admin/analyticsController').getEventAnalytics);
router.get('/analytics/users', require('../controllers/admin/analyticsController').getUserAnalytics);
router.get('/analytics/registrations', require('../controllers/admin/analyticsController').getRegistrationAnalytics);
router.get('/analytics/revenue', require('../controllers/admin/analyticsController').getRevenueAnalytics);

// User Management
router.get('/users',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isString(),
    query('status').optional().isString(),
    query('search').optional().isString(),
    require('../controllers/admin/userManagementController').getUsers
);

router.get('/users/:userId',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    require('../controllers/admin/userManagementController').getUserDetails
);

router.put('/users/:userId',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    body('roles').optional().isArray(),
    body('isActive').optional().isBoolean(),
    body('profile').optional().isObject(),
    require('../controllers/admin/userManagementController').updateUser
);

router.post('/users/:userId/suspend',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    body('reason').notEmpty().withMessage('Suspension reason is required'),
    body('duration').optional().isInt({ min: 1 }),
    require('../controllers/admin/userManagementController').suspendUser
);

router.post('/users/:userId/unsuspend',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    require('../controllers/admin/userManagementController').unsuspendUser
);

router.delete('/users/:userId',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    body('reason').notEmpty().withMessage('Deletion reason is required'),
    require('../controllers/admin/userManagementController').deleteUser
);

router.post('/users/:userId/impersonate',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    require('../controllers/admin/userManagementController').impersonateUser
);

router.post('/users/bulk/action',
    body('userIds').isArray().notEmpty().withMessage('User IDs array is required'),
    body('action').isIn(['activate', 'deactivate', 'delete', 'changeRole']).withMessage('Valid action is required'),
    body('reason').optional().isString(),
    body('newRole').optional().isString(),
    require('../controllers/admin/userManagementController').bulkUserAction
);

// Event Management
router.get('/events',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('organizer').optional().isMongoId(),
    query('category').optional().isMongoId(),
    query('search').optional().isString(),
    require('../controllers/admin/eventManagementController').getEvents
);

router.get('/events/:eventId',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    require('../controllers/admin/eventManagementController').getEventDetails
);

router.put('/events/:eventId',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    body('status').optional().isString(),
    body('featured').optional().isBoolean(),
    body('moderationNotes').optional().isString(),
    require('../controllers/admin/eventManagementController').updateEvent
);

router.post('/events/:eventId/approve',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    body('notes').optional().isString(),
    require('../controllers/admin/eventManagementController').approveEvent
);

router.post('/events/:eventId/reject',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    body('reason').notEmpty().withMessage('Rejection reason is required'),
    require('../controllers/admin/eventManagementController').rejectEvent
);

router.post('/events/:eventId/feature',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    body('featured').isBoolean().withMessage('Featured status is required'),
    require('../controllers/admin/eventManagementController').toggleEventFeatured
);

router.delete('/events/:eventId',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    body('reason').notEmpty().withMessage('Deletion reason is required'),
    require('../controllers/admin/eventManagementController').deleteEvent
);

// Category Management
router.get('/categories', require('../controllers/admin/categoryController').getCategories);
router.post('/categories',
    body('name').notEmpty().withMessage('Category name is required'),
    body('description').optional().isString(),
    body('color').optional().isHexColor(),
    body('icon').optional().isString(),
    require('../controllers/admin/categoryController').createCategory
);

router.put('/categories/:categoryId',
    param('categoryId').isMongoId().withMessage('Valid category ID is required'),
    body('name').optional().notEmpty(),
    body('description').optional().isString(),
    body('color').optional().isHexColor(),
    body('isActive').optional().isBoolean(),
    require('../controllers/admin/categoryController').updateCategory
);

router.delete('/categories/:categoryId',
    param('categoryId').isMongoId().withMessage('Valid category ID is required'),
    require('../controllers/admin/categoryController').deleteCategory
);

// System Settings
router.get('/settings', require('../controllers/admin/settingsController').getSettings);
router.put('/settings',
    body('maintenanceMode').optional().isBoolean(),
    body('registrationEnabled').optional().isBoolean(),
    body('emailNotificationsEnabled').optional().isBoolean(),
    body('maxEventsPerUser').optional().isInt({ min: 1 }),
    body('defaultEventCapacity').optional().isInt({ min: 1 }),
    body('autoApprovalEnabled').optional().isBoolean(),
    require('../controllers/admin/settingsController').updateSettings
);

router.post('/settings/maintenance',
    body('enabled').isBoolean().withMessage('Enabled status is required'),
    body('message').optional().isString(),
    body('estimatedDuration').optional().isInt({ min: 1 }),
    require('../controllers/admin/settingsController').toggleMaintenanceMode
);

// Backup Management
router.get('/backups', require('../controllers/admin/backupController').getBackups);
router.post('/backups/create',
    body('type').isIn(['database', 'files', 'full']).withMessage('Valid backup type is required'),
    require('../controllers/admin/backupController').createBackup
);

router.post('/backups/:backupId/restore',
    param('backupId').notEmpty().withMessage('Backup ID is required'),
    body('confirmRestore').equals('true').withMessage('Restore confirmation is required'),
    require('../controllers/admin/backupController').restoreBackup
);

router.delete('/backups/:backupId',
    param('backupId').notEmpty().withMessage('Backup ID is required'),
    require('../controllers/admin/backupController').deleteBackup
);

// System Health
router.get('/health/detailed', require('../controllers/admin/healthController').getDetailedHealth);
router.get('/health/services', require('../controllers/admin/healthController').getServicesHealth);
router.get('/health/database', require('../controllers/admin/healthController').getDatabaseHealth);
router.get('/health/cache', require('../controllers/admin/healthController').getCacheHealth);
router.get('/health/storage', require('../controllers/admin/healthController').getStorageHealth);

// Logs Management
router.get('/logs',
    query('level').optional().isIn(['error', 'warn', 'info', 'http', 'debug']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('search').optional().isString(),
    require('../controllers/admin/logsController').getLogs
);

router.get('/logs/download',
    query('level').optional().isIn(['error', 'warn', 'info', 'http', 'debug']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('format').optional().isIn(['json', 'csv', 'txt']),
    require('../controllers/admin/logsController').downloadLogs
);

router.delete('/logs/cleanup',
    body('olderThan').isInt({ min: 1 }).withMessage('Days parameter is required'),
    require('../controllers/admin/logsController').cleanupLogs
);

// Audit Logs
router.get('/audit',
    query('action').optional().isString(),
    query('userId').optional().isMongoId(),
    query('resource').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    require('../controllers/admin/auditController').getAuditLogs
);

router.get('/audit/export',
    query('startDate').isISO8601().withMessage('Start date is required'),
    query('endDate').isISO8601().withMessage('End date is required'),
    query('format').optional().isIn(['xlsx', 'csv', 'pdf']),
    require('../controllers/admin/auditController').exportAuditLogs
);

// Performance Monitoring
router.get('/performance/metrics', require('../controllers/admin/performanceController').getMetrics);
router.get('/performance/database', require('../controllers/admin/performanceController').getDatabasePerformance);
router.get('/performance/api', require('../controllers/admin/performanceController').getAPIPerformance);
router.get('/performance/cache', require('../controllers/admin/performanceController').getCachePerformance);

// Security Management
router.get('/security/sessions', require('../controllers/admin/securityController').getActiveSessions);
router.delete('/security/sessions/:sessionId',
    param('sessionId').notEmpty().withMessage('Session ID is required'),
    require('../controllers/admin/securityController').terminateSession
);

router.get('/security/failed-logins', require('../controllers/admin/securityController').getFailedLogins);
router.get('/security/blocked-ips', require('../controllers/admin/securityController').getBlockedIPs);

router.post('/security/block-ip',
    body('ip').isIP().withMessage('Valid IP address is required'),
    body('reason').notEmpty().withMessage('Block reason is required'),
    body('duration').optional().isInt({ min: 1 }),
    require('../controllers/admin/securityController').blockIP
);

router.delete('/security/unblock-ip/:ip',
    param('ip').isIP().withMessage('Valid IP address is required'),
    require('../controllers/admin/securityController').unblockIP
);

// Content Moderation
router.get('/moderation/reports',
    query('type').optional().isIn(['event', 'user', 'comment']),
    query('status').optional().isIn(['pending', 'resolved', 'dismissed']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    require('../controllers/admin/moderationController').getReports
);

router.post('/moderation/reports/:reportId/resolve',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    body('action').isIn(['approve', 'reject', 'modify']).withMessage('Valid action is required'),
    body('notes').optional().isString(),
    require('../controllers/admin/moderationController').resolveReport
);

// Email Management
router.get('/emails/queue', require('../controllers/admin/emailController').getEmailQueue);
router.get('/emails/templates', require('../controllers/admin/emailController').getEmailTemplates);

router.post('/emails/templates',
    body('name').notEmpty().withMessage('Template name is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('html').notEmpty().withMessage('HTML content is required'),
    body('category').optional().isString(),
    require('../controllers/admin/emailController').createEmailTemplate
);

router.put('/emails/templates/:templateId',
    param('templateId').isMongoId().withMessage('Valid template ID is required'),
    body('subject').optional().notEmpty(),
    body('html').optional().notEmpty(),
    require('../controllers/admin/emailController').updateEmailTemplate
);

router.delete('/emails/templates/:templateId',
    param('templateId').isMongoId().withMessage('Valid template ID is required'),
    require('../controllers/admin/emailController').deleteEmailTemplate
);

router.post('/emails/send-bulk',
    body('recipients').isArray().notEmpty().withMessage('Recipients array is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('template').optional().isString(),
    require('../controllers/admin/emailController').sendBulkEmail
);

router.post('/emails/test',
    body('to').isEmail().withMessage('Valid email is required'),
    body('template').optional().isString(),
    require('../controllers/admin/emailController').sendTestEmail
);

// Notification Management
router.get('/notifications',
    query('type').optional().isString(),
    query('status').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    require('../controllers/admin/notificationController').getNotifications
);

router.post('/notifications/broadcast',
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').isIn(['info', 'warning', 'success', 'error']).withMessage('Valid type is required'),
    body('recipients').isIn(['all', 'students', 'organizers', 'admins']).withMessage('Valid recipients is required'),
    body('channels').isArray().withMessage('Channels array is required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('scheduledFor').optional().isISO8601(),
    require('../controllers/admin/notificationController').broadcastNotification
);

// Reports Management
router.get('/reports', require('../controllers/admin/reportsController').getReports);
router.post('/reports/generate',
    body('type').isIn(['daily', 'weekly', 'monthly', 'custom']).withMessage('Valid report type is required'),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('format').optional().isIn(['excel', 'pdf', 'csv']),
    body('recipients').optional().isArray(),
    require('../controllers/admin/reportsController').generateReport
);

router.get('/reports/:reportId/download',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    require('../controllers/admin/reportsController').downloadReport
);

router.delete('/reports/:reportId',
    param('reportId').isMongoId().withMessage('Valid report ID is required'),
    require('../controllers/admin/reportsController').deleteReport
);

// System Configuration
router.get('/config', require('../controllers/admin/configController').getConfiguration);
router.put('/config',
    body('smtp').optional().isObject(),
    body('storage').optional().isObject(),
    body('oauth').optional().isObject(),
    body('features').optional().isObject(),
    body('limits').optional().isObject(),
    require('../controllers/admin/configController').updateConfiguration
);

router.post('/config/test-email',
    body('to').isEmail().withMessage('Valid email is required'),
    require('../controllers/admin/configController').testEmailConfiguration
);

router.post('/config/test-storage',
    upload.single('testFile'),
    require('../controllers/admin/configController').testStorageConfiguration
);

// Feature Flags
router.get('/features', require('../controllers/admin/featureController').getFeatureFlags);
router.put('/features/:featureName',
    param('featureName').notEmpty().withMessage('Feature name is required'),
    body('enabled').isBoolean().withMessage('Enabled status is required'),
    body('config').optional().isObject(),
    require('../controllers/admin/featureController').updateFeatureFlag
);

// Jobs Management
router.get('/jobs', require('../controllers/admin/jobsController').getJobs);
router.post('/jobs/:jobName/run',
    param('jobName').notEmpty().withMessage('Job name is required'),
    require('../controllers/admin/jobsController').runJob
);

router.post('/jobs/:jobName/pause',
    param('jobName').notEmpty().withMessage('Job name is required'),
    require('../controllers/admin/jobsController').pauseJob
);

router.post('/jobs/:jobName/resume',
    param('jobName').notEmpty().withMessage('Job name is required'),
    require('../controllers/admin/jobsController').resumeJob
);

router.get('/jobs/:jobName/logs',
    param('jobName').notEmpty().withMessage('Job name is required'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    require('../controllers/admin/jobsController').getJobLogs
);

// Cache Management
router.get('/cache/stats', require('../controllers/admin/cacheController').getCacheStats);
router.delete('/cache/clear',
    body('pattern').optional().isString(),
    require('../controllers/admin/cacheController').clearCache
);

router.get('/cache/keys',
    query('pattern').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    require('../controllers/admin/cacheController').getCacheKeys
);

router.delete('/cache/keys/:key',
    param('key').notEmpty().withMessage('Cache key is required'),
    require('../controllers/admin/cacheController').deleteCacheKey
);

// Database Management
router.get('/database/stats', require('../controllers/admin/databaseController').getDatabaseStats);
router.get('/database/collections', require('../controllers/admin/databaseController').getCollections);
router.post('/database/reindex',
    body('collection').optional().isString(),
    require('../controllers/admin/databaseController').reindexCollections
);

router.post('/database/migrate',
    body('version').notEmpty().withMessage('Migration version is required'),
    require('../controllers/admin/databaseController').runMigration
);

// API Management
router.get('/api/endpoints', require('../controllers/admin/apiController').getEndpoints);
router.get('/api/usage', require('../controllers/admin/apiController').getAPIUsage);
router.get('/api/errors', require('../controllers/admin/apiController').getAPIErrors);

router.post('/api/keys',
    body('name').notEmpty().withMessage('API key name is required'),
    body('permissions').isArray().withMessage('Permissions array is required'),
    body('expiresAt').optional().isISO8601(),
    require('../controllers/admin/apiController').createAPIKey
);

router.delete('/api/keys/:keyId',
    param('keyId').isMongoId().withMessage('Valid key ID is required'),
    require('../controllers/admin/apiController').revokeAPIKey
);

// File Management
router.get('/files',
    query('type').optional().isIn(['image', 'document', 'video', 'audio']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    require('../controllers/admin/fileController').getFiles
);

router.delete('/files/:fileId',
    param('fileId').isMongoId().withMessage('Valid file ID is required'),
    require('../controllers/admin/fileController').deleteFile
);

router.post('/files/scan-orphaned',
    require('../controllers/admin/fileController').scanOrphanedFiles
);

router.delete('/files/cleanup-orphaned',
    body('confirm').equals('true').withMessage('Confirmation is required'),
    require('../controllers/admin/fileController').cleanupOrphanedFiles
);

// Import/Export
router.post('/import/users',
    upload.single('file'),
    require('../controllers/admin/importExportController').importUsers
);

router.post('/import/events',
    upload.single('file'),
    require('../controllers/admin/importExportController').importEvents
);

router.get('/export/users',
    query('format').optional().isIn(['xlsx', 'csv', 'json']),
    query('filters').optional().isObject(),
    require('../controllers/admin/importExportController').exportUsers
);

router.get('/export/events',
    query('format').optional().isIn(['xlsx', 'csv', 'json']),
    query('filters').optional().isObject(),
    require('../controllers/admin/importExportController').exportEvents
);

router.get('/export/registrations',
    query('format').optional().isIn(['xlsx', 'csv', 'json']),
    query('eventId').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    require('../controllers/admin/importExportController').exportRegistrations
);

// Statistics and Analytics
router.get('/statistics/overview', require('../controllers/admin/statisticsController').getOverviewStats);
router.get('/statistics/growth', require('../controllers/admin/statisticsController').getGrowthStats);
router.get('/statistics/engagement', require('../controllers/admin/statisticsController').getEngagementStats);
router.get('/statistics/revenue', require('../controllers/admin/statisticsController').getRevenueStats);
router.get('/statistics/geographic', require('../controllers/admin/statisticsController').getGeographicStats);

// Announcements Management
router.get('/announcements', require('../controllers/admin/announcementController').getAnnouncements);

router.post('/announcements',
    body('title').notEmpty().withMessage('Title is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('type').isIn(['info', 'warning', 'success', 'error']).withMessage('Valid type is required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('targetAudience').isArray().withMessage('Target audience is required'),
    body('publishAt').optional().isISO8601(),
    body('expiresAt').optional().isISO8601(),
    require('../controllers/admin/announcementController').createAnnouncement
);

router.put('/announcements/:announcementId',
    param('announcementId').isMongoId().withMessage('Valid announcement ID is required'),
    body('title').optional().notEmpty(),
    body('content').optional().notEmpty(),
    body('isActive').optional().isBoolean(),
    require('../controllers/admin/announcementController').updateAnnouncement
);

router.delete('/announcements/:announcementId',
    param('announcementId').isMongoId().withMessage('Valid announcement ID is required'),
    require('../controllers/admin/announcementController').deleteAnnouncement
);

// Feedback Management
router.get('/feedback',
    query('eventId').optional().isMongoId(),
    query('rating').optional().isInt({ min: 1, max: 5 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    require('../controllers/admin/feedbackController').getFeedback
);

router.get('/feedback/summary',
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
    require('../controllers/admin/feedbackController').getFeedbackSummary
);

router.post('/feedback/:feedbackId/respond',
    param('feedbackId').isMongoId().withMessage('Valid feedback ID is required'),
    body('response').notEmpty().withMessage('Response is required'),
    require('../controllers/admin/feedbackController').respondToFeedback
);

// System Tools
router.post('/tools/reindex-search',
    body('index').optional().isIn(['events', 'users', 'all']),
    require('../controllers/admin/toolsController').reindexSearch
);

router.post('/tools/clear-cache',
    body('type').optional().isIn(['redis', 'memory', 'all']),
    require('../controllers/admin/toolsController').clearCache
);

router.post('/tools/optimize-database',
    require('../controllers/admin/toolsController').optimizeDatabase
);

router.post('/tools/generate-sitemap',
    require('../controllers/admin/toolsController').generateSitemap
);

router.post('/tools/send-test-notifications',
    body('type').isIn(['email', 'push', 'sms']).withMessage('Valid notification type is required'),
    body('recipient').notEmpty().withMessage('Recipient is required'),
    require('../controllers/admin/toolsController').sendTestNotification
);

// Webhooks Management
router.get('/webhooks', require('../controllers/admin/webhookController').getWebhooks);

router.post('/webhooks',
    body('url').isURL().withMessage('Valid URL is required'),
    body('events').isArray().notEmpty().withMessage('Events array is required'),
    body('secret').optional().isString(),
    body('isActive').optional().isBoolean(),
    require('../controllers/admin/webhookController').createWebhook
);

router.put('/webhooks/:webhookId',
    param('webhookId').isMongoId().withMessage('Valid webhook ID is required'),
    body('url').optional().isURL(),
    body('events').optional().isArray(),
    body('isActive').optional().isBoolean(),
    require('../controllers/admin/webhookController').updateWebhook
);

router.delete('/webhooks/:webhookId',
    param('webhookId').isMongoId().withMessage('Valid webhook ID is required'),
    require('../controllers/admin/webhookController').deleteWebhook
);

router.post('/webhooks/:webhookId/test',
    param('webhookId').isMongoId().withMessage('Valid webhook ID is required'),
    require('../controllers/admin/webhookController').testWebhook
);

// Rate Limiting Management
router.get('/rate-limits', require('../controllers/admin/rateLimitController').getRateLimits);

router.put('/rate-limits/:endpoint',
    param('endpoint').notEmpty().withMessage('Endpoint is required'),
    body('windowMs').isInt({ min: 1000 }).withMessage('Valid window duration is required'),
    body('max').isInt({ min: 1 }).withMessage('Valid max requests is required'),
    require('../controllers/admin/rateLimitController').updateRateLimit
);

// Activity Feed
router.get('/activity',
    query('type').optional().isString(),
    query('userId').optional().isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    require('../controllers/admin/activityController').getSystemActivity
);

// Error Tracking
router.get('/errors',
    query('level').optional().isIn(['error', 'warn']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    require('../controllers/admin/errorController').getErrors
);

router.get('/errors/summary', require('../controllers/admin/errorController').getErrorSummary);

router.post('/errors/:errorId/resolve',
    param('errorId').isMongoId().withMessage('Valid error ID is required'),
    body('resolution').notEmpty().withMessage('Resolution notes are required'),
    require('../controllers/admin/errorController').resolveError
);

// Maintenance
router.post('/maintenance/start',
    body('message').notEmpty().withMessage('Maintenance message is required'),
    body('estimatedDuration').optional().isInt({ min: 1 }),
    require('../controllers/admin/maintenanceController').startMaintenance
);

router.post('/maintenance/end',
    require('../controllers/admin/maintenanceController').endMaintenance
);

router.get('/maintenance/status',
    require('../controllers/admin/maintenanceController').getMaintenanceStatus
);

// Search and Indexing
router.get('/search/stats', require('../controllers/admin/searchController').getSearchStats);
router.post('/search/reindex',
    body('type').optional().isIn(['events', 'users', 'all']),
    require('../controllers/admin/searchController').reindexSearchData
);

router.get('/search/popular-queries', require('../controllers/admin/searchController').getPopularQueries);

// Permissions Management
router.get('/permissions/roles', require('../controllers/admin/permissionController').getRoles);
router.get('/permissions/users/:userId',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    require('../controllers/admin/permissionController').getUserPermissions
);

router.put('/permissions/users/:userId/roles',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    body('roles').isArray().notEmpty().withMessage('Roles array is required'),
    require('../controllers/admin/permissionController').updateUserRoles
);

// Integration Management
router.get('/integrations', require('../controllers/admin/integrationController').getIntegrations);

router.post('/integrations/oauth/test',
    body('provider').isIn(['google', 'microsoft', 'facebook']).withMessage('Valid provider is required'),
    require('../controllers/admin/integrationController').testOAuthIntegration
);

router.post('/integrations/payment/test',
    body('provider').isIn(['stripe', 'paypal', 'momo']).withMessage('Valid provider is required'),
    require('../controllers/admin/integrationController').testPaymentIntegration
);

// System Information
router.get('/system/info', require('../controllers/admin/systemController').getSystemInfo);
router.get('/system/environment', require('../controllers/admin/systemController').getEnvironmentInfo);
router.get('/system/dependencies', require('../controllers/admin/systemController').getDependencies);

// Logs Viewer
router.get('/logs/live',
    query('level').optional().isIn(['error', 'warn', 'info', 'debug']),
    require('../controllers/admin/logsController').getLiveLogs
);

// Global error handler for admin routes
router.use((error, req, res, next) => {
    logger.error('Admin route error:', {
        error: error.message,
        stack: error.stack,
        path: req.originalUrl,
        method: req.method,
        user: req.user?.userId,
        ip: req.ip
    });

    res.status(error.status || 500).json({
        success: false,
        message: 'Admin operation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;