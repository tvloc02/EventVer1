const certificateService = require('../../services/events/certificateService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class CertificateController {
    // Generate certificate
    async generateCertificate(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const certificateData = {
                user: req.body.userId,
                event: req.body.eventId,
                registration: req.body.registrationId,
                type: req.body.type,
                customContent: req.body.customContent,
                skills: req.body.skills,
                competencies: req.body.competencies,
                trainingPoints: req.body.trainingPoints,
                grade: req.body.grade,
                score: req.body.score
            };

            const certificate = await certificateService.generateCertificate(
                certificateData,
                req.user.userId
            );

            res.status(201).json({
                success: true,
                message: 'Certificate generated successfully',
                data: certificate
            });

        } catch (error) {
            logger.error('Generate certificate controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to generate certificate'
            });
        }
    }

    // Get certificate by ID
    async getCertificateById(req, res) {
        try {
            const { certificateId } = req.params;
            const certificate = await certificateService.getCertificateById(certificateId);

            // Check permissions
            const canView = req.user.role === 'admin' ||
                certificate.user._id.toString() === req.user.userId ||
                certificate.issuedBy._id.toString() === req.user.userId;

            if (!canView) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Increment view count
            await certificate.incrementView();

            res.json({
                success: true,
                data: certificate
            });

        } catch (error) {
            logger.error('Get certificate controller error:', error);
            const statusCode = error.name === 'NotFoundError' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to get certificate'
            });
        }
    }

    // Get user certificates
    async getUserCertificates(req, res) {
        try {
            const userId = req.params.userId || req.user.userId;

            // Check permissions
            if (userId !== req.user.userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const options = {
                type: req.query.type,
                status: req.query.status || 'issued'
            };

            const certificates = await certificateService.getUserCertificates(userId, options);

            res.json({
                success: true,
                data: certificates
            });

        } catch (error) {
            logger.error('Get user certificates controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user certificates'
            });
        }
    }

    // Get event certificates
    async getEventCertificates(req, res) {
        try {
            const { eventId } = req.params;
            const options = {
                status: req.query.status,
                type: req.query.type
            };

            const certificates = await certificateService.getEventCertificates(eventId, options);

            res.json({
                success: true,
                data: certificates
            });

        } catch (error) {
            logger.error('Get event certificates controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get event certificates'
            });
        }
    }

    // Download certificate
    async downloadCertificate(req, res) {
        try {
            const { certificateId } = req.params;
            const certificate = await certificateService.getCertificateById(certificateId);

            // Check permissions
            const canDownload = req.user.role === 'admin' ||
                certificate.user._id.toString() === req.user.userId ||
                certificate.issuedBy._id.toString() === req.user.userId;

            if (!canDownload) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Increment download count
            await certificate.incrementDownload();

            // Generate PDF if not exists or regenerate if requested
            const regenerate = req.query.regenerate === 'true';
            const pdfBuffer = await certificateService.generateCertificatePDF(
                certificateId,
                regenerate
            );

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=certificate_${certificate.certificateId}.pdf`);
            res.send(pdfBuffer);

        } catch (error) {
            logger.error('Download certificate controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to download certificate'
            });
        }
    }

    // Verify certificate
    async verifyCertificate(req, res) {
        try {
            const { verificationCode } = req.params;
            const certificate = await certificateService.verifyCertificate(verificationCode);

            if (!certificate) {
                return res.status(404).json({
                    success: false,
                    message: 'Certificate not found or invalid'
                });
            }

            res.json({
                success: true,
                message: 'Certificate verified successfully',
                data: {
                    valid: certificate.isValid(),
                    certificateId: certificate.certificateId,
                    recipientName: certificate.recipientName,
                    eventTitle: certificate.eventTitle,
                    eventDate: certificate.eventDate,
                    issuedDate: certificate.issuedDate,
                    type: certificate.type,
                    organization: certificate.organization.name,
                    status: certificate.status
                }
            });

        } catch (error) {
            logger.error('Verify certificate controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Certificate verification failed'
            });
        }
    }

    // Bulk generate certificates
    async bulkGenerateCertificates(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { eventId, recipients, certificateData } = req.body;
            const results = await certificateService.bulkGenerateCertificates(
                eventId,
                recipients,
                certificateData,
                req.user.userId
            );

            res.json({
                success: true,
                message: `Bulk certificate generation completed: ${results.successful} generated, ${results.failed} failed`,
                data: results
            });

        } catch (error) {
            logger.error('Bulk generate certificates controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Bulk certificate generation failed'
            });
        }
    }

    // Revoke certificate
    async revokeCertificate(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { certificateId } = req.params;
            const { reason } = req.body;

            const certificate = await certificateService.revokeCertificate(
                certificateId,
                reason,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Certificate revoked successfully',
                data: certificate
            });

        } catch (error) {
            logger.error('Revoke certificate controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to revoke certificate'
            });
        }
    }

    // Get certificate statistics
    async getCertificateStats(req, res) {
        try {
            const filters = {
                eventId: req.query.eventId,
                userId: req.query.userId,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const stats = await certificateService.getCertificateStatistics(filters);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get certificate stats controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get certificate statistics'
            });
        }
    }

    // Update certificate template
    async updateCertificateTemplate(req, res) {
        try {
            const { eventId } = req.params;
            const templateData = {
                template: req.body.template,
                customContent: req.body.customContent
            };

            const result = await certificateService.updateCertificateTemplate(
                eventId,
                templateData,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Certificate template updated successfully',
                data: result
            });

        } catch (error) {
            logger.error('Update certificate template controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update certificate template'
            });
        }
    }

    // Preview certificate
    async previewCertificate(req, res) {
        try {
            const certificateData = {
                recipientName: req.body.recipientName || 'John Doe',
                eventTitle: req.body.eventTitle,
                eventDate: req.body.eventDate,
                template: req.body.template,
                customContent: req.body.customContent,
                type: req.body.type
            };

            const previewBuffer = await certificateService.previewCertificate(certificateData);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename=certificate_preview.pdf');
            res.send(previewBuffer);

        } catch (error) {
            logger.error('Preview certificate controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate certificate preview'
            });
        }
    }

    // Export certificates
    async exportCertificates(req, res) {
        try {
            const { eventId } = req.params;
            const { format = 'xlsx' } = req.query;
            const options = {
                status: req.query.status,
                type: req.query.type
            };

            const certificates = await certificateService.getEventCertificates(eventId, options);

            const exportService = require('../../services/analytics/exportService');
            const fileBuffer = await exportService.exportCertificates(certificates, format);

            const filename = `certificates_${eventId}_${Date.now()}.${format}`;

            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-Type', exportService.getContentType(format));

            res.send(fileBuffer);

        } catch (error) {
            logger.error('Export certificates controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Export failed'
            });
        }
    }

    // Share certificate to LinkedIn
    async shareToLinkedIn(req, res) {
        try {
            const { certificateId } = req.params;
            const { accessToken } = req.body;

            const result = await certificateService.shareToLinkedIn(
                certificateId,
                accessToken,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Certificate shared to LinkedIn successfully',
                data: result
            });

        } catch (error) {
            logger.error('Share to LinkedIn controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to share certificate to LinkedIn'
            });
        }
    }

    // Get certificate QR code
    async getCertificateQRCode(req, res) {
        try {
            const { certificateId } = req.params;
            const qrCodeData = await certificateService.generateCertificateQRCode(certificateId);

            res.json({
                success: true,
                data: {
                    qrCode: qrCodeData.qrCode,
                    verificationUrl: qrCodeData.verificationUrl
                }
            });

        } catch (error) {
            logger.error('Get certificate QR code controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to generate QR code'
            });
        }
    }

    // Validate certificate eligibility
    async validateCertificateEligibility(req, res) {
        try {
            const { registrationId } = req.params;
            const eligibility = await certificateService.validateCertificateEligibility(registrationId);

            res.json({
                success: true,
                data: eligibility
            });

        } catch (error) {
            logger.error('Validate certificate eligibility controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to validate certificate eligibility'
            });
        }
    }

    // Get certificate templates
    async getCertificateTemplates(req, res) {
        try {
            const templates = await certificateService.getCertificateTemplates();

            res.json({
                success: true,
                data: templates
            });

        } catch (error) {
            logger.error('Get certificate templates controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get certificate templates'
            });
        }
    }

    // Upload certificate template
    async uploadCertificateTemplate(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No template file uploaded'
                });
            }

            const templateData = {
                name: req.body.name,
                description: req.body.description,
                type: req.body.type,
                file: req.file
            };

            const template = await certificateService.uploadCertificateTemplate(
                templateData,
                req.user.userId
            );

            res.status(201).json({
                success: true,
                message: 'Certificate template uploaded successfully',
                data: template
            });

        } catch (error) {
            logger.error('Upload certificate template controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload certificate template'
            });
        }
    }

    // Get blockchain verification
    async getBlockchainVerification(req, res) {
        try {
            const { certificateId } = req.params;
            const verification = await certificateService.getBlockchainVerification(certificateId);

            res.json({
                success: true,
                data: verification
            });

        } catch (error) {
            logger.error('Get blockchain verification controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get blockchain verification'
            });
        }
    }

    // Record blockchain transaction
    async recordBlockchainTransaction(req, res) {
        try {
            const { certificateId } = req.params;
            const { transactionHash, blockchainNetwork } = req.body;

            const result = await certificateService.recordBlockchainTransaction(
                certificateId,
                transactionHash,
                blockchainNetwork
            );

            res.json({
                success: true,
                message: 'Blockchain transaction recorded successfully',
                data: result
            });

        } catch (error) {
            logger.error('Record blockchain transaction controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to record blockchain transaction'
            });
        }
    }
}

module.exports = new CertificateController();