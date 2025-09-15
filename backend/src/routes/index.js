const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const logger = require('../utils/logger');

const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const eventRoutes = require('./events');
const userRoutes = require('./users');
const adminRoutes = require('./admin');
const notificationRoutes = require('./notifications');
const reportRoutes = require('./reports');
const searchRoutes = require('./search');

// API Version and Info
router.get('/', (req, res) => {
    res.json({
        message: 'Student Event Management System API',
        version: process.env.API_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            events: '/api/events',
            users: '/api/users',
            admin: '/api/admin',
            notifications: '/api/notifications',
            reports: '/api/reports',
            search: '/api/search'
        },
        status: 'active'
    });
});

// Health Check
router.get('/health', async (req, res) => {
    try {
        const database = require('../config/database');
        const redis = require('../config/redis');

        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            services: {
                database: database.isConnected() ? 'connected' : 'disconnected',
                redis: redis.getClient() ? 'connected' : 'disconnected',
                api: 'active'
            },
            version: process.env.API_VERSION || '1.0.0'
        };

        // Check if any critical service is down
        const criticalServices = Object.values(healthStatus.services);
        if (criticalServices.includes('disconnected')) {
            healthStatus.status = 'degraded';
            res.status(503);
        }

        res.json(healthStatus);
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Detailed Health Check
router.get('/health/detailed', async (req, res) => {
    try {
        const database = require('../config/database');
        const redis = require('../config/redis');
        const elasticsearch = require('../config/elasticsearch');
        const email = require('../config/email');
        const storage = require('../config/storage');

        const checks = await Promise.allSettled([
            database.isConnected() ? Promise.resolve('connected') : Promise.reject('disconnected'),
            redis.getClient() ? Promise.resolve('connected') : Promise.reject('disconnected'),
            elasticsearch.isHealthy() ? elasticsearch.healthCheck() : Promise.reject('disconnected'),
            email.isConfigured() ? email.testConnection() : Promise.reject('not configured'),
            storage.healthCheck()
        ]);

        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                ...process.memoryUsage(),
                formatted: {
                    rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
                    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
                    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
                }
            },
            services: {
                database: {
                    status: checks[0].status === 'fulfilled' ? 'connected' : 'disconnected',
                    details: checks[0].value || checks[0].reason
                },
                redis: {
                    status: checks[1].status === 'fulfilled' ? 'connected' : 'disconnected',
                    details: checks[1].value || checks[1].reason
                },
                elasticsearch: {
                    status: checks[2].status === 'fulfilled' ? 'connected' : 'disconnected',
                    details: checks[2].value || checks[2].reason
                },
                email: {
                    status: checks[3].status === 'fulfilled' ? 'configured' : 'not configured',
                    details: checks[3].value || checks[3].reason
                },
                storage: {
                    status: checks[4].status === 'fulfilled' ? 'connected' : 'disconnected',
                    details: checks[4].value || checks[4].reason
                }
            },
            version: process.env.API_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        };

        // Determine overall status
        const serviceStatuses = Object.values(healthStatus.services).map(service => service.status);
        if (serviceStatuses.includes('disconnected')) {
            healthStatus.status = 'degraded';
            res.status(503);
        }

        res.json(healthStatus);
    } catch (error) {
        logger.error('Detailed health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API Statistics
router.get('/stats', async (req, res) => {
    try {
        // This would typically come from analytics/monitoring service
        const stats = {
            totalRequests: 0, // Would be tracked in middleware
            activeConnections: 0,
            averageResponseTime: 0,
            errorRate: 0,
            uptime: process.uptime(),
            lastRestart: new Date(Date.now() - process.uptime() * 1000),
            version: process.env.API_VERSION || '1.0.0'
        };

        res.json(stats);
    } catch (error) {
        logger.error('Error getting API stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting API statistics',
            error: error.message
        });
    }
});

// System Info (Admin only)
router.get('/system', require('../middleware/auth').requireAdmin, (req, res) => {
    res.json({
        node: {
            version: process.version,
            platform: process.platform,
            arch: process.arch,
            uptime: process.uptime()
        },
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        environment: {
            nodeEnv: process.env.NODE_ENV,
            port: process.env.PORT,
            apiVersion: process.env.API_VERSION
        }
    });
});

// API Documentation endpoint
router.get('/docs', (req, res) => {
    const apiDocs = {
        title: 'Student Event Management System API',
        version: process.env.API_VERSION || '1.0.0',
        description: 'RESTful API for managing student events, registrations, and user accounts',
        baseUrl: `${req.protocol}://${req.get('Host')}/api`,
        endpoints: [
            {
                path: '/auth',
                methods: ['POST', 'GET', 'PUT', 'DELETE'],
                description: 'Authentication and user management'
            },
            {
                path: '/events',
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                description: 'Event management and registration'
            },
            {
                path: '/users',
                methods: ['GET', 'PUT', 'DELETE'],
                description: 'User profile and management'
            },
            {
                path: '/admin',
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                description: 'Administrative functions'
            },
            {
                path: '/notifications',
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                description: 'Notification management'
            },
            {
                path: '/reports',
                methods: ['GET'],
                description: 'Analytics and reporting'
            },
            {
                path: '/search',
                methods: ['GET'],
                description: 'Search functionality'
            }
        ],
        authentication: {
            type: 'Bearer Token (JWT)',
            header: 'Authorization: Bearer <token>'
        },
        rateLimit: {
            general: '100 requests per 15 minutes',
            auth: '5 requests per 15 minutes for sensitive operations'
        }
    };

    res.json(apiDocs);
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/search', searchRoutes);

// 404 handler for unknown API routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            '/api/auth',
            '/api/events',
            '/api/users',
            '/api/admin',
            '/api/notifications',
            '/api/reports',
            '/api/search'
        ]
    });
});

// Global error handler
router.use((error, req, res, next) => {
    logger.error('API Error:', {
        error: error.message,
        stack: error.stack,
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user?.userId || 'anonymous'
    });

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        ...(isDevelopment && {
            stack: error.stack,
            details: error.details
        }),
        timestamp: new Date().toISOString(),
        requestId: req.id || req.get('X-Request-ID')
    });
});

module.exports = router;