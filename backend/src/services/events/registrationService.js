const Registration = require('../../models/Registration');
const Event = require('../../models/Event');
const User = require('../../models/User');
const redisClient = require('../../config/redis');
const emailService = require('../notifications/emailService');
const paymentService = require('../payment/paymentService');
const qrCodeService = require('../qrCodeService');
const logger = require('../../utils/logger');
const { NotFoundError, ValidationError, PermissionError } = require('../../utils/errors');

class RegistrationService {
    // Register for event
    async registerForEvent(eventId, userId, registrationData = {}) {
        try {
            // Get event and user
            const [event, user] = await Promise.all([
                Event.findById(eventId),
                User.findById(userId)
            ]);

            if (!event) {
                throw new NotFoundError('Event not found');
            }

            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Check if already registered
            const existingRegistration = await Registration.findOne({
                event: eventId,
                user: userId
            });

            if (existingRegistration) {
                throw new ValidationError('Already registered for this event');
            }

            // Check if registration is open
            if (!event.isRegistrationOpen) {
                throw new ValidationError('Registration is not open for this event');
            }

            // Check if user can register
            if (!event.canUserRegister(user)) {
                throw new ValidationError('You do not meet the requirements for this event');
            }

            // Determine registration type and status
            let registrationType = 'individual';
            let status = event.registration.requiresApproval ? 'pending' : 'approved';
            let approvalStatus = event.registration.requiresApproval ? 'pending_review' : 'auto_approved';

            // Check if event is full
            if (event.isFullyBooked) {
                if (!event.registration.waitlistEnabled) {
                    throw new ValidationError('Event is fully booked and waitlist is not enabled');
                }
                registrationType = 'waitlist';
                status = 'waitlist';
                approvalStatus = 'auto_approved';
            }

            // Create registration
            const registration = new Registration({
                event: eventId,
                user: userId,
                registrationType,
                status,
                approvalStatus,
                customFieldsData: registrationData.customFields || [],
                accommodations: registrationData.accommodations || {},
                emergencyContact: registrationData.emergencyContact || {},
                source: {
                    channel: 'web',
                    referrer: registrationData.referrer,
                    utmParams: registrationData.utmParams
                },
                payment: {
                    required: !event.pricing.isFree,
                    amount: event.pricing.price || 0,
                    currency: event.pricing.currency
                }
            });

            // Handle waitlist
            if (registrationType === 'waitlist') {
                const waitlistPosition = await this.getWaitlistPosition(eventId);
                registration.waitlist = {
                    position: waitlistPosition + 1,
                    joinedAt: new Date(),
                    autoPromote: true
                };
            }

            // Apply coupon if provided
            if (registrationData.couponCode && !event.pricing.isFree) {
                const coupon = event.pricing.coupons.find(
                    c => c.code === registrationData.couponCode && c.isActive
                );

                if (coupon && coupon.usedCount < coupon.maxUses) {
                    const discountAmount = coupon.discountType === 'percentage'
                        ? (registration.payment.amount * coupon.discountValue / 100)
                        : coupon.discountValue;

                    registration.payment.discountApplied = discountAmount;
                    registration.payment.couponCode = registrationData.couponCode;

                    // Update coupon usage
                    coupon.usedCount += 1;
                    await event.save();
                }
            }

            await registration.save();

            // Update event statistics
            if (status === 'approved') {
                await event.incrementRegistrations();
            }

            // Send confirmation email
            await this.sendRegistrationConfirmationEmail(registration, event, user);

            // Handle payment if required
            if (registration.payment.required && registration.payment.finalAmount > 0) {
                const paymentUrl = await paymentService.createPaymentLink({
                    registrationId: registration._id,
                    amount: registration.payment.finalAmount,
                    currency: registration.payment.currency,
                    description: `Registration for ${event.title}`,
                    returnUrl: `${process.env.FRONTEND_URL}/events/${event.slug}/registration/success`,
                    cancelUrl: `${process.env.FRONTEND_URL}/events/${event.slug}/registration/cancel`
                });

                registration.payment.paymentUrl = paymentUrl;
            }

            logger.info(`User registered for event: ${user.email} -> ${event.title}`);

            return await this.getRegistrationById(registration._id);
        } catch (error) {
            logger.error('Register for event error:', error);
            throw error;
        }
    }

    // Get registration by ID
    async getRegistrationById(registrationId, includeEvent = true, includeUser = true) {
        try {
            let query = Registration.findById(registrationId);

            if (includeEvent) {
                query = query.populate('event', 'title slug images.banner schedule location organizer');
            }

            if (includeUser) {
                query = query.populate('user', 'profile.fullName profile.avatar email student');
            }

            const registration = await query.exec();

            if (!registration) {
                throw new NotFoundError('Registration not found');
            }

            return registration;
        } catch (error) {
            logger.error('Get registration by ID error:', error);
            throw error;
        }
    }

    // Get user registrations
    async getUserRegistrations(userId, filters = {}, pagination = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                sortBy = 'registrationDate',
                sortOrder = 'desc'
            } = pagination;

            const query = { user: userId };

            if (filters.status) {
                if (Array.isArray(filters.status)) {
                    query.status = { $in: filters.status };
                } else {
                    query.status = filters.status;
                }
            }

            if (filters.eventType) {
                // Need to join with Event collection for this filter
                // Implementation would require aggregation pipeline
            }

            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const [registrations, total] = await Promise.all([
                Registration.find(query)
                    .populate('event', 'title slug images.banner schedule location eventType category')
                    .populate('event.category', 'name color')
                    .sort(sort)
                    .skip(skip)
                    .limit(limit),
                Registration.countDocuments(query)
            ]);

            return {
                registrations,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            logger.error('Get user registrations error:', error);
            throw error;
        }
    }

    // Get event registrations
    async getEventRegistrations(eventId, filters = {}, pagination = {}) {
        try {
            const {
                page = 1,
                limit = 50,
                sortBy = 'registrationDate',
                sortOrder = 'desc'
            } = pagination;

            const query = { event: eventId };

            if (filters.status) {
                if (Array.isArray(filters.status)) {
                    query.status = { $in: filters.status };
                } else {
                    query.status = filters.status;
                }
            }

            if (filters.registrationType) {
                query.registrationType = filters.registrationType;
            }

            if (filters.paymentStatus) {
                query['payment.status'] = filters.paymentStatus;
            }

            if (filters.attendanceStatus) {
                query['attendance.checkedIn'] = filters.attendanceStatus === 'checked_in';
            }

            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const [registrations, total] = await Promise.all([
                Registration.find(query)
                    .populate('user', 'profile.fullName profile.avatar email student phone')
                    .sort(sort)
                    .skip(skip)
                    .limit(limit),
                Registration.countDocuments(query)
            ]);

            return {
                registrations,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            logger.error('Get event registrations error:', error);
            throw error;
        }
    }

    // Cancel registration
    async cancelRegistration(registrationId, userId, reason = 'User requested cancellation') {
        try {
            const registration = await Registration.findById(registrationId)
                .populate('event', 'title organizer coOrganizers')
                .populate('user', 'profile.fullName email');

            if (!registration) {
                throw new NotFoundError('Registration not found');
            }

            // Check permissions
            const canCancel = registration.user._id.toString() === userId ||
                registration.event.organizer.toString() === userId ||
                registration.event.coOrganizers.some(coOrg => coOrg.toString() === userId);

            if (!canCancel) {
                throw new PermissionError('Insufficient permissions to cancel this registration');
            }

            // Check if cancellation is allowed
            if (['cancelled', 'attended'].includes(registration.status)) {
                throw new ValidationError('Registration cannot be cancelled');
            }

            await registration.cancel(reason);

            // Update event statistics
            await registration.event.decrementRegistrations();

            // Process waitlist if applicable
            if (registration.status === 'approved') {
                await this.processWaitlistPromotions(registration.event._id);
            }

            // Send cancellation email
            await this.sendCancellationEmail(registration);

            logger.info(`Registration cancelled: ${registration.user.email} -> ${registration.event.title}`);

            return await this.getRegistrationById(registrationId);
        } catch (error) {
            logger.error('Cancel registration error:', error);
            throw error;
        }
    }

    // Approve registration
    async approveRegistration(registrationId, approverId) {
        try {
            const registration = await Registration.findById(registrationId)
                .populate('event', 'title maxParticipants currentParticipants')
                .populate('user', 'profile.fullName email');

            if (!registration) {
                throw new NotFoundError('Registration not found');
            }

            if (registration.status !== 'pending') {
                throw new ValidationError('Only pending registrations can be approved');
            }

            // Check if event still has space
            if (registration.event.isFullyBooked) {
                throw new ValidationError('Event is fully booked');
            }

            await registration.approve(approverId);
            await registration.event.incrementRegistrations();

            // Send approval email
            await this.sendApprovalEmail(registration);

            logger.info(`Registration approved: ${registration.user.email} -> ${registration.event.title}`);

            return await this.getRegistrationById(registrationId);
        } catch (error) {
            logger.error('Approve registration error:', error);
            throw error;
        }
    }

    // Reject registration
    async rejectRegistration(registrationId, rejectorId, reason) {
        try {
            const registration = await Registration.findById(registrationId)
                .populate('user', 'profile.fullName email');

            if (!registration) {
                throw new NotFoundError('Registration not found');
            }

            if (registration.status !== 'pending') {
                throw new ValidationError('Only pending registrations can be rejected');
            }

            await registration.reject(reason, rejectorId);

            // Send rejection email
            await this.sendRejectionEmail(registration, reason);

            logger.info(`Registration rejected: ${registration.user.email} -> ${registration.event.title}`);

            return await this.getRegistrationById(registrationId);
        } catch (error) {
            logger.error('Reject registration error:', error);
            throw error;
        }
    }

    // Check-in user
    async checkInUser(registrationId, checkInData = {}) {
        try {
            const registration = await Registration.findById(registrationId)
                .populate('event', 'title')
                .populate('user', 'profile.fullName email');

            if (!registration) {
                throw new NotFoundError('Registration not found');
            }

            if (registration.status !== 'approved') {
                throw new ValidationError('Only approved registrations can be checked in');
            }

            if (registration.attendance.checkedIn) {
                throw new ValidationError('User already checked in');
            }

            await registration.checkIn(
                checkInData.method || 'manual',
                checkInData.location
            );

            logger.info(`User checked in: ${registration.user.email} -> ${registration.event.title}`);

            return await this.getRegistrationById(registrationId);
        } catch (error) {
            logger.error('Check-in user error:', error);
            throw error;
        }
    }

    // Check-in by QR code
    async checkInByQRCode(qrCode, checkInData = {}) {
        try {
            const registration = await Registration.findByQRCode(qrCode);

            if (!registration) {
                throw new NotFoundError('Invalid or expired QR code');
            }

            return await this.checkInUser(registration._id, {
                ...checkInData,
                method: 'qr_code'
            });
        } catch (error) {
            logger.error('Check-in by QR code error:', error);
            throw error;
        }
    }

    // Get registration statistics
    async getRegistrationStatistics(eventId = null, userId = null) {
        try {
            const cacheKey = eventId
                ? `reg_stats:event:${eventId}`
                : userId
                    ? `reg_stats:user:${userId}`
                    : 'reg_stats:global';

            let stats = await redisClient.get(cacheKey);

            if (!stats) {
                let matchQuery = {};
                if (eventId) matchQuery.event = eventId;
                if (userId) matchQuery.user = userId;

                const pipeline = [
                    { $match: matchQuery },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 }
                        }
                    }
                ];

                const results = await Registration.aggregate(pipeline);

                stats = {
                    total: 0,
                    approved: 0,
                    pending: 0,
                    rejected: 0,
                    cancelled: 0,
                    attended: 0,
                    waitlist: 0,
                    no_show: 0
                };

                results.forEach(result => {
                    stats[result._id] = result.count;
                    stats.total += result.count;
                });

                // Cache for 5 minutes
                await redisClient.set(cacheKey, stats, 300);
            }

            return stats;
        } catch (error) {
            logger.error('Get registration statistics error:', error);
            throw error;
        }
    }

    // Process waitlist promotions
    async processWaitlistPromotions(eventId) {
        try {
            const promoted = await Registration.processWaitlistPromotions(eventId);

            for (const registration of promoted) {
                await this.sendWaitlistPromotionEmail(registration);
            }

            logger.info(`Promoted ${promoted.length} users from waitlist for event ${eventId}`);

            return promoted;
        } catch (error) {
            logger.error('Process waitlist promotions error:', error);
            throw error;
        }
    }

    // Get waitlist position
    async getWaitlistPosition(eventId, userId = null) {
        try {
            if (userId) {
                return await Registration.getWaitlistPosition(eventId, userId);
            }

            const waitlistCount = await Registration.countDocuments({
                event: eventId,
                registrationType: 'waitlist',
                status: 'waitlist'
            });

            return waitlistCount;
        } catch (error) {
            logger.error('Get waitlist position error:', error);
            throw error;
        }
    }

    // Submit feedback
    async submitFeedback(registrationId, feedbackData, userId) {
        try {
            const registration = await Registration.findById(registrationId);

            if (!registration) {
                throw new NotFoundError('Registration not found');
            }

            if (registration.user.toString() !== userId) {
                throw new PermissionError('Can only submit feedback for your own registrations');
            }

            if (registration.status !== 'attended') {
                throw new ValidationError('Can only submit feedback after attending the event');
            }

            if (registration.feedback.submitted) {
                throw new ValidationError('Feedback already submitted');
            }

            await registration.submitFeedback(feedbackData);

            // Update event rating
            if (feedbackData.rating) {
                const event = await Event.findById(registration.event);
                await event.updateRating(feedbackData.rating);
            }

            logger.info(`Feedback submitted for registration: ${registrationId}`);

            return await this.getRegistrationById(registrationId);
        } catch (error) {
            logger.error('Submit feedback error:', error);
            throw error;
        }
    }

    // Email helpers
    async sendRegistrationConfirmationEmail(registration, event, user) {
        try {
            await emailService.sendEmail({
                to: user.email,
                subject: `Registration Confirmation - ${event.title}`,
                template: 'registration-confirmation',
                data: {
                    userName: user.profile.fullName,
                    eventTitle: event.title,
                    eventDate: event.schedule.startDate,
                    eventLocation: event.location.venue?.name || event.location.online?.platform,
                    registrationNumber: registration.registrationNumber,
                    qrCode: registration.checkIn.qrCode
                }
            });
        } catch (error) {
            logger.error('Send registration confirmation email error:', error);
        }
    }

    async sendApprovalEmail(registration) {
        try {
            await emailService.sendEmail({
                to: registration.user.email,
                subject: `Registration Approved - ${registration.event.title}`,
                template: 'registration-approved',
                data: {
                    userName: registration.user.profile.fullName,
                    eventTitle: registration.event.title,
                    registrationNumber: registration.registrationNumber
                }
            });
        } catch (error) {
            logger.error('Send approval email error:', error);
        }
    }

    async sendRejectionEmail(registration, reason) {
        try {
            await emailService.sendEmail({
                to: registration.user.email,
                subject: `Registration Not Approved - ${registration.event.title}`,
                template: 'registration-rejected',
                data: {
                    userName: registration.user.profile.fullName,
                    eventTitle: registration.event.title,
                    rejectionReason: reason
                }
            });
        } catch (error) {
            logger.error('Send rejection email error:', error);
        }
    }

    async sendCancellationEmail(registration) {
        try {
            await emailService.sendEmail({
                to: registration.user.email,
                subject: `Registration Cancelled - ${registration.event.title}`,
                template: 'registration-cancelled',
                data: {
                    userName: registration.user.profile.fullName,
                    eventTitle: registration.event.title,
                    cancellationReason: registration.cancellationReason
                }
            });
        } catch (error) {
            logger.error('Send cancellation email error:', error);
        }
    }

    async sendWaitlistPromotionEmail(registration) {
        try {
            await emailService.sendEmail({
                to: registration.user.email,
                subject: `You're In! Registration Confirmed - ${registration.event.title}`,
                template: 'waitlist-promotion',
                data: {
                    userName: registration.user.profile.fullName,
                    eventTitle: registration.event.title,
                    registrationNumber: registration.registrationNumber
                }
            });
        } catch (error) {
            logger.error('Send waitlist promotion email error:', error);
        }
    }
}

module.exports = new RegistrationService();