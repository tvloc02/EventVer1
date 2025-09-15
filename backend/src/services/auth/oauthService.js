const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const User = require('../../models/User');
const authService = require('./authService');
const logger = require('../../utils/logger');

class OAuthService {
    constructor() {
        this.initializeStrategies();
    }

    initializeStrategies() {
        // Google OAuth Strategy
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            passport.use(new GoogleStrategy({
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: `${process.env.API_URL}/api/auth/google/callback`
            }, this.googleStrategyCallback.bind(this)));
        }

        // Facebook OAuth Strategy
        if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
            passport.use(new FacebookStrategy({
                clientID: process.env.FACEBOOK_APP_ID,
                clientSecret: process.env.FACEBOOK_APP_SECRET,
                callbackURL: `${process.env.API_URL}/api/auth/facebook/callback`,
                profileFields: ['id', 'emails', 'name', 'picture.type(large)']
            }, this.facebookStrategyCallback.bind(this)));
        }

        // Microsoft OAuth Strategy
        if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
            passport.use(new MicrosoftStrategy({
                clientID: process.env.MICROSOFT_CLIENT_ID,
                clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
                callbackURL: `${process.env.API_URL}/api/auth/microsoft/callback`,
                scope: ['user.read']
            }, this.microsoftStrategyCallback.bind(this)));
        }

        // Passport serialization
        passport.serializeUser((user, done) => {
            done(null, user._id);
        });

        passport.deserializeUser(async (id, done) => {
            try {
                const user = await User.findById(id);
                done(null, user);
            } catch (error) {
                done(error, null);
            }
        });
    }

    async googleStrategyCallback(accessToken, refreshToken, profile, done) {
        try {
            const profileData = {
                id: profile.id,
                email: profile.emails[0].value,
                displayName: profile.displayName,
                name: {
                    givenName: profile.name.givenName,
                    familyName: profile.name.familyName
                },
                photos: profile.photos
            };

            const result = await authService.oauthLogin('google', profileData);
            return done(null, result);

        } catch (error) {
            logger.error('Google OAuth callback error:', error);
            return done(error, null);
        }
    }

    async facebookStrategyCallback(accessToken, refreshToken, profile, done) {
        try {
            const profileData = {
                id: profile.id,
                email: profile.emails?.[0]?.value,
                displayName: profile.displayName,
                name: {
                    givenName: profile.name.givenName,
                    familyName: profile.name.familyName
                },
                photos: profile.photos
            };

            if (!profileData.email) {
                return done(new Error('Email không được cung cấp từ Facebook'), null);
            }

            const result = await authService.oauthLogin('facebook', profileData);
            return done(null, result);

        } catch (error) {
            logger.error('Facebook OAuth callback error:', error);
            return done(error, null);
        }
    }

    async microsoftStrategyCallback(accessToken, refreshToken, profile, done) {
        try {
            const profileData = {
                id: profile.id,
                email: profile.emails?.[0]?.value || profile.userPrincipalName,
                displayName: profile.displayName,
                name: {
                    givenName: profile.name?.givenName,
                    familyName: profile.name?.familyName
                },
                photos: profile.photos
            };

            const result = await authService.oauthLogin('microsoft', profileData);
            return done(null, result);

        } catch (error) {
            logger.error('Microsoft OAuth callback error:', error);
            return done(error, null);
        }
    }

    // Link OAuth account to existing user
    async linkOAuthAccount(userId, provider, accessToken) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('Người dùng không tồn tại');
            }

            let profile;
            switch (provider) {
                case 'google':
                    profile = await this.getGoogleProfile(accessToken);
                    break;
                case 'facebook':
                    profile = await this.getFacebookProfile(accessToken);
                    break;
                case 'microsoft':
                    profile = await this.getMicrosoftProfile(accessToken);
                    break;
                default:
                    throw new Error('Nhà cung cấp OAuth không được hỗ trợ');
            }

            // Check if OAuth account is already linked to another user
            const existingUser = await User.findOne({
                [`oauth.${provider}.id`]: profile.id
            });

            if (existingUser && existingUser._id.toString() !== userId) {
                throw new Error('Tài khoản OAuth này đã được liên kết với người dùng khác');
            }

            // Link OAuth account
            user.oauth[provider] = {
                id: profile.id,
                email: profile.email,
                verified: true,
                linkedAt: new Date()
            };

            await user.save();

            logger.info(`OAuth account linked: ${provider} for user ${user.email}`);
            return { success: true, message: 'Liên kết tài khoản thành công' };

        } catch (error) {
            logger.error('Link OAuth account error:', error);
            throw error;
        }
    }

    // Unlink OAuth account
    async unlinkOAuthAccount(userId, provider) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('Người dùng không tồn tại');
            }

            if (!user.oauth[provider] || !user.oauth[provider].id) {
                throw new Error('Tài khoản OAuth không được liên kết');
            }

            // Ensure user has a password or another OAuth method for login
            const hasPassword = user.password;
            const hasOtherOAuth = Object.keys(user.oauth).some(
                key => key !== provider && user.oauth[key].id
            );

            if (!hasPassword && !hasOtherOAuth) {
                throw new Error('Không thể hủy liên kết tài khoản OAuth cuối cùng. Vui lòng đặt mật khẩu trước');
            }

            // Remove OAuth link
            user.oauth[provider] = {
                id: null,
                email: null,
                verified: false,
                unlinkedAt: new Date()
            };

            await user.save();

            logger.info(`OAuth account unlinked: ${provider} for user ${user.email}`);
            return { success: true, message: 'Hủy liên kết tài khoản thành công' };

        } catch (error) {
            logger.error('Unlink OAuth account error:', error);
            throw error;
        }
    }

    // Get OAuth profile data
    async getGoogleProfile(accessToken) {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Không thể lấy thông tin từ Google');
            }

            const profile = await response.json();
            return {
                id: profile.id,
                email: profile.email,
                displayName: profile.name,
                name: {
                    givenName: profile.given_name,
                    familyName: profile.family_name
                },
                photos: [{ value: profile.picture }]
            };

        } catch (error) {
            logger.error('Get Google profile error:', error);
            throw error;
        }
    }

    async getFacebookProfile(accessToken) {
        try {
            const response = await fetch(
                `https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture.type(large)&access_token=${accessToken}`
            );

            if (!response.ok) {
                throw new Error('Không thể lấy thông tin từ Facebook');
            }

            const profile = await response.json();
            return {
                id: profile.id,
                email: profile.email,
                displayName: profile.name,
                name: {
                    givenName: profile.first_name,
                    familyName: profile.last_name
                },
                photos: [{ value: profile.picture?.data?.url }]
            };

        } catch (error) {
            logger.error('Get Facebook profile error:', error);
            throw error;
        }
    }

    async getMicrosoftProfile(accessToken) {
        try {
            const response = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Không thể lấy thông tin từ Microsoft');
            }

            const profile = await response.json();
            return {
                id: profile.id,
                email: profile.mail || profile.userPrincipalName,
                displayName: profile.displayName,
                name: {
                    givenName: profile.givenName,
                    familyName: profile.surname
                },
                photos: []
            };

        } catch (error) {
            logger.error('Get Microsoft profile error:', error);
            throw error;
        }
    }

    // Get OAuth login URL
    getOAuthLoginURL(provider, state = null) {
        const baseUrl = process.env.API_URL;
        const stateParam = state ? `?state=${encodeURIComponent(state)}` : '';

        const urls = {
            google: `${baseUrl}/api/auth/google${stateParam}`,
            facebook: `${baseUrl}/api/auth/facebook${stateParam}`,
            microsoft: `${baseUrl}/api/auth/microsoft${stateParam}`
        };

        return urls[provider] || null;
    }

    // Get supported OAuth providers
    getSupportedProviders() {
        const providers = [];

        if (process.env.GOOGLE_CLIENT_ID) {
            providers.push({
                name: 'google',
                displayName: 'Google',
                icon: 'fab fa-google',
                color: '#4285f4'
            });
        }

        if (process.env.FACEBOOK_APP_ID) {
            providers.push({
                name: 'facebook',
                displayName: 'Facebook',
                icon: 'fab fa-facebook',
                color: '#1877f2'
            });
        }

        if (process.env.MICROSOFT_CLIENT_ID) {
            providers.push({
                name: 'microsoft',
                displayName: 'Microsoft',
                icon: 'fab fa-microsoft',
                color: '#00a4ef'
            });
        }

        return providers;
    }

    // Verify OAuth state parameter (CSRF protection)
    verifyState(receivedState, expectedState) {
        return receivedState === expectedState;
    }

    // Handle OAuth error
    handleOAuthError(error, provider) {
        const errorMessages = {
            'access_denied': 'Người dùng từ chối cấp quyền truy cập',
            'invalid_request': 'Yêu cầu OAuth không hợp lệ',
            'invalid_scope': 'Phạm vi quyền không hợp lệ',
            'server_error': 'Lỗi máy chủ OAuth',
            'temporarily_unavailable': 'Dịch vụ OAuth tạm thời không khả dụng'
        };

        const message = errorMessages[error] || `Lỗi đăng nhập ${provider}`;
        logger.error(`OAuth error (${provider}):`, { error, message });

        return {
            success: false,
            error: message,
            provider
        };
    }

    // Get user's linked OAuth accounts
    async getLinkedAccounts(userId) {
        try {
            const user = await User.findById(userId).select('oauth');
            if (!user) {
                throw new Error('Người dùng không tồn tại');
            }

            const linkedAccounts = [];
            const supportedProviders = this.getSupportedProviders();

            for (const provider of supportedProviders) {
                const oauthData = user.oauth[provider.name];
                linkedAccounts.push({
                    ...provider,
                    linked: !!(oauthData && oauthData.id),
                    email: oauthData?.email,
                    linkedAt: oauthData?.linkedAt,
                    verified: oauthData?.verified
                });
            }

            return linkedAccounts;

        } catch (error) {
            logger.error('Get linked accounts error:', error);
            throw error;
        }
    }
}

module.exports = new OAuthService();