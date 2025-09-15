const reportService = require('../../services/admin/reportService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class ReportController {
    // Tạo báo cáo dashboard tổng quan
    async generateDashboardReport(req, res) {
        try {
            const { timeframe = '30d', includeCharts = true } = req.query;

            const report = await reportService.generateDashboardReport(timeframe, includeCharts);

            res.json({
                success: true,
                message: 'Tạo báo cáo dashboard thành công',
                data: report
            });

        } catch (error) {
            logger.error('Generate dashboard report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo báo cáo dashboard thất bại'
            });
        }
    }

    // Tạo báo cáo người dùng
    async generateUserReport(req, res) {
        try {
            const filters = {
                role: req.query.role,
                status: req.query.status,
                faculty: req.query.faculty,
                department: req.query.department,
                registrationDateStart: req.query.registrationDateStart,
                registrationDateEnd: req.query.registrationDateEnd,
                lastLoginStart: req.query.lastLoginStart,
                lastLoginEnd: req.query.lastLoginEnd
            };

            const options = {
                format: req.query.format || 'summary',
                includeStatistics: req.query.includeStatistics !== 'false',
                includeActivityData: req.query.includeActivityData === 'true',
                groupBy: req.query.groupBy || 'role'
            };

            const report = await reportService.generateUserReport(filters, options);

            res.json({
                success: true,
                message: 'Tạo báo cáo người dùng thành công',
                data: report
            });

        } catch (error) {
            logger.error('Generate user report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo báo cáo người dùng thất bại'
            });
        }
    }

    // Tạo báo cáo sự kiện
    async generateEventReport(req, res) {
        try {
            const filters = {
                status: req.query.status,
                category: req.query.category,
                eventType: req.query.eventType,
                organizer: req.query.organizer,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                location: req.query.location
            };

            const options = {
                format: req.query.format || 'detailed',
                includeRegistrations: req.query.includeRegistrations === 'true',
                includeAttendance: req.query.includeAttendance === 'true',
                includeFeedback: req.query.includeFeedback === 'true',
                includeFinancials: req.query.includeFinancials === 'true'
            };

            const report = await reportService.generateEventReport(filters, options);

            res.json({
                success: true,
                message: 'Tạo báo cáo sự kiện thành công',
                data: report
            });

        } catch (error) {
            logger.error('Generate event report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo báo cáo sự kiện thất bại'
            });
        }
    }

    // Tạo báo cáo đăng ký
    async generateRegistrationReport(req, res) {
        try {
            const { eventId } = req.params;

            const options = {
                format: req.query.format || 'detailed',
                includeWaitlist: req.query.includeWaitlist === 'true',
                includePaymentInfo: req.query.includePaymentInfo === 'true',
                includeCustomFields: req.query.includeCustomFields === 'true',
                groupBy: req.query.groupBy
            };

            const report = await reportService.generateRegistrationReport(eventId, options);

            res.json({
                success: true,
                message: 'Tạo báo cáo đăng ký thành công',
                data: report
            });

        } catch (error) {
            logger.error('Generate registration report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo báo cáo đăng ký thất bại'
            });
        }
    }

    // Tạo báo cáo điểm danh
    async generateAttendanceReport(req, res) {
        try {
            const { eventId } = req.params;

            const options = {
                format: req.query.format || 'summary',
                includeLatearrivals: req.query.includeLatearrivals === 'true',
                includeEarlyLeaves: req.query.includeEarlyLeaves === 'true',
                includeSessionData: req.query.includeSessionData === 'true',
                includeEngagementMetrics: req.query.includeEngagementMetrics === 'true'
            };

            const report = await reportService.generateAttendanceReport(eventId, options);

            res.json({
                success: true,
                message: 'Tạo báo cáo điểm danh thành công',
                data: report
            });

        } catch (error) {
            logger.error('Generate attendance report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo báo cáo điểm danh thất bại'
            });
        }
    }

    // Tạo báo cáo tài chính
    async generateFinancialReport(req, res) {
        try {
            const filters = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                eventId: req.query.eventId,
                paymentStatus: req.query.paymentStatus,
                paymentMethod: req.query.paymentMethod
            };

            const options = {
                format: req.query.format || 'summary',
                includeRefunds: req.query.includeRefunds === 'true',
                includeTaxBreakdown: req.query.includeTaxBreakdown === 'true',
                currency: req.query.currency || 'VND'
            };

            const report = await reportService.generateFinancialReport(filters, options);

            res.json({
                success: true,
                message: 'Tạo báo cáo tài chính thành công',
                data: report
            });

        } catch (error) {
            logger.error('Generate financial report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo báo cáo tài chính thất bại'
            });
        }
    }

    // Tạo báo cáo phản hồi
    async generateFeedbackReport(req, res) {
        try {
            const { eventId } = req.params;

            const options = {
                format: req.query.format || 'detailed',
                includeRatings: req.query.includeRatings !== 'false',
                includeComments: req.query.includeComments !== 'false',
                includeSentimentAnalysis: req.query.includeSentimentAnalysis === 'true',
                anonymize: req.query.anonymize === 'true'
            };

            const report = await reportService.generateFeedbackReport(eventId, options);

            res.json({
                success: true,
                message: 'Tạo báo cáo phản hồi thành công',
                data: report
            });

        } catch (error) {
            logger.error('Generate feedback report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo báo cáo phản hồi thất bại'
            });
        }
    }

    // Tạo báo cáo chứng chỉ
    async generateCertificateReport(req, res) {
        try {
            const filters = {
                eventId: req.query.eventId,
                status: req.query.status,
                type: req.query.type,
                issuedDateStart: req.query.issuedDateStart,
                issuedDateEnd: req.query.issuedDateEnd,
                userId: req.query.userId
            };

            const options = {
                format: req.query.format || 'summary',
                includeDownloadStats: req.query.includeDownloadStats === 'true',
                includeVerificationData: req.query.includeVerificationData === 'true'
            };

            const report = await reportService.generateCertificateReport(filters, options);

            res.json({
                success: true,
                message: 'Tạo báo cáo chứng chỉ thành công',
                data: report
            });

        } catch (error) {
            logger.error('Generate certificate report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo báo cáo chứng chỉ thất bại'
            });
        }
    }

    // Xuất báo cáo ra file
    async exportReport(req, res) {
        try {
            const { reportId } = req.params;
            const { format = 'pdf' } = req.query;

            const reportData = await reportService.getReportById(reportId);

            if (!reportData) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy báo cáo'
                });
            }

            let fileBuffer, filename, contentType;

            switch (format) {
                case 'pdf':
                    fileBuffer = await reportService.exportToPDF(reportData);
                    filename = `report_${reportId}_${Date.now()}.pdf`;
                    contentType = 'application/pdf';
                    break;
                case 'xlsx':
                    fileBuffer = await reportService.exportToExcel(reportData);
                    filename = `report_${reportId}_${Date.now()}.xlsx`;
                    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    break;
                case 'csv':
                    fileBuffer = await reportService.exportToCSV(reportData);
                    filename = `report_${reportId}_${Date.now()}.csv`;
                    contentType = 'text/csv';
                    break;
                case 'docx':
                    fileBuffer = await reportService.exportToWord(reportData);
                    filename = `report_${reportId}_${Date.now()}.docx`;
                    contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Định dạng file không được hỗ trợ'
                    });
            }

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(fileBuffer);

        } catch (error) {
            logger.error('Export report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Xuất báo cáo thất bại'
            });
        }
    }

    // Lấy danh sách báo cáo đã tạo
    async getReports(req, res) {
        try {
            const filters = {
                type: req.query.type,
                createdBy: req.query.createdBy,
                status: req.query.status,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const result = await reportService.getReports(filters, pagination);

            res.json({
                success: true,
                data: result.reports,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get reports controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy danh sách báo cáo thất bại'
            });
        }
    }

    // Lấy chi tiết báo cáo
    async getReportById(req, res) {
        try {
            const { reportId } = req.params;
            const report = await reportService.getReportById(reportId);

            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy báo cáo'
                });
            }

            res.json({
                success: true,
                data: report
            });

        } catch (error) {
            logger.error('Get report by ID controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy chi tiết báo cáo thất bại'
            });
        }
    }

    // Xóa báo cáo
    async deleteReport(req, res) {
        try {
            const { reportId } = req.params;

            await reportService.deleteReport(reportId, req.user.userId);

            res.json({
                success: true,
                message: 'Xóa báo cáo thành công'
            });

        } catch (error) {
            logger.error('Delete report controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Xóa báo cáo thất bại'
            });
        }
    }

    // Lên lịch tạo báo cáo tự động
    async scheduleReport(req, res) {
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
                reportType: req.body.reportType,
                filters: req.body.filters,
                options: req.body.options,
                schedule: req.body.schedule, // cron expression
                recipients: req.body.recipients,
                format: req.body.format || 'pdf',
                isActive: req.body.isActive !== false
            };

            const scheduledReport = await reportService.scheduleReport(scheduleData, req.user.userId);

            res.status(201).json({
                success: true,
                message: 'Lên lịch báo cáo thành công',
                data: scheduledReport
            });

        } catch (error) {
            logger.error('Schedule report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lên lịch báo cáo thất bại'
            });
        }
    }

    // Lấy danh sách báo cáo đã lên lịch
    async getScheduledReports(req, res) {
        try {
            const filters = {
                isActive: req.query.isActive,
                reportType: req.query.reportType,
                createdBy: req.query.createdBy
            };

            const result = await reportService.getScheduledReports(filters);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Get scheduled reports controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy danh sách báo cáo đã lên lịch thất bại'
            });
        }
    }

    // Cập nhật báo cáo đã lên lịch
    async updateScheduledReport(req, res) {
        try {
            const { scheduleId } = req.params;

            const updateData = {
                schedule: req.body.schedule,
                recipients: req.body.recipients,
                format: req.body.format,
                isActive: req.body.isActive,
                filters: req.body.filters,
                options: req.body.options
            };

            const scheduledReport = await reportService.updateScheduledReport(
                scheduleId,
                updateData,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Cập nhật lịch báo cáo thành công',
                data: scheduledReport
            });

        } catch (error) {
            logger.error('Update scheduled report controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Cập nhật lịch báo cáo thất bại'
            });
        }
    }

    // Xóa báo cáo đã lên lịch
    async deleteScheduledReport(req, res) {
        try {
            const { scheduleId } = req.params;

            await reportService.deleteScheduledReport(scheduleId, req.user.userId);

            res.json({
                success: true,
                message: 'Xóa lịch báo cáo thành công'
            });

        } catch (error) {
            logger.error('Delete scheduled report controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Xóa lịch báo cáo thất bại'
            });
        }
    }

    // Tạo báo cáo tùy chỉnh
    async generateCustomReport(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const reportConfig = {
                title: req.body.title,
                description: req.body.description,
                dataSource: req.body.dataSource,
                fields: req.body.fields,
                filters: req.body.filters,
                groupBy: req.body.groupBy,
                sortBy: req.body.sortBy,
                chartTypes: req.body.chartTypes,
                includeCharts: req.body.includeCharts !== false,
                format: req.body.format || 'detailed'
            };

            const report = await reportService.generateCustomReport(reportConfig, req.user.userId);

            res.json({
                success: true,
                message: 'Tạo báo cáo tùy chỉnh thành công',
                data: report
            });

        } catch (error) {
            logger.error('Generate custom report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo báo cáo tùy chỉnh thất bại'
            });
        }
    }

    // Lấy template báo cáo
    async getReportTemplates(req, res) {
        try {
            const { category } = req.query;
            const templates = await reportService.getReportTemplates(category);

            res.json({
                success: true,
                data: templates
            });

        } catch (error) {
            logger.error('Get report templates controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy template báo cáo thất bại'
            });
        }
    }

    // Tạo template báo cáo
    async createReportTemplate(req, res) {
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
                reportType: req.body.reportType,
                defaultFilters: req.body.defaultFilters,
                defaultOptions: req.body.defaultOptions,
                fields: req.body.fields,
                chartConfig: req.body.chartConfig,
                isPublic: req.body.isPublic === true
            };

            const template = await reportService.createReportTemplate(templateData, req.user.userId);

            res.status(201).json({
                success: true,
                message: 'Tạo template báo cáo thành công',
                data: template
            });

        } catch (error) {
            logger.error('Create report template controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo template báo cáo thất bại'
            });
        }
    }

    // Lấy thống kê báo cáo
    async getReportStatistics(req, res) {
        try {
            const { timeframe = '30d' } = req.query;
            const stats = await reportService.getReportStatistics(timeframe);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get report statistics controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy thống kê báo cáo thất bại'
            });
        }
    }
}

module.exports = new ReportController();