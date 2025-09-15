const logger = require('../utils/logger');
const { ForbiddenError, UnauthorizedError } = require('./errorHandler');

// Permission definitions
const PERMISSIONS = {
    // User permissions
    USER_CREATE: 'user:create',
    USER_READ: 'user:read',
    USER_UPDATE: 'user:update',
    USER_DELETE: 'user:delete',
    USER_MANAGE: 'user:manage',

    // Event permissions
    EVENT_CREATE: 'event:create',
    EVENT_READ: 'event:read',
    EVENT_UPDATE: 'event:update',
    EVENT_DELETE: 'event:delete',
    EVENT_PUBLISH: 'event:publish',
    EVENT_FEATURE: 'event:feature',
    EVENT_MODERATE: 'event:moderate',

    // Registration permissions
    REGISTRATION_CREATE: 'registration:create',
    REGISTRATION_READ: 'registration:read',
    REGISTRATION_UPDATE: 'registration:update',
    REGISTRATION_DELETE: 'registration:delete',
    REGISTRATION_APPROVE: 'registration:approve',
    REGISTRATION_CHECKIN: 'registration:checkin',

    // Admin permissions
    ADMIN_DASHBOARD: 'admin:dashboard',
    ADMIN_USERS: 'admin:users',
    ADMIN_EVENTS: 'admin:events',
    ADMIN_REPORTS: 'admin:reports',
    ADMIN_SETTINGS: 'admin:settings',
    ADMIN_LOGS: 'admin:logs',
    ADMIN_BACKUP: 'admin:backup',
    ADMIN_MAINTENANCE: 'admin:maintenance',

    // Moderation permissions
    MODERATE_CONTENT: 'moderate:content',
    MODERATE_USERS: 'moderate:users',
    MODERATE_EVENTS: 'moderate:events',
    MODERATE_REPORTS: 'moderate:reports',

    // Analytics permissions
    ANALYTICS_VIEW: 'analytics:view',
    ANALYTICS_EXPORT: 'analytics:export',
    ANALYTICS_ADVANCED: 'analytics:advanced',

    // Notification permissions
    NOTIFICATION_SEND: 'notification:send',
    NOTIFICATION_BROADCAST: 'notification:broadcast',
    NOTIFICATION_MANAGE: 'notification:manage',

    // System permissions
    SYSTEM_CONFIG: 'system:config',
    SYSTEM_MONITOR: 'system:monitor',
    SYSTEM_LOGS: 'system:logs',
    SYSTEM_BACKUP: 'system:backup'
};

// Role definitions with their permissions
const ROLE_PERMISSIONS = {
    student: [
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.EVENT_READ,
        PERMISSIONS.REGISTRATION_CREATE,
        PERMISSIONS.REGISTRATION_READ,
        PERMISSIONS.REGISTRATION_UPDATE
    ],
    organizer: [
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.EVENT_CREATE,
        PERMISSIONS.EVENT_READ,
        PERMISSIONS.EVENT_UPDATE,
        PERMISSIONS.EVENT_DELETE,
        PERMISSIONS.EVENT_PUBLISH,
        PERMISSIONS.REGISTRATION_READ,
        PERMISSIONS.REGISTRATION_APPROVE,
        PERMISSIONS.REGISTRATION_CHECKIN,
        PERMISSIONS.NOTIFICATION_SEND,
        PERMISSIONS.ANALYTICS_VIEW
    ],
    moderator: [
        ...ROLE_PERMISSIONS.organizer,
        PERMISSIONS.USER_MANAGE,
        PERMISSIONS.EVENT_MODERATE,
        PERMISSIONS.EVENT_FEATURE,
        PERMISSIONS.MODERATE_CONTENT,
        PERMISSIONS.MODERATE_USERS,
        PERMISSIONS.MODERATE_EVENTS,
        PERMISSIONS.MODERATE_REPORTS,
        PERMISSIONS.ANALYTICS_EXPORT,
        PERMISSIONS.ADMIN_REPORTS,
        PERMISSIONS.NOTIFICATION_BROADCAST
    ],
    admin: [
        ...Object.values(PERMISSIONS) // Admin has all permissions
    ]
};

class AuthorizationMiddleware {
    // Check if user has specific permission
    requirePermission = (permission) => {
        return (req, res, next) => {
            try {
                if (!req.user) {
                    throw new UnauthorizedError('Authentication required');
                }

                // Admin has all permissions
                if (req.user.role === 'admin') {
                    return next();
                }

                const userPermissions = this.getUserPermissions(req.user);

                if (!userPermissions.includes(permission)) {
                    logger.warn('Permission denied:', {
                        userId: req.user.userId,
                        role: req.user.role,
                        requiredPermission: permission,
                        userPermissions: userPermissions,
                        path: req.originalUrl,
                        method: req.method
                    });

                    throw new ForbiddenError(`Permission '${permission}' required`);
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    };

    // Check if user has any of the specified permissions
    requireAnyPermission = (permissions) => {
        return (req, res, next) => {
            try {
                if (!req.user) {
                    throw new UnauthorizedError('Authentication required');
                }

                // Admin has all permissions
                if (req.user.role === 'admin') {
                    return next();
                }

                const userPermissions = this.getUserPermissions(req.user);
                const hasPermission = permissions.some(permission =>
                    userPermissions.includes(permission)
                );

                if (!hasPermission) {
                    logger.warn('Permissions denied:', {
                        userId: req.user.userId,
                        role: req.user.role,
                        requiredPermissions: permissions,
                        userPermissions: userPermissions,
                        path: req.originalUrl
                    });

                    throw new ForbiddenError(`One of these permissions required: ${permissions.join(', ')}`);
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    };

    // Check if user has all specified permissions
    requireAllPermissions = (permissions) => {
        return (req, res, next) => {
            try {
                if (!req.user) {
                    throw new UnauthorizedError('Authentication required');
                }

                // Admin has all permissions
                if (req.user.role === 'admin') {
                    return next();
                }

                const userPermissions = this.getUserPermissions(req.user);
                const hasAllPermissions = permissions.every(permission =>
                    userPermissions.includes(permission)
                );

                if (!hasAllPermissions) {
                    const missingPermissions = permissions.filter(permission =>
                        !userPermissions.includes(permission)
                    );

                    logger.warn('Missing permissions:', {
                        userId: req.user.userId,
                        role: req.user.role,
                        missingPermissions: missingPermissions,
                        path: req.originalUrl
                    });

                    throw new ForbiddenError(`Missing permissions: ${missingPermissions.join(', ')}`);
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    };

    // Check resource ownership
    requireOwnership = (getResourceOwner, allowedRoles = []) => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    throw new UnauthorizedError('Authentication required');
                }

                // Check if user has privileged role
                if (allowedRoles.includes(req.user.role)) {
                    return next();
                }

                // Get resource owner
                const ownerId = await getResourceOwner(req);

                if (!ownerId) {
                    throw new ForbiddenError('Resource owner could not be determined');
                }

                // Check ownership
                if (ownerId.toString() !== req.user.userId.toString()) {
                    logger.warn('Ownership denied:', {
                        userId: req.user.userId,
                        resourceOwner: ownerId,
                        path: req.originalUrl,
                        method: req.method
                    });

                    throw new ForbiddenError('You can only access your own resources');
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    };

    // Check if user can access event reports
    canViewEventReports = async (req, res, next) => {
        try {
            if (!req.user) {
                throw new UnauthorizedError('Authentication required');
            }

            // Admin and moderators can view all reports
            if (['admin', 'moderator'].includes(req.user.role)) {
                return next();
            }

            const eventId = req.params.eventId || req.params.id;
            if (!eventId) {
                throw new ForbiddenError('Không thể xác định sự kiện');
            }

            const Event = require('../models/Event');
            const event = await Event.findById(eventId);

            if (!event) {
                throw new ForbiddenError('Sự kiện không tồn tại');
            }

            // Kiểm tra quyền xem báo cáo sự kiện
            const isOrganizer = event.organizer.toString() === req.user.userId.toString();
            const isCoOrganizer = event.coOrganizers && event.coOrganizers.some(
                coOrg => coOrg.toString() === req.user.userId.toString()
            );

            if (!isOrganizer && !isCoOrganizer) {
                throw new ForbiddenError('Bạn chỉ có thể xem báo cáo của sự kiện mình tổ chức');
            }

            next();
        } catch (error) {
            next(error);
        }
    };

    // Kiểm tra quyền truy cập tài nguyên dựa trên điều kiện tùy chỉnh
    requireCondition = (conditionFn, errorMessage = 'Truy cập bị từ chối') => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    throw new UnauthorizedError('Yêu cầu xác thực');
                }

                const hasAccess = await conditionFn(req);
                if (!hasAccess) {
                    logger.warn('Điều kiện truy cập bị từ chối:', {
                        userId: req.user.userId,
                        path: req.originalUrl,
                        method: req.method,
                        condition: conditionFn.name
                    });

                    throw new ForbiddenError(errorMessage);
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    };

    // Kiểm tra thời gian truy cập (ví dụ: chỉ cho phép trong giờ hành chính)
    requireBusinessHours = (timezone = 'Asia/Ho_Chi_Minh') => {
        return (req, res, next) => {
            try {
                const now = new Date();
                const options = { timeZone: timezone, hour12: false };
                const hour = parseInt(now.toLocaleString('en-US', { ...options, hour: 'numeric' }));
                const day = now.getDay(); // 0 = Chủ nhật, 1 = Thứ hai, ...

                // Kiểm tra giờ hành chính (8:00 - 18:00, Thứ hai - Thứ sáu)
                const isBusinessHours = (day >= 1 && day <= 5) && (hour >= 8 && hour < 18);

                if (!isBusinessHours) {
                    // Admin luôn được phép truy cập
                    if (req.user?.role === 'admin') {
                        return next();
                    }

                    throw new ForbiddenError('Chức năng này chỉ khả dụng trong giờ hành chính (8:00-18:00, Thứ hai-Thứ sáu)');
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    };

    // Kiểm tra giới hạn tài nguyên
    requireResourceLimit = (limitCheck) => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    throw new UnauthorizedError('Yêu cầu xác thực');
                }

                const { allowed, current, limit, message } = await limitCheck(req.user);

                if (!allowed) {
                    logger.warn('Giới hạn tài nguyên vượt quá:', {
                        userId: req.user.userId,
                        current,
                        limit,
                        path: req.originalUrl
                    });

                    throw new ForbiddenError(message || `Đã vượt quá giới hạn cho phép (${current}/${limit})`);
                }

                // Thêm thông tin giới hạn vào request
                req.resourceLimit = { current, limit };

                next();
            } catch (error) {
                next(error);
            }
        };
    };

    // Kiểm tra trạng thái tài khoản
    requireAccountStatus = (requiredStatus = 'active') => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    throw new UnauthorizedError('Yêu cầu xác thực');
                }

                const User = require('../models/User');
                const user = await User.findById(req.user.userId);

                if (!user) {
                    throw new UnauthorizedError('Người dùng không tồn tại');
                }

                if (user.status !== requiredStatus) {
                    const statusMessages = {
                        inactive: 'Tài khoản chưa được kích hoạt',
                        suspended: 'Tài khoản đã bị tạm khóa',
                        banned: 'Tài khoản đã bị cấm',
                        pending: 'Tài khoản đang chờ phê duyệt'
                    };

                    const message = statusMessages[user.status] || 'Trạng thái tài khoản không hợp lệ';
                    throw new ForbiddenError(message);
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    };

    // Kiểm tra xác minh email
    requireEmailVerification = async (req, res, next) => {
        try {
            if (!req.user) {
                throw new UnauthorizedError('Yêu cầu xác thực');
            }

            const User = require('../models/User');
            const user = await User.findById(req.user.userId);

            if (!user) {
                throw new UnauthorizedError('Người dùng không tồn tại');
            }

            if (!user.emailVerified) {
                throw new ForbiddenError('Yêu cầu xác minh email để tiếp tục');
            }

            next();
        } catch (error) {
            next(error);
        }
    };

    // Kiểm tra hoàn thành hồ sơ
    requireCompleteProfile = (requiredFields = []) => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    throw new UnauthorizedError('Yêu cầu xác thực');
                }

                const User = require('../models/User');
                const user = await User.findById(req.user.userId);

                if (!user) {
                    throw new UnauthorizedError('Người dùng không tồn tại');
                }

                // Kiểm tra các trường bắt buộc
                const missingFields = [];
                for (const field of requiredFields) {
                    const fieldValue = this.getNestedProperty(user, field);
                    if (!fieldValue) {
                        missingFields.push(field);
                    }
                }

                if (missingFields.length > 0) {
                    throw new ForbiddenError(`Vui lòng hoàn thiện thông tin: ${missingFields.join(', ')}`);
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    };

    // Kiểm tra quyền truy cập dựa trên thuộc tính người dùng
    requireUserAttribute = (attribute, expectedValue) => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    throw new UnauthorizedError('Yêu cầu xác thực');
                }

                const User = require('../models/User');
                const user = await User.findById(req.user.userId);

                if (!user) {
                    throw new UnauthorizedError('Người dùng không tồn tại');
                }

                const actualValue = this.getNestedProperty(user, attribute);

                if (actualValue !== expectedValue) {
                    throw new ForbiddenError(`Yêu cầu ${attribute} phải là ${expectedValue}`);
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    };

    // Kiểm tra quyền truy cập theo IP
    requireIPWhitelist = (whitelist = []) => {
        return (req, res, next) => {
            try {
                if (whitelist.length === 0) {
                    return next();
                }

                const clientIP = req.ip || req.connection.remoteAddress;
                const isAllowed = whitelist.some(allowedIP => {
                    if (allowedIP.includes('/')) {
                        // CIDR notation check
                        return this.isIPInCIDR(clientIP, allowedIP);
                    }
                    return clientIP === allowedIP;
                });

                if (!isAllowed) {
                    logger.security('IP không được phép truy cập:', {
                        ip: clientIP,
                        path: req.originalUrl,
                        userAgent: req.get('User-Agent')
                    });

                    throw new ForbiddenError('Truy cập từ địa chỉ IP này không được phép');
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    };

    // Kiểm tra rate limit theo người dùng
    requireUserRateLimit = (maxRequests, windowMs, bypassRoles = ['admin']) => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    throw new UnauthorizedError('Yêu cầu xác thực');
                }

                // Bỏ qua rate limit cho một số vai trò
                if (bypassRoles.includes(req.user.role)) {
                    return next();
                }

                const redisClient = require('../config/redis');
                const key = `rate_limit:user:${req.user.userId}:${req.route.path}`;

                const current = await redisClient.get(key) || 0;

                if (current >= maxRequests) {
                    throw new ForbiddenError(`Đã vượt quá giới hạn ${maxRequests} yêu cầu trong ${windowMs/1000} giây`);
                }

                // Tăng counter
                await redisClient.incr(key);
                await redisClient.expire(key, Math.ceil(windowMs / 1000));

                next();
            } catch (error) {
                next(error);
            }
        };
    };

    // Lấy quyền của người dùng
    getUserPermissions = (user) => {
        const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
        const customPermissions = user.permissions || [];

        // Kết hợp quyền từ vai trò và quyền tùy chỉnh
        return [...new Set([...rolePermissions, ...customPermissions])];
    };

    // Kiểm tra quyền cụ thể
    hasPermission = (user, permission) => {
        if (user.role === 'admin') return true;
        const userPermissions = this.getUserPermissions(user);
        return userPermissions.includes(permission);
    };

    // Lấy thuộc tính lồng nhau từ object
    getNestedProperty = (obj, path) => {
        return path.split('.').reduce((o, p) => o && o[p], obj);
    };

    // Kiểm tra IP có trong CIDR range không
    isIPInCIDR = (ip, cidr) => {
        const [range, bits] = cidr.split('/');
        const mask = ~(2 ** (32 - bits) - 1);

        const ipInt = this.ipToInt(ip);
        const rangeInt = this.ipToInt(range);

        return (ipInt & mask) === (rangeInt & mask);
    };

    // Chuyển IP thành số nguyên
    ipToInt = (ip) => {
        return ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0;
    };

    // Tạo context cho logging
    createLogContext = (req, action) => {
        return {
            userId: req.user?.userId,
            role: req.user?.role,
            action,
            path: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        };
    };
}

// Hằng số xuất ra
module.exports = {
    AuthorizationMiddleware: new AuthorizationMiddleware(),
    PERMISSIONS,
    ROLE_PERMISSIONS
};