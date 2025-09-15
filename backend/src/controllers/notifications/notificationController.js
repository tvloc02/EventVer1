const notificationService = require('../../services/notifications/notificationService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class NotificationController {
    // Get user notifications
    async getUserNotifications(req, res) {
        try {
            const userId = req.user.userId;
            const options = {
                unreadOnly: req.query.unreadOnly === 'true',
                category: req.query.category,
                type: req.query.type,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const result = await notificationService.getUserNotifications(userId, options);

            res.json({
                success: true,
                data: result.notifications,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get user notifications controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get notifications'
            });
        }
    }

    // Get notification by ID
    async getNotificationById(req, res) {
        try {
            const { notificationId } = req.params;
            const notification = await notificationService.getNotificationById(notificationId);

            // Check if user can view this notification
            if (notification.recipient.toString() !== req.user.userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            res.json({
                success: true,
                data: notification
            });

        } catch (error) {
            logger.error('Get notification by ID controller error:', error);
            const statusCode = error.name === 'NotFoundError' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to get notification'
            });
        }
    }

    // Mark notification as read
    async markAsRead(req, res) {
        try {
            const { notificationId } = req.params;
            const notification = await notificationService.markAsRead(notificationId, req.user.userId);

            res.json({
                success: true,
                message: 'Notification marked as read',
                data: notification
            });

        } catch (error) {
            logger.error('Mark as read controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to mark notification as read'
            });
        }
    }

    // Mark all notifications as read
    async markAllAsRead(req, res) {
        try {
            const userId = req.user.userId;
            const result = await notificationService.markAllAsRead(userId);

            res.json({
                success: true,
                message: `${result.modifiedCount} notifications marked as read`,
                data: { updated: result.modifiedCount }
            });

        } catch (error) {
            logger.error('Mark all as read controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark all notifications as read'
            });
        }
    }

    // Get unread count
    async getUnreadCount(req, res) {
        try {
            const userId = req.user.userId;
            const count = await notificationService.getUnreadCount(userId);

            res.json({
                success: true,
                data: { unreadCount: count }
            });

        } catch (error) {
            logger.error('Get unread count controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get unread count'
            });
        }
    }

    // Delete notification
    async deleteNotification(req, res) {
        try {
            const { notificationId } = req.params;
            const result = await notificationService.deleteNotification(notificationId, req.user.userId);

            res.json({
                success: true,
                message: 'Notification deleted successfully'
            });

        } catch (error) {
            logger.error('Delete notification controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to delete notification'
            });
        }
    }

    // Create notification (admin only)
    async createNotification(req, res) {
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
                ...req.body,
                createdBy: req.user.userId
            };

            const notification = await notificationService.createNotification(notificationData);

            res.status(201).json({
                success: true,
                message: 'Notification created successfully',
                data: notification
            });

        } catch (error) {
            logger.error('Create notification controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to create notification'
            });
        }
    }

    // Send bulk notification
    async sendBulkNotification(req, res) {
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
                recipients,
                title,
                message,
                type,
                channels,
                scheduledFor
            } = req.body;

            const result = await notificationService.sendBulkNotification({
                recipients,
                title,
                message,
                type,
                channels,
                scheduledFor,
                createdBy: req.user.userId
            });

            res.json({
                success: true,
                message: `Bulk notification sent to ${result.successful} recipients`,
                data: result
            });

        } catch (error) {
            logger.error('Send bulk notification controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send bulk notification'
            });
        }
    }

    // Get notification settings
    async getNotificationSettings(req, res) {
        try {
            const userId = req.user.userId;
            const settings = await notificationService.getNotificationSettings(userId);

            res.json({
                success: true,
                data: settings
            });

        } catch (error) {
            logger.error('Get notification settings controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get notification settings'
            });
        }
    }

    // Update notification settings
    async updateNotificationSettings(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const userId = req.user.userId;
            const settings = await notificationService.updateNotificationSettings(userId, req.body);

            res.json({
                success: true,
                message: 'Notification settings updated successfully',
                data: settings
            });

        } catch (error) {
            logger.error('Update notification settings controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update notification settings'
            });
        }
    }

    // Test notification
    async testNotification(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { channel, recipient } = req.body;
            const targetUserId = recipient || req.user.userId;

            const result = await notificationService.sendTestNotification(channel, targetUserId);

            res.json({
                success: true,
                message: 'Test notification sent successfully',
                data: result
            });

        } catch (error) {
            logger.error('Test notification controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send test notification'
            });
        }
    }

    // Get notification templates
    async getNotificationTemplates(req, res) {
        try {
            const templates = await notificationService.getNotificationTemplates();

            res.json({
                success: true,
                data: templates
            });

        } catch (error) {
            logger.error('Get notification templates controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get notification templates'
            });
        }
    }

    // Create notification template
    async createNotificationTemplate(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const templateData = {
                ...req.body,
                createdBy: req.user.userId
            };

            const template = await notificationService.createNotificationTemplate(templateData);

            res.status(201).json({
                success: true,
                message: 'Notification template created successfully',
                data: template
            });

        } catch (error) {
            logger.error('Create notification template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to create notification template'
            });
        }
    }

    // Update notification template
    async updateNotificationTemplate(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { templateId } = req.params;
            const template = await notificationService.updateNotificationTemplate(
                templateId,
                req.body,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Notification template updated successfully',
                data: template
            });

        } catch (error) {
            logger.error('Update notification template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update notification template'
            });
        }
    }

    // Delete notification template
    async deleteNotificationTemplate(req, res) {
        try {
            const { templateId } = req.params;
            await notificationService.deleteNotificationTemplate(templateId, req.user.userId);

            res.json({
                success: true,
                message: 'Notification template deleted successfully'
            });

        } catch (error) {
            logger.error('Delete notification template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to delete notification template'
            });
        }
    }

    // Get notification statistics
    async getNotificationStats(req, res) {
        try {
            const filters = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                type: req.query.type,
                category: req.query.category
            };

            const stats = await notificationService.getNotificationStatistics(filters);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get notification stats controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get notification statistics'
            });
        }
    }

    // Export notifications
    async exportNotifications(req, res) {
        try {
            const { format = 'xlsx' } = req.query;
            const filters = {
                recipient: req.query.recipient,
                type: req.query.type,
                status: req.query.status,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const notifications = await notificationService.getNotificationsForExport(filters);

            const exportService = require('../../services/analytics/exportService');
            const fileBuffer = await exportService.exportNotifications(notifications, format);

            const filename = `notifications_export_${Date.now()}.${format}`;

            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-Type', exportService.getContentType(format));

            res.send(fileBuffer);

        } catch (error) {
            logger.error('Export notifications controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Export failed'
            });
        }
    }

    // Resend failed notifications
    async resendFailedNotifications(req, res) {
        try {
            const { batchSize = 100 } = req.body;
            const result = await notificationService.resendFailedNotifications(batchSize);

            res.json({
                success: true,
                message: `Resent ${result.resent} failed notifications`,
                data: result
            });

        } catch (error) {
            logger.error('Resend failed notifications controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to resend notifications'
            });
        }
    }

    // Cancel scheduled notification
    async cancelScheduledNotification(req, res) {
        try {
            const { notificationId } = req.params;
            const notification = await notificationService.cancelScheduledNotification(
                notificationId,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Scheduled notification cancelled successfully',
                data: notification
            });

        } catch (error) {
            logger.error('Cancel scheduled notification controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to cancel scheduled notification'
            });
        }
    }

    // Get delivery status
    async getDeliveryStatus(req, res) {
        try {
            const { notificationId } = req.params;
            const status = await notificationService.getDeliveryStatus(notificationId);

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            logger.error('Get delivery status controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get delivery status'
            });
        }
    }

    // Subscribe to push notifications
    async subscribeToPush(req, res) {
        try {
            const { subscription } = req.body;
            const userId = req.user.userId;

            const result = await notificationService.subscribeToPushNotifications(userId, subscription);

            res.json({
                success: true,
                message: 'Successfully subscribed to push notifications',
                data: result
            });

        } catch (error) {
            logger.error('Subscribe to push controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to subscribe to push notifications'
            });
        }
    }

    // Unsubscribe from push notifications
    async unsubscribeFromPush(req, res) {
        try {
            const { endpoint } = req.body;
            const userId = req.user.userId;

            const result = await notificationService.unsubscribeFromPushNotifications(userId, endpoint);

            res.json({
                success: true,
                message: 'Successfully unsubscribed from push notifications',
                data: result
            });

        } catch (error) {
            logger.error('Unsubscribe from push controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to unsubscribe from push notifications'
            });
        }
    }
}

module.exports = new NotificationController();