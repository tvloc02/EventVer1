// User roles and permissions
const USER_ROLES = {
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    ORGANIZER: 'organizer',
    STUDENT: 'student'
};

const PERMISSIONS = {
    // User management
    CREATE_USER: 'create_user',
    READ_USER: 'read_user',
    UPDATE_USER: 'update_user',
    DELETE_USER: 'delete_user',
    MANAGE_USERS: 'manage_users',

    // Event management
    CREATE_EVENT: 'create_event',
    READ_EVENT: 'read_event',
    UPDATE_EVENT: 'update_event',
    DELETE_EVENT: 'delete_event',
    PUBLISH_EVENT: 'publish_event',
    MANAGE_EVENTS: 'manage_events',

    // Registration management
    REGISTER_EVENT: 'register_event',
    APPROVE_REGISTRATION: 'approve_registration',
    CANCEL_REGISTRATION: 'cancel_registration',
    MANAGE_REGISTRATIONS: 'manage_registrations',

    // System administration
    VIEW_ANALYTICS: 'view_analytics',
    MANAGE_SYSTEM: 'manage_system',
    VIEW_LOGS: 'view_logs',
    MANAGE_SETTINGS: 'manage_settings'
};

const ROLE_PERMISSIONS = {
    [USER_ROLES.ADMIN]: [
        ...Object.values(PERMISSIONS)
    ],
    [USER_ROLES.MODERATOR]: [
        PERMISSIONS.READ_USER,
        PERMISSIONS.UPDATE_USER,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.CREATE_EVENT,
        PERMISSIONS.READ_EVENT,
        PERMISSIONS.UPDATE_EVENT,
        PERMISSIONS.DELETE_EVENT,
        PERMISSIONS.PUBLISH_EVENT,
        PERMISSIONS.MANAGE_EVENTS,
        PERMISSIONS.APPROVE_REGISTRATION,
        PERMISSIONS.MANAGE_REGISTRATIONS,
        PERMISSIONS.VIEW_ANALYTICS
    ],
    [USER_ROLES.ORGANIZER]: [
        PERMISSIONS.READ_USER,
        PERMISSIONS.CREATE_EVENT,
        PERMISSIONS.READ_EVENT,
        PERMISSIONS.UPDATE_EVENT,
        PERMISSIONS.DELETE_EVENT,
        PERMISSIONS.PUBLISH_EVENT,
        PERMISSIONS.APPROVE_REGISTRATION,
        PERMISSIONS.CANCEL_REGISTRATION,
        PERMISSIONS.MANAGE_REGISTRATIONS
    ],
    [USER_ROLES.STUDENT]: [
        PERMISSIONS.READ_USER,
        PERMISSIONS.UPDATE_USER,
        PERMISSIONS.READ_EVENT,
        PERMISSIONS.REGISTER_EVENT,
        PERMISSIONS.CANCEL_REGISTRATION
    ]
};

// Event-related constants
const EVENT_TYPES = {
    WORKSHOP: 'workshop',
    SEMINAR: 'seminar',
    CONFERENCE: 'conference',
    COMPETITION: 'competition',
    SOCIAL: 'social',
    CAREER: 'career',
    ACADEMIC: 'academic',
    SPORTS: 'sports',
    VOLUNTEER: 'volunteer',
    CULTURAL: 'cultural'
};

const EVENT_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    CANCELLED: 'cancelled',
    POSTPONED: 'postponed',
    COMPLETED: 'completed',
    ARCHIVED: 'archived'
};

const LOCATION_TYPES = {
    PHYSICAL: 'physical',
    ONLINE: 'online',
    HYBRID: 'hybrid'
};

const REGISTRATION_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
    WAITLIST: 'waitlist',
    ATTENDED: 'attended',
    NO_SHOW: 'no_show'
};

const REGISTRATION_APPROVAL_TYPES = {
    AUTOMATIC: 'automatic',
    MANUAL: 'manual',
    FIRST_COME_FIRST_SERVED: 'first_come_first_served'
};

// Notification-related constants
const NOTIFICATION_TYPES = {
    REGISTRATION_CONFIRMATION: 'registration_confirmation',
    REGISTRATION_APPROVED: 'registration_approved',
    REGISTRATION_REJECTED: 'registration_rejected',
    EVENT_REMINDER: 'event_reminder',
    EVENT_UPDATED: 'event_updated',
    EVENT_CANCELLED: 'event_cancelled',
    EVENT_POSTPONED: 'event_postponed',
    WAITLIST_PROMOTED: 'waitlist_promoted',
    SYSTEM_ANNOUNCEMENT: 'system_announcement'
};

const NOTIFICATION_CHANNELS = {
    EMAIL: 'email',
    PUSH: 'push',
    SMS: 'sms',
    IN_APP: 'in_app'
};

const NOTIFICATION_PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
};

// User account status
const ACCOUNT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING_VERIFICATION: 'pending_verification',
    DELETED: 'deleted'
};

// Gender options
const GENDER_OPTIONS = {
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other',
    PREFER_NOT_TO_SAY: 'prefer_not_to_say'
};

// Language options
const LANGUAGES = {
    VIETNAMESE: 'vi',
    ENGLISH: 'en'
};

// File upload constants
const FILE_TYPES = {
    IMAGE: 'image',
    DOCUMENT: 'document',
    VIDEO: 'video',
    AUDIO: 'audio'
};

const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
];

const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain'
];

const MAX_FILE_SIZES = {
    AVATAR: 5 * 1024 * 1024, // 5MB
    BANNER: 10 * 1024 * 1024, // 10MB
    DOCUMENT: 20 * 1024 * 1024, // 20MB
    DEFAULT: 10 * 1024 * 1024 // 10MB
};

// API response codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503
};

// Rate limiting
const RATE_LIMITS = {
    GENERAL: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // requests per windowMs
    },
    AUTH: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5 // requests per windowMs for sensitive auth operations
    },
    REGISTRATION: {
        windowMs: 60 * 1000, // 1 minute
        max: 3 // prevent rapid registration attempts
    },
    SEARCH: {
        windowMs: 60 * 1000, // 1 minute
        max: 30 // search requests per minute
    }
};

// Pagination defaults
const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
};

// Time constants
const TIME_CONSTANTS = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000
};

// Token expiration times
const TOKEN_EXPIRATION = {
    ACCESS_TOKEN: 15 * TIME_CONSTANTS.MINUTE, // 15 minutes
    REFRESH_TOKEN: 7 * TIME_CONSTANTS.DAY, // 7 days
    EMAIL_VERIFICATION: 24 * TIME_CONSTANTS.HOUR, // 24 hours
    PASSWORD_RESET: 1 * TIME_CONSTANTS.HOUR, // 1 hour
    TWO_FACTOR: 5 * TIME_CONSTANTS.MINUTE // 5 minutes
};

// Validation constants
const VALIDATION = {
    PASSWORD_MIN_LENGTH: 6,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 30,
    NAME_MAX_LENGTH: 50,
    EMAIL_MAX_LENGTH: 255,
    TITLE_MAX_LENGTH: 200,
    DESCRIPTION_SHORT_MAX_LENGTH: 500,
    DESCRIPTION_FULL_MAX_LENGTH: 5000,
    BIO_MAX_LENGTH: 500,
    PHONE_REGEX: /^[+]?[\d\s\-\(\)]+$/,
    STUDENT_ID_MIN_LENGTH: 5,
    STUDENT_ID_MAX_LENGTH: 20
};

// Cache keys and TTL
const CACHE_KEYS = {
    USER_PREFIX: 'user:',
    EVENT_PREFIX: 'event:',
    REGISTRATION_PREFIX: 'registration:',
    CATEGORY_PREFIX: 'category:',
    SEARCH_PREFIX: 'search:',
    STATS_PREFIX: 'stats:',
    SESSION_PREFIX: 'session:'
};

const CACHE_TTL = {
    SHORT: 5 * TIME_CONSTANTS.MINUTE,
    MEDIUM: 30 * TIME_CONSTANTS.MINUTE,
    LONG: 2 * TIME_CONSTANTS.HOUR,
    USER_SESSION: 24 * TIME_CONSTANTS.HOUR,
    SEARCH_RESULTS: 10 * TIME_CONSTANTS.MINUTE
};

// Email template types
const EMAIL_TEMPLATES = {
    WELCOME: 'welcome',
    EMAIL_VERIFICATION: 'email_verification',
    PASSWORD_RESET: 'password_reset',
    PASSWORD_CHANGED: 'password_changed',
    REGISTRATION_CONFIRMATION: 'registration_confirmation',
    REGISTRATION_APPROVED: 'registration_approved',
    REGISTRATION_REJECTED: 'registration_rejected',
    EVENT_REMINDER: 'event_reminder',
    EVENT_CANCELLED: 'event_cancelled',
    EVENT_UPDATED: 'event_updated',
    NEWSLETTER: 'newsletter'
};

// Log levels
const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    HTTP: 'http',
    DEBUG: 'debug'
};

// Search filters
const SEARCH_FILTERS = {
    EVENT_TYPE: 'eventType',
    CATEGORY: 'category',
    LOCATION_TYPE: 'locationType',
    STATUS: 'status',
    DATE_RANGE: 'dateRange',
    FEATURED: 'featured',
    ORGANIZER: 'organizer'
};

// Sort options
const SORT_OPTIONS = {
    CREATED_AT_DESC: { createdAt: -1 },
    CREATED_AT_ASC: { createdAt: 1 },
    UPDATED_AT_DESC: { updatedAt: -1 },
    START_DATE_DESC: { 'schedule.startDate': -1 },
    START_DATE_ASC: { 'schedule.startDate': 1 },
    TITLE_ASC: { title: 1 },
    TITLE_DESC: { title: -1 },
    RELEVANCE: { score: { $meta: 'textScore' } }
};

// Error codes
const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
    DUPLICATE_ERROR: 'DUPLICATE_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

// System settings
const SYSTEM_SETTINGS = {
    MAINTENANCE_MODE: false,
    REGISTRATION_ENABLED: true,
    EMAIL_NOTIFICATIONS_ENABLED: true,
    PUSH_NOTIFICATIONS_ENABLED: true,
    SMS_NOTIFICATIONS_ENABLED: false,
    FEATURE_FLAGS: {
        ADVANCED_SEARCH: true,
        SOCIAL_LOGIN: true,
        TWO_FACTOR_AUTH: true,
        EVENT_ANALYTICS: true,
        BULK_OPERATIONS: true
    }
};

// Vietnamese provinces for location filtering
const VIETNAM_PROVINCES = [
    'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
    'An Giang', 'Bà Rịa - Vũng Tàu', 'Bạc Liêu', 'Bắc Giang', 'Bắc Kạn',
    'Bắc Ninh', 'Bến Tre', 'Bình Dương', 'Bình Định', 'Bình Phước',
    'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
    'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
    'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
    'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
    'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
    'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
    'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
    'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
    'Thanh Hóa', 'Thừa Thiên - Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang',
    'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
];

// Academic years and semesters
const ACADEMIC_YEARS = [
    '2024-2025', '2025-2026', '2026-2027', '2027-2028'
];

const SEMESTERS = {
    FALL: 'fall',
    SPRING: 'spring',
    SUMMER: 'summer'
};

module.exports = {
    USER_ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    EVENT_TYPES,
    EVENT_STATUS,
    LOCATION_TYPES,
    REGISTRATION_STATUS,
    REGISTRATION_APPROVAL_TYPES,
    NOTIFICATION_TYPES,
    NOTIFICATION_CHANNELS,
    NOTIFICATION_PRIORITY,
    ACCOUNT_STATUS,
    GENDER_OPTIONS,
    LANGUAGES,
    FILE_TYPES,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_DOCUMENT_TYPES,
    MAX_FILE_SIZES,
    HTTP_STATUS,
    RATE_LIMITS,
    PAGINATION,
    TIME_CONSTANTS,
    TOKEN_EXPIRATION,
    VALIDATION,
    CACHE_KEYS,
    CACHE_TTL,
    EMAIL_TEMPLATES,
    LOG_LEVELS,
    SEARCH_FILTERS,
    SORT_OPTIONS,
    ERROR_CODES,
    SYSTEM_SETTINGS,
    VIETNAM_PROVINCES,
    ACADEMIC_YEARS,
    SEMESTERS
};