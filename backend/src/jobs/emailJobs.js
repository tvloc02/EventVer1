const cron = require('node-cron');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const emailService = require('../config/email');
const EmailTemplates = require('../utils/emailTemplates');
const { TIME_CONSTANTS, EMAIL_TEMPLATES } = require('../utils/constants');

class EmailJobs {
    constructor() {
        this.isProcessing = false;
        this.batchSize = parseInt(process.env.EMAIL_BATCH_SIZE) || 50;
        this.delayBetweenBatches = parseInt(process.env.EMAIL_BATCH_DELAY) || 1000;
        this.maxRetries = parseInt(process.env.EMAIL_MAX_RETRIES) || 3;
        this.queue = [];
    }

    /**
     * Initialize email jobs
     */
    async initialize() {
        try {
            // Process email queue every minute
            cron.schedule('* * * * *', async () => {
                await this.processEmailQueue();
            });

            // Send daily digest at 8 AM
            cron.schedule('0 8 * * *', async () => {
                await this.sendDailyDigest();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Send weekly newsletter on Friday at 9 AM
            cron.schedule('0 9 * * 5', async () => {
                await this.sendWeeklyNewsletter();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Send event reminders
            cron.schedule('0 */2 * * *', async () => {
                await this.sendEventReminders();
            });

            // Process pending registrations notifications
            cron.schedule('0 10,14,18 * * *', async () => {
                await this.sendPendingRegistrationNotifications();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Clean up old email logs daily at 3 AM
            cron.schedule('0 3 * * *', async () => {
                await this.cleanupEmailLogs();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            logger.info('Email jobs initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize email jobs:', error);
            throw error;
        }
    }

    /**
     * Process email queue
     */
    async processEmailQueue() {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        try {
            const EmailQueue = require('../models/EmailQueue');

            const queuedEmails = await EmailQueue.find({
                status: 'pending',
                scheduledFor: { $lte: new Date() },
                retryCount: { $lt: this.maxRetries }
            })
                .sort({ priority: -1, createdAt: 1 })
                .limit(this.batchSize);

            if (queuedEmails.length === 0) {
                return;
            }

            logger.info(`Processing ${queuedEmails.length} queued emails`);

            let processedCount = 0;
            let failedCount = 0;

            for (const queueItem of queuedEmails) {
                try {
                    await this.processQueuedEmail(queueItem);
                    processedCount++;
                } catch (error) {
                    failedCount++;
                    logger.error('Failed to process queued email:', error);
                    await this.handleEmailFailure(queueItem, error);
                }

                // Add delay between emails to avoid rate limiting
                if (processedCount % 10 === 0) {
                    await this.sleep(this.delayBetweenBatches);
                }
            }

            logger.info(`Email queue processing completed: ${processedCount} sent, ${failedCount} failed`);

        } catch (error) {
            logger.error('Email queue processing failed:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process individual queued email
     */
    async processQueuedEmail(queueItem) {
        const EmailQueue = require('../models/EmailQueue');

        try {
            let emailContent;

            if (queueItem.template) {
                // Use template
                emailContent = EmailTemplates.getTemplate(queueItem.template, queueItem.templateData);
            } else {
                // Use direct content
                emailContent = {
                    subject: queueItem.subject,
                    html: queueItem.html,
                    text: queueItem.text
                };
            }

            const result = await emailService.sendEmail({
                to: queueItem.to,
                cc: queueItem.cc,
                bcc: queueItem.bcc,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
                attachments: queueItem.attachments
            });

            if (result.success) {
                await EmailQueue.findByIdAndUpdate(queueItem._id, {
                    status: 'sent',
                    sentAt: new Date(),
                    messageId: result.messageId,
                    response: result.response
                });

                logger.logEmail('queued', queueItem.to, emailContent.subject, 'sent');
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            await EmailQueue.findByIdAndUpdate(queueItem._id, {
                status: 'failed',
                error: error.message,
                retryCount: queueItem.retryCount + 1,
                lastRetryAt: new Date()
            });

            throw error;
        }
    }

    /**
     * Handle email failure
     */
    async handleEmailFailure(queueItem, error) {
        const EmailQueue = require('../models/EmailQueue');

        if (queueItem.retryCount + 1 >= this.maxRetries) {
            // Mark as permanently failed
            await EmailQueue.findByIdAndUpdate(queueItem._id, {
                status: 'failed_permanent',
                error: error.message,
                failedAt: new Date()
            });
        } else {
            // Schedule for retry with exponential backoff
            const retryDelay = Math.pow(2, queueItem.retryCount) * 60 * 1000; // Minutes to milliseconds
            const nextRetry = new Date(Date.now() + retryDelay);

            await EmailQueue.findByIdAndUpdate(queueItem._id, {
                scheduledFor: nextRetry,
                retryCount: queueItem.retryCount + 1,
                lastRetryAt: new Date()
            });
        }
    }

    /**
     * Send daily digest
     */
    async sendDailyDigest() {
        try {
            logger.info('Starting daily digest send...');

            const User = require('../models/User');
            const Event = require('../models/Event');

            // Get users who want daily digest
            const users = await User.find({
                'preferences.notifications.email': true,
                'preferences.notifications.dailyDigest': true,
                isActive: true,
                isEmailVerified: true
            });

            if (users.length === 0) {
                logger.info('No users subscribed to daily digest');
                return;
            }

            // Get today's events
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const todaysEvents = await Event.find({
                'schedule.startDate': {
                    $gte: today.setHours(0, 0, 0, 0),
                    $lt: tomorrow.setHours(0, 0, 0, 0)
                },
                status: 'published'
            }).populate('category organizer');

            // Get upcoming events (next 7 days)
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);

            const upcomingEvents = await Event.find({
                'schedule.startDate': {
                    $gte: tomorrow,
                    $lt: nextWeek
                },
                status: 'published'
            }).populate('category organizer').limit(5);

            let sentCount = 0;

            for (const user of users) {
                try {
                    const digestContent = this.generateDailyDigestContent(user, todaysEvents, upcomingEvents);

                    await this.queueEmail({
                        to: user.email,
                        template: EMAIL_TEMPLATES.NEWSLETTER,
                        templateData: digestContent,
                        priority: 'low',
                        scheduledFor: new Date()
                    });

                    sentCount++;
                } catch (error) {
                    logger.error(`Failed to queue daily digest for user ${user._id}:`, error);
                }
            }

            logger.info(`Daily digest queued for ${sentCount} users`);

        } catch (error) {
            logger.error('Daily digest sending failed:', error);
        }
    }

    /**
     * Generate daily digest content
     */
    generateDailyDigestContent(user, todaysEvents, upcomingEvents) {
        const greeting = this.getGreeting();

        let content = `
            <h2>${greeting}, ${user.profile?.firstName || user.username}!</h2>
            <p>Đây là bản tóm tắt các sự kiện trong ngày và sắp tới dành cho bạn.</p>
        `;

        if (todaysEvents.length > 0) {
            content += `
                <h3>🎯 Sự kiện hôm nay (${todaysEvents.length})</h3>
                <ul>
            `;

            todaysEvents.forEach(event => {
                content += `
                    <li>
                        <strong>${event.title}</strong><br>
                        <small>⏰ ${new Date(event.schedule.startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} | 📍 ${event.location.venue || 'Trực tuyến'}</small>
                    </li>
                `;
            });

            content += `</ul>`;
        } else {
            content += `<p>📅 Không có sự kiện nào diễn ra trong hôm nay.</p>`;
        }

        if (upcomingEvents.length > 0) {
            content += `
                <h3>📅 Sự kiện sắp tới</h3>
                <ul>
            `;

            upcomingEvents.forEach(event => {
                content += `
                    <li>
                        <strong>${event.title}</strong><br>
                        <small>📅 ${new Date(event.schedule.startDate).toLocaleDateString('vi-VN')} | 📍 ${event.location.venue || 'Trực tuyến'}</small>
                    </li>
                `;
            });

            content += `</ul>`;
        }

        return {
            subject: `📬 Tóm tắt sự kiện ngày ${new Date().toLocaleDateString('vi-VN')}`,
            content,
            featuredEvents: todaysEvents.slice(0, 3),
            upcomingEvents: upcomingEvents.slice(0, 5)
        };
    }

    /**
     * Send weekly newsletter
     */
    async sendWeeklyNewsletter() {
        try {
            logger.info('Starting weekly newsletter send...');

            const User = require('../models/User');
            const Event = require('../models/Event');
            const Registration = require('../models/Registration');

            // Get users who want weekly newsletter
            const users = await User.find({
                'preferences.notifications.email': true,
                'preferences.notifications.newsletter': true,
                isActive: true,
                isEmailVerified: true
            });

            if (users.length === 0) {
                logger.info('No users subscribed to weekly newsletter');
                return;
            }

            // Get this week's statistics
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            // Get featured events for next week
            const nextWeekEvents = await Event.find({
                'schedule.startDate': {
                    $gte: weekEnd,
                    $lt: new Date(weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000)
                },
                status: 'published',
                featured: true
            }).populate('category organizer').limit(5);

            // Get popular events (most registrations)
            const popularEvents = await Event.aggregate([
                {
                    $match: {
                        'schedule.startDate': { $gte: new Date() },
                        status: 'published'
                    }
                },
                {
                    $lookup: {
                        from: 'registrations',
                        localField: '_id',
                        foreignField: 'event',
                        as: 'registrations'
                    }
                },
                {
                    $addFields: {
                        registrationCount: { $size: '$registrations' }
                    }
                },
                {
                    $sort: { registrationCount: -1 }
                },
                {
                    $limit: 5
                }
            ]);

            // Get weekly stats
            const weeklyStats = await this.getWeeklyStats(weekStart, weekEnd);

            let sentCount = 0;

            for (const user of users) {
                try {
                    const newsletterContent = this.generateWeeklyNewsletterContent(
                        user,
                        nextWeekEvents,
                        popularEvents,
                        weeklyStats
                    );

                    await this.queueEmail({
                        to: user.email,
                        template: EMAIL_TEMPLATES.NEWSLETTER,
                        templateData: newsletterContent,
                        priority: 'low',
                        scheduledFor: new Date()
                    });

                    sentCount++;
                } catch (error) {
                    logger.error(`Failed to queue newsletter for user ${user._id}:`, error);
                }
            }

            logger.info(`Weekly newsletter queued for ${sentCount} users`);

        } catch (error) {
            logger.error('Weekly newsletter sending failed:', error);
        }
    }

    /**
     * Generate weekly newsletter content
     */
    generateWeeklyNewsletterContent(user, featuredEvents, popularEvents, stats) {
        let content = `
            <h2>📰 Newsletter Tuần ${this.getWeekNumber()}</h2>
            <p>Xin chào ${user.profile?.firstName || user.username},</p>
            <p>Đây là bản tin hàng tuần về các sự kiện và hoạt động mới nhất.</p>
        `;

        // Weekly statistics
        if (stats) {
            content += `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: white;">📊 Thống kê tuần qua</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold;">${stats.newEvents}</div>
                            <div style="font-size: 14px;">Sự kiện mới</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold;">${stats.newRegistrations}</div>
                            <div style="font-size: 14px;">Đăng ký mới</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold;">${stats.completedEvents}</div>
                            <div style="font-size: 14px;">Sự kiện đã hoàn thành</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold;">${stats.activeUsers}</div>
                            <div style="font-size: 14px;">Người dùng hoạt động</div>
                        </div>
                    </div>
                </div>
            `;
        }

        return {
            subject: `📰 Newsletter Tuần ${this.getWeekNumber()} - Cập nhật sự kiện mới nhất`,
            content,
            featuredEvents,
            upcomingEvents: popularEvents
        };
    }

    /**
     * Send event reminders
     */
    async sendEventReminders() {
        try {
            const Registration = require('../models/Registration');
            const Event = require('../models/Event');

            // Find events that need reminders
            const now = new Date();
            const reminderTimes = [
                { time: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), type: '1week' }, // 1 week
                { time: new Date(now.getTime() + 24 * 60 * 60 * 1000), type: '1day' }, // 1 day
                { time: new Date(now.getTime() + 60 * 60 * 1000), type: '1hour' }, // 1 hour
                { time: new Date(now.getTime() + 15 * 60 * 1000), type: '15min' } // 15 minutes
            ];

            let totalReminders = 0;

            for (const reminder of reminderTimes) {
                const events = await Event.find({
                    'schedule.startDate': {
                        $gte: new Date(reminder.time.getTime() - 10 * 60 * 1000), // 10 minutes before
                        $lte: new Date(reminder.time.getTime() + 10 * 60 * 1000)  // 10 minutes after
                    },
                    status: 'published'
                }).populate('organizer');

                for (const event of events) {
                    const registrations = await Registration.find({
                        event: event._id,
                        status: 'approved'
                    }).populate('user');

                    for (const registration of registrations) {
                        // Check if reminder already sent
                        const reminderSent = registration.reminders?.includes(reminder.type);
                        if (reminderSent) continue;

                        try {
                            await this.queueEmail({
                                to: registration.user.email,
                                template: EMAIL_TEMPLATES.EVENT_REMINDER,
                                templateData: {
                                    user: registration.user,
                                    event,
                                    registration,
                                    reminderType: reminder.type
                                },
                                priority: 'high'
                            });

                            // Mark reminder as sent
                            await Registration.findByIdAndUpdate(registration._id, {
                                $addToSet: { reminders: reminder.type }
                            });

                            totalReminders++;
                        } catch (error) {
                            logger.error(`Failed to queue reminder for registration ${registration._id}:`, error);
                        }
                    }
                }
            }

            if (totalReminders > 0) {
                logger.info(`Queued ${totalReminders} event reminders`);
            }

        } catch (error) {
            logger.error('Event reminders sending failed:', error);
        }
    }

    /**
     * Send pending registration notifications to organizers
     */
    async sendPendingRegistrationNotifications() {
        try {
            const Registration = require('../models/Registration');
            const Event = require('../models/Event');

            // Find events with pending registrations
            const eventsWithPending = await Event.aggregate([
                {
                    $lookup: {
                        from: 'registrations',
                        localField: '_id',
                        foreignField: 'event',
                        as: 'pendingRegistrations',
                        pipeline: [
                            { $match: { status: 'pending' } }
                        ]
                    }
                },
                {
                    $match: {
                        'pendingRegistrations.0': { $exists: true } // Has at least one pending registration
                    }
                }
            ]);

            let notificationCount = 0;

            for (const event of eventsWithPending) {
                try {
                    const fullEvent = await Event.findById(event._id).populate('organizer');

                    await this.queueEmail({
                        to: fullEvent.organizer.email,
                        subject: `Có ${event.pendingRegistrations.length} đăng ký chờ phê duyệt - ${fullEvent.title}`,
                        html: this.generatePendingRegistrationNotification(fullEvent, event.pendingRegistrations.length),
                        priority: 'medium'
                    });

                    notificationCount++;
                } catch (error) {
                    logger.error(`Failed to queue pending registration notification for event ${event._id}:`, error);
                }
            }

            if (notificationCount > 0) {
                logger.info(`Sent ${notificationCount} pending registration notifications`);
            }

        } catch (error) {
            logger.error('Pending registration notifications failed:', error);
        }
    }

    /**
     * Generate pending registration notification content
     */
    generatePendingRegistrationNotification(event, pendingCount) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>📋 Có đăng ký chờ phê duyệt</h2>
                
                <p>Xin chào ${event.organizer.profile?.firstName || event.organizer.username},</p>
                
                <p>Sự kiện "<strong>${event.title}</strong>" của bạn có <strong>${pendingCount}</strong> đăng ký đang chờ phê duyệt.</p>
                
                <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                    <p><strong>⏰ Thời gian sự kiện:</strong> ${new Date(event.schedule.startDate).toLocaleString('vi-VN')}</p>
                    <p><strong>📍 Địa điểm:</strong> ${event.location.venue || 'Trực tuyến'}</p>
                    <p><strong>📝 Đăng ký chờ:</strong> ${pendingCount}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/organizer/events/${event._id}/registrations" 
                       style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Xem và phê duyệt đăng ký
                    </a>
                </div>
                
                <p>Vui lòng xem xét và phê duyệt các đăng ký để đảm bảo người tham gia có đủ thời gian chuẩn bị.</p>
            </div>
        `;
    }

    /**
     * Queue email for later processing
     */
    async queueEmail(emailData) {
        const EmailQueue = require('../models/EmailQueue');

        const queueItem = new EmailQueue({
            to: emailData.to,
            cc: emailData.cc,
            bcc: emailData.bcc,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
            template: emailData.template,
            templateData: emailData.templateData,
            attachments: emailData.attachments,
            priority: this.getPriorityLevel(emailData.priority || 'medium'),
            scheduledFor: emailData.scheduledFor || new Date(),
            retryCount: 0,
            status: 'pending'
        });

        await queueItem.save();
        return queueItem._id;
    }

    /**
     * Send bulk email to multiple recipients
     */
    async sendBulkEmail(recipients, emailData, options = {}) {
        const batchSize = options.batchSize || this.batchSize;
        const delay = options.delay || this.delayBetweenBatches;

        let queuedCount = 0;

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);

            for (const recipient of batch) {
                try {
                    await this.queueEmail({
                        ...emailData,
                        to: recipient.email,
                        templateData: {
                            ...emailData.templateData,
                            user: recipient
                        }
                    });
                    queuedCount++;
                } catch (error) {
                    logger.error(`Failed to queue email for ${recipient.email}:`, error);
                }
            }

            // Add delay between batches
            if (i + batchSize < recipients.length) {
                await this.sleep(delay);
            }
        }

        logger.info(`Bulk email queued for ${queuedCount} recipients`);
        return queuedCount;
    }

    /**
     * Clean up old email logs
     */
    async cleanupEmailLogs() {
        try {
            const EmailQueue = require('../models/EmailQueue');
            const cutoffTime = new Date(Date.now() - 30 * TIME_CONSTANTS.DAY); // 30 days

            const result = await EmailQueue.deleteMany({
                $or: [
                    { status: 'sent', sentAt: { $lt: cutoffTime } },
                    { status: 'failed_permanent', failedAt: { $lt: cutoffTime } }
                ]
            });

            logger.info(`Cleaned up ${result.deletedCount} old email logs`);
            return result.deletedCount;
        } catch (error) {
            logger.error('Email logs cleanup failed:', error);
            throw error;
        }
    }

    // Helper methods
    getPriorityLevel(priority) {
        const levels = {
            low: 1,
            medium: 5,
            high: 8,
            urgent: 10
        };
        return levels[priority] || 5;
    }

    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    }

    getWeekNumber() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now - start;
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        return Math.ceil(diff / oneWeek);
    }

    async getWeeklyStats(weekStart, weekEnd) {
        try {
            const Event = require('../models/Event');
            const Registration = require('../models/Registration');
            const User = require('../models/User');

            const [newEvents, newRegistrations, completedEvents, activeUsers] = await Promise.all([
                Event.countDocuments({
                    createdAt: { $gte: weekStart, $lt: weekEnd }
                }),
                Registration.countDocuments({
                    createdAt: { $gte: weekStart, $lt: weekEnd }
                }),
                Event.countDocuments({
                    'schedule.endDate': { $gte: weekStart, $lt: weekEnd },
                    status: 'completed'
                }),
                User.countDocuments({
                    lastLoginAt: { $gte: weekStart, $lt: weekEnd }
                })
            ]);

            return {
                newEvents,
                newRegistrations,
                completedEvents,
                activeUsers
            };
        } catch (error) {
            logger.error('Failed to get weekly stats:', error);
            return null;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get email job status
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            batchSize: this.batchSize,
            delayBetweenBatches: this.delayBetweenBatches,
            maxRetries: this.maxRetries,
            queueLength: this.queue.length
        };
    }

    /**
     * Send immediate email (bypass queue)
     */
    async sendImmediateEmail(emailData) {
        try {
            let emailContent;

            if (emailData.template) {
                emailContent = EmailTemplates.getTemplate(emailData.template, emailData.templateData);
            } else {
                emailContent = {
                    subject: emailData.subject,
                    html: emailData.html,
                    text: emailData.text
                };
            }

            const result = await emailService.sendEmail({
                to: emailData.to,
                cc: emailData.cc,
                bcc: emailData.bcc,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
                attachments: emailData.attachments
            });

            if (result.success) {
                logger.logEmail('immediate', emailData.to, emailContent.subject, 'sent');
            }

            return result;
        } catch (error) {
            logger.error('Immediate email send failed:', error);
            throw error;
        }
    }

    /**
     * Get queue statistics
     */
    async getQueueStats() {
        try {
            const EmailQueue = require('../models/EmailQueue');

            const [pending, sent, failed, total] = await Promise.all([
                EmailQueue.countDocuments({ status: 'pending' }),
                EmailQueue.countDocuments({ status: 'sent' }),
                EmailQueue.countDocuments({ status: { $in: ['failed', 'failed_permanent'] } }),
                EmailQueue.countDocuments({})
            ]);

            return {
                pending,
                sent,
                failed,
                total,
                successRate: total > 0 ? ((sent / total) * 100).toFixed(2) + '%' : '0%'
            };
        } catch (error) {
            logger.error('Failed to get queue stats:', error);
            return null;
        }
    }
}

module.exports = new EmailJobs();