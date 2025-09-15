const templateService = require('../../services/notifications/templateService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class TemplateController {
    // Lấy danh sách template
    async getTemplates(req, res) {
        try {
            const filters = {
                category: req.query.category,
                type: req.query.type,
                isActive: req.query.isActive,
                language: req.query.language || 'vi',
                search: req.query.search
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const result = await templateService.getTemplates(filters, pagination);

            res.json({
                success: true,
                data: result.templates,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get templates controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy danh sách template thất bại'
            });
        }
    }

    // Lấy chi tiết template
    async getTemplateById(req, res) {
        try {
            const { templateId } = req.params;

            const template = await templateService.getTemplateById(templateId);

            if (!template) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy template'
                });
            }

            res.json({
                success: true,
                data: template
            });

        } catch (error) {
            logger.error('Get template by ID controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy chi tiết template thất bại'
            });
        }
    }

    // Tạo template mới
    async createTemplate(req, res) {
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
                type: req.body.type,
                language: req.body.language || 'vi',
                subject: req.body.subject,
                content: {
                    html: req.body.html,
                    text: req.body.text,
                    push: req.body.push,
                    sms: req.body.sms
                },
                variables: req.body.variables || [],
                metadata: req.body.metadata || {},
                isActive: req.body.isActive !== false,
                isSystem: req.body.isSystem === true
            };

            const template = await templateService.createTemplate(templateData, req.user.userId);

            res.status(201).json({
                success: true,
                message: 'Tạo template thành công',
                data: template
            });

        } catch (error) {
            logger.error('Create template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Tạo template thất bại'
            });
        }
    }

    // Cập nhật template
    async updateTemplate(req, res) {
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
                content: {
                    html: req.body.html,
                    text: req.body.text,
                    push: req.body.push,
                    sms: req.body.sms
                },
                variables: req.body.variables,
                metadata: req.body.metadata,
                isActive: req.body.isActive
            };

            const template = await templateService.updateTemplate(templateId, updateData, req.user.userId);

            res.json({
                success: true,
                message: 'Cập nhật template thành công',
                data: template
            });

        } catch (error) {
            logger.error('Update template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Cập nhật template thất bại'
            });
        }
    }

    // Xóa template
    async deleteTemplate(req, res) {
        try {
            const { templateId } = req.params;

            await templateService.deleteTemplate(templateId, req.user.userId);

            res.json({
                success: true,
                message: 'Xóa template thành công'
            });

        } catch (error) {
            logger.error('Delete template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Xóa template thất bại'
            });
        }
    }

    // Sao chép template
    async duplicateTemplate(req, res) {
        try {
            const { templateId } = req.params;
            const { name, description } = req.body;

            const template = await templateService.duplicateTemplate(
                templateId,
                { name, description },
                req.user.userId
            );

            res.status(201).json({
                success: true,
                message: 'Sao chép template thành công',
                data: template
            });

        } catch (error) {
            logger.error('Duplicate template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Sao chép template thất bại'
            });
        }
    }

    // Xem trước template
    async previewTemplate(req, res) {
        try {
            const { templateId } = req.params;
            const { variables = {}, channel = 'email' } = req.body;

            const preview = await templateService.renderTemplate(templateId, variables, channel);

            res.json({
                success: true,
                data: {
                    subject: preview.subject,
                    content: preview.content,
                    variables: preview.variables
                }
            });

        } catch (error) {
            logger.error('Preview template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Xem trước template thất bại'
            });
        }
    }

    // Kiểm tra cú pháp template
    async validateTemplate(req, res) {
        try {
            const { content, variables = [] } = req.body;

            const validation = await templateService.validateTemplateSyntax(content, variables);

            res.json({
                success: true,
                data: validation
            });

        } catch (error) {
            logger.error('Validate template controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Kiểm tra cú pháp template thất bại'
            });
        }
    }

    // Lấy danh sách biến có sẵn
    async getAvailableVariables(req, res) {
        try {
            const { category, type } = req.query;

            const variables = await templateService.getAvailableVariables(category, type);

            res.json({
                success: true,
                data: variables
            });

        } catch (error) {
            logger.error('Get available variables controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy danh sách biến thất bại'
            });
        }
    }

    // Lấy danh mục template
    async getTemplateCategories(req, res) {
        try {
            const categories = await templateService.getTemplateCategories();

            res.json({
                success: true,
                data: categories
            });

        } catch (error) {
            logger.error('Get template categories controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy danh mục template thất bại'
            });
        }
    }

    // Tạo danh mục template
    async createTemplateCategory(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const categoryData = {
                name: req.body.name,
                description: req.body.description,
                color: req.body.color,
                icon: req.body.icon,
                isActive: req.body.isActive !== false
            };

            const category = await templateService.createTemplateCategory(categoryData, req.user.userId);

            res.status(201).json({
                success: true,
                message: 'Tạo danh mục template thành công',
                data: category
            });

        } catch (error) {
            logger.error('Create template category controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo danh mục template thất bại'
            });
        }
    }

    // Nhập template từ file
    async importTemplate(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Không có file được tải lên'
                });
            }

            const { overwriteExisting = false } = req.body;

            const result = await templateService.importTemplates(
                req.file.buffer,
                overwriteExisting,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Nhập template thành công',
                data: {
                    imported: result.imported,
                    updated: result.updated,
                    failed: result.failed,
                    errors: result.errors
                }
            });

        } catch (error) {
            logger.error('Import template controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Nhập template thất bại'
            });
        }
    }

    // Xuất template ra file
    async exportTemplate(req, res) {
        try {
            const { templateId } = req.params;
            const { format = 'json' } = req.query;

            const exportData = await templateService.exportTemplate(templateId, format);

            let filename, contentType;

            switch (format) {
                case 'json':
                    filename = `template_${templateId}.json`;
                    contentType = 'application/json';
                    break;
                case 'html':
                    filename = `template_${templateId}.html`;
                    contentType = 'text/html';
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Định dạng xuất không được hỗ trợ'
                    });
            }

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(exportData);

        } catch (error) {
            logger.error('Export template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Xuất template thất bại'
            });
        }
    }

    // Xuất tất cả template
    async exportAllTemplates(req, res) {
        try {
            const { format = 'json', category } = req.query;

            const filters = { category };
            const exportData = await templateService.exportAllTemplates(filters, format);

            const filename = `templates_export_${Date.now()}.${format}`;
            const contentType = format === 'xlsx'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/json';

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(exportData);

        } catch (error) {
            logger.error('Export all templates controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Xuất tất cả template thất bại'
            });
        }
    }

    // Lấy thống kê sử dụng template
    async getTemplateUsageStats(req, res) {
        try {
            const { templateId } = req.params;
            const { timeframe = '30d' } = req.query;

            const stats = await templateService.getTemplateUsageStats(templateId, timeframe);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get template usage stats controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy thống kê sử dụng template thất bại'
            });
        }
    }

    // Lấy lịch sử phiên bản template
    async getTemplateVersionHistory(req, res) {
        try {
            const { templateId } = req.params;

            const history = await templateService.getTemplateVersionHistory(templateId);

            res.json({
                success: true,
                data: history
            });

        } catch (error) {
            logger.error('Get template version history controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy lịch sử phiên bản template thất bại'
            });
        }
    }

    // Khôi phục phiên bản template
    async restoreTemplateVersion(req, res) {
        try {
            const { templateId, versionId } = req.params;

            const template = await templateService.restoreTemplateVersion(
                templateId,
                versionId,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Khôi phục phiên bản template thành công',
                data: template
            });

        } catch (error) {
            logger.error('Restore template version controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Khôi phục phiên bản template thất bại'
            });
        }
    }

    // So sánh hai phiên bản template
    async compareTemplateVersions(req, res) {
        try {
            const { templateId } = req.params;
            const { version1, version2 } = req.query;

            const comparison = await templateService.compareTemplateVersions(
                templateId,
                version1,
                version2
            );

            res.json({
                success: true,
                data: comparison
            });

        } catch (error) {
            logger.error('Compare template versions controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'So sánh phiên bản template thất bại'
            });
        }
    }

    // Kiểm tra template có đang được sử dụng
    async checkTemplateUsage(req, res) {
        try {
            const { templateId } = req.params;

            const usage = await templateService.checkTemplateUsage(templateId);

            res.json({
                success: true,
                data: {
                    isInUse: usage.isInUse,
                    usageCount: usage.usageCount,
                    lastUsed: usage.lastUsed,
                    usedBy: usage.usedBy
                }
            });

        } catch (error) {
            logger.error('Check template usage controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Kiểm tra sử dụng template thất bại'
            });
        }
    }
}

module.exports = new TemplateController();