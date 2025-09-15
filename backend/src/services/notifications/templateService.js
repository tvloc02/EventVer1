const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const EmailTemplate = require('../../models/EmailTemplate');
const cacheService = require('../cacheService');
const logger = require('../../utils/logger');

class TemplateService {
    constructor() {
        this.compiledTemplates = new Map();
        this.templateCache = new Map();
        this.initializeHelpers();
    }

    initializeHelpers() {
        try {
            // Đăng ký các helper cho Handlebars

            // Helper định dạng ngày tháng
            handlebars.registerHelper('formatDate', function(date, format = 'DD/MM/YYYY') {
                if (!date) return '';
                const d = new Date(date);

                switch (format) {
                    case 'DD/MM/YYYY':
                        return d.toLocaleDateString('vi-VN');
                    case 'DD/MM/YYYY HH:mm':
                        return d.toLocaleString('vi-VN');
                    case 'HH:mm DD/MM/YYYY':
                        return `${d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})} ${d.toLocaleDateString('vi-VN')}`;
                    case 'long':
                        return d.toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    default:
                        return d.toLocaleDateString('vi-VN');
                }
            });

            // Helper định dạng số tiền
            handlebars.registerHelper('formatMoney', function(amount, currency = 'VND') {
                if (!amount) return '0 ₫';

                if (currency === 'VND') {
                    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
                }

                return new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: currency
                }).format(amount);
            });

            // Helper so sánh
            handlebars.registerHelper('eq', function(a, b) {
                return a === b;
            });

            handlebars.registerHelper('ne', function(a, b) {
                return a !== b;
            });

            handlebars.registerHelper('gt', function(a, b) {
                return a > b;
            });

            handlebars.registerHelper('lt', function(a, b) {
                return a < b;
            });

            // Helper điều kiện
            handlebars.registerHelper('if_eq', function(a, b, options) {
                if (a === b) {
                    return options.fn(this);
                }
                return options.inverse(this);
            });

            // Helper chuyển đổi text
            handlebars.registerHelper('uppercase', function(str) {
                return str ? str.toString().toUpperCase() : '';
            });

            handlebars.registerHelper('lowercase', function(str) {
                return str ? str.toString().toLowerCase() : '';
            });

            handlebars.registerHelper('capitalize', function(str) {
                if (!str) return '';
                return str.charAt(0).toUpperCase() + str.slice(1);
            });

            // Helper cắt chuỗi
            handlebars.registerHelper('truncate', function(str, length = 100) {
                if (!str) return '';
                if (str.length <= length) return str;
                return str.substring(0, length) + '...';
            });

            // Helper tạo URL
            handlebars.registerHelper('url', function(path) {
                const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                return baseUrl + (path.startsWith('/') ? path : '/' + path);
            });

            // Helper danh sách
            handlebars.registerHelper('join', function(array, separator = ', ') {
                if (!Array.isArray(array)) return '';
                return array.join(separator);
            });

            // Helper điều kiện empty
            handlebars.registerHelper('if_empty', function(value, options) {
                if (!value || (Array.isArray(value) && value.length === 0)) {
                    return options.fn(this);
                }
                return options.inverse(this);
            });

            // Helper tính toán
            handlebars.registerHelper('add', function(a, b) {
                return (parseFloat(a) || 0) + (parseFloat(b) || 0);
            });

            handlebars.registerHelper('subtract', function(a, b) {
                return (parseFloat(a) || 0) - (parseFloat(b) || 0);
            });

            handlebars.registerHelper('multiply', function(a, b) {
                return (parseFloat(a) || 0) * (parseFloat(b) || 0);
            });

            // Helper cho trạng thái
            handlebars.registerHelper('statusText', function(status) {
                const statusTexts = {
                    pending: 'Chờ duyệt',
                    approved: 'Đã duyệt',
                    rejected: 'Đã từ chối',
                    cancelled: 'Đã hủy',
                    attended: 'Đã tham gia',
                    completed: 'Hoàn thành',
                    draft: 'Bản nháp',
                    published: 'Đã xuất bản',
                    active: 'Đang hoạt động',
                    inactive: 'Không hoạt động'
                };
                return statusTexts[status] || status;
            });

            // Helper cho màu trạng thái
            handlebars.registerHelper('statusColor', function(status) {
                const statusColors = {
                    pending: '#fbbf24',
                    approved: '#10b981',
                    rejected: '#ef4444',
                    cancelled: '#6b7280',
                    attended: '#3b82f6',
                    completed: '#059669',
                    draft: '#9ca3af',
                    published: '#059669',
                    active: '#10b981',
                    inactive: '#ef4444'
                };
                return statusColors[status] || '#6b7280';
            });

            logger.info('Handlebars helpers đã được đăng ký');

        } catch (error) {
            logger.error('Lỗi đăng ký Handlebars helpers:', error);
        }
    }

    // Lấy template từ database hoặc file
    async getTemplate(templateName, type = 'email') {
        try {
            const cacheKey = `template:${type}:${templateName}`;

            // Kiểm tra cache trước
            let template = await cacheService.get(cacheKey);
            if (template) {
                return template;
            }

            // Tìm trong database trước
            const dbTemplate = await EmailTemplate.findOne({
                name: templateName,
                type: type,
                active: true
            });

            if (dbTemplate) {
                template = {
                    name: dbTemplate.name,
                    subject: dbTemplate.subject,
                    content: dbTemplate.content,
                    type: dbTemplate.type,
                    variables: dbTemplate.variables,
                    source: 'database'
                };
            } else {
                // Fallback về file template
                template = await this.loadTemplateFromFile(templateName, type);
                template.source = 'file';
            }

            if (template) {
                // Cache template trong 30 phút
                await cacheService.set(cacheKey, template, 1800);
            }

            return template;

        } catch (error) {
            logger.error('Lỗi lấy template:', error);
            throw error;
        }
    }

    // Load template từ file
    async loadTemplateFromFile(templateName, type = 'email') {
        try {
            const templateDir = path.join(__dirname, `../../templates/${type}`);
            const templatePath = path.join(templateDir, `${templateName}.hbs`);

            try {
                const content = await fs.readFile(templatePath, 'utf8');

                // Tách subject và content nếu có
                let subject = '';
                let templateContent = content;

                const subjectMatch = content.match(/{{!-- subject: (.+) --}}/);
                if (subjectMatch) {
                    subject = subjectMatch[1].trim();
                    templateContent = content.replace(/{{!-- subject: .+ --}}\n?/, '');
                }

                return {
                    name: templateName,
                    subject,
                    content: templateContent,
                    type,
                    variables: this.extractVariables(templateContent)
                };

            } catch (fileError) {
                if (fileError.code === 'ENOENT') {
                    throw new Error(`Template "${templateName}" không tồn tại`);
                }
                throw fileError;
            }

        } catch (error) {
            logger.error('Lỗi load template từ file:', error);
            throw error;
        }
    }

    // Compile template
    async compileTemplate(templateContent) {
        try {
            const templateHash = this.hashTemplate(templateContent);

            if (this.compiledTemplates.has(templateHash)) {
                return this.compiledTemplates.get(templateHash);
            }

            const compiled = handlebars.compile(templateContent, {
                noEscape: false,
                strict: false
            });

            this.compiledTemplates.set(templateHash, compiled);
            return compiled;

        } catch (error) {
            logger.error('Lỗi compile template:', error);
            throw new Error('Template có lỗi cú pháp: ' + error.message);
        }
    }

    // Render template với data
    async renderTemplate(templateName, data, type = 'email') {
        try {
            const template = await this.getTemplate(templateName, type);
            if (!template) {
                throw new Error(`Template "${templateName}" không tồn tại`);
            }

            // Compile template
            const compiledTemplate = await this.compileTemplate(template.content);

            // Chuẩn bị data với các biến mặc định
            const templateData = {
                ...this.getDefaultVariables(),
                ...data
            };

            // Render content
            const renderedContent = compiledTemplate(templateData);

            // Render subject nếu có
            let renderedSubject = template.subject;
            if (template.subject && template.subject.includes('{{')) {
                const subjectTemplate = await this.compileTemplate(template.subject);
                renderedSubject = subjectTemplate(templateData);
            }

            return {
                subject: renderedSubject,
                content: renderedContent,
                type: template.type,
                templateName: template.name
            };

        } catch (error) {
            logger.error('Lỗi render template:', error);
            throw error;
        }
    }

    // Lưu template vào database
    async saveTemplate(templateData) {
        try {
            const {
                name,
                subject,
                content,
                type = 'email',
                description,
                variables = [],
                category = 'default'
            } = templateData;

            // Kiểm tra template đã tồn tại chưa
            let template = await EmailTemplate.findOne({ name, type });

            if (template) {
                // Cập nhật template hiện tại
                template.subject = subject;
                template.content = content;
                template.description = description;
                template.variables = variables.length > 0 ? variables : this.extractVariables(content);
                template.category = category;
                template.updatedAt = new Date();
            } else {
                // Tạo template mới
                template = new EmailTemplate({
                    name,
                    subject,
                    content,
                    type,
                    description,
                    variables: variables.length > 0 ? variables : this.extractVariables(content),
                    category,
                    active: true
                });
            }

            await template.save();

            // Xóa cache
            await this.clearTemplateCache(name, type);

            logger.info(`Template "${name}" đã được lưu`);
            return template;

        } catch (error) {
            logger.error('Lỗi lưu template:', error);
            throw error;
        }
    }

    // Xóa template
    async deleteTemplate(templateName, type = 'email') {
        try {
            const result = await EmailTemplate.deleteOne({ name: templateName, type });

            if (result.deletedCount === 0) {
                throw new Error('Template không tồn tại');
            }

            // Xóa cache
            await this.clearTemplateCache(templateName, type);

            logger.info(`Template "${templateName}" đã được xóa`);
            return { success: true, message: 'Xóa template thành công' };

        } catch (error) {
            logger.error('Lỗi xóa template:', error);
            throw error;
        }
    }

    // Lấy danh sách templates
    async getTemplateList(type = 'email', category = null) {
        try {
            const query = { type, active: true };
            if (category) {
                query.category = category;
            }

            const templates = await EmailTemplate.find(query)
                .select('name subject description category variables createdAt updatedAt')
                .sort({ category: 1, name: 1 });

            return templates;

        } catch (error) {
            logger.error('Lỗi lấy danh sách templates:', error);
            throw error;
        }
    }

    // Test template với dữ liệu mẫu
    async testTemplate(templateName, sampleData = {}, type = 'email') {
        try {
            const template = await this.getTemplate(templateName, type);
            if (!template) {
                throw new Error(`Template "${templateName}" không tồn tại`);
            }

            // Tạo dữ liệu mẫu nếu không có
            const testData = {
                ...this.getSampleData(templateName),
                ...sampleData
            };

            const result = await this.renderTemplate(templateName, testData, type);

            return {
                success: true,
                result,
                sampleData: testData,
                variables: template.variables
            };

        } catch (error) {
            logger.error('Lỗi test template:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Validate template syntax
    async validateTemplate(content, subject = '') {
        try {
            const errors = [];

            // Validate content
            try {
                handlebars.compile(content);
            } catch (error) {
                errors.push(`Lỗi cú pháp trong nội dung: ${error.message}`);
            }

            // Validate subject
            if (subject) {
                try {
                    handlebars.compile(subject);
                } catch (error) {
                    errors.push(`Lỗi cú pháp trong tiêu đề: ${error.message}`);
                }
            }

            // Kiểm tra các biến bắt buộc
            const requiredVars = ['firstName', 'email'];
            const contentVars = this.extractVariables(content);
            const missingVars = requiredVars.filter(v => !contentVars.includes(v));

            if (missingVars.length > 0) {
                errors.push(`Thiếu các biến bắt buộc: ${missingVars.join(', ')}`);
            }

            return {
                valid: errors.length === 0,
                errors,
                variables: contentVars
            };

        } catch (error) {
            logger.error('Lỗi validate template:', error);
            return {
                valid: false,
                errors: ['Lỗi hệ thống khi validate template']
            };
        }
    }

    // Import templates từ file
    async importTemplates(templateDir = null) {
        try {
            const templatesDir = templateDir || path.join(__dirname, '../../templates/email');
            const files = await fs.readdir(templatesDir);

            const results = {
                imported: 0,
                errors: []
            };

            for (const file of files) {
                if (!file.endsWith('.hbs')) continue;

                try {
                    const templateName = path.basename(file, '.hbs');
                    const filePath = path.join(templatesDir, file);
                    const content = await fs.readFile(filePath, 'utf8');

                    // Extract metadata from comments
                    const metadata = this.extractMetadata(content);

                    await this.saveTemplate({
                        name: templateName,
                        subject: metadata.subject || templateName,
                        content: content,
                        description: metadata.description || `Imported from ${file}`,
                        category: metadata.category || 'imported'
                    });

                    results.imported++;

                } catch (error) {
                    results.errors.push({
                        file,
                        error: error.message
                    });
                }
            }

            logger.info(`Import templates: ${results.imported} thành công, ${results.errors.length} lỗi`);
            return results;

        } catch (error) {
            logger.error('Lỗi import templates:', error);
            throw error;
        }
    }

    // Export template ra file
    async exportTemplate(templateName, type = 'email') {
        try {
            const template = await this.getTemplate(templateName, type);
            if (!template) {
                throw new Error(`Template "${templateName}" không tồn tại`);
            }

            // Tạo nội dung file với metadata
            let fileContent = '';

            if (template.subject) {
                fileContent += `{{!-- subject: ${template.subject} --}}\n`;
            }

            if (template.description) {
                fileContent += `{{!-- description: ${template.description} --}}\n`;
            }

            if (template.category) {
                fileContent += `{{!-- category: ${template.category} --}}\n`;
            }

            fileContent += `{{!-- variables: ${template.variables.join(', ')} --}}\n\n`;
            fileContent += template.content;

            return {
                filename: `${templateName}.hbs`,
                content: fileContent,
                contentType: 'text/plain'
            };

        } catch (error) {
            logger.error('Lỗi export template:', error);
            throw error;
        }
    }

    // Clone template
    async cloneTemplate(sourceTemplateName, newTemplateName, type = 'email') {
        try {
            const sourceTemplate = await this.getTemplate(sourceTemplateName, type);
            if (!sourceTemplate) {
                throw new Error(`Template nguồn "${sourceTemplateName}" không tồn tại`);
            }

            const newTemplate = await this.saveTemplate({
                name: newTemplateName,
                subject: sourceTemplate.subject,
                content: sourceTemplate.content,
                type: sourceTemplate.type,
                description: `Sao chép từ ${sourceTemplateName}`,
                variables: sourceTemplate.variables,
                category: sourceTemplate.category || 'custom'
            });

            logger.info(`Template "${sourceTemplateName}" đã được sao chép thành "${newTemplateName}"`);
            return newTemplate;

        } catch (error) {
            logger.error('Lỗi clone template:', error);
            throw error;
        }
    }

    // Utility methods
    extractVariables(content) {
        const matches = content.match(/{{{?([^}]+)}}}?/g) || [];
        const variables = new Set();

        matches.forEach(match => {
            const variable = match.replace(/{{{?|}}}?/g, '').trim();
            // Loại bỏ helpers và chỉ giữ tên biến
            const cleanVar = variable.split(' ')[0].split('.')[0];
            if (cleanVar && !cleanVar.startsWith('#') && !cleanVar.startsWith('/')) {
                variables.add(cleanVar);
            }
        });

        return Array.from(variables);
    }

    extractMetadata(content) {
        const metadata = {};

        const subjectMatch = content.match(/{{!-- subject: (.+) --}}/);
        if (subjectMatch) {
            metadata.subject = subjectMatch[1].trim();
        }

        const descMatch = content.match(/{{!-- description: (.+) --}}/);
        if (descMatch) {
            metadata.description = descMatch[1].trim();
        }

        const categoryMatch = content.match(/{{!-- category: (.+) --}}/);
        if (categoryMatch) {
            metadata.category = categoryMatch[1].trim();
        }

        return metadata;
    }

    getDefaultVariables() {
        return {
            siteName: 'Student Event Management',
            siteUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            supportEmail: process.env.SUPPORT_EMAIL || 'support@studentevent.com',
            year: new Date().getFullYear(),
            currentDate: new Date().toLocaleDateString('vi-VN'),
            currentDateTime: new Date().toLocaleString('vi-VN')
        };
    }

    getSampleData(templateName) {
        const baseSample = {
            firstName: 'Nguyễn',
            lastName: 'Văn A',
            fullName: 'Nguyễn Văn A',
            email: 'nguyenvana@student.edu.vn',
            studentId: 'SV001',
            faculty: 'Công nghệ thông tin',
            department: 'Khoa học máy tính'
        };

        const templateSamples = {
            'welcome': {
                ...baseSample,
                loginUrl: 'https://example.com/login'
            },
            'event-reminder': {
                ...baseSample,
                eventTitle: 'Hội thảo AI và Machine Learning',
                eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                eventLocation: 'Hội trường A, Tòa nhà B',
                eventUrl: 'https://example.com/events/ai-ml-seminar'
            },
            'registration-confirmation': {
                ...baseSample,
                eventTitle: 'Workshop React Native',
                registrationNumber: 'REG123456',
                eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                qrCode: 'https://example.com/qr/REG123456'
            },
            'certificate-ready': {
                ...baseSample,
                eventTitle: 'Khóa học JavaScript nâng cao',
                certificateUrl: 'https://example.com/certificates/cert123'
            }
        };

        return {
            ...baseSample,
            ...templateSamples[templateName]
        };
    }

    hashTemplate(content) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(content).digest('hex');
    }

    async clearTemplateCache(templateName, type) {
        try {
            const cacheKey = `template:${type}:${templateName}`;
            await cacheService.del(cacheKey);

            // Xóa compiled template cache
            this.compiledTemplates.clear();

        } catch (error) {
            logger.error('Lỗi xóa template cache:', error);
        }
    }

    // Lấy template categories
    async getTemplateCategories() {
        try {
            const categories = await EmailTemplate.distinct('category');

            const categoryInfo = categories.map(cat => ({
                name: cat,
                displayName: this.getCategoryDisplayName(cat),
                count: 0 // Sẽ được tính sau
            }));

            // Đếm số template trong mỗi category
            for (const category of categoryInfo) {
                category.count = await EmailTemplate.countDocuments({
                    category: category.name,
                    active: true
                });
            }

            return categoryInfo.filter(cat => cat.count > 0);

        } catch (error) {
            logger.error('Lỗi lấy template categories:', error);
            return [];
        }
    }

    getCategoryDisplayName(category) {
        const displayNames = {
            'auth': 'Xác thực',
            'event': 'Sự kiện',
            'notification': 'Thông báo',
            'system': 'Hệ thống',
            'certificate': 'Chứng nhận',
            'reminder': 'Nhắc nhở',
            'welcome': 'Chào mừng',
            'custom': 'Tùy chỉnh',
            'imported': 'Đã nhập',
            'default': 'Mặc định'
        };

        return displayNames[category] || category;
    }

    // Thống kê sử dụng template
    async getTemplateUsageStats(templateName, type = 'email') {
        try {
            // Trong thực tế, cần implement logging để track usage
            return {
                templateName,
                type,
                totalUsed: 0,
                lastUsed: null,
                avgResponseRate: 0,
                popularVariables: []
            };

        } catch (error) {
            logger.error('Lỗi lấy thống kê sử dụng template:', error);
            return null;
        }
    }
}

module.exports = new TemplateService();