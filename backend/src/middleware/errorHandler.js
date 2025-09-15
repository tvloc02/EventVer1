const logger = require('../utils/logger');

class AppError extends Error {
    constructor(message, statusCode, isOperational = true, stack = '') {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = isOperational;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

// Custom error classes
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
        this.name = 'ValidationError';
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401);
        this.name = 'UnauthorizedError';
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403);
        this.name = 'ForbiddenError';
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409);
        this.name = 'ConflictError';
    }
}

class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429);
        this.name = 'TooManyRequestsError';
    }
}

class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500);
        this.name = 'InternalServerError';
    }
}

// Handle different types of errors
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new ValidationError(message);
};

const handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new ValidationError(message);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new ValidationError(message);
};

const handleJWTError = () =>
    new UnauthorizedError('Invalid token. Please log in again!');

const handleJWTExpiredError = () =>
    new UnauthorizedError('Your token has expired! Please log in again.');

const handleMongoServerError = (err) => {
    if (err.code === 11000) {
        return handleDuplicateFieldsDB(err);
    }
    return new InternalServerError('Database server error');
};

const handleRedisError = (err) => {
    logger.error('Redis error:', err);
    return new InternalServerError('Cache server error');
};

const handleFileUploadError = (err) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return new ValidationError('File size too large');
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        return new ValidationError('Too many files uploaded');
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return new ValidationError('Invalid file field');
    }
    return new ValidationError('File upload error');
};

const handleNetworkError = (err) => {
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        return new InternalServerError('Network connection error');
    }
    return new InternalServerError('Network error');
};

const sendErrorDev = (err, req, res) => {
    // API Error
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            success: false,
            error: err,
            message: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            method: req.method
        });
    }

    // Rendered Website Error
    console.error('ERROR 💥', err);
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message
    });
};

const sendErrorProd = (err, req, res) => {
    // API Error
    if (req.originalUrl.startsWith('/api')) {
        // Operational, trusted error: send message to client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                timestamp: new Date().toISOString(),
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            });
        }

        // Programming or other unknown error: don't leak error details
        console.error('ERROR 💥', err);
        logger.error('Unhandled error:', err);

        return res.status(500).json({
            success: false,
            message: 'Something went wrong!',
            timestamp: new Date().toISOString()
        });
    }

    // Rendered Website Error
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            msg: err.message
        });
    }

    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    logger.error('Unhandled error:', err);

    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later.'
    });
};

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error
    logger.error('Error caught by global handler:', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user?.userId || 'anonymous'
    });

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Handle specific error types
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
        if (error.name === 'MongoServerError') error = handleMongoServerError(error);
        if (error.name === 'RedisError') error = handleRedisError(error);
        if (error.name === 'MulterError') error = handleFileUploadError(error);
        if (error.code && error.code.startsWith('E')) error = handleNetworkError(error);

        sendErrorProd(error, req, res);
    }
};

// Catch async errors
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

// Handle 404 errors
const handle404 = (req, res, next) => {
    const err = new NotFoundError(`Can't find ${req.originalUrl} on this server!`);
    next(err);
};

// Handle uncaught exceptions
const handleUncaughtException = () => {
    process.on('uncaughtException', (err) => {
        logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
        logger.error('Error:', {
            name: err.name,
            message: err.message,
            stack: err.stack
        });
        process.exit(1);
    });
};

// Handle unhandled promise rejections
const handleUnhandledRejection = (server) => {
    process.on('unhandledRejection', (err) => {
        logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
        logger.error('Error:', {
            name: err.name,
            message: err.message,
            stack: err.stack
        });

        if (server) {
            server.close(() => {
                process.exit(1);
            });
        } else {
            process.exit(1);
        }
    });
};

// Graceful shutdown
const gracefulShutdown = (server) => {
    const shutdown = (signal) => {
        logger.info(`${signal} received. Shutting down gracefully...`);

        if (server) {
            server.close(() => {
                logger.info('Process terminated');
                process.exit(0);
            });

            // Force close after timeout
            setTimeout(() => {
                logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        } else {
            process.exit(0);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

// Error reporting to external services
const reportError = async (error, context = {}) => {
    try {
        // Here you can integrate with error reporting services like:
        // - Sentry
        // - Bugsnag
        // - Rollbar
        // - Custom logging service

        const errorReport = {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            context,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            version: process.env.npm_package_version
        };

        // Example: Send to external service
        // await externalErrorService.report(errorReport);

        logger.error('Error reported:', errorReport);
    } catch (reportingError) {
        logger.error('Failed to report error:', reportingError);
    }
};

// Validation error formatter
const formatValidationError = (errors) => {
    return errors.map(error => ({
        field: error.path || error.param,
        message: error.msg || error.message,
        value: error.value,
        location: error.location
    }));
};

// Rate limiting error
const rateLimitHandler = (req, res) => {
    const error = new TooManyRequestsError('Too many requests from this IP, please try again later');

    logger.warn('Rate limit exceeded:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method
    });

    res.status(error.statusCode).json({
        success: false,
        message: error.message,
        retryAfter: req.rateLimit?.resetTime || 900000 // 15 minutes
    });
};

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    TooManyRequestsError,
    InternalServerError,
    globalErrorHandler,
    catchAsync,
    handle404,
    handleUncaughtException,
    handleUnhandledRejection,
    gracefulShutdown,
    reportError,
    formatValidationError,
    rateLimitHandler
};