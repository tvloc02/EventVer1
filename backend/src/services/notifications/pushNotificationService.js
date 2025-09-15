const admin = require('firebase-admin');
const webpush = require('web-push');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const cacheService = require('../cacheService');
const logger = require('../../utils/logger');

class PushNotificationService {
    constructor() {
        this.fcm = null;
        this.webPushVapid = null;
        this.initializeServices();
    }

    async initializeServices() {
        try {
            // Khởi tạo Firebase Admin SDK
            if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

                if (!admin.apps.length) {
                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                        projectId: serviceAccount.project_id
                    });
                }

                this.fcm = admin.messaging();
                logger.info('Firebase Cloud Messaging đã được khởi tạo');
            }

            // Khởi tạo Web Push
            if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
                webpush.setVapidDetails(
                    process.env.VAPID_SUBJECT || 'mailto:admin@studentevent.com',
                    process.env.VAPID_PUBLIC_KEY,
                    process.env.VAPID_PRIVATE_KEY
                );
                this.webPushVapid = true;
                logger.info('Web Push đã được cấu hình');
            }

        } catch (error) {
            logger.error('Lỗi khởi tạo Push Notification Service:', error);
        }
    }

    // Gửi thông báo đẩy đến một người dùng
    async sendToUser(userId, notification) {
        try {
            const user = await User.findById(userId).select('pushSubscriptions fcmTokens');

            if (!user) {
                throw new Error('Không tìm thấy người dùng');
            }

            const results = {
                sent: 0,
                failed: 0,
                errors: []
            };

            // Gửi qua FCM (Mobile apps)
            if (user.fcmTokens && user.fcmTokens.length > 0) {
                const fcmResult = await this.sendFCMNotification(user.fcmTokens, notification);
                results.sent += fcmResult.sent;
                results.failed += fcmResult.failed;
                results.errors.push(...fcmResult.errors);
            }

            // Gửi qua Web Push (Browser)
            if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
                const webPushResult = await this.sendWebPushNotification(user.pushSubscriptions, notification);
                results.sent += webPushResult.sent;
                results.failed += webPushResult.failed;
                results.errors.push(...webPushResult.errors);
            }

            // Lưu thông báo vào database
            await this.saveNotification(userId, notification);

            logger.info(`Đã gửi thông báo đến người dùng ${userId}: ${results.sent} thành công, ${results.failed} thất bại`);
            return results;

        } catch (error) {
            logger.error('Lỗi gửi thông báo đến người dùng:', error);
            throw error;
        }
    }

    // Gửi thông báo đến nhiều người dùng
    async sendToMultipleUsers(userIds, notification) {
        try {
            const results = {
                successful: 0,
                failed: 0,
                errors: []
            };

            // Xử lý theo batch để tránh quá tải
            const batchSize = 100;
            for (let i = 0; i < userIds.length; i += batchSize) {
                const batch = userIds.slice(i, i + batchSize);

                const batchPromises = batch.map(async userId => {
                    try {
                        await this.sendToUser(userId, notification);
                        return { userId, success: true };
                    } catch (error) {
                        return { userId, success: false, error: error.message };
                    }
                });

                const batchResults = await Promise.allSettled(batchPromises);

                batchResults.forEach(result => {
                    if (result.status === 'fulfilled') {
                        if (result.value.success) {
                            results.successful++;
                        } else {
                            results.failed++;
                            results.errors.push(result.value);
                        }
                    } else {
                        results.failed++;
                        results.errors.push({ error: result.reason.message });
                    }
                });

                // Nghỉ ngắn giữa các batch
                if (i + batchSize < userIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            logger.info(`Gửi thông báo hàng loạt: ${results.successful} thành công, ${results.failed} thất bại`);
            return results;

        } catch (error) {
            logger.error('Lỗi gửi thông báo hàng loạt:', error);
            throw error;
        }
    }

    // Gửi FCM notification
    async sendFCMNotification(tokens, notification) {
        try {
            if (!this.fcm || !tokens || tokens.length === 0) {
                return { sent: 0, failed: 0, errors: [] };
            }

            const message = {
                notification: {
                    title: notification.title,
                    body: notification.body
                },
                data: {
                    type: notification.type || 'general',
                    eventId: notification.eventId?.toString() || '',
                    url: notification.url || '',
                    timestamp: new Date().toISOString()
                }
            };

            // Thêm icon và màu sắc nếu có
            if (notification.icon) {
                message.notification.icon = notification.icon;
            }

            if (notification.color) {
                message.android = {
                    notification: {
                        color: notification.color
                    }
                };
            }

            const results = {
                sent: 0,
                failed: 0,
                errors: []
            };

            // Gửi theo batch
            const batchSize = 500; // FCM limit
            for (let i = 0; i < tokens.length; i += batchSize) {
                const batchTokens = tokens.slice(i, i + batchSize);

                try {
                    const response = await this.fcm.sendMulticast({
                        ...message,
                        tokens: batchTokens
                    });

                    results.sent += response.successCount;
                    results.failed += response.failureCount;

                    // Xử lý token không hợp lệ
                    if (response.responses) {
                        response.responses.forEach((result, index) => {
                            if (!result.success) {
                                const error = result.error;
                                if (error.code === 'messaging/registration-token-not-registered' ||
                                    error.code === 'messaging/invalid-registration-token') {
                                    // Token không hợp lệ, cần xóa khỏi database
                                    this.removeInvalidFCMToken(batchTokens[index]);
                                }
                                results.errors.push({
                                    token: batchTokens[index],
                                    error: error.message
                                });
                            }
                        });
                    }

                } catch (error) {
                    results.failed += batchTokens.length;
                    results.errors.push({
                        batch: i / batchSize + 1,
                        error: error.message
                    });
                }
            }

            return results;

        } catch (error) {
            logger.error('Lỗi gửi FCM notification:', error);
            return { sent: 0, failed: tokens.length, errors: [{ error: error.message }] };
        }
    }

    // Gửi Web Push notification
    async sendWebPushNotification(subscriptions, notification) {
        try {
            if (!this.webPushVapid || !subscriptions || subscriptions.length === 0) {
                return { sent: 0, failed: 0, errors: [] };
            }

            const payload = JSON.stringify({
                title: notification.title,
                body: notification.body,
                icon: notification.icon || '/icons/icon-192x192.png',
                badge: notification.badge || '/icons/badge-72x72.png',
                url: notification.url || '/',
                tag: notification.tag || 'general',
                timestamp: Date.now(),
                data: {
                    type: notification.type || 'general',
                    eventId: notification.eventId?.toString() || ''
                }
            });

            const results = {
                sent: 0,
                failed: 0,
                errors: []
            };

            // Gửi đến từng subscription
            for (const subscription of subscriptions) {
                try {
                    await webpush.sendNotification(subscription, payload, {
                        TTL: 86400, // 24 giờ
                        urgency: notification.urgency || 'normal'
                    });

                    results.sent++;

                } catch (error) {
                    results.failed++;

                    // Xử lý subscription không hợp lệ
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        this.removeInvalidWebPushSubscription(subscription);
                    }

                    results.errors.push({
                        endpoint: subscription.endpoint,
                        error: error.message
                    });
                }
            }

            return results;

        } catch (error) {
            logger.error('Lỗi gửi Web Push notification:', error);
            return { sent: 0, failed: subscriptions.length, errors: [{ error: error.message }] };
        }
    }

    // Lưu thông báo vào database
    async saveNotification(userId, notificationData) {
        try {
            const notification = new Notification({
                user: userId,
                title: notificationData.title,
                body: notificationData.body,
                type: notificationData.type || 'general',
                data: notificationData.data || {},
                channels: ['push'],
                status: 'sent',
                sentAt: new Date()
            });

            await notification.save();
            return notification;

        } catch (error) {
            logger.error('Lỗi lưu thông báo:', error);
            throw error;
        }
    }

    // Đăng ký FCM token
    async registerFCMToken(userId, token, deviceInfo = {}) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('Không tìm thấy người dùng');
            }

            // Kiểm tra token đã tồn tại chưa
            const existingTokenIndex = user.fcmTokens.findIndex(t => t.token === token);

            if (existingTokenIndex !== -1) {
                // Cập nhật thông tin device
                user.fcmTokens[existingTokenIndex].deviceInfo = deviceInfo;
                user.fcmTokens[existingTokenIndex].lastUsed = new Date();
            } else {
                // Thêm token mới
                user.fcmTokens.push({
                    token,
                    deviceInfo,
                    addedAt: new Date(),
                    lastUsed: new Date()
                });
            }

            await user.save();

            logger.info(`Đã đăng ký FCM token cho người dùng ${userId}`);
            return { success: true, message: 'Đăng ký FCM token thành công' };

        } catch (error) {
            logger.error('Lỗi đăng ký FCM token:', error);
            throw error;
        }
    }

    // Đăng ký Web Push subscription
    async registerWebPushSubscription(userId, subscription) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('Không tìm thấy người dùng');
            }

            // Kiểm tra subscription đã tồn tại chưa
            const existingSubIndex = user.pushSubscriptions.findIndex(
                sub => sub.endpoint === subscription.endpoint
            );

            if (existingSubIndex !== -1) {
                // Cập nhật subscription hiện tại
                user.pushSubscriptions[existingSubIndex] = {
                    ...subscription,
                    addedAt: user.pushSubscriptions[existingSubIndex].addedAt,
                    lastUsed: new Date()
                };
            } else {
                // Thêm subscription mới
                user.pushSubscriptions.push({
                    ...subscription,
                    addedAt: new Date(),
                    lastUsed: new Date()
                });
            }

            await user.save();

            logger.info(`Đã đăng ký Web Push subscription cho người dùng ${userId}`);
            return { success: true, message: 'Đăng ký Web Push subscription thành công' };

        } catch (error) {
            logger.error('Lỗi đăng ký Web Push subscription:', error);
            throw error;
        }
    }

    // Hủy đăng ký FCM token
    async unregisterFCMToken(userId, token) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('Không tìm thấy người dùng');
            }

            user.fcmTokens = user.fcmTokens.filter(t => t.token !== token);
            await user.save();

            logger.info(`Đã hủy đăng ký FCM token cho người dùng ${userId}`);
            return { success: true, message: 'Hủy đăng ký FCM token thành công' };

        } catch (error) {
            logger.error('Lỗi hủy đăng ký FCM token:', error);
            throw error;
        }
    }

    // Gửi thông báo về sự kiện
    async sendEventNotification(eventId, type, data = {}) {
        try {
            const Event = require('../../models/Event');
            const Registration = require('../../models/Registration');

            const event = await Event.findById(eventId)
                .populate('organizer', 'profile.fullName');

            if (!event) {
                throw new Error('Không tìm thấy sự kiện');
            }

            let notification;
            let targetUsers = [];

            switch (type) {
                case 'event_reminder':
                    notification = {
                        title: `Nhắc nhở: ${event.title}`,
                        body: `Sự kiện bắt đầu trong ${data.timeUntil || '1 giờ'}`,
                        type: 'event_reminder',
                        eventId: eventId,
                        url: `/events/${event.slug}`,
                        icon: '/icons/reminder.png'
                    };

                    // Lấy danh sách người đã đăng ký
                    const registrations = await Registration.find({
                        event: eventId,
                        status: 'approved'
                    }).populate('user', '_id');

                    targetUsers = registrations.map(reg => reg.user._id);
                    break;

                case 'event_update':
                    notification = {
                        title: `Cập nhật: ${event.title}`,
                        body: data.message || 'Sự kiện có thông tin cập nhật mới',
                        type: 'event_update',
                        eventId: eventId,
                        url: `/events/${event.slug}`,
                        icon: '/icons/update.png'
                    };

                    // Lấy danh sách người đã đăng ký
                    const updateRegistrations = await Registration.find({
                        event: eventId,
                        status: { $in: ['approved', 'attended'] }
                    }).populate('user', '_id');

                    targetUsers = updateRegistrations.map(reg => reg.user._id);
                    break;

                case 'registration_approved':
                    notification = {
                        title: 'Đăng ký được duyệt',
                        body: `Đăng ký tham gia "${event.title}" đã được duyệt`,
                        type: 'registration_approved',
                        eventId: eventId,
                        url: `/events/${event.slug}`,
                        icon: '/icons/approved.png'
                    };

                    targetUsers = [data.userId];
                    break;

                case 'certificate_ready':
                    notification = {
                        title: 'Chứng nhận đã sẵn sàng',
                        body: `Chứng nhận cho sự kiện "${event.title}" đã có thể tải xuống`,
                        type: 'certificate_ready',
                        eventId: eventId,
                        url: `/certificates`,
                        icon: '/icons/certificate.png'
                    };

                    targetUsers = [data.userId];
                    break;

                default:
                    throw new Error('Loại thông báo không được hỗ trợ');
            }

            if (targetUsers.length === 0) {
                return { message: 'Không có người dùng nào để gửi thông báo' };
            }

            const result = await this.sendToMultipleUsers(targetUsers, notification);

            logger.info(`Đã gửi thông báo sự kiện ${type} cho ${targetUsers.length} người dùng`);
            return result;

        } catch (error) {
            logger.error('Lỗi gửi thông báo sự kiện:', error);
            throw error;
        }
    }

    // Gửi thông báo hệ thống
    async sendSystemNotification(type, data = {}) {
        try {
            let notification;
            let targetUsers = [];

            switch (type) {
                case 'system_maintenance':
                    notification = {
                        title: 'Bảo trì hệ thống',
                        body: data.message || 'Hệ thống sẽ bảo trì trong thời gian ngắn',
                        type: 'system_maintenance',
                        icon: '/icons/maintenance.png',
                        urgency: 'high'
                    };

                    // Gửi cho tất cả người dùng đang hoạt động
                    const activeUsers = await User.find({
                        status: 'active',
                        lastActivity: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 ngày
                    }).select('_id');

                    targetUsers = activeUsers.map(user => user._id);
                    break;

                case 'new_feature':
                    notification = {
                        title: 'Tính năng mới',
                        body: data.message || 'Hệ thống có tính năng mới, hãy khám phá!',
                        type: 'new_feature',
                        url: data.url || '/',
                        icon: '/icons/new-feature.png'
                    };

                    // Gửi cho người dùng đã đăng ký nhận thông báo
                    const interestedUsers = await User.find({
                        status: 'active',
                        'preferences.notifications.system': true
                    }).select('_id');

                    targetUsers = interestedUsers.map(user => user._id);
                    break;

                default:
                    throw new Error('Loại thông báo hệ thống không được hỗ trợ');
            }

            if (targetUsers.length === 0) {
                return { message: 'Không có người dùng nào để gửi thông báo' };
            }

            const result = await this.sendToMultipleUsers(targetUsers, notification);

            logger.info(`Đã gửi thông báo hệ thống ${type} cho ${targetUsers.length} người dùng`);
            return result;

        } catch (error) {
            logger.error('Lỗi gửi thông báo hệ thống:', error);
            throw error;
        }
    }

    // Xóa FCM token không hợp lệ
    async removeInvalidFCMToken(token) {
        try {
            await User.updateMany(
                { 'fcmTokens.token': token },
                { $pull: { fcmTokens: { token: token } } }
            );

            logger.debug(`Đã xóa FCM token không hợp lệ: ${token}`);

        } catch (error) {
            logger.error('Lỗi xóa FCM token không hợp lệ:', error);
        }
    }

    // Xóa Web Push subscription không hợp lệ
    async removeInvalidWebPushSubscription(subscription) {
        try {
            await User.updateMany(
                { 'pushSubscriptions.endpoint': subscription.endpoint },
                { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } }
            );

            logger.debug(`Đã xóa Web Push subscription không hợp lệ: ${subscription.endpoint}`);

        } catch (error) {
            logger.error('Lỗi xóa Web Push subscription không hợp lệ:', error);
        }
    }

    // Thống kê thông báo đẩy
    async getPushNotificationStats(timeRange = '7d') {
        try {
            const cacheKey = `push_notification_stats:${timeRange}`;

            let stats = await cacheService.get(cacheKey);
            if (stats) {
                return stats;
            }

            const dateRange = this.getDateRange(timeRange);

            const [
                totalNotifications,
                deliveredNotifications,
                failedNotifications,
                userStats
            ] = await Promise.all([
                Notification.countDocuments({
                    channels: 'push',
                    sentAt: { $gte: dateRange.start, $lte: dateRange.end }
                }),
                Notification.countDocuments({
                    channels: 'push',
                    status: 'delivered',
                    sentAt: { $gte: dateRange.start, $lte: dateRange.end }
                }),
                Notification.countDocuments({
                    channels: 'push',
                    status: 'failed',
                    sentAt: { $gte: dateRange.start, $lte: dateRange.end }
                }),
                User.aggregate([
                    {
                        $project: {
                            fcmTokenCount: { $size: { $ifNull: ['$fcmTokens', []] } },
                            webPushSubscriptionCount: { $size: { $ifNull: ['$pushSubscriptions', []] } }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalUsers: { $sum: 1 },
                            usersWithFCM: { $sum: { $cond: [{ $gt: ['$fcmTokenCount', 0] }, 1, 0] } },
                            usersWithWebPush: { $sum: { $cond: [{ $gt: ['$webPushSubscriptionCount', 0] }, 1, 0] } },
                            totalFCMTokens: { $sum: '$fcmTokenCount' },
                            totalWebPushSubscriptions: { $sum: '$webPushSubscriptionCount' }
                        }
                    }
                ])
            ]);

            const userStatsData = userStats[0] || {};

            stats = {
                totalNotifications,
                deliveredNotifications,
                failedNotifications,
                deliveryRate: totalNotifications > 0
                    ? Math.round((deliveredNotifications / totalNotifications) * 100)
                    : 0,
                users: {
                    total: userStatsData.totalUsers || 0,
                    withFCM: userStatsData.usersWithFCM || 0,
                    withWebPush: userStatsData.usersWithWebPush || 0,
                    fcmTokens: userStatsData.totalFCMTokens || 0,
                    webPushSubscriptions: userStatsData.totalWebPushSubscriptions || 0
                },
                generatedAt: new Date()
            };

            // Cache trong 10 phút
            await cacheService.set(cacheKey, stats, 600);

            return stats;

        } catch (error) {
            logger.error('Lỗi lấy thống kê thông báo đẩy:', error);
            throw error;
        }
    }

    // Dọn dẹp token/subscription cũ
    async cleanupOldTokens() {
        try {
            const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 ngày

            const result = await User.updateMany({}, {
                $pull: {
                    fcmTokens: { lastUsed: { $lt: cutoffDate } },
                    pushSubscriptions: { lastUsed: { $lt: cutoffDate } }
                }
            });

            logger.info(`Đã dọn dẹp ${result.modifiedCount} token/subscription cũ`);
            return result.modifiedCount;

        } catch (error) {
            logger.error('Lỗi dọn dẹp token cũ:', error);
            return 0;
        }
    }

    // Utility methods
    getDateRange(timeRange) {
        const now = new Date();
        const ranges = {
            '1d': new Date(now - 1 * 24 * 60 * 60 * 1000),
            '7d': new Date(now - 7 * 24 * 60 * 60 * 1000),
            '30d': new Date(now - 30 * 24 * 60 * 60 * 1000)
        };

        return {
            start: ranges[timeRange] || ranges['7d'],
            end: now
        };
    }

    // Kiểm tra tình trạng service
    async healthCheck() {
        try {
            const health = {
                fcm: false,
                webPush: false,
                timestamp: new Date()
            };

            // Kiểm tra FCM
            if (this.fcm) {
                try {
                    // Thử gửi một tin nhắn test (sẽ fail nhưng chứng minh service hoạt động)
                    await this.fcm.sendMulticast({
                        tokens: ['test_token'],
                        notification: { title: 'test', body: 'test' }
                    });
                } catch (error) {
                    // FCM service hoạt động nếu lỗi là về token không hợp lệ
                    if (error.code === 'messaging/invalid-registration-token') {
                        health.fcm = true;
                    }
                }
            }

            // Kiểm tra Web Push
            health.webPush = !!this.webPushVapid;

            return health;

        } catch (error) {
            logger.error('Lỗi kiểm tra tình trạng Push Notification Service:', error);
            return {
                fcm: false,
                webPush: false,
                error: error.message,
                timestamp: new Date()
            };
        }
    }
}

// Dọn dẹp token cũ mỗi ngày
const pushNotificationService = new PushNotificationService();
setInterval(() => {
    pushNotificationService.cleanupOldTokens().catch(error => {
        logger.error('Lỗi dọn dẹp token cũ theo lịch:', error);
    });
}, 24 * 60 * 60 * 1000);

module.exports = pushNotificationService;