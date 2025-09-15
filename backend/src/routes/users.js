const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const userController = require('../controllers/users/userController');
const profileController = require('../controllers/users/profileController');
const socialController = require('../controllers/users/socialController');
const router = express.Router();

// Profile validation rules
const updateProfileValidation = [
    body('profile.firstName').optional().isLength({ max: 50 }).withMessage('First name too long'),
    body('profile.lastName').optional().isLength({ max: 50 }).withMessage('Last name too long'),
    body('profile.phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
    body('profile.dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required'),
    body('profile.gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
    body('profile.bio').optional().isLength({ max: 500 }).withMessage('Bio too long'),
    body('profile.website').optional().isURL().withMessage('Valid website URL required'),
    body('profile.socialLinks').optional().isObject(),
    body('student.studentId').optional().isLength({ min: 5, max: 20 }),
    body('student.faculty').optional().isLength({ max: 100 }),
    body('student.department').optional().isLength({ max: 100 }),
    body('student.major').optional().isLength({ max: 100 }),
    body('student.year').optional().isInt({ min: 1, max: 6 }),
    body('student.graduationYear').optional().isInt({ min: 2020, max: 2030 }),
    body('organizer.organization').optional().isLength({ max: 100 }),
    body('organizer.position').optional().isLength({ max: 100 }),
    body('organizer.department').optional().isLength({ max: 100 }),
    body('organizer.bio').optional().isLength({ max: 1000 }),
    body('organizer.specialties').optional().isArray(),
    body('organizer.contactInfo').optional().isObject()
];

// All user routes require authentication
router.use(authMiddleware.authenticate);

// Profile Management
router.get('/profile',
    profileController.getProfile
);

router.put('/profile',
    updateProfileValidation,
    profileController.updateProfile
);

router.post('/profile/avatar',
    upload.single('avatar'),
    profileController.uploadAvatar
);

router.delete('/profile/avatar',
    profileController.deleteAvatar
);

router.get('/profile/completion',
    profileController.getProfileCompletion
);

// Privacy Settings
router.get('/privacy',
    profileController.getPrivacySettings
);

router.put('/privacy',
    body('showProfile').optional().isBoolean(),
    body('showEmail').optional().isBoolean(),
    body('showPhone').optional().isBoolean(),
    body('showEvents').optional().isBoolean(),
    body('showRegistrations').optional().isBoolean(),
    body('allowMessages').optional().isBoolean(),
    body('allowFriendRequests').optional().isBoolean(),
    body('searchable').optional().isBoolean(),
    body('showOnlineStatus').optional().isBoolean(),
    profileController.updatePrivacySettings
);

// User Preferences
router.get('/preferences',
    userController.getPreferences
);

router.put('/preferences',
    body('language').optional().isIn(['vi', 'en']),
    body('timezone').optional().isString(),
    body('theme').optional().isIn(['light', 'dark', 'auto']),
    body('dateFormat').optional().isIn(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
    body('timeFormat').optional().isIn(['12h', '24h']),
    body('currency').optional().isString(),
    body('notifications').optional().isObject(),
    body('defaultEventView').optional().isIn(['list', 'grid', 'calendar']),
    body('emailDigestFrequency').optional().isIn(['never', 'daily', 'weekly', 'monthly']),
    userController.updatePreferences
);

// Social Features
router.get('/friends',
    query('status').optional().isIn(['accepted', 'pending', 'blocked']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    socialController.getFriends
);

router.post('/friends/request',
    body('userId').isMongoId().withMessage('Valid user ID is required'),
    body('message').optional().isString().isLength({ max: 200 }),
    socialController.sendFriendRequest
);

router.post('/friends/accept/:requestId',
    param('requestId').isMongoId().withMessage('Valid request ID is required'),
    socialController.acceptFriendRequest
);

router.post('/friends/reject/:requestId',
    param('requestId').isMongoId().withMessage('Valid request ID is required'),
    socialController.rejectFriendRequest
);

router.delete('/friends/:userId',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    socialController.removeFriend
);

router.get('/friends/requests',
    query('type').optional().isIn(['sent', 'received']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    socialController.getFriendRequests
);

// Blocking/Unblocking Users
router.post('/block/:userId',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    body('reason').optional().isString(),
    socialController.blockUser
);

router.delete('/block/:userId',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    socialController.unblockUser
);

router.get('/blocked',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    socialController.getBlockedUsers
);

// Following System
router.post('/follow/:userId',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    socialController.followUser
);

router.delete('/follow/:userId',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    socialController.unfollowUser
);

router.get('/following',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    socialController.getFollowing
);

router.get('/followers',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    socialController.getFollowers
);

// User Activity
router.get('/activity',
    query('type').optional().isIn(['events', 'registrations', 'social', 'all']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
    userController.getUserActivity
);

router.get('/activity/feed',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    socialController.getActivityFeed
);

// User Events
router.get('/events',
    query('role').optional().isIn(['organizer', 'participant']),
    query('status').optional().isIn(['upcoming', 'past', 'cancelled']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    userController.getUserEvents
);

router.get('/events/organized',
    authMiddleware.requireOrganizer,
    query('status').optional().isIn(['draft', 'published', 'cancelled', 'completed']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    userController.getOrganizedEvents
);

router.get('/events/registered',
    query('status').optional().isIn(['upcoming', 'past', 'cancelled']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    userController.getRegisteredEvents
);

router.get('/events/attended',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('timeframe').optional().isIn(['30d', '90d', '1y', 'all']),
    userController.getAttendedEvents
);

router.get('/events/wishlist',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    userController.getWishlistEvents
);

router.post('/events/:eventId/wishlist',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    userController.addToWishlist
);

router.delete('/events/:eventId/wishlist',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    userController.removeFromWishlist
);

// User Statistics
router.get('/stats',
    query('timeframe').optional().isIn(['30d', '90d', '1y', 'all']),
    userController.getUserStats
);

router.get('/stats/events',
    query('timeframe').optional().isIn(['30d', '90d', '1y', 'all']),
    userController.getUserEventStats
);

router.get('/stats/achievements',
    userController.getUserAchievements
);

// User Badges and Achievements
router.get('/badges',
    userController.getUserBadges
);

router.get('/badges/available',
    userController.getAvailableBadges
);

router.get('/badges/:badgeId/progress',
    param('badgeId').isMongoId().withMessage('Valid badge ID is required'),
    userController.getBadgeProgress
);

// User Certificates
router.get('/certificates',
    query('eventId').optional().isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    userController.getUserCertificates
);

router.get('/certificates/:certificateId',
    param('certificateId').isMongoId().withMessage('Valid certificate ID is required'),
    userController.getCertificateDetails
);

router.get('/certificates/:certificateId/download',
    param('certificateId').isMongoId().withMessage('Valid certificate ID is required'),
    query('format').optional().isIn(['pdf', 'png']),
    userController.downloadCertificate
);

router.post('/certificates/:certificateId/verify',
    param('certificateId').isMongoId().withMessage('Valid certificate ID is required'),
    userController.verifyCertificate
);

// User Notifications
router.get('/notifications',
    query('type').optional().isString(),
    query('isRead').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    userController.getUserNotifications
);

router.put('/notifications/:notificationId/read',
    param('notificationId').isMongoId().withMessage('Valid notification ID is required'),
    userController.markNotificationRead
);

router.put('/notifications/mark-all-read',
    userController.markAllNotificationsRead
);

// User Search and Discovery
router.get('/search',
    query('q').notEmpty().withMessage('Search query is required'),
    query('faculty').optional().isString(),
    query('year').optional().isInt({ min: 1, max: 6 }),
    query('role').optional().isIn(['student', 'organizer']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    authMiddleware.requireModerator,
    userController.searchUsers
);

router.get('/discover',
    query('interests').optional().isArray(),
    query('faculty').optional().isString(),
    query('year').optional().isInt({ min: 1, max: 6 }),
    query('limit').optional().isInt({ min: 1, max: 20 }),
    socialController.discoverUsers
);

// Public Profiles
router.get('/:userId/profile',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    profileController.getPublicProfile
);

router.get('/:userId/events',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    query('type').optional().isIn(['organized', 'attended']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    profileController.getUserPublicEvents
);

router.get('/:userId/achievements',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    profileController.getUserPublicAchievements
);

// Messaging System
router.get('/messages',
    query('conversationId').optional().isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    socialController.getMessages
);

router.get('/messages/conversations',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    socialController.getConversations
);

router.post('/messages/send',
    body('recipientId').isMongoId().withMessage('Valid recipient ID is required'),
    body('message').notEmpty().withMessage('Message is required').isLength({ max: 1000 }),
    body('attachments').optional().isArray(),
    socialController.sendMessage
);

router.put('/messages/:messageId/read',
    param('messageId').isMongoId().withMessage('Valid message ID is required'),
    socialController.markMessageRead
);

router.delete('/messages/:messageId',
    param('messageId').isMongoId().withMessage('Valid message ID is required'),
    socialController.deleteMessage
);

router.delete('/messages/conversations/:conversationId',
    param('conversationId').isMongoId().withMessage('Valid conversation ID is required'),
    socialController.deleteConversation
);

// User Groups/Communities
router.get('/groups',
    query('type').optional().isIn(['joined', 'managed', 'all']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    userController.getUserGroups
);

router.post('/groups',
    body('name').notEmpty().withMessage('Group name is required').isLength({ max: 100 }),
    body('description').optional().isString().isLength({ max: 500 }),
    body('type').isIn(['public', 'private', 'secret']).withMessage('Valid group type is required'),
    body('category').optional().isMongoId(),
    body('rules').optional().isString(),
    body('tags').optional().isArray(),
    userController.createGroup
);

router.put('/groups/:groupId',
    param('groupId').isMongoId().withMessage('Valid group ID is required'),
    body('name').optional().notEmpty().isLength({ max: 100 }),
    body('description').optional().isString().isLength({ max: 500 }),
    body('rules').optional().isString(),
    body('tags').optional().isArray(),
    userController.updateGroup
);

router.post('/groups/:groupId/join',
    param('groupId').isMongoId().withMessage('Valid group ID is required'),
    body('message').optional().isString().isLength({ max: 200 }),
    userController.joinGroup
);

router.delete('/groups/:groupId/leave',
    param('groupId').isMongoId().withMessage('Valid group ID is required'),
    userController.leaveGroup
);

router.get('/groups/:groupId/members',
    param('groupId').isMongoId().withMessage('Valid group ID is required'),
    query('role').optional().isIn(['admin', 'moderator', 'member']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    userController.getGroupMembers
);

// User Skills and Interests
router.get('/skills',
    userController.getUserSkills
);

router.put('/skills',
    body('skills').isArray().withMessage('Skills array is required'),
    body('interests').optional().isArray(),
    body('expertise').optional().isArray(),
    userController.updateUserSkills
);

router.get('/interests/suggestions',
    query('limit').optional().isInt({ min: 1, max: 20 }),
    userController.getInterestSuggestions
);

// User Reviews and Feedback
router.get('/reviews/given',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('eventId').optional().isMongoId(),
    userController.getGivenReviews
);

router.get('/reviews/received',
    authMiddleware.requireOrganizer,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('eventId').optional().isMongoId(),
    userController.getReceivedReviews
);

router.post('/reviews',
    body('eventId').isMongoId().withMessage('Valid event ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isString().isLength({ max: 1000 }),
    body('categories').optional().isObject(),
    body('isAnonymous').optional().isBoolean(),
    userController.submitReview
);

router.put('/reviews/:reviewId',
    param('reviewId').isMongoId().withMessage('Valid review ID is required'),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('review').optional().isString().isLength({ max: 1000 }),
    userController.updateReview
);

router.delete('/reviews/:reviewId',
    param('reviewId').isMongoId().withMessage('Valid review ID is required'),
    userController.deleteReview
);

// User Settings
router.get('/settings',
    userController.getSettings
);

router.put('/settings',
    body('notifications').optional().isObject(),
    body('privacy').optional().isObject(),
    body('preferences').optional().isObject(),
    body('security').optional().isObject(),
    userController.updateSettings
);

// Data Export (GDPR compliance)
router.get('/data/export',
    query('format').optional().isIn(['json', 'xlsx']),
    userController.exportUserData
);

router.post('/data/download-request',
    userController.requestDataDownload
);

router.get('/data/download/:requestId',
    param('requestId').isMongoId().withMessage('Valid request ID is required'),
    userController.downloadUserData
);

// Account Verification
router.post('/verify/student-id',
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('document').optional().isString(),
    userController.verifyStudentId
);

router.post('/verify/identity',
    upload.single('document'),
    body('documentType').isIn(['student_card', 'national_id', 'passport']).withMessage('Valid document type is required'),
    userController.verifyIdentity
);

router.get('/verification/status',
    userController.getVerificationStatus
);

// User Reports (for reporting issues)
router.post('/report/:userId',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    body('reason').isIn(['spam', 'harassment', 'inappropriate_content', 'fake_profile', 'other']).withMessage('Valid reason is required'),
    body('description').notEmpty().withMessage('Description is required').isLength({ max: 500 }),
    body('evidence').optional().isArray(),
    userController.reportUser
);

router.get('/reports/submitted',
    query('status').optional().isIn(['pending', 'resolved', 'dismissed']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    userController.getSubmittedReports
);

// User Recommendations
router.get('/recommendations/events',
    query('limit').optional().isInt({ min: 1, max: 20 }),
    query('category').optional().isMongoId(),
    userController.getEventRecommendations
);

router.get('/recommendations/users',
    query('limit').optional().isInt({ min: 1, max: 20 }),
    query('type').optional().isIn(['friends', 'follow', 'collaborate']),
    socialController.getUserRecommendations
);

router.get('/recommendations/groups',
    query('limit').optional().isInt({ min: 1, max: 20 }),
    userController.getGroupRecommendations
);

// User Calendar Integration
router.get('/calendar/events',
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('type').optional().isIn(['organized', 'registered', 'all']),
    userController.getCalendarEvents
);

router.get('/calendar/export',
    query('format').isIn(['ics', 'csv']).withMessage('Valid format is required'),
    query('type').optional().isIn(['organized', 'registered', 'all']),
    userController.exportCalendar
);

router.post('/calendar/sync',
    body('provider').isIn(['google', 'outlook', 'apple']).withMessage('Valid provider is required'),
    body('accessToken').notEmpty().withMessage('Access token is required'),
    userController.syncExternalCalendar
);

// User Organizer Application
router.post('/organizer/apply',
    body('organization').notEmpty().withMessage('Organization is required'),
    body('position').notEmpty().withMessage('Position is required'),
    body('experience').notEmpty().withMessage('Experience description is required'),
    body('motivation').notEmpty().withMessage('Motivation is required'),
    body('portfolio').optional().isArray(),
    body('references').optional().isArray(),
    upload.fields([
        { name: 'documents', maxCount: 5 },
        { name: 'portfolio', maxCount: 10 }
    ]),
    userController.applyForOrganizer
);

router.get('/organizer/application',
    userController.getOrganizerApplication
);

router.put('/organizer/application',
    body('organization').optional().notEmpty(),
    body('position').optional().notEmpty(),
    body('experience').optional().notEmpty(),
    body('motivation').optional().notEmpty(),
    userController.updateOrganizerApplication
);

// User Connections and Networking
router.get('/connections',
    query('type').optional().isIn(['professional', 'academic', 'social']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    socialController.getConnections
);

router.post('/connections/request',
    body('userId').isMongoId().withMessage('Valid user ID is required'),
    body('type').isIn(['professional', 'academic', 'social']).withMessage('Valid connection type is required'),
    body('message').optional().isString().isLength({ max: 300 }),
    socialController.sendConnectionRequest
);

router.post('/connections/accept/:requestId',
    param('requestId').isMongoId().withMessage('Valid request ID is required'),
    socialController.acceptConnectionRequest
);

router.delete('/connections/:userId',
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    socialController.removeConnection
);

// User Portfolio (for organizers)
router.get('/portfolio',
    authMiddleware.requireOrganizer,
    userController.getPortfolio
);

router.put('/portfolio',
    authMiddleware.requireOrganizer,
    body('projects').optional().isArray(),
    body('experience').optional().isArray(),
    body('education').optional().isArray(),
    body('certifications').optional().isArray(),
    body('skills').optional().isArray(),
    userController.updatePortfolio
);

router.post('/portfolio/project',
    authMiddleware.requireOrganizer,
    body('title').notEmpty().withMessage('Project title is required'),
    body('description').notEmpty().withMessage('Project description is required'),
    body('technologies').optional().isArray(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('url').optional().isURL(),
    body('images').optional().isArray(),
    userController.addPortfolioProject
);

router.put('/portfolio/project/:projectId',
    param('projectId').isMongoId().withMessage('Valid project ID is required'),
    authMiddleware.requireOrganizer,
    body('title').optional().notEmpty(),
    body('description').optional().notEmpty(),
    body('technologies').optional().isArray(),
    userController.updatePortfolioProject
);

router.delete('/portfolio/project/:projectId',
    param('projectId').isMongoId().withMessage('Valid project ID is required'),
    authMiddleware.requireOrganizer,
    userController.deletePortfolioProject
);

// User Availability (for organizers)
router.get('/availability',
    authMiddleware.requireOrganizer,
    userController.getAvailability
);

router.put('/availability',
    authMiddleware.requireOrganizer,
    body('schedule').isObject().withMessage('Schedule object is required'),
    body('timeZone').notEmpty().withMessage('Timezone is required'),
    body('exceptions').optional().isArray(),
    userController.updateAvailability
);

// User Learning Path
router.get('/learning-path',
    userController.getLearningPath
);

router.put('/learning-path',
    body('goals').isArray().withMessage('Goals array is required'),
    body('interests').optional().isArray(),
    body('currentLevel').optional().isString(),
    body('targetLevel').optional().isString(),
    body('timeline').optional().isObject(),
    userController.updateLearningPath
);

router.get('/learning-path/recommendations',
    query('limit').optional().isInt({ min: 1, max: 20 }),
    userController.getLearningRecommendations
);

router.post('/learning-path/complete/:itemId',
    param('itemId').isMongoId().withMessage('Valid item ID is required'),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('notes').optional().isString(),
    userController.completeLearningItem
);

// User Feedback about Platform
router.post('/feedback',
    body('type').isIn(['bug', 'feature', 'improvement', 'general']).withMessage('Valid feedback type is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('attachments').optional().isArray(),
    userController.submitFeedback
);

router.get('/feedback/submitted',
    query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    userController.getSubmittedFeedback
);

// User Device Management
router.get('/devices',
    userController.getUserDevices
);

router.post('/devices/register',
    body('deviceToken').notEmpty().withMessage('Device token is required'),
    body('platform').isIn(['ios', 'android', 'web']).withMessage('Valid platform is required'),
    body('deviceInfo').optional().isObject(),
    userController.registerDevice
);

router.delete('/devices/:deviceId',
    param('deviceId').isMongoId().withMessage('Valid device ID is required'),
    userController.unregisterDevice
);

// User Import/Export (admin only)
router.get('/export',
    authMiddleware.requireModerator,
    query('format').isIn(['xlsx', 'csv', 'json']).withMessage('Valid format is required'),
    query('filters').optional().isObject(),
    query('includePersonalData').optional().isBoolean(),
    userController.exportUsers
);

router.post('/import',
    authMiddleware.requireModerator,
    upload.single('file'),
    body('updateExisting').optional().isBoolean(),
    body('sendWelcomeEmail').optional().isBoolean(),
    userController.importUsers
);

// User Analytics (for individual users)
router.get('/analytics/personal',
    query('timeframe').optional().isIn(['30d', '90d', '1y', 'all']),
    userController.getPersonalAnalytics
);

router.get('/analytics/engagement',
    query('timeframe').optional().isIn(['30d', '90d', '1y']),
    userController.getEngagementAnalytics
);

// User Mentorship
router.get('/mentorship/requests',
    query('type').optional().isIn(['sent', 'received']),
    query('status').optional().isIn(['pending', 'accepted', 'declined']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    userController.getMentorshipRequests
);

router.post('/mentorship/request',
    body('mentorId').isMongoId().withMessage('Valid mentor ID is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('areas').isArray().withMessage('Areas of mentorship required'),
    userController.requestMentorship
);

router.post('/mentorship/respond/:requestId',
    param('requestId').isMongoId().withMessage('Valid request ID is required'),
    body('action').isIn(['accept', 'decline']).withMessage('Valid action is required'),
    body('message').optional().isString(),
    userController.respondToMentorshipRequest
);

router.get('/mentorship/active',
    query('role').optional().isIn(['mentor', 'mentee']),
    userController.getActiveMentorships
);

// User Testimonials
router.get('/testimonials',
    userController.getUserTestimonials
);

router.post('/testimonials',
    body('forUserId').isMongoId().withMessage('Valid user ID is required'),
    body('content').notEmpty().withMessage('Testimonial content is required'),
    body('relationship').isIn(['colleague', 'supervisor', 'peer', 'student']).withMessage('Valid relationship is required'),
    body('skills').optional().isArray(),
    userController.submitTestimonial
);

router.put('/testimonials/:testimonialId/approve',
    param('testimonialId').isMongoId().withMessage('Valid testimonial ID is required'),
    userController.approveTestimonial
);

router.delete('/testimonials/:testimonialId',
    param('testimonialId').isMongoId().withMessage('Valid testimonial ID is required'),
    userController.deleteTestimonial
);

// User Content Management
router.get('/content',
    query('type').optional().isIn(['events', 'posts', 'comments', 'reviews']),
    query('status').optional().isIn(['published', 'draft', 'archived']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    userController.getUserContent
);

router.get('/content/stats',
    query('timeframe').optional().isIn(['30d', '90d', '1y', 'all']),
    userController.getContentStats
);

// User Subscription Management
router.get('/subscriptions',
    userController.getSubscriptions
);

router.post('/subscriptions/newsletter',
    body('categories').optional().isArray(),
    body('frequency').isIn(['daily', 'weekly', 'monthly']).withMessage('Valid frequency is required'),
    userController.subscribeToNewsletter
);

router.delete('/subscriptions/newsletter',
    userController.unsubscribeFromNewsletter
);

// User Points and Gamification
router.get('/points',
    userController.getUserPoints
);

router.get('/points/history',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isString(),
    userController.getPointsHistory
);

router.get('/leaderboard',
    query('timeframe').optional().isIn(['weekly', 'monthly', 'yearly', 'all']),
    query('category').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    userController.getLeaderboard
);

// User Support Tickets
router.get('/support/tickets',
    query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    userController.getSupportTickets
);

router.post('/support/tickets',
    body('subject').notEmpty().withMessage('Subject is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').isIn(['technical', 'account', 'billing', 'general']).withMessage('Valid category is required'),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('attachments').optional().isArray(),
    userController.createSupportTicket
);

router.get('/support/tickets/:ticketId',
    param('ticketId').isMongoId().withMessage('Valid ticket ID is required'),
    userController.getSupportTicketDetails
);

router.post('/support/tickets/:ticketId/reply',
    param('ticketId').isMongoId().withMessage('Valid ticket ID is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('attachments').optional().isArray(),
    userController.replySupportTicket
);

// Admin routes for user management
router.get('/admin/list',
    authMiddleware.requireModerator,
    query('role').optional().isIn(['student', 'organizer', 'moderator', 'admin']),
    query('status').optional().isIn(['active', 'inactive', 'suspended']),
    query('faculty').optional().isString(),
    query('year').optional().isInt({ min: 1, max: 6 }),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort').optional().isIn(['name', 'joinDate', 'lastActive', 'eventsCount']),
    userController.getAdminUserList
);

router.get('/admin/:userId/details',
    authMiddleware.requireModerator,
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    userController.getAdminUserDetails
);

router.put('/admin/:userId/status',
    authMiddleware.requireModerator,
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Valid status is required'),
    body('reason').optional().isString(),
    userController.updateUserStatus
);

router.put('/admin/:userId/roles',
    authMiddleware.requireAdmin,
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    body('roles').isArray().notEmpty().withMessage('Roles array is required'),
    body('reason').optional().isString(),
    userController.updateUserRoles
);

router.post('/admin/:userId/impersonate',
    authMiddleware.requireAdmin,
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    body('reason').notEmpty().withMessage('Impersonation reason is required'),
    userController.impersonateUser
);

router.post('/admin/bulk/action',
    authMiddleware.requireModerator,
    body('userIds').isArray().notEmpty().withMessage('User IDs array is required'),
    body('action').isIn(['activate', 'deactivate', 'suspend', 'delete', 'changeRole']).withMessage('Valid action is required'),
    body('reason').optional().isString(),
    body('newRole').optional().isString(),
    userController.bulkUserAction
);

// User API Keys (for developers)
router.get('/api-keys',
    authMiddleware.requireOrganizer,
    userController.getAPIKeys
);

router.post('/api-keys',
    authMiddleware.requireOrganizer,
    body('name').notEmpty().withMessage('API key name is required'),
    body('permissions').isArray().withMessage('Permissions array is required'),
    body('expiresAt').optional().isISO8601(),
    userController.createAPIKey
);

router.delete('/api-keys/:keyId',
    authMiddleware.requireOrganizer,
    param('keyId').isMongoId().withMessage('Valid key ID is required'),
    userController.revokeAPIKey
);

router.put('/api-keys/:keyId/regenerate',
    authMiddleware.requireOrganizer,
    param('keyId').isMongoId().withMessage('Valid key ID is required'),
    userController.regenerateAPIKey
);

// Error handler for user routes
router.use((error, req, res, next) => {
    const logger = require('../utils/logger');

    logger.error('User route error:', {
        error: error.message,
        stack: error.stack,
        path: req.originalUrl,
        method: req.method,
        user: req.user?.userId,
        ip: req.ip
    });

    res.status(error.status || 500).json({
        success: false,
        message: 'User operation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;