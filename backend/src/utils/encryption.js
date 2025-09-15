const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { TOKEN_EXPIRATION } = require('./constants');

class Encryption {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.tagLength = 16;
        this.secretKey = process.env.ENCRYPTION_SECRET || crypto.randomBytes(this.keyLength);
    }

    /**
     * Encrypt text
     * @param {string} text
     * @returns {string}
     */
    encrypt(text) {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipher(this.algorithm, this.secretKey);
        cipher.setIV(iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag();

        return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    }

    /**
     * Decrypt text
     * @param {string} encryptedText
     * @returns {string}
     */
    decrypt(encryptedText) {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted text format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const tag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
        decipher.setIV(iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Hash data with SHA-256
     * @param {string} data
     * @returns {string}
     */
    hash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Hash data with SHA-256 and salt
     * @param {string} data
     * @param {string} salt
     * @returns {string}
     */
    hashWithSalt(data, salt) {
        return crypto.createHash('sha256').update(data + salt).digest('hex');
    }

    /**
     * Generate HMAC
     * @param {string} data
     * @param {string} secret
     * @returns {string}
     */
    generateHMAC(data, secret = this.secretKey) {
        return crypto.createHmac('sha256', secret).update(data).digest('hex');
    }

    /**
     * Verify HMAC
     * @param {string} data
     * @param {string} signature
     * @param {string} secret
     * @returns {boolean}
     */
    verifyHMAC(data, signature, secret = this.secretKey) {
        const expectedSignature = this.generateHMAC(data, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    /**
     * Generate JWT token
     * @param {object} payload
     * @param {string} secret
     * @param {object} options
     * @returns {string}
     */
    generateJWT(payload, secret = process.env.JWT_SECRET, options = {}) {
        const defaultOptions = {
            expiresIn: TOKEN_EXPIRATION.ACCESS_TOKEN / 1000, // Convert to seconds
            issuer: process.env.JWT_ISSUER || 'student-event-system',
            audience: process.env.JWT_AUDIENCE || 'student-event-users'
        };

        return jwt.sign(payload, secret, { ...defaultOptions, ...options });
    }

    /**
     * Verify JWT token
     * @param {string} token
     * @param {string} secret
     * @returns {object}
     */
    verifyJWT(token, secret = process.env.JWT_SECRET) {
        try {
            return jwt.verify(token, secret, {
                issuer: process.env.JWT_ISSUER || 'student-event-system',
                audience: process.env.JWT_AUDIENCE || 'student-event-users'
            });
        } catch (error) {
            throw new Error('Invalid token: ' + error.message);
        }
    }

    /**
     * Decode JWT token without verification
     * @param {string} token
     * @returns {object}
     */
    decodeJWT(token) {
        return jwt.decode(token, { complete: true });
    }

    /**
     * Generate refresh token
     * @param {object} payload
     * @returns {string}
     */
    generateRefreshToken(payload) {
        return this.generateJWT(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: TOKEN_EXPIRATION.REFRESH_TOKEN / 1000
        });
    }

    /**
     * Verify refresh token
     * @param {string} token
     * @returns {object}
     */
    verifyRefreshToken(token) {
        return this.verifyJWT(token, process.env.JWT_REFRESH_SECRET);
    }

    /**
     * Generate email verification token
     * @param {string} email
     * @param {string} userId
     * @returns {string}
     */
    generateEmailVerificationToken(email, userId) {
        const payload = {
            email,
            userId,
            type: 'email_verification'
        };

        return this.generateJWT(payload, process.env.JWT_EMAIL_SECRET, {
            expiresIn: TOKEN_EXPIRATION.EMAIL_VERIFICATION / 1000
        });
    }

    /**
     * Verify email verification token
     * @param {string} token
     * @returns {object}
     */
    verifyEmailVerificationToken(token) {
        return this.verifyJWT(token, process.env.JWT_EMAIL_SECRET);
    }

    /**
     * Generate password reset token
     * @param {string} email
     * @param {string} userId
     * @returns {string}
     */
    generatePasswordResetToken(email, userId) {
        const payload = {
            email,
            userId,
            type: 'password_reset'
        };

        return this.generateJWT(payload, process.env.JWT_PASSWORD_SECRET, {
            expiresIn: TOKEN_EXPIRATION.PASSWORD_RESET / 1000
        });
    }

    /**
     * Verify password reset token
     * @param {string} token
     * @returns {object}
     */
    verifyPasswordResetToken(token) {
        return this.verifyJWT(token, process.env.JWT_PASSWORD_SECRET);
    }

    /**
     * Generate API key
     * @param {string} prefix
     * @returns {string}
     */
    generateAPIKey(prefix = 'sem') {
        const randomBytes = crypto.randomBytes(32);
        const key = randomBytes.toString('base64').replace(/[+/]/g, '').substring(0, 32);
        return `${prefix}_${key}`;
    }

    /**
     * Generate 2FA secret
     * @param {string} serviceName
     * @param {string} accountName
     * @returns {object}
     */
    generate2FASecret(serviceName = 'Student Event Management', accountName) {
        const secret = speakeasy.generateSecret({
            name: accountName,
            issuer: serviceName,
            length: 32
        });

        return {
            secret: secret.base32,
            qrCodeUrl: secret.otpauth_url,
            manualEntryKey: secret.base32
        };
    }

    /**
     * Generate 2FA QR Code
     * @param {string} otpauthUrl
     * @returns {Promise<string>}
     */
    async generate2FAQRCode(otpauthUrl) {
        return await QRCode.toDataURL(otpauthUrl);
    }

    /**
     * Verify 2FA token
     * @param {string} token
     * @param {string} secret
     * @param {number} window
     * @returns {boolean}
     */
    verify2FAToken(token, secret, window = 2) {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: window,
            time: Math.floor(Date.now() / 1000)
        });
    }

    /**
     * Generate 2FA backup codes
     * @param {number} count
     * @returns {string[]}
     */
    generate2FABackupCodes(count = 8) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            // Generate 8-character alphanumeric code
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            // Format as XXXX-XXXX
            const formatted = code.substring(0, 4) + '-' + code.substring(4);
            codes.push(formatted);
        }
        return codes;
    }

    /**
     * Hash 2FA backup code
     * @param {string} code
     * @returns {string}
     */
    hash2FABackupCode(code) {
        return crypto.createHash('sha256').update(code + process.env.BACKUP_CODE_SALT).digest('hex');
    }

    /**
     * Verify 2FA backup code
     * @param {string} code
     * @param {string} hashedCode
     * @returns {boolean}
     */
    verify2FABackupCode(code, hashedCode) {
        const hash = this.hash2FABackupCode(code);
        return crypto.timingSafeEqual(
            Buffer.from(hash, 'hex'),
            Buffer.from(hashedCode, 'hex')
        );
    }

    /**
     * Generate session token
     * @param {string} userId
     * @param {string} userAgent
     * @param {string} ip
     * @returns {string}
     */
    generateSessionToken(userId, userAgent, ip) {
        const payload = {
            userId,
            sessionId: crypto.randomBytes(16).toString('hex'),
            userAgent: this.hash(userAgent),
            ip: this.hash(ip),
            type: 'session',
            createdAt: Date.now()
        };

        return this.generateJWT(payload, process.env.JWT_SESSION_SECRET, {
            expiresIn: TOKEN_EXPIRATION.REFRESH_TOKEN / 1000
        });
    }

    /**
     * Verify session token
     * @param {string} token
     * @param {string} userAgent
     * @param {string} ip
     * @returns {object}
     */
    verifySessionToken(token, userAgent, ip) {
        const decoded = this.verifyJWT(token, process.env.JWT_SESSION_SECRET);

        // Verify user agent and IP (optional for security)
        const hashedUserAgent = this.hash(userAgent);
        const hashedIP = this.hash(ip);

        if (process.env.STRICT_SESSION_VALIDATION === 'true') {
            if (decoded.userAgent !== hashedUserAgent) {
                throw new Error('Session user agent mismatch');
            }
            if (decoded.ip !== hashedIP) {
                throw new Error('Session IP mismatch');
            }
        }

        return decoded;
    }

    /**
     * Generate secure random password
     * @param {number} length
     * @param {object} options
     * @returns {string}
     */
    generateSecurePassword(length = 12, options = {}) {
        const defaults = {
            includeUppercase: true,
            includeLowercase: true,
            includeNumbers: true,
            includeSymbols: true,
            excludeAmbiguous: true
        };

        const settings = { ...defaults, ...options };

        let charset = '';

        if (settings.includeLowercase) {
            charset += settings.excludeAmbiguous ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
        }

        if (settings.includeUppercase) {
            charset += settings.excludeAmbiguous ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        }

        if (settings.includeNumbers) {
            charset += settings.excludeAmbiguous ? '23456789' : '0123456789';
        }

        if (settings.includeSymbols) {
            charset += settings.excludeAmbiguous ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
        }

        let password = '';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);

        for (let i = 0; i < length; i++) {
            password += charset.charAt(array[i] % charset.length);
        }

        return password;
    }

    /**
     * Encrypt sensitive data for database storage
     * @param {string} data
     * @returns {string}
     */
    encryptSensitiveData(data) {
        if (!data) return data;

        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipher('aes-256-cbc', process.env.DB_ENCRYPTION_KEY);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * Decrypt sensitive data from database
     * @param {string} encryptedData
     * @returns {string}
     */
    decryptSensitiveData(encryptedData) {
        if (!encryptedData || typeof encryptedData !== 'string') return encryptedData;

        const parts = encryptedData.split(':');
        if (parts.length !== 2) return encryptedData;

        try {
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];

            const decipher = crypto.createDecipher('aes-256-cbc', process.env.DB_ENCRYPTION_KEY);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            // Return original data if decryption fails (might not be encrypted)
            return encryptedData;
        }
    }

    /**
     * Generate file hash
     * @param {Buffer} fileBuffer
     * @returns {string}
     */
    generateFileHash(fileBuffer) {
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    /**
     * Generate file checksum
     * @param {Buffer} fileBuffer
     * @returns {string}
     */
    generateFileChecksum(fileBuffer) {
        return crypto.createHash('md5').update(fileBuffer).digest('hex');
    }

    /**
     * Generate webhook signature
     * @param {string} payload
     * @param {string} secret
     * @returns {string}
     */
    generateWebhookSignature(payload, secret) {
        return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    }

    /**
     * Verify webhook signature
     * @param {string} payload
     * @param {string} signature
     * @param {string} secret
     * @returns {boolean}
     */
    verifyWebhookSignature(payload, signature, secret) {
        const expectedSignature = this.generateWebhookSignature(payload, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    /**
     * Encrypt URL parameters
     * @param {object} params
     * @returns {string}
     */
    encryptUrlParams(params) {
        const jsonString = JSON.stringify(params);
        return encodeURIComponent(this.encrypt(jsonString));
    }

    /**
     * Decrypt URL parameters
     * @param {string} encryptedParams
     * @returns {object}
     */
    decryptUrlParams(encryptedParams) {
        try {
            const decrypted = this.decrypt(decodeURIComponent(encryptedParams));
            return JSON.parse(decrypted);
        } catch (error) {
            throw new Error('Invalid encrypted parameters');
        }
    }

    /**
     * Generate rate limit key
     * @param {string} identifier
     * @param {string} action
     * @returns {string}
     */
    generateRateLimitKey(identifier, action) {
        return this.hash(`${identifier}:${action}:${process.env.RATE_LIMIT_SECRET}`);
    }

    /**
     * Generate CSRF token
     * @param {string} sessionId
     * @returns {string}
     */
    generateCSRFToken(sessionId) {
        const timestamp = Date.now();
        const random = crypto.randomBytes(16).toString('hex');
        const payload = `${sessionId}:${timestamp}:${random}`;
        const signature = this.generateHMAC(payload, process.env.CSRF_SECRET);

        return Buffer.from(`${payload}:${signature}`).toString('base64');
    }

    /**
     * Verify CSRF token
     * @param {string} token
     * @param {string} sessionId
     * @param {number} maxAge
     * @returns {boolean}
     */
    verifyCSRFToken(token, sessionId, maxAge = 3600000) { // 1 hour default
        try {
            const decoded = Buffer.from(token, 'base64').toString();
            const parts = decoded.split(':');

            if (parts.length !== 4) return false;

            const [tokenSessionId, timestamp, random, signature] = parts;

            // Check session ID
            if (tokenSessionId !== sessionId) return false;

            // Check timestamp (token age)
            if (Date.now() - parseInt(timestamp) > maxAge) return false;

            // Verify signature
            const payload = `${tokenSessionId}:${timestamp}:${random}`;
            return this.verifyHMAC(payload, signature, process.env.CSRF_SECRET);
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate secure random bytes
     * @param {number} length
     * @returns {Buffer}
     */
    generateSecureRandomBytes(length) {
        return crypto.randomBytes(length);
    }

    /**
     * Generate nonce
     * @param {number} length
     * @returns {string}
     */
    generateNonce(length = 16) {
        return crypto.randomBytes(length).toString('base64');
    }

    /**
     * Key derivation function
     * @param {string} password
     * @param {Buffer} salt
     * @param {number} iterations
     * @param {number} keyLength
     * @returns {Buffer}
     */
    deriveKey(password, salt, iterations = 100000, keyLength = 32) {
        return crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
    }

    /**
     * Generate salt
     * @param {number} length
     * @returns {Buffer}
     */
    generateSalt(length = 16) {
        return crypto.randomBytes(length);
    }

    /**
     * Secure compare strings
     * @param {string} a
     * @param {string} b
     * @returns {boolean}
     */
    secureCompare(a, b) {
        if (a.length !== b.length) return false;

        return crypto.timingSafeEqual(
            Buffer.from(a),
            Buffer.from(b)
        );
    }

    /**
     * Generate one-time token
     * @param {string} identifier
     * @param {number} expiresIn
     * @returns {string}
     */
    generateOneTimeToken(identifier, expiresIn = 300000) { // 5 minutes default
        const payload = {
            identifier,
            exp: Math.floor((Date.now() + expiresIn) / 1000),
            nonce: crypto.randomBytes(16).toString('hex'),
            type: 'one_time'
        };

        return this.generateJWT(payload, process.env.JWT_ONE_TIME_SECRET);
    }

    /**
     * Verify one-time token
     * @param {string} token
     * @returns {object}
     */
    verifyOneTimeToken(token) {
        return this.verifyJWT(token, process.env.JWT_ONE_TIME_SECRET);
    }

    /**
     * Mask sensitive data
     * @param {string} data
     * @param {number} visibleChars
     * @param {string} maskChar
     * @returns {string}
     */
    maskSensitiveData(data, visibleChars = 4, maskChar = '*') {
        if (!data || data.length <= visibleChars) return data;

        const visible = data.slice(-visibleChars);
        const masked = maskChar.repeat(data.length - visibleChars);

        return masked + visible;
    }
}

module.exports = new Encryption();