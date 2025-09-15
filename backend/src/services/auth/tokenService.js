const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const redisClient = require('../../config/redis');
const logger = require('../../utils/logger');

class TokenService {
    constructor() {
        this.accessTokenExpiry = process.env.JWT_EXPIRE || '15m';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRE || '7d';
        this.resetTokenExpiry = 30 * 60 * 1000; // 30 minutes
        this.verificationTokenExpiry = 24 * 60 * 60 * 1000; // 24 hours
    }

    // Generate access token
    generateAccessToken(payload) {
        try {
            return jwt.sign(
                {
                    ...payload,
                    type: 'access',
                    iat: Math.floor(Date.now() / 1000)
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: this.accessTokenExpiry,
                    issuer: 'student-event-management',
                    audience: 'student-event-app'
                }
            );
        } catch (error) {
            logger.error('Generate access token error:', error);
            throw new Error('Không thể tạo access token');
        }
    }

    // Generate refresh token
    generateRefreshToken(userId) {
        try {
            return jwt.sign(
                {
                    userId,
                    type: 'refresh',
                    iat: Math.floor(Date.now() / 1000)
                },
                process.env.JWT_REFRESH_SECRET,
                {
                    expiresIn: this.refreshTokenExpiry,
                    issuer: 'student-event-management',
                    audience: 'student-event-app'
                }
            );
        } catch (error) {
            logger.error('Generate refresh token error:', error);
            throw new Error('Không thể tạo refresh token');
        }
    }

    // Generate secure random token
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Generate password reset token
    generatePasswordResetToken() {
        const token = this.generateSecureToken();
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const expires = new Date(Date.now() + this.resetTokenExpiry);

        return {
            token,
            hashedToken,
            expires
        };
    }

    // Generate email verification token
    generateEmailVerificationToken() {
        const token = this.generateSecureToken();
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const expires = new Date(Date.now() + this.verificationTokenExpiry);

        return {
            token,
            hashedToken,
            expires
        };
    }

    // Verify token
    verifyToken(token, secret = process.env.JWT_SECRET) {
        try {
            const decoded = jwt.verify(token, secret, {
                issuer: 'student-event-management',
                audience: 'student-event-app'
            });

            return {
                valid: true,
                decoded,
                expired: false
            };
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return {
                    valid: false,
                    decoded: null,
                    expired: true,
                    error: 'Token đã hết hạn'
                };
            } else if (error.name === 'JsonWebTokenError') {
                return {
                    valid: false,
                    decoded: null,
                    expired: false,
                    error: 'Token không hợp lệ'
                };
            }

            logger.error('Token verification error:', error);
            return {
                valid: false,
                decoded: null,
                expired: false,
                error: 'Lỗi xác thực token'
            };
        }
    }

    // Verify refresh token
    verifyRefreshToken(token) {
        return this.verifyToken(token, process.env.JWT_REFRESH_SECRET);
    }

    // Store refresh token in Redis
    async storeRefreshToken(userId, refreshToken, deviceInfo = {}) {
        try {
            const key = `refresh_token:${userId}`;
            const tokenData = {
                token: refreshToken,
                createdAt: new Date(),
                deviceInfo: {
                    userAgent: deviceInfo.userAgent,
                    ip: deviceInfo.ip,
                    platform: deviceInfo.platform
                }
            };

            // Store with expiration
            const expirySeconds = this.parseExpiry(this.refreshTokenExpiry);
            await redisClient.set(key, JSON.stringify(tokenData), expirySeconds);

            return true;
        } catch (error) {
            logger.error('Store refresh token error:', error);
            throw new Error('Không thể lưu refresh token');
        }
    }

    // Get refresh token from Redis
    async getRefreshToken(userId) {
        try {
            const key = `refresh_token:${userId}`;
            const tokenData = await redisClient.get(key);

            if (!tokenData) {
                return null;
            }

            return JSON.parse(tokenData);
        } catch (error) {
            logger.error('Get refresh token error:', error);
            return null;
        }
    }

    // Remove refresh token
    async removeRefreshToken(userId) {
        try {
            const key = `refresh_token:${userId}`;
            await redisClient.del(key);
            return true;
        } catch (error) {
            logger.error('Remove refresh token error:', error);
            return false;
        }
    }

    // Blacklist access token
    async blacklistAccessToken(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return false;
            }

            const key = `blacklist:${token}`;
            const ttl = decoded.exp - Math.floor(Date.now() / 1000);

            if (ttl > 0) {
                await redisClient.set(key, 'true', ttl);
            }

            return true;
        } catch (error) {
            logger.error('Blacklist token error:', error);
            return false;
        }
    }

    // Check if token is blacklisted
    async isTokenBlacklisted(token) {
        try {
            const key = `blacklist:${token}`;
            const result = await redisClient.get(key);
            return !!result;
        } catch (error) {
            logger.error('Check blacklist error:', error);
            return false;
        }
    }

    // Generate device token for mobile apps
    generateDeviceToken(userId, deviceId, deviceInfo) {
        try {
            const payload = {
                userId,
                deviceId,
                deviceInfo: {
                    platform: deviceInfo.platform,
                    version: deviceInfo.version,
                    model: deviceInfo.model
                },
                type: 'device'
            };

            return jwt.sign(
                payload,
                process.env.JWT_SECRET,
                {
                    expiresIn: '30d',
                    issuer: 'student-event-management'
                }
            );
        } catch (error) {
            logger.error('Generate device token error:', error);
            throw new Error('Không thể tạo device token');
        }
    }

    // Generate API key for external integrations
    generateApiKey(userId, permissions = [], expiry = '1y') {
        try {
            const payload = {
                userId,
                permissions,
                type: 'api_key',
                keyId: this.generateSecureToken(16)
            };

            return jwt.sign(
                payload,
                process.env.JWT_SECRET,
                {
                    expiresIn: expiry,
                    issuer: 'student-event-management'
                }
            );
        } catch (error) {
            logger.error('Generate API key error:', error);
            throw new Error('Không thể tạo API key');
        }
    }

    // Generate temporary access token for specific actions
    generateTemporaryToken(userId, action, data = {}, expiry = '10m') {
        try {
            const payload = {
                userId,
                action,
                data,
                type: 'temporary',
                iat: Math.floor(Date.now() / 1000)
            };

            return jwt.sign(
                payload,
                process.env.JWT_SECRET,
                {
                    expiresIn: expiry,
                    issuer: 'student-event-management'
                }
            );
        } catch (error) {
            logger.error('Generate temporary token error:', error);
            throw new Error('Không thể tạo temporary token');
        }
    }

    // Verify temporary token
    verifyTemporaryToken(token, expectedAction) {
        try {
            const result = this.verifyToken(token);

            if (!result.valid) {
                return result;
            }

            const { decoded } = result;

            if (decoded.type !== 'temporary') {
                return {
                    valid: false,
                    error: 'Token không phải là temporary token'
                };
            }

            if (expectedAction && decoded.action !== expectedAction) {
                return {
                    valid: false,
                    error: 'Action không khớp'
                };
            }

            return {
                valid: true,
                decoded,
                action: decoded.action,
                data: decoded.data
            };

        } catch (error) {
            logger.error('Verify temporary token error:', error);
            return {
                valid: false,
                error: 'Lỗi xác thực temporary token'
            };
        }
    }

    // Parse token expiry string to seconds
    parseExpiry(expiryString) {
        const units = {
            's': 1,
            'm': 60,
            'h': 3600,
            'd': 86400,
            'w': 604800,
            'y': 31536000
        };

        const match = expiryString.match(/^(\d+)([smhdwy])$/);
        if (!match) {
            return 900; // Default 15 minutes
        }

        const [, value, unit] = match;
        return parseInt(value) * (units[unit] || 1);
    }

    // Get token expiration date
    getTokenExpiration(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return null;
            }

            return new Date(decoded.exp * 1000);
        } catch (error) {
            logger.error('Get token expiration error:', error);
            return null;
        }
    }

    // Check if token is about to expire
    isTokenExpiring(token, thresholdMinutes = 5) {
        try {
            const expiration = this.getTokenExpiration(token);
            if (!expiration) {
                return true;
            }

            const threshold = new Date(Date.now() + (thresholdMinutes * 60 * 1000));
            return expiration <= threshold;
        } catch (error) {
            logger.error('Check token expiring error:', error);
            return true;
        }
    }

    // Clean up expired tokens
    async cleanupExpiredTokens() {
        try {
            const patterns = [
                'refresh_token:*',
                'blacklist:*',
                'temp_token:*'
            ];

            let cleaned = 0;

            for (const pattern of patterns) {
                // This would need proper Redis SCAN implementation
                // For now, just log the cleanup attempt
                logger.debug(`Cleaning up tokens matching pattern: ${pattern}`);
            }

            logger.info(`Token cleanup completed: ${cleaned} tokens removed`);
            return cleaned;
        } catch (error) {
            logger.error('Token cleanup error:', error);
            return 0;
        }
    }

    // Get token statistics
    async getTokenStatistics() {
        try {
            // Get counts from Redis
            const refreshTokenKeys = await redisClient.keys('refresh_token:*');
            const blacklistedTokenKeys = await redisClient.keys('blacklist:*');

            return {
                activeRefreshTokens: refreshTokenKeys.length,
                blacklistedTokens: blacklistedTokenKeys.length,
                cleanupLastRun: await redisClient.get('token_cleanup_last_run') || 'Never'
            };
        } catch (error) {
            logger.error('Get token statistics error:', error);
            return {
                activeRefreshTokens: 0,
                blacklistedTokens: 0,
                cleanupLastRun: 'Error'
            };
        }
    }
}

// Schedule token cleanup every 6 hours
const tokenService = new TokenService();
setInterval(() => {
    tokenService.cleanupExpiredTokens().then(() => {
        redisClient.set('token_cleanup_last_run', new Date().toISOString());
    }).catch(error => {
        logger.error('Scheduled token cleanup failed:', error);
    });
}, 6 * 60 * 60 * 1000);

module.exports = tokenService;