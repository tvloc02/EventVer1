const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const logger = require('../utils/logger');

class OAuthConfig {
    constructor() {
        this.strategies = new Map();
    }

    initialize() {
        // Google OAuth Strategy
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            const googleStrategy = new GoogleStrategy({
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`
            }, this.googleVerifyCallback.bind(this));

            passport.use('google', googleStrategy);
            this.strategies.set('google', true);
            logger.info('Google OAuth strategy configured');
        }

        // Microsoft OAuth Strategy
        if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
            const microsoftStrategy = new MicrosoftStrategy({
                clientID: process.env.MICROSOFT_CLIENT_ID,
                clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
                callbackURL: `${process.env.BACKEND_URL}/api/auth/microsoft/callback`,
                scope: ['user.read']
            }, this.microsoftVerifyCallback.bind(this));

            passport.use('microsoft', microsoftStrategy);
            this.strategies.set('microsoft', true);
            logger.info('Microsoft OAuth strategy configured');
        }

        // Facebook OAuth Strategy
        if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
            const facebookStrategy = new FacebookStrategy({
                clientID: process.env.FACEBOOK_APP_ID,
                clientSecret: process.env.FACEBOOK_APP_SECRET,
                callbackURL: `${process.env.BACKEND_URL}/api/auth/facebook/callback`,
                profileFields: ['id', 'emails', 'name', 'picture.type(large)']
            }, this.facebookVerifyCallback.bind(this));

            passport.use('facebook', facebookStrategy);
            this.strategies.set('facebook', true);
            logger.info('Facebook OAuth strategy configured');
        }

        // Passport serialization
        passport.serializeUser((user, done) => {
            done(null, user.id || user._id);
        });

        passport.deserializeUser(async (id, done) => {
            try {
                const User = require('../models/User');
                const user = await User.findById(id).select('-password');
                done(null, user);
            } catch (error) {
                done(error, null);
            }
        });

        logger.info(`OAuth configured with ${this.strategies.size} providers`);
    }

    async googleVerifyCallback(accessToken, refreshToken, profile, done) {
        try {
            const User = require('../models/User');
            const userProfile = this.normalizeGoogleProfile(profile);

            // Check if user exists with this Google ID
            let user = await User.findOne({ 'oauth.google.id': profile.id });

            if (user) {
                // Update existing user's Google info
                user.oauth.google = {
                    id: profile.id,
                    accessToken,
                    refreshToken,
                    lastLoginAt: new Date()
                };

                if (userProfile.avatar && !user.profile.avatar) {
                    user.profile.avatar = userProfile.avatar;
                }

                await user.save();
                logger.auth('Google OAuth login', { userId: user._id, email: user.email });
                return done(null, user);
            }

            // Check if user exists with same email
            user = await User.findOne({ email: userProfile.email });

            if (user) {
                // Link Google account to existing user
                user.oauth.google = {
                    id: profile.id,
                    accessToken,
                    refreshToken,
                    lastLoginAt: new Date()
                };

                if (userProfile.avatar && !user.profile.avatar) {
                    user.profile.avatar = userProfile.avatar;
                }

                await user.save();
                logger.auth('Google account linked', { userId: user._id, email: user.email });
                return done(null, user);
            }

            // Create new user
            user = new User({
                username: userProfile.username,
                email: userProfile.email,
                profile: {
                    firstName: userProfile.firstName,
                    lastName: userProfile.lastName,
                    avatar: userProfile.avatar,
                    isVerified: true // Google email is already verified
                },
                oauth: {
                    google: {
                        id: profile.id,
                        accessToken,
                        refreshToken,
                        lastLoginAt: new Date()
                    }
                },
                isEmailVerified: true,
                isActive: true,
                roles: ['student']
            });

            await user.save();
            logger.auth('New user created via Google OAuth', { userId: user._id, email: user.email });

            return done(null, user);

        } catch (error) {
            logger.error('Google OAuth verification error:', error);
            return done(error, null);
        }
    }

    async microsoftVerifyCallback(accessToken, refreshToken, profile, done) {
        try {
            const User = require('../models/User');
            const userProfile = this.normalizeMicrosoftProfile(profile);

            // Check if user exists with this Microsoft ID
            let user = await User.findOne({ 'oauth.microsoft.id': profile.id });

            if (user) {
                // Update existing user's Microsoft info
                user.oauth.microsoft = {
                    id: profile.id,
                    accessToken,
                    refreshToken,
                    lastLoginAt: new Date()
                };

                await user.save();
                logger.auth('Microsoft OAuth login', { userId: user._id, email: user.email });
                return done(null, user);
            }

            // Check if user exists with same email
            user = await User.findOne({ email: userProfile.email });

            if (user) {
                // Link Microsoft account to existing user
                user.oauth.microsoft = {
                    id: profile.id,
                    accessToken,
                    refreshToken,
                    lastLoginAt: new Date()
                };

                await user.save();
                logger.auth('Microsoft account linked', { userId: user._id, email: user.email });
                return done(null, user);
            }

            // Create new user
            user = new User({
                username: userProfile.username,
                email: userProfile.email,
                profile: {
                    firstName: userProfile.firstName,
                    lastName: userProfile.lastName,
                    isVerified: true
                },
                oauth: {
                    microsoft: {
                        id: profile.id,
                        accessToken,
                        refreshToken,
                        lastLoginAt: new Date()
                    }
                },
                isEmailVerified: true,
                isActive: true,
                roles: ['student']
            });

            await user.save();
            logger.auth('New user created via Microsoft OAuth', { userId: user._id, email: user.email });

            return done(null, user);

        } catch (error) {
            logger.error('Microsoft OAuth verification error:', error);
            return done(error, null);
        }
    }

    async facebookVerifyCallback(accessToken, refreshToken, profile, done) {
        try {
            const User = require('../models/User');
            const userProfile = this.normalizeFacebookProfile(profile);

            // Check if user exists with this Facebook ID
            let user = await User.findOne({ 'oauth.facebook.id': profile.id });

            if (user) {
                // Update existing user's Facebook info
                user.oauth.facebook = {
                    id: profile.id,
                    accessToken,
                    refreshToken,
                    lastLoginAt: new Date()
                };

                if (userProfile.avatar && !user.profile.avatar) {
                    user.profile.avatar = userProfile.avatar;
                }

                await user.save();
                logger.auth('Facebook OAuth login', { userId: user._id, email: user.email });
                return done(null, user);
            }

            // Check if user exists with same email
            if (userProfile.email) {
                user = await User.findOne({ email: userProfile.email });

                if (user) {
                    // Link Facebook account to existing user
                    user.oauth.facebook = {
                        id: profile.id,
                        accessToken,
                        refreshToken,
                        lastLoginAt: new Date()
                    };

                    if (userProfile.avatar && !user.profile.avatar) {
                        user.profile.avatar = userProfile.avatar;
                    }

                    await user.save();
                    logger.auth('Facebook account linked', { userId: user._id, email: user.email });
                    return done(null, user);
                }
            }

            // Facebook might not provide email, need to handle this case
            if (!userProfile.email) {
                return done(new Error('Email is required but not provided by Facebook'), null);
            }

            // Create new user
            user = new User({
                username: userProfile.username,
                email: userProfile.email,
                profile: {
                    firstName: userProfile.firstName,
                    lastName: userProfile.lastName,
                    avatar: userProfile.avatar,
                    isVerified: true
                },
                oauth: {
                    facebook: {
                        id: profile.id,
                        accessToken,
                        refreshToken,
                        lastLoginAt: new Date()
                    }
                },
                isEmailVerified: true,
                isActive: true,
                roles: ['student']
            });

            await user.save();
            logger.auth('New user created via Facebook OAuth', { userId: user._id, email: user.email });

            return done(null, user);

        } catch (error) {
            logger.error('Facebook OAuth verification error:', error);
            return done(error, null);
        }
    }

    normalizeGoogleProfile(profile) {
        const email = profile.emails?.[0]?.value;
        const photo = profile.photos?.[0]?.value;

        return {
            email,
            username: email ? email.split('@')[0] : `google_${profile.id}`,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            avatar: photo || null
        };
    }

    normalizeMicrosoftProfile(profile) {
        const email = profile.emails?.[0]?.value || profile._json?.mail || profile._json?.userPrincipalName;

        return {
            email,
            username: email ? email.split('@')[0] : `microsoft_${profile.id}`,
            firstName: profile.name?.givenName || profile._json?.givenName || '',
            lastName: profile.name?.familyName || profile._json?.surname || ''
        };
    }

    normalizeFacebookProfile(profile) {
        const email = profile.emails?.[0]?.value;
        const photo = profile.photos?.[0]?.value;

        return {
            email,
            username: email ? email.split('@')[0] : `facebook_${profile.id}`,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            avatar: photo || null
        };
    }

    getAvailableProviders() {
        return Array.from(this.strategies.keys());
    }

    isProviderEnabled(provider) {
        return this.strategies.has(provider);
    }

    getProviderConfig(provider) {
        const configs = {
            google: {
                authURL: `${process.env.BACKEND_URL}/api/auth/google`,
                scope: ['profile', 'email'],
                enabled: this.isProviderEnabled('google')
            },
            microsoft: {
                authURL: `${process.env.BACKEND_URL}/api/auth/microsoft`,
                scope: ['user.read'],
                enabled: this.isProviderEnabled('microsoft')
            },
            facebook: {
                authURL: `${process.env.BACKEND_URL}/api/auth/facebook`,
                scope: ['email', 'public_profile'],
                enabled: this.isProviderEnabled('facebook')
            }
        };

        return provider ? configs[provider] : configs;
    }

    // Method to refresh OAuth tokens
    async refreshGoogleToken(user) {
        try {
            const { OAuth2Client } = require('google-auth-library');
            const oauth2Client = new OAuth2Client(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            );

            oauth2Client.setCredentials({
                refresh_token: user.oauth.google.refreshToken
            });

            const { credentials } = await oauth2Client.refreshAccessToken();

            // Update user's token
            user.oauth.google.accessToken = credentials.access_token;
            if (credentials.refresh_token) {
                user.oauth.google.refreshToken = credentials.refresh_token;
            }

            await user.save();

            return credentials.access_token;
        } catch (error) {
            logger.error('Error refreshing Google token:', error);
            throw error;
        }
    }

    async refreshMicrosoftToken(user) {
        try {
            const axios = require('axios');

            const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                client_id: process.env.MICROSOFT_CLIENT_ID,
                client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                refresh_token: user.oauth.microsoft.refreshToken,
                grant_type: 'refresh_token'
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            // Update user's token
            user.oauth.microsoft.accessToken = response.data.access_token;
            if (response.data.refresh_token) {
                user.oauth.microsoft.refreshToken = response.data.refresh_token;
            }

            await user.save();

            return response.data.access_token;
        } catch (error) {
            logger.error('Error refreshing Microsoft token:', error);
            throw error;
        }
    }

    // Method to unlink OAuth accounts
    async unlinkProvider(user, provider) {
        try {
            if (!user.oauth || !user.oauth[provider]) {
                throw new Error(`${provider} account is not linked`);
            }

            // Check if user has password or other OAuth methods before unlinking
            const hasPassword = user.password && user.password.length > 0;
            const otherOAuthMethods = Object.keys(user.oauth).filter(p => p !== provider && user.oauth[p]);

            if (!hasPassword && otherOAuthMethods.length === 0) {
                throw new Error('Cannot unlink the only authentication method');
            }

            // Remove the OAuth provider
            user.oauth[provider] = undefined;
            await user.save();

            logger.auth(`${provider} account unlinked`, { userId: user._id, email: user.email });
            return true;
        } catch (error) {
            logger.error(`Error unlinking ${provider} account:`, error);
            throw error;
        }
    }

    // Method to get user info from OAuth provider
    async getUserInfo(user, provider) {
        try {
            let userInfo = null;

            switch (provider) {
                case 'google':
                    userInfo = await this.getGoogleUserInfo(user);
                    break;
                case 'microsoft':
                    userInfo = await this.getMicrosoftUserInfo(user);
                    break;
                case 'facebook':
                    userInfo = await this.getFacebookUserInfo(user);
                    break;
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }

            return userInfo;
        } catch (error) {
            logger.error(`Error getting ${provider} user info:`, error);
            throw error;
        }
    }

    async getGoogleUserInfo(user) {
        const axios = require('axios');

        try {
            let accessToken = user.oauth.google.accessToken;

            // Try to get user info
            let response;
            try {
                response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
            } catch (error) {
                if (error.response?.status === 401) {
                    // Token expired, refresh it
                    accessToken = await this.refreshGoogleToken(user);
                    response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
                } else {
                    throw error;
                }
            }

            return response.data;
        } catch (error) {
            logger.error('Error getting Google user info:', error);
            throw error;
        }
    }

    async getMicrosoftUserInfo(user) {
        const axios = require('axios');

        try {
            let accessToken = user.oauth.microsoft.accessToken;

            // Try to get user info
            let response;
            try {
                response = await axios.get('https://graph.microsoft.com/v1.0/me', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
            } catch (error) {
                if (error.response?.status === 401) {
                    // Token expired, refresh it
                    accessToken = await this.refreshMicrosoftToken(user);
                    response = await axios.get('https://graph.microsoft.com/v1.0/me', {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
                } else {
                    throw error;
                }
            }

            return response.data;
        } catch (error) {
            logger.error('Error getting Microsoft user info:', error);
            throw error;
        }
    }

    async getFacebookUserInfo(user) {
        const axios = require('axios');

        try {
            const accessToken = user.oauth.facebook.accessToken;

            const response = await axios.get(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`);
            return response.data;
        } catch (error) {
            logger.error('Error getting Facebook user info:', error);
            throw error;
        }
    }

    // Health check for OAuth providers
    async healthCheck() {
        const status = {
            google: this.isProviderEnabled('google'),
            microsoft: this.isProviderEnabled('microsoft'),
            facebook: this.isProviderEnabled('facebook'),
            totalProviders: this.strategies.size
        };

        return status;
    }
}

module.exports = new OAuthConfig();