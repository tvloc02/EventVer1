const authService = require('../../services/auth/authService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class AuthController {
    // Register new user
    async register(req, res) {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const result = await authService.register(req.body);

            res.status(201).json({
                success: true,
                message: result.message,
                data: {
                    user: result.user,
                    tokens: result.tokens
                }
            });

        } catch (error) {
            logger.error('Register controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Registration failed'
            });
        }
    }

    // Login user
    async login(req, res) {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const loginInfo = {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                location: req.get('X-Forwarded-For') || req.connection.remoteAddress
            };

            const result = await authService.login(req.body, loginInfo);

            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: result.user,
                    accessToken: result.tokens.accessToken
                }
            });

        } catch (error) {
            logger.error('Login controller error:', error);

            // Handle specific error types
            if (error.message.includes('locked')) {
                return res.status(423).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(401).json({
                success: false,
                message: error.message || 'Login failed'
            });
        }
    }

    // Refresh access token
    async refreshToken(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token not provided'
                });
            }

            const result = await authService.refreshToken(refreshToken);

            // Update refresh token cookie
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    accessToken: result.tokens.accessToken
                }
            });

        } catch (error) {
            logger.error('Refresh token controller error:', error);
            res.status(401).json({
                success: false,
                message: error.message || 'Token refresh failed'
            });
        }
    }

    // Logout user
    async logout(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken;
            const userId = req.user?.userId;

            if (refreshToken && userId) {
                await authService.logout(userId, refreshToken);
            }

            // Clear refresh token cookie
            res.clearCookie('refreshToken');

            res.json({
                success: true,
                message: 'Logout successful'
            });

        } catch (error) {
            logger.error('Logout controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
    }

    // Forgot password
    async forgotPassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const result = await authService.forgotPassword(req.body.email);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            logger.error('Forgot password controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process forgot password request'
            });
        }
    }

    // Reset password
    async resetPassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { token, password } = req.body;
            const result = await authService.resetPassword(token, password);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            logger.error('Reset password controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Password reset failed'
            });
        }
    }

    // Change password
    async changePassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { currentPassword, newPassword } = req.body;
            const userId = req.user.userId;

            const result = await authService.changePassword(userId, currentPassword, newPassword);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            logger.error('Change password controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Password change failed'
            });
        }
    }

    // Verify email
    async verifyEmail(req, res) {
        try {
            const { token } = req.query;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification token is required'
                });
            }

            const result = await authService.verifyEmail(token);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            logger.error('Verify email controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Email verification failed'
            });
        }
    }

    // Resend verification email
    async resendVerificationEmail(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const result = await authService.resendVerificationEmail(req.body.email);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            logger.error('Resend verification email controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to resend verification email'
            });
        }
    }

    // Get current user profile
    async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            const user = await authService.getProfile(userId);

            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            logger.error('Get profile controller error:', error);
            res.status(404).json({
                success: false,
                message: error.message || 'User not found'
            });
        }
    }

    // Update user profile
    async updateProfile(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const userId = req.user.userId;
            const updatedUser = await authService.updateProfile(userId, req.body);

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: updatedUser
            });

        } catch (error) {
            logger.error('Update profile controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Profile update failed'
            });
        }
    }

    // Check authentication status
    async checkAuth(req, res) {
        try {
            const userId = req.user.userId;
            const user = await authService.getProfile(userId);

            res.json({
                success: true,
                data: {
                    user,
                    authenticated: true
                }
            });

        } catch (error) {
            logger.error('Check auth controller error:', error);
            res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
    }

    // Upload avatar
    async uploadAvatar(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const userId = req.user.userId;
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;

            const updatedUser = await authService.updateProfile(userId, {
                'profile.avatar': avatarUrl
            });

            res.json({
                success: true,
                message: 'Avatar uploaded successfully',
                data: {
                    avatarUrl,
                    user: updatedUser
                }
            });

        } catch (error) {
            logger.error('Upload avatar controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Avatar upload failed'
            });
        }
    }

    // Delete account
    async deleteAccount(req, res) {
        try {
            const { password } = req.body;
            const userId = req.user.userId;

            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: 'Password is required to delete account'
                });
            }

            // Verify password before deletion
            const user = await User.findById(userId);
            const isValidPassword = await user.comparePassword(password);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid password'
                });
            }

            // Soft delete - deactivate account
            user.status = 'inactive';
            user.email = `deleted_${Date.now()}_${user.email}`;
            user.username = `deleted_${Date.now()}_${user.username}`;
            await user.save();

            // Logout user
            await authService.logout(userId, req.cookies.refreshToken);
            res.clearCookie('refreshToken');

            res.json({
                success: true,
                message: 'Account deleted successfully'
            });

        } catch (error) {
            logger.error('Delete account controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Account deletion failed'
            });
        }
    }

    // Get login history
    async getLoginHistory(req, res) {
        try {
            const userId = req.user.userId;
            const user = await authService.getProfile(userId);

            res.json({
                success: true,
                data: {
                    loginHistory: user.loginHistory || [],
                    lastLogin: user.lastLogin
                }
            });

        } catch (error) {
            logger.error('Get login history controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get login history'
            });
        }
    }
}

module.exports = new AuthController();