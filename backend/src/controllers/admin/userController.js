const userService = require('../../services/admin/userService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class UserController {
    // Revoke user session
    async revokeUserSession(req, res) {
        try {
            const {userId, sessionId} = req.params;

            const result = await userService.revokeUserSession(userId, sessionId, req.user.userId);

            res.json({
                success: true,
                message: 'Session revoked successfully',
                data: result
            });

        } catch (error) {
            logger.error('Revoke user session controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to revoke session'
            });
        }
    }

    // Impersonate user
    async impersonateUser(req, res) {
        try {
            const {userId} = req.params;
            const {reason} = req.body;

            // Check if admin has impersonation permission
            if (!req.user.permissions.includes('impersonate_users') && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions to impersonate users'
                });
            }

            const result = await userService.impersonateUser(userId, req.user.userId, reason);

            res.json({
                success: true,
                message: 'User impersonation started',
                data: result
            });

        } catch (error) {
            logger.error('Impersonate user controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to impersonate user'
            });
        }
    }

    // End impersonation
    async endImpersonation(req, res) {
        try {
            const result = await userService.endImpersonation(req.user.userId);

            res.json({
                success: true,
                message: 'Impersonation ended successfully',
                data: result
            });

        } catch (error) {
            logger.error('End impersonation controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to end impersonation'
            });
        }
    }

    // Force user email verification
    async forceEmailVerification(req, res) {
        try {
            const {userId} = req.params;

            const result = await userService.forceEmailVerification(userId, req.user.userId);

            res.json({
                success: true,
                message: 'Email verification forced successfully',
                data: result
            });

        } catch (error) {
            logger.error('Force email verification controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to force email verification'
            });
        }
    }

    // Get user permissions
    async getUserPermissions(req, res) {
        try {
            const {userId} = req.params;
            const permissions = await userService.getUserPermissions(userId);

            res.json({
                success: true,
                data: permissions
            });

        } catch (error) {
            logger.error('Get user permissions controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user permissions'
            });
        }
    }

    // Update user permissions
    async updateUserPermissions(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const {userId} = req.params;
            const {permissions} = req.body;

            const result = await userService.updateUserPermissions(
                userId,
                permissions,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'User permissions updated successfully',
                data: result
            });

        } catch (error) {
            logger.error('Update user permissions controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update user permissions'
            });
        }
    }

    // Get user events
    async getUserEvents(req, res) {
        try {
            const {userId} = req.params;
            const filters = {
                status: req.query.status,
                role: req.query.role, // organized, attended, registered
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const events = await userService.getUserEvents(userId, filters);

            res.json({
                success: true,
                data: events
            });

        } catch (error) {
            logger.error('Get user events controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user events'
            });
        }
    }

    // Get user certificates
    async getUserCertificates(req, res) {
        try {
            const {userId} = req.params;
            const filters = {
                type: req.query.type,
                status: req.query.status || 'issued'
            };

            const certificates = await userService.getUserCertificates(userId, filters);

            res.json({
                success: true,
                data: certificates
            });

        } catch (error) {
            logger.error('Get user certificates controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user certificates'
            });
        }
    }

    // Merge user accounts
    async mergeUserAccounts(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const {primaryUserId, secondaryUserId} = req.body;

            const result = await userService.mergeUserAccounts(
                primaryUserId,
                secondaryUserId,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'User accounts merged successfully',
                data: result
            });

        } catch (error) {
            logger.error('Merge user accounts controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to merge user accounts'
            });
        }
    }

    // Get duplicate users
    async getDuplicateUsers(req, res) {
        try {
            const criteria = req.query.criteria || 'email'; // email, phone, studentId
            const threshold = parseFloat(req.query.threshold) || 0.8;

            const duplicates = await userService.findDuplicateUsers(criteria, threshold);

            res.json({
                success: true,
                data: duplicates
            });

        } catch (error) {
            logger.error('Get duplicate users controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to find duplicate users'
            });
        }
    }

    // Generate user report
    async generateUserReport(req, res) {
        try {
            const filters = {
                role: req.query.role,
                status: req.query.status,
                faculty: req.query.faculty,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const reportType = req.query.type || 'summary';
            const format = req.query.format || 'pdf';

            const report = await userService.generateUserReport(filters, reportType, format);

            res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=user_report_${Date.now()}.${format}`);
            res.send(report);

        } catch (error) {
            logger.error('Generate user report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate user report'
            });
        }
    }

    // Cleanup inactive users
    async cleanupInactiveUsers(req, res) {
        try {
            const {days = 365, dryRun = true} = req.query;

            const result = await userService.cleanupInactiveUsers(
                parseInt(days),
                dryRun === 'true',
                req.user.userId
            );

            res.json({
                success: true,
                message: dryRun === 'true'
                    ? `Found ${result.count} inactive users that would be cleaned up`
                    : `Cleaned up ${result.count} inactive users`,
                data: result
            });

        } catch (error) {
            logger.error('Cleanup inactive users controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cleanup inactive users'
            });
        }
    }

    // Get user engagement metrics
    async getUserEngagementMetrics(req, res) {
        try {
            const {userId} = req.params;
            const timeframe = req.query.timeframe || '30d';

            const metrics = await userService.getUserEngagementMetrics(userId, timeframe);

            res.json({
                success: true,
                data: metrics
            });

        } catch (error) {
            logger.error('Get user engagement metrics controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user engagement metrics'
            });
        }
    }

    // Update user preferences (admin override)
    async updateUserPreferences(req, res) {
        try {
            const {userId} = req.params;
            const preferences = req.body.preferences;

            const result = await userService.updateUserPreferences(
                userId,
                preferences,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'User preferences updated successfully',
                data: result
            });

        } catch (error) {
            logger.error('Update user preferences controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update user preferences'
            });
        }
    }

    // Get user audit trail
    async getUserAuditTrail(req, res) {
        try {
            const {userId} = req.params;
            const filters = {
                action: req.query.action,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            };

            const result = await userService.getUserAuditTrail(userId, filters, pagination);

            res.json({
                success: true,
                data: result.auditTrail,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get user audit trail controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user audit trail'
            });
        }
    }


    module
    exports = new UserController();
    Get
    all
    users
    with
    filters

    async getUsers(req, res) {
        try {
            const filters = {
                role: req.query.role,
                status: req.query.status,
                faculty: req.query.faculty,
                department: req.query.department,
                year: req.query.year,
                search: req.query.search,
                emailVerified: req.query.emailVerified,
                lastLoginStart: req.query.lastLoginStart,
                lastLoginEnd: req.query.lastLoginEnd
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const result = await userService.getUsers(filters, pagination);

            res.json({
                success: true,
                data: result.users,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get users controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get users'
            });
        }
    }

// Get user by ID
    async getUserById(req, res) {
        try {
            const {userId} = req.params;
            const includeStats = req.query.includeStats === 'true';

            const user = await userService.getUserById(userId, includeStats);

            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            logger.error('Get user by ID controller error:', error);
            const statusCode = error.name === 'NotFoundError' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to get user'
            });
        }
    }

// Create user
    async createUser(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const userData = {
                ...req.body,
                createdBy: req.user.userId
            };

            const user = await userService.createUser(userData);

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: user
            });

        } catch (error) {
            logger.error('Create user controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to create user'
            });
        }
    }

// Update user
    async updateUser(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const {userId} = req.params;
            const updateData = {
                ...req.body,
                updatedBy: req.user.userId
            };

            const user = await userService.updateUser(userId, updateData);

            res.json({
                success: true,
                message: 'User updated successfully',
                data: user
            });

        } catch (error) {
            logger.error('Update user controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update user'
            });
        }
    }

// Delete/Deactivate user
    async deleteUser(req, res) {
        try {
            const {userId} = req.params;
            const {permanent = false, reason} = req.body;

            const result = await userService.deleteUser(userId, permanent, reason, req.user.userId);

            res.json({
                success: true,
                message: permanent ? 'User deleted permanently' : 'User deactivated successfully',
                data: result
            });

        } catch (error) {
            logger.error('Delete user controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to delete user'
            });
        }
    }

// Activate/Reactivate user
    async activateUser(req, res) {
        try {
            const {userId} = req.params;
            const user = await userService.activateUser(userId, req.user.userId);

            res.json({
                success: true,
                message: 'User activated successfully',
                data: user
            });

        } catch (error) {
            logger.error('Activate user controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to activate user'
            });
        }
    }

// Suspend user
    async suspendUser(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const {userId} = req.params;
            const {reason, duration} = req.body;

            const user = await userService.suspendUser(userId, reason, duration, req.user.userId);

            res.json({
                success: true,
                message: 'User suspended successfully',
                data: user
            });

        } catch (error) {
            logger.error('Suspend user controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to suspend user'
            });
        }
    }

// Update user role
    async updateUserRole(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const {userId} = req.params;
            const {role, permissions} = req.body;

            const user = await userService.updateUserRole(userId, role, permissions, req.user.userId);

            res.json({
                success: true,
                message: 'User role updated successfully',
                data: user
            });

        } catch (error) {
            logger.error('Update user role controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update user role'
            });
        }
    }

// Reset user password
    async resetUserPassword(req, res) {
        try {
            const {userId} = req.params;
            const {temporary = true, notifyUser = true} = req.body;

            const result = await userService.resetUserPassword(
                userId,
                temporary,
                notifyUser,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Password reset successfully',
                data: {
                    temporaryPassword: result.temporaryPassword,
                    resetSent: result.emailSent
                }
            });

        } catch (error) {
            logger.error('Reset user password controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to reset password'
            });
        }
    }

// Get user activity
    async getUserActivity(req, res) {
        try {
            const {userId} = req.params;
            const options = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                activityType: req.query.activityType,
                limit: parseInt(req.query.limit) || 50
            };

            const activity = await userService.getUserActivity(userId, options);

            res.json({
                success: true,
                data: activity
            });

        } catch (error) {
            logger.error('Get user activity controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user activity'
            });
        }
    }

// Get user statistics
    async getUserStats(req, res) {
        try {
            const filters = {
                role: req.query.role,
                faculty: req.query.faculty,
                status: req.query.status,
                timeframe: req.query.timeframe || '30d'
            };

            const stats = await userService.getUserStatistics(filters);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get user stats controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user statistics'
            });
        }
    }

// Bulk update users
    async bulkUpdateUsers(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const {userIds, action, data} = req.body;

            const result = await userService.bulkUpdateUsers(
                userIds,
                action,
                data,
                req.user.userId
            );

            res.json({
                success: true,
                message: `Bulk ${action} completed: ${result.successful} successful, ${result.failed} failed`,
                data: result
            });

        } catch (error) {
            logger.error('Bulk update users controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Bulk update failed'
            });
        }
    }

// Export users
    async exportUsers(req, res) {
        try {
            const {format = 'xlsx'} = req.query;
            const filters = {
                role: req.query.role,
                status: req.query.status,
                faculty: req.query.faculty,
                department: req.query.department
            };

            const users = await userService.getUsers(filters, {limit: 10000});

            const exportService = require('../../services/analytics/exportService');
            const fileBuffer = await exportService.exportUsers(users.users, format);

            const filename = `users_export_${Date.now()}.${format}`;

            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-Type', exportService.getContentType(format));

            res.send(fileBuffer);

        } catch (error) {
            logger.error('Export users controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Export failed'
            });
        }
    }

// Import users
    async importUsers(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const options = {
                updateExisting: req.body.updateExisting === 'true',
                sendWelcomeEmail: req.body.sendWelcomeEmail !== 'false'
            };

            const importService = require('../../services/analytics/importService');
            const result = await importService.importUsers(
                req.file.buffer,
                options,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Users imported successfully',
                data: {
                    imported: result.imported,
                    updated: result.updated,
                    failed: result.failed,
                    errors: result.errors
                }
            });

        } catch (error) {
            logger.error('Import users controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Import failed'
            });
        }
    }

// Send notification to users
    async sendNotificationToUsers(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const {
                userIds,
                title,
                message,
                type = 'system_announcement',
                channels = ['inApp', 'email']
            } = req.body;

            const result = await userService.sendNotificationToUsers(
                userIds,
                {title, message, type, channels},
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Notifications sent successfully',
                data: result
            });

        } catch (error) {
            logger.error('Send notification to users controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send notifications'
            });
        }
    }

// Get user login sessions
    async getUserSessions(req, res) {
        try {
            const {userId} = req.params;
            const sessions = await userService.getUserSessions(userId);

            res.json({
                success: true,
                data: sessions
            });

        } catch (error) {
            logger.error('Get user sessions controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user sessions'
            });
        }
    }
}
//