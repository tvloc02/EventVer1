const express = require('express');
const { body, query } = require('express-validator');
const authController = require('../controllers/auth/authController');
const oauthController = require('../controllers/auth/oauthController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Validation rules
const registerValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must be 3-30 characters, alphanumeric and underscore only'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().isLength({ max: 50 }).withMessage('First name is required'),
    body('lastName').notEmpty().isLength({ max: 50 }).withMessage('Last name is required'),
    body('studentId').optional().isLength({ min: 5, max: 20 }).withMessage('Student ID must be 5-20 characters'),
    body('faculty').optional().isLength({ max: 100 }).withMessage('Faculty name too long'),
    body('department').optional().isLength({ max: 100 }).withMessage('Department name too long'),
    body('major').optional().isLength({ max: 100 }).withMessage('Major name too long'),
    body('year').optional().isInt({ min: 1, max: 6 }).withMessage('Year must be between 1-6')
];

const loginValidation = [
    body('emailOrUsername').notEmpty().withMessage('Email or username is required'),
    body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
];

const resetPasswordValidation = [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const changePasswordValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

const updateProfileValidation = [
    body('profile.firstName').optional().isLength({ max: 50 }),
    body('profile.lastName').optional().isLength({ max: 50 }),
    body('profile.phone').optional().isMobilePhone('any'),
    body('profile.dateOfBirth').optional().isISO8601(),
    body('profile.gender').optional().isIn(['male', 'female', 'other']),
    body('profile.bio').optional().isLength({ max: 500 }),
    body('student.faculty').optional().isLength({ max: 100 }),
    body('student.department').optional().isLength({ max: 100 }),
    body('student.major').optional().isLength({ max: 100 }),
    body('student.year').optional().isInt({ min: 1, max: 6 }),
    body('preferences.language').optional().isIn(['vi', 'en']),
    body('preferences.timezone').optional().isString()
];

const resendVerificationValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
];

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, authController.resetPassword);
router.get('/verify-email', query('token').notEmpty(), authController.verifyEmail);
router.post('/resend-verification', resendVerificationValidation, authController.resendVerificationEmail);

// OAuth routes
router.get('/google', oauthController.googleAuth);
router.get('/google/callback', oauthController.googleCallback);
router.get('/microsoft', oauthController.microsoftAuth);
router.get('/microsoft/callback', oauthController.microsoftCallback);
router.get('/facebook', oauthController.facebookAuth);
router.get('/facebook/callback', oauthController.facebookCallback);

// Protected routes
router.use(authMiddleware.authenticate);

router.post('/logout', authController.logout);
router.get('/me', authController.getProfile);
router.put('/me', updateProfileValidation, authController.updateProfile);
router.post('/change-password', changePasswordValidation, authController.changePassword);
router.get('/check', authController.checkAuth);
router.get('/login-history', authController.getLoginHistory);

// Avatar upload
router.post('/upload-avatar',
    upload.single('avatar'),
    authController.uploadAvatar
);

// Danger zone
router.delete('/delete-account',
    body('password').notEmpty().withMessage('Password is required'),
    authController.deleteAccount
);

// Two-factor authentication
router.post('/2fa/enable',
    body('secret').notEmpty().withMessage('2FA secret is required'),
    body('token').notEmpty().withMessage('2FA token is required'),
    require('../controllers/auth/twoFactorController').enable2FA
);

router.post('/2fa/disable',
    body('token').notEmpty().withMessage('2FA token is required'),
    require('../controllers/auth/twoFactorController').disable2FA
);

router.post('/2fa/verify',
    body('token').notEmpty().withMessage('2FA token is required'),
    require('../controllers/auth/twoFactorController').verify2FA
);

router.get('/2fa/generate-secret',
    require('../controllers/auth/twoFactorController').generateSecret
);

router.post('/2fa/backup-codes/generate',
    require('../controllers/auth/twoFactorController').generateBackupCodes
);

router.post('/2fa/backup-codes/use',
    body('code').notEmpty().withMessage('Backup code is required'),
    require('../controllers/auth/twoFactorController').useBackupCode
);

// Session management
router.get('/sessions', require('../controllers/auth/sessionController').getSessions);
router.delete('/sessions/:sessionId', require('../controllers/auth/sessionController').revokeSession);
router.delete('/sessions', require('../controllers/auth/sessionController').revokeAllSessions);

// Account linking/unlinking
router.post('/link/google',
    body('code').notEmpty().withMessage('Google auth code is required'),
    require('../controllers/auth/accountLinkingController').linkGoogle
);

router.post('/link/microsoft',
    body('code').notEmpty().withMessage('Microsoft auth code is required'),
    require('../controllers/auth/accountLinkingController').linkMicrosoft
);

router.delete('/unlink/google',
    require('../controllers/auth/accountLinkingController').unlinkGoogle
);

router.delete('/unlink/microsoft',
    require('../controllers/auth/accountLinkingController').unlinkMicrosoft
);

// Privacy and data
router.get('/data/export',
    query('format').optional().isIn(['json', 'xml']),
    require('../controllers/auth/privacyController').exportData
);

router.post('/data/download-request',
    require('../controllers/auth/privacyController').requestDataDownload
);

// Preferences and settings
router.get('/preferences',
    require('../controllers/auth/preferencesController').getPreferences
);

router.put('/preferences',
    body('notifications.email').optional().isBoolean(),
    body('notifications.push').optional().isBoolean(),
    body('notifications.sms').optional().isBoolean(),
    body('privacy.showProfile').optional().isBoolean(),
    body('privacy.showEvents').optional().isBoolean(),
    body('privacy.allowMessages').optional().isBoolean(),
    body('language').optional().isIn(['vi', 'en']),
    body('timezone').optional().isString(),
    require('../controllers/auth/preferencesController').updatePreferences
);

// Activity log
router.get('/activity',
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isString(),
    require('../controllers/auth/activityController').getActivityLog
);

// Notifications preferences
router.get('/notifications/preferences',
    require('../controllers/auth/notificationController').getNotificationPreferences
);

router.put('/notifications/preferences',
    body('email').optional().isBoolean(),
    body('push').optional().isBoolean(),
    body('sms').optional().isBoolean(),
    body('eventReminders').optional().isBoolean(),
    body('eventUpdates').optional().isBoolean(),
    body('registrationUpdates').optional().isBoolean(),
    body('newsletter').optional().isBoolean(),
    require('../controllers/auth/notificationController').updateNotificationPreferences
);

// Block/Unblock users
router.post('/users/:userId/block',
    require('../middleware/auth').requireStudent,
    require('../controllers/auth/blockingController').blockUser
);

router.delete('/users/:userId/block',
    require('../middleware/auth').requireStudent,
    require('../controllers/auth/blockingController').unblockUser
);

router.get('/blocked-users',
    require('../controllers/auth/blockingController').getBlockedUsers
);

// Rate limiting for sensitive operations
const sensitiveRateLimit = require('express-rate-limit')({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        success: false,
        message: 'Too many sensitive requests, try again later'
    }
});

router.use('/change-password', sensitiveRateLimit);
router.use('/delete-account', sensitiveRateLimit);
router.use('/2fa/enable', sensitiveRateLimit);
router.use('/2fa/disable', sensitiveRateLimit);

module.exports = router;