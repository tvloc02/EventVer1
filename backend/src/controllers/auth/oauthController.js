const oauthService = require('../../services/auth/oauthService');
const authService = require('../../services/auth/authService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class OAuthController {
    // Đăng nhập bằng Google
    async googleLogin(req, res) {
        try {
            const { code, state } = req.query;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã xác thực Google không hợp lệ'
                });
            }

            const loginInfo = {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                location: req.get('X-Forwarded-For') || req.connection.remoteAddress
            };

            const result = await oauthService.googleLogin(code, state, loginInfo);

            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                success: true,
                message: 'Đăng nhập Google thành công',
                data: {
                    user: result.user,
                    accessToken: result.tokens.accessToken,
                    isNewUser: result.isNewUser
                }
            });

        } catch (error) {
            logger.error('Google login controller error:', error);
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Đăng nhập Google thất bại'
            });
        }
    }

    // Đăng nhập bằng Facebook
    async facebookLogin(req, res) {
        try {
            const { accessToken } = req.body;

            if (!accessToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Access token Facebook không hợp lệ'
                });
            }

            const loginInfo = {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                location: req.get('X-Forwarded-For') || req.connection.remoteAddress
            };

            const result = await oauthService.facebookLogin(accessToken, loginInfo);

            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                success: true,
                message: 'Đăng nhập Facebook thành công',
                data: {
                    user: result.user,
                    accessToken: result.tokens.accessToken,
                    isNewUser: result.isNewUser
                }
            });

        } catch (error) {
            logger.error('Facebook login controller error:', error);
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Đăng nhập Facebook thất bại'
            });
        }
    }

    // Đăng nhập bằng Microsoft
    async microsoftLogin(req, res) {
        try {
            const { code, state } = req.query;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã xác thực Microsoft không hợp lệ'
                });
            }

            const loginInfo = {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                location: req.get('X-Forwarded-For') || req.connection.remoteAddress
            };

            const result = await oauthService.microsoftLogin(code, state, loginInfo);

            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                success: true,
                message: 'Đăng nhập Microsoft thành công',
                data: {
                    user: result.user,
                    accessToken: result.tokens.accessToken,
                    isNewUser: result.isNewUser
                }
            });

        } catch (error) {
            logger.error('Microsoft login controller error:', error);
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Đăng nhập Microsoft thất bại'
            });
        }
    }

    // Liên kết tài khoản OAuth
    async linkOAuthAccount(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { provider, accessToken } = req.body;
            const userId = req.user.userId;

            const result = await oauthService.linkOAuthAccount(userId, provider, accessToken);

            res.json({
                success: true,
                message: `Liên kết tài khoản ${provider} thành công`,
                data: result
            });

        } catch (error) {
            logger.error('Link OAuth account controller error:', error);
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Liên kết tài khoản thất bại'
            });
        }
    }

    // Hủy liên kết tài khoản OAuth
    async unlinkOAuthAccount(req, res) {
        try {
            const { provider } = req.params;
            const userId = req.user.userId;

            const result = await oauthService.unlinkOAuthAccount(userId, provider);

            res.json({
                success: true,
                message: `Hủy liên kết tài khoản ${provider} thành công`,
                data: result
            });

        } catch (error) {
            logger.error('Unlink OAuth account controller error:', error);
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Hủy liên kết tài khoản thất bại'
            });
        }
    }

    // Lấy danh sách tài khoản đã liên kết
    async getLinkedAccounts(req, res) {
        try {
            const userId = req.user.userId;
            const linkedAccounts = await oauthService.getLinkedAccounts(userId);

            res.json({
                success: true,
                data: linkedAccounts
            });

        } catch (error) {
            logger.error('Get linked accounts controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy danh sách tài khoản liên kết thất bại'
            });
        }
    }

    // Lấy URL xác thực OAuth
    async getAuthUrl(req, res) {
        try {
            const { provider, redirectUri } = req.query;

            if (!provider) {
                return res.status(400).json({
                    success: false,
                    message: 'Nhà cung cấp OAuth không được chỉ định'
                });
            }

            const authUrl = await oauthService.getAuthUrl(provider, redirectUri);

            res.json({
                success: true,
                data: {
                    authUrl,
                    provider
                }
            });

        } catch (error) {
            logger.error('Get auth URL controller error:', error);
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Lấy URL xác thực thất bại'
            });
        }
    }

    // Callback xử lý sau khi xác thực OAuth
    async oauthCallback(req, res) {
        try {
            const { provider } = req.params;
            const { code, state, error } = req.query;

            if (error) {
                logger.error(`OAuth ${provider} error:`, error);
                return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=${encodeURIComponent(error)}`);
            }

            if (!code) {
                return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=missing_code`);
            }

            const loginInfo = {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                location: req.get('X-Forwarded-For') || req.connection.remoteAddress
            };

            let result;
            switch (provider) {
                case 'google':
                    result = await oauthService.googleLogin(code, state, loginInfo);
                    break;
                case 'microsoft':
                    result = await oauthService.microsoftLogin(code, state, loginInfo);
                    break;
                default:
                    throw new Error(`Nhà cung cấp OAuth không được hỗ trợ: ${provider}`);
            }

            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Redirect to frontend with access token
            const redirectUrl = result.isNewUser
                ? `${process.env.FRONTEND_URL}/auth/complete-profile?token=${result.tokens.accessToken}`
                : `${process.env.FRONTEND_URL}/auth/success?token=${result.tokens.accessToken}`;

            res.redirect(redirectUrl);

        } catch (error) {
            logger.error(`OAuth ${req.params.provider} callback error:`, error);
            res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=${encodeURIComponent(error.message)}`);
        }
    }

    // Làm mới token OAuth
    async refreshOAuthToken(req, res) {
        try {
            const { provider } = req.params;
            const userId = req.user.userId;

            const result = await oauthService.refreshOAuthToken(userId, provider);

            res.json({
                success: true,
                message: 'Làm mới token thành công',
                data: result
            });

        } catch (error) {
            logger.error('Refresh OAuth token controller error:', error);
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Làm mới token thất bại'
            });
        }
    }

    // Đồng bộ dữ liệu từ OAuth provider
    async syncOAuthData(req, res) {
        try {
            const { provider } = req.params;
            const userId = req.user.userId;
            const { fields } = req.body; // Specify which fields to sync

            const result = await oauthService.syncUserDataFromProvider(userId, provider, fields);

            res.json({
                success: true,
                message: `Đồng bộ dữ liệu từ ${provider} thành công`,
                data: result
            });

        } catch (error) {
            logger.error('Sync OAuth data controller error:', error);
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Đồng bộ dữ liệu thất bại'
            });
        }
    }

    // Lấy thông tin profile từ OAuth provider
    async getOAuthProfile(req, res) {
        try {
            const { provider } = req.params;
            const userId = req.user.userId;

            const profile = await oauthService.getOAuthProfile(userId, provider);

            res.json({
                success: true,
                data: profile
            });

        } catch (error) {
            logger.error('Get OAuth profile controller error:', error);
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Lấy thông tin profile thất bại'
            });
        }
    }

    // Kiểm tra trạng thái kết nối OAuth
    async checkOAuthConnection(req, res) {
        try {
            const { provider } = req.params;
            const userId = req.user.userId;

            const connectionStatus = await oauthService.checkOAuthConnection(userId, provider);

            res.json({
                success: true,
                data: connectionStatus
            });

        } catch (error) {
            logger.error('Check OAuth connection controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Kiểm tra kết nối OAuth thất bại'
            });
        }
    }

    // Lấy danh sách providers được hỗ trợ
    async getSupportedProviders(req, res) {
        try {
            const providers = await oauthService.getSupportedProviders();

            res.json({
                success: true,
                data: providers
            });

        } catch (error) {
            logger.error('Get supported providers controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy danh sách providers thất bại'
            });
        }
    }

    // Hủy bỏ tất cả token OAuth
    async revokeAllTokens(req, res) {
        try {
            const userId = req.user.userId;
            const { reason } = req.body;

            const result = await oauthService.revokeAllOAuthTokens(userId, reason);

            res.json({
                success: true,
                message: 'Hủy bỏ tất cả token OAuth thành công',
                data: result
            });

        } catch (error) {
            logger.error('Revoke all OAuth tokens controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Hủy bỏ token OAuth thất bại'
            });
        }
    }

    // Lấy lịch sử đăng nhập OAuth
    async getOAuthLoginHistory(req, res) {
        try {
            const userId = req.user.userId;
            const { provider, limit = 10 } = req.query;

            const history = await oauthService.getOAuthLoginHistory(userId, provider, parseInt(limit));

            res.json({
                success: true,
                data: history
            });

        } catch (error) {
            logger.error('Get OAuth login history controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy lịch sử đăng nhập OAuth thất bại'
            });
        }
    }
}

module.exports = new OAuthController();