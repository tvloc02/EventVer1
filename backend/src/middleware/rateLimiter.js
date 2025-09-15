const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');
const { TooManyRequestsError } = require('./errorHandler');

// Tạo Redis store cho rate limiting
const createRedisStore = () => {
    try {
        return new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
            prefix: 'rl:'
        });
    } catch (error) {
        logger.error('Không thể kết nối Redis store cho rate limiting:', error);
        return undefined;
    }
};

// Tạo key generator
const createKeyGenerator = (prefix = 'rl') => {
    return (req) => {
        const userId = req.user?.userId || 'anonymous';
        const ip = req.ip || req.connection.remoteAddress;
        return `${prefix}:${userId}:${ip}`;
    };
};

// Handler khi vượt rate limit
const rateLimitHandler = (req, res) => {
    logger.warn('Rate limit vượt quá:', {
        ip: req.ip,
        userId: req.user?.userId,
        path: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent'),
        limit: req.rateLimit?.limit,
        remaining: req.rateLimit?.remaining,
        resetTime: req.rateLimit?.resetTime
    });

    res.status(429).json({
        success: false,
        message: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            limit: req.rateLimit?.limit,
            remaining: req.rateLimit?.remaining,
            resetTime: new Date(Date.now() + (req.rateLimit?.resetTime || 900000)),
            retryAfter: Math.round((req.rateLimit?.resetTime || 900000) / 1000)
        },
        timestamp: new Date().toISOString()
    });
};

// Skip function cho requests thành công
const skipSuccessfulRequests = (req, res) => {
    return res.statusCode < 400;
};

// Skip function cho requests thất bại
const skipFailedRequests = (req, res) => {
    return res.statusCode >= 400;
};

// Rate limit configurations
const rateLimitConfigs = {
    // General API rate limit
    general: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 phút
        max: 100,
        message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút',
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: createKeyGenerator('general'),
        handler: rateLimitHandler,
        skip: (req) => {
            return req.user?.role === 'admin' || req.skipRateLimit;
        }
    }),

    // Authentication rate limit
    auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 phút
        max: 5,
        message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 15 phút',
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: createKeyGenerator('auth'),
        handler: rateLimitHandler,
        skipSuccessfulRequests: true
    }),

    // Password reset rate limit
    passwordReset: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 giờ
        max: 3,
        message: 'Quá nhiều yêu cầu đặt lại mật khẩu, vui lòng thử lại sau 1 giờ',
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: createKeyGenerator('pwd_reset'),
        handler: rateLimitHandler
    }),

    // Email verification rate limit
    emailVerification: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 giờ
        max: 5,
        message: 'Quá nhiều yêu cầu xác minh email, vui lòng thử lại sau 1 giờ',
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: createKeyGenerator('email_verify'),
        handler: rateLimitHandler
    }),

    // File upload rate limit
    upload: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 phút
        max: 20,
        message: 'Quá nhiều file uploads, vui lòng thử lại sau',
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: createKeyGenerator('upload'),
        handler: rateLimitHandler,
        skip: (req) => {
            return ['admin', 'moderator'].includes(req.user?.role);
        }
    }),

    // API calls rate limit
    api: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 phút
        max: (req) => {
            if (req.user?.role === 'admin') return 1000;
            if (req.user?.role === 'moderator') return 500;
            if (req.user?.role === 'organizer') return 200;
            return 100;
        },
        message: 'Quá nhiều API calls, vui lòng thử lại sau',
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: createKeyGenerator('api'),
        handler: rateLimitHandler
    }),

    // Search rate limit
    search: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 phút
        max: 50,
        message: 'Quá nhiều tìm kiếm, vui lòng thử lại sau',
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: createKeyGenerator('search'),
        handler: rateLimitHandler
    }),

    // Notification rate limit
    notification: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 giờ
        max: 10,
        message: 'Quá nhiều thông báo được gửi, vui lòng thử lại sau',
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: createKeyGenerator('notification'),
        handler: rateLimitHandler,
        skip: (req) => {
            return ['admin', 'moderator'].includes(req.user?.role);
        }
    }),

    // Reports rate limit
    reports: rateLimit({
        windowMs: 10 * 60 * 1000, // 10 phút
        max: 5,
        message: 'Quá nhiều yêu cầu báo cáo, vui lòng thử lại sau',
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: createKeyGenerator('reports'),
        handler: rateLimitHandler
    }),

    // Sensitive operations rate limit
    sensitive: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 giờ
        max: 3,
        message: 'Quá nhiều lần thử thực hiện thao tác nhạy cảm',
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: createKeyGenerator('sensitive'),
        handler: rateLimitHandler,
        skipSuccessfulRequests: true
    }),

    // Webhook rate limit
    webhook: rateLimit({
        windowMs: 1 * 60 * 1000, // 1 phút
        max: 60,
        message: 'Webhook rate limit exceeded',
        standardHeaders: false,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: (req) => `webhook:${req.ip}`,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: 60
            });
        }
    }),

    // Registration rate limit
    registration: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 giờ
        max: 20,
        message: 'Quá nhiều đăng ký sự kiện trong giờ qua',
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: (req) => `register:${req.user?.userId || req.ip}`,
        handler: rateLimitHandler
    })
};

// Rate limiting theo user
const userBasedRateLimit = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000,
        maxRequests = {
            admin: 1000,
            moderator: 500,
            organizer: 200,
            student: 100,
            anonymous: 50
        },
        message = 'Quá nhiều yêu cầu, vui lòng thử lại sau',
        skipSuccessful = false,
        prefix = 'user_rl'
    } = options;

    return async (req, res, next) => {
        try {
            const role = req.user?.role || 'anonymous';
            const userId = req.user?.userId || req.ip;
            const key = `${prefix}:${role}:${userId}`;

            const max = maxRequests[role] || maxRequests.anonymous;
            const current = await redisClient.get(key) || 0;

            if (current >= max) {
                logger.warn('User rate limit vượt quá:', {
                    userId: req.user?.userId,
                    role,
                    current: parseInt(current),
                    max,
                    path: req.originalUrl,
                    method: req.method
                });

                return res.status(429).json({
                    success: false,
                    message,
                    error: {
                        code: 'USER_RATE_LIMIT_EXCEEDED',
                        limit: max,
                        current: parseInt(current),
                        resetTime: new Date(Date.now() + windowMs),
                        retryAfter: Math.ceil(windowMs / 1000)
                    }
                });
            }

            // Tăng counter sau response
            res.on('finish', async () => {
                try {
                    if (skipSuccessful && res.statusCode < 400) {
                        return;
                    }

                    const newCount = await redisClient.incr(key);
                    if (newCount === 1) {
                        await redisClient.expire(key, Math.ceil(windowMs / 1000));
                    }
                } catch (error) {
                    logger.error('Lỗi cập nhật rate limit counter:', error);
                }
            });

            // Thêm headers
            res.set({
                'X-RateLimit-Limit': max,
                'X-RateLimit-Remaining': Math.max(0, max - current - 1),
                'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
            });

            next();
        } catch (error) {
            logger.error('Lỗi user rate limiting:', error);
            next();
        }
    };
};

// Adaptive rate limiting theo thời gian
const adaptiveRateLimit = (baseConfig = {}) => {
    return async (req, res, next) => {
        try {
            const hour = new Date().getHours();
            const isBusinessHours = hour >= 8 && hour <= 18;
            const isPeakHour = (hour >= 9 && hour <= 11) ||
                (hour >= 14 && hour <= 16);

            let multiplier = 1.0;
            if (isPeakHour) multiplier = 1.5;
            else if (isBusinessHours) multiplier = 1.2;
            else multiplier = 0.8;

            const baseMax = baseConfig.max || 100;
            const adjustedMax = Math.floor(baseMax * multiplier);

            const key = `adaptive_rl:${req.ip}:${hour}`;
            const current = await redisClient.get(key) || 0;

            if (current >= adjustedMax) {
                return res.status(429).json({
                    success: false,
                    message: 'Quá nhiều yêu cầu trong giờ này, vui lòng thử lại sau',
                    retryAfter: 3600 - (new Date().getMinutes() * 60 + new Date().getSeconds())
                });
            }

            await redisClient.incr(key);
            await redisClient.expire(key, 3600);

            res.set('X-RateLimit-Limit', adjustedMax);
            res.set('X-RateLimit-Remaining', Math.max(0, adjustedMax - current - 1));

            next();
        } catch (error) {
            logger.error('Lỗi adaptive rate limiting:', error);
            next();
        }
    };
};

// Rate limiting cho concurrent requests
const concurrentRequestLimit = (maxConcurrent = 10) => {
    const activeRequests = new Map();

    return (req, res, next) => {
        const key = req.user?.userId || req.ip;
        const current = activeRequests.get(key) || 0;

        if (current >= maxConcurrent) {
            logger.warn('Quá nhiều concurrent requests:', {
                userId: req.user?.userId,
                ip: req.ip,
                current,
                max: maxConcurrent,
                path: req.originalUrl
            });

            return res.status(429).json({
                success: false,
                message: 'Quá nhiều yêu cầu đồng thời, vui lòng đợi',
                maxConcurrent,
                current
            });
        }

        activeRequests.set(key, current + 1);

        res.on('finish', () => {
            const newCount = activeRequests.get(key) - 1;
            if (newCount <= 0) {
                activeRequests.delete(key);
            } else {
                activeRequests.set(key, newCount);
            }
        });

        next();
    };
};

// Rate limiting theo kích thước request
const requestSizeLimit = (maxSize = 10 * 1024 * 1024) => {
    return (req, res, next) => {
        const contentLength = parseInt(req.get('Content-Length') || 0);

        if (contentLength > maxSize) {
            logger.warn('Request quá lớn:', {
                size: contentLength,
                maxSize,
                ip: req.ip,
                path: req.originalUrl,
                userId: req.user?.userId
            });

            return res.status(413).json({
                success: false,
                message: 'Kích thước yêu cầu quá lớn',
                maxSize: `${Math.round(maxSize / 1024 / 1024)}MB`,
                receivedSize: `${Math.round(contentLength / 1024 / 1024)}MB`
            });
        }

        next();
    };
};

// Rate limiting cho specific actions
const actionRateLimit = {
    createEvent: rateLimit({
        windowMs: 24 * 60 * 60 * 1000, // 24 giờ
        max: (req) => {
            if (req.user?.role === 'admin') return 100;
            if (req.user?.role === 'moderator') return 50;
            return 10;
        },
        message: 'Quá nhiều sự kiện được tạo trong ngày',
        store: createRedisStore(),
        keyGenerator: (req) => `create_event:${req.user.userId}`,
        handler: rateLimitHandler
    }),

    registerEvent: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 giờ
        max: 20,
        message: 'Quá nhiều đăng ký sự kiện trong giờ qua',
        store: createRedisStore(),
        keyGenerator: (req) => `register_event:${req.user.userId}`,
        handler: rateLimitHandler
    }),

    sendMessage: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 phút
        max: 30,
        message: 'Quá nhiều tin nhắn được gửi',
        store: createRedisStore(),
        keyGenerator: (req) => `send_message:${req.user.userId}`,
        handler: rateLimitHandler
    }),

    submitFeedback: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 giờ
        max: 10,
        message: 'Quá nhiều phản hồi được gửi',
        store: createRedisStore(),
        keyGenerator: (req) => `submit_feedback:${req.user.userId}`,
        handler: rateLimitHandler
    }),

    changePassword: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 giờ
        max: 3,
        message: 'Quá nhiều lần đổi mật khẩu, vui lòng thử lại sau',
        store: createRedisStore(),
        keyGenerator: (req) => `change_password:${req.user.userId}`,
        handler: rateLimitHandler
    }),

    deleteAccount: rateLimit({
        windowMs: 24 * 60 * 60 * 1000, // 24 giờ
        max: 1,
        message: 'Chỉ được phép xóa tài khoản 1 lần trong ngày',
        store: createRedisStore(),
        keyGenerator: (req) => `delete_account:${req.user.userId}`,
        handler: rateLimitHandler
    })
};

// Bypass rate limit cho trusted IPs
const trustedIPBypass = (trustedIPs = []) => {
    const trustedSet = new Set(trustedIPs);

    return (req, res, next) => {
        const clientIP = req.ip;

        if (trustedSet.has(clientIP)) {
            req.skipRateLimit = true;
            logger.debug('Rate limit bypassed cho trusted IP:', { ip: clientIP });
        }

        next();
    };
};

// Rate limiting warmup cho user mới
const warmupRateLimit = () => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next();
            }

            const User = require('../models/User');
            const user = await User.findById(req.user.userId);

            if (!user) {
                return next();
            }

            const accountAge = Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24));

            let multiplier = 1.0;
            if (accountAge < 1) multiplier = 0.5;
            else if (accountAge < 7) multiplier = 0.7;
            else if (accountAge < 30) multiplier = 0.9;

            req.rateLimitMultiplier = multiplier;
            next();
        } catch (error) {
            logger.error('Lỗi warmup rate limiting:', error);
            next();
        }
    };
};

// Monitor rate limit violations
const monitorViolations = () => {
    return (req, res, next) => {
        const originalStatus = res.status;

        res.status = function(statusCode) {
            if (statusCode === 429) {
                incrementViolationCounter(req.ip, req.user?.userId);
            }
            return originalStatus.call(this, statusCode);
        };

        next();
    };
};

// Tăng violation counter
const incrementViolationCounter = async (ip, userId) => {
    try {
        const ipKey = `violations:ip:${ip}`;
        const userKey = userId ? `violations:user:${userId}` : null;

        const ipViolations = await redisClient.incr(ipKey);
        await redisClient.expire(ipKey, 24 * 60 * 60);

        if (userKey) {
            const userViolations = await redisClient.incr(userKey);
            await redisClient.expire(userKey, 24 * 60 * 60);

            if (userViolations >= 20) {
                logger.security('User có quá nhiều vi phạm rate limit:', {
                    userId,
                    violations: userViolations
                });
            }
        }

        if (ipViolations >= 50) {
            logger.security('IP có quá nhiều vi phạm rate limit:', {
                ip,
                violations: ipViolations
            });

            await redisClient.setex(`blocked:ip:${ip}`, 24 * 60 * 60, 'auto_blocked');
        }
    } catch (error) {
        logger.error('Lỗi increment violation counter:', error);
    }
};

// Rate limiting động theo endpoint
const dynamicRateLimit = (endpointConfigs) => {
    return (req, res, next) => {
        const endpoint = req.route?.path || req.path;
        const config = endpointConfigs[endpoint];

        if (!config) {
            return next();
        }

        const limiter = rateLimit({
            windowMs: config.windowMs || 15 * 60 * 1000,
            max: config.max || 100,
            message: config.message || 'Rate limit exceeded',
            store: createRedisStore(),
            keyGenerator: createKeyGenerator(`dynamic:${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`),
            handler: rateLimitHandler,
            ...config
        });

        return limiter(req, res, next);
    };
};

// Kiểm tra IP bị block
const checkBlockedIP = async (req, res, next) => {
    try {
        const ip = req.ip;
        const isBlocked = await redisClient.get(`blocked:ip:${ip}`);

        if (isBlocked) {
            logger.security('Truy cập từ IP bị block:', {
                ip,
                reason: isBlocked,
                path: req.originalUrl,
                userAgent: req.get('User-Agent')
            });

            return res.status(403).json({
                success: false,
                message: 'IP của bạn đã bị chặn do vi phạm policy'
            });
        }

        next();
    } catch (error) {
        logger.error('Lỗi kiểm tra blocked IP:', error);
        next();
    }
};

// Rate limiting cho API endpoints cụ thể
const endpointSpecificLimits = {
    '/api/auth/login': rateLimitConfigs.auth,
    '/api/auth/register': rateLimitConfigs.auth,
    '/api/auth/forgot-password': rateLimitConfigs.passwordReset,
    '/api/auth/reset-password': rateLimitConfigs.passwordReset,
    '/api/auth/resend-verification': rateLimitConfigs.emailVerification,
    '/api/auth/change-password': actionRateLimit.changePassword,
    '/api/auth/delete-account': actionRateLimit.deleteAccount,
    '/api/events': actionRateLimit.createEvent,
    '/api/events/*/register': actionRateLimit.registerEvent,
    '/api/search': rateLimitConfigs.search,
    '/api/notifications/send': rateLimitConfigs.notification,
    '/api/reports/*': rateLimitConfigs.reports,
    '/api/upload/*': rateLimitConfigs.upload,
    '/api/webhooks/*': rateLimitConfigs.webhook,
    '/api/users/feedback': actionRateLimit.submitFeedback,
    '/api/users/messages/send': actionRateLimit.sendMessage
};

// Tổng hợp middleware áp dụng rate limits
const applyRateLimits = (app) => {
    // Kiểm tra IP bị block trước
    app.use(checkBlockedIP);

    // Monitor violations
    app.use(monitorViolations());

    // Request size limiting
    app.use(requestSizeLimit());

    // Concurrent request limiting
    app.use(concurrentRequestLimit());

    // Trusted IP bypass
    const trustedIPs = process.env.TRUSTED_IPS?.split(',').filter(Boolean) || [];
    app.use(trustedIPBypass(trustedIPs));

    // Warmup rate limiting
    app.use(warmupRateLimit());

    // Dynamic endpoint-specific limits
    app.use(dynamicRateLimit(endpointSpecificLimits));

    // General rate limiting
    app.use('/api/', rateLimitConfigs.general);
};

// Utility functions
const getRateLimitStatus = async (identifier, prefix = 'general') => {
    try {
        const key = `${prefix}:${identifier}`;
        const current = await redisClient.get(key) || 0;
        const ttl = await redisClient.ttl(key);

        return {
            current: parseInt(current),
            resetTime: ttl > 0 ? new Date(Date.now() + (ttl * 1000)) : null,
            remaining: ttl
        };
    } catch (error) {
        logger.error('Lỗi lấy rate limit status:', error);
        return null;
    }
};

const resetRateLimit = async (identifier, prefix = 'general') => {
    try {
        const key = `${prefix}:${identifier}`;
        await redisClient.del(key);
        logger.info('Reset rate limit:', { key });
        return true;
    } catch (error) {
        logger.error('Lỗi reset rate limit:', error);
        return false;
    }
};

const blockIP = async (ip, duration = 24 * 60 * 60, reason = 'manual_block') => {
    try {
        await redisClient.setex(`blocked:ip:${ip}`, duration, reason);
        logger.security('IP đã bị block:', { ip, duration, reason });
        return true;
    } catch (error) {
        logger.error('Lỗi block IP:', error);
        return false;
    }
};

const unblockIP = async (ip) => {
    try {
        await redisClient.del(`blocked:ip:${ip}`);
        logger.info('IP đã được unblock:', { ip });
        return true;
    } catch (error) {
        logger.error('Lỗi unblock IP:', error);
        return false;
    }
};

// Middleware cleanup để dọn dẹp data cũ
const cleanupOldData = async () => {
    try {
        const pattern = 'rl:*';
        const keys = await redisClient.keys(pattern);

        let cleaned = 0;
        for (const key of keys) {
            const ttl = await redisClient.ttl(key);
            if (ttl === -1) { // Key không có expiry
                await redisClient.expire(key, 24 * 60 * 60); // Set 24h expiry
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info(`Đã cleanup ${cleaned} rate limit keys`);
        }
    } catch (error) {
        logger.error('Lỗi cleanup rate limit data:', error);
    }
};

// Chạy cleanup mỗi 6 giờ
setInterval(cleanupOldData, 6 * 60 * 60 * 1000);

module.exports = {
    rateLimitConfigs,
    userBasedRateLimit,
    adaptiveRateLimit,
    concurrentRequestLimit,
    requestSizeLimit,
    actionRateLimit,
    trustedIPBypass,
    warmupRateLimit,
    monitorViolations,
    checkBlockedIP,
    applyRateLimits,
    endpointSpecificLimits,
    rateLimitHandler,
    // Utility functions
    getRateLimitStatus,
    resetRateLimit,
    blockIP,
    unblockIP,
    incrementViolationCounter,
    cleanupOldData
};