const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const notificationController = require('../controllers/notifications/notificationController');
const pushController = require('../controllers/notifications/pushController');
const router = express.Router();

// All notification routes require authentication
router.use(authMiddleware.authenticate);

// Get user notifications
router.get('/',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isString(),
    query('isRead').optional().isBoolean(),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    notificationController.getNotifications
);

// Get notification details
router.get('/:notificationId',
    param('notificationId').isMongoId().withMessage('Valid notification ID is required'),
    notificationController.getNotificationDetails
);

// Mark notification as read
router.put('/:notificationId/read',
    param('notificationId').isMongoId().withMessage('Valid notification ID is required'),
    notificationController.markAsRead
);

// Mark notification as unread
router.put('/:notificationId/unread',
    param('notificationId').isMongoId().withMessage('Valid notification ID is required'),
    notificationController.markAsUnread
);

// Mark all notifications as read
router.put('/mark-all/read',
    notificationController.markAllAsRead
);

// Delete notification
router.delete('/:notificationId',
    param('notificationId').isMongoId().withMessage('Valid notification ID is required'),
    notificationController.deleteNotification
);

// Delete all notifications
router.delete('/clear/all',
    body('olderThan').optional().isInt({ min: 1 }),
    notificationController.clearAllNotifications
);

// Get notification count
router.get('/count/unread',
    notificationController.getUnreadCount
);

// Get notification summary
router.get('/summary/stats',
    query('timeframe').optional().isIn(['24h', '7d', '30d']),
    notificationController.getNotificationSummary
);

// Notification preferences
router.get('/preferences',
    notificationController.getNotificationPreferences
);

router.put('/preferences',
    body('email').optional().isBoolean(),
    body('push').optional().isBoolean(),
    body('sms').optional().isBoolean(),
    body('inApp').optional().isBoolean(),
    body('eventReminders').optional().isBoolean(),
    body('eventUpdates').optional().isBoolean(),
    body('registrationUpdates').optional().isBoolean(),
    body('paymentReminders').optional().isBoolean(),
    body('newsletter').optional().isBoolean(),
    body('systemAnnouncements').optional().isBoolean(),
    body('feedbackRequests').optional().isBoolean(),
    body('birthdayWishes').optional().isBoolean(),
    body('profileReminders').optional().isBoolean(),
    body('quietHours').optional().isObject(),
    notificationController.updateNotificationPreferences
);

// Notification channels
router.get('/channels/status',
    notificationController.getChannelStatus
);

router.post('/channels/test',
    body('channel').isIn(['email', 'push', 'sms']).withMessage('Valid channel is required'),
    body('message').optional().isString(),
    notificationController.testNotificationChannel
);

// Push Notifications
router.post('/push/subscribe',
    body('endpoint').isURL().withMessage('Valid endpoint is required'),
    body('keys').isObject().withMessage('Keys object is required'),
    body('deviceInfo').optional().isObject(),
    pushController.subscribeToPush
);

router.delete('/push/unsubscribe',
    body('endpoint').isURL().withMessage('Valid endpoint is required'),
    pushController.unsubscribeFromPush
);

router.get('/push/subscriptions',
    pushController.getPushSubscriptions
);

router.post('/push/test',
    body('title').notEmpty().withMessage('Title is required'),
    body('body').notEmpty().withMessage('Body is required'),
    body('subscriptionId').optional().isMongoId(),
    pushController.sendTestPush
);

// Email Notifications
router.get('/email/history',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['sent', 'failed', 'pending']),
    require('../controllers/notifications/emailNotificationController').getEmailHistory
);

router.post('/email/resend/:emailId',
    param('emailId').isMongoId().withMessage('Valid email ID is required'),
    require('../controllers/notifications/emailNotificationController').resendEmail
);

// SMS Notifications (if enabled)
router.get('/sms/history',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    require('../controllers/notifications/smsController').getSMSHistory
);

router.post('/sms/verify-phone',
    body('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
    require('../controllers/notifications/smsController').verifyPhone
);

router.post('/sms/confirm-verification',
    body('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
    body('code').isLength({ min: 4, max: 6 }).withMessage('Valid verification code is required'),
    require('../controllers/notifications/smsController').confirmPhoneVerification
);

// Notification Templates (for organizers)
router.get('/templates',
    authMiddleware.requireOrganizer,
    require('../controllers/notifications/templateController').getTemplates
);

router.post('/templates',
    authMiddleware.requireOrganizer,
    body('name').notEmpty().withMessage('Template name is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('type').isIn(['event_update', 'registration_info', 'general']).withMessage('Valid type is required'),
    require('../controllers/notifications/templateController').createTemplate
);

router.put('/templates/:templateId',
    param('templateId').isMongoId().withMessage('Valid template ID is required'),
    authMiddleware.requireOrganizer,
    body('subject').optional().notEmpty(),
    body('content').optional().notEmpty(),
    require('../controllers/notifications/templateController').updateTemplate
);

router.delete('/templates/:templateId',
    param('templateId').isMongoId().withMessage('Valid template ID is required'),
    authMiddleware.requireOrganizer,
    require('../controllers/notifications/templateController').deleteTemplate
);

// Custom Notifications (for organizers)
router.post('/send',
    authMiddleware.requireOrganizer,
    body('recipients').isArray().notEmpty().withMessage('Recipients array is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('channels').isArray().notEmpty().withMessage('Channels array is required'),
    body('eventId').optional().isMongoId(),
    body('scheduledFor').optional().isISO8601(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    notificationController.sendCustomNotification
);

// Bulk notifications for events
router.post('/events/:eventId/send',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canManageEvent,
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('recipients').isIn(['all', 'approved', 'pending', 'waitlist', 'attended']).withMessage('Valid recipients is required'),
    body('channels').isArray().notEmpty().withMessage('Channels array is required'),
    body('templateId').optional().isMongoId(),
    notificationController.sendEventNotification
);

// Scheduled Notifications
router.get('/scheduled',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'sent', 'cancelled']),
    notificationController.getScheduledNotifications
);

router.post('/scheduled',
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('recipients').isArray().notEmpty().withMessage('Recipients are required'),
    body('scheduledFor').isISO8601().withMessage('Valid schedule date is required'),
    body('channels').isArray().notEmpty().withMessage('Channels are required'),
    body('recurring').optional().isObject(),
    notificationController.scheduleNotification
);

router.put('/scheduled/:notificationId',
    param('notificationId').isMongoId().withMessage('Valid notification ID is required'),
    body('scheduledFor').optional().isISO8601(),
    body('message').optional().notEmpty(),
    notificationController.updateScheduledNotification
);

router.delete('/scheduled/:notificationId',
    param('notificationId').isMongoId().withMessage('Valid notification ID is required'),
    notificationController.cancelScheduledNotification
);

// Notification Analytics
router.get('/analytics/overview',
    query('timeframe').optional().isIn(['24h', '7d', '30d', '90d']),
    notificationController.getNotificationAnalytics
);

router.get('/analytics/engagement',
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    notificationController.getEngagementAnalytics
);

router.get('/analytics/channels',
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    notificationController.getChannelAnalytics
);

// Notification Segments
router.get('/segments',
    authMiddleware.requireOrganizer,
    notificationController.getNotificationSegments
);

router.post('/segments',
    authMiddleware.requireOrganizer,
    body('name').notEmpty().withMessage('Segment name is required'),
    body('description').optional().isString(),
    body('criteria').isObject().notEmpty().withMessage('Criteria object is required'),
    notificationController.createNotificationSegment
);

router.put('/segments/:segmentId',
    param('segmentId').isMongoId().withMessage('Valid segment ID is required'),
    authMiddleware.requireOrganizer,
    body('name').optional().notEmpty(),
    body('criteria').optional().isObject(),
    notificationController.updateNotificationSegment
);

router.delete('/segments/:segmentId',
    param('segmentId').isMongoId().withMessage('Valid segment ID is required'),
    authMiddleware.requireOrganizer,
    notificationController.deleteNotificationSegment
);

router.get('/segments/:segmentId/users',
    param('segmentId').isMongoId().withMessage('Valid segment ID is required'),
    authMiddleware.requireOrganizer,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    notificationController.getSegmentUsers
);

// Automation Rules
router.get('/automation',
    authMiddleware.requireOrganizer,
    notificationController.getAutomationRules
);

router.post('/automation',
    authMiddleware.requireOrganizer,
    body('name').notEmpty().withMessage('Rule name is required'),
    body('trigger').isObject().notEmpty().withMessage('Trigger object is required'),
    body('action').isObject().notEmpty().withMessage('Action object is required'),
    body('isActive').optional().isBoolean(),
    notificationController.createAutomationRule
);

router.put('/automation/:ruleId',
    param('ruleId').isMongoId().withMessage('Valid rule ID is required'),
    authMiddleware.requireOrganizer,
    body('name').optional().notEmpty(),
    body('trigger').optional().isObject(),
    body('action').optional().isObject(),
    body('isActive').optional().isBoolean(),
    notificationController.updateAutomationRule
);

router.delete('/automation/:ruleId',
    param('ruleId').isMongoId().withMessage('Valid rule ID is required'),
    authMiddleware.requireOrganizer,
    notificationController.deleteAutomationRule
);

router.post('/automation/:ruleId/test',
    param('ruleId').isMongoId().withMessage('Valid rule ID is required'),
    authMiddleware.requireOrganizer,
    body('testData').optional().isObject(),
    notificationController.testAutomationRule
);

// Delivery Status
router.get('/delivery/:notificationId/status',
    param('notificationId').isMongoId().withMessage('Valid notification ID is required'),
    notificationController.getDeliveryStatus
);

router.get('/delivery/failed',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('channel').optional().isIn(['email', 'push', 'sms']),
    notificationController.getFailedDeliveries
);

router.post('/delivery/:deliveryId/retry',
    param('deliveryId').isMongoId().withMessage('Valid delivery ID is required'),
    notificationController.retryDelivery
);

// Subscription Management
router.get('/subscriptions',
    notificationController.getSubscriptions
);

router.post('/subscriptions/topics/:topicId/subscribe',
    param('topicId').isMongoId().withMessage('Valid topic ID is required'),
    notificationController.subscribeToTopic
);

router.delete('/subscriptions/topics/:topicId/unsubscribe',
    param('topicId').isMongoId().withMessage('Valid topic ID is required'),
    notificationController.unsubscribeFromTopic
);

router.get('/subscriptions/topics',
    notificationController.getAvailableTopics
);

// Notification Settings
router.get('/settings/channels',
    notificationController.getChannelSettings
);

router.put('/settings/channels',
    body('email').optional().isObject(),
    body('push').optional().isObject(),
    body('sms').optional().isObject(),
    notificationController.updateChannelSettings
);

router.get('/settings/global',
    authMiddleware.requireAdmin,
    notificationController.getGlobalSettings
);

router.put('/settings/global',
    authMiddleware.requireAdmin,
    body('rateLimits').optional().isObject(),
    body('retrySettings').optional().isObject(),
    body('defaultPreferences').optional().isObject(),
    notificationController.updateGlobalSettings
);

// Device Management for Push Notifications
router.get('/devices',
    pushController.getUserDevices
);

router.post('/devices/register',
    body('deviceToken').notEmpty().withMessage('Device token is required'),
    body('platform').isIn(['ios', 'android', 'web']).withMessage('Valid platform is required'),
    body('deviceInfo').optional().isObject(),
    pushController.registerDevice
);

router.delete('/devices/:deviceId',
    param('deviceId').isMongoId().withMessage('Valid device ID is required'),
    pushController.unregisterDevice
);

router.put('/devices/:deviceId',
    param('deviceId').isMongoId().withMessage('Valid device ID is required'),
    body('isActive').optional().isBoolean(),
    body('deviceInfo').optional().isObject(),
    pushController.updateDevice
);

// Notification Campaigns (for organizers and admins)
router.get('/campaigns',
    authMiddleware.requireOrganizer,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['draft', 'scheduled', 'sent', 'cancelled']),
    notificationController.getCampaigns
);

router.post('/campaigns',
    authMiddleware.requireOrganizer,
    body('name').notEmpty().withMessage('Campaign name is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('targetAudience').isObject().notEmpty().withMessage('Target audience is required'),
    body('channels').isArray().notEmpty().withMessage('Channels are required'),
    body('scheduledFor').optional().isISO8601(),
    body('templateId').optional().isMongoId(),
    notificationController.createCampaign
);

router.get('/campaigns/:campaignId',
    param('campaignId').isMongoId().withMessage('Valid campaign ID is required'),
    authMiddleware.requireOrganizer,
    notificationController.getCampaignDetails
);

router.put('/campaigns/:campaignId',
    param('campaignId').isMongoId().withMessage('Valid campaign ID is required'),
    authMiddleware.requireOrganizer,
    body('name').optional().notEmpty(),
    body('subject').optional().notEmpty(),
    body('message').optional().notEmpty(),
    body('scheduledFor').optional().isISO8601(),
    notificationController.updateCampaign
);

router.post('/campaigns/:campaignId/send',
    param('campaignId').isMongoId().withMessage('Valid campaign ID is required'),
    authMiddleware.requireOrganizer,
    notificationController.sendCampaign
);

router.delete('/campaigns/:campaignId',
    param('campaignId').isMongoId().withMessage('Valid campaign ID is required'),
    authMiddleware.requireOrganizer,
    notificationController.deleteCampaign
);

router.get('/campaigns/:campaignId/analytics',
    param('campaignId').isMongoId().withMessage('Valid campaign ID is required'),
    authMiddleware.requireOrganizer,
    notificationController.getCampaignAnalytics
);

// Notification Logs (admin only)
router.get('/logs',
    authMiddleware.requireAdmin,
    query('level').optional().isIn(['info', 'warn', 'error']),
    query('channel').optional().isIn(['email', 'push', 'sms']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    notificationController.getNotificationLogs
);

// Webhook Notifications
router.get('/webhooks',
    authMiddleware.requireOrganizer,
    notificationController.getWebhookNotifications
);

router.post('/webhooks',
    authMiddleware.requireOrganizer,
    body('url').isURL().withMessage('Valid URL is required'),
    body('events').isArray().notEmpty().withMessage('Events array is required'),
    body('secret').optional().isString(),
    body('isActive').optional().isBoolean(),
    notificationController.createWebhookNotification
);

router.put('/webhooks/:webhookId',
    param('webhookId').isMongoId().withMessage('Valid webhook ID is required'),
    authMiddleware.requireOrganizer,
    body('url').optional().isURL(),
    body('events').optional().isArray(),
    body('isActive').optional().isBoolean(),
    notificationController.updateWebhookNotification
);

router.delete('/webhooks/:webhookId',
    param('webhookId').isMongoId().withMessage('Valid webhook ID is required'),
    authMiddleware.requireOrganizer,
    notificationController.deleteWebhookNotification
);

router.post('/webhooks/:webhookId/test',
    param('webhookId').isMongoId().withMessage('Valid webhook ID is required'),
    authMiddleware.requireOrganizer,
    body('testPayload').optional().isObject(),
    notificationController.testWebhookNotification
);

// Real-time Notifications (WebSocket endpoints info)
router.get('/realtime/status',
    notificationController.getRealtimeStatus
);

router.post('/realtime/join-room',
    body('room').notEmpty().withMessage('Room name is required'),
    notificationController.joinRealtimeRoom
);

router.post('/realtime/leave-room',
    body('room').notEmpty().withMessage('Room name is required'),
    notificationController.leaveRealtimeRoom
);

// Notification Queue Management (admin only)
router.get('/queue/status',
    authMiddleware.requireAdmin,
    notificationController.getQueueStatus
);

router.post('/queue/pause',
    authMiddleware.requireAdmin,
    notificationController.pauseQueue
);

router.post('/queue/resume',
    authMiddleware.requireAdmin,
    notificationController.resumeQueue
);

router.delete('/queue/clear',
    authMiddleware.requireAdmin,
    body('confirm').equals('true').withMessage('Confirmation is required'),
    notificationController.clearQueue
);

router.post('/queue/process',
    authMiddleware.requireAdmin,
    notificationController.processQueueManually
);

// A/B Testing for Notifications
router.get('/ab-tests',
    authMiddleware.requireOrganizer,
    notificationController.getABTests
);

router.post('/ab-tests',
    authMiddleware.requireOrganizer,
    body('name').notEmpty().withMessage('Test name is required'),
    body('variants').isArray().isLength({ min: 2 }).withMessage('At least 2 variants required'),
    body('targetAudience').isObject().withMessage('Target audience is required'),
    body('duration').isInt({ min: 1 }).withMessage('Valid duration is required'),
    notificationController.createABTest
);

router.get('/ab-tests/:testId/results',
    param('testId').isMongoId().withMessage('Valid test ID is required'),
    authMiddleware.requireOrganizer,
    notificationController.getABTestResults
);

router.post('/ab-tests/:testId/stop',
    param('testId').isMongoId().withMessage('Valid test ID is required'),
    authMiddleware.requireOrganizer,
    notificationController.stopABTest
);

// Notification Feedback
router.post('/:notificationId/feedback',
    param('notificationId').isMongoId().withMessage('Valid notification ID is required'),
    body('helpful').isBoolean().withMessage('Helpful status is required'),
    body('reason').optional().isString(),
    notificationController.submitNotificationFeedback
);

router.get('/feedback/summary',
    authMiddleware.requireOrganizer,
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    notificationController.getNotificationFeedbackSummary
);

// Do Not Disturb
router.get('/dnd/status',
    notificationController.getDNDStatus
);

router.post('/dnd/enable',
    body('duration').optional().isInt({ min: 1 }),
    body('until').optional().isISO8601(),
    notificationController.enableDND
);

router.post('/dnd/disable',
    notificationController.disableDND
);

// Emergency Notifications (admin only)
router.post('/emergency/broadcast',
    authMiddleware.requireAdmin,
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Valid severity is required'),
    body('targetAudience').optional().isArray(),
    body('channels').isArray().notEmpty().withMessage('Channels are required'),
    notificationController.sendEmergencyNotification
);

// Notification Export
router.get('/export',
    query('format').optional().isIn(['csv', 'xlsx', 'json']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('type').optional().isString(),
    notificationController.exportNotifications
);

// Unsubscribe Management
router.get('/unsubscribe/:token',
    param('token').notEmpty().withMessage('Unsubscribe token is required'),
    notificationController.processUnsubscribe
);

router.post('/unsubscribe/:token/confirm',
    param('token').notEmpty().withMessage('Unsubscribe token is required'),
    body('categories').optional().isArray(),
    notificationController.confirmUnsubscribe
);

router.get('/unsubscribe/preferences/:userId',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    notificationController.getUnsubscribePreferences
);

// Notification Metrics
router.get('/metrics/delivery-rates',
    authMiddleware.requireOrganizer,
    query('timeframe').optional().isIn(['24h', '7d', '30d']),
    query('channel').optional().isIn(['email', 'push', 'sms']),
    notificationController.getDeliveryRates
);

router.get('/metrics/open-rates',
    authMiddleware.requireOrganizer,
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    notificationController.getOpenRates
);

router.get('/metrics/click-rates',
    authMiddleware.requireOrganizer,
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    notificationController.getClickRates
);

// Notification Preview
router.post('/preview',
    authMiddleware.requireOrganizer,
    body('template').optional().isString(),
    body('content').optional().isString(),
    body('subject').optional().isString(),
    body('testData').optional().isObject(),
    notificationController.previewNotification
);

// Error handler
router.use((error, req, res, next) => {
    logger.error('Notification route error:', {
        error: error.message,
        stack: error.stack,
        path: req.originalUrl,
        method: req.method,
        user: req.user?.userId,
        ip: req.ip
    });

    res.status(error.status || 500).json({
        success: false,
        message: 'Notification operation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;