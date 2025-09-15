const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../../models/User');
const redisClient = require('../../config/redis');
const emailService = require('../notifications/emailService');
const logger = require('../../utils/logger');

class AuthService {
    // Generate JWT tokens
    generateTokens(user) {
        const payload = {
            userId: user._id,
            email: user.email,
            role: user.role,
            permissions: user.permissions
        };

        const accessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
        );

        return { accessToken, refreshToken };
    }

    // Verify JWT token
    verifyToken(token, secret = process.env.JWT_SECRET) {
        try {
            return jwt.verify(token, secret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            throw error;
        }
    }

    // Register new user
    async register(userData) {
        try {
            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [
                    { email: userData.email.toLowerCase() },
                    { username: userData.username },
                    { 'student.studentId': userData.studentId }
                ]
            });

            if (existingUser) {
                if (existingUser.email === userData.email.toLowerCase()) {
                    throw new Error('Email already registered');
                }
                if (existingUser.username === userData.username) {
                    throw new Error('Username already taken');
                }
                if (existingUser.student.studentId === userData.studentId) {
                    throw new Error('Student ID already registered');
                }
            }

            // Create new user
            const user = new User({
                email: userData.email.toLowerCase(),
                username: userData.username,
                password: userData.password,
                profile: {
                    firstName: userData.firstName,
                    lastName: userData.lastName
                },
                student: {
                    studentId: userData.studentId,
                    faculty: userData.faculty,
                    department: userData.department,
                    major: userData.major,
                    year: userData.year
                },
                role: userData.role || 'student'
            });

            // Generate email verification token
            const verificationToken = user.generateEmailVerificationToken();
            await user.save();

            // Send verification email
            await this.sendVerificationEmail(user, verificationToken);

            logger.info(`New user registered: ${user.email}`);

            // Generate tokens
            const tokens = this.generateTokens(user);

            // Store refresh token in Redis
            await this.storeRefreshToken(user._id, tokens.refreshToken);

            return {
                user: user.toJSON(),
                tokens,
                message: 'Registration successful. Please check your email to verify your account.'
            };
        } catch (error) {
            logger.error('Registration error:', error);
            throw error;
        }
    }

    // Login user
    async login(credentials, loginInfo = {}) {
        try {
            const { emailOrUsername, password } = credentials;

            // Find user by email or username
            const user = await User.findOne({
                $or: [
                    { email: emailOrUsername.toLowerCase() },
                    { username: emailOrUsername }
                ]
            });

            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Check if account is locked
            if (user.isLocked) {
                throw new Error('Account temporarily locked due to too many failed login attempts');
            }

            // Check if account is active
            if (user.status !== 'active') {
                throw new Error('Account is inactive');
            }

            // Verify password
            const isValidPassword = await user.comparePassword(password);
            if (!isValidPassword) {
                await user.incrementLoginAttempts();
                throw new Error('Invalid credentials');
            }

            // Reset login attempts on successful login
            if (user.loginAttempts > 0) {
                await user.resetLoginAttempts();
            }

            // Update last login and login history
            user.lastLogin = new Date();
            user.lastActivity = new Date();

            if (loginInfo.ip || loginInfo.userAgent) {
                user.loginHistory.push({
                    timestamp: new Date(),
                    ip: loginInfo.ip,
                    userAgent: loginInfo.userAgent,
                    location: loginInfo.location
                });

                // Keep only last 10 login records
                if (user.loginHistory.length > 10) {
                    user.loginHistory = user.loginHistory.slice(-10);
                }
            }

            await user.save();

            logger.info(`User logged in: ${user.email}`);

            // Generate tokens
            const tokens = this.generateTokens(user);

            // Store refresh token in Redis
            await this.storeRefreshToken(user._id, tokens.refreshToken);

            return {
                user: user.toJSON(),
                tokens
            };
        } catch (error) {
            logger.error('Login error:', error);
            throw error;
        }
    }

    // OAuth login/register
    async oauthLogin(provider, profile) {
        try {
            let user = await User.findOne({
                $or: [
                    { [`oauth.${provider}.id`]: profile.id },
                    { email: profile.email.toLowerCase() }
                ]
            });

            if (user) {
                // Update OAuth info if not set
                if (!user.oauth[provider].id) {
                    user.oauth[provider] = {
                        id: profile.id,
                        email: profile.email,
                        verified: true
                    };
                    user.emailVerified = true;
                    await user.save();
                }

                // Update last login
                user.lastLogin = new Date();
                user.lastActivity = new Date();
                await user.save();
            } else {
                // Create new user from OAuth profile
                user = new User({
                    email: profile.email.toLowerCase(),
                    username: this.generateUsername(profile.displayName || profile.email),
                    profile: {
                        firstName: profile.name.givenName || '',
                        lastName: profile.name.familyName || '',
                        avatar: profile.photos?.[0]?.value || ''
                    },
                    oauth: {
                        [provider]: {
                            id: profile.id,
                            email: profile.email,
                            verified: true
                        }
                    },
                    emailVerified: true,
                    role: 'student'
                });

                await user.save();
                logger.info(`New OAuth user created: ${user.email} via ${provider}`);
            }

            // Generate tokens
            const tokens = this.generateTokens(user);

            // Store refresh token in Redis
            await this.storeRefreshToken(user._id, tokens.refreshToken);

            return {
                user: user.toJSON(),
                tokens
            };
        } catch (error) {
            logger.error(`OAuth login error (${provider}):`, error);
            throw error;
        }
    }

    // Refresh access token
    async refreshToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = this.verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);

            // Check if refresh token exists in Redis
            const storedToken = await redisClient.get(`refresh_token:${decoded.userId}`);
            if (storedToken !== refreshToken) {
                throw new Error('Invalid refresh token');
            }

            // Get user
            const user = await User.findById(decoded.userId);
            if (!user || user.status !== 'active') {
                throw new Error('User not found or inactive');
            }

            // Generate new tokens
            const tokens = this.generateTokens(user);

            // Update refresh token in Redis
            await this.storeRefreshToken(user._id, tokens.refreshToken);

            return { tokens };
        } catch (error) {
            logger.error('Refresh token error:', error);
            throw error;
        }
    }

    // Logout user
    async logout(userId, refreshToken) {
        try {
            // Remove refresh token from Redis
            await redisClient.del(`refresh_token:${userId}`);

            // Add access token to blacklist (optional)
            // await redisClient.set(`blacklist:${accessToken}`, 'true', 'EX', 900); // 15 minutes

            logger.info(`User logged out: ${userId}`);
            return true;
        } catch (error) {
            logger.error('Logout error:', error);
            throw error;
        }
    }

    // Send password reset email
    async forgotPassword(email) {
        try {
            const user = await User.findByEmail(email);
            if (!user) {
                // Don't reveal if email exists
                return { message: 'If an account with that email exists, we have sent a password reset link.' };
            }

            // Generate reset token
            const resetToken = user.generatePasswordResetToken();
            await user.save();

            // Send reset email
            await emailService.sendPasswordResetEmail(user, resetToken);

            logger.info(`Password reset requested for: ${email}`);
            return { message: 'If an account with that email exists, we have sent a password reset link.' };
        } catch (error) {
            logger.error('Forgot password error:', error);
            throw error;
        }
    }

    // Reset password
    async resetPassword(token, newPassword) {
        try {
            // Hash the token to compare with stored hash
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            const user = await User.findOne({
                passwordResetToken: hashedToken,
                passwordResetExpires: { $gt: Date.now() }
            });

            if (!user) {
                throw new Error('Invalid or expired reset token');
            }

            // Update password
            user.password = newPassword;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            user.loginAttempts = 0;
            user.lockUntil = undefined;

            await user.save();

            // Invalidate all existing refresh tokens
            await redisClient.del(`refresh_token:${user._id}`);

            logger.info(`Password reset completed for: ${user.email}`);
            return { message: 'Password reset successful' };
        } catch (error) {
            logger.error('Reset password error:', error);
            throw error;
        }
    }

    // Change password
    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isValidPassword = await user.comparePassword(currentPassword);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }

            // Update password
            user.password = newPassword;
            await user.save();

            // Invalidate all existing refresh tokens except current one
            await redisClient.del(`refresh_token:${userId}`);

            logger.info(`Password changed for user: ${user.email}`);
            return { message: 'Password changed successfully' };
        } catch (error) {
            logger.error('Change password error:', error);
            throw error;
        }
    }

    // Verify email
    async verifyEmail(token) {
        try {
            // Hash the token to compare with stored hash
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            const user = await User.findOne({
                emailVerificationToken: hashedToken,
                emailVerificationExpires: { $gt: Date.now() }
            });

            if (!user) {
                throw new Error('Invalid or expired verification token');
            }

            // Mark email as verified
            user.emailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;

            await user.save();

            logger.info(`Email verified for user: ${user.email}`);
            return { message: 'Email verified successfully' };
        } catch (error) {
            logger.error('Email verification error:', error);
            throw error;
        }
    }

    // Resend verification email
    async resendVerificationEmail(email) {
        try {
            const user = await User.findByEmail(email);
            if (!user) {
                return { message: 'If an account with that email exists, we have sent a verification link.' };
            }

            if (user.emailVerified) {
                return { message: 'Email is already verified' };
            }

            // Generate new verification token
            const verificationToken = user.generateEmailVerificationToken();
            await user.save();

            // Send verification email
            await this.sendVerificationEmail(user, verificationToken);

            return { message: 'Verification email sent' };
        } catch (error) {
            logger.error('Resend verification email error:', error);
            throw error;
        }
    }

    // Helper methods
    async storeRefreshToken(userId, refreshToken) {
        const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
        await redisClient.set(`refresh_token:${userId}`, refreshToken, expiresIn);
    }

    async sendVerificationEmail(user, token) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

        await emailService.sendEmail({
            to: user.email,
            subject: 'Verify Your Email Address',
            template: 'email-verification',
            data: {
                firstName: user.profile.firstName,
                verificationUrl,
                siteName: 'Student Event Management'
            }
        });
    }

    generateUsername(displayName) {
        const baseUsername = displayName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20);

        const randomSuffix = Math.floor(Math.random() * 1000);
        return `${baseUsername}${randomSuffix}`;
    }

    // Validate user permissions
    async validatePermission(userId, permission) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return false;
            }

            // Admin has all permissions
            if (user.role === 'admin') {
                return true;
            }

            return user.hasPermission(permission);
        } catch (error) {
            logger.error('Permission validation error:', error);
            return false;
        }
    }

    // Get user profile
    async getProfile(userId) {
        try {
            const user = await User.findById(userId).select('-password');
            if (!user) {
                throw new Error('User not found');
            }

            return user;
        } catch (error) {
            logger.error('Get profile error:', error);
            throw error;
        }
    }

    // Update user profile
    async updateProfile(userId, updateData) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Update allowed fields
            const allowedUpdates = [
                'profile.firstName',
                'profile.lastName',
                'profile.phone',
                'profile.dateOfBirth',
                'profile.gender',
                'profile.address',
                'profile.bio',
                'student.faculty',
                'student.department',
                'student.major',
                'student.year',
                'preferences'
            ];

            allowedUpdates.forEach(field => {
                if (updateData[field] !== undefined) {
                    const keys = field.split('.');
                    let current = user;
                    for (let i = 0; i < keys.length - 1; i++) {
                        current = current[keys[i]];
                    }
                    current[keys[keys.length - 1]] = updateData[field];
                }
            });

            await user.save();

            logger.info(`Profile updated for user: ${user.email}`);
            return user.toJSON();
        } catch (error) {
            logger.error('Update profile error:', error);
            throw error;
        }
    }
}

module.exports = new AuthService();