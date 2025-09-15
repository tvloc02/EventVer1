const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
    }

    async initialize() {
        try {
            // Create transporter based on environment
            if (process.env.EMAIL_SERVICE === 'gmail') {
                this.transporter = nodemailer.createTransporter({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD
                    }
                });
            } else if (process.env.EMAIL_SERVICE === 'outlook') {
                this.transporter = nodemailer.createTransporter({
                    service: 'hotmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD
                    }
                });
            } else if (process.env.EMAIL_SERVICE === 'smtp') {
                this.transporter = nodemailer.createTransporter({
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT || 587,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASSWORD
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });
            } else if (process.env.NODE_ENV === 'development') {
                // Use Ethereal Email for development
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransporter({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });
                logger.info('Using Ethereal Email for development');
            } else {
                throw new Error('Email service not configured');
            }

            // Verify transporter
            await this.transporter.verify();
            this.isConfigured = true;
            logger.info('Email service initialized successfully');

        } catch (error) {
            logger.error('Email service initialization failed:', error);
            this.isConfigured = false;
        }
    }

    async sendEmail(options) {
        if (!this.isConfigured) {
            logger.error('Email service not configured');
            return { success: false, error: 'Email service not configured' };
        }

        try {
            const mailOptions = {
                from: options.from || process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: options.to,
                cc: options.cc,
                bcc: options.bcc,
                subject: options.subject,
                text: options.text,
                html: options.html,
                attachments: options.attachments,
                headers: options.headers
            };

            const info = await this.transporter.sendMail(mailOptions);

            logger.logEmail('outgoing', options.to, options.subject, 'sent');

            // For development with Ethereal
            if (process.env.NODE_ENV === 'development') {
                logger.info('Preview URL: ' + nodemailer.getTestMessageUrl(info));
            }

            return {
                success: true,
                messageId: info.messageId,
                response: info.response
            };

        } catch (error) {
            logger.error('Failed to send email:', error);
            logger.logEmail('outgoing', options.to, options.subject, 'failed');

            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendWelcomeEmail(user, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Chào mừng đến với Hệ thống Quản lý Sự kiện!</h2>
                
                <p>Xin chào ${user.profile?.firstName || user.username},</p>
                
                <p>Cảm ơn bạn đã đăng ký tài khoản. Để hoàn tất quá trình đăng ký, vui lòng xác thực email của bạn bằng cách nhấp vào liên kết bên dưới:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" 
                       style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Xác thực Email
                    </a>
                </div>
                
                <p>Hoặc sao chép và dán liên kết sau vào trình duyệt:</p>
                <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                
                <p>Liên kết này sẽ hết hạn sau 24 giờ.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="color: #666; font-size: 14px;">
                    Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
                </p>
            </div>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: 'Xác thực tài khoản của bạn',
            html
        });
    }

    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Đặt lại mật khẩu</h2>
                
                <p>Xin chào ${user.profile?.firstName || user.username},</p>
                
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấp vào liên kết bên dưới để tạo mật khẩu mới:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Đặt lại mật khẩu
                    </a>
                </div>
                
                <p>Hoặc sao chép và dán liên kết sau vào trình duyệt:</p>
                <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                
                <p>Liên kết này sẽ hết hạn sau 1 giờ.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="color: #666; font-size: 14px;">
                    Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.
                </p>
            </div>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: 'Đặt lại mật khẩu',
            html
        });
    }

    async sendEventRegistrationEmail(user, event, registration) {
        const eventUrl = `${process.env.FRONTEND_URL}/events/${event.slug || event._id}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Đăng ký sự kiện thành công</h2>
                
                <p>Xin chào ${user.profile?.firstName || user.username},</p>
                
                <p>Bạn đã đăng ký thành công cho sự kiện:</p>
                
                <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 5px;">
                    <h3 style="margin-top: 0; color: #007bff;">${event.title}</h3>
                    <p><strong>Thời gian:</strong> ${new Date(event.schedule.startDate).toLocaleString('vi-VN')}</p>
                    <p><strong>Địa điểm:</strong> ${event.location?.venue || 'Trực tuyến'}</p>
                    <p><strong>Mã đăng ký:</strong> ${registration._id}</p>
                    <p><strong>Trạng thái:</strong> ${this.getRegistrationStatusText(registration.status)}</p>
                </div>
                
                ${registration.status === 'pending' ? `
                    <p style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
                        <strong>Lưu ý:</strong> Đăng ký của bạn đang chờ phê duyệt từ ban tổ chức.
                    </p>
                ` : ''}
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${eventUrl}" 
                       style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Xem chi tiết sự kiện
                    </a>
                </div>
                
                <p>Cảm ơn bạn đã tham gia!</p>
            </div>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: `Đăng ký sự kiện: ${event.title}`,
            html
        });
    }

    async sendEventReminderEmail(user, event, registration) {
        const eventUrl = `${process.env.FRONTEND_URL}/events/${event.slug || event._id}`;
        const startTime = new Date(event.schedule.startDate);

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">🔔 Nhắc nhở sự kiện</h2>
                
                <p>Xin chào ${user.profile?.firstName || user.username},</p>
                
                <p>Đây là lời nhắc nhở về sự kiện bạn đã đăng ký:</p>
                
                <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 5px; background-color: #f8f9fa;">
                    <h3 style="margin-top: 0; color: #007bff;">${event.title}</h3>
                    <p><strong>⏰ Thời gian:</strong> ${startTime.toLocaleString('vi-VN')}</p>
                    <p><strong>📍 Địa điểm:</strong> ${event.location?.venue || 'Trực tuyến'}</p>
                    ${event.location?.address ? `<p><strong>Địa chỉ:</strong> ${event.location.address}</p>` : ''}
                    ${event.location?.onlineUrl ? `<p><strong>Link tham gia:</strong> <a href="${event.location.onlineUrl}">${event.location.onlineUrl}</a></p>` : ''}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${eventUrl}" 
                       style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Xem chi tiết
                    </a>
                </div>
                
                <p style="color: #666;">Hẹn gặp bạn tại sự kiện!</p>
            </div>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: `Nhắc nhở: ${event.title} - ${startTime.toLocaleDateString('vi-VN')}`,
            html
        });
    }

    async sendEventCancelledEmail(user, event, reason) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc3545;">❌ Sự kiện đã bị hủy</h2>
                
                <p>Xin chào ${user.profile?.firstName || user.username},</p>
                
                <p>Chúng tôi rất tiếc phải thông báo rằng sự kiện sau đã bị hủy:</p>
                
                <div style="border: 1px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 5px; background-color: #f8d7da;">
                    <h3 style="margin-top: 0; color: #dc3545;">${event.title}</h3>
                    <p><strong>Thời gian ban đầu:</strong> ${new Date(event.schedule.startDate).toLocaleString('vi-VN')}</p>
                    <p><strong>Lý do hủy:</strong> ${reason}</p>
                </div>
                
                <p>Chúng tôi xin lỗi vì sự bất tiện này. Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với ban tổ chức.</p>
                
                <p>Cảm ơn sự thông hiểu của bạn.</p>
            </div>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: `Hủy sự kiện: ${event.title}`,
            html
        });
    }

    async sendBulkEmail(recipients, subject, template, data = {}) {
        const results = [];

        for (const recipient of recipients) {
            try {
                const personalizedData = { ...data, user: recipient };
                const html = this.renderTemplate(template, personalizedData);

                const result = await this.sendEmail({
                    to: recipient.email,
                    subject: subject,
                    html
                });

                results.push({
                    email: recipient.email,
                    success: result.success,
                    messageId: result.messageId
                });

                // Add delay to avoid rate limiting
                await this.delay(100);

            } catch (error) {
                results.push({
                    email: recipient.email,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    async sendNewsletterEmail(subscribers, subject, content) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">Newsletter</h1>
                </div>
                
                <div style="padding: 20px;">
                    ${content}
                </div>
                
                <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                    <p>Bạn nhận được email này vì đã đăng ký nhận newsletter từ chúng tôi.</p>
                    <p><a href="${process.env.FRONTEND_URL}/unsubscribe?token={{unsubscribeToken}}" style="color: #666;">Hủy đăng ký</a></p>
                </div>
            </div>
        `;

        return await this.sendBulkEmail(subscribers, subject, 'newsletter', { content });
    }

    renderTemplate(template, data) {
        // Simple template rendering - replace {{variable}} with data values
        let rendered = template;

        const replacePlaceholders = (obj, prefix = '') => {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'object' && value !== null) {
                    replacePlaceholders(value, `${prefix}${key}.`);
                } else {
                    const placeholder = `{{${prefix}${key}}}`;
                    rendered = rendered.replace(new RegExp(placeholder, 'g'), value || '');
                }
            }
        };

        replacePlaceholders(data);
        return rendered;
    }

    getRegistrationStatusText(status) {
        const statusMap = {
            'pending': 'Chờ phê duyệt',
            'approved': 'Đã phê duyệt',
            'rejected': 'Bị từ chối',
            'cancelled': 'Đã hủy',
            'waitlist': 'Danh sách chờ',
            'attended': 'Đã tham dự',
            'no_show': 'Không tham dự'
        };

        return statusMap[status] || status;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async testConnection() {
        try {
            if (!this.transporter) {
                throw new Error('Transporter not initialized');
            }

            await this.transporter.verify();
            return { success: true, message: 'Email service is working' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async sendTestEmail(to) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Email Service Test</h2>
                <p>This is a test email to verify that the email service is working correctly.</p>
                <p>Sent at: ${new Date().toLocaleString()}</p>
            </div>
        `;

        return await this.sendEmail({
            to,
            subject: 'Email Service Test',
            html
        });
    }

    isConfigured() {
        return this.isConfigured;
    }

    getTransporter() {
        return this.transporter;
    }

    async getEmailStats() {
        // This would typically connect to your email service's API
        // For now, return mock data
        return {
            sent: 0,
            delivered: 0,
            bounced: 0,
            complaints: 0,
            lastUpdated: new Date()
        };
    }

    async createEmailTemplate(name, subject, html) {
        // Store email templates in database
        // This is a placeholder implementation
        try {
            const EmailTemplate = require('../models/EmailTemplate');

            const template = new EmailTemplate({
                name,
                subject,
                html,
                createdAt: new Date()
            });

            await template.save();
            return { success: true, template };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getEmailTemplate(name) {
        try {
            const EmailTemplate = require('../models/EmailTemplate');
            const template = await EmailTemplate.findOne({ name });
            return template;
        } catch (error) {
            logger.error('Error getting email template:', error);
            return null;
        }
    }

    async sendEmailWithTemplate(templateName, to, data = {}) {
        try {
            const template = await this.getEmailTemplate(templateName);
            if (!template) {
                throw new Error(`Template ${templateName} not found`);
            }

            const subject = this.renderTemplate(template.subject, data);
            const html = this.renderTemplate(template.html, data);

            return await this.sendEmail({
                to,
                subject,
                html
            });
        } catch (error) {
            logger.error('Error sending email with template:', error);
            return { success: false, error: error.message };
        }
    }

    // Email queue management
    async addToQueue(emailData) {
        try {
            const EmailQueue = require('../models/EmailQueue');

            const queueItem = new EmailQueue({
                to: emailData.to,
                subject: emailData.subject,
                html: emailData.html,
                template: emailData.template,
                data: emailData.data,
                priority: emailData.priority || 'normal',
                scheduledFor: emailData.scheduledFor || new Date(),
                status: 'pending'
            });

            await queueItem.save();
            return { success: true, queueId: queueItem._id };
        } catch (error) {
            logger.error('Error adding email to queue:', error);
            return { success: false, error: error.message };
        }
    }

    async processQueue() {
        try {
            const EmailQueue = require('../models/EmailQueue');

            const pendingEmails = await EmailQueue.find({
                status: 'pending',
                scheduledFor: { $lte: new Date() }
            }).sort({ priority: -1, scheduledFor: 1 }).limit(10);

            const results = [];

            for (const emailItem of pendingEmails) {
                try {
                    let result;

                    if (emailItem.template && emailItem.data) {
                        result = await this.sendEmailWithTemplate(
                            emailItem.template,
                            emailItem.to,
                            emailItem.data
                        );
                    } else {
                        result = await this.sendEmail({
                            to: emailItem.to,
                            subject: emailItem.subject,
                            html: emailItem.html
                        });
                    }

                    await EmailQueue.findByIdAndUpdate(emailItem._id, {
                        status: result.success ? 'sent' : 'failed',
                        sentAt: new Date(),
                        error: result.success ? null : result.error,
                        messageId: result.messageId
                    });

                    results.push({
                        id: emailItem._id,
                        success: result.success,
                        error: result.error
                    });

                } catch (error) {
                    await EmailQueue.findByIdAndUpdate(emailItem._id, {
                        status: 'failed',
                        error: error.message,
                        attemptedAt: new Date()
                    });

                    results.push({
                        id: emailItem._id,
                        success: false,
                        error: error.message
                    });
                }

                // Add delay between emails
                await this.delay(200);
            }

            return { processed: results.length, results };
        } catch (error) {
            logger.error('Error processing email queue:', error);
            return { processed: 0, error: error.message };
        }
    }
}

module.exports = new EmailService();