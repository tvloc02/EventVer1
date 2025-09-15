const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { VALIDATION } = require('./constants');

class Helpers {
    /**
     * Generate random string
     * @param {number} length
     * @param {string} charset
     * @returns {string}
     */
    static generateRandomString(length = 32, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }

    /**
     * Generate random token
     * @param {number} bytes
     * @returns {string}
     */
    static generateToken(bytes = 32) {
        return crypto.randomBytes(bytes).toString('hex');
    }

    /**
     * Generate UUID
     * @returns {string}
     */
    static generateUUID() {
        return crypto.randomUUID();
    }

    /**
     * Hash password
     * @param {string} password
     * @param {number} saltRounds
     * @returns {Promise<string>}
     */
    static async hashPassword(password, saltRounds = 12) {
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * Compare password with hash
     * @param {string} password
     * @param {string} hash
     * @returns {Promise<boolean>}
     */
    static async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Generate slug from text
     * @param {string} text
     * @returns {string}
     */
    static generateSlug(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .trim()
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-'); // Remove multiple hyphens
    }

    /**
     * Generate unique slug
     * @param {string} text
     * @param {Function} checkFunction - Function to check if slug exists
     * @returns {Promise<string>}
     */
    static async generateUniqueSlug(text, checkFunction) {
        let baseSlug = this.generateSlug(text);
        let slug = baseSlug;
        let counter = 1;

        while (await checkFunction(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return slug;
    }

    /**
     * Sanitize HTML
     * @param {string} html
     * @returns {string}
     */
    static sanitizeHtml(html) {
        if (!html) return '';

        // Remove script tags and their content
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // Remove dangerous attributes
        html = html.replace(/on\w+="[^"]*"/gi, '');
        html = html.replace(/on\w+='[^']*'/gi, '');
        html = html.replace(/javascript:/gi, '');

        return html;
    }

    /**
     * Escape HTML
     * @param {string} text
     * @returns {string}
     */
    static escapeHtml(text) {
        if (!text) return '';

        const htmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };

        return text.replace(/[&<>"'\/]/g, (match) => htmlEntities[match]);
    }

    /**
     * Validate email
     * @param {string} email
     * @returns {boolean}
     */
    static isValidEmail(email) {
        return validator.isEmail(email);
    }

    /**
     * Validate phone number
     * @param {string} phone
     * @returns {boolean}
     */
    static isValidPhone(phone) {
        return VALIDATION.PHONE_REGEX.test(phone);
    }

    /**
     * Validate password strength
     * @param {string} password
     * @returns {object}
     */
    static validatePassword(password) {
        const result = {
            isValid: true,
            errors: [],
            score: 0
        };

        if (!password) {
            result.isValid = false;
            result.errors.push('Password is required');
            return result;
        }

        if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
            result.isValid = false;
            result.errors.push(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`);
        }

        // Check password strength
        let score = 0;

        // Length bonus
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;

        // Character variety
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        result.score = score;

        if (score < 3) {
            result.errors.push('Password is weak. Use a mix of letters, numbers, and symbols');
        }

        return result;
    }

    /**
     * Format file size
     * @param {number} bytes
     * @param {number} decimals
     * @returns {string}
     */
    static formatFileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Format number with Vietnamese locale
     * @param {number} number
     * @returns {string}
     */
    static formatNumber(number) {
        return new Intl.NumberFormat('vi-VN').format(number);
    }

    /**
     * Format currency (VND)
     * @param {number} amount
     * @returns {string}
     */
    static formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    /**
     * Truncate text
     * @param {string} text
     * @param {number} length
     * @param {string} suffix
     * @returns {string}
     */
    static truncateText(text, length = 100, suffix = '...') {
        if (!text || text.length <= length) return text;
        return text.substring(0, length - suffix.length) + suffix;
    }

    /**
     * Convert to title case
     * @param {string} text
     * @returns {string}
     */
    static toTitleCase(text) {
        return text.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    /**
     * Remove Vietnamese diacritics
     * @param {string} text
     * @returns {string}
     */
    static removeDiacritics(text) {
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D');
    }

    /**
     * Deep clone object
     * @param {object} obj
     * @returns {object}
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Check if object is empty
     * @param {object} obj
     * @returns {boolean}
     */
    static isEmpty(obj) {
        if (!obj) return true;
        return Object.keys(obj).length === 0;
    }

    /**
     * Remove undefined/null values from object
     * @param {object} obj
     * @returns {object}
     */
    static cleanObject(obj) {
        const cleaned = {};
        for (const key in obj) {
            if (obj[key] !== undefined && obj[key] !== null) {
                cleaned[key] = obj[key];
            }
        }
        return cleaned;
    }

    /**
     * Flatten nested object
     * @param {object} obj
     * @param {string} prefix
     * @returns {object}
     */
    static flattenObject(obj, prefix = '') {
        const flattened = {};

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;

                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    Object.assign(flattened, this.flattenObject(obj[key], newKey));
                } else {
                    flattened[newKey] = obj[key];
                }
            }
        }

        return flattened;
    }

    /**
     * Get nested object property
     * @param {object} obj
     * @param {string} path
     * @param {*} defaultValue
     * @returns {*}
     */
    static getNestedProperty(obj, path, defaultValue = undefined) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : defaultValue;
        }, obj);
    }

    /**
     * Set nested object property
     * @param {object} obj
     * @param {string} path
     * @param {*} value
     */
    static setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();

        const target = keys.reduce((current, key) => {
            if (current[key] === undefined) {
                current[key] = {};
            }
            return current[key];
        }, obj);

        target[lastKey] = value;
    }

    /**
     * Generate QR code data URL
     * @param {string} text
     * @param {object} options
     * @returns {Promise<string>}
     */
    static async generateQRCode(text, options = {}) {
        const QRCode = require('qrcode');

        const qrOptions = {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            ...options
        };

        return await QRCode.toDataURL(text, qrOptions);
    }

    /**
     * Validate ObjectId
     * @param {string} id
     * @returns {boolean}
     */
    static isValidObjectId(id) {
        return validator.isMongoId(id);
    }

    /**
     * Generate registration code
     * @param {string} prefix
     * @returns {string}
     */
    static generateRegistrationCode(prefix = 'REG') {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = this.generateRandomString(4, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Generate event code
     * @param {string} title
     * @returns {string}
     */
    static generateEventCode(title) {
        const slug = this.generateSlug(title);
        const words = slug.split('-').slice(0, 3);
        const code = words.map(word => word.substring(0, 3).toUpperCase()).join('');
        const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
        return `${code}${timestamp}`;
    }

    /**
     * Parse user agent
     * @param {string} userAgent
     * @returns {object}
     */
    static parseUserAgent(userAgent) {
        if (!userAgent) return { browser: 'Unknown', os: 'Unknown' };

        // Simple user agent parsing
        let browser = 'Unknown';
        let os = 'Unknown';

        // Browser detection
        if (userAgent.includes('Chrome')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';
        else if (userAgent.includes('Opera')) browser = 'Opera';

        // OS detection
        if (userAgent.includes('Windows')) os = 'Windows';
        else if (userAgent.includes('Mac OS')) os = 'macOS';
        else if (userAgent.includes('Linux')) os = 'Linux';
        else if (userAgent.includes('Android')) os = 'Android';
        else if (userAgent.includes('iOS')) os = 'iOS';

        return { browser, os };
    }

    /**
     * Mask email address
     * @param {string} email
     * @returns {string}
     */
    static maskEmail(email) {
        if (!email) return '';

        const [username, domain] = email.split('@');
        if (!username || !domain) return email;

        const maskedUsername = username.length > 2
            ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
            : username;

        return `${maskedUsername}@${domain}`;
    }

    /**
     * Mask phone number
     * @param {string} phone
     * @returns {string}
     */
    static maskPhone(phone) {
        if (!phone) return '';

        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 4) return phone;

        const visible = cleaned.slice(-4);
        const masked = '*'.repeat(cleaned.length - 4);

        return masked + visible;
    }

    /**
     * Generate pagination info
     * @param {number} page
     * @param {number} limit
     * @param {number} total
     * @returns {object}
     */
    static getPaginationInfo(page, limit, total) {
        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNext,
            hasPrev,
            nextPage: hasNext ? page + 1 : null,
            prevPage: hasPrev ? page - 1 : null,
            startIndex: (page - 1) * limit,
            endIndex: Math.min(page * limit - 1, total - 1)
        };
    }

    /**
     * Calculate distance between two coordinates
     * @param {number} lat1
     * @param {number} lon1
     * @param {number} lat2
     * @param {number} lon2
     * @returns {number} Distance in kilometers
     */
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees
     * @returns {number}
     */
    static toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Debounce function
     * @param {Function} func
     * @param {number} wait
     * @returns {Function}
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function
     * @param {Function} func
     * @param {number} limit
     * @returns {Function}
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Retry function with exponential backoff
     * @param {Function} fn
     * @param {number} retries
     * @param {number} delay
     * @returns {Promise}
     */
    static async retry(fn, retries = 3, delay = 1000) {
        try {
            return await fn();
        } catch (error) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retry(fn, retries - 1, delay * 2);
            }
            throw error;
        }
    }

    /**
     * Sleep/delay function
     * @param {number} ms
     * @returns {Promise}
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if string is JSON
     * @param {string} str
     * @returns {boolean}
     */
    static isJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get file extension
     * @param {string} filename
     * @returns {string}
     */
    static getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    /**
     * Check if file is image
     * @param {string} filename
     * @returns {boolean}
     */
    static isImageFile(filename) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
        return imageExtensions.includes(this.getFileExtension(filename));
    }

    /**
     * Generate color from string
     * @param {string} str
     * @returns {string}
     */
    static generateColorFromString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        const color = Math.floor(Math.abs((Math.sin(hash) * 16777215)) % 16777215).toString(16);
        return '#' + Array(6 - color.length + 1).join('0') + color;
    }

    /**
     * Get initials from name
     * @param {string} name
     * @returns {string}
     */
    static getInitials(name) {
        if (!name) return '';

        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    }

    /**
     * Validate Vietnamese student ID
     * @param {string} studentId
     * @returns {boolean}
     */
    static isValidStudentId(studentId) {
        if (!studentId) return false;

        // Check length
        if (studentId.length < VALIDATION.STUDENT_ID_MIN_LENGTH ||
            studentId.length > VALIDATION.STUDENT_ID_MAX_LENGTH) {
            return false;
        }

        // Check format (alphanumeric)
        return /^[a-zA-Z0-9]+$/.test(studentId);
    }
}

module.exports = Helpers;