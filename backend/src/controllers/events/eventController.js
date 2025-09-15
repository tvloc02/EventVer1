const eventService = require('../../services/events/eventService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class EventController {
    // Create new event
    async createEvent(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const event = await eventService.createEvent(req.body, req.user.userId);

            res.status(201).json({
                success: true,
                message: 'Event created successfully',
                data: event
            });

        } catch (error) {
            logger.error('Create event controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to create event'
            });
        }
    }

    // Get all events with filters
    async getEvents(req, res) {
        try {
            const filters = {
                status: req.query.status,
                category: req.query.category,
                eventType: req.query.eventType,
                location: req.query.location,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                featured: req.query.featured === 'true',
                organizer: req.query.organizer,
                search: req.query.search,
                visibility: req.query.visibility || 'public'
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const result = await eventService.getEvents(filters, pagination);

            res.json({
                success: true,
                data: result.events,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get events controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get events'
            });
        }
    }

    // Get event by ID
    async getEventById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;

            const event = await eventService.getEventById(id, userId);

            res.json({
                success: true,
                data: event
            });

        } catch (error) {
            logger.error('Get event by ID controller error:', error);
            const statusCode = error.name === 'NotFoundError' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to get event'
            });
        }
    }

    // Update event
    async updateEvent(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { id } = req.params;
            const event = await eventService.updateEvent(id, req.body, req.user.userId);

            res.json({
                success: true,
                message: 'Event updated successfully',
                data: event
            });

        } catch (error) {
            logger.error('Update event controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update event'
            });
        }
    }

    // Delete event
    async deleteEvent(req, res) {
        try {
            const { id } = req.params;
            const result = await eventService.deleteEvent(id, req.user.userId);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            logger.error('Delete event controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to delete event'
            });
        }
    }

    // Publish event
    async publishEvent(req, res) {
        try {
            const { id } = req.params;
            const event = await eventService.publishEvent(id, req.user.userId);

            res.json({
                success: true,
                message: 'Event published successfully',
                data: event
            });

        } catch (error) {
            logger.error('Publish event controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to publish event'
            });
        }
    }

    // Get upcoming events
    async getUpcomingEvents(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const events = await eventService.getUpcomingEvents(limit);

            res.json({
                success: true,
                data: events
            });

        } catch (error) {
            logger.error('Get upcoming events controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get upcoming events'
            });
        }
    }

    // Get featured events
    async getFeaturedEvents(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 5;
            const events = await eventService.getFeaturedEvents(limit);

            res.json({
                success: true,
                data: events
            });

        } catch (error) {
            logger.error('Get featured events controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get featured events'
            });
        }
    }

    // Search events
    async searchEvents(req, res) {
        try {
            const { q: query } = req.query;

            if (!query || query.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }

            const filters = {
                category: req.query.category,
                eventType: req.query.eventType,
                location: req.query.location,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const result = await eventService.searchEvents(query, filters, pagination);

            res.json({
                success: true,
                data: result.events || result,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Search events controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Search failed'
            });
        }
    }

    // Get event statistics
    async getEventStats(req, res) {
        try {
            const { id } = req.params;
            const stats = await eventService.getEventStatistics(id);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get event stats controller error:', error);
            const statusCode = error.name === 'NotFoundError' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to get event statistics'
            });
        }
    }

    // Duplicate event
    async duplicateEvent(req, res) {
        try {
            const { id } = req.params;
            const newEventData = req.body;

            const event = await eventService.duplicateEvent(id, req.user.userId, newEventData);

            res.status(201).json({
                success: true,
                message: 'Event duplicated successfully',
                data: event
            });

        } catch (error) {
            logger.error('Duplicate event controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to duplicate event'
            });
        }
    }

    // Archive event
    async archiveEvent(req, res) {
        try {
            const { id } = req.params;
            const event = await eventService.archiveEvent(id, req.user.userId);

            res.json({
                success: true,
                message: 'Event archived successfully',
                data: event
            });

        } catch (error) {
            logger.error('Archive event controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to archive event'
            });
        }
    }

    // Get my events (created by current user)
    async getMyEvents(req, res) {
        try {
            const filters = {
                organizer: req.user.userId,
                status: req.query.status,
                visibility: req.query.visibility
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const result = await eventService.getEvents(filters, pagination);

            res.json({
                success: true,
                data: result.events,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get my events controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get your events'
            });
        }
    }

    // Toggle event featured status
    async toggleFeatured(req, res) {
        try {
            const { id } = req.params;
            const { featured } = req.body;

            const event = await eventService.updateEvent(
                id,
                { featured: Boolean(featured) },
                req.user.userId
            );

            res.json({
                success: true,
                message: `Event ${featured ? 'featured' : 'unfeatured'} successfully`,
                data: event
            });

        } catch (error) {
            logger.error('Toggle featured controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update event'
            });
        }
    }

    // Get event by slug
    async getEventBySlug(req, res) {
        try {
            const { slug } = req.params;
            const userId = req.user?.userId;

            const Event = require('../../models/Event');
            const event = await Event.findBySlug(slug);

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            const fullEvent = await eventService.getEventById(event._id, userId);

            res.json({
                success: true,
                data: fullEvent
            });

        } catch (error) {
            logger.error('Get event by slug controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get event'
            });
        }
    }

    // Get events by category
    async getEventsByCategory(req, res) {
        try {
            const { categoryId } = req.params;

            const filters = {
                category: categoryId,
                status: 'published',
                visibility: 'public'
            };

            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                sortBy: req.query.sortBy || 'schedule.startDate',
                sortOrder: 'asc'
            };

            const result = await eventService.getEvents(filters, pagination);

            res.json({
                success: true,
                data: result.events,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Get events by category controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get events by category'
            });
        }
    }

    // Upload event banner
    async uploadBanner(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const bannerUrl = `/uploads/events/${req.file.filename}`;

            res.json({
                success: true,
                message: 'Banner uploaded successfully',
                data: {
                    bannerUrl,
                    filename: req.file.filename,
                    size: req.file.size
                }
            });

        } catch (error) {
            logger.error('Upload banner controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Banner upload failed'
            });
        }
    }

    // Get event calendar
    async getEventCalendar(req, res) {
        try {
            const { year, month } = req.query;

            if (!year || !month) {
                return res.status(400).json({
                    success: false,
                    message: 'Year and month are required'
                });
            }

            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            const filters = {
                status: 'published',
                visibility: 'public',
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            };

            const result = await eventService.getEvents(filters, { limit: 100 });

            // Format events for calendar
            const calendarEvents = result.events.map(event => ({
                id: event._id,
                title: event.title,
                start: event.schedule.startDate,
                end: event.schedule.endDate,
                url: `/events/${event.slug}`,
                category: event.category,
                eventType: event.eventType,
                color: event.category?.color || '#1890ff'
            }));

            res.json({
                success: true,
                data: calendarEvents
            });

        } catch (error) {
            logger.error('Get event calendar controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get event calendar'
            });
        }
    }

    // Get event recommendations
    async getEventRecommendations(req, res) {
        try {
            const userId = req.user?.userId;
            const limit = parseInt(req.query.limit) || 5;

            if (!userId) {
                // Return popular events for non-logged users
                const filters = {
                    status: 'published',
                    visibility: 'public'
                };
                const pagination = {
                    limit,
                    sortBy: 'stats.views',
                    sortOrder: 'desc'
                };

                const result = await eventService.getEvents(filters, pagination);
                return res.json({
                    success: true,
                    data: result.events
                });
            }

            // TODO: Implement recommendation algorithm based on user preferences
            // For now, return upcoming events
            const events = await eventService.getUpcomingEvents(limit);

            res.json({
                success: true,
                data: events
            });

        } catch (error) {
            logger.error('Get event recommendations controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get event recommendations'
            });
        }
    }

    // Generate event QR code
    async generateQRCode(req, res) {
        try {
            const { id } = req.params;

            const event = await eventService.getEventById(id);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            // Check permissions
            const canGenerate = req.user.role === 'admin' ||
                event.organizer._id.toString() === req.user.userId ||
                event.coOrganizers.some(coOrg => coOrg._id.toString() === req.user.userId);

            if (!canGenerate) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            const qrCodeService = require('../../services/qrCodeService');
            const qrData = {
                eventId: event._id,
                eventCode: event.eventCode,
                type: 'event_checkin'
            };

            const qrCodeUrl = await qrCodeService.generateQRCode(qrData);

            res.json({
                success: true,
                data: {
                    qrCodeUrl,
                    eventId: event._id,
                    eventCode: event.eventCode
                }
            });

        } catch (error) {
            logger.error('Generate QR code controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate QR code'
            });
        }
    }

    // Export events
    async exportEvents(req, res) {
        try {
            const { format = 'xlsx' } = req.query;
            const filters = {
                status: req.query.status,
                category: req.query.category,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                organizer: req.user.role === 'admin' ? req.query.organizer : req.user.userId
            };

            const result = await eventService.getEvents(filters, { limit: 1000 });

            const exportService = require('../../services/analytics/exportService');
            const fileBuffer = await exportService.exportEvents(result.events, format);

            const filename = `events_${Date.now()}.${format}`;

            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-Type', exportService.getContentType(format));

            res.send(fileBuffer);

        } catch (error) {
            logger.error('Export events controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Export failed'
            });
        }
    }

    // Import events
    async importEvents(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const importService = require('../../services/analytics/importService');
            const result = await importService.importEvents(req.file.buffer, req.user.userId);

            res.json({
                success: true,
                message: 'Events imported successfully',
                data: {
                    imported: result.imported,
                    failed: result.failed,
                    errors: result.errors
                }
            });

        } catch (error) {
            logger.error('Import events controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Import failed'
            });
        }
    }

    // Get event analytics
    async getEventAnalytics(req, res) {
        try {
            const { id } = req.params;
            const { timeframe = '30d' } = req.query;

            const event = await eventService.getEventById(id);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            // Check permissions
            const canView = req.user.role === 'admin' ||
                event.organizer._id.toString() === req.user.userId ||
                event.coOrganizers.some(coOrg => coOrg._id.toString() === req.user.userId);

            if (!canView) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            const analyticsService = require('../../services/analytics/analyticsService');
            const analytics = await analyticsService.getEventAnalytics(id, timeframe);

            res.json({
                success: true,
                data: analytics
            });

        } catch (error) {
            logger.error('Get event analytics controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get event analytics'
            });
        }
    }

    // Cancel event
    async cancelEvent(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            if (!reason || reason.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Cancellation reason is required'
                });
            }

            const event = await eventService.updateEvent(
                id,
                {
                    status: 'cancelled',
                    cancellationReason: reason
                },
                req.user.userId
            );

            // TODO: Send cancellation notifications to registered users

            res.json({
                success: true,
                message: 'Event cancelled successfully',
                data: event
            });

        } catch (error) {
            logger.error('Cancel event controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to cancel event'
            });
        }
    }

    // Postpone event
    async postponeEvent(req, res) {
        try {
            const { id } = req.params;
            const { newStartDate, newEndDate, reason } = req.body;

            if (!newStartDate || !newEndDate || !reason) {
                return res.status(400).json({
                    success: false,
                    message: 'New dates and reason are required'
                });
            }

            const updateData = {
                status: 'postponed',
                'schedule.startDate': new Date(newStartDate),
                'schedule.endDate': new Date(newEndDate),
                postponementReason: reason
            };

            const event = await eventService.updateEvent(id, updateData, req.user.userId);

            // TODO: Send postponement notifications to registered users

            res.json({
                success: true,
                message: 'Event postponed successfully',
                data: event
            });

        } catch (error) {
            logger.error('Postpone event controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to postpone event'
            });
        }
    }
}

module.exports = new EventController();