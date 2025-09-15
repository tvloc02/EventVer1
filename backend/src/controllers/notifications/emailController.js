const emailService = require('../../services/notifications/emailService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class EmailController {
    // Gửi email đơn lẻ
    async sendSingleEmail(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const emailData = {
                to: req.body.to,
                subject: req.body.subject,
                html: req.body.html,
                text: req.body.text,
                attachments: req.body.attachments,
                template: req.body.template,
                templateData: req.body.templateData
            };

            const result = await emailService.sendEmail(emailData);

            res.json({
                success: true,
                message: 'Gửi email thành công',
                data: {
                    messageId: result.messageId,
                    accepted: result.accepted,
                    rejected: result.rejected
                }
            });

        } catch (error) {
            logger.error('Send single email controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Gửi email thất bại'
            });
        }
    }

    // Gửi email hàng loạt
    async sendBulkEmail(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const bulkEmailData = {
                recipients: req.body.recipients,
                subject: req.body.subject,
                html: req.body.html,
                text: req.body.text,
                template: req.body.template,
                batchSize: req.body.batchSize || 50,
                delayBetweenBatches: req.body.delayBetweenBatches || 1000
            };

            const result = await emailService.sendBulkEmail(bulkEmailData, req.user.userId);

            res.json({
                success: true,
                message: 'Bắt đầu gửi email hàng loạt',
                data: {
                    batchId: result.batchId,
                    totalRecipients: result.totalRecipients,
                    estimatedTime: result.estimatedTime
                }
            });

        } catch (error) {
            logger.error('Send bulk email controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Gửi email hàng loạt thất bại'
            });
        }
    }

    // Lấy trạng thái gửi email hàng loạt
    async getBulkEmailStatus(req, res) {
        try {
            const { batchId } = req.params;

            const status = await emailService.getBulkEmailStatus(batchId);

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            logger.error('Get bulk email status controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Lấy trạng thái email thất bại'
            });
        }
    }

    // Hủy gửi email hàng loạt
    async cancelBulkEmail(req, res) {
        try {
            const { batchId } = req.params;

            const result = await emailService.cancelBulkEmail(batchId, req.user.userId);

            res.json({
                success: true,
                message: 'Hủy gửi email hàng loạt thành công',
                data: result
            });

        } catch (error) {
            logger.error('Cancel bulk email controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Hủy gửi email thất bại'
            });
        }
    }

    // Lấy lịch sử gửi email
    async getEmailHistory(req, res) {
        try {
            const filters = {
                recipient: req.query.recipient,
                subject: req.query.subject,
                status: req.query.status,
                template: req.query.template,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                sender: req.query.sender
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50,
                sortBy: req.query.sortBy || 'sentAt',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const result = await emailService.getEmailHistory(filters, pagination);

            res.json({
                success: true,
                data: result.emails,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get email history controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy lịch sử email thất bại'
            });
        }
    }

    // Lấy chi tiết email
    async getEmailDetails(req, res) {
        try {
            const { emailId } = req.params;

            const email = await emailService.getEmailById(emailId);

            if (!email) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy email'
                });
            }

            res.json({
                success: true,
                data: email
            });

        } catch (error) {
            logger.error('Get email details controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy chi tiết email thất bại'
            });
        }
    }

    // Gửi lại email thất bại
    async resendFailedEmail(req, res) {
        try {
            const { emailId } = req.params;

            const result = await emailService.resendFailedEmail(emailId, req.user.userId);

            res.json({
                success: true,
                message: 'Gửi lại email thành công',
                data: result
            });

        } catch (error) {
            logger.error('Resend failed email controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Gửi lại email thất bại'
            });
        }
    }

    // Lấy template email
    async getEmailTemplates(req, res) {
        try {
            const { category, active } = req.query;

            const templates = await emailService.getEmailTemplates(category, active);

            res.json({
                success: true,
                data: templates
            });

        } catch (error) {
            logger.error('Get email templates controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy template email thất bại'
            });
        }
    }

    // Tạo template email
    async createEmailTemplate(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const templateData = {
                name: req.body.name,
                description: req.body.description,
                category: req.body.category,
                subject: req.body.subject,
                html: req.body.html,
                text: req.body.text,
                variables: req.body.variables || [],
                isActive: req.body.isActive !== false
            };

            const template = await emailService.createEmailTemplate(templateData, req.user.userId);

            res.status(201).json({
                success: true,
                message: 'Tạo template email thành công',
                data: template
            });

        } catch (error) {
            logger.error('Create email template controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo template email thất bại'
            });
        }
    }

    // Cập nhật template email
    async updateEmailTemplate(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { templateId } = req.params;

            const updateData = {
                name: req.body.name,
                description: req.body.description,
                category: req.body.category,
                subject: req.body.subject,
                html: req.body.html,
                text: req.body.text,
                variables: req.body.variables,
                isActive: req.body.isActive
            };

            const template = await emailService.updateEmailTemplate(templateId, updateData, req.user.userId);

            res.json({
                success: true,
                message: 'Cập nhật template email thành công',
                data: template
            });

        } catch (error) {
            logger.error('Update email template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Cập nhật template email thất bại'
            });
        }
    }

    // Xóa template email
    async deleteEmailTemplate(req, res) {
        try {
            const { templateId } = req.params;

            await emailService.deleteEmailTemplate(templateId, req.user.userId);

            res.json({
                success: true,
                message: 'Xóa template email thành công'
            });

        } catch (error) {
            logger.error('Delete email template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Xóa template email thất bại'
            });
        }
    }

    // Xem trước template email
    async previewEmailTemplate(req, res) {
        try {
            const { templateId } = req.params;
            const { templateData = {} } = req.body;

            const preview = await emailService.previewEmailTemplate(templateId, templateData);

            res.json({
                success: true,
                data: preview
            });

        } catch (error) {
            logger.error('Preview email template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Xem trước template thất bại'
            });
        }
    }

    // Kiểm tra tình trạng email (deliverability)
    async checkEmailDeliverability(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email không được để trống'
                });
            }

            const result = await emailService.checkEmailDeliverability(email);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Check email deliverability controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Kiểm tra tình trạng email thất bại'
            });
        }
    }

    // Lấy thống kê email
    async getEmailStatistics(req, res) {
        try {
            const { timeframe = '30d', groupBy = 'day' } = req.query;

            const stats = await emailService.getEmailStatistics(timeframe, groupBy);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get email statistics controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy thống kê email thất bại'
            });
        }
    }

    // Cấu hình SMTP
    async updateSMTPConfig(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            // Only admin can update SMTP config
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền cấu hình SMTP'
                });
            }

            const smtpConfig = {
                host: req.body.host,
                port: req.body.port,
                secure: req.body.secure,
                auth: {
                    user: req.body.user,
                    pass: req.body.pass
                },
                from: req.body.from,
                replyTo: req.body.replyTo
            };

            const result = await emailService.updateSMTPConfig(smtpConfig, req.user.userId);

            res.json({
                success: true,
                message: 'Cập nhật cấu hình SMTP thành công',
                data: result
            });

        } catch (error) {
            logger.error('Update SMTP config controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Cập nhật cấu hình SMTP thất bại'
            });
        }
    }

    // Kiểm tra kết nối SMTP
    async testSMTPConnection(req, res) {
        try {
            // Only admin can test SMTP connection
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền kiểm tra kết nối SMTP'
                });
            }

            const result = await emailService.testSMTPConnection();

            res.json({
                success: true,
                message: result.success ? 'Kết nối SMTP thành công' : 'Kết nối SMTP thất bại',
                data: result
            });

        } catch (error) {
            logger.error('Test SMTP connection controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Kiểm tra kết nối SMTP thất bại'
            });
        }
    }

    // Gửi email test
    async sendTestEmail(req, res) {
        try {
            const { recipient } = req.body;

            if (!recipient) {
                return res.status(400).json({
                    success: false,
                    message: 'Email người nhận không được để trống'
                });
            }

            const result = await emailService.sendTestEmail(recipient, req.user.userId);

            res.json({
                success: true,
                message: 'Gửi email test thành công',
                data: result
            });

        } catch (error) {
            logger.error('Send test email controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Gửi email test thất bại'
            });
        }
    }

    // Quản lý blacklist email
    async addToBlacklist(req, res) {
        try {
            const { email, reason } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email không được để trống'
                });
            }

            const result = await emailService.addToBlacklist(email, reason, req.user.userId);

            res.json({
                success: true,
                message: 'Thêm vào blacklist thành công',
                data: result
            });

        } catch (error) {
            logger.error('Add to blacklist controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Thêm vào blacklist thất bại'
            });
        }
    }

    // Xóa khỏi blacklist
    async removeFromBlacklist(req, res) {
        try {
            const { email } = req.params;

            const result = await emailService.removeFromBlacklist(email, req.user.userId);

            res.json({
                success: true,
                message: 'Xóa khỏi blacklist thành công',
                data: result
            });

        } catch (error) {
            logger.error('Remove from blacklist controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Xóa khỏi blacklist thất bại'
            });
        }
    }

    // Lấy danh sách blacklist
    async getBlacklist(req, res) {
        try {
            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            };

            const result = await emailService.getBlacklist(pagination);

            res.json({
                success: true,
                data: result.blacklist,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get blacklist controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy danh sách blacklist thất bại'
            });
        }
    }

    // Xuất lịch sử email
    async exportEmailHistory(req, res) {
        try {
            const { format = 'xlsx' } = req.query;

            const filters = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                status: req.query.status,
                template: req.query.template
            };

            const emails = await emailService.getEmailsForExport(filters);

            const exportService = require('../../services/analytics/exportService');
            const fileBuffer = await exportService.exportEmails(emails, format);

            const filename = `email_history_${Date.now()}.${format}`;

            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-Type', exportService.getContentType(format));

            res.send(fileBuffer);

        } catch (error) {
            logger.error('Export email history controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Xuất lịch sử email thất bại'
            });
        }
    }

    // Lên lịch gửi email
    async scheduleEmail(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const scheduleData = {
                recipients: req.body.recipients,
                subject: req.body.subject,
                html: req.body.html,
                text: req.body.text,
                template: req.body.template,
                templateData: req.body.templateData,
                scheduledFor: new Date(req.body.scheduledFor),
                timezone: req.body.timezone || 'UTC'
            };

            const result = await emailService.scheduleEmail(scheduleData, req.user.userId);

            res.status(201).json({
                success: true,
                message: 'Lên lịch gửi email thành công',
                data: result
            });

        } catch (error) {
            logger.error('Schedule email controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lên lịch gửi email thất bại'
            });
        }
    }

    // Hủy email đã lên lịch
    async cancelScheduledEmail(req, res) {
        try {
            const { scheduleId } = req.params;

            const result = await emailService.cancelScheduledEmail(scheduleId, req.user.userId);

            res.json({
                success: true,
                message: 'Hủy lịch gửi email thành công',
                data: result
            });

        } catch (error) {
            logger.error('Cancel scheduled email controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Hủy lịch gửi email thất bại'
            });
        }
    }

    // Lấy danh sách email đã lên lịch
    async getScheduledEmails(req, res) {
        try {
            const filters = {
                status: req.query.status || 'scheduled',
                scheduledDateStart: req.query.scheduledDateStart,
                scheduledDateEnd: req.query.scheduledDateEnd
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const result = await emailService.getScheduledEmails(filters, pagination);

            res.json({
                success: true,
                data: result.emails,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get scheduled emails controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy danh sách email đã lên lịch thất bại'
            });
        }
    }
}

module.exports = new EmailController();