const QRCode = require('qrcode');
const crypto = require('crypto');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class QRCodeService {
    constructor() {
        this.defaultOptions = {
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 256,
            errorCorrectionLevel: 'M'
        };
    }

    // Generate QR code for data
    async generateQRCode(data, options = {}) {
        try {
            const qrOptions = { ...this.defaultOptions, ...options };

            // Convert data to string if it's an object
            const qrData = typeof data === 'object' ? JSON.stringify(data) : data;

            // Generate QR code as data URL
            const qrCodeDataUrl = await QRCode.toDataURL(qrData, qrOptions);

            logger.debug('QR code generated successfully', {
                dataLength: qrData.length,
                options: qrOptions
            });

            return qrCodeDataUrl;
        } catch (error) {
            logger.error('QR code generation failed:', error);
            throw new Error('Failed to generate QR code');
        }
    }

    // Generate QR code as buffer
    async generateQRCodeBuffer(data, options = {}) {
        try {
            const qrOptions = { ...this.defaultOptions, ...options };
            const qrData = typeof data === 'object' ? JSON.stringify(data) : data;

            const buffer = await QRCode.toBuffer(qrData, qrOptions);

            logger.debug('QR code buffer generated successfully');
            return buffer;
        } catch (error) {
            logger.error('QR code buffer generation failed:', error);
            throw new Error('Failed to generate QR code buffer');
        }
    }

    // Generate QR code as SVG
    async generateQRCodeSVG(data, options = {}) {
        try {
            const qrOptions = { ...this.defaultOptions, ...options, type: 'svg' };
            const qrData = typeof data === 'object' ? JSON.stringify(data) : data;

            const svg = await QRCode.toString(qrData, qrOptions);

            logger.debug('QR code SVG generated successfully');
            return svg;
        } catch (error) {
            logger.error('QR code SVG generation failed:', error);
            throw new Error('Failed to generate QR code SVG');
        }
    }

    // Generate event check-in QR code
    async generateEventCheckInQR(eventId, options = {}) {
        try {
            const checkInData = {
                type: 'event_checkin',
                eventId,
                timestamp: Date.now(),
                signature: this.generateSignature(`event_checkin:${eventId}`)
            };

            // Cache the QR data for verification
            await redisClient.set(
                `qr:checkin:${eventId}`,
                JSON.stringify(checkInData),
                3600 // 1 hour expiry
            );

            const qrCode = await this.generateQRCode(checkInData, options);

            logger.info(`Event check-in QR code generated for event: ${eventId}`);
            return qrCode;
        } catch (error) {
            logger.error('Event check-in QR generation failed:', error);
            throw error;
        }
    }

    // Generate registration QR code
    async generateRegistrationQR(registrationId, userId, eventId, options = {}) {
        try {
            const registrationData = {
                type: 'registration',
                registrationId,
                userId,
                eventId,
                timestamp: Date.now(),
                signature: this.generateSignature(`registration:${registrationId}:${userId}`)
            };

            // Cache the QR data for verification
            await redisClient.set(
                `qr:registration:${registrationId}`,
                JSON.stringify(registrationData),
                24 * 3600 // 24 hours expiry
            );

            const qrCode = await this.generateQRCode(registrationData, options);

            logger.info(`Registration QR code generated for registration: ${registrationId}`);
            return qrCode;
        } catch (error) {
            logger.error('Registration QR generation failed:', error);
            throw error;
        }
    }

    // Generate certificate verification QR code
    async generateCertificateQR(certificateId, verificationCode, options = {}) {
        try {
            const verificationUrl = `${process.env.FRONTEND_URL}/certificates/verify/${verificationCode}`;

            const certificateData = {
                type: 'certificate_verification',
                certificateId,
                verificationCode,
                verificationUrl,
                timestamp: Date.now()
            };

            const qrCode = await this.generateQRCode(verificationUrl, options);

            logger.info(`Certificate QR code generated for certificate: ${certificateId}`);
            return {
                qrCode,
                verificationUrl,
                data: certificateData
            };
        } catch (error) {
            logger.error('Certificate QR generation failed:', error);
            throw error;
        }
    }

    // Generate event info QR code
    async generateEventInfoQR(eventId, eventSlug, options = {}) {
        try {
            const eventUrl = `${process.env.FRONTEND_URL}/events/${eventSlug}`;

            const eventData = {
                type: 'event_info',
                eventId,
                eventSlug,
                eventUrl,
                timestamp: Date.now()
            };

            const qrCode = await this.generateQRCode(eventUrl, options);

            logger.info(`Event info QR code generated for event: ${eventId}`);
            return {
                qrCode,
                eventUrl,
                data: eventData
            };
        } catch (error) {
            logger.error('Event info QR generation failed:', error);
            throw error;
        }
    }

    // Generate contact sharing QR code
    async generateContactQR(contactInfo, options = {}) {
        try {
            // Format as vCard
            const vCard = this.formatAsVCard(contactInfo);

            const qrCode = await this.generateQRCode(vCard, {
                ...options,
                errorCorrectionLevel: 'L' // Lower error correction for more data
            });

            logger.info('Contact QR code generated');
            return qrCode;
        } catch (error) {
            logger.error('Contact QR generation failed:', error);
            throw error;
        }
    }

    // Generate WiFi connection QR code
    async generateWiFiQR(ssid, password, security = 'WPA', hidden = false, options = {}) {
        try {
            const wifiString = `WIFI:T:${security};S:${ssid};P:${password};H:${hidden ? 'true' : 'false'};;`;

            const qrCode = await this.generateQRCode(wifiString, options);

            logger.info('WiFi QR code generated');
            return qrCode;
        } catch (error) {
            logger.error('WiFi QR generation failed:', error);
            throw error;
        }
    }

    // Verify QR code data
    async verifyQRCode(qrData, type) {
        try {
            let parsedData;

            try {
                parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
            } catch (parseError) {
                // If not JSON, treat as plain string
                parsedData = { data: qrData };
            }

            // Verify signature if present
            if (parsedData.signature && parsedData.type) {
                let dataToVerify;

                switch (parsedData.type) {
                    case 'event_checkin':
                        dataToVerify = `event_checkin:${parsedData.eventId}`;
                        break;
                    case 'registration':
                        dataToVerify = `registration:${parsedData.registrationId}:${parsedData.userId}`;
                        break;
                    default:
                        dataToVerify = parsedData.data || '';
                }

                const expectedSignature = this.generateSignature(dataToVerify);
                if (parsedData.signature !== expectedSignature) {
                    logger.warn('QR code signature verification failed', { type: parsedData.type });
                    return { valid: false, reason: 'Invalid signature' };
                }
            }

            // Check expiry if timestamp is present
            if (parsedData.timestamp) {
                const age = Date.now() - parsedData.timestamp;
                const maxAge = this.getMaxAge(parsedData.type);

                if (age > maxAge) {
                    logger.warn('QR code expired', {
                        type: parsedData.type,
                        age: Math.round(age / 1000 / 60), // minutes
                        maxAge: Math.round(maxAge / 1000 / 60) // minutes
                    });
                    return { valid: false, reason: 'QR code expired' };
                }
            }

            // Type-specific validation
            if (type && parsedData.type !== type) {
                return { valid: false, reason: 'Invalid QR code type' };
            }

            logger.info('QR code verified successfully', { type: parsedData.type });
            return { valid: true, data: parsedData };

        } catch (error) {
            logger.error('QR code verification failed:', error);
            return { valid: false, reason: 'Verification failed' };
        }
    }

    // Batch generate QR codes
    async batchGenerateQRCodes(items, type, options = {}) {
        try {
            const results = [];
            const batchSize = 10;

            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);

                const batchPromises = batch.map(async (item) => {
                    try {
                        let qrCode;

                        switch (type) {
                            case 'registration':
                                qrCode = await this.generateRegistrationQR(
                                    item.registrationId,
                                    item.userId,
                                    item.eventId,
                                    options
                                );
                                break;
                            case 'certificate':
                                qrCode = await this.generateCertificateQR(
                                    item.certificateId,
                                    item.verificationCode,
                                    options
                                );
                                break;
                            case 'event_info':
                                qrCode = await this.generateEventInfoQR(
                                    item.eventId,
                                    item.eventSlug,
                                    options
                                );
                                break;
                            default:
                                qrCode = await this.generateQRCode(item.data, options);
                        }

                        return { id: item.id, qrCode, success: true };
                    } catch (error) {
                        return { id: item.id, error: error.message, success: false };
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);

                // Small delay between batches to prevent overwhelming
                if (i + batchSize < items.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            const successful = results.filter(r => r.success).length;
            const failed = results.length - successful;

            logger.info(`Batch QR generation completed: ${successful} successful, ${failed} failed`);

            return {
                successful,
                failed,
                results
            };
        } catch (error) {
            logger.error('Batch QR generation failed:', error);
            throw error;
        }
    }

    // Get QR code statistics
    async getQRCodeStats(eventId) {
        try {
            const keys = await redisClient.keys(`qr:*:${eventId}*`);
            const stats = {
                total: keys.length,
                byType: {},
                generated: 0,
                scanned: 0
            };

            for (const key of keys) {
                const data = await redisClient.get(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        const type = parsed.type || 'unknown';
                        stats.byType[type] = (stats.byType[type] || 0) + 1;
                        stats.generated++;

                        if (parsed.scanned) {
                            stats.scanned++;
                        }
                    } catch (parseError) {
                        // Skip invalid data
                    }
                }
            }

            return stats;
        } catch (error) {
            logger.error('Get QR stats failed:', error);
            throw error;
        }
    }

    // Helper methods
    generateSignature(data) {
        return crypto
            .createHmac('sha256', process.env.JWT_SECRET || 'fallback_secret')
            .update(data)
            .digest('hex');
    }

    getMaxAge(type) {
        const maxAges = {
            'event_checkin': 24 * 60 * 60 * 1000, // 24 hours
            'registration': 30 * 24 * 60 * 60 * 1000, // 30 days
            'certificate_verification': 0, // No expiry
            'event_info': 90 * 24 * 60 * 60 * 1000, // 90 days
            'contact': 365 * 24 * 60 * 60 * 1000, // 1 year
            'wifi': 0 // No expiry
        };

        return maxAges[type] || 24 * 60 * 60 * 1000; // Default 24 hours
    }

    formatAsVCard(contactInfo) {
        const {
            firstName,
            lastName,
            email,
            phone,
            organization,
            title,
            website,
            address
        } = contactInfo;

        let vCard = 'BEGIN:VCARD\n';
        vCard += 'VERSION:3.0\n';

        if (firstName || lastName) {
            vCard += `FN:${firstName || ''} ${lastName || ''}\n`;
            vCard += `N:${lastName || ''};${firstName || ''};;;\n`;
        }

        if (email) {
            vCard += `EMAIL:${email}\n`;
        }

        if (phone) {
            vCard += `TEL:${phone}\n`;
        }

        if (organization) {
            vCard += `ORG:${organization}\n`;
        }

        if (title) {
            vCard += `TITLE:${title}\n`;
        }

        if (website) {
            vCard += `URL:${website}\n`;
        }

        if (address) {
            vCard += `ADR:;;${address};;;;\n`;
        }

        vCard += 'END:VCARD';

        return vCard;
    }

    // Clean up expired QR codes
    async cleanupExpiredQRCodes() {
        try {
            const keys = await redisClient.keys('qr:*');
            let cleaned = 0;

            for (const key of keys) {
                const data = await redisClient.get(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.timestamp) {
                            const age = Date.now() - parsed.timestamp;
                            const maxAge = this.getMaxAge(parsed.type);

                            if (maxAge > 0 && age > maxAge) {
                                await redisClient.del(key);
                                cleaned++;
                            }
                        }
                    } catch (parseError) {
                        // Delete invalid data
                        await redisClient.del(key);
                        cleaned++;
                    }
                }
            }

            logger.info(`Cleaned up ${cleaned} expired QR codes`);
            return cleaned;
        } catch (error) {
            logger.error('QR cleanup failed:', error);
            throw error;
        }
    }

    // Mark QR code as scanned
    async markAsScanned(qrKey) {
        try {
            const data = await redisClient.get(qrKey);
            if (data) {
                const parsed = JSON.parse(data);
                parsed.scanned = true;
                parsed.scannedAt = Date.now();

                await redisClient.set(qrKey, JSON.stringify(parsed));
                logger.debug(`QR code marked as scanned: ${qrKey}`);
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Mark QR as scanned failed:', error);
            return false;
        }
    }
}

// Schedule cleanup every hour
const qrService = new QRCodeService();
setInterval(() => {
    qrService.cleanupExpiredQRCodes().catch(error => {
        logger.error('Scheduled QR cleanup failed:', error);
    });
}, 60 * 60 * 1000); // 1 hour

module.exports = qrService;