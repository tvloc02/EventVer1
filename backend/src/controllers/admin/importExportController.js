const importExportService = require('../../services/admin/importExportService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class ImportExportController {
    // Nhập dữ liệu từ file Excel/CSV
    async importData(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Không có file được tải lên'
                });
            }

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { dataType, options = {} } = req.body;

            const importOptions = {
                updateExisting: options.updateExisting === 'true',
                skipErrors: options.skipErrors === 'true',
                validateOnly: options.validateOnly === 'true',
                batchSize: parseInt(options.batchSize) || 100
            };

            const result = await importExportService.importData(
                dataType,
                req.file.buffer,
                importOptions,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Nhập dữ liệu thành công',
                data: {
                    imported: result.imported,
                    updated: result.updated,
                    failed: result.failed,
                    errors: result.errors,
                    totalRecords: result.totalRecords
                }
            });

        } catch (error) {
            logger.error('Import data controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Nhập dữ liệu thất bại'
            });
        }
    }

    // Xuất dữ liệu ra file Excel/CSV
    async exportData(req, res) {
        try {
            const { dataType, format = 'xlsx' } = req.query;

            const filters = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                status: req.query.status,
                category: req.query.category,
                organizerId: req.query.organizerId
            };

            const options = {
                includeDeleted: req.query.includeDeleted === 'true',
                includeArchived: req.query.includeArchived === 'true',
                fields: req.query.fields ? req.query.fields.split(',') : null
            };

            const exportData = await importExportService.exportData(
                dataType,
                filters,
                options,
                req.user.userId
            );

            let filename, contentType, data;

            switch (format) {
                case 'csv':
                    filename = `${dataType}_export_${Date.now()}.csv`;
                    contentType = 'text/csv';
                    data = await importExportService.convertToCSV(exportData);
                    break;
                case 'xlsx':
                    filename = `${dataType}_export_${Date.now()}.xlsx`;
                    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    data = await importExportService.convertToExcel(exportData);
                    break;
                case 'json':
                    filename = `${dataType}_export_${Date.now()}.json`;
                    contentType = 'application/json';
                    data = JSON.stringify(exportData, null, 2);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Định dạng file không được hỗ trợ'
                    });
            }

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(data);

        } catch (error) {
            logger.error('Export data controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Xuất dữ liệu thất bại'
            });
        }
    }

    // Lấy template cho việc nhập dữ liệu
    async getImportTemplate(req, res) {
        try {
            const { dataType, format = 'xlsx' } = req.query;

            const template = await importExportService.getImportTemplate(dataType, format);

            const filename = `${dataType}_import_template.${format}`;
            const contentType = format === 'xlsx'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'text/csv';

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(template);

        } catch (error) {
            logger.error('Get import template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Lấy template thất bại'
            });
        }
    }

    // Xác thực dữ liệu nhập
    async validateImportData(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Không có file được tải lên'
                });
            }

            const { dataType } = req.body;

            const validation = await importExportService.validateImportData(
                dataType,
                req.file.buffer
            );

            res.json({
                success: true,
                message: 'Xác thực dữ liệu hoàn tất',
                data: {
                    isValid: validation.isValid,
                    totalRecords: validation.totalRecords,
                    validRecords: validation.validRecords,
                    invalidRecords: validation.invalidRecords,
                    errors: validation.errors,
                    warnings: validation.warnings
                }
            });

        } catch (error) {
            logger.error('Validate import data controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Xác thực dữ liệu thất bại'
            });
        }
    }

    // Lấy lịch sử nhập/xuất
    async getImportExportHistory(req, res) {
        try {
            const filters = {
                type: req.query.type, // import/export
                dataType: req.query.dataType,
                status: req.query.status,
                userId: req.query.userId,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const result = await importExportService.getImportExportHistory(filters, pagination);

            res.json({
                success: true,
                data: result.history,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get import export history controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy lịch sử thất bại'
            });
        }
    }

    // Hủy bỏ quá trình nhập/xuất đang chạy
    async cancelOperation(req, res) {
        try {
            const { operationId } = req.params;

            const result = await importExportService.cancelOperation(operationId, req.user.userId);

            res.json({
                success: true,
                message: 'Hủy bỏ thao tác thành công',
                data: result
            });

        } catch (error) {
            logger.error('Cancel operation controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Hủy bỏ thao tác thất bại'
            });
        }
    }

    // Lấy trạng thái quá trình nhập/xuất
    async getOperationStatus(req, res) {
        try {
            const { operationId } = req.params;

            const status = await importExportService.getOperationStatus(operationId);

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            logger.error('Get operation status controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Lấy trạng thái thất bại'
            });
        }
    }

    // Xuất báo cáo tổng hợp
    async exportSummaryReport(req, res) {
        try {
            const { format = 'xlsx', reportType = 'full' } = req.query;

            const filters = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                includeCharts: req.query.includeCharts === 'true'
            };

            const report = await importExportService.generateSummaryReport(reportType, filters);

            let filename, contentType, data;

            switch (format) {
                case 'pdf':
                    filename = `summary_report_${Date.now()}.pdf`;
                    contentType = 'application/pdf';
                    data = await importExportService.convertToPDF(report);
                    break;
                case 'xlsx':
                    filename = `summary_report_${Date.now()}.xlsx`;
                    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    data = await importExportService.convertToExcel(report);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Định dạng báo cáo không được hỗ trợ'
                    });
            }

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(data);

        } catch (error) {
            logger.error('Export summary report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Xuất báo cáo thất bại'
            });
        }
    }

    // Sao lưu dữ liệu hệ thống
    async createSystemBackup(req, res) {
        try {
            const options = {
                includeFiles: req.body.includeFiles !== false,
                includeUserData: req.body.includeUserData !== false,
                includeEventData: req.body.includeEventData !== false,
                compress: req.body.compress !== false,
                encryptData: req.body.encryptData === true
            };

            const backup = await importExportService.createSystemBackup(options, req.user.userId);

            res.json({
                success: true,
                message: 'Tạo bản sao lưu thành công',
                data: backup
            });

        } catch (error) {
            logger.error('Create system backup controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo bản sao lưu thất bại'
            });
        }
    }

    // Khôi phục dữ liệu từ bản sao lưu
    async restoreSystemBackup(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Không có file sao lưu được tải lên'
                });
            }

            const options = {
                restoreFiles: req.body.restoreFiles !== false,
                restoreUserData: req.body.restoreUserData !== false,
                restoreEventData: req.body.restoreEventData !== false,
                createBackupBeforeRestore: req.body.createBackupBeforeRestore !== false
            };

            const result = await importExportService.restoreSystemBackup(
                req.file.buffer,
                options,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Khôi phục dữ liệu thành công',
                data: result
            });

        } catch (error) {
            logger.error('Restore system backup controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Khôi phục dữ liệu thất bại'
            });
        }
    }

    // Đồng bộ dữ liệu với hệ thống bên ngoài
    async syncExternalData(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { sourceSystem, syncType, options = {} } = req.body;

            const result = await importExportService.syncExternalData(
                sourceSystem,
                syncType,
                options,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Đồng bộ dữ liệu thành công',
                data: result
            });

        } catch (error) {
            logger.error('Sync external data controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Đồng bộ dữ liệu thất bại'
            });
        }
    }

    // Lấy thống kê nhập/xuất dữ liệu
    async getImportExportStats(req, res) {
        try {
            const { timeframe = '30d' } = req.query;

            const stats = await importExportService.getImportExportStatistics(timeframe);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get import export stats controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy thống kê thất bại'
            });
        }
    }
}

module.exports = new ImportExportController();