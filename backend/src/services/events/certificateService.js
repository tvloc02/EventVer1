const Certificate = require('../../models/Certificate');
const Registration = require('../../models/Registration');
const Event = require('../../models/Event');
const User = require('../../models/User');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const qrCodeService = require('../qrCodeService');
const logger = require('../../utils/logger');
const { NotFoundError, ValidationError } = require('../../utils/errors');

class CertificateService {
    constructor() {
        this.templateCache = new Map();
        this.defaultTemplate = 'default';
    }

    // Generate certificate
    async generateCertificate(certificateData, issuerId) {
        try {
            const {
                user: userId,
                event: eventId,
                registration: registrationId,
                type,
                customContent,
                skills,
                competencies,
                trainingPoints,
                grade,
                score
            } = certificateData;

            // Validate prerequisites
            const [user, event, registration] = await Promise.all([
                User.findById(userId),
                Event.findById(eventId),
                Registration.findById(registrationId)
            ]);

            if (!user || !event || !registration) {
                throw new NotFoundError('User, event, or registration not found');
            }

            // Check eligibility
            const eligibility = await this.validateCertificateEligibility(registrationId);
            if (!eligibility.eligible) {
                throw new ValidationError(`Certificate not eligible: ${eligibility.reason}`);
            }

            // Check if certificate already exists
            const existingCert = await Certificate.findOne({
                user: userId,
                event: eventId,
                registration: registrationId
            });

            if (existingCert) {
                throw new ValidationError('Certificate already exists for this registration');
            }

            // Create certificate
            const certificate = new Certificate({
                user: userId,
                event: eventId,
                registration: registrationId,
                type,
                title: this.generateCertificateTitle(type, event.title),
                description: customContent?.body || this.getDefaultDescription(type),

                // Recipient info
                recipientName: user.profile.fullName,
                recipientEmail: user.email,
                recipientId: user.student?.studentId,

                // Event info
                eventTitle: event.title,
                eventDate: event.schedule.startDate,
                eventDuration: event.schedule.duration,
                eventLocation: event.location.venue?.name || 'Online',
                eventOrganizer: event.organizer.profile?.fullName,

                // Certificate content
                template: customContent?.template || this.defaultTemplate,
                customContent,
                skills: skills || [],
                competencies: competencies || [],
                trainingPoints: trainingPoints || event.rewards?.trainingPoints || 0,
                grade,
                score,

                // Issuer info
                issuedBy: issuerId,
                issuerName: event.organizer.profile?.fullName,
                issuerTitle: 'Event Organizer',

                // Organization
                organization: {
                    name: event.hostOrganization?.name || 'Student Event Management',
                    logo: event.hostOrganization?.logo,
                    address: event.hostOrganization?.address,
                    website: event.hostOrganization?.website,
                    contact: event.hostOrganization?.contact
                },

                status: 'issued'
            });

            await certificate.save();

            // Generate QR code
            await certificate.generateQRCode();

            // Generate PDF
            const pdfBuffer = await this.generateCertificatePDF(certificate._id);
            certificate.fileUrl = await this.saveCertificatePDF(certificate.certificateId, pdfBuffer);
            certificate.fileSize = pdfBuffer.length;

            await certificate.save();

            // Update registration
            registration.certificate.issued = true;
            registration.certificate.issuedAt = new Date();
            registration.certificate.certificateId = certificate.certificateId;
            await registration.save();

            logger.info(`Certificate generated: ${certificate.certificateId} for ${user.email}`);

            return await this.getCertificateById(certificate._id);

        } catch (error) {
            logger.error('Generate certificate error:', error);
            throw error;
        }
    }

    // Get certificate by ID
    async getCertificateById(certificateId) {
        try {
            const certificate = await Certificate.findById(certificateId)
                .populate('user', 'profile.fullName profile.avatar email student.studentId')
                .populate('event', 'title slug images.banner category')
                .populate('issuedBy', 'profile.fullName profile.avatar');

            if (!certificate) {
                throw new NotFoundError('Certificate not found');
            }

            return certificate;
        } catch (error) {
            logger.error('Get certificate by ID error:', error);
            throw error;
        }
    }

    // Generate certificate PDF
    async generateCertificatePDF(certificateId, regenerate = false) {
        try {
            const certificate = await this.getCertificateById(certificateId);

            // Check if PDF exists and regenerate not requested
            if (!regenerate && certificate.fileUrl) {
                try {
                    return await fs.readFile(certificate.fileUrl);
                } catch (error) {
                    logger.warn('Existing PDF file not found, regenerating...');
                }
            }

            // Load template
            const template = await this.loadCertificateTemplate(certificate.template);

            // Prepare template data
            const templateData = {
                recipientName: certificate.recipientName,
                eventTitle: certificate.eventTitle,
                eventDate: this.formatDate(certificate.eventDate),
                eventDuration: certificate.eventDuration,
                eventLocation: certificate.eventLocation,
                organizationName: certificate.organization.name,
                organizationLogo: certificate.organization.logo,
                issuerName: certificate.issuerName,
                issuerTitle: certificate.issuerTitle,
                issuedDate: this.formatDate(certificate.issuedDate),
                certificateId: certificate.certificateId,
                verificationCode: certificate.verificationCode,
                verificationUrl: `${process.env.FRONTEND_URL}/certificates/verify/${certificate.verificationCode}`,
                qrCode: certificate.qrCode,
                type: certificate.type,
                skills: certificate.skills.join(', '),
                competencies: certificate.competencies.join(', '),
                trainingPoints: certificate.trainingPoints,
                grade: certificate.grade,
                score: certificate.score,
                customContent: certificate.customContent
            };

            // Render HTML
            const html = this.renderTemplate(template, templateData);

            // Generate PDF using Puppeteer
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                landscape: true,
                margin: {
                    top: '0.5in',
                    right: '0.5in',
                    bottom: '0.5in',
                    left: '0.5in'
                },
                printBackground: true
            });

            await browser.close();

            logger.info(`Certificate PDF generated: ${certificate.certificateId}`);
            return pdfBuffer;

        } catch (error) {
            logger.error('Generate certificate PDF error:', error);
            throw error;
        }
    }

    // Bulk generate certificates
    async bulkGenerateCertificates(eventId, recipients, certificateData, issuerId) {
        try {
            const results = {
                successful: 0,
                failed: 0,
                errors: []
            };

            const event = await Event.findById(eventId);
            if (!event) {
                throw new NotFoundError('Event not found');
            }

            for (const recipient of recipients) {
                try {
                    const registration = await Registration.findOne({
                        event: eventId,
                        user: recipient.userId
                    });

                    if (!registration) {
                        results.failed++;
                        results.errors.push({
                            userId: recipient.userId,
                            error: 'Registration not found'
                        });
                        continue;
                    }

                    const certData = {
                        ...certificateData,
                        user: recipient.userId,
                        event: eventId,
                        registration: registration._id,
                        ...recipient.customData
                    };

                    await this.generateCertificate(certData, issuerId);
                    results.successful++;

                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        userId: recipient.userId,
                        error: error.message
                    });
                }

                // Small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            logger.info(`Bulk certificate generation completed: ${results.successful} successful, ${results.failed} failed`);
            return results;

        } catch (error) {
            logger.error('Bulk generate certificates error:', error);
            throw error;
        }
    }

    // Verify certificate
    async verifyCertificate(verificationCode) {
        try {
            const certificate = await Certificate.findByVerificationCode(verificationCode);
            return certificate;
        } catch (error) {
            logger.error('Verify certificate error:', error);
            throw error;
        }
    }

    // Revoke certificate
    async revokeCertificate(certificateId, reason, revokedBy) {
        try {
            const certificate = await Certificate.findById(certificateId);
            if (!certificate) {
                throw new NotFoundError('Certificate not found');
            }

            await certificate.revoke(revokedBy, reason);

            logger.info(`Certificate revoked: ${certificate.certificateId}`);
            return certificate;

        } catch (error) {
            logger.error('Revoke certificate error:', error);
            throw error;
        }
    }

    // Get user certificates
    async getUserCertificates(userId, options = {}) {
        try {
            return await Certificate.getUserCertificates(userId, options);
        } catch (error) {
            logger.error('Get user certificates error:', error);
            throw error;
        }
    }

    // Get event certificates
    async getEventCertificates(eventId, options = {}) {
        try {
            return await Certificate.getEventCertificates(eventId, options);
        } catch (error) {
            logger.error('Get event certificates error:', error);
            throw error;
        }
    }

    // Validate certificate eligibility
    async validateCertificateEligibility(registrationId) {
        try {
            const registration = await Registration.findById(registrationId)
                .populate('event')
                .populate('user');

            if (!registration) {
                return { eligible: false, reason: 'Registration not found' };
            }

            const event = registration.event;
            const requirements = event.rewards?.certificateType;

            if (!requirements || requirements === 'none') {
                return { eligible: false, reason: 'Event does not issue certificates' };
            }

            // Check registration status
            if (registration.status !== 'attended') {
                return { eligible: false, reason: 'Must attend event to receive certificate' };
            }

            // Check attendance if required
            if (requirements !== 'participation') {
                const attendance = registration.attendance;

                if (!attendance.checkedIn) {
                    return { eligible: false, reason: 'Must check-in to event' };
                }

                if (requirements === 'completion' && attendance.attendanceRate < 80) {
                    return { eligible: false, reason: 'Must attend at least 80% of event' };
                }

                if (requirements === 'achievement' && (!registration.feedback.rating || registration.feedback.rating < 4)) {
                    return { eligible: false, reason: 'Must provide positive feedback for achievement certificate' };
                }
            }

            return {
                eligible: true,
                type: requirements,
                attendanceRate: registration.attendance?.attendanceRate,
                requirements: {
                    attendance: requirements !== 'participation',
                    completion: requirements === 'completion' || requirements === 'achievement',
                    feedback: requirements === 'achievement'
                }
            };

        } catch (error) {
            logger.error('Validate certificate eligibility error:', error);
            throw error;
        }
    }

    // Certificate statistics
    async getCertificateStatistics(filters = {}) {
        try {
            return await Certificate.getCertificateStats(filters);
        } catch (error) {
            logger.error('Get certificate statistics error:', error);
            throw error;
        }
    }

    // Load certificate template
    async loadCertificateTemplate(templateName) {
        try {
            if (this.templateCache.has(templateName)) {
                return this.templateCache.get(templateName);
            }

            const templatePath = path.join(
                __dirname,
                '../../templates/certificates',
                `${templateName}.html`
            );

            let template;
            try {
                template = await fs.readFile(templatePath, 'utf8');
            } catch (error) {
                // Use default template if specific template not found
                const defaultPath = path.join(
                    __dirname,
                    '../../templates/certificates',
                    'default.html'
                );
                template = await fs.readFile(defaultPath, 'utf8');
            }

            this.templateCache.set(templateName, template);
            return template;

        } catch (error) {
            logger.error('Load certificate template error:', error);
            throw error;
        }
    }

    // Render template with data
    renderTemplate(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || '';
        });
    }

    // Save certificate PDF
    async saveCertificatePDF(certificateId, pdfBuffer) {
        try {
            const certificatesDir = path.join(process.cwd(), 'uploads/certificates');
            await fs.mkdir(certificatesDir, { recursive: true });

            const filename = `${certificateId}.pdf`;
            const filePath = path.join(certificatesDir, filename);

            await fs.writeFile(filePath, pdfBuffer);
            return filePath;

        } catch (error) {
            logger.error('Save certificate PDF error:', error);
            throw error;
        }
    }

    // Generate certificate title
    generateCertificateTitle(type, eventTitle) {
        const titles = {
            participation: `Certificate of Participation`,
            completion: `Certificate of Completion`,
            achievement: `Certificate of Achievement`,
            excellence: `Certificate of Excellence`
        };

        return `${titles[type] || titles.participation} - ${eventTitle}`;
    }

    // Get default description
    getDefaultDescription(type) {
        const descriptions = {
            participation: 'has successfully participated in',
            completion: 'has successfully completed',
            achievement: 'has achieved outstanding performance in',
            excellence: 'has demonstrated excellence in'
        };

        return descriptions[type] || descriptions.participation;
    }

    // Format date
    formatDate(date) {
        return new Date(date).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Generate QR code for certificate
    async generateCertificateQRCode(certificateId) {
        try {
            const certificate = await Certificate.findById(certificateId);
            if (!certificate) {
                throw new NotFoundError('Certificate not found');
            }

            const qrData = await qrCodeService.generateCertificateQR(
                certificate._id,
                certificate.verificationCode
            );

            return qrData;

        } catch (error) {
            logger.error('Generate certificate QR code error:', error);
            throw error;
        }
    }

    // Share to LinkedIn
    async shareToLinkedIn(certificateId, accessToken, userId) {
        try {
            const certificate = await this.getCertificateById(certificateId);

            if (certificate.user._id.toString() !== userId) {
                throw new ValidationError('Can only share your own certificates');
            }

            const linkedInData = {
                title: certificate.title,
                description: `I have successfully ${certificate.description} ${certificate.eventTitle}`,
                visibility: 'PUBLIC',
                lifecycleState: 'PUBLISHED',
                author: `urn:li:person:${userId}`,
                commentary: `Excited to share my certificate from ${certificate.eventTitle}!`,
                content: {
                    title: certificate.title,
                    landingPage: {
                        url: `${process.env.FRONTEND_URL}/certificates/verify/${certificate.verificationCode}`
                    }
                }
            };

            // Here you would integrate with LinkedIn API
            // For now, just log and return success
            logger.info(`Certificate shared to LinkedIn: ${certificate.certificateId}`);

            certificate.linkedInPublishedAt = new Date();
            certificate.sharedCount += 1;
            await certificate.save();

            return { success: true, sharedAt: certificate.linkedInPublishedAt };

        } catch (error) {
            logger.error('Share to LinkedIn error:', error);
            throw error;
        }
    }

    // Preview certificate
    async previewCertificate(certificateData) {
        try {
            const mockCertificate = {
                recipientName: certificateData.recipientName,
                eventTitle: certificateData.eventTitle,
                eventDate: certificateData.eventDate || new Date(),
                template: certificateData.template || this.defaultTemplate,
                customContent: certificateData.customContent,
                type: certificateData.type || 'participation',
                certificateId: 'PREVIEW-' + Date.now(),
                verificationCode: 'PREVIEW',
                organization: {
                    name: 'Student Event Management',
                    logo: null
                },
                issuerName: 'Preview Issuer',
                issuedDate: new Date()
            };

            const template = await this.loadCertificateTemplate(mockCertificate.template);
            const html = this.renderTemplate(template, mockCertificate);

            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                landscape: true,
                margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
                printBackground: true
            });

            await browser.close();

            return pdfBuffer;

        } catch (error) {
            logger.error('Preview certificate error:', error);
            throw error;
        }
    }

    // Get certificate templates
    async getCertificateTemplates() {
        try {
            const templatesDir = path.join(__dirname, '../../templates/certificates');
            const files = await fs.readdir(templatesDir);

            const templates = files
                .filter(file => file.endsWith('.html'))
                .map(file => ({
                    name: path.basename(file, '.html'),
                    displayName: this.formatTemplateName(path.basename(file, '.html')),
                    filename: file
                }));

            return templates;

        } catch (error) {
            logger.error('Get certificate templates error:', error);
            return [];
        }
    }

    formatTemplateName(name) {
        return name
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
}

module.exports = new CertificateService();