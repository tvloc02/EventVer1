const validator = require('validator');
const { VALIDATION, USER_ROLES, EVENT_TYPES, LOCATION_TYPES, GENDER_OPTIONS, LANGUAGES } = require('./constants');

class Validators {
    /**
     * Validate user registration data
     * @param {object} data
     * @returns {object}
     */
    static validateUserRegistration(data) {
        const errors = [];

        // Email validation
        if (!data.email) {
            errors.push({ field: 'email', message: 'Email is required' });
        } else if (!validator.isEmail(data.email)) {
            errors.push({ field: 'email', message: 'Invalid email format' });
        } else if (data.email.length > VALIDATION.EMAIL_MAX_LENGTH) {
            errors.push({ field: 'email', message: 'Email too long' });
        }

        // Username validation
        if (!data.username) {
            errors.push({ field: 'username', message: 'Username is required' });
        } else if (data.username.length < VALIDATION.USERNAME_MIN_LENGTH) {
            errors.push({ field: 'username', message: `Username must be at least ${VALIDATION.USERNAME_MIN_LENGTH} characters` });
        } else if (data.username.length > VALIDATION.USERNAME_MAX_LENGTH) {
            errors.push({ field: 'username', message: `Username must not exceed ${VALIDATION.USERNAME_MAX_LENGTH} characters` });
        } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
            errors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' });
        }

        // Password validation
        if (!data.password) {
            errors.push({ field: 'password', message: 'Password is required' });
        } else if (data.password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
            errors.push({ field: 'password', message: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters` });
        }

        // First name validation
        if (!data.firstName) {
            errors.push({ field: 'firstName', message: 'First name is required' });
        } else if (data.firstName.length > VALIDATION.NAME_MAX_LENGTH) {
            errors.push({ field: 'firstName', message: 'First name too long' });
        }

        // Last name validation
        if (!data.lastName) {
            errors.push({ field: 'lastName', message: 'Last name is required' });
        } else if (data.lastName.length > VALIDATION.NAME_MAX_LENGTH) {
            errors.push({ field: 'lastName', message: 'Last name too long' });
        }

        // Student ID validation (optional)
        if (data.studentId && !this.isValidStudentId(data.studentId)) {
            errors.push({ field: 'studentId', message: 'Invalid student ID format' });
        }

        // Faculty validation (optional)
        if (data.faculty && data.faculty.length > 100) {
            errors.push({ field: 'faculty', message: 'Faculty name too long' });
        }

        // Department validation (optional)
        if (data.department && data.department.length > 100) {
            errors.push({ field: 'department', message: 'Department name too long' });
        }

        // Major validation (optional)
        if (data.major && data.major.length > 100) {
            errors.push({ field: 'major', message: 'Major name too long' });
        }

        // Year validation (optional)
        if (data.year && (!Number.isInteger(data.year) || data.year < 1 || data.year > 6)) {
            errors.push({ field: 'year', message: 'Year must be between 1 and 6' });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate user profile update data
     * @param {object} data
     * @returns {object}
     */
    static validateProfileUpdate(data) {
        const errors = [];

        // Profile validation
        if (data.profile) {
            const profile = data.profile;

            if (profile.firstName && profile.firstName.length > VALIDATION.NAME_MAX_LENGTH) {
                errors.push({ field: 'profile.firstName', message: 'First name too long' });
            }

            if (profile.lastName && profile.lastName.length > VALIDATION.NAME_MAX_LENGTH) {
                errors.push({ field: 'profile.lastName', message: 'Last name too long' });
            }

            if (profile.phone && !VALIDATION.PHONE_REGEX.test(profile.phone)) {
                errors.push({ field: 'profile.phone', message: 'Invalid phone number format' });
            }

            if (profile.dateOfBirth && !validator.isISO8601(profile.dateOfBirth)) {
                errors.push({ field: 'profile.dateOfBirth', message: 'Invalid date format' });
            }

            if (profile.gender && !Object.values(GENDER_OPTIONS).includes(profile.gender)) {
                errors.push({ field: 'profile.gender', message: 'Invalid gender option' });
            }

            if (profile.bio && profile.bio.length > VALIDATION.BIO_MAX_LENGTH) {
                errors.push({ field: 'profile.bio', message: 'Bio too long' });
            }
        }

        // Student data validation
        if (data.student) {
            const student = data.student;

            if (student.faculty && student.faculty.length > 100) {
                errors.push({ field: 'student.faculty', message: 'Faculty name too long' });
            }

            if (student.department && student.department.length > 100) {
                errors.push({ field: 'student.department', message: 'Department name too long' });
            }

            if (student.major && student.major.length > 100) {
                errors.push({ field: 'student.major', message: 'Major name too long' });
            }

            if (student.year && (!Number.isInteger(student.year) || student.year < 1 || student.year > 6)) {
                errors.push({ field: 'student.year', message: 'Year must be between 1 and 6' });
            }
        }

        // Preferences validation
        if (data.preferences) {
            const prefs = data.preferences;

            if (prefs.language && !Object.values(LANGUAGES).includes(prefs.language)) {
                errors.push({ field: 'preferences.language', message: 'Invalid language option' });
            }

            if (prefs.timezone && typeof prefs.timezone !== 'string') {
                errors.push({ field: 'preferences.timezone', message: 'Invalid timezone format' });
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate event creation data
     * @param {object} data
     * @returns {object}
     */
    static validateEventCreation(data) {
        const errors = [];

        // Title validation
        if (!data.title) {
            errors.push({ field: 'title', message: 'Title is required' });
        } else if (data.title.length > VALIDATION.TITLE_MAX_LENGTH) {
            errors.push({ field: 'title', message: 'Title too long' });
        }

        // Description validation
        if (!data.description) {
            errors.push({ field: 'description', message: 'Description is required' });
        } else {
            if (!data.description.short) {
                errors.push({ field: 'description.short', message: 'Short description is required' });
            } else if (data.description.short.length > VALIDATION.DESCRIPTION_SHORT_MAX_LENGTH) {
                errors.push({ field: 'description.short', message: 'Short description too long' });
            }

            if (!data.description.full) {
                errors.push({ field: 'description.full', message: 'Full description is required' });
            } else if (data.description.full.length > VALIDATION.DESCRIPTION_FULL_MAX_LENGTH) {
                errors.push({ field: 'description.full', message: 'Full description too long' });
            }
        }

        // Schedule validation
        if (!data.schedule) {
            errors.push({ field: 'schedule', message: 'Schedule is required' });
        } else {
            const schedule = data.schedule;

            if (!schedule.startDate || !validator.isISO8601(schedule.startDate)) {
                errors.push({ field: 'schedule.startDate', message: 'Valid start date is required' });
            }

            if (!schedule.endDate || !validator.isISO8601(schedule.endDate)) {
                errors.push({ field: 'schedule.endDate', message: 'Valid end date is required' });
            }

            if (!schedule.registrationStart || !validator.isISO8601(schedule.registrationStart)) {
                errors.push({ field: 'schedule.registrationStart', message: 'Valid registration start date is required' });
            }

            if (!schedule.registrationEnd || !validator.isISO8601(schedule.registrationEnd)) {
                errors.push({ field: 'schedule.registrationEnd', message: 'Valid registration end date is required' });
            }

            // Date logic validation
            if (schedule.startDate && schedule.endDate) {
                if (new Date(schedule.startDate) >= new Date(schedule.endDate)) {
                    errors.push({ field: 'schedule.endDate', message: 'End date must be after start date' });
                }
            }

            if (schedule.registrationStart && schedule.registrationEnd) {
                if (new Date(schedule.registrationStart) >= new Date(schedule.registrationEnd)) {
                    errors.push({ field: 'schedule.registrationEnd', message: 'Registration end must be after registration start' });
                }
            }

            if (schedule.registrationEnd && schedule.startDate) {
                if (new Date(schedule.registrationEnd) > new Date(schedule.startDate)) {
                    errors.push({ field: 'schedule.registrationEnd', message: 'Registration must end before event starts' });
                }
            }
        }

        // Location validation
        if (!data.location) {
            errors.push({ field: 'location', message: 'Location is required' });
        } else {
            const location = data.location;

            if (!location.type || !Object.values(LOCATION_TYPES).includes(location.type)) {
                errors.push({ field: 'location.type', message: 'Valid location type is required' });
            }

            if (location.type === LOCATION_TYPES.PHYSICAL || location.type === LOCATION_TYPES.HYBRID) {
                if (!location.venue) {
                    errors.push({ field: 'location.venue', message: 'Venue is required for physical events' });
                }
            }

            if (location.type === LOCATION_TYPES.ONLINE || location.type === LOCATION_TYPES.HYBRID) {
                if (!location.onlineUrl) {
                    errors.push({ field: 'location.onlineUrl', message: 'Online URL is required for online events' });
                } else if (!validator.isURL(location.onlineUrl)) {
                    errors.push({ field: 'location.onlineUrl', message: 'Invalid online URL format' });
                }
            }

            if (location.coordinates) {
                if (!this.isValidCoordinates(location.coordinates)) {
                    errors.push({ field: 'location.coordinates', message: 'Invalid coordinates format' });
                }
            }
        }

        // Registration validation
        if (!data.registration) {
            errors.push({ field: 'registration', message: 'Registration settings are required' });
        } else {
            const registration = data.registration;

            if (!registration.maxParticipants || !Number.isInteger(registration.maxParticipants) || registration.maxParticipants < 1) {
                errors.push({ field: 'registration.maxParticipants', message: 'Valid max participants is required' });
            }

            if (registration.price && (!Number.isFinite(registration.price) || registration.price < 0)) {
                errors.push({ field: 'registration.price', message: 'Invalid price' });
            }
        }

        // Event type validation
        if (!data.eventType || !Object.values(EVENT_TYPES).includes(data.eventType)) {
            errors.push({ field: 'eventType', message: 'Valid event type is required' });
        }

        // Category validation
        if (!data.category) {
            errors.push({ field: 'category', message: 'Category is required' });
        } else if (!validator.isMongoId(data.category)) {
            errors.push({ field: 'category', message: 'Invalid category ID' });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate event registration data
     * @param {object} data
     * @returns {object}
     */
    static validateEventRegistration(data) {
        const errors = [];

        // Custom fields validation
        if (data.customFields && !Array.isArray(data.customFields)) {
            errors.push({ field: 'customFields', message: 'Custom fields must be an array' });
        }

        // Accommodations validation
        if (data.accommodations && typeof data.accommodations !== 'object') {
            errors.push({ field: 'accommodations', message: 'Accommodations must be an object' });
        }

        // Emergency contact validation
        if (data.emergencyContact) {
            const contact = data.emergencyContact;

            if (contact.name && typeof contact.name !== 'string') {
                errors.push({ field: 'emergencyContact.name', message: 'Emergency contact name must be a string' });
            }

            if (contact.phone && !VALIDATION.PHONE_REGEX.test(contact.phone)) {
                errors.push({ field: 'emergencyContact.phone', message: 'Invalid emergency contact phone format' });
            }

            if (contact.email && !validator.isEmail(contact.email)) {
                errors.push({ field: 'emergencyContact.email', message: 'Invalid emergency contact email format' });
            }
        }

        // Coupon code validation
        if (data.couponCode && typeof data.couponCode !== 'string') {
            errors.push({ field: 'couponCode', message: 'Coupon code must be a string' });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate student ID
     * @param {string} studentId
     * @returns {boolean}
     */
    static isValidStudentId(studentId) {
        if (!studentId) return false;

        // Check length
        if (studentId.length < VALIDATION.STUDENT_ID_MIN_LENGTH ||
            studentId.length > VALIDATION.STUDENT_ID_MAX_LENGTH) {
            return false;
        }

        // Check format (alphanumeric)
        return /^[a-zA-Z0-9]+$/.test(studentId);
    }

    /**
     * Validate coordinates
     * @param {object} coordinates
     * @returns {boolean}
     */
    static isValidCoordinates(coordinates) {
        if (!coordinates || typeof coordinates !== 'object') return false;

        const { latitude, longitude } = coordinates;

        if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;

        return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    }

    /**
     * Validate MongoDB ObjectId
     * @param {string} id
     * @returns {boolean}
     */
    static isValidObjectId(id) {
        return validator.isMongoId(id);
    }

    /**
     * Validate email format
     * @param {string} email
     * @returns {boolean}
     */
    static isValidEmail(email) {
        return validator.isEmail(email);
    }

    /**
     * Validate URL format
     * @param {string} url
     * @returns {boolean}
     */
    static isValidURL(url) {
        return validator.isURL(url);
    }

    /**
     * Validate phone number
     * @param {string} phone
     * @returns {boolean}
     */
    static isValidPhone(phone) {
        return VALIDATION.PHONE_REGEX.test(phone);
    }

    /**
     * Validate date string
     * @param {string} date
     * @returns {boolean}
     */
    static isValidDate(date) {
        return validator.isISO8601(date);
    }

    /**
     * Validate password strength
     * @param {string} password
     * @returns {object}
     */
    static validatePasswordStrength(password) {
        const result = {
            isValid: false,
            score: 0,
            feedback: []
        };

        if (!password) {
            result.feedback.push('Password is required');
            return result;
        }

        if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
            result.feedback.push(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`);
        }

        // Check for different character types
        let score = 0;
        const checks = [
            { regex: /[a-z]/, message: 'Add lowercase letters', points: 1 },
            { regex: /[A-Z]/, message: 'Add uppercase letters', points: 1 },
            { regex: /[0-9]/, message: 'Add numbers', points: 1 },
            { regex: /[^A-Za-z0-9]/, message: 'Add special characters', points: 1 }
        ];

        checks.forEach(check => {
            if (check.regex.test(password)) {
                score += check.points;
            } else {
                result.feedback.push(check.message);
            }
        });

        // Length bonus
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;

        result.score = score;
        result.isValid = score >= 4 && password.length >= VALIDATION.PASSWORD_MIN_LENGTH;

        if (result.isValid) {
            result.feedback = ['Password is strong'];
        }

        return result;
    }

    /**
     * Validate file upload
     * @param {object} file
     * @param {object} options
     * @returns {object}
     */
    static validateFileUpload(file, options = {}) {
        const errors = [];

        if (!file) {
            errors.push('No file provided');
            return { isValid: false, errors };
        }

        // Check file size
        const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
        if (file.size > maxSize) {
            errors.push(`File size exceeds ${this.formatBytes(maxSize)} limit`);
        }

        // Check file type
        if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
            errors.push(`File type ${file.mimetype} is not allowed`);
        }

        // Check file extension
        if (options.allowedExtensions) {
            const extension = file.originalname.split('.').pop().toLowerCase();
            if (!options.allowedExtensions.includes(extension)) {
                errors.push(`File extension .${extension} is not allowed`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate pagination parameters
     * @param {number} page
     * @param {number} limit
     * @returns {object}
     */
    static validatePagination(page, limit) {
        const errors = [];

        // Page validation
        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            errors.push('Page must be a positive integer');
        }

        // Limit validation
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1) {
            errors.push('Limit must be a positive integer');
        } else if (limitNum > 100) {
            errors.push('Limit cannot exceed 100');
        }

        return {
            isValid: errors.length === 0,
            errors,
            page: Math.max(1, pageNum || 1),
            limit: Math.min(100, Math.max(1, limitNum || 20))
        };
    }

    /**
     * Validate search query
     * @param {string} query
     * @param {object} options
     * @returns {object}
     */
    static validateSearchQuery(query, options = {}) {
        const errors = [];

        if (typeof query !== 'string') {
            errors.push('Search query must be a string');
        } else {
            const minLength = options.minLength || 1;
            const maxLength = options.maxLength || 100;

            if (query.length < minLength) {
                errors.push(`Search query must be at least ${minLength} characters`);
            }

            if (query.length > maxLength) {
                errors.push(`Search query cannot exceed ${maxLength} characters`);
            }

            // Check for potentially malicious content
            if (/<script|javascript:|data:/i.test(query)) {
                errors.push('Search query contains invalid content');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitizedQuery: this.sanitizeSearchQuery(query)
        };
    }

    /**
     * Validate date range
     * @param {string} startDate
     * @param {string} endDate
     * @returns {object}
     */
    static validateDateRange(startDate, endDate) {
        const errors = [];

        if (!startDate || !this.isValidDate(startDate)) {
            errors.push('Valid start date is required');
        }

        if (!endDate || !this.isValidDate(endDate)) {
            errors.push('Valid end date is required');
        }

        if (startDate && endDate && this.isValidDate(startDate) && this.isValidDate(endDate)) {
            if (new Date(startDate) >= new Date(endDate)) {
                errors.push('End date must be after start date');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate notification preferences
     * @param {object} preferences
     * @returns {object}
     */
    static validateNotificationPreferences(preferences) {
        const errors = [];

        if (typeof preferences !== 'object') {
            errors.push('Preferences must be an object');
            return { isValid: false, errors };
        }

        const booleanFields = [
            'email', 'push', 'sms', 'eventReminders',
            'eventUpdates', 'registrationUpdates', 'newsletter'
        ];

        booleanFields.forEach(field => {
            if (preferences.hasOwnProperty(field) && typeof preferences[field] !== 'boolean') {
                errors.push(`${field} must be a boolean value`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate user role
     * @param {string} role
     * @returns {boolean}
     */
    static isValidUserRole(role) {
        return Object.values(USER_ROLES).includes(role);
    }

    /**
     * Validate event status
     * @param {string} status
     * @returns {boolean}
     */
    static isValidEventStatus(status) {
        const { EVENT_STATUS } = require('./constants');
        return Object.values(EVENT_STATUS).includes(status);
    }

    /**
     * Validate registration status
     * @param {string} status
     * @returns {boolean}
     */
    static isValidRegistrationStatus(status) {
        const { REGISTRATION_STATUS } = require('./constants');
        return Object.values(REGISTRATION_STATUS).includes(status);
    }

    /**
     * Validate bulk operation data
     * @param {object} data
     * @returns {object}
     */
    static validateBulkOperation(data) {
        const errors = [];

        if (!Array.isArray(data.ids)) {
            errors.push('IDs must be provided as an array');
        } else {
            if (data.ids.length === 0) {
                errors.push('At least one ID is required');
            }

            if (data.ids.length > 100) {
                errors.push('Cannot process more than 100 items at once');
            }

            data.ids.forEach((id, index) => {
                if (!this.isValidObjectId(id)) {
                    errors.push(`Invalid ID at position ${index}`);
                }
            });
        }

        if (!data.action || typeof data.action !== 'string') {
            errors.push('Action is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Sanitize search query
     * @param {string} query
     * @returns {string}
     */
    static sanitizeSearchQuery(query) {
        if (typeof query !== 'string') return '';

        return query
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
            .trim()
            .substring(0, 100); // Limit length
    }

    /**
     * Validate JWT payload
     * @param {object} payload
     * @returns {object}
     */
    static validateJWTPayload(payload) {
        const errors = [];

        if (!payload.userId || !this.isValidObjectId(payload.userId)) {
            errors.push('Valid user ID is required');
        }

        if (payload.email && !this.isValidEmail(payload.email)) {
            errors.push('Valid email is required');
        }

        if (payload.roles && !Array.isArray(payload.roles)) {
            errors.push('Roles must be an array');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate API key format
     * @param {string} apiKey
     * @returns {boolean}
     */
    static isValidAPIKey(apiKey) {
        return typeof apiKey === 'string' && /^[a-zA-Z0-9_-]+$/.test(apiKey);
    }

    /**
     * Validate webhook payload
     * @param {object} payload
     * @returns {object}
     */
    static validateWebhookPayload(payload) {
        const errors = [];

        if (!payload.event || typeof payload.event !== 'string') {
            errors.push('Event type is required');
        }

        if (!payload.timestamp || !this.isValidDate(payload.timestamp)) {
            errors.push('Valid timestamp is required');
        }

        if (!payload.data || typeof payload.data !== 'object') {
            errors.push('Event data is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate environment variables
     * @param {object} env
     * @returns {object}
     */
    static validateEnvironment(env) {
        const errors = [];
        const required = [
            'NODE_ENV',
            'PORT',
            'MONGODB_URI',
            'JWT_SECRET',
            'JWT_REFRESH_SECRET'
        ];

        required.forEach(key => {
            if (!env[key]) {
                errors.push(`${key} environment variable is required`);
            }
        });

        // Validate specific formats
        if (env.PORT && (isNaN(env.PORT) || parseInt(env.PORT) < 1 || parseInt(env.PORT) > 65535)) {
            errors.push('PORT must be a valid port number');
        }

        if (env.MONGODB_URI && !env.MONGODB_URI.startsWith('mongodb')) {
            errors.push('MONGODB_URI must be a valid MongoDB connection string');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Format bytes for file size validation
     * @param {number} bytes
     * @returns {string}
     */
    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Validate and sanitize HTML content
     * @param {string} html
     * @param {object} options
     * @returns {object}
     */
    static validateHTMLContent(html, options = {}) {
        const errors = [];

        if (typeof html !== 'string') {
            errors.push('Content must be a string');
            return { isValid: false, errors };
        }

        const maxLength = options.maxLength || VALIDATION.DESCRIPTION_FULL_MAX_LENGTH;
        if (html.length > maxLength) {
            errors.push(`Content exceeds maximum length of ${maxLength} characters`);
        }

        // Check for potentially dangerous content
        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
            /<object/i,
            /<embed/i
        ];

        dangerousPatterns.forEach(pattern => {
            if (pattern.test(html)) {
                errors.push('Content contains potentially dangerous elements');
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            sanitizedContent: this.sanitizeHTML(html)
        };
    }

    /**
     * Sanitize HTML content
     * @param {string} html
     * @returns {string}
     */
    static sanitizeHTML(html) {
        if (typeof html !== 'string') return '';

        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/on\w+='[^']*'/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/<iframe[^>]*>/gi, '')
            .replace(/<object[^>]*>/gi, '')
            .replace(/<embed[^>]*>/gi, '');
    }

    /**
     * Validate complex object structure
     * @param {object} obj
     * @param {object} schema
     * @returns {object}
     */
    static validateObjectSchema(obj, schema) {
        const errors = [];

        const validateField = (value, fieldSchema, fieldPath) => {
            if (fieldSchema.required && (value === undefined || value === null)) {
                errors.push(`${fieldPath} is required`);
                return;
            }

            if (value === undefined || value === null) return;

            if (fieldSchema.type && typeof value !== fieldSchema.type) {
                errors.push(`${fieldPath} must be of type ${fieldSchema.type}`);
                return;
            }

            if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
                errors.push(`${fieldPath} must be one of: ${fieldSchema.enum.join(', ')}`);
            }

            if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
                errors.push(`${fieldPath} must be at least ${fieldSchema.minLength} characters`);
            }

            if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
                errors.push(`${fieldPath} cannot exceed ${fieldSchema.maxLength} characters`);
            }

            if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
                errors.push(`${fieldPath} has invalid format`);
            }

            if (fieldSchema.custom && typeof fieldSchema.custom === 'function') {
                const customResult = fieldSchema.custom(value);
                if (!customResult.isValid) {
                    errors.push(`${fieldPath}: ${customResult.message}`);
                }
            }

            if (fieldSchema.properties && typeof value === 'object') {
                Object.keys(fieldSchema.properties).forEach(key => {
                    validateField(value[key], fieldSchema.properties[key], `${fieldPath}.${key}`);
                });
            }
        };

        Object.keys(schema).forEach(key => {
            validateField(obj[key], schema[key], key);
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = Validators;