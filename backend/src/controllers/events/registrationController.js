const registrationService = require('../../services/events/registrationService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class RegistrationController {
    // Register for event
    async registerForEvent(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { id: eventId } = req.params;
            const registration = await registrationService.registerForEvent(
                eventId,
                req.user.userId,
                req.body
            );

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: registration
            });

        } catch (error) {
            logger.error('Register for event controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Registration failed'
            });
        }
    }

    // Get event registrations (for organizers)
    async getEventRegistrations(req, res) {
        try {
            const { id: eventId } = req.params;
            const filters = {
                status: req.query.status,
                registrationType: req.query.registrationType,
                paymentStatus: req.query.paymentStatus,
                attendanceStatus: req.query.attendanceStatus
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50,
                sortBy: req.query.sortBy || 'registrationDate',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const result = await registrationService.getEventRegistrations(eventId, filters, pagination);

            res.json({
                success: true,
                data: result.registrations,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get event registrations controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get event registrations'
            });
        }
    }

    // Get user registrations
    async getUserRegistrations(req, res) {
        try {
            const userId = req.user.userId;
            const filters = {
                status: req.query.status,
                eventType: req.query.eventType
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                sortBy: req.query.sortBy || 'registrationDate',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const result = await registrationService.getUserRegistrations(userId, filters, pagination);

            res.json({
                success: true,
                data: result.registrations,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get user registrations controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user registrations'
            });
        }
    }

    // Get registration details
    async getRegistrationDetails(req, res) {
        try {
            const { regId } = req.params;
            const registration = await registrationService.getRegistrationById(regId);

            // Check permissions
            const canView = req.user.role === 'admin' ||
                registration.user._id.toString() === req.user.userId ||
                req.event?.organizer.toString() === req.user.userId;

            if (!canView) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            res.json({
                success: true,
                data: registration
            });

        } catch (error) {
            logger.error('Get registration details controller error:', error);
            const statusCode = error.name === 'NotFoundError' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to get registration details'
            });
        }
    }

    // Update registration
    async updateRegistration(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { regId } = req.params;
            const registration = await registrationService.getRegistrationById(regId);

            // Check permissions
            if (registration.user._id.toString() !== req.user.userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Can only update your own registration'
                });
            }

            // Update allowed fields
            const allowedUpdates = ['customFieldsData', 'accommodations', 'emergencyContact'];
            const updates = {};

            allowedUpdates.forEach(field => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });

            Object.assign(registration, updates);
            registration.updatedBy = req.user.userId;
            await registration.save();

            res.json({
                success: true,
                message: 'Registration updated successfully',
                data: registration
            });

        } catch (error) {
            logger.error('Update registration controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update registration'
            });
        }
    }

    // Cancel registration
    async cancelRegistration(req, res) {
        try {
            const { regId } = req.params;
            const { reason } = req.body;

            const registration = await registrationService.cancelRegistration(
                regId,
                req.user.userId,
                reason || 'User requested cancellation'
            );

            res.json({
                success: true,
                message: 'Registration cancelled successfully',
                data: registration
            });

        } catch (error) {
            logger.error('Cancel registration controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to cancel registration'
            });
        }
    }

    // Approve registration
    async approveRegistration(req, res) {
        try {
            const { regId } = req.params;
            const registration = await registrationService.approveRegistration(regId, req.user.userId);

            res.json({
                success: true,
                message: 'Registration approved successfully',
                data: registration
            });

        } catch (error) {
            logger.error('Approve registration controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to approve registration'
            });
        }
    }

    // Reject registration
    async rejectRegistration(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { regId } = req.params;
            const { reason } = req.body;

            const registration = await registrationService.rejectRegistration(
                regId,
                req.user.userId,
                reason
            );

            res.json({
                success: true,
                message: 'Registration rejected successfully',
                data: registration
            });

        } catch (error) {
            logger.error('Reject registration controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to reject registration'
            });
        }
    }

    // Check-in user
    async checkInUser(req, res) {
        try {
            const { regId } = req.params;
            const checkInData = {
                method: req.body.method || 'manual',
                location: req.body.location
            };

            const registration = await registrationService.checkInUser(regId, checkInData);

            res.json({
                success: true,
                message: 'Check-in successful',
                data: registration
            });

        } catch (error) {
            logger.error('Check-in user controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Check-in failed'
            });
        }
    }

    // Check-in by QR code
    async checkInByQRCode(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { qrCode } = req.body;
            const checkInData = {
                method: 'qr_code',
                location: req.body.location
            };

            const registration = await registrationService.checkInByQRCode(qrCode, checkInData);

            res.json({
                success: true,
                message: 'QR check-in successful',
                data: registration
            });

        } catch (error) {
            logger.error('QR check-in controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'QR check-in failed'
            });
        }
    }

    // Submit feedback
    async submitFeedback(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { regId } = req.params;
            const feedbackData = {
                rating: req.body.rating,
                review: req.body.review,
                categories: req.body.categories
            };

            const registration = await registrationService.submitFeedback(
                regId,
                feedbackData,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Feedback submitted successfully',
                data: registration
            });

        } catch (error) {
            logger.error('Submit feedback controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to submit feedback'
            });
        }
    }

    // Get registration statistics
    async getEventRegistrationStats(req, res) {
        try {
            const { id: eventId } = req.params;
            const stats = await registrationService.getRegistrationStatistics(eventId);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get registration stats controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get registration statistics'
            });
        }
    }

    // Get waitlist position
    async getWaitlistPosition(req, res) {
        try {
            const { id: eventId } = req.params;
            const userId = req.user.userId;

            const position = await registrationService.getWaitlistPosition(eventId, userId);

            if (position === null) {
                return res.status(404).json({
                    success: false,
                    message: 'User not in waitlist'
                });
            }

            res.json({
                success: true,
                data: {
                    position,
                    eventId
                }
            });

        } catch (error) {
            logger.error('Get waitlist position controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get waitlist position'
            });
        }
    }

    // Process waitlist (for organizers)
    async processWaitlist(req, res) {
        try {
            const { id: eventId } = req.params;
            const promoted = await registrationService.processWaitlistPromotions(eventId);

            res.json({
                success: true,
                message: `${promoted.length} registrations promoted from waitlist`,
                data: {
                    promoted: promoted.length,
                    registrations: promoted
                }
            });

        } catch (error) {
            logger.error('Process waitlist controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process waitlist'
            });
        }
    }

    // Bulk approve registrations
    async bulkApproveRegistrations(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { registrationIds } = req.body;
            const results = [];

            for (const regId of registrationIds) {
                try {
                    const registration = await registrationService.approveRegistration(regId, req.user.userId);
                    results.push({ id: regId, status: 'approved', data: registration });
                } catch (error) {
                    results.push({ id: regId, status: 'failed', error: error.message });
                }
            }

            const successful = results.filter(r => r.status === 'approved').length;
            const failed = results.filter(r => r.status === 'failed').length;

            res.json({
                success: true,
                message: `Bulk approval completed: ${successful} approved, ${failed} failed`,
                data: {
                    successful,
                    failed,
                    results
                }
            });

        } catch (error) {
            logger.error('Bulk approve registrations controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Bulk approval failed'
            });
        }
    }

    // Bulk reject registrations
    async bulkRejectRegistrations(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { registrationIds, reason } = req.body;
            const results = [];

            for (const regId of registrationIds) {
                try {
                    const registration = await registrationService.rejectRegistration(regId, req.user.userId, reason);
                    results.push({ id: regId, status: 'rejected', data: registration });
                } catch (error) {
                    results.push({ id: regId, status: 'failed', error: error.message });
                }
            }

            const successful = results.filter(r => r.status === 'rejected').length;
            const failed = results.filter(r => r.status === 'failed').length;

            res.json({
                success: true,
                message: `Bulk rejection completed: ${successful} rejected, ${failed} failed`,
                data: {
                    successful,
                    failed,
                    results
                }
            });

        } catch (error) {
            logger.error('Bulk reject registrations controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Bulk rejection failed'
            });
        }
    }

    // Bulk check-in
    async bulkCheckIn(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { registrationIds } = req.body;
            const results = [];

            for (const regId of registrationIds) {
                try {
                    const registration = await registrationService.checkInUser(regId, { method: 'manual' });
                    results.push({ id: regId, status: 'checked_in', data: registration });
                } catch (error) {
                    results.push({ id: regId, status: 'failed', error: error.message });
                }
            }

            const successful = results.filter(r => r.status === 'checked_in').length;
            const failed = results.filter(r => r.status === 'failed').length;

            res.json({
                success: true,
                message: `Bulk check-in completed: ${successful} checked in, ${failed} failed`,
                data: {
                    successful,
                    failed,
                    results
                }
            });

        } catch (error) {
            logger.error('Bulk check-in controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Bulk check-in failed'
            });
        }
    }

    // Export registrations
    async exportRegistrations(req, res) {
        try {
            const { id: eventId } = req.params;
            const { format = 'xlsx' } = req.query;

            const filters = {
                status: req.query.status,
                registrationType: req.query.registrationType
            };

            const result = await registrationService.getEventRegistrations(eventId, filters, { limit: 10000 });

            const exportService = require('../../services/analytics/exportService');
            const fileBuffer = await exportService.exportRegistrations(result.registrations, format);

            const filename = `registrations_${eventId}_${Date.now()}.${format}`;

            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-Type', exportService.getContentType(format));

            res.send(fileBuffer);

        } catch (error) {
            logger.error('Export registrations controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Export failed'
            });
        }
    }

    // Import registrations
    async importRegistrations(req, res) {
        try {
            const { id: eventId } = req.params;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const importService = require('../../services/analytics/importService');
            const result = await importService.importRegistrations(eventId, req.file.buffer, req.user.userId);

            res.json({
                success: true,
                message: 'Registrations imported successfully',
                data: {
                    imported: result.imported,
                    failed: result.failed,
                    errors: result.errors
                }
            });

        } catch (error) {
            logger.error('Import registrations controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Import failed'
            });
        }
    }

    // Send event notification to registrants
    async sendEventNotification(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { id: eventId } = req.params;
            const { subject, message, recipients = 'all' } = req.body;

            // Get registrations based on recipients filter
            let registrationFilter = {};

            switch (recipients) {
                case 'approved':
                    registrationFilter.status = 'approved';
                    break;
                case 'pending':
                    registrationFilter.status = 'pending';
                    break;
                case 'waitlist':
                    registrationFilter.status = 'waitlist';
                    break;
                default:
                    // Send to all registrations
                    break;
            }

            const result = await registrationService.getEventRegistrations(
                eventId,
                registrationFilter,
                { limit: 10000 }
            );

            const emailService = require('../../services/notifications/emailService');
            const emailResults = await emailService.sendBulkEmail({
                recipients: result.registrations.map(reg => ({
                    email: reg.user.email,
                    data: {
                        firstName: reg.user.profile.firstName,
                        eventTitle: req.event.title
                    }
                })),
                subject,
                html: message
            });

            res.json({
                success: true,
                message: 'Notification sent successfully',
                data: {
                    totalRecipients: result.registrations.length,
                    successful: emailResults.successful,
                    failed: emailResults.failed
                }
            });

        } catch (error) {
            logger.error('Send event notification controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send notification'
            });
        }
    }
}

module.exports = new RegistrationController();