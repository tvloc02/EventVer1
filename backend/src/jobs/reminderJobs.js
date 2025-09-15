const cron = require('node-cron');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const emailService = require('../config/email');
const pushNotification = require('../services/pushNotification');
const smsService = require('../services/smsService');
const { TIME_CONSTANTS, REMINDER_TYPES, EMAIL_TEMPLATES } = require('../utils/constants');

class ReminderJobs {
    constructor() {
        this.isProcessing = false;
        this.reminderConfig = {
            batchSize: parseInt(process.env.REMINDER_BATCH_SIZE) || 100,
            maxRetries: parseInt(process.env.REMINDER_MAX_RETRIES) || 3,
            retryDelay: parseInt(process.env.REMINDER_RETRY_DELAY) || 5 * 60 * 1000,
            enableSMS: process.env.SMS_ENABLED === 'true',
            enablePush: process.env.PUSH_ENABLED !== 'false'
        };
        this.activeReminders = new Map();
    }

    /**
     * Khởi tạo reminder jobs
     */
    async initialize() {
        try {
            // Kiểm tra event reminders mỗi 5 phút
            cron.schedule('*/5 * * * *', async () => {
                await this.processEventReminders();
            });

            // Reminder đăng ký sắp hết hạn - 4 lần/ngày
            cron.schedule('0 9,13,17,21 * * *', async () => {
                await this.sendRegistrationDeadlineReminders();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Birthday reminders - hàng ngày lúc 8 AM
            cron.schedule('0 8 * * *', async () => {
                await this.sendBirthdayReminders();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Profile completion reminders - thứ hai hàng tuần
            cron.schedule('0 10 * * 1', async () => {
                await this.sendProfileCompletionReminders();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Event feedback reminders - 1 ngày sau event
            cron.schedule('0 20 * * *', async () => {
                await this.sendFeedbackReminders();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Payment reminders - hàng ngày lúc 9 AM
            cron.schedule('0 9 * * *', async () => {
                await this.sendPaymentReminders();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Checkin reminders - mỗi 10 phút
            cron.schedule('*/10 * * * *', async () => {
                await this.sendCheckinReminders();
            });

            // Organizer task reminders
            cron.schedule('0 11,15 * * *', async () => {
                await this.sendOrganizerTaskReminders();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Inactive user re-engagement - thứ tư hàng tuần
            cron.schedule('0 14 * * 3', async () => {
                await this.sendInactiveUserReminders();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Certificate reminders - sau 7 ngày kết thúc event
            cron.schedule('0 12 * * *', async () => {
                await this.sendCertificateReminders();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            logger.info('Reminder jobs đã được khởi tạo thành công');
        } catch (error) {
            logger.error('Khởi tạo reminder jobs thất bại:', error);
            throw error;
        }
    }

    /**
     * Xử lý event reminders
     */
    async processEventReminders() {
        if (this.isProcessing) return;

        this.isProcessing = true;

        try {
            const now = new Date();
            const reminderTimes = [
                { time: new Date(now.getTime() + 7 * TIME_CONSTANTS.DAY), type: '1week', label: '1 tuần', priority: 'low' },
                { time: new Date(now.getTime() + 3 * TIME_CONSTANTS.DAY), type: '3days', label: '3 ngày', priority: 'medium' },
                { time: new Date(now.getTime() + TIME_CONSTANTS.DAY), type: '1day', label: '1 ngày', priority: 'medium' },
                { time: new Date(now.getTime() + 2 * TIME_CONSTANTS.HOUR), type: '2hours', label: '2 giờ', priority: 'high' },
                { time: new Date(now.getTime() + 30 * TIME_CONSTANTS.MINUTE), type: '30min', label: '30 phút', priority: 'urgent' }
            ];

            let totalReminders = 0;

            for (const reminder of reminderTimes) {
                const sent = await this.sendEventReminders(reminder);
                totalReminders += sent;
            }

            if (totalReminders > 0) {
                logger.info(`Đã gửi ${totalReminders} event reminders`);
            }

        } catch (error) {
            logger.error('Xử lý event reminders thất bại:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Gửi event reminders
     */
    async sendEventReminders(reminderConfig) {
        try {
            const Event = require('../models/Event');
            const Registration = require('../models/Registration');
            const Reminder = require('../models/Reminder');

            const events = await Event.find({
                'schedule.startDate': {
                    $gte: new Date(reminderConfig.time.getTime() - 10 * TIME_CONSTANTS.MINUTE),
                    $lte: new Date(reminderConfig.time.getTime() + 10 * TIME_CONSTANTS.MINUTE)
                },
                status: 'published'
            }).populate('organizer category');

            let sentCount = 0;

            for (const event of events) {
                const registrations = await Registration.find({
                    event: event._id,
                    status: 'approved'
                }).populate('user');

                for (const registration of registrations) {
                    try {
                        // Kiểm tra reminder đã gửi chưa
                        const existingReminder = await Reminder.findOne({
                            user: registration.user._id,
                            event: event._id,
                            type: reminderConfig.type,
                            sent: true
                        });

                        if (existingReminder) continue;

                        // Kiểm tra user preferences
                        if (!this.shouldSendReminder(registration.user, reminderConfig.type)) {
                            continue;
                        }

                        const reminderContent = this.createEventReminderContent(
                            event,
                            registration,
                            reminderConfig
                        );

                        const channels = await this.sendMultiChannelReminder(registration.user, reminderContent);

                        await this.saveReminderRecord(
                            registration.user._id,
                            event._id,
                            reminderConfig.type,
                            reminderContent,
                            channels
                        );

                        sentCount++;

                    } catch (error) {
                        logger.error(`Gửi reminder thất bại cho user ${registration.user._id}:`, error);
                        await this.handleReminderFailure(registration.user._id, event._id, reminderConfig.type, error);
                    }
                }
            }

            return sentCount;

        } catch (error) {
            logger.error('Send event reminders thất bại:', error);
            return 0;
        }
    }

    /**
     * Gửi registration deadline reminders
     */
    async sendRegistrationDeadlineReminders() {
        try {
            logger.info('Gửi registration deadline reminders...');

            const Event = require('../models/Event');
            const Registration = require('../models/Registration');
            const Reminder = require('../models/Reminder');

            const now = new Date();
            const reminderTimes = [
                { hours: 48, type: '2days', label: '2 ngày', priority: 'medium' },
                { hours: 24, type: '1day', label: '1 ngày', priority: 'high' },
                { hours: 6, type: '6hours', label: '6 giờ', priority: 'urgent' }
            ];

            let totalSent = 0;

            for (const reminderTime of reminderTimes) {
                const deadlineTime = new Date(now.getTime() + reminderTime.hours * TIME_CONSTANTS.HOUR);

                const events = await Event.find({
                    'schedule.registrationEnd': {
                        $gte: new Date(deadlineTime.getTime() - 30 * TIME_CONSTANTS.MINUTE),
                        $lte: new Date(deadlineTime.getTime() + 30 * TIME_CONSTANTS.MINUTE)
                    },
                    status: 'published',
                    'registration.isOpen': true
                }).populate('category');

                for (const event of events) {
                    const interestedUsers = await this.findInterestedUsers(event);

                    for (const user of interestedUsers) {
                        const existingRegistration = await Registration.findOne({
                            user: user._id,
                            event: event._id
                        });

                        if (existingRegistration) continue;

                        const reminderType = `deadline_${reminderTime.type}`;
                        const existingReminder = await Reminder.findOne({
                            user: user._id,
                            event: event._id,
                            type: reminderType,
                            sent: true
                        });

                        if (existingReminder) continue;

                        try {
                            const reminderContent = this.createDeadlineReminderContent(
                                event,
                                user,
                                reminderTime
                            );

                            const channels = await this.sendMultiChannelReminder(user, reminderContent);

                            await this.saveReminderRecord(
                                user._id,
                                event._id,
                                reminderType,
                                reminderContent,
                                channels
                            );

                            totalSent++;

                        } catch (error) {
                            logger.error(`Gửi deadline reminder thất bại cho user ${user._id}:`, error);
                        }
                    }
                }
            }

            if (totalSent > 0) {
                logger.info(`Đã gửi ${totalSent} registration deadline reminders`);
            }

        } catch (error) {
            logger.error('Send registration deadline reminders thất bại:', error);
        }
    }

    /**
     * Gửi birthday reminders
     */
    async sendBirthdayReminders() {
        try {
            logger.info('Gửi birthday reminders...');

            const User = require('../models/User');
            const Reminder = require('../models/Reminder');
            const today = new Date();

            const birthdayUsers = await User.find({
                'profile.dateOfBirth': { $exists: true },
                isActive: true,
                'preferences.notifications.birthdayWishes': { $ne: false }
            });

            const todayBirthdays = birthdayUsers.filter(user => {
                const birthday = new Date(user.profile.dateOfBirth);
                return birthday.getMonth() === today.getMonth() &&
                    birthday.getDate() === today.getDate();
            });

            let sentCount = 0;

            for (const user of todayBirthdays) {
                // Kiểm tra đã gửi birthday reminder năm nay chưa
                const yearStart = new Date(today.getFullYear(), 0, 1);
                const existingReminder = await Reminder.findOne({
                    user: user._id,
                    type: 'birthday',
                    createdAt: { $gte: yearStart }
                });

                if (existingReminder) continue;

                try {
                    const age = today.getFullYear() - new Date(user.profile.dateOfBirth).getFullYear();
                    const specialOffers = await this.getBirthdaySpecialOffers(user);

                    const reminderContent = {
                        type: 'birthday',
                        title: 'Chúc mừng sinh nhật!',
                        message: `Chúc mừng sinh nhật lần thứ ${age}, ${user.profile?.firstName || user.username}! Chúc bạn một ngày thật vui vẻ và hạnh phúc.`,
                        priority: 'medium',
                        data: {
                            userId: user._id,
                            age,
                            specialOffers,
                            celebrationUrl: `${process.env.FRONTEND_URL}/profile/birthday-celebration`
                        }
                    };

                    const channels = await this.sendMultiChannelReminder(user, reminderContent);

                    await this.saveReminderRecord(
                        user._id,
                        null,
                        'birthday',
                        reminderContent,
                        channels
                    );

                    sentCount++;

                } catch (error) {
                    logger.error(`Gửi birthday reminder thất bại cho user ${user._id}:`, error);
                }
            }

            if (sentCount > 0) {
                logger.info(`Đã gửi ${sentCount} birthday reminders`);
            }

        } catch (error) {
            logger.error('Send birthday reminders thất bại:', error);
        }
    }

    /**
     * Gửi profile completion reminders
     */
    async sendProfileCompletionReminders() {
        try {
            logger.info('Gửi profile completion reminders...');

            const User = require('../models/User');
            const Reminder = require('../models/Reminder');

            const incompleteUsers = await User.find({
                isActive: true,
                emailVerified: true,
                'preferences.notifications.profileReminders': { $ne: false },
                createdAt: { $lt: new Date(Date.now() - 7 * TIME_CONSTANTS.DAY) }, // Tài khoản tạo hơn 7 ngày
                $or: [
                    { 'profile.firstName': { $exists: false } },
                    { 'profile.lastName': { $exists: false } },
                    { 'profile.avatar': { $exists: false } },
                    { 'student.faculty': { $exists: false } },
                    { 'student.year': { $exists: false } },
                    { 'profile.bio': { $exists: false } }
                ]
            });

            let sentCount = 0;

            for (const user of incompleteUsers) {
                // Kiểm tra đã gửi reminder trong 2 tuần qua chưa
                const recentReminder = await Reminder.findOne({
                    user: user._id,
                    type: 'profile_completion',
                    createdAt: { $gte: new Date(Date.now() - 14 * TIME_CONSTANTS.DAY) }
                });

                if (recentReminder) continue;

                try {
                    const missingFields = this.getMissingProfileFields(user);
                    const completionRate = this.calculateProfileCompletionRate(user);

                    // Chỉ gửi nếu completion rate < 70%
                    if (completionRate >= 70) continue;

                    const incentives = await this.getProfileCompletionIncentives(user);

                    const reminderContent = {
                        type: 'profile_completion',
                        title: 'Hoàn thiện hồ sơ cá nhân',
                        message: `Hồ sơ của bạn đã hoàn thành ${completionRate}%. Hoàn thiện thêm để có trải nghiệm tốt hơn!`,
                        priority: 'low',
                        data: {
                            userId: user._id,
                            missingFields,
                            completionRate,
                            incentives,
                            profileUrl: `${process.env.FRONTEND_URL}/profile/edit`
                        }
                    };

                    const channels = await this.sendMultiChannelReminder(user, reminderContent);

                    await this.saveReminderRecord(
                        user._id,
                        null,
                        'profile_completion',
                        reminderContent,
                        channels
                    );

                    sentCount++;

                } catch (error) {
                    logger.error(`Gửi profile completion reminder thất bại cho user ${user._id}:`, error);
                }
            }

            if (sentCount > 0) {
                logger.info(`Đã gửi ${sentCount} profile completion reminders`);
            }

        } catch (error) {
            logger.error('Send profile completion reminders thất bại:', error);
        }
    }

    /**
     * Gửi feedback reminders
     */
    async sendFeedbackReminders() {
        try {
            logger.info('Gửi feedback reminders...');

            const Event = require('../models/Event');
            const Registration = require('../models/Registration');
            const Feedback = require('../models/Feedback');
            const Reminder = require('../models/Reminder');

            // Events kết thúc 1-3 ngày trước
            const threeDaysAgo = new Date(Date.now() - 3 * TIME_CONSTANTS.DAY);
            const oneDayAgo = new Date(Date.now() - TIME_CONSTANTS.DAY);

            const completedEvents = await Event.find({
                'schedule.endDate': {
                    $gte: threeDaysAgo,
                    $lte: oneDayAgo
                },
                status: 'completed'
            });

            let sentCount = 0;

            for (const event of completedEvents) {
                const attendedRegistrations = await Registration.find({
                    event: event._id,
                    status: 'attended'
                }).populate('user');

                for (const registration of attendedRegistrations) {
                    // Kiểm tra đã có feedback chưa
                    const existingFeedback = await Feedback.findOne({
                        user: registration.user._id,
                        event: event._id
                    });

                    if (existingFeedback) continue;

                    // Kiểm tra reminder đã gửi chưa
                    const existingReminder = await Reminder.findOne({
                        user: registration.user._id,
                        event: event._id,
                        type: 'feedback_request'
                    });

                    if (existingReminder) continue;

                    // Kiểm tra user preferences
                    if (registration.user.preferences?.notifications?.feedbackRequests === false) {
                        continue;
                    }

                    try {
                        const reminderContent = {
                            type: 'feedback_request',
                            title: 'Đánh giá sự kiện',
                            message: `Cảm ơn bạn đã tham gia "${event.title}". Hãy dành 2 phút để đánh giá sự kiện giúp chúng tôi cải thiện.`,
                            priority: 'medium',
                            data: {
                                eventId: event._id,
                                eventTitle: event.title,
                                eventType: event.eventType,
                                attendedDate: registration.checkedInAt,
                                feedbackUrl: `${process.env.FRONTEND_URL}/events/${event._id}/feedback?token=${registration.feedbackToken}`,
                                incentive: 'Nhận 50 điểm thưởng khi hoàn thành đánh giá'
                            }
                        };

                        const channels = await this.sendMultiChannelReminder(registration.user, reminderContent);

                        await this.saveReminderRecord(
                            registration.user._id,
                            event._id,
                            'feedback_request',
                            reminderContent,
                            channels
                        );

                        sentCount++;

                    } catch (error) {
                        logger.error(`Gửi feedback reminder thất bại cho user ${registration.user._id}:`, error);
                    }
                }
            }

            if (sentCount > 0) {
                logger.info(`Đã gửi ${sentCount} feedback reminders`);
            }

        } catch (error) {
            logger.error('Send feedback reminders thất bại:', error);
        }
    }

    /**
     * Gửi payment reminders
     */
    async sendPaymentReminders() {
        try {
            logger.info('Gửi payment reminders...');

            const Registration = require('../models/Registration');
            const Reminder = require('../models/Reminder');

            const pendingPayments = await Registration.find({
                'payment.status': 'pending',
                'payment.dueDate': { $gte: new Date() },
                status: 'pending_payment'
            }).populate('user event');

            let sentCount = 0;

            for (const registration of pendingPayments) {
                const daysUntilDue = Math.ceil(
                    (registration.payment.dueDate - new Date()) / TIME_CONSTANTS.DAY
                );

                // Gửi reminder ở các mốc: 7, 3, 1 ngày
                const shouldSend = [7, 3, 1].includes(daysUntilDue);
                if (!shouldSend) continue;

                const reminderType = `payment_${daysUntilDue}day`;
                const existingReminder = await Reminder.findOne({
                    user: registration.user._id,
                    event: registration.event._id,
                    type: reminderType
                });

                if (existingReminder) continue;

                try {
                    const urgency = daysUntilDue === 1 ? 'urgent' : daysUntilDue === 3 ? 'high' : 'medium';

                    const reminderContent = {
                        type: 'payment_reminder',
                        title: 'Nhắc nhở thanh toán',
                        message: `Vui lòng hoàn tất thanh toán cho sự kiện "${registration.event.title}" trong ${daysUntilDue} ngày tới để giữ chỗ.`,
                        priority: urgency,
                        data: {
                            registrationId: registration._id,
                            eventId: registration.event._id,
                            eventTitle: registration.event.title,
                            amount: registration.payment.amount,
                            currency: registration.payment.currency || 'VND',
                            dueDate: registration.payment.dueDate,
                            daysRemaining: daysUntilDue,
                            paymentUrl: `${process.env.FRONTEND_URL}/registrations/${registration._id}/payment`,
                            late_fee: daysUntilDue === 1 ? 'Có thể có phí trễ hạn nếu thanh toán muộn' : null
                        }
                    };

                    const channels = await this.sendMultiChannelReminder(registration.user, reminderContent);

                    await this.saveReminderRecord(
                        registration.user._id,
                        registration.event._id,
                        reminderType,
                        reminderContent,
                        channels
                    );

                    sentCount++;

                } catch (error) {
                    logger.error(`Gửi payment reminder thất bại cho registration ${registration._id}:`, error);
                }
            }

            if (sentCount > 0) {
                logger.info(`Đã gửi ${sentCount} payment reminders`);
            }

        } catch (error) {
            logger.error('Send payment reminders thất bại:', error);
        }
    }

    /**
     * Gửi checkin reminders
     */
    async sendCheckinReminders() {
        try {
            const Event = require('../models/Event');
            const Registration = require('../models/Registration');
            const Reminder = require('../models/Reminder');

            const now = new Date();
            const checkinTime = new Date(now.getTime() + 30 * TIME_CONSTANTS.MINUTE);

            const upcomingEvents = await Event.find({
                'schedule.startDate': {
                    $gte: new Date(checkinTime.getTime() - 5 * TIME_CONSTANTS.MINUTE),
                    $lte: new Date(checkinTime.getTime() + 5 * TIME_CONSTANTS.MINUTE)
                },
                status: 'published'
            });

            let sentCount = 0;

            for (const event of upcomingEvents) {
                const approvedRegistrations = await Registration.find({
                    event: event._id,
                    status: 'approved'
                }).populate('user');

                for (const registration of approvedRegistrations) {
                    const existingReminder = await Reminder.findOne({
                        user: registration.user._id,
                        event: event._id,
                        type: 'checkin_reminder'
                    });

                    if (existingReminder) continue;

                    try {
                        const reminderContent = {
                            type: 'checkin_reminder',
                            title: 'Sự kiện sắp bắt đầu',
                            message: `Sự kiện "${event.title}" sẽ bắt đầu trong 30 phút. Hãy chuẩn bị checkin!`,
                            priority: 'urgent',
                            data: {
                                eventId: event._id,
                                eventTitle: event.title,
                                startTime: event.schedule.startDate,
                                location: event.location,
                                registrationId: registration._id,
                                checkinUrl: `${process.env.FRONTEND_URL}/events/${event._id}/checkin`,
                                qrCode: registration.qrCode,
                                checkinInstructions: event.checkinInstructions || 'Mang theo QR code để checkin nhanh'
                            }
                        };

                        const channels = await this.sendMultiChannelReminder(registration.user, reminderContent);

                        await this.saveReminderRecord(
                            registration.user._id,
                            event._id,
                            'checkin_reminder',
                            reminderContent,
                            channels
                        );

                        sentCount++;

                    } catch (error) {
                        logger.error(`Gửi checkin reminder thất bại cho user ${registration.user._id}:`, error);
                    }
                }
            }

            if (sentCount > 0) {
                logger.info(`Đã gửi ${sentCount} checkin reminders`);
            }

        } catch (error) {
            logger.error('Send checkin reminders thất bại:', error);
        }
    }

    /**
     * Gửi organizer task reminders
     */
    async sendOrganizerTaskReminders() {
        try {
            logger.info('Gửi organizer task reminders...');

            await this.sendPendingApprovalsReminders();
            await this.sendLowRegistrationReminders();
            await this.sendEventPreparationReminders();

        } catch (error) {
            logger.error('Send organizer task reminders thất bại:', error);
        }
    }

    /**
     * Gửi reminder cho pending approvals
     */
    async sendPendingApprovalsReminders() {
        const Event = require('../models/Event');
        const Registration = require('../models/Registration');
        const Reminder = require('../models/Reminder');

        const eventsWithPending = await Event.aggregate([
            {
                $lookup: {
                    from: 'registrations',
                    localField: '_id',
                    foreignField: 'event',
                    as: 'pendingRegistrations',
                    pipeline: [
                        {
                            $match: {
                                status: 'pending',
                                createdAt: { $lt: new Date(Date.now() - 24 * TIME_CONSTANTS.HOUR) }
                            }
                        }
                    ]
                }
            },
            {
                $match: {
                    'pendingRegistrations.0': { $exists: true },
                    status: 'published'
                }
            }
        ]);

        let sentCount = 0;

        for (const eventData of eventsWithPending) {
            const event = await Event.findById(eventData._id).populate('organizer');

            // Kiểm tra reminder đã gửi trong ngày chưa
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const existingReminder = await Reminder.findOne({
                user: event.organizer._id,
                event: event._id,
                type: 'pending_approvals',
                createdAt: { $gte: today }
            });

            if (existingReminder) continue;

            try {
                const pendingCount = eventData.pendingRegistrations.length;
                const urgency = pendingCount > 10 ? 'high' : 'medium';

                const reminderContent = {
                    type: 'pending_approvals',
                    title: 'Có đăng ký chờ phê duyệt',
                    message: `Sự kiện "${event.title}" có ${pendingCount} đăng ký chờ phê duyệt từ hơn 24 giờ.`,
                    priority: urgency,
                    data: {
                        eventId: event._id,
                        eventTitle: event.title,
                        pendingCount,
                        oldestPending: Math.max(...eventData.pendingRegistrations.map(r => Date.now() - r.createdAt)),
                        managementUrl: `${process.env.FRONTEND_URL}/organizer/events/${event._id}/registrations?filter=pending`,
                        bulkApproveUrl: `${process.env.FRONTEND_URL}/organizer/events/${event._id}/registrations/bulk-approve`
                    }
                };

                const channels = await this.sendMultiChannelReminder(event.organizer, reminderContent);

                await this.saveReminderRecord(
                    event.organizer._id,
                    event._id,
                    'pending_approvals',
                    reminderContent,
                    channels
                );

                sentCount++;

            } catch (error) {
                logger.error(`Gửi pending approvals reminder thất bại cho event ${event._id}:`, error);
            }
        }

        return sentCount;
    }

    /**
     * Gửi reminder cho events có ít đăng ký
     */
    async sendLowRegistrationReminders() {
        const Event = require('../models/Event');
        const Registration = require('../models/Registration');
        const Reminder = require('../models/Reminder');

        const upcomingEvents = await Event.find({
            'schedule.startDate': {
                $gte: new Date(),
                $lte: new Date(Date.now() + 7 * TIME_CONSTANTS.DAY)
            },
            status: 'published'
        }).populate('organizer');

        for (const event of upcomingEvents) {
            const registrationCount = await Registration.countDocuments({
                event: event._id,
                status: { $in: ['approved', 'pending'] }
            });

            const capacity = event.registration.maxParticipants;
            const registrationRate = (registrationCount / capacity) * 100;
            const daysUntilEvent = Math.ceil((event.schedule.startDate - new Date()) / TIME_CONSTANTS.DAY);

            // Gửi reminder nếu tỷ lệ đăng ký < 40% và còn <= 5 ngày
            if (registrationRate < 40 && daysUntilEvent <= 5 && daysUntilEvent > 1) {
                const existingReminder = await Reminder.findOne({
                    user: event.organizer._id,
                    event: event._id,
                    type: 'low_registration',
                    createdAt: { $gte: new Date(Date.now() - 48 * TIME_CONSTANTS.HOUR) }
                });

                if (existingReminder) continue;

                const suggestions = this.getMarketingSuggestions(registrationRate, daysUntilEvent);

                const reminderContent = {
                    type: 'low_registration',
                    title: 'Tỷ lệ đăng ký thấp',
                    message: `Sự kiện "${event.title}" chỉ có ${registrationCount}/${capacity} đăng ký (${registrationRate.toFixed(1)}%). Cần thúc đẩy marketing.`,
                    priority: daysUntilEvent <= 3 ? 'high' : 'medium',
                    data: {
                        eventId: event._id,
                        eventTitle: event.title,
                        registrationCount,
                        capacity,
                        registrationRate: registrationRate.toFixed(1),
                        daysUntilEvent,
                        suggestions,
                        promotionUrl: `${process.env.FRONTEND_URL}/organizer/events/${event._id}/promote`
                    }
                };

                const channels = await this.sendMultiChannelReminder(event.organizer, reminderContent);

                await this.saveReminderRecord(
                    event.organizer._id,
                    event._id,
                    'low_registration',
                    reminderContent,
                    channels
                );
            }
        }
    }

    /**
     * Gửi event preparation reminders
     */
    async sendEventPreparationReminders() {
        const Event = require('../models/Event');
        const Reminder = require('../models/Reminder');

        // Events bắt đầu trong 3 ngày tới
        const upcomingEvents = await Event.find({
            'schedule.startDate': {
                $gte: new Date(Date.now() + 2 * TIME_CONSTANTS.DAY),
                $lte: new Date(Date.now() + 4 * TIME_CONSTANTS.DAY)
            },
            status: 'published'
        }).populate('organizer');

        for (const event of upcomingEvents) {
            const existingReminder = await Reminder.findOne({
                user: event.organizer._id,
                event: event._id,
                type: 'event_preparation'
            });

            if (existingReminder) continue;

            const checklist = await this.generateEventChecklist(event);

            const reminderContent = {
                type: 'event_preparation',
                title: 'Chuẩn bị sự kiện',
                message: `Sự kiện "${event.title}" sẽ diễn ra trong 3 ngày. Hãy kiểm tra checklist chuẩn bị.`,
                priority: 'high',
                data: {
                    eventId: event._id,
                    eventTitle: event.title,
                    startTime: event.schedule.startDate,
                    checklist,
                    managementUrl: `${process.env.FRONTEND_URL}/organizer/events/${event._id}/manage`
                }
            };

            const channels = await this.sendMultiChannelReminder(event.organizer, reminderContent);

            await this.saveReminderRecord(
                event.organizer._id,
                event._id,
                'event_preparation',
                reminderContent,
                channels
            );
        }
    }

    /**
     * Gửi certificate reminders
     */
    async sendCertificateReminders() {
        try {
            logger.info('Gửi certificate reminders...');

            const Event = require('../models/Event');
            const Registration = require('../models/Registration');
            const Certificate = require('../models/Certificate');
            const Reminder = require('../models/Reminder');

            // Events hoàn thành 7 ngày trước có thể tạo certificate
            const sevenDaysAgo = new Date(Date.now() - 7 * TIME_CONSTANTS.DAY);
            const startOfDay = new Date(sevenDaysAgo.setHours(0, 0, 0, 0));
            const endOfDay = new Date(sevenDaysAgo.setHours(23, 59, 59, 999));

            const completedEvents = await Event.find({
                'schedule.endDate': {
                    $gte: startOfDay,
                    $lte: endOfDay
                },
                status: 'completed',
                'certificate.enabled': true
            });

            let sentCount = 0;

            for (const event of completedEvents) {
                const attendedRegistrations = await Registration.find({
                    event: event._id,
                    status: 'attended'
                }).populate('user');

                for (const registration of attendedRegistrations) {
                    // Kiểm tra đã có certificate chưa
                    const existingCertificate = await Certificate.findOne({
                        user: registration.user._id,
                        event: event._id
                    });

                    if (existingCertificate) continue;

                    // Kiểm tra reminder đã gửi chưa
                    const existingReminder = await Reminder.findOne({
                        user: registration.user._id,
                        event: event._id,
                        type: 'certificate_available'
                    });

                    if (existingReminder) continue;

                    try {
                        const reminderContent = {
                            type: 'certificate_available',
                            title: 'Chứng chỉ đã sẵn sàng',
                            message: `Chứng chỉ tham gia sự kiện "${event.title}" đã có thể tải về. Hãy lấy chứng chỉ của bạn!`,
                            priority: 'medium',
                            data: {
                                eventId: event._id,
                                eventTitle: event.title,
                                completionDate: event.schedule.endDate,
                                certificateUrl: `${process.env.FRONTEND_URL}/certificates/generate/${event._id}`,
                                certificateType: event.certificate.type || 'participation'
                            }
                        };

                        const channels = await this.sendMultiChannelReminder(registration.user, reminderContent);

                        await this.saveReminderRecord(
                            registration.user._id,
                            event._id,
                            'certificate_available',
                            reminderContent,
                            channels
                        );

                        sentCount++;

                    } catch (error) {
                        logger.error(`Gửi certificate reminder thất bại cho user ${registration.user._id}:`, error);
                    }
                }
            }

            if (sentCount > 0) {
                logger.info(`Đã gửi ${sentCount} certificate reminders`);
            }

        } catch (error) {
            logger.error('Send certificate reminders thất bại:', error);
        }
    }

    /**
     * Gửi reminder cho inactive users
     */
    async sendInactiveUserReminders() {
        try {
            logger.info('Gửi inactive user reminders...');

            const User = require('../models/User');
            const Reminder = require('../models/Reminder');

            // Users không login trong 14-60 ngày
            const fourteenDaysAgo = new Date(Date.now() - 14 * TIME_CONSTANTS.DAY);
            const twoMonthsAgo = new Date(Date.now() - 60 * TIME_CONSTANTS.DAY);

            const inactiveUsers = await User.find({
                lastLoginAt: {
                    $gte: twoMonthsAgo,
                    $lt: fourteenDaysAgo
                },
                isActive: true,
                'preferences.notifications.reengagement': { $ne: false }
            });

            let sentCount = 0;

            for (const user of inactiveUsers) {
                // Kiểm tra đã gửi reengagement reminder trong tháng qua chưa
                const recentReminder = await Reminder.findOne({
                    user: user._id,
                    type: 'reengagement',
                    createdAt: { $gte: new Date(Date.now() - 30 * TIME_CONSTANTS.DAY) }
                });

                if (recentReminder) continue;

                try {
                    const daysSinceLogin = Math.ceil((Date.now() - user.lastLoginAt) / TIME_CONSTANTS.DAY);
                    const newEventsCount = await this.getNewEventsForUser(user);
                    const recommendedEvents = await this.getRecommendedEvents(user, 3);

                    const reminderContent = {
                        type: 'reengagement',
                        title: 'Chúng tôi nhớ bạn!',
                        message: `Bạn đã không truy cập trong ${daysSinceLogin} ngày. Có ${newEventsCount} sự kiện mới thú vị đang chờ bạn khám phá!`,
                        priority: 'low',
                        data: {
                            userId: user._id,
                            daysSinceLogin,
                            newEventsCount,
                            recommendedEvents,
                            comebackBonus: 'Đăng nhập để nhận 100 điểm thưởng',
                            loginUrl: `${process.env.FRONTEND_URL}/login?comeback=true`
                        }
                    };

                    const channels = await this.sendMultiChannelReminder(user, reminderContent);

                    await this.saveReminderRecord(
                        user._id,
                        null,
                        'reengagement',
                        reminderContent,
                        channels
                    );

                    sentCount++;

                } catch (error) {
                    logger.error(`Gửi reengagement reminder thất bại cho user ${user._id}:`, error);
                }
            }

            if (sentCount > 0) {
                logger.info(`Đã gửi ${sentCount} reengagement reminders`);
            }

        } catch (error) {
            logger.error('Send inactive user reminders thất bại:', error);
        }
    }

    /**
     * Gửi reminder qua nhiều channel
     */
    async sendMultiChannelReminder(user, reminderContent) {
        const channels = [];
        const errors = [];

        // Email reminder
        if (user.preferences?.notifications?.email !== false) {
            try {
                await this.sendEmailReminder(user, reminderContent);
                channels.push('email');
            } catch (error) {
                errors.push({ channel: 'email', error: error.message });
                logger.error('Gửi email reminder thất bại:', error);
            }
        }

        // Push notification
        if (this.reminderConfig.enablePush && user.preferences?.notifications?.push !== false) {
            try {
                await this.sendPushReminder(user, reminderContent);
                channels.push('push');
            } catch (error) {
                errors.push({ channel: 'push', error: error.message });
                logger.error('Gửi push reminder thất bại:', error);
            }
        }

        // SMS reminder (chỉ cho urgent/high priority)
        if (this.reminderConfig.enableSMS &&
            user.preferences?.notifications?.sms === true &&
            user.profile?.phone &&
            ['urgent', 'high'].includes(reminderContent.priority)) {
            try {
                await this.sendSMSReminder(user, reminderContent);
                channels.push('sms');
            } catch (error) {
                errors.push({ channel: 'sms', error: error.message });
                logger.error('Gửi SMS reminder thất bại:', error);
            }
        }

        // In-app notification
        try {
            await this.createInAppNotification(user, reminderContent);
            channels.push('in_app');
        } catch (error) {
            errors.push({ channel: 'in_app', error: error.message });
            logger.error('Tạo in-app notification thất bại:', error);
        }

        // Log kết quả
        if (channels.length === 0) {
            logger.warn(`Không gửi được reminder qua channel nào cho user ${user._id}`, { errors });
        }

        return { channels, errors };
    }

    /**
     * Gửi email reminder
     */
    async sendEmailReminder(user, reminderContent) {
        const emailContent = this.formatEmailReminderContent(user, reminderContent);

        await emailService.sendEmail({
            to: user.email,
            subject: reminderContent.title,
            html: emailContent,
            priority: reminderContent.priority || 'medium',
            category: 'reminder'
        });

        logger.debug(`Email reminder đã gửi cho ${user.email}`, {
            type: reminderContent.type,
            priority: reminderContent.priority
        });
    }

    /**
     * Gửi push reminder
     */
    async sendPushReminder(user, reminderContent) {
        const pushData = {
            title: reminderContent.title,
            body: reminderContent.message,
            data: {
                type: reminderContent.type,
                ...reminderContent.data
            },
            badge: await this.getUnreadNotificationCount(user._id),
            sound: reminderContent.priority === 'urgent' ? 'urgent.wav' : 'default',
            priority: reminderContent.priority
        };

        await pushNotification.sendToUser(user._id, pushData);

        logger.debug(`Push reminder đã gửi cho user ${user._id}`, {
            type: reminderContent.type
        });
    }

    /**
     * Gửi SMS reminder
     */
    async sendSMSReminder(user, reminderContent) {
        if (!user.profile?.phone || !this.reminderConfig.enableSMS) return;

        const smsMessage = this.formatSMSContent(reminderContent);

        await smsService.sendSMS({
            to: user.profile.phone,
            message: smsMessage,
            priority: reminderContent.priority
        });

        logger.debug(`SMS reminder đã gửi cho ${user.profile.phone}`, {
            type: reminderContent.type
        });
    }

    /**
     * Tạo in-app notification
     */
    async createInAppNotification(user, reminderContent) {
        const Notification = require('../models/Notification');

        const notification = await Notification.create({
            user: user._id,
            title: reminderContent.title,
            message: reminderContent.message,
            type: reminderContent.type,
            data: reminderContent.data,
            priority: reminderContent.priority || 'medium',
            category: 'reminder',
            actionUrl: this.getActionUrl(reminderContent),
            expiresAt: new Date(Date.now() + 30 * TIME_CONSTANTS.DAY)
        });

        logger.debug(`In-app notification tạo cho user ${user._id}`, {
            notificationId: notification._id,
            type: reminderContent.type
        });

        return notification._id;
    }

    /**
     * Lưu reminder record
     */
    async saveReminderRecord(userId, eventId, type, content, channelResult) {
        const Reminder = require('../models/Reminder');

        await Reminder.create({
            user: userId,
            event: eventId,
            type,
            title: content.title,
            message: content.message,
            data: content.data,
            priority: content.priority,
            channels: channelResult.channels || [],
            channelErrors: channelResult.errors || [],
            sent: channelResult.channels.length > 0,
            sentAt: new Date(),
            status: channelResult.channels.length > 0 ? 'sent' : 'failed'
        });
    }

    /**
     * Xử lý reminder failure
     */
    async handleReminderFailure(userId, eventId, type, error, retryCount = 0) {
        try {
            const Reminder = require('../models/Reminder');

            if (retryCount >= this.reminderConfig.maxRetries) {
                await Reminder.create({
                    user: userId,
                    event: eventId,
                    type,
                    status: 'failed_permanent',
                    error: error.message,
                    retryCount,
                    failedAt: new Date()
                });
                return;
            }

            // Schedule retry với exponential backoff
            const retryDelay = Math.pow(2, retryCount) * this.reminderConfig.retryDelay;
            const nextRetry = new Date(Date.now() + retryDelay);

            const reminder = await Reminder.create({
                user: userId,
                event: eventId,
                type,
                status: 'retry_scheduled',
                retryCount: retryCount + 1,
                nextRetryAt: nextRetry,
                lastError: error.message,
                lastRetryAt: new Date()
            });

            // Schedule retry
            setTimeout(async () => {
                await this.retryReminder(reminder._id);
            }, retryDelay);

        } catch (updateError) {
            logger.error('Cập nhật reminder failure thất bại:', updateError);
        }
    }

    /**
     * Retry reminder
     */
    async retryReminder(reminderId) {
        try {
            const Reminder = require('../models/Reminder');
            const reminder = await Reminder.findById(reminderId).populate('user event');

            if (!reminder || reminder.status !== 'retry_scheduled') {
                return;
            }

            const reminderContent = {
                type: reminder.type,
                title: reminder.title,
                message: reminder.message,
                data: reminder.data,
                priority: reminder.priority
            };

            const channelResult = await this.sendMultiChannelReminder(reminder.user, reminderContent);

            if (channelResult.channels.length > 0) {
                await Reminder.findByIdAndUpdate(reminderId, {
                    status: 'sent',
                    sentAt: new Date(),
                    channels: channelResult.channels
                });

                logger.info(`Retry reminder thành công cho reminder ${reminderId}`);
            } else {
                throw new Error('Không gửi được qua channel nào');
            }

        } catch (error) {
            logger.error(`Retry reminder ${reminderId} thất bại:`, error);

            const reminder = await Reminder.findById(reminderId);
            if (reminder) {
                await this.handleReminderFailure(
                    reminder.user,
                    reminder.event,
                    reminder.type,
                    error,
                    reminder.retryCount
                );
            }
        }
    }

    // Helper methods
    shouldSendReminder(user, reminderType) {
        const preferences = user.preferences?.notifications || {};

        switch (reminderType) {
            case '1week':
            case '3days':
            case '1day':
                return preferences.eventReminders !== false;
            case '2hours':
            case '30min':
                return preferences.immediateReminders !== false;
            case 'deadline_2days':
            case 'deadline_1day':
            case 'deadline_6hours':
                return preferences.registrationReminders !== false;
            default:
                return preferences.email !== false;
        }
    }

    createEventReminderContent(event, registration, reminderConfig) {
        const isUrgent = ['30min', '2hours'].includes(reminderConfig.type);

        return {
            type: 'event_reminder',
            title: `${isUrgent ? '🚨 ' : '📅 '}Nhắc nhở: ${event.title}`,
            message: `Sự kiện "${event.title}" sẽ bắt đầu trong ${reminderConfig.label}. ${isUrgent ? 'Hãy chuẩn bị ngay!' : 'Đừng quên tham gia nhé!'}`,
            priority: reminderConfig.priority,
            data: {
                eventId: event._id,
                eventTitle: event.title,
                eventType: event.eventType,
                startTime: event.schedule.startDate,
                endTime: event.schedule.endDate,
                location: event.location,
                registrationId: registration._id,
                reminderType: reminderConfig.type,
                checkinRequired: event.checkinRequired,
                specialInstructions: event.reminderInstructions,
                contactOrganizer: event.organizer.email
            }
        };
    }

    createDeadlineReminderContent(event, user, reminderTime) {
        const isUrgent = reminderTime.hours <= 24;

        return {
            type: 'deadline_reminder',
            title: `${isUrgent ? '⏰ ' : '📢 '}Đăng ký sắp hết hạn`,
            message: `Đăng ký cho sự kiện "${event.title}" sẽ đóng trong ${reminderTime.label}. ${isUrgent ? 'Đăng ký ngay để không bỏ lỡ!' : 'Đừng bỏ lỡ cơ hội tham gia!'}`,
            priority: reminderTime.priority,
            data: {
                eventId: event._id,
                eventTitle: event.title,
                eventType: event.eventType,
                registrationDeadline: event.schedule.registrationEnd,
                startTime: event.schedule.startDate,
                remainingSlots: Math.max(0, event.registration.maxParticipants - (event.registration.currentCount || 0)),
                registerUrl: `${process.env.FRONTEND_URL}/events/${event._id}?utm_source=reminder&utm_medium=deadline`,
                eventHighlights: event.highlights || []
            }
        };
    }

    formatEmailReminderContent(user, reminderContent) {
        const isUrgent = reminderContent.priority === 'urgent';
        const colorScheme = isUrgent ? '#dc3545' : '#007bff';

        return `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
                <div style="background: linear-gradient(135deg, ${colorScheme} 0%, ${colorScheme}dd 100%); color: white; padding: 30px 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; color: white;">${reminderContent.title}</h1>
                </div>
                
                <div style="padding: 30px 20px; background-color: white;">
                    <p style="font-size: 16px; color: #333;">Xin chào <strong>${user.profile?.firstName || user.username}</strong>,</p>
                    
                    <div style="background-color: ${isUrgent ? '#fff5f5' : '#f8f9fa'}; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid {colorScheme};">
                        <p style="font-size: 16px; margin: 0; color: #333; line-height: 1.6;">${reminderContent.message}</p>
                    </div>
                    
                    ${this.formatEventDetails(reminderContent.data)}
                    
                    ${this.formatActionButtons(reminderContent.data)}
                    
                    ${reminderContent.data.checklist ? this.formatChecklist(reminderContent.data.checklist) : ''}
                    
                    ${reminderContent.data.specialOffers ? this.formatSpecialOffers(reminderContent.data.specialOffers) : ''}
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
                    <p style="margin: 0; font-size: 12px; color: #6c757d;">
                        Bạn nhận email này vì đã đăng ký nhận thông báo từ hệ thống quản lý sự kiện sinh viên.
                    </p>
                    <p style="margin: 10px 0 0 0;">
                        <a href="${process.env.FRONTEND_URL}/notifications/preferences" style="color: #6c757d; font-size: 12px;">Cài đặt thông báo</a> | 
                        <a href="${process.env.FRONTEND_URL}/unsubscribe?token=${user.unsubscribeToken}" style="color: #6c757d; font-size: 12px;">Hủy đăng ký</a>
                    </p>
                </div>
            </div>
        `;
    }

    formatEventDetails(data) {
        if (!data.eventTitle) return '';

        return `
            <div style="border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #007bff;">${data.eventTitle}</h3>
                ${data.startTime ? `<p><strong>🕐 Thời gian:</strong> ${new Date(data.startTime).toLocaleString('vi-VN')}</p>` : ''}
                ${data.endTime ? `<p><strong>🕐 Kết thúc:</strong> ${new Date(data.endTime).toLocaleString('vi-VN')}</p>` : ''}
                ${data.location?.venue ? `<p><strong>📍 Địa điểm:</strong> ${data.location.venue}</p>` : ''}
                ${data.location?.address ? `<p><strong>📍 Địa chỉ:</strong> ${data.location.address}</p>` : ''}
                ${data.eventType ? `<p><strong>🎯 Loại sự kiện:</strong> ${data.eventType}</p>` : ''}
                ${data.remainingSlots !== undefined ? `<p><strong>🎟️ Chỗ còn lại:</strong> ${data.remainingSlots}</p>` : ''}
            </div>
        `;
    }

    formatActionButtons(data) {
        const buttons = [];

        if (data.registerUrl) {
            buttons.push(`
                <a href="${data.registerUrl}" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">
                    📝 Đăng ký ngay
                </a>
            `);
        }

        if (data.checkinUrl) {
            buttons.push(`
                <a href="${data.checkinUrl}" style="background-color: #17a2b8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">
                    ✅ Check-in
                </a>
            `);
        }

        if (data.paymentUrl) {
            buttons.push(`
                <a href="${data.paymentUrl}" style="background-color: #ffc107; color: #212529; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">
                    💳 Thanh toán
                </a>
            `);
        }

        if (data.feedbackUrl) {
            buttons.push(`
                <a href="${data.feedbackUrl}" style="background-color: #6f42c1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">
                    ⭐ Đánh giá
                </a>
            `);
        }

        if (data.certificateUrl) {
            buttons.push(`
                <a href="${data.certificateUrl}" style="background-color: #fd7e14; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">
                    🏆 Tải chứng chỉ
                </a>
            `);
        }

        return buttons.length > 0 ? `
            <div style="text-align: center; margin: 30px 0;">
                ${buttons.join('')}
            </div>
        ` : '';
    }

    formatSMSContent(reminderContent) {
        let message = `${reminderContent.title}: ${reminderContent.message}`;

        if (reminderContent.data.registerUrl) {
            message += ` Đăng ký: ${reminderContent.data.registerUrl}`;
        } else if (reminderContent.data.checkinUrl) {
            message += ` Check-in: ${reminderContent.data.checkinUrl}`;
        } else if (reminderContent.data.paymentUrl) {
            message += ` Thanh toán: ${reminderContent.data.paymentUrl}`;
        }

        // Giới hạn độ dài SMS
        return message.length > 160 ? message.substring(0, 157) + '...' : message;
    }

    // Utility methods
    async findInterestedUsers(event) {
        const User = require('../models/User');

        return await User.find({
            isActive: true,
            emailVerified: true,
            'preferences.notifications.eventSuggestions': { $ne: false },
            $or: [
                { 'interests': { $in: [event.category.toString()] } },
                { 'student.faculty': { $in: event.targetAudience?.faculties || [] } },
                { 'student.year': { $in: event.targetAudience?.years || [] } },
                { 'student.major': { $in: event.targetAudience?.majors || [] } }
            ]
        }).limit(100);
    }

    getMissingProfileFields(user) {
        const requiredFields = {
            'Tên': !user.profile?.firstName,
            'Họ': !user.profile?.lastName,
            'Ảnh đại diện': !user.profile?.avatar,
            'Số điện thoại': !user.profile?.phone,
            'Ngày sinh': !user.profile?.dateOfBirth,
            'Giới thiệu bản thân': !user.profile?.bio,
            'Khoa': !user.student?.faculty,
            'Năm học': !user.student?.year,
            'Chuyên ngành': !user.student?.major
        };

        return Object.entries(requiredFields)
            .filter(([field, missing]) => missing)
            .map(([field]) => field);
    }

    calculateProfileCompletionRate(user) {
        const totalFields = 10;
        const completedFields = [
            user.profile?.firstName,
            user.profile?.lastName,
            user.profile?.avatar,
            user.profile?.phone,
            user.profile?.dateOfBirth,
            user.profile?.bio,
            user.student?.faculty,
            user.student?.year,
            user.student?.major,
            user.emailVerified
        ].filter(Boolean).length;

        return Math.round((completedFields / totalFields) * 100);
    }

    async getBirthdaySpecialOffers(user) {
        try {
            const Event = require('../models/Event');

            const specialEvents = await Event.find({
                'promotions.birthday': true,
                'schedule.startDate': { $gte: new Date() },
                'schedule.registrationEnd': { $gte: new Date() },
                status: 'published'
            }).limit(3).select('title promotions schedule');

            return specialEvents.map(event => ({
                id: event._id,
                title: event.title,
                discount: event.promotions?.birthdayDiscount || 10,
                validUntil: new Date(Date.now() + 7 * TIME_CONSTANTS.DAY),
                url: `${process.env.FRONTEND_URL}/events/${event._id}?promo=birthday&user=${user._id}`
            }));

        } catch (error) {
            logger.error('Lấy birthday special offers thất bại:', error);
            return [];
        }
    }

    async getProfileCompletionIncentives(user) {
        try {
            const completionRate = this.calculateProfileCompletionRate(user);
            const incentives = [];

            if (completionRate < 50) {
                incentives.push({
                    type: 'points',
                    title: 'Nhận 100 điểm',
                    description: 'Hoàn thành profile để nhận 100 điểm thưởng',
                    action: 'complete_profile'
                });
            }

            if (completionRate < 70) {
                incentives.push({
                    type: 'badge',
                    title: 'Profile Master Badge',
                    description: 'Badge đặc biệt cho profile hoàn chỉnh',
                    action: 'complete_profile'
                });
            }

            if (completionRate < 80) {
                incentives.push({
                    type: 'priority',
                    title: 'Ưu tiên đăng ký',
                    description: 'Profile đầy đủ được ưu tiên trong hàng chờ',
                    action: 'complete_profile'
                });
            }

            return incentives;

        } catch (error) {
            logger.error('Lấy profile completion incentives thất bại:', error);
            return [];
        }
    }

    getMarketingSuggestions(registrationRate, daysUntilEvent) {
        const suggestions = [];

        if (registrationRate < 20) {
            suggestions.push('Xem xét giảm giá hoặc ưu đãi đặc biệt');
            suggestions.push('Liên hệ các CLB, đoàn thể để quảng bá');
        }

        if (registrationRate < 30) {
            suggestions.push('Chia sẻ trên mạng xã hội với hashtag trending');
            suggestions.push('Gửi email marketing đến các nhóm target');
        }

        if (daysUntilEvent <= 3) {
            suggestions.push('Tạo sense of urgency: "Chỉ còn X ngày"');
            suggestions.push('Kích hoạt early bird promotion nếu có');
        }

        suggestions.push('Mời bạn bè và colleagues tham gia');
        suggestions.push('Post trong groups Facebook của trường');
        suggestions.push('Liên hệ page/fanpage lớn để share');

        return suggestions;
    }

    async generateEventChecklist(event) {
        const Registration = require('../models/Registration');

        const registrationCount = await Registration.countDocuments({
            event: event._id,
            status: { $in: ['approved', 'pending'] }
        });

        const pendingCount = await Registration.countDocuments({
            event: event._id,
            status: 'pending'
        });

        const checklist = [
            {
                task: 'Kiểm tra và phê duyệt đăng ký',
                completed: pendingCount === 0,
                details: `${pendingCount} đăng ký chờ phê duyệt`,
                priority: pendingCount > 0 ? 'high' : 'low'
            },
            {
                task: 'Chuẩn bị tài liệu và presentation',
                completed: false,
                details: 'Kiểm tra slide, handout, equipment',
                priority: 'high'
            },
            {
                task: 'Xác nhận địa điểm và setup',
                completed: false,
                details: 'Test AV equipment, sắp xếp ghế',
                priority: 'high'
            },
            {
                task: 'Chuẩn bị danh sách tham dự',
                completed: false,
                details: 'In danh sách, chuẩn bị name tags',
                priority: 'medium'
            },
            {
                task: 'Gửi thông tin last-minute cho participants',
                completed: false,
                details: 'Location details, parking info, etc.',
                priority: 'medium'
            }
        ];

        if (event.certificate?.enabled) {
            checklist.push({
                task: 'Chuẩn bị template chứng chỉ',
                completed: false,
                details: 'Kiểm tra template và thông tin',
                priority: 'low'
            });
        }

        return checklist;
    }

    formatChecklist(checklist) {
        if (!checklist || checklist.length === 0) return '';

        return `
            <div style="margin: 20px 0;">
                <h4 style="color: #007bff; margin-bottom: 15px;">📋 Checklist chuẩn bị sự kiện:</h4>
                ${checklist.map(item => `
                    <div style="display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="margin-right: 10px; font-size: 16px;">
                            ${item.completed ? '✅' : item.priority === 'high' ? '🔴' : '⚪'}
                        </span>
                        <div style="flex: 1;">
                            <strong style="color: ${item.completed ? '#28a745' : item.priority === 'high' ? '#dc3545' : '#6c757d'};">
                                ${item.task}
                            </strong>
                            ${item.details ? `<br><small style="color: #6c757d;">${item.details}</small>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    formatSpecialOffers(offers) {
        if (!offers || offers.length === 0) return '';

        return `
            <div style="background: linear-gradient(45deg, #ff6b6b, #feca57); padding: 20px; border-radius: 10px; margin: 20px 0; color: white;">
                <h4 style="margin-top: 0; color: white;">🎁 Ưu đãi đặc biệt dành cho bạn:</h4>
                ${offers.map(offer => `
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 5px; margin: 10px 0;">
                        <p style="margin: 0; font-weight: bold;">${offer.title}</p>
                        <p style="margin: 5px 0; font-size: 14px;">Giảm ${offer.discount}% - Có hiệu lực đến ${new Date(offer.validUntil).toLocaleDateString('vi-VN')}</p>
                        <a href="${offer.url}" style="color: white; text-decoration: underline;">Xem chi tiết</a>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getActionUrl(reminderContent) {
        const data = reminderContent.data;
        return data.registerUrl || data.checkinUrl || data.paymentUrl ||
            data.feedbackUrl || data.certificateUrl || data.managementUrl ||
            `${process.env.FRONTEND_URL}/dashboard`;
    }

    async getUnreadNotificationCount(userId) {
        try {
            const Notification = require('../models/Notification');
            return await Notification.countDocuments({
                user: userId,
                isRead: false
            });
        } catch (error) {
            return 0;
        }
    }

    async getNewEventsForUser(user) {
        const Event = require('../models/Event');
        return await Event.countDocuments({
            createdAt: { $gte: user.lastLoginAt },
            status: 'published',
            'schedule.startDate': { $gte: new Date() },
            $or: [
                { 'targetAudience.faculties': user.student?.faculty },
                { category: { $in: user.interests || [] } },
                { 'targetAudience.years': user.student?.year }
            ]
        });
    }

    async getRecommendedEvents(user, limit = 5) {
        const Event = require('../models/Event');
        const Registration = require('../models/Registration');

        // Lấy events user chưa đăng ký
        const registeredEventIds = await Registration.find({
            user: user._id
        }).distinct('event');

        return await Event.find({
            _id: { $nin: registeredEventIds },
            'schedule.startDate': { $gte: new Date() },
            'schedule.registrationEnd': { $gte: new Date() },
            status: 'published',
            $or: [
                { 'targetAudience.faculties': user.student?.faculty },
                { category: { $in: user.interests || [] } },
                { 'targetAudience.years': user.student?.year },
                { featured: true }
            ]
        })
            .sort({ 'schedule.startDate': 1, featured: -1 })
            .limit(limit)
            .select('title schedule.startDate location eventType category');
    }

    /**
     * Lấy reminder statistics
     */
    async getReminderStats(timeframe = '7d') {
        try {
            const Reminder = require('../models/Reminder');

            const startDate = new Date();
            switch (timeframe) {
                case '24h':
                    startDate.setDate(startDate.getDate() - 1);
                    break;
                case '7d':
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(startDate.getDate() - 30);
                    break;
            }

            const [sent, failed, pending, total] = await Promise.all([
                Reminder.countDocuments({
                    createdAt: { $gte: startDate },
                    status: 'sent'
                }),
                Reminder.countDocuments({
                    createdAt: { $gte: startDate },
                    status: { $in: ['failed', 'failed_permanent'] }
                }),
                Reminder.countDocuments({
                    createdAt: { $gte: startDate },
                    status: { $in: ['pending', 'retry_scheduled'] }
                }),
                Reminder.countDocuments({
                    createdAt: { $gte: startDate }
                })
            ]);

            // Stats theo type
            const typeStats = await Reminder.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $group: { _id: '$type', count: { $sum: 1 }, sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } } } },
                { $sort: { count: -1 } }
            ]);

            // Stats theo channel
            const channelStats = await Reminder.aggregate([
                { $match: { createdAt: { $gte: startDate }, status: 'sent' } },
                { $unwind: '$channels' },
                { $group: { _id: '$channels', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            return {
                summary: {
                    sent,
                    failed,
                    pending,
                    total,
                    successRate: total > 0 ? Math.round((sent / total) * 100) : 0
                },
                byType: typeStats.reduce((acc, item) => {
                    acc[item._id] = {
                        total: item.count,
                        sent: item.sent,
                        successRate: Math.round((item.sent / item.count) * 100)
                    };
                    return acc;
                }, {}),
                byChannel: channelStats.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                timeframe
            };

        } catch (error) {
            logger.error('Lấy reminder stats thất bại:', error);
            return null;
        }
    }

    /**
     * Tạo custom reminder
     */
    async createCustomReminder(reminderData) {
        try {
            const Reminder = require('../models/Reminder');

            // Validate input
            if (!reminderData.userId || !reminderData.title || !reminderData.message) {
                throw new Error('thiếu thông tin bắt buộc cho reminder');
            }

            const reminder = new Reminder({
                user: reminderData.userId,
                event: reminderData.eventId,
                type: reminderData.type || 'custom',
                title: reminderData.title,
                message: reminderData.message,
                data: reminderData.data || {},
                priority: reminderData.priority || 'medium',
                scheduledFor: reminderData.scheduledFor || new Date(),
                channels: reminderData.channels || ['email', 'push'],
                status: 'pending',
                createdBy: reminderData.createdBy
            });

            await reminder.save();

            // Nếu scheduled cho bây giờ, xử lý luôn
            if (!reminderData.scheduledFor || reminderData.scheduledFor <= new Date()) {
                const user = await User.findById(reminderData.userId);
                if (user) {
                    const reminderContent = {
                        type: reminder.type,
                        title: reminder.title,
                        message: reminder.message,
                        data: reminder.data,
                        priority: reminder.priority
                    };

                    const channelResult = await this.sendMultiChannelReminder(user, reminderContent);

                    await Reminder.findByIdAndUpdate(reminder._id, {
                        status: channelResult.channels.length > 0 ? 'sent' : 'failed',
                        sentAt: new Date(),
                        channels: channelResult.channels,
                        channelErrors: channelResult.errors
                    });
                }
            } else {
                // Schedule cho sau
                const delay = reminderData.scheduledFor.getTime() - Date.now();
                if (delay > 0 && delay < 24 * TIME_CONSTANTS.HOUR) { // Chỉ schedule trong 24h
                    setTimeout(async () => {
                        await this.processScheduledReminder(reminder._id);
                    }, delay);
                }
            }

            return reminder._id;

        } catch (error) {
            logger.error('Tạo custom reminder thất bại:', error);
            throw error;
        }
    }

    /**
     * Xử lý scheduled reminder
     */
    async processScheduledReminder(reminderId) {
        try {
            const Reminder = require('../models/Reminder');
            const User = require('../models/User');

            const reminder = await Reminder.findById(reminderId);
            if (!reminder || reminder.status !== 'pending') {
                return;
            }

            const user = await User.findById(reminder.user);
            if (!user || !user.isActive) {
                await Reminder.findByIdAndUpdate(reminderId, {
                    status: 'failed',
                    error: 'User không tồn tại hoặc không active'
                });
                return;
            }

            const reminderContent = {
                type: reminder.type,
                title: reminder.title,
                message: reminder.message,
                data: reminder.data,
                priority: reminder.priority
            };

            const channelResult = await this.sendMultiChannelReminder(user, reminderContent);

            await Reminder.findByIdAndUpdate(reminderId, {
                status: channelResult.channels.length > 0 ? 'sent' : 'failed',
                sentAt: new Date(),
                channels: channelResult.channels,
                channelErrors: channelResult.errors
            });

            logger.info(`Scheduled reminder ${reminderId} đã được xử lý`);

        } catch (error) {
            logger.error(`Xử lý scheduled reminder ${reminderId} thất bại:`, error);

            const Reminder = require('../models/Reminder');
            await Reminder.findByIdAndUpdate(reminderId, {
                status: 'failed',
                error: error.message,
                failedAt: new Date()
            });
        }
    }

    /**
     * Cancel reminder
     */
    async cancelReminder(reminderId, reason = '') {
        try {
            const Reminder = require('../models/Reminder');

            const result = await Reminder.findByIdAndUpdate(reminderId, {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancellationReason: reason
            });

            if (result) {
                logger.info(`Reminder ${reminderId} đã được hủy: ${reason}`);
                return true;
            }

            return false;

        } catch (error) {
            logger.error('Cancel reminder thất bại:', error);
            return false;
        }
    }

    /**
     * Batch cancel reminders
     */
    async cancelReminders(criteria, reason = '') {
        try {
            const Reminder = require('../models/Reminder');

            const result = await Reminder.updateMany(
                { ...criteria, status: { $in: ['pending', 'retry_scheduled'] } },
                {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancellationReason: reason
                }
            );

            logger.info(`Đã hủy ${result.modifiedCount} reminders: ${reason}`);
            return result.modifiedCount;

        } catch (error) {
            logger.error('Batch cancel reminders thất bại:', error);
            return 0;
        }
    }

    /**
     * Lấy trạng thái reminder jobs
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            config: this.reminderConfig,
            activeReminders: this.activeReminders.size,
            scheduledJobs: {
                eventReminders: 'Mỗi 5 phút',
                registrationDeadlines: '4 lần/ngày (9h, 13h, 17h, 21h)',
                birthdays: 'Hàng ngày lúc 8:00',
                profileCompletion: 'Thứ hai hàng tuần lúc 10:00',
                feedbackRequests: 'Hàng ngày lúc 20:00',
                paymentReminders: 'Hàng ngày lúc 9:00',
                checkinReminders: 'Mỗi 10 phút',
                organizerTasks: '2 lần/ngày (11h, 15h)',
                inactiveUsers: 'Thứ tư hàng tuần lúc 14:00',
                certificates: 'Hàng ngày lúc 12:00'
            },
            lastProcessed: new Date().toISOString()
        };
    }

    /**
     * Manual reminder execution
     */
    async sendManualReminder(type, options = {}) {
        try {
            logger.info(`Thực thi manual reminder: ${type}`);

            switch (type) {
                case 'event':
                    if (!options.reminderConfig) {
                        throw new Error('reminderConfig bắt buộc cho event reminder');
                    }
                    return await this.sendEventReminders(options.reminderConfig);

                case 'deadline':
                    return await this.sendRegistrationDeadlineReminders();

                case 'feedback':
                    return await this.sendFeedbackReminders();

                case 'payment':
                    return await this.sendPaymentReminders();

                case 'profile':
                    return await this.sendProfileCompletionReminders();

                case 'birthday':
                    return await this.sendBirthdayReminders();

                case 'checkin':
                    return await this.sendCheckinReminders();

                case 'organizer':
                    return await this.sendOrganizerTaskReminders();

                case 'inactive':
                    return await this.sendInactiveUserReminders();

                case 'certificate':
                    return await this.sendCertificateReminders();

                case 'custom':
                    return await this.createCustomReminder(options);

                default:
                    throw new Error(`Loại reminder không hỗ trợ: ${type}`);
            }
        } catch (error) {
            logger.error(`Manual reminder ${type} thất bại:`, error);
            throw error;
        }
    }

    /**
     * Pause/Resume reminder processing
     */
    async pauseReminders(duration = 0) {
        this.isProcessing = true;
        logger.info(`Reminder processing đã bị tạm dừng${duration ? ` trong ${duration}ms` : ''}`);

        if (duration > 0) {
            setTimeout(() => {
                this.isProcessing = false;
                logger.info('Reminder processing đã được khôi phục');
            }, duration);
        }
    }

    resumeReminders() {
        this.isProcessing = false;
        logger.info('Reminder processing đã được khôi phục');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new ReminderJobs();