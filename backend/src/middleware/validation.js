const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

// Custom validation functions
const isVietnamesePhoneNumber = (value) => {
    const phoneRegex = /^(\+84|84|0)[1-9][0-9]{8,9}$/;
    return phoneRegex.test(value);
};

const isStrongPassword = (value) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(value);
};

const isValidStudentId = (value) => {
    // Common Vietnamese student ID format: 8-12 digits
    const studentIdRegex = /^[0-9]{8,12}$/;
    return studentIdRegex.test(value);
};

const isValidSlug = (value) => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(value);
};

const isValidColor = (value) => {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return colorRegex.test(value);
};

// Validation middleware generator
const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        const formattedErrors = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value,
            location: error.location
        }));

        const validationError = new ValidationError('Validation failed');
        validationError.errors = formattedErrors;

        return next(validationError);
    };
};

// Common validation rules
const commonValidations = {
    // User validations
    email: body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),

    password: body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
        .custom(isStrongPassword)
        .withMessage('Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character'),

    username: body('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),

    firstName: body('firstName')
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ max: 50 })
        .withMessage('First name cannot exceed 50 characters')
        .trim(),

    lastName: body('lastName')
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ max: 50 })
        .withMessage('Last name cannot exceed 50 characters')
        .trim(),

    phone: body('phone')
        .optional()
        .custom(isVietnamesePhoneNumber)
        .withMessage('Please provide a valid Vietnamese phone number'),

    studentId: body('studentId')
        .optional()
        .custom(isValidStudentId)
        .withMessage('Student ID must be 8-12 digits'),

    // Event validations
    eventTitle: body('title')
        .notEmpty()
        .withMessage('Event title is required')
        .isLength({ max: 200 })
        .withMessage('Event title cannot exceed 200 characters')
        .trim(),

    eventDescription: body('description.short')
        .notEmpty()
        .withMessage('Short description is required')
        .isLength({ max: 500 })
        .withMessage('Short description cannot exceed 500 characters')
        .trim(),

    eventFullDescription: body('description.full')
        .notEmpty()
        .withMessage('Full description is required')
        .trim(),

    eventDates: [
        body('schedule.startDate')
            .isISO8601()
            .withMessage('Valid start date is required')
            .custom((value, { req }) => {
                const startDate = new Date(value);
                const now = new Date();
                if (startDate <= now) {
                    throw new Error('Start date must be in the future');
                }
                return true;
            }),

        body('schedule.endDate')
            .isISO8601()
            .withMessage('Valid end date is required')
            .custom((value, { req }) => {
                const endDate = new Date(value);
                const startDate = new Date(req.body.schedule?.startDate);
                if (endDate <= startDate) {
                    throw new Error('End date must be after start date');
                }
                return true;
            }),

        body('schedule.registrationStart')
            .isISO8601()
            .withMessage('Valid registration start date is required'),

        body('schedule.registrationEnd')
            .isISO8601()
            .withMessage('Valid registration end date is required')
            .custom((value, { req }) => {
                const regEnd = new Date(value);
                const eventStart = new Date(req.body.schedule?.startDate);
                if (regEnd >= eventStart) {
                    throw new Error('Registration must end before event starts');
                }
                return true;
            })
    ],

    eventLocation: body('location.type')
        .isIn(['physical', 'online', 'hybrid'])
        .withMessage('Location type must be physical, online, or hybrid'),

    maxParticipants: body('registration.maxParticipants')
        .isInt({ min: 1, max: 10000 })
        .withMessage('Maximum participants must be between 1 and 10,000'),

    eventCategory: body('category')
        .isMongoId()
        .withMessage('Valid category ID is required'),

    eventType: body('eventType')
        .isIn(['workshop', 'seminar', 'conference', 'competition', 'social', 'career', 'academic', 'sports', 'volunteer', 'cultural'])
        .withMessage('Invalid event type'),

    // MongoDB ID validations
    mongoId: (field) => param(field)
        .isMongoId()
        .withMessage(`Valid ${field} is required`),

    // Query parameter validations
    paginationQuery: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
    ],

    sortQuery: query('sortBy')
        .optional()
        .isIn(['createdAt', 'updatedAt', 'title', 'startDate', 'registrationCount'])
        .withMessage('Invalid sort field'),

    orderQuery: query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),

    // File validation
    imageFile: (req, res, next) => {
        if (!req.file) {
            return next();
        }

        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedMimes.includes(req.file.mimetype)) {
            return next(new ValidationError('Only JPEG, PNG, WebP, and GIF images are allowed'));
        }

        if (req.file.size > maxSize) {
            return next(new ValidationError('Image size cannot exceed 5MB'));
        }

        next();
    },

    documentFile: (req, res, next) => {
        if (!req.file) {
            return next();
        }

        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedMimes.includes(req.file.mimetype)) {
            return next(new ValidationError('Only PDF, Word, and Excel files are allowed'));
        }

        if (req.file.size > maxSize) {
            return next(new ValidationError('File size cannot exceed 10MB'));
        }

        next();
    }
};

// Specific validation sets
const validationSets = {
    // Auth validations
    register: validate([
        commonValidations.email,
        commonValidations.username,
        commonValidations.password,
        commonValidations.firstName,
        commonValidations.lastName,
        commonValidations.studentId,
        commonValidations.phone
    ]),

    login: validate([
        body('emailOrUsername')
            .notEmpty()
            .withMessage('Email or username is required'),
        body('password')
            .notEmpty()
            .withMessage('Password is required')
    ]),

    changePassword: validate([
        body('currentPassword')
            .notEmpty()
            .withMessage('Current password is required'),
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage('New password must be at least 6 characters')
            .custom(isStrongPassword)
            .withMessage('New password must be strong')
    ]),

    forgotPassword: validate([
        commonValidations.email
    ]),

    resetPassword: validate([
        body('token')
            .notEmpty()
            .withMessage('Reset token is required'),
        commonValidations.password
    ]),

    // Event validations
    createEvent: validate([
        commonValidations.eventTitle,
        commonValidations.eventDescription,
        commonValidations.eventFullDescription,
        ...commonValidations.eventDates,
        commonValidations.eventLocation,
        commonValidations.maxParticipants,
        commonValidations.eventCategory,
        commonValidations.eventType
    ]),

    updateEvent: validate([
        body('title').optional().isLength({ max: 200 }).trim(),
        body('description.short').optional().isLength({ max: 500 }).trim(),
        body('description.full').optional().trim(),
        body('schedule.startDate').optional().isISO8601(),
        body('schedule.endDate').optional().isISO8601(),
        body('registration.maxParticipants').optional().isInt({ min: 1, max: 10000 }),
        body('category').optional().isMongoId(),
        body('eventType').optional().isIn(['workshop', 'seminar', 'conference', 'competition', 'social', 'career', 'academic', 'sports', 'volunteer', 'cultural'])
    ]),

    // Registration validations
    eventRegistration: validate([
        body('customFields').optional().isArray(),
        body('accommodations').optional().isObject(),
        body('emergencyContact.name').optional().isLength({ max: 100 }).trim(),
        body('emergencyContact.phone').optional().custom(isVietnamesePhoneNumber),
        body('couponCode').optional().isLength({ max: 50 }).trim()
    ]),

    // Category validations
    createCategory: validate([
        body('name')
            .notEmpty()
            .withMessage('Category name is required')
            .isLength({ max: 100 })
            .withMessage('Category name cannot exceed 100 characters')
            .trim(),
        body('description')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Description cannot exceed 500 characters')
            .trim(),
        body('color')
            .optional()
            .custom(isValidColor)
            .withMessage('Invalid color format'),
        body('sortOrder')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Sort order must be a non-negative integer')
    ]),

    // Notification validations
    createNotification: validate([
        body('title')
            .notEmpty()
            .withMessage('Notification title is required')
            .isLength({ max: 200 })
            .withMessage('Title cannot exceed 200 characters'),
        body('message')
            .notEmpty()
            .withMessage('Notification message is required')
            .isLength({ max: 1000 })
            .withMessage('Message cannot exceed 1000 characters'),
        body('type')
            .isIn(['event_reminder', 'event_update', 'system_announcement'])
            .withMessage('Invalid notification type'),
        body('priority')
            .optional()
            .isIn(['low', 'normal', 'high', 'urgent'])
            .withMessage('Invalid priority level')
    ]),

    // Certificate validations
    createCertificate: validate([
        body('type')
            .isIn(['participation', 'completion', 'achievement', 'excellence'])
            .withMessage('Invalid certificate type'),
        body('recipientName')
            .notEmpty()
            .withMessage('Recipient name is required')
            .isLength({ max: 100 })
            .withMessage('Recipient name cannot exceed 100 characters'),
        body('eventTitle')
            .notEmpty()
            .withMessage('Event title is required')
            .isLength({ max: 200 })
            .withMessage('Event title cannot exceed 200 characters')
    ]),

    // Feedback validations
    submitFeedback: validate([
        body('rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('review')
            .optional()
            .isLength({ max: 1000 })
            .withMessage('Review cannot exceed 1000 characters')
            .trim(),
        body('categories.content')
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('Content rating must be between 1 and 5'),
        body('categories.organization')
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('Organization rating must be between 1 and 5')
    ])
};

// Sanitization middleware
const sanitize = {
    // Remove HTML tags and trim whitespace
    cleanText: (fields) => {
        return fields.map(field =>
            body(field)
                .trim()
                .escape()
                .customSanitizer(value => {
                    // Remove HTML tags
                    return value.replace(/<[^>]*>/g, '');
                })
        );
    },

    // Normalize email
    normalizeEmail: body('email').normalizeEmail(),

    // Convert to lowercase
    toLowerCase: (fields) => {
        return fields.map(field =>
            body(field).toLowerCase()
        );
    }
};

// Custom validators
const customValidators = {
    // Check if event exists
    eventExists: async (eventId) => {
        const Event = require('../models/Event');
        const event = await Event.findById(eventId);
        if (!event) {
            throw new Error('Event not found');
        }
        return true;
    },

    // Check if user can register for event
    canRegister: async (eventId, { req }) => {
        const Event = require('../models/Event');
        const Registration = require('../models/Registration');

        const event = await Event.findById(eventId);
        if (!event) {
            throw new Error('Event not found');
        }

        // Check if already registered
        const existingReg = await Registration.findOne({
            event: eventId,
            user: req.user.userId
        });

        if (existingReg) {
            throw new Error('Already registered for this event');
        }

        // Check if registration is open
        if (!event.isRegistrationOpen) {
            throw new Error('Registration is closed for this event');
        }

        return true;
    },

    // Check unique email
    uniqueEmail: async (email, { req }) => {
        const User = require('../models/User');
        const existingUser = await User.findOne({
            email: email.toLowerCase(),
            _id: { $ne: req.params.id } // Exclude current user for updates
        });

        if (existingUser) {
            throw new Error('Email already in use');
        }
        return true;
    },

    // Check unique username
    uniqueUsername: async (username, { req }) => {
        const User = require('../models/User');
        const existingUser = await User.findOne({
            username,
            _id: { $ne: req.params.id }
        });

        if (existingUser) {
            throw new Error('Username already taken');
        }
        return true;
    }
};

module.exports = {
    validate,
    validationSets,
    commonValidations,
    sanitize,
    customValidators,
    // Custom validation functions
    isVietnamesePhoneNumber,
    isStrongPassword,
    isValidStudentId,
    isValidSlug,
    isValidColor
};