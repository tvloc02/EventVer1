const cors = require('cors');
const logger = require('../utils/logger');

// Danh sách domain được phép
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    process.env.MOBILE_APP_URL
].filter(Boolean);

// Cấu hình CORS động
const corsOptions = {
    origin: (origin, callback) => {
        // Cho phép requests không có origin (mobile apps, postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // Kiểm tra origin có trong danh sách cho phép không
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Cho phép subdomain trong production
        if (process.env.NODE_ENV === 'production') {
            const allowedDomains = [
                process.env.MAIN_DOMAIN,
                process.env.API_DOMAIN
            ].filter(Boolean);

            const isSubdomain = allowedDomains.some(domain =>
                origin.endsWith(`.${domain}`) || origin === `https://${domain}`
            );

            if (isSubdomain) {
                return callback(null, true);
            }
        }

        // Cho phép mọi origin trong development
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }

        // Log và từ chối origin không được phép
        logger.security('CORS: Origin không được phép', {
            origin,
            userAgent: req?.get('User-Agent'),
            ip: req?.ip
        });

        callback(new Error('Truy cập từ domain này không được phép bởi CORS policy'));
    },

    credentials: true, // Cho phép gửi cookies và credentials

    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Request-ID',
        'X-Timezone',
        'X-Language',
        'X-Client-Version',
        'X-Device-ID'
    ],

    exposedHeaders: [
        'X-Total-Count',
        'X-Page-Count',
        'X-Current-Page',
        'X-Per-Page',
        'X-Rate-Limit-Limit',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset',
        'X-Request-ID',
        'X-Response-Time'
    ],

    optionsSuccessStatus: 200, // Trả về 200 cho OPTIONS requests

    preflightContinue: false, // Xử lý preflight requests tại đây

    maxAge: 86400 // Cache preflight response trong 24 giờ
};

// Middleware CORS tùy chỉnh cho các endpoint cụ thể
const createCorsMiddleware = (options = {}) => {
    const customOptions = {
        ...corsOptions,
        ...options
    };

    return cors(customOptions);
};

// CORS cho API endpoints
const apiCors = createCorsMiddleware({
    origin: corsOptions.origin,
    credentials: true
});

// CORS cho file uploads
const uploadCors = createCorsMiddleware({
    origin: corsOptions.origin,
    credentials: true,
    methods: ['POST', 'PUT', 'OPTIONS']
});

// CORS cho webhooks (chỉ POST)
const webhookCors = createCorsMiddleware({
    origin: false, // Không giới hạn origin cho webhooks
    credentials: false,
    methods: ['POST', 'OPTIONS']
});

// CORS cho public content
const publicCors = createCorsMiddleware({
    origin: '*', // Cho phép mọi origin
    credentials: false,
    methods: ['GET', 'OPTIONS']
});

// CORS cho admin panel
const adminCors = createCorsMiddleware({
    origin: (origin, callback) => {
        const adminOrigins = [
            process.env.ADMIN_URL,
            'http://localhost:3001'
        ].filter(Boolean);

        if (!origin || adminOrigins.includes(origin)) {
            return callback(null, true);
        }

        callback(new Error('Admin panel chỉ có thể truy cập từ domain được ủy quyền'));
    },
    credentials: true
});

// Middleware logging CORS requests
const logCorsRequests = (req, res, next) => {
    const origin = req.get('Origin');

    if (origin) {
        logger.debug('CORS request:', {
            origin,
            method: req.method,
            path: req.originalUrl,
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer')
        });
    }

    next();
};

// Security headers bổ sung
const securityHeaders = (req, res, next) => {
    // Content Security Policy
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' " + allowedOrigins.join(' ') + "; " +
        "frame-ancestors 'none'"
    );

    // Các header bảo mật khác
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy',
        'camera=(), microphone=(), geolocation=(self), notification=(self)'
    );

    next();
};

// Middleware kiểm tra User-Agent
const validateUserAgent = (req, res, next) => {
    const userAgent = req.get('User-Agent');

    if (!userAgent) {
        logger.security('Request không có User-Agent', {
            ip: req.ip,
            path: req.originalUrl
        });
    }

    // Chặn một số bot có hại
    const blockedAgents = [
        'sqlmap',
        'nikto',
        'nessus',
        'burpsuite',
        'nmap'
    ];

    if (userAgent && blockedAgents.some(agent =>
        userAgent.toLowerCase().includes(agent))) {
        logger.security('User-Agent bị chặn', {
            userAgent,
            ip: req.ip,
            path: req.originalUrl
        });

        return res.status(403).json({
            success: false,
            message: 'Yêu cầu truy cập bị từ chối'
        });
    }

    next();
};

// Middleware kiểm tra Referer
const validateReferer = (allowedReferers = []) => {
    return (req, res, next) => {
        if (req.method === 'GET' || allowedReferers.length === 0) {
            return next();
        }

        const referer = req.get('Referer');

        if (!referer) {
            return next(); // Cho phép requests không có referer
        }

        const isValidReferer = allowedReferers.some(allowed =>
            referer.startsWith(allowed)
        );

        if (!isValidReferer) {
            logger.security('Referer không hợp lệ', {
                referer,
                ip: req.ip,
                path: req.originalUrl
            });

            return res.status(403).json({
                success: false,
                message: 'Yêu cầu không hợp lệ'
            });
        }

        next();
    };
};

// Middleware chống CSRF
const csrfProtection = (req, res, next) => {
    // Bỏ qua cho GET requests và OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Bỏ qua cho API endpoints với JWT
    if (req.originalUrl.startsWith('/api/') && req.get('Authorization')) {
        return next();
    }

    const token = req.get('X-CSRF-Token') || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
        logger.security('CSRF token không hợp lệ', {
            hasToken: !!token,
            hasSessionToken: !!sessionToken,
            ip: req.ip,
            path: req.originalUrl
        });

        return res.status(403).json({
            success: false,
            message: 'Token bảo mật không hợp lệ'
        });
    }

    next();
};

// Tạo CORS middleware dựa trên environment
const createEnvironmentCors = () => {
    if (process.env.NODE_ENV === 'production') {
        return createCorsMiddleware({
            origin: corsOptions.origin,
            credentials: true,
            optionsSuccessStatus: 200
        });
    } else if (process.env.NODE_ENV === 'staging') {
        return createCorsMiddleware({
            origin: [
                ...allowedOrigins,
                /\.staging\./,
                /\.dev\./
            ],
            credentials: true
        });
    } else {
        // Development - cho phép mọi origin
        return createCorsMiddleware({
            origin: true,
            credentials: true
        });
    }
};

module.exports = {
    corsOptions,
    apiCors,
    uploadCors,
    webhookCors,
    publicCors,
    adminCors,
    createCorsMiddleware,
    createEnvironmentCors,
    logCorsRequests,
    securityHeaders,
    validateUserAgent,
    validateReferer,
    csrfProtection,
    allowedOrigins
};