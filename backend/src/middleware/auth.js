const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class AuthMiddleware {
    // Authenticate user with JWT token
    authenticate = async (req, res, next) => {
        try {
            // Get token from header
            const authHeader = req.header('Authorization');
            const token = authHeader && authHeader.startsWith('Bearer ')
                ? authHeader.substring(7)
                : null;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Access token required'
                });
            }

            // Check if token is blacklisted (optional)
            const isBlacklisted = await redisClient.get(`blacklist:${token}`);
            if (isBlacklisted) {
                return res.status(401).json({
                    success: false,
                    message: 'Token has been revoked'
                });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from database
            const user = await User.findById(decoded.userId).select('-password');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is active
            if (user.status !== 'active') {
                return res.status(401).json({
                    success: false,
                    message: 'Account is inactive'
                });
            }

            // Add user to request object
            req.user = {
                userId: user._id,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
                profile: user.profile
            };

            // Update last activity
            user.lastActivity = new Date();
            await user.save();

            next();
        } catch (error) {
            logger.error('Authentication error:', error);

            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired'
                });
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Authentication failed'
            });
        }
    };

    // Optional authentication - doesn't fail if no token
    optionalAuth = async (req, res, next) => {
        try {
            const authHeader = req.header('Authorization');
            const token = authHeader && authHeader.startsWith('Bearer ')
                ? authHeader.substring(7)
                : null;

            if (!token) {
                req.user = null;
                return next();
            }

            // Check if token is blacklisted
            const isBlacklisted = await redisClient.get(`blacklist:${token}`);
            if (isBlacklisted) {
                req.user = null;
                return next();
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from database
            const user = await User.findById(decoded.userId).select('-password');

            if (user && user.status === 'active') {
                req.user = {
                    userId: user._id,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions,
                    profile: user.profile
                };

                // Update last activity
                user.lastActivity = new Date();
                await user.save();
            } else {
                req.user = null;
            }

            next();
        } catch (error) {
            // On error, continue without authentication
            req.user = null;
            next();
        }
    };

    // Check if user has specific role
    requireRole = (roles) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const userRole = req.user.role;
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            next();
        };
    };

    // Check if user has specific permission
    requirePermission = (permission) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Admin has all permissions
            if (req.user.role === 'admin') {
                return next();
            }

            if (!req.user.permissions || !req.user.permissions.includes(permission)) {
                return res.status(403).json({
                    success: false,
                    message: `Permission '${permission}' required`
                });
            }

            next();
        };
    };

    // Check if user can access resource (owner or admin)
    requireOwnershipOrRole = (resourceModel, resourceParam = 'id', ownerField = 'createdBy', allowedRoles = ['admin']) => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        message: 'Authentication required'
                    });
                }

                // Check if user has allowed role
                if (allowedRoles.includes(req.user.role)) {
                    return next();
                }

                // Check ownership
                const resourceId = req.params[resourceParam];
                const Model = require(`../models/${resourceModel}`);
                const resource = await Model.findById(resourceId);

                if (!resource) {
                    return res.status(404).json({
                        success: false,
                        message: `${resourceModel} not found`
                    });
                }

                const ownerId = resource[ownerField];
                if (ownerId && ownerId.toString() === req.user.userId.toString()) {
                    return next();
                }

                res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });

            } catch (error) {
                logger.error('Ownership check error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Authorization check failed'
                });
            }
        };
    };

    // Verify email is confirmed
    requireEmailVerification = (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Get full user data to check email verification
        User.findById(req.user.userId)
            .then(user => {
                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                if (!user.emailVerified) {
                    return res.status(403).json({
                        success: false,
                        message: 'Email verification required'
                    });
                }

                next();
            })
            .catch(error => {
                logger.error('Email verification check error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Verification check failed'
                });
            });
    };

    // Check if user is student
    requireStudent = (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!['student', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Student access required'
            });
        }

        next();
    };

    // Check if user is organizer or higher
    requireOrganizer = (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const allowedRoles = ['organizer', 'moderator', 'admin'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Organizer access required'
            });
        }

        next();
    };

    // Check if user is moderator or higher
    requireModerator = (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const allowedRoles = ['moderator', 'admin'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Moderator access required'
            });
        }

        next();
    };

    // Check if user is admin
    requireAdmin = (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        next();
    };

    // Rate limiting per user
    userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return next();
                }

                const key = `rate_limit:${req.user.userId}`;
                const current = await redisClient.get(key) || 0;

                if (current >= maxRequests) {
                    return res.status(429).json({
                        success: false,
                        message: 'Rate limit exceeded'
                    });
                }

                // Increment counter
                await redisClient.increment(key, 1);

                // Set expiry on first request
                if (current === 0) {
                    await redisClient.expire(key, Math.ceil(windowMs / 1000));
                }

                next();
            } catch (error) {
                logger.error('User rate limit error:', error);
                next(); // Continue on error
            }
        };
    };

    // Check if user can manage specific event
    canManageEvent = async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Admin can manage all events
            if (req.user.role === 'admin') {
                return next();
            }

            const eventId = req.params.id || req.params.eventId;
            if (!eventId) {
                return res.status(400).json({
                    success: false,
                    message: 'Event ID required'
                });
            }

            const Event = require('../models/Event');
            const event = await Event.findById(eventId);

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            // Check if user is organizer or co-organizer
            const isOrganizer = event.organizer.toString() === req.user.userId.toString();
            const isCoOrganizer = event.coOrganizers.some(
                coOrg => coOrg.toString() === req.user.userId.toString()
            );

            if (!isOrganizer && !isCoOrganizer) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only manage events you organize'
                });
            }

            // Add event to request for later use
            req.event = event;
            next();

        } catch (error) {
            logger.error('Event management check error:', error);
            res.status(500).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };

    // Check if user can register for event
    canRegisterForEvent = async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const eventId = req.params.id || req.params.eventId;
            const Event = require('../models/Event');
            const Registration = require('../models/Registration');

            const event = await Event.findById(eventId);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            // Check if already registered
            const existingRegistration = await Registration.findOne({
                event: eventId,
                user: req.user.userId
            });

            if (existingRegistration) {
                return res.status(400).json({
                    success: false,
                    message: 'Already registered for this event'
                });
            }

            // Check if registration is open
            if (!event.isRegistrationOpen) {
                return res.status(400).json({
                    success: false,
                    message: 'Registration is not open for this event'
                });
            }

            req.event = event;
            next();

        } catch (error) {
            logger.error('Registration check error:', error);
            res.status(500).json({
                success: false,
                message: 'Registration check failed'
            });
        }
    };

    // Two-factor authentication check
    require2FA = async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const user = await User.findById(req.user.userId);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (user.twoFactorAuth.enabled && !req.session?.twoFactorVerified) {
                return res.status(403).json({
                    success: false,
                    message: 'Two-factor authentication required',
                    requiresTwoFactor: true
                });
            }

            next();
        } catch (error) {
            logger.error('2FA check error:', error);
            res.status(500).json({
                success: false,
                message: '2FA verification failed'
            });
        }
    };
}

module.exports = new AuthMiddleware();