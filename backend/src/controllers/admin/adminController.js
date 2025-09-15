const adminService = require('../../services/admin/adminService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class AdminController {
    // Get dashboard statistics
    async getDashboardStats(req, res) {
        try {
            const timeframe = req.query.timeframe || '30d';
            const stats = await adminService.getDashboardStatistics(timeframe);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get dashboard stats controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get dashboard statistics'
            });
        }
    }

    // Get system health
    async getSystemHealth(req, res) {
        try {
            const health = await adminService.getSystemHealth();

            res.json({
                success: true,
                data: health
            });

        } catch (error) {
            logger.error('Get system health controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get system health'
            });
        }
    }

    // Get system settings
    async getSystemSettings(req, res) {
        try {
            const settings = await adminService.getSystemSettings();

            res.json({
                success: true,
                data: settings
            });

        } catch (error) {
            logger.error('Get system settings controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get system settings'
            });
        }
    }

    // Update system settings
    async updateSystemSettings(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const settings = await adminService.updateSystemSettings(req.body, req.user.userId);

            res.json({
                success: true,
                message: 'System settings updated successfully',
                data: settings
            });

        } catch (error) {
            logger.error('Update system settings controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update system settings'
            });
        }
    }

    // Get audit logs
    async getAuditLogs(req, res) {
        try {
            const filters = {
                action: req.query.action,
                user: req.query.user,
                resource: req.query.resource,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50,
                sortBy: req.query.sortBy || 'timestamp',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const result = await adminService.getAuditLogs(filters, pagination);

            res.json({
                success: true,
                data: result.logs,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get audit logs controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get audit logs'
            });
        }
    }

    // Create system backup
    async createBackup(req, res) {
        try {
            const backupType = req.body.type || 'full';
            const options = {
                includeFiles: req.body.includeFiles !== false,
                compress: req.body.compress !== false
            };

            const backup = await adminService.createSystemBackup(backupType, options, req.user.userId);

            res.json({
                success: true,
                message: 'Backup created successfully',
                data: backup
            });

        } catch (error) {
            logger.error('Create backup controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create backup'
            });
        }
    }

    // Get system backups
    async getBackups(req, res) {
        try {
            const backups = await adminService.getSystemBackups();

            res.json({
                success: true,
                data: backups
            });

        } catch (error) {
            logger.error('Get backups controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get backups'
            });
        }
    }

    // Restore from backup
    async restoreBackup(req, res) {
        try {
            const { backupId } = req.params;
            const options = {
                restoreFiles: req.body.restoreFiles !== false,
                restoreDatabase: req.body.restoreDatabase !== false
            };

            const result = await adminService.restoreFromBackup(backupId, options, req.user.userId);

            res.json({
                success: true,
                message: 'Restore completed successfully',
                data: result
            });

        } catch (error) {
            logger.error('Restore backup controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to restore backup'
            });
        }
    }

    // Get system performance metrics
    async getPerformanceMetrics(req, res) {
        try {
            const timeframe = req.query.timeframe || '1h';
            const metrics = await adminService.getPerformanceMetrics(timeframe);

            res.json({
                success: true,
                data: metrics
            });

        } catch (error) {
            logger.error('Get performance metrics controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get performance metrics'
            });
        }
    }

    // Clear system cache
    async clearCache(req, res) {
        try {
            const cacheType = req.body.type || 'all';
            const result = await adminService.clearSystemCache(cacheType, req.user.userId);

            res.json({
                success: true,
                message: 'Cache cleared successfully',
                data: result
            });

        } catch (error) {
            logger.error('Clear cache controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to clear cache'
            });
        }
    }

    // Send system notification
    async sendSystemNotification(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const notificationData = {
                title: req.body.title,
                message: req.body.message,
                type: req.body.type || 'system_announcement',
                priority: req.body.priority || 'normal',
                recipients: req.body.recipients || 'all',
                channels: req.body.channels || ['inApp', 'email']
            };

            const result = await adminService.sendSystemNotification(notificationData, req.user.userId);

            res.json({
                success: true,
                message: 'System notification sent successfully',
                data: result
            });

        } catch (error) {
            logger.error('Send system notification controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send system notification'
            });
        }
    }

    // Get error logs
    async getErrorLogs(req, res) {
        try {
            const filters = {
                level: req.query.level || 'error',
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                service: req.query.service
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            };

            const result = await adminService.getErrorLogs(filters, pagination);

            res.json({
                success: true,
                data: result.logs,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get error logs controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get error logs'
            });
        }
    }

    // Update maintenance mode
    async updateMaintenanceMode(req, res) {
        try {
            const { enabled, message, scheduledEnd } = req.body;

            const result = await adminService.setMaintenanceMode(
                enabled,
                message,
                scheduledEnd,
                req.user.userId
            );

            res.json({
                success: true,
                message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
                data: result
            });

        } catch (error) {
            logger.error('Update maintenance mode controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update maintenance mode'
            });
        }
    }

    // Get feature flags
    async getFeatureFlags(req, res) {
        try {
            const flags = await adminService.getFeatureFlags();

            res.json({
                success: true,
                data: flags
            });

        } catch (error) {
            logger.error('Get feature flags controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get feature flags'
            });
        }
    }

    // Update feature flag
    async updateFeatureFlag(req, res) {
        try {
            const { flagName } = req.params;
            const { enabled, config } = req.body;

            const flag = await adminService.updateFeatureFlag(
                flagName,
                enabled,
                config,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Feature flag updated successfully',
                data: flag
            });

        } catch (error) {
            logger.error('Update feature flag controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update feature flag'
            });
        }
    }

    // Run database migration
    async runDatabaseMigration(req, res) {
        try {
            const { migrationName, direction = 'up' } = req.body;

            const result = await adminService.runDatabaseMigration(
                migrationName,
                direction,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Database migration completed successfully',
                data: result
            });

        } catch (error) {
            logger.error('Run database migration controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Database migration failed'
            });
        }
    }

    // Get database status
    async getDatabaseStatus(req, res) {
        try {
            const status = await adminService.getDatabaseStatus();

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            logger.error('Get database status controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get database status'
            });
        }
    }

    // Optimize database
    async optimizeDatabase(req, res) {
        try {
            const options = {
                analyze: req.body.analyze !== false,
                vacuum: req.body.vacuum !== false,
                reindex: req.body.reindex !== false
            };

            const result = await adminService.optimizeDatabase(options, req.user.userId);

            res.json({
                success: true,
                message: 'Database optimization completed successfully',
                data: result
            });

        } catch (error) {
            logger.error('Optimize database controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Database optimization failed'
            });
        }
    }

    // Get API usage statistics
    async getApiUsageStats(req, res) {
        try {
            const timeframe = req.query.timeframe || '24h';
            const stats = await adminService.getApiUsageStatistics(timeframe);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get API usage stats controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get API usage statistics'
            });
        }
    }

    // Export system data
    async exportSystemData(req, res) {
        try {
            const { type, format = 'json', filters } = req.query;

            const exportData = await adminService.exportSystemData(type, filters);

            let filename, contentType, data;

            switch (format) {
                case 'csv':
                    filename = `${type}_export_${Date.now()}.csv`;
                    contentType = 'text/csv';
                    data = adminService.convertToCSV(exportData);
                    break;
                case 'xlsx':
                    filename = `${type}_export_${Date.now()}.xlsx`;
                    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    data = await adminService.convertToExcel(exportData);
                    break;
                default:
                    filename = `${type}_export_${Date.now()}.json`;
                    contentType = 'application/json';
                    data = JSON.stringify(exportData, null, 2);
            }

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(data);

        } catch (error) {
            logger.error('Export system data controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export system data'
            });
        }
    }

    // Get security alerts
    async getSecurityAlerts(req, res) {
        try {
            const filters = {
                severity: req.query.severity,
                status: req.query.status || 'active',
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const result = await adminService.getSecurityAlerts(filters, pagination);

            res.json({
                success: true,
                data: result.alerts,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get security alerts controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get security alerts'
            });
        }
    }

    // Resolve security alert
    async resolveSecurityAlert(req, res) {
        try {
            const { alertId } = req.params;
            const { resolution, notes } = req.body;

            const alert = await adminService.resolveSecurityAlert(
                alertId,
                resolution,
                notes,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Security alert resolved successfully',
                data: alert
            });

        } catch (error) {
            logger.error('Resolve security alert controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to resolve security alert'
            });
        }
    }

    // Get system logs
    async getSystemLogs(req, res) {
        try {
            const filters = {
                level: req.query.level,
                service: req.query.service,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                search: req.query.search
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 100
            };

            const result = await adminService.getSystemLogs(filters, pagination);

            res.json({
                success: true,
                data: result.logs,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get system logs controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get system logs'
            });
        }
    }
}

module.exports = new AdminController();