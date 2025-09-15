const passwordService = require('../../services/auth/passwordService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class PasswordController {
    // Đổi mật khẩu
    async changePassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { currentPassword, newPassword } = req.body;
            const userId = req.user.userId;

            const result = await passwordService.changePassword(userId, currentPassword, newPassword);

            res.json({
                success: true,
                message: 'Đổi mật khẩu thành công',
                data: result
            });

        } catch (error) {
            logger.error('Change password controller error:', error);
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Đổi mật khẩu thất bại'
            });
        }
    }

    // Đặt lại mật khẩu (quên mật khẩu)
    async resetPassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { token, newPassword } = req.body;

            const result = await passwordService.resetPassword(token, newPassword);

            res.json({
                success: true,
                message: 'Đặt lại mật khẩu thành công',
                data: result
            });

        } catch (error) {
            logger.error('Reset password controller error:', error);
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Đặt lại mật khẩu thất bại'
            });
        }
    }

    // Gửi email đặt lại mật khẩu
    async sendPasswordResetEmail(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { email } = req.body;

            const result = await passwordService.sendPasswordResetEmail(email);

            res.json({
                success: true,
                message: 'Email đặt lại mật khẩu đã được gửi',
                data: result
            });

        } catch (error) {
            logger.error('Send password reset email controller error:', error);
            // Always return success to prevent email enumeration
            res.json({
                success: true,
                message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu'
            });
        }
    }

    // Xác thực token đặt lại mật khẩu
    async verifyResetToken(req, res) {
        try {
            const { token } = req.params;

            const result = await passwordService.verifyResetToken(token);

            res.json({
                success: true,
                message: 'Token hợp lệ',
                data: {
                    valid: result.valid,
                    email: result.email,
                    expiresAt: result.expiresAt
                }
            });

        } catch (error) {
            logger.error('Verify reset token controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Token không hợp lệ hoặc đã hết hạn'
            });
        }
    }

    // Kiểm tra độ mạnh mật khẩu
    async checkPasswordStrength(req, res) {
        try {
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu không được để trống'
                });
            }

            const strength = await passwordService.checkPasswordStrength(password);

            res.json({
                success: true,
                data: strength
            });

        } catch (error) {
            logger.error('Check password strength controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Kiểm tra độ mạnh mật khẩu thất bại'
            });
        }
    }

    // Lấy lịch sử đổi mật khẩu
    async getPasswordHistory(req, res) {
        try {
            const userId = req.user.userId;
            const { limit = 10 } = req.query;

            const history = await passwordService.getPasswordHistory(userId, parseInt(limit));

            res.json({
                success: true,
                data: history
            });

        } catch (error) {
            logger.error('Get password history controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy lịch sử đổi mật khẩu thất bại'
            });
        }
    }

    // Tạo mật khẩu tạm thời
    async generateTemporaryPassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { email, expiresIn = '24h' } = req.body;

            // Only admin can generate temporary passwords
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền tạo mật khẩu tạm thời'
                });
            }

            const result = await passwordService.generateTemporaryPassword(email, expiresIn, req.user.userId);

            res.json({
                success: true,
                message: 'Tạo mật khẩu tạm thời thành công',
                data: {
                    temporaryPassword: result.temporaryPassword,
                    expiresAt: result.expiresAt,
                    emailSent: result.emailSent
                }
            });

        } catch (error) {
            logger.error('Generate temporary password controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Tạo mật khẩu tạm thời thất bại'
            });
        }
    }

    // Bắt buộc đổi mật khẩu
    async forcePasswordChange(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { userId, reason } = req.body;

            // Only admin can force password change
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền bắt buộc đổi mật khẩu'
                });
            }

            const result = await passwordService.forcePasswordChange(userId, reason, req.user.userId);

            res.json({
                success: true,
                message: 'Bắt buộc đổi mật khẩu thành công',
                data: result
            });

        } catch (error) {
            logger.error('Force password change controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Bắt buộc đổi mật khẩu thất bại'
            });
        }
    }

    // Kiểm tra xem mật khẩu có bị rò rỉ không
    async checkPasswordBreach(req, res) {
        try {
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu không được để trống'
                });
            }

            const result = await passwordService.checkPasswordBreach(password);

            res.json({
                success: true,
                data: {
                    isBreached: result.isBreached,
                    breachCount: result.breachCount,
                    message: result.isBreached ?
                        'Mật khẩu này đã bị rò rỉ trong các vụ tấn công trước đây' :
                        'Mật khẩu an toàn'
                }
            });

        } catch (error) {
            logger.error('Check password breach controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Kiểm tra mật khẩu rò rỉ thất bại'
            });
        }
    }

    // Lấy chính sách mật khẩu
    async getPasswordPolicy(req, res) {
        try {
            const policy = await passwordService.getPasswordPolicy();

            res.json({
                success: true,
                data: policy
            });

        } catch (error) {
            logger.error('Get password policy controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy chính sách mật khẩu thất bại'
            });
        }
    }

    // Cập nhật chính sách mật khẩu
    async updatePasswordPolicy(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            // Only admin can update password policy
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền cập nhật chính sách mật khẩu'
                });
            }

            const policyData = {
                minLength: req.body.minLength,
                maxLength: req.body.maxLength,
                requireUppercase: req.body.requireUppercase,
                requireLowercase: req.body.requireLowercase,
                requireNumbers: req.body.requireNumbers,
                requireSpecialChars: req.body.requireSpecialChars,
                preventCommonPasswords: req.body.preventCommonPasswords,
                preventPersonalInfo: req.body.preventPersonalInfo,
                passwordHistoryCount: req.body.passwordHistoryCount,
                maxAge: req.body.maxAge,
                lockoutThreshold: req.body.lockoutThreshold,
                lockoutDuration: req.body.lockoutDuration
            };

            const policy = await passwordService.updatePasswordPolicy(policyData, req.user.userId);

            res.json({
                success: true,
                message: 'Cập nhật chính sách mật khẩu thành công',
                data: policy
            });

        } catch (error) {
            logger.error('Update password policy controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Cập nhật chính sách mật khẩu thất bại'
            });
        }
    }

    // Kiểm tra mật khẩu theo chính sách
    async validatePasswordPolicy(req, res) {
        try {
            const { password, userInfo } = req.body;

            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu không được để trống'
                });
            }

            const validation = await passwordService.validatePasswordPolicy(password, userInfo);

            res.json({
                success: true,
                data: validation
            });

        } catch (error) {
            logger.error('Validate password policy controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Kiểm tra chính sách mật khẩu thất bại'
            });
        }
    }

    // Tạo mật khẩu ngẫu nhiên
    async generateRandomPassword(req, res) {
        try {
            const { length = 12, includeSymbols = true } = req.query;

            const password = await passwordService.generateRandomPassword(
                parseInt(length),
                includeSymbols === 'true'
            );

            res.json({
                success: true,
                data: {
                    password,
                    strength: await passwordService.checkPasswordStrength(password)
                }
            });

        } catch (error) {
            logger.error('Generate random password controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tạo mật khẩu ngẫu nhiên thất bại'
            });
        }
    }

    // Thống kê bảo mật mật khẩu
    async getPasswordSecurityStats(req, res) {
        try {
            // Only admin can view password security stats
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền xem thống kê bảo mật mật khẩu'
                });
            }

            const { timeframe = '30d' } = req.query;
            const stats = await passwordService.getPasswordSecurityStats(timeframe);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get password security stats controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy thống kê bảo mật mật khẩu thất bại'
            });
        }
    }

    // Khóa tài khoản do nhập sai mật khẩu
    async lockAccountForFailedAttempts(req, res) {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            // Only admin can manually lock accounts
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền khóa tài khoản'
                });
            }

            const result = await passwordService.lockAccount(userId, reason, req.user.userId);

            res.json({
                success: true,
                message: 'Khóa tài khoản thành công',
                data: result
            });

        } catch (error) {
            logger.error('Lock account controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Khóa tài khoản thất bại'
            });
        }
    }

    // Mở khóa tài khoản
    async unlockAccount(req, res) {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            // Only admin can unlock accounts
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền mở khóa tài khoản'
                });
            }

            const result = await passwordService.unlockAccount(userId, reason, req.user.userId);

            res.json({
                success: true,
                message: 'Mở khóa tài khoản thành công',
                data: result
            });

        } catch (error) {
            logger.error('Unlock account controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Mở khóa tài khoản thất bại'
            });
        }
    }

    // Lấy danh sách tài khoản bị khóa
    async getLockedAccounts(req, res) {
        try {
            // Only admin can view locked accounts
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền xem danh sách tài khoản bị khóa'
                });
            }

            const filters = {
                reason: req.query.reason,
                lockedDateStart: req.query.lockedDateStart,
                lockedDateEnd: req.query.lockedDateEnd
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const result = await passwordService.getLockedAccounts(filters, pagination);

            res.json({
                success: true,
                data: result.accounts,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get locked accounts controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy danh sách tài khoản bị khóa thất bại'
            });
        }
    }

    // Gửi cảnh báo mật khẩu yếu
    async sendWeakPasswordAlert(req, res) {
        try {
            // Only admin can send weak password alerts
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền gửi cảnh báo mật khẩu yếu'
                });
            }

            const result = await passwordService.sendWeakPasswordAlerts(req.user.userId);

            res.json({
                success: true,
                message: 'Gửi cảnh báo mật khẩu yếu thành công',
                data: {
                    alertsSent: result.alertsSent,
                    usersNotified: result.usersNotified
                }
            });

        } catch (error) {
            logger.error('Send weak password alert controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Gửi cảnh báo mật khẩu yếu thất bại'
            });
        }
    }
}

module.exports = new PasswordController();