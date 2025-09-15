const twilio = require('twilio');
const axios = require('axios');
const User = require('../../models/User');
const cacheService = require('../cacheService');
const logger = require('../../utils/logger');

class SMSService {
    constructor() {
        this.twilioClient = null;
        this.esmsAPI = null;
        this.viettelAPI = null;
        this.initializeProviders();
    }

    initializeProviders() {
        try {
            // Khởi tạo Twilio (quốc tế)
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
                this.twilioClient = twilio(
                    process.env.TWILIO_ACCOUNT_SID,
                    process.env.TWILIO_AUTH_TOKEN
                );
                logger.info('Twilio SMS đã được khởi tạo');
            }

            // Khởi tạo eSMS (Việt Nam)
            if (process.env.ESMS_API_KEY && process.env.ESMS_SECRET_KEY) {
                this.esmsAPI = {
                    apiKey: process.env.ESMS_API_KEY,
                    secretKey: process.env.ESMS_SECRET_KEY,
                    brandName: process.env.ESMS_BRAND_NAME || 'StudentEvent',
                    endpoint: 'https://rest.esms.vn/MainService.svc/json'
                };
                logger.info('eSMS đã được cấu hình');
            }

            // Khởi tạo Viettel SMS
            if (process.env.VIETTEL_SMS_USERNAME && process.env.VIETTEL_SMS_PASSWORD) {
                this.viettelAPI = {
                    username: process.env.VIETTEL_SMS_USERNAME,
                    password: process.env.VIETTEL_SMS_PASSWORD,
                    cpCode: process.env.VIETTEL_SMS_CP_CODE,
                    endpoint: 'https://cloudsms.viettel.vn/api/v1'
                };
                logger.info('Viettel SMS đã được cấu hình');
            }

        } catch (error) {
            logger.error('Lỗi khởi tạo SMS providers:', error);
        }
    }

    // Gửi SMS đến một số điện thoại
    async sendSMS(phoneNumber, message, options = {}) {
        try {
            // Chuẩn hóa số điện thoại
            const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

            if (!this.validatePhoneNumber(normalizedPhone)) {
                throw new Error('Số điện thoại không hợp lệ');
            }

            // Kiểm tra rate limit
            if (!await this.checkRateLimit(normalizedPhone)) {
                throw new Error('Đã vượt quá giới hạn gửi SMS cho số này');
            }

            let result;
            const provider = this.selectProvider(normalizedPhone, options.provider);

            switch (provider) {
                case 'twilio':
                    result = await this.sendViaTwilio(normalizedPhone, message, options);
                    break;
                case 'esms':
                    result = await this.sendViaESMS(normalizedPhone, message, options);
                    break;
                case 'viettel':
                    result = await this.sendViaViettel(normalizedPhone, message, options);
                    break;
                default:
                    throw new Error('Không có nhà cung cấp SMS khả dụng');
            }

            // Cập nhật rate limit
            await this.updateRateLimit(normalizedPhone);

            logger.info(`SMS đã gửi thành công đến ${normalizedPhone} qua ${provider}`);
            return result;

        } catch (error) {
            logger.error('Lỗi gửi SMS:', error);
            throw error;
        }
    }

    // Gửi SMS qua Twilio
    async sendViaTwilio(phoneNumber, message, options = {}) {
        try {
            if (!this.twilioClient) {
                throw new Error('Twilio chưa được cấu hình');
            }

            const result = await this.twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phoneNumber,
                messagingServiceSid: options.serviceSid
            });

            return {
                success: true,
                provider: 'twilio',
                messageId: result.sid,
                status: result.status,
                cost: result.price
            };

        } catch (error) {
            logger.error('Lỗi gửi SMS qua Twilio:', error);
            return {
                success: false,
                provider: 'twilio',
                error: error.message
            };
        }
    }

    // Gửi SMS qua eSMS
    async sendViaESMS(phoneNumber, message, options = {}) {
        try {
            if (!this.esmsAPI) {
                throw new Error('eSMS chưa được cấu hình');
            }

            const smsType = options.type || '2'; // 2 = CSKH, 1 = Quảng cáo
            const requestData = {
                ApiKey: this.esmsAPI.apiKey,
                SecretKey: this.esmsAPI.secretKey,
                Phone: phoneNumber.replace('+84', '0'), // Chuyển về format 0xxx
                Content: message,
                SmsType: smsType,
                Brandname: this.esmsAPI.brandName
            };

            const response = await axios.post(
                `${this.esmsAPI.endpoint}/SendMultipleMessage_V4_post_json/`,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.data.CodeResult === '100') {
                return {
                    success: true,
                    provider: 'esms',
                    messageId: response.data.SMSID,
                    status: 'sent',
                    cost: response.data.TotalPrice
                };
            } else {
                throw new Error(`eSMS Error: ${response.data.ErrorMessage || 'Lỗi không xác định'}`);
            }

        } catch (error) {
            logger.error('Lỗi gửi SMS qua eSMS:', error);
            return {
                success: false,
                provider: 'esms',
                error: error.message
            };
        }
    }

    // Gửi SMS qua Viettel
    async sendViaViettel(phoneNumber, message, options = {}) {
        try {
            if (!this.viettelAPI) {
                throw new Error('Viettel SMS chưa được cấu hình');
            }

            // Đăng nhập để lấy access token
            const token = await this.getViettelAccessToken();

            const requestData = {
                Phone: phoneNumber.replace('+84', '84'), // Format 84xxx
                Message: message,
                MessageType: options.messageType || '1', // 1 = CSKH
                CPCode: this.viettelAPI.cpCode
            };

            const response = await axios.post(
                `${this.viettelAPI.endpoint}/send-sms`,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    timeout: 10000
                }
            );

            if (response.data.code === 0) {
                return {
                    success: true,
                    provider: 'viettel',
                    messageId: response.data.messageId,
                    status: 'sent'
                };
            } else {
                throw new Error(`Viettel SMS Error: ${response.data.message || 'Lỗi không xác định'}`);
            }

        } catch (error) {
            logger.error('Lỗi gửi SMS qua Viettel:', error);
            return {
                success: false,
                provider: 'viettel',
                error: error.message
            };
        }
    }

    // Lấy access token từ Viettel
    async getViettelAccessToken() {
        try {
            const cacheKey = 'viettel_sms_token';
            let token = await cacheService.get(cacheKey);

            if (token) {
                return token;
            }

            const response = await axios.post(
                `${this.viettelAPI.endpoint}/auth/login`,
                {
                    username: this.viettelAPI.username,
                    password: this.viettelAPI.password
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );

            if (response.data.code === 0) {
                token = response.data.data.accessToken;
                // Cache token trong 50 phút (token có hiệu lực 1 tiếng)
                await cacheService.set(cacheKey, token, 3000);
                return token;
            } else {
                throw new Error('Không thể lấy access token từ Viettel');
            }

        } catch (error) {
            logger.error('Lỗi lấy Viettel access token:', error);
            throw error;
        }
    }

    // Gửi SMS hàng loạt
    async sendBulkSMS(recipients, message, options = {}) {
        try {
            const results = {
                successful: 0,
                failed: 0,
                errors: []
            };

            const batchSize = 50; // Xử lý theo batch để tránh quá tải

            for (let i = 0; i < recipients.length; i += batchSize) {
                const batch = recipients.slice(i, i + batchSize);

                const batchPromises = batch.map(async (recipient) => {
                    try {
                        const phoneNumber = recipient.phoneNumber || recipient.phone;
                        const customMessage = recipient.message || message;

                        const result = await this.sendSMS(phoneNumber, customMessage, {
                            ...options,
                            userId: recipient.userId
                        });

                        return {
                            phoneNumber,
                            success: result.success,
                            messageId: result.messageId
                        };
                    } catch (error) {
                        return {
                            phoneNumber: recipient.phoneNumber || recipient.phone,
                            success: false,
                            error: error.message
                        };
                    }
                });

                const batchResults = await Promise.allSettled(batchPromises);

                batchResults.forEach(result => {
                    if (result.status === 'fulfilled') {
                        if (result.value.success) {
                            results.successful++;
                        } else {
                            results.failed++;
                            results.errors.push(result.value);
                        }
                    } else {
                        results.failed++;
                        results.errors.push({
                            error: result.reason.message
                        });
                    }
                });

                // Nghỉ giữa các batch để tránh rate limit
                if (i + batchSize < recipients.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            logger.info(`Gửi SMS hàng loạt: ${results.successful} thành công, ${results.failed} thất bại`);
            return results;

        } catch (error) {
            logger.error('Lỗi gửi SMS hàng loạt:', error);
            throw error;
        }
    }

    // Gửi OTP
    async sendOTP(phoneNumber, code, expireMinutes = 5) {
        try {
            const message = `Mã xác thực của bạn là: ${code}. Mã có hiệu lực trong ${expireMinutes} phút. Không chia sẻ mã này với ai khác.`;

            const result = await this.sendSMS(phoneNumber, message, {
                type: 'otp',
                priority: 'high'
            });

            if (result.success) {
                // Lưu OTP vào cache với thời gian hết hạn
                await cacheService.set(
                    `otp:${phoneNumber}`,
                    {
                        code,
                        expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000),
                        attempts: 0
                    },
                    expireMinutes * 60
                );
            }

            return result;

        } catch (error) {
            logger.error('Lỗi gửi OTP:', error);
            throw error;
        }
    }

    // Xác thực OTP
    async verifyOTP(phoneNumber, inputCode) {
        try {
            const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
            const otpData = await cacheService.get(`otp:${normalizedPhone}`);

            if (!otpData) {
                return {
                    valid: false,
                    reason: 'OTP không tồn tại hoặc đã hết hạn'
                };
            }

            // Kiểm tra số lần thử
            if (otpData.attempts >= 3) {
                await cacheService.del(`otp:${normalizedPhone}`);
                return {
                    valid: false,
                    reason: 'Đã vượt quá số lần thử cho phép'
                };
            }

            // Kiểm tra mã OTP
            if (otpData.code !== inputCode) {
                otpData.attempts++;
                await cacheService.set(
                    `otp:${normalizedPhone}`,
                    otpData,
                    Math.max(0, Math.floor((otpData.expiresAt - new Date()) / 1000))
                );

                return {
                    valid: false,
                    reason: 'Mã OTP không đúng',
                    remainingAttempts: 3 - otpData.attempts
                };
            }

            // OTP hợp lệ - xóa khỏi cache
            await cacheService.del(`otp:${normalizedPhone}`);

            return {
                valid: true,
                reason: 'OTP hợp lệ'
            };

        } catch (error) {
            logger.error('Lỗi xác thực OTP:', error);
            return {
                valid: false,
                reason: 'Lỗi hệ thống khi xác thực OTP'
            };
        }
    }

    // Gửi thông báo SMS cho sự kiện
    async sendEventNotification(eventId, type, recipients, customData = {}) {
        try {
            const Event = require('../../models/Event');
            const event = await Event.findById(eventId);

            if (!event) {
                throw new Error('Không tìm thấy sự kiện');
            }

            let messageTemplate;

            switch (type) {
                case 'event_reminder':
                    messageTemplate = `Nhắc nhở: Sự kiện "${event.title}" sẽ bắt đầu trong ${customData.timeUntil || '1 giờ'}. Địa điểm: ${event.location.venue?.name || 'Xem chi tiết trên app'}.`;
                    break;

                case 'event_cancelled':
                    messageTemplate = `Thông báo: Sự kiện "${event.title}" đã bị hủy. Lý do: ${customData.reason || 'Không có lý do cụ thể'}. Xin lỗi vì sự bất tiện này.`;
                    break;

                case 'event_postponed':
                    messageTemplate = `Thông báo: Sự kiện "${event.title}" đã được hoãn. Thời gian mới: ${customData.newDate || 'Sẽ thông báo sau'}. Xin lỗi vì sự bất tiện.`;
                    break;

                case 'registration_approved':
                    messageTemplate = `Chúc mừng! Đăng ký tham gia "${event.title}" của bạn đã được duyệt. Thời gian: ${event.schedule.startDate.toLocaleString('vi-VN')}. Hẹn gặp bạn tại sự kiện!`;
                    break;

                case 'check_in_reminder':
                    messageTemplate = `Nhắc nhở check-in: Bạn đã đăng ký tham gia "${event.title}". Vui lòng check-in tại địa điểm trong vòng 30 phút tới.`;
                    break;

                default:
                    messageTemplate = customData.message || `Thông báo từ sự kiện "${event.title}".`;
            }

            // Lấy số điện thoại từ recipients
            const phoneNumbers = [];
            for (const recipient of recipients) {
                if (recipient.phoneNumber) {
                    phoneNumbers.push({
                        phoneNumber: recipient.phoneNumber,
                        userId: recipient.userId,
                        message: messageTemplate
                    });
                } else if (recipient.userId) {
                    // Lấy số điện thoại từ database
                    const user = await User.findById(recipient.userId).select('phone');
                    if (user && user.phone) {
                        phoneNumbers.push({
                            phoneNumber: user.phone,
                            userId: recipient.userId,
                            message: messageTemplate
                        });
                    }
                }
            }

            if (phoneNumbers.length === 0) {
                return { message: 'Không có số điện thoại hợp lệ để gửi SMS' };
            }

            const result = await this.sendBulkSMS(phoneNumbers, messageTemplate, {
                eventId: eventId,
                type: type
            });

            logger.info(`Đã gửi SMS thông báo sự kiện ${type} cho ${phoneNumbers.length} người`);
            return result;

        } catch (error) {
            logger.error('Lỗi gửi SMS thông báo sự kiện:', error);
            throw error;
        }
    }

    // Utility methods
    normalizePhoneNumber(phoneNumber) {
        // Xóa tất cả ký tự không phải số
        let normalized = phoneNumber.replace(/\D/g, '');

        // Xử lý số điện thoại Việt Nam
        if (normalized.startsWith('84')) {
            return '+' + normalized;
        } else if (normalized.startsWith('0')) {
            return '+84' + normalized.substring(1);
        } else if (normalized.length === 9) {
            return '+84' + normalized;
        }

        // Số quốc tế khác
        if (normalized.length > 10 && !normalized.startsWith('+')) {
            return '+' + normalized;
        }

        return phoneNumber;
    }

    validatePhoneNumber(phoneNumber) {
        // Regex cho số điện thoại Việt Nam
        const vietnamRegex = /^\+84[3|5|7|8|9][0-9]{8}$/;
        // Regex cho số quốc tế cơ bản
        const internationalRegex = /^\+[1-9]\d{1,14}$/;

        return vietnamRegex.test(phoneNumber) || internationalRegex.test(phoneNumber);
    }

    selectProvider(phoneNumber, preferredProvider = null) {
        if (preferredProvider && this.isProviderAvailable(preferredProvider)) {
            return preferredProvider;
        }

        // Ưu tiên provider theo khu vực
        if (phoneNumber.startsWith('+84')) {
            // Số Việt Nam - ưu tiên eSMS hoặc Viettel
            if (this.esmsAPI) return 'esms';
            if (this.viettelAPI) return 'viettel';
        }

        // Số quốc tế - dùng Twilio
        if (this.twilioClient) return 'twilio';

        // Fallback
        if (this.esmsAPI) return 'esms';
        if (this.viettelAPI) return 'viettel';

        return null;
    }

    isProviderAvailable(provider) {
        switch (provider) {
            case 'twilio':
                return !!this.twilioClient;
            case 'esms':
                return !!this.esmsAPI;
            case 'viettel':
                return !!this.viettelAPI;
            default:
                return false;
        }
    }

    async checkRateLimit(phoneNumber) {
        try {
            const key = `sms_rate_limit:${phoneNumber}`;
            const count = await cacheService.get(key) || 0;

            // Giới hạn 10 SMS/giờ cho mỗi số
            return count < 10;

        } catch (error) {
            logger.error('Lỗi kiểm tra rate limit:', error);
            return true; // Cho phép gửi nếu có lỗi
        }
    }

    async updateRateLimit(phoneNumber) {
        try {
            const key = `sms_rate_limit:${phoneNumber}`;
            const count = await cacheService.get(key) || 0;
            await cacheService.set(key, count + 1, 3600); // 1 giờ

        } catch (error) {
            logger.error('Lỗi cập nhật rate limit:', error);
        }
    }

    // Thống kê SMS
    async getSMSStatistics(timeRange = '7d') {
        try {
            // Đây sẽ được implement với database logging trong thực tế
            const stats = {
                totalSent: 0,
                successful: 0,
                failed: 0,
                byProvider: {
                    twilio: 0,
                    esms: 0,
                    viettel: 0
                },
                costs: {
                    total: 0,
                    currency: 'VND'
                },
                generatedAt: new Date()
            };

            return stats;

        } catch (error) {
            logger.error('Lỗi lấy thống kê SMS:', error);
            throw error;
        }
    }

    // Kiểm tra trạng thái SMS
    async checkSMSStatus(messageId, provider) {
        try {
            switch (provider) {
                case 'twilio':
                    if (this.twilioClient) {
                        const message = await this.twilioClient.messages(messageId).fetch();
                        return {
                            status: message.status,
                            errorCode: message.errorCode,
                            errorMessage: message.errorMessage
                        };
                    }
                    break;

                case 'esms':
                    // eSMS API không hỗ trợ check status theo messageId
                    return { status: 'unknown', message: 'eSMS không hỗ trợ kiểm tra trạng thái' };

                case 'viettel':
                    // Implement Viettel status check nếu API hỗ trợ
                    return { status: 'unknown', message: 'Viettel status check chưa được implement' };
            }

            return { status: 'unknown', message: 'Provider không hỗ trợ' };

        } catch (error) {
            logger.error('Lỗi kiểm tra trạng thái SMS:', error);
            return { status: 'error', message: error.message };
        }
    }

    // Kiểm tra tình trạng service
    async healthCheck() {
        try {
            const health = {
                providers: {
                    twilio: this.isProviderAvailable('twilio'),
                    esms: this.isProviderAvailable('esms'),
                    viettel: this.isProviderAvailable('viettel')
                },
                totalProviders: 0,
                activeProviders: 0,
                timestamp: new Date()
            };

            health.totalProviders = Object.keys(health.providers).length;
            health.activeProviders = Object.values(health.providers).filter(Boolean).length;

            return health;

        } catch (error) {
            logger.error('Lỗi kiểm tra tình trạng SMS Service:', error);
            return {
                providers: { twilio: false, esms: false, viettel: false },
                totalProviders: 3,
                activeProviders: 0,
                error: error.message,
                timestamp: new Date()
            };
        }
    }
}

module.exports = new SMSService();