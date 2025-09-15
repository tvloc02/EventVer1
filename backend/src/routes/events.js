const express = require('express');
const { body, param, query } = require('express-validator');
const eventController = require('../controllers/events/eventController');
const registrationController = require('../controllers/events/registrationController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Event validation rules
const createEventValidation = [
    body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('description.short').notEmpty().withMessage('Short description is required').isLength({ max: 500 }),
    body('description.full').notEmpty().withMessage('Full description is required'),
    body('schedule.startDate').isISO8601().withMessage('Valid start date is required'),
    body('schedule.endDate').isISO8601().withMessage('Valid end date is required'),
    body('schedule.registrationStart').isISO8601().withMessage('Valid registration start date is required'),
    body('schedule.registrationEnd').isISO8601().withMessage('Valid registration end date is required'),
    body('location.type').isIn(['physical', 'online', 'hybrid']).withMessage('Invalid location type'),
    body('registration.maxParticipants').isInt({ min: 1 }).withMessage('Max participants must be at least 1'),
    body('category').isMongoId().withMessage('Valid category ID is required'),
    body('eventType').isIn(['workshop', 'seminar', 'conference', 'competition', 'social', 'career', 'academic', 'sports', 'volunteer', 'cultural'])
];

const updateEventValidation = [
    body('title').optional().isLength({ max: 200 }),
    body('description.short').optional().isLength({ max: 500 }),
    body('schedule.startDate').optional().isISO8601(),
    body('schedule.endDate').optional().isISO8601(),
    body('schedule.registrationStart').optional().isISO8601(),
    body('schedule.registrationEnd').optional().isISO8601(),
    body('location.type').optional().isIn(['physical', 'online', 'hybrid']),
    body('registration.maxParticipants').optional().isInt({ min: 1 }),
    body('category').optional().isMongoId(),
    body('eventType').optional().isIn(['workshop', 'seminar', 'conference', 'competition', 'social', 'career', 'academic', 'sports', 'volunteer', 'cultural'])
];

// Registration validation rules
const registerValidation = [
    body('customFields').optional().isArray(),
    body('accommodations').optional().isObject(),
    body('emergencyContact').optional().isObject(),
    body('couponCode').optional().isString().isLength({ max: 50 })
];

// Public routes (no authentication required)
router.get('/', eventController.getEvents);
router.get('/upcoming', eventController.getUpcomingEvents);
router.get('/featured', eventController.getFeaturedEvents);
router.get('/search', eventController.searchEvents);
router.get('/calendar', eventController.getEventCalendar);
router.get('/category/:categoryId',
    param('categoryId').isMongoId().withMessage('Valid category ID is required'),
    eventController.getEventsByCategory
);
router.get('/slug/:slug',
    param('slug').notEmpty().withMessage('Slug is required'),
    authMiddleware.optionalAuth,
    eventController.getEventBySlug
);
router.get('/:id',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.optionalAuth,
    eventController.getEventById
);

// Protected routes (authentication required)
router.use(authMiddleware.authenticate);

// Event CRUD operations
router.post('/',
    authMiddleware.requireOrganizer,
    createEventValidation,
    eventController.createEvent
);

router.put('/:id',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canManageEvent,
    updateEventValidation,
    eventController.updateEvent
);

router.delete('/:id',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canManageEvent,
    eventController.deleteEvent
);

// Event management
router.post('/:id/publish',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canManageEvent,
    eventController.publishEvent
);

router.post('/:id/cancel',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    body('reason').notEmpty().withMessage('Cancellation reason is required'),
    authMiddleware.canManageEvent,
    eventController.cancelEvent
);

router.post('/:id/postpone',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    body('newStartDate').isISO8601().withMessage('Valid new start date is required'),
    body('newEndDate').isISO8601().withMessage('Valid new end date is required'),
    body('reason').notEmpty().withMessage('Postponement reason is required'),
    authMiddleware.canManageEvent,
    eventController.postponeEvent
);

router.post('/:id/archive',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canManageEvent,
    eventController.archiveEvent
);

router.post('/:id/duplicate',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canManageEvent,
    eventController.duplicateEvent
);

// Event statistics and analytics
router.get('/:id/stats',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    eventController.getEventStats
);

router.get('/:id/analytics',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
    eventController.getEventAnalytics
);

// QR Code
router.get('/:id/qrcode',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    eventController.generateQRCode
);

// File uploads
router.post('/upload/banner',
    authMiddleware.requireOrganizer,
    upload.single('banner'),
    eventController.uploadBanner
);

// My events
router.get('/my/events',
    authMiddleware.requireOrganizer,
    eventController.getMyEvents
);

// Admin routes
router.patch('/:id/featured',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    body('featured').isBoolean().withMessage('Featured must be boolean'),
    authMiddleware.requireModerator,
    eventController.toggleFeatured
);

// Export/Import
router.get('/export/events',
    query('format').optional().isIn(['xlsx', 'csv', 'pdf']),
    authMiddleware.requireOrganizer,
    eventController.exportEvents
);

router.post('/import/events',
    authMiddleware.requireOrganizer,
    upload.single('file'),
    eventController.importEvents
);

// Recommendations
router.get('/recommendations/for-me',
    authMiddleware.requireStudent,
    eventController.getEventRecommendations
);

// REGISTRATION ROUTES

// Register for event
router.post('/:id/register',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canRegisterForEvent,
    registerValidation,
    registrationController.registerForEvent
);

// Get event registrations (for organizers)
router.get('/:id/registrations',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canManageEvent,
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled', 'waitlist', 'attended', 'no_show']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    registrationController.getEventRegistrations
);

// Get registration statistics
router.get('/:id/registrations/stats',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canManageEvent,
    registrationController.getEventRegistrationStats
);

// Approve/Reject registrations
router.post('/registrations/:regId/approve',
    param('regId').isMongoId().withMessage('Valid registration ID is required'),
    registrationController.approveRegistration
);

router.post('/registrations/:regId/reject',
    param('regId').isMongoId().withMessage('Valid registration ID is required'),
    body('reason').notEmpty().withMessage('Rejection reason is required'),
    registrationController.rejectRegistration
);

// Cancel registration
router.post('/registrations/:regId/cancel',
    param('regId').isMongoId().withMessage('Valid registration ID is required'),
    body('reason').optional().isString(),
    registrationController.cancelRegistration
);

// Check-in
router.post('/registrations/:regId/checkin',
    param('regId').isMongoId().withMessage('Valid registration ID is required'),
    body('method').optional().isIn(['manual', 'qr_code', 'nfc', 'mobile_app']),
    body('location').optional().isObject(),
    registrationController.checkInUser
);

// Check-in by QR code
router.post('/checkin/qr',
    body('qrCode').notEmpty().withMessage('QR code is required'),
    body('location').optional().isObject(),
    registrationController.checkInByQRCode
);

// Get registration details
router.get('/registrations/:regId',
    param('regId').isMongoId().withMessage('Valid registration ID is required'),
    registrationController.getRegistrationDetails
);

// Update registration
router.put('/registrations/:regId',
    param('regId').isMongoId().withMessage('Valid registration ID is required'),
    body('customFields').optional().isArray(),
    body('accommodations').optional().isObject(),
    body('emergencyContact').optional().isObject(),
    registrationController.updateRegistration
);

// Submit feedback
router.post('/registrations/:regId/feedback',
    param('regId').isMongoId().withMessage('Valid registration ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isString().isLength({ max: 1000 }),
    body('categories').optional().isObject(),
    registrationController.submitFeedback
);

// Get waitlist position
router.get('/:id/waitlist/position',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    registrationController.getWaitlistPosition
);

// Process waitlist (for organizers)
router.post('/:id/waitlist/process',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canManageEvent,
    registrationController.processWaitlist
);

// Export registrations
router.get('/:id/registrations/export',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    query('format').optional().isIn(['xlsx', 'csv', 'pdf']),
    authMiddleware.canManageEvent,
    registrationController.exportRegistrations
);

// Import registrations
router.post('/:id/registrations/import',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canManageEvent,
    upload.single('file'),
    registrationController.importRegistrations
);

// Bulk operations
router.post('/:id/registrations/bulk/approve',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    body('registrationIds').isArray().withMessage('Registration IDs array is required'),
    authMiddleware.canManageEvent,
    registrationController.bulkApproveRegistrations
);

router.post('/:id/registrations/bulk/reject',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    body('registrationIds').isArray().withMessage('Registration IDs array is required'),
    body('reason').notEmpty().withMessage('Rejection reason is required'),
    authMiddleware.canManageEvent,
    registrationController.bulkRejectRegistrations
);

router.post('/:id/registrations/bulk/checkin',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    body('registrationIds').isArray().withMessage('Registration IDs array is required'),
    authMiddleware.canManageEvent,
    registrationController.bulkCheckIn
);

// Send notifications
router.post('/:id/notifications/send',
    param('id').isMongoId().withMessage('Valid event ID is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('recipients').optional().isIn(['all', 'approved', 'pending', 'waitlist']),
    authMiddleware.canManageEvent,
    registrationController.sendEventNotification
);

module.exports = router;