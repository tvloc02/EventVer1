const Event = require('../../models/Event');
const Registration = require('../../models/Registration');
const User = require('../../models/User');
const redisClient = require('../../config/redis');
const searchService = require('../searchService');
const qrCodeService = require('../qrCodeService');
const logger = require('../../utils/logger');
const { NotFoundError, ValidationError, PermissionError } = require('../../utils/errors');

class EventService {
    // Create new event
    async createEvent(eventData, organizerId) {
        try {
            const organizer = await User.findById(organizerId);
            if (!organizer) {
                throw new NotFoundError('Organizer not found');
            }

            // Validate organizer permissions
            if (!['organizer', 'moderator', 'admin'].includes(organizer.role)) {
                throw new PermissionError('Insufficient permissions to create events');
            }

            const event = new Event({
                ...eventData,
                organizer: organizerId,
                createdBy: organizerId,
                status: eventData.status || 'draft'
            });

            await event.save();

            // Generate QR code if enabled
            if (event.enableQRCode) {
                const qrData = {
                    eventId: event._id,
                    eventCode: event.eventCode,
                    type: 'event_checkin'
                };
                event.qrCode = await qrCodeService.generateQRCode(qrData);
                await event.save();
            }

            // Index in Elasticsearch
            await searchService.indexEvent(event);

            // Clear cache
            await this.clearEventCaches();

            logger.info(`Event created: ${event.title} by ${organizer.email}`);

            return await this.getEventById(event._id);
        } catch (error) {
            logger.error('Create event error:', error);
            throw error;
        }
    }

    // Get event by ID
    async getEventById(eventId, userId = null) {
        try {
            const cacheKey = `event:${eventId}`;
            let event = await redisClient.get(cacheKey);

            if (!event) {
                event = await Event.findById(eventId)
                    .populate('organizer', 'profile.fullName profile.avatar email')
                    .populate('coOrganizers', 'profile.fullName profile.avatar email')
                    .populate('category', 'name color description');

                if (!event) {
                    throw new NotFoundError('Event not found');
                }

                // Cache for 30 minutes
                await redisClient.set(cacheKey, event, 1800);
            }

            // Increment view count if user is viewing
            if (userId) {
                await event.incrementViews();

                // Check if user can register
                if (userId) {
                    const user = await User.findById(userId);
                    event.canRegister = event.canUserRegister(user);

                    // Check existing registration
                    const existingReg = await Registration.findOne({
                        event: eventId,
                        user: userId
                    });
                    event.userRegistration = existingReg;
                }
            }

            return event;
        } catch (error) {
            logger.error('Get event by ID error:', error);
            throw error;
        }
    }

    // Get events list with filters
    async getEvents(filters = {}, pagination = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = pagination;

            const {
                status,
                category,
                eventType,
                location,
                startDate,
                endDate,
                featured,
                organizer,
                search,
                visibility = 'public'
            } = filters;

            // Build query
            const query = { visibility };

            if (status) {
                if (Array.isArray(status)) {
                    query.status = { $in: status };
                } else {
                    query.status = status;
                }
            }

            if (category) query.category = category;
            if (eventType) query.eventType = eventType;
            if (organizer) query.organizer = organizer;
            if (featured !== undefined) query.featured = featured;

            if (location) {
                query['location.type'] = location;
            }

            if (startDate || endDate) {
                query['schedule.startDate'] = {};
                if (startDate) query['schedule.startDate'].$gte = new Date(startDate);
                if (endDate) query['schedule.startDate'].$lte = new Date(endDate);
            }

            // Text search
            if (search) {
                query.$text = { $search: search };
            }

            // Execute query
            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const [events, total] = await Promise.all([
                Event.find(query)
                    .populate('organizer', 'profile.fullName profile.avatar')
                    .populate('category', 'name color')
                    .sort(sort)
                    .skip(skip)
                    .limit(limit),
                Event.countDocuments(query)
            ]);

            return {
                events,
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
            logger.error('Get events error:', error);
            throw error;
        }
    }

    // Update event
    async updateEvent(eventId, updateData, userId) {
        try {
            const event = await Event.findById(eventId);
            if (!event) {
                throw new NotFoundError('Event not found');
            }

            const user = await User.findById(userId);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Check permissions
            const canEdit = user.role === 'admin' ||
                event.organizer.toString() === userId ||
                event.coOrganizers.some(coOrg => coOrg.toString() === userId);

            if (!canEdit) {
                throw new PermissionError('Insufficient permissions to update this event');
            }

            // Update fields
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    event[key] = updateData[key];
                }
            });

            event.updatedBy = userId;
            await event.save();

            // Update search index
            await searchService.updateEvent(event);

            // Clear caches
            await this.clearEventCaches(eventId);

            logger.info(`Event updated: ${event.title} by ${user.email}`);

            return await this.getEventById(eventId);
        } catch (error) {
            logger.error('Update event error:', error);
            throw error;
        }
    }

    // Delete event
    async deleteEvent(eventId, userId) {
        try {
            const event = await Event.findById(eventId);
            if (!event) {
                throw new NotFoundError('Event not found');
            }

            const user = await User.findById(userId);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Check permissions
            const canDelete = user.role === 'admin' ||
                event.organizer.toString() === userId;

            if (!canDelete) {
                throw new PermissionError('Insufficient permissions to delete this event');
            }

            // Check if event has registrations
            const registrationCount = await Registration.countDocuments({ event: eventId });
            if (registrationCount > 0) {
                throw new ValidationError('Cannot delete event with existing registrations');
            }

            await Event.findByIdAndDelete(eventId);

            // Remove from search index
            await searchService.removeEvent(eventId);

            // Clear caches
            await this.clearEventCaches(eventId);

            logger.info(`Event deleted: ${event.title} by ${user.email}`);

            return { message: 'Event deleted successfully' };
        } catch (error) {
            logger.error('Delete event error:', error);
            throw error;
        }
    }

    // Publish event
    async publishEvent(eventId, userId) {
        try {
            const event = await Event.findById(eventId);
            if (!event) {
                throw new NotFoundError('Event not found');
            }

            // Check permissions
            const user = await User.findById(userId);
            const canPublish = user.role === 'admin' ||
                event.organizer.toString() === userId ||
                event.coOrganizers.some(coOrg => coOrg.toString() === userId);

            if (!canPublish) {
                throw new PermissionError('Insufficient permissions to publish this event');
            }

            // Validate event data
            await this.validateEventForPublish(event);

            event.status = 'published';
            event.publishedAt = new Date();
            event.updatedBy = userId;
            await event.save();

            // Update search index
            await searchService.updateEvent(event);

            // Clear caches
            await this.clearEventCaches(eventId);

            // Send notifications to interested users
            await this.notifyEventPublished(event);

            logger.info(`Event published: ${event.title} by ${user.email}`);

            return await this.getEventById(eventId);
        } catch (error) {
            logger.error('Publish event error:', error);
            throw error;
        }
    }

    // Get upcoming events
    async getUpcomingEvents(limit = 10) {
        try {
            const cacheKey = `upcoming_events:${limit}`;
            let events = await redisClient.get(cacheKey);

            if (!events) {
                events = await Event.findUpcoming(limit);
                await redisClient.set(cacheKey, events, 300); // 5 minutes cache
            }

            return events;
        } catch (error) {
            logger.error('Get upcoming events error:', error);
            throw error;
        }
    }

    // Get featured events
    async getFeaturedEvents(limit = 5) {
        try {
            const cacheKey = `featured_events:${limit}`;
            let events = await redisClient.get(cacheKey);

            if (!events) {
                events = await Event.findFeatured(limit);
                await redisClient.set(cacheKey, events, 600); // 10 minutes cache
            }

            return events;
        } catch (error) {
            logger.error('Get featured events error:', error);
            throw error;
        }
    }

    // Search events
    async searchEvents(query, filters = {}, pagination = {}) {
        try {
            if (!query || query.trim() === '') {
                return this.getEvents(filters, pagination);
            }

            // Use Elasticsearch for better search
            const searchResults = await searchService.searchEvents(query, filters, pagination);

            if (searchResults && searchResults.events) {
                return searchResults;
            }

            // Fallback to MongoDB text search
            return Event.searchEvents(query, filters);
        } catch (error) {
            logger.error('Search events error:', error);
            throw error;
        }
    }

    // Get event statistics
    async getEventStatistics(eventId) {
        try {
            const cacheKey = `event_stats:${eventId}`;
            let stats = await redisClient.get(cacheKey);

            if (!stats) {
                const [event, registrationStats] = await Promise.all([
                    Event.findById(eventId),
                    Registration.getEventStatistics(eventId)
                ]);

                if (!event) {
                    throw new NotFoundError('Event not found');
                }

                stats = {
                    ...event.stats,
                    registrations: registrationStats,
                    availableSpots: event.availableSpots,
                    isFullyBooked: event.isFullyBooked
                };

                // Cache for 5 minutes
                await redisClient.set(cacheKey, stats, 300);
            }

            return stats;
        } catch (error) {
            logger.error('Get event statistics error:', error);
            throw error;
        }
    }

    // Duplicate event
    async duplicateEvent(eventId, userId, newEventData = {}) {
        try {
            const originalEvent = await Event.findById(eventId);
            if (!originalEvent) {
                throw new NotFoundError('Event not found');
            }

            const user = await User.findById(userId);
            const canDuplicate = user.role === 'admin' ||
                originalEvent.organizer.toString() === userId ||
                originalEvent.coOrganizers.some(coOrg => coOrg.toString() === userId);

            if (!canDuplicate) {
                throw new PermissionError('Insufficient permissions to duplicate this event');
            }

            // Create new event data
            const eventData = {
                ...originalEvent.toObject(),
                _id: undefined,
                title: newEventData.title || `${originalEvent.title} (Copy)`,
                eventCode: undefined, // Will be auto-generated
                slug: undefined, // Will be auto-generated
                status: 'draft',
                stats: {
                    views: 0,
                    registrations: 0,
                    cancellations: 0,
                    attendees: 0,
                    completions: 0,
                    averageRating: 0,
                    totalRatings: 0
                },
                publishedAt: undefined,
                qrCode: undefined,
                createdBy: userId,
                updatedBy: userId,
                ...newEventData
            };

            const newEvent = new Event(eventData);
            await newEvent.save();

            logger.info(`Event duplicated: ${newEvent.title} from ${originalEvent.title}`);

            return await this.getEventById(newEvent._id);
        } catch (error) {
            logger.error('Duplicate event error:', error);
            throw error;
        }
    }

    // Archive event
    async archiveEvent(eventId, userId) {
        try {
            const event = await Event.findById(eventId);
            if (!event) {
                throw new NotFoundError('Event not found');
            }

            const user = await User.findById(userId);
            const canArchive = user.role === 'admin' ||
                event.organizer.toString() === userId;

            if (!canArchive) {
                throw new PermissionError('Insufficient permissions to archive this event');
            }

            event.status = 'completed';
            event.archivedAt = new Date();
            event.updatedBy = userId;
            await event.save();

            // Clear caches
            await this.clearEventCaches(eventId);

            logger.info(`Event archived: ${event.title} by ${user.email}`);

            return await this.getEventById(eventId);
        } catch (error) {
            logger.error('Archive event error:', error);
            throw error;
        }
    }

    // Helper methods
    async validateEventForPublish(event) {
        const errors = [];

        if (!event.title) errors.push('Title is required');
        if (!event.description.short) errors.push('Short description is required');
        if (!event.description.full) errors.push('Full description is required');
        if (!event.images.banner) errors.push('Banner image is required');
        if (!event.schedule.startDate) errors.push('Start date is required');
        if (!event.schedule.endDate) errors.push('End date is required');
        if (!event.schedule.registrationStart) errors.push('Registration start date is required');
        if (!event.schedule.registrationEnd) errors.push('Registration end date is required');
        if (!event.location.type) errors.push('Location type is required');
        if (!event.registration.maxParticipants) errors.push('Maximum participants is required');

        if (event.schedule.startDate <= new Date()) {
            errors.push('Event start date must be in the future');
        }

        if (event.schedule.endDate <= event.schedule.startDate) {
            errors.push('Event end date must be after start date');
        }

        if (event.schedule.registrationEnd >= event.schedule.startDate) {
            errors.push('Registration end date must be before event start date');
        }

        if (errors.length > 0) {
            throw new ValidationError(`Event validation failed: ${errors.join(', ')}`);
        }
    }

    async notifyEventPublished(event) {
        try {
            // This would integrate with notification service
            // For now, just log
            logger.info(`Notification: Event published - ${event.title}`);
        } catch (error) {
            logger.error('Notify event published error:', error);
        }
    }

    async clearEventCaches(eventId = null) {
        try {
            const keys = [
                'upcoming_events:*',
                'featured_events:*',
                'event_stats:*'
            ];

            if (eventId) {
                keys.push(`event:${eventId}`);
                keys.push(`event_stats:${eventId}`);
            }

            // Clear cache patterns
            for (const pattern of keys) {
                if (pattern.includes('*')) {
                    // Redis SCAN for pattern matching
                    // Implementation depends on Redis setup
                } else {
                    await redisClient.del(pattern);
                }
            }
        } catch (error) {
            logger.error('Clear event caches error:', error);
        }
    }
}

module.exports = new EventService();