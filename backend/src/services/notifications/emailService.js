const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const logger = require('../../utils/logger');
const redisClient = require('../../config/redis');

class EmailService {
    constructor() {
        this.transporter = null;
        this.templates = new Map();
        this.initializeTransporter();
        this.loadTemplates();
    }

    initializeTransporter() {
        try {
            this.transporter = nodemailer.createTransporter({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: process.env.EMAIL_PORT == 465,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                },
                pool: true,
                maxConnections: 5,
                maxMessages: 100,
                rateDelta: 1000,
                rateLimit: 10
            });

            // Verify connection
            this.transporter.verify((error, success) => {
                if (error) {
                    logger.error('Email service connection failed:', error);
                } else {
                    logger.info('Email service connected successfully');
                }
            });
        } catch (error) {
            logger.error('Email service initialization failed:', error);
        }
    }

    async loadTemplates() {
        try {
            const templatesDir = path.join(__dirname, '../../templates/email');
            const templateFiles = await fs.readdir(templatesDir);

            for (const file of templateFiles) {
                if (file.endsWith('.hbs') || file.endsWith('.handlebars')) {
                    const templateName = path.basename(file, path.extname(file));
                    const templateContent = await fs.readFile(path.join(templatesDir, file), 'utf8');
                    const template = handlebars.compile(templateContent);
                    this.templates.set(templateName, template);
                }
            }

            logger.info(`Loaded ${this.templates.size} email templates`);
        } catch (error) {
            logger.error('Failed to load email templates:', error);
        }
    }

    async sendEmail({ to, subject, template, data, html, text, attachments = [] }) {
        try {
            // Check if email is in cooldown (prevent spam)
            const cooldownKey = `email_cooldown:${to}`;
            const lastSent = await redisClient.get(cooldownKey);

            if (lastSent && Date.now() - parseInt(lastSent) < 60000) { // 1 minute cooldown
                logger.warn(`Email cooldown active for ${to}`);
                return { success: false, message: 'Email cooldown active' };
            }

            let emailHtml = html;
            let emailText = text;

            // Use template if specified
            if (template && this.templates.has(template)) {
                const templateFunc = this.templates.get(template);
                emailHtml = templateFunc(data || {});

                // Generate text version from HTML if not provided
                if (!emailText) {
                    emailText = this.htmlToText(emailHtml);
                }
            }

            const mailOptions = {
                from: {
                    name: 'Student Event Management',
                    address: process.env.EMAIL_FROM
                },
                to,
                subject,
                html: emailHtml,
                text: emailText,
                attachments
            };

            const result = await this.transporter.sendMail(mailOptions);

            // Set cooldown
            await redisClient.set(cooldownKey, Date.now().toString(), 60); // 1 minute

            // Log email sent
            await this.logEmailSent({
                to,
                subject,
                template,
                messageId: result.messageId,
                timestamp: new Date()
            });

            logger.info(`Email sent successfully to ${to}: ${subject}`);
            return { success: true, messageId: result.messageId };

        } catch (error) {
            logger.error('Email send error:', error);

            // Log failed email
            await this.logEmailFailed({
                to,
                subject,
                template,
                error: error.message,
                timestamp: new Date()
            });

            return { success: false, error: error.message };
        }
    }

    async sendBulkEmail({ recipients, subject, template, data, html, text, batchSize = 10 }) {
        try {
            const results = [];

            // Process in batches to avoid overwhelming the email service
            for (let i = 0; i < recipients.length; i += batchSize) {
                const batch = recipients.slice(i, i + batchSize);
                const batchPromises = batch.map(recipient => {
                    const recipientData = { ...data, ...recipient.data };
                    return this.sendEmail({
                        to: recipient.email,
                        subject,
                        template,
                        data: recipientData,
                        html,
                        text
                    });
                });

                const batchResults = await Promise.allSettled(batchPromises);
                results.push(...batchResults);

                // Add delay between batches
                if (i + batchSize < recipients.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;

            logger.info(`Bulk email completed: ${successful} sent, ${failed} failed`);
            return { successful, failed, results };

        } catch (error) {
            logger.error('Bulk email error:', error);
            throw error;
        }
    }

    // Predefined email methods
    async sendWelcomeEmail(user) {
        return this.sendEmail({
            to: user.email,
            subject: 'Welcome to Student Event Management!',
            template: 'welcome',
            data: {
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                loginUrl: `${process.env.FRONTEND_URL}/login`
            }
        });
    }

    async sendEmailVerificationEmail(user, token) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

        return this.sendEmail({
            to: user.email,
            subject: 'Verify Your Email Address',
            template: 'email-verification',
            data: {
                firstName: user.profile.firstName,
                verificationUrl,
                token
            }
        });
    }

    async sendPasswordResetEmail(user, token) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        return this.sendEmail({
            to: user.email,
            subject: 'Reset Your Password',
            template: 'password-reset',
            data: {
                firstName: user.profile.firstName,
                resetUrl,
                token,
                expiresIn: '30 minutes'
            }
        });
    }

    async sendPasswordChangedEmail(user) {
        return this.sendEmail({
            to: user.email,
            subject: 'Password Changed Successfully',
            template: 'password-changed',
            data: {
                firstName: user.profile.firstName,
                timestamp: new Date().toISOString(),
                supportUrl: `${process.env.FRONTEND_URL}/support`
            }
        });
    }

    async sendEventReminderEmail(user, event, reminderType = '24h') {
        const reminderTimes = {
            '1w': '1 week',
            '3d': '3 days',
            '1d': '1 day',
            '3h': '3 hours',
            '1h': '1 hour'
        };

        return this.sendEmail({
            to: user.email,
            subject: `Reminder: ${event.title} starts in ${reminderTimes[reminderType]}`,
            template: 'event-reminder',
            data: {
                firstName: user.profile.firstName,
                eventTitle: event.title,
                eventDate: event.schedule.startDate,
                eventTime: event.schedule.startDate,
                eventLocation: event.location.venue?.name || event.location.online?.platform,
                eventUrl: `${process.env.FRONTEND_URL}/events/${event.slug}`,
                reminderTime: reminderTimes[reminderType],
                qrCode: user.registration?.checkIn?.qrCode
            }
        });
    }

    async sendEventUpdateEmail(user, event, updateMessage) {
        return this.sendEmail({
            to: user.email,
            subject: `Important Update: ${event.title}`,
            template: 'event-update',
            data: {
                firstName: user.profile.firstName,
                eventTitle: event.title,
                updateMessage,
                eventUrl: `${process.env.FRONTEND_URL}/events/${event.slug}`,
                eventDate: event.schedule.startDate
            }
        });
    }

    async sendEventCancelledEmail(user, event, cancellationReason) {
        return this.sendEmail({
            to: user.email,
            subject: `Event Cancelled: ${event.title}`,
            template: 'event-cancelled',
            data: {
                firstName: user.profile.firstName,
                eventTitle: event.title,
                eventDate: event.schedule.startDate,
                cancellationReason,
                refundInfo: event.pricing.isFree ? null : 'Refunds will be processed within 5-7 business days'
            }
        });
    }

    async sendEventPostponedEmail(user, event, newDate, reason) {
        return this.sendEmail({
            to: user.email,
            subject: `Event Postponed: ${event.title}`,
            template: 'event-postponed',
            data: {
                firstName: user.profile.firstName,
                eventTitle: event.title,
                originalDate: event.schedule.startDate,
                newDate,
                reason,
                eventUrl: `${process.env.FRONTEND_URL}/events/${event.slug}`
            }
        });
    }

    async sendRegistrationConfirmationEmail(user, event, registration) {
        return this.sendEmail({
            to: user.email,
            subject: `Registration Confirmed: ${event.title}`,
            template: 'registration-confirmation',
            data: {
                firstName: user.profile.firstName,
                eventTitle: event.title,
                eventDate: event.schedule.startDate,
                eventLocation: event.location.venue?.name || event.location.online?.platform,
                registrationNumber: registration.registrationNumber,
                qrCode: registration.checkIn.qrCode,
                paymentRequired: registration.payment.required,
                paymentAmount: registration.payment.finalAmount,
                eventUrl: `${process.env.FRONTEND_URL}/events/${event.slug}`
            }
        });
    }

    async sendRegistrationApprovedEmail(user, event, registration) {
        return this.sendEmail({
            to: user.email,
            subject: `Registration Approved: ${event.title}`,
            template: 'registration-approved',
            data: {
                firstName: user.profile.firstName,
                eventTitle: event.title,
                eventDate: event.schedule.startDate,
                registrationNumber: registration.registrationNumber,
                eventUrl: `${process.env.FRONTEND_URL}/events/${event.slug}`
            }
        });
    }

    async sendRegistrationRejectedEmail(user, event, rejectionReason) {
        return this.sendEmail({
            to: user.email,
            subject: `Registration Not Approved: ${event.title}`,
            template: 'registration-rejected',
            data: {
                firstName: user.profile.firstName,
                eventTitle: event.title,
                rejectionReason,
                eventUrl: `${process.env.FRONTEND_URL}/events/${event.slug}`,
                supportUrl: `${process.env.FRONTEND_URL}/support`
            }
        });
    }

    async sendWaitlistNotificationEmail(user, event, position) {
        return this.sendEmail({
            to: user.email,
            subject: `You're on the waitlist: ${event.title}`,
            template: 'waitlist-notification',
            data: {
                firstName: user.profile.firstName,
                eventTitle: event.title,
                position,
                eventDate: event.schedule.startDate,
                eventUrl: `${process.env.FRONTEND_URL}/events/${event.slug}`
            }
        });
    }

    async sendWaitlistPromotionEmail(user, event, registration) {
        return this.sendEmail({
            to: user.email,
            subject: `Great News! You're confirmed for ${event.title}`,
            template: 'waitlist-promotion',
            data: {
                firstName: user.profile.firstName,
                eventTitle: event.title,
                eventDate: event.schedule.startDate,
                registrationNumber: registration.registrationNumber,
                deadlineToConfirm: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                eventUrl: `${process.env.FRONTEND_URL}/events/${event.slug}`
            }
        });
    }

    async sendCertificateReadyEmail(user, event, certificateUrl) {
        return this.sendEmail({
            to: user.email,
            subject: `Your Certificate is Ready: ${event.title}`,
            template: 'certificate-ready',
            data: {
                firstName: user.profile.firstName,
                eventTitle: event.title,
                certificateUrl,
                downloadUrl: `${process.env.FRONTEND_URL}/certificates/download/${certificateUrl}`
            }
        });
    }

    async sendFeedbackRequestEmail(user, event) {
        return this.sendEmail({
            to: user.email,
            subject: `How was your experience at ${event.title}?`,
            template: 'feedback-request',
            data: {
                firstName: user.profile.firstName,
                eventTitle: event.title,
                feedbackUrl: `${process.env.FRONTEND_URL}/events/${event.slug}/feedback`
            }
        });
    }

    async sendMonthlyNewsletterEmail(user, eventsData) {
        return this.sendEmail({
            to: user.email,
            subject: 'Your Monthly Event Digest',
            template: 'monthly-newsletter',
            data: {
                firstName: user.profile.firstName,
                upcomingEvents: eventsData.upcoming,
                recommendedEvents: eventsData.recommended,
                userStats: eventsData.userStats,
                unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(user.email)}`
            }
        });
    }

    async sendAccountDeactivationEmail(user) {
        return this.sendEmail({
            to: user.email,
            subject: 'Account Deactivated',
            template: 'account-deactivated',
            data: {
                firstName: user.profile.firstName,
                reactivateUrl: `${process.env.FRONTEND_URL}/reactivate`,
                supportUrl: `${process.env.FRONTEND_URL}/support`
            }
        });
    }

    async sendSecurityAlertEmail(user, alertType, details) {
        const alertMessages = {
            'login_new_device': 'New device login detected',
            'password_changed': 'Password was changed',
            'email_changed': 'Email address was changed',
            'suspicious_activity': 'Suspicious activity detected'
        };

        return this.sendEmail({
            to: user.email,
            subject: `Security Alert: ${alertMessages[alertType]}`,
            template: 'security-alert',
            data: {
                firstName: user.profile.firstName,
                alertType: alertMessages[alertType],
                details,
                timestamp: new Date().toISOString(),
                securityUrl: `${process.env.FRONTEND_URL}/security`,
                supportUrl: `${process.env.FRONTEND_URL}/support`
            }
        });
    }

    // Admin notification emails
    async sendAdminNotificationEmail(adminEmail, subject, message, data = {}) {
        return this.sendEmail({
            to: adminEmail,
            subject: `[ADMIN] ${subject}`,
            template: 'admin-notification',
            data: {
                subject,
                message,
                timestamp: new Date().toISOString(),
                adminDashboardUrl: `${process.env.FRONTEND_URL}/admin`,
                ...data
            }
        });
    }

    async sendNewUserRegistrationNotification(adminEmail, user) {
        return this.sendAdminNotificationEmail(
            adminEmail,
            'New User Registration',
            `New user ${user.profile.fullName} (${user.email}) has registered.`,
            {
                userEmail: user.email,
                userFullName: user.profile.fullName,
                registrationDate: user.createdAt,
                userRole: user.role
            }
        );
    }

    async sendEventCreatedNotification(adminEmail, event, organizer) {
        return this.sendAdminNotificationEmail(
            adminEmail,
            'New Event Created',
            `New event "${event.title}" has been created by ${organizer.profile.fullName}.`,
            {
                eventTitle: event.title,
                organizerName: organizer.profile.fullName,
                organizerEmail: organizer.email,
                eventDate: event.schedule.startDate,
                eventUrl: `${process.env.FRONTEND_URL}/admin/events/${event._id}`
            }
        );
    }

    // Utility methods
    htmlToText(html) {
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
    }

    async logEmailSent(emailData) {
        try {
            const logKey = `email_log:sent:${Date.now()}`;
            await redisClient.set(logKey, emailData, 7 * 24 * 60 * 60); // 7 days
        } catch (error) {
            logger.error('Failed to log sent email:', error);
        }
    }

    async logEmailFailed(emailData) {
        try {
            const logKey = `email_log:failed:${Date.now()}`;
            await redisClient.set(logKey, emailData, 7 * 24 * 60 * 60); // 7 days
        } catch (error) {
            logger.error('Failed to log failed email:', error);
        }
    }

    async getEmailStats(days = 7) {
        try {
            const stats = {
                sent: 0,
                failed: 0,
                total: 0
            };

            // This is a simplified version - in production you might want to use a proper analytics service
            const sentLogs = await redisClient.get('email_stats:sent') || 0;
            const failedLogs = await redisClient.get('email_stats:failed') || 0;

            stats.sent = parseInt(sentLogs);
            stats.failed = parseInt(failedLogs);
            stats.total = stats.sent + stats.failed;

            return stats;
        } catch (error) {
            logger.error('Failed to get email stats:', error);
            return { sent: 0, failed: 0, total: 0 };
        }
    }

    async testConnection() {
        try {
            await this.transporter.verify();
            return { success: true, message: 'Email service connection successful' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Template management
    async addTemplate(name, templateContent) {
        try {
            const template = handlebars.compile(templateContent);
            this.templates.set(name, template);

            // Save to file system
            const templatesDir = path.join(__dirname, '../../templates/email');
            const filePath = path.join(templatesDir, `${name}.hbs`);
            await fs.writeFile(filePath, templateContent, 'utf8');

            return { success: true, message: 'Template added successfully' };
        } catch (error) {
            logger.error('Failed to add template:', error);
            return { success: false, message: error.message };
        }
    }

    getTemplateList() {
        return Array.from(this.templates.keys());
    }

    async previewTemplate(templateName, data) {
        try {
            if (!this.templates.has(templateName)) {
                throw new Error('Template not found');
            }

            const template = this.templates.get(templateName);
            const html = template(data);

            return { success: true, html };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

module.exports = new EmailService();