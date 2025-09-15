const { Client } = require('@elastic/elasticsearch');
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');

class SearchService {
    constructor() {
        this.client = null;
        this.indices = {
            events: 'sem_events',
            users: 'sem_users',
            registrations: 'sem_registrations'
        };

        this.initializeElasticsearch();
    }

    async initializeElasticsearch() {
        try {
            if (!process.env.ELASTICSEARCH_URL) {
                logger.warn('Elasticsearch URL not configured, using fallback search');
                return;
            }

            this.client = new Client({
                node: process.env.ELASTICSEARCH_URL,
                auth: {
                    username: process.env.ELASTICSEARCH_USERNAME,
                    password: process.env.ELASTICSEARCH_PASSWORD
                },
                requestTimeout: 30000,
                pingTimeout: 3000
            });

            // Test connection
            await this.client.ping();
            logger.info('Elasticsearch connected successfully');

            // Create indices if they don't exist
            await this.createIndices();

        } catch (error) {
            logger.error('Elasticsearch initialization failed:', error);
            this.client = null;
        }
    }

    async createIndices() {
        try {
            // Events index
            const eventsIndexExists = await this.client.indices.exists({
                index: this.indices.events
            });

            if (!eventsIndexExists) {
                await this.client.indices.create({
                    index: this.indices.events,
                    mappings: {
                        properties: {
                            title: { type: 'text', analyzer: 'vietnamese' },
                            description: { type: 'text', analyzer: 'vietnamese' },
                            eventType: { type: 'keyword' },
                            category: { type: 'keyword' },
                            tags: { type: 'keyword' },
                            organizer: {
                                properties: {
                                    name: { type: 'text' },
                                    email: { type: 'keyword' }
                                }
                            },
                            location: {
                                properties: {
                                    type: { type: 'keyword' },
                                    venue: { type: 'text' },
                                    city: { type: 'keyword' },
                                    coordinates: { type: 'geo_point' }
                                }
                            },
                            schedule: {
                                properties: {
                                    startDate: { type: 'date' },
                                    endDate: { type: 'date' },
                                    registrationStart: { type: 'date' },
                                    registrationEnd: { type: 'date' }
                                }
                            },
                            pricing: {
                                properties: {
                                    isFree: { type: 'boolean' },
                                    price: { type: 'float' }
                                }
                            },
                            status: { type: 'keyword' },
                            visibility: { type: 'keyword' },
                            featured: { type: 'boolean' },
                            stats: {
                                properties: {
                                    views: { type: 'integer' },
                                    registrations: { type: 'integer' },
                                    attendees: { type: 'integer' },
                                    averageRating: { type: 'float' }
                                }
                            },
                            createdAt: { type: 'date' },
                            updatedAt: { type: 'date' }
                        }
                    },
                    settings: {
                        analysis: {
                            analyzer: {
                                vietnamese: {
                                    tokenizer: 'standard',
                                    filter: ['lowercase', 'asciifolding']
                                }
                            }
                        }
                    }
                });

                logger.info('Events index created');
            }

            // Users index
            const usersIndexExists = await this.client.indices.exists({
                index: this.indices.users
            });

            if (!usersIndexExists) {
                await this.client.indices.create({
                    index: this.indices.users,
                    mappings: {
                        properties: {
                            email: { type: 'keyword' },
                            username: { type: 'keyword' },
                            fullName: { type: 'text', analyzer: 'vietnamese' },
                            role: { type: 'keyword' },
                            student: {
                                properties: {
                                    studentId: { type: 'keyword' },
                                    faculty: { type: 'keyword' },
                                    department: { type: 'keyword' },
                                    major: { type: 'keyword' },
                                    year: { type: 'keyword' }
                                }
                            },
                            status: { type: 'keyword' },
                            emailVerified: { type: 'boolean' },
                            createdAt: { type: 'date' },
                            lastActivity: { type: 'date' }
                        }
                    }
                });

                logger.info('Users index created');
            }

        } catch (error) {
            logger.error('Create indices error:', error);
        }
    }

    // Search events
    async searchEvents(query, filters = {}, pagination = {}) {
        try {
            // Try Elasticsearch first
            if (this.client) {
                return await this.elasticsearchEventSearch(query, filters, pagination);
            }

            // Fallback to MongoDB text search
            return await this.mongoEventSearch(query, filters, pagination);

        } catch (error) {
            logger.error('Search events error:', error);

            // Fallback to MongoDB on Elasticsearch failure
            if (this.client) {
                logger.warn('Elasticsearch search failed, falling back to MongoDB');
                return await this.mongoEventSearch(query, filters, pagination);
            }

            throw error;
        }
    }

    async elasticsearchEventSearch(query, filters, pagination) {
        try {
            const { page = 1, limit = 20 } = pagination;
            const from = (page - 1) * limit;

            // Build Elasticsearch query
            const must = [];
            const filter = [];

            // Text search
            if (query && query.trim()) {
                must.push({
                    multi_match: {
                        query: query,
                        fields: ['title^3', 'description^2', 'tags^2', 'organizer.name'],
                        type: 'best_fields',
                        fuzziness: 'AUTO'
                    }
                });
            }

            // Filters
            if (filters.status) {
                filter.push({ terms: { status: Array.isArray(filters.status) ? filters.status : [filters.status] } });
            }

            if (filters.eventType) {
                filter.push({ term: { eventType: filters.eventType } });
            }

            if (filters.category) {
                filter.push({ term: { category: filters.category } });
            }

            if (filters.location) {
                filter.push({ term: { 'location.type': filters.location } });
            }

            if (filters.isFree !== undefined) {
                filter.push({ term: { 'pricing.isFree': filters.isFree } });
            }

            if (filters.featured !== undefined) {
                filter.push({ term: { featured: filters.featured } });
            }

            if (filters.startDate && filters.endDate) {
                filter.push({
                    range: {
                        'schedule.startDate': {
                            gte: filters.startDate,
                            lte: filters.endDate
                        }
                    }
                });
            }

            // Build final query
            const searchQuery = {
                index: this.indices.events,
                from,
                size: limit,
                query: {
                    bool: {
                        must: must.length > 0 ? must : [{ match_all: {} }],
                        filter
                    }
                },
                sort: this.buildSort(pagination.sortBy, pagination.sortOrder),
                highlight: {
                    fields: {
                        title: {},
                        description: {}
                    }
                }
            };

            const result = await this.client.search(searchQuery);

            // Map results
            const events = result.hits.hits.map(hit => ({
                ...hit._source,
                _id: hit._id,
                _score: hit._score,
                highlights: hit.highlight
            }));

            return {
                events,
                pagination: {
                    page,
                    limit,
                    total: result.hits.total.value,
                    pages: Math.ceil(result.hits.total.value / limit),
                    hasNext: page < Math.ceil(result.hits.total.value / limit),
                    hasPrev: page > 1
                },
                aggregations: result.aggregations
            };

        } catch (error) {
            logger.error('Elasticsearch event search error:', error);
            throw error;
        }
    }

    async mongoEventSearch(query, filters, pagination) {
        try {
            const { page = 1, limit = 20, sortBy = 'relevance', sortOrder = 'desc' } = pagination;

            // Build MongoDB query
            const matchQuery = { visibility: 'public' };

            // Text search
            if (query && query.trim()) {
                matchQuery.$text = { $search: query };
            }

            // Apply filters
            if (filters.status) {
                matchQuery.status = Array.isArray(filters.status)
                    ? { $in: filters.status }
                    : filters.status;
            }

            if (filters.eventType) {
                matchQuery.eventType = filters.eventType;
            }

            if (filters.category) {
                matchQuery.category = filters.category;
            }

            if (filters.location) {
                matchQuery['location.type'] = filters.location;
            }

            if (filters.isFree !== undefined) {
                matchQuery['pricing.isFree'] = filters.isFree;
            }

            if (filters.featured !== undefined) {
                matchQuery.featured = filters.featured;
            }

            if (filters.startDate && filters.endDate) {
                matchQuery['schedule.startDate'] = {
                    $gte: new Date(filters.startDate),
                    $lte: new Date(filters.endDate)
                };
            }

            // Build sort
            let sort = {};
            if (query && query.trim() && sortBy === 'relevance') {
                sort = { score: { $meta: 'textScore' } };
            } else {
                sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
            }

            const skip = (page - 1) * limit;

            const [events, total] = await Promise.all([
                Event.find(matchQuery)
                    .populate('organizer', 'profile.fullName profile.avatar')
                    .populate('category', 'name color')
                    .sort(sort)
                    .skip(skip)
                    .limit(limit),
                Event.countDocuments(matchQuery)
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
            logger.error('MongoDB event search error:', error);
            throw error;
        }
    }

    // Search users
    async searchUsers(query, filters = {}, pagination = {}) {
        try {
            if (this.client) {
                return await this.elasticsearchUserSearch(query, filters, pagination);
            }

            return await this.mongoUserSearch(query, filters, pagination);

        } catch (error) {
            logger.error('Search users error:', error);
            throw error;
        }
    }

    async mongoUserSearch(query, filters, pagination) {
        try {
            const { page = 1, limit = 20 } = pagination;

            const matchQuery = {};

            // Text search
            if (query && query.trim()) {
                matchQuery.$or = [
                    { 'profile.fullName': { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } },
                    { username: { $regex: query, $options: 'i' } },
                    { 'student.studentId': { $regex: query, $options: 'i' } }
                ];
            }

            // Apply filters
            if (filters.role) {
                matchQuery.role = filters.role;
            }

            if (filters.faculty) {
                matchQuery['student.faculty'] = filters.faculty;
            }

            if (filters.department) {
                matchQuery['student.department'] = filters.department;
            }

            if (filters.status) {
                matchQuery.status = filters.status;
            }

            if (filters.verified !== undefined) {
                matchQuery.emailVerified = filters.verified;
            }

            const skip = (page - 1) * limit;

            const [users, total] = await Promise.all([
                User.find(matchQuery)
                    .select('-password -oauth -emailVerificationToken -passwordResetToken')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                User.countDocuments(matchQuery)
            ]);

            return {
                users,
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
            logger.error('MongoDB user search error:', error);
            throw error;
        }
    }

    // Advanced search with multiple criteria
    async advancedSearch(searchCriteria) {
        try {
            const {
                query,
                type = 'events', // events, users, all
                filters = {},
                pagination = {},
                aggregations = false
            } = searchCriteria;

            let results = {};

            if (type === 'events' || type === 'all') {
                results.events = await this.searchEvents(query, filters, pagination);
            }

            if (type === 'users' || type === 'all') {
                results.users = await this.searchUsers(query, filters, pagination);
            }

            if (aggregations && this.client) {
                results.aggregations = await this.getSearchAggregations(query, filters);
            }

            // Cache results
            const cacheKey = cacheService.hashQuery(query, { type, filters });
            await cacheService.set(`search:${cacheKey}`, results, 300); // 5 minutes

            return results;

        } catch (error) {
            logger.error('Advanced search error:', error);
            throw error;
        }
    }

    // Get search suggestions
    async getSearchSuggestions(query, type = 'events') {
        try {
            if (!query || query.length < 2) {
                return [];
            }

            const cacheKey = `suggestions:${type}:${query}`;
            let suggestions = await cacheService.get(cacheKey);

            if (suggestions) {
                return suggestions;
            }

            if (this.client && type === 'events') {
                // Elasticsearch suggestions
                const result = await this.client.search({
                    index: this.indices.events,
                    size: 10,
                    query: {
                        bool: {
                            should: [
                                {
                                    match_phrase_prefix: {
                                        title: {
                                            query: query,
                                            slop: 2
                                        }
                                    }
                                },
                                {
                                    match_phrase_prefix: {
                                        description: {
                                            query: query,
                                            slop: 2
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    _source: ['title', 'eventType', 'category']
                });

                suggestions = result.hits.hits.map(hit => ({
                    text: hit._source.title,
                    type: 'event',
                    category: hit._source.category,
                    eventType: hit._source.eventType
                }));

            } else {
                // MongoDB fallback
                if (type === 'events') {
                    const events = await Event.find({
                        $or: [
                            { title: { $regex: query, $options: 'i' } },
                            { 'description.short': { $regex: query, $options: 'i' } }
                        ],
                        status: 'published',
                        visibility: 'public'
                    })
                        .select('title eventType category')
                        .limit(10);

                    suggestions = events.map(event => ({
                        text: event.title,
                        type: 'event',
                        category: event.category,
                        eventType: event.eventType
                    }));
                }
            }

            // Cache suggestions for 15 minutes
            await cacheService.set(cacheKey, suggestions, 900);

            return suggestions;

        } catch (error) {
            logger.error('Get search suggestions error:', error);
            return [];
        }
    }

    // Get search aggregations
    async getSearchAggregations(query, filters = {}) {
        try {
            if (!this.client) {
                return {};
            }

            const result = await this.client.search({
                index: this.indices.events,
                size: 0,
                query: {
                    bool: {
                        must: query ? [{
                            multi_match: {
                                query: query,
                                fields: ['title^3', 'description^2', 'tags^2']
                            }
                        }] : [{ match_all: {} }]
                    }
                },
                aggs: {
                    eventTypes: {
                        terms: { field: 'eventType', size: 10 }
                    },
                    categories: {
                        terms: { field: 'category', size: 20 }
                    },
                    locations: {
                        terms: { field: 'location.type', size: 5 }
                    },
                    priceRanges: {
                        range: {
                            field: 'pricing.price',
                            ranges: [
                                { key: 'free', to: 0.01 },
                                { key: 'low', from: 0.01, to: 100000 },
                                { key: 'medium', from: 100000, to: 500000 },
                                { key: 'high', from: 500000 }
                            ]
                        }
                    },
                    dateRanges: {
                        date_range: {
                            field: 'schedule.startDate',
                            ranges: [
                                { key: 'next_week', from: 'now', to: 'now+1w' },
                                { key: 'next_month', from: 'now', to: 'now+1M' },
                                { key: 'next_quarter', from: 'now', to: 'now+3M' }
                            ]
                        }
                    }
                }
            });

            return result.aggregations;

        } catch (error) {
            logger.error('Get search aggregations error:', error);
            return {};
        }
    }

    // Index operations
    async indexEvent(event) {
        try {
            if (!this.client) {
                return false;
            }

            const doc = {
                title: event.title,
                description: event.description.short,
                eventType: event.eventType,
                category: event.category,
                tags: event.tags || [],
                organizer: {
                    name: event.organizer.profile?.fullName,
                    email: event.organizer.email
                },
                location: {
                    type: event.location.type,
                    venue: event.location.venue?.name,
                    city: event.location.venue?.city,
                    coordinates: event.location.venue?.coordinates
                },
                schedule: {
                    startDate: event.schedule.startDate,
                    endDate: event.schedule.endDate,
                    registrationStart: event.schedule.registrationStart,
                    registrationEnd: event.schedule.registrationEnd
                },
                pricing: {
                    isFree: event.pricing.isFree,
                    price: event.pricing.price
                },
                status: event.status,
                visibility: event.visibility,
                featured: event.featured,
                stats: event.stats,
                createdAt: event.createdAt,
                updatedAt: event.updatedAt
            };

            await this.client.index({
                index: this.indices.events,
                id: event._id.toString(),
                document: doc
            });

            logger.debug(`Event indexed: ${event.title}`);
            return true;

        } catch (error) {
            logger.error('Index event error:', error);
            return false;
        }
    }

    async updateEvent(event) {
        return await this.indexEvent(event);
    }

    async removeEvent(eventId) {
        try {
            if (!this.client) {
                return false;
            }

            await this.client.delete({
                index: this.indices.events,
                id: eventId
            });

            logger.debug(`Event removed from index: ${eventId}`);
            return true;

        } catch (error) {
            if (error.meta?.statusCode === 404) {
                // Document doesn't exist, which is fine
                return true;
            }

            logger.error('Remove event error:', error);
            return false;
        }
    }

    async indexUser(user) {
        try {
            if (!this.client) {
                return false;
            }

            const doc = {
                email: user.email,
                username: user.username,
                fullName: user.profile.fullName,
                role: user.role,
                student: {
                    studentId: user.student?.studentId,
                    faculty: user.student?.faculty,
                    department: user.student?.department,
                    major: user.student?.major,
                    year: user.student?.year
                },
                status: user.status,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                lastActivity: user.lastActivity
            };

            await this.client.index({
                index: this.indices.users,
                id: user._id.toString(),
                document: doc
            });

            return true;

        } catch (error) {
            logger.error('Index user error:', error);
            return false;
        }
    }

    // Bulk operations
    async bulkIndexEvents(events) {
        try {
            if (!this.client || events.length === 0) {
                return false;
            }

            const operations = [];

            events.forEach(event => {
                operations.push({
                    index: {
                        _index: this.indices.events,
                        _id: event._id.toString()
                    }
                });

                operations.push({
                    title: event.title,
                    description: event.description.short,
                    eventType: event.eventType,
                    category: event.category,
                    // ... other fields
                });
            });

            const result = await this.client.bulk({
                operations
            });

            if (result.errors) {
                logger.warn('Bulk index had errors:', result.items.filter(item => item.index?.error));
            }

            logger.info(`Bulk indexed ${events.length} events`);
            return true;

        } catch (error) {
            logger.error('Bulk index events error:', error);
            return false;
        }
    }

    // Search analytics
    async trackSearchQuery(query, filters, userId = null) {
        try {
            const searchLog = {
                query,
                filters,
                userId,
                timestamp: new Date(),
                ip: filters.ip,
                userAgent: filters.userAgent
            };

            // Store in cache for analytics
            await cacheService.lPush('search_logs', searchLog);

            // Keep only recent logs (limit to 1000)
            const logCount = await cacheService.lLen('search_logs');
            if (logCount > 1000) {
                await cacheService.lPop('search_logs');
            }

        } catch (error) {
            logger.error('Track search query error:', error);
        }
    }

    async getSearchAnalytics(timeRange = '7d') {
        try {
            const logs = await cacheService.lRange('search_logs', 0, -1);

            if (!logs || logs.length === 0) {
                return {
                    totalSearches: 0,
                    topQueries: [],
                    topFilters: [],
                    searchTrends: []
                };
            }

            // Filter by time range
            const cutoffDate = new Date();
            const ranges = {
                '1d': 1,
                '7d': 7,
                '30d': 30
            };
            cutoffDate.setDate(cutoffDate.getDate() - (ranges[timeRange] || 7));

            const filteredLogs = logs.filter(log =>
                new Date(log.timestamp) >= cutoffDate
            );

            // Analyze queries
            const queryCount = {};
            const filterCount = {};

            filteredLogs.forEach(log => {
                if (log.query && log.query.trim()) {
                    queryCount[log.query] = (queryCount[log.query] || 0) + 1;
                }

                Object.keys(log.filters || {}).forEach(filter => {
                    filterCount[filter] = (filterCount[filter] || 0) + 1;
                });
            });

            // Sort and get top items
            const topQueries = Object.entries(queryCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([query, count]) => ({ query, count }));

            const topFilters = Object.entries(filterCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([filter, count]) => ({ filter, count }));

            return {
                totalSearches: filteredLogs.length,
                topQueries,
                topFilters,
                searchTrends: this.generateSearchTrends(filteredLogs)
            };

        } catch (error) {
            logger.error('Get search analytics error:', error);
            return {
                totalSearches: 0,
                topQueries: [],
                topFilters: [],
                searchTrends: []
            };
        }
    }

    generateSearchTrends(logs) {
        try {
            const trends = {};

            logs.forEach(log => {
                const date = new Date(log.timestamp).toISOString().split('T')[0];
                trends[date] = (trends[date] || 0) + 1;
            });

            return Object.entries(trends)
                .sort(([a], [b]) => new Date(a) - new Date(b))
                .map(([date, count]) => ({ date, count }));

        } catch (error) {
            return [];
        }
    }

    // Popular searches
    async getPopularSearches(limit = 10) {
        try {
            const cacheKey = `popular_searches:${limit}`;
            let popularSearches = await cacheService.get(cacheKey);

            if (popularSearches) {
                return popularSearches;
            }

            // Get from search logs
            const logs = await cacheService.lRange('search_logs', 0, 1000);
            const queryCount = {};

            logs.forEach(log => {
                if (log.query && log.query.trim()) {
                    queryCount[log.query] = (queryCount[log.query] || 0) + 1;
                }
            });

            popularSearches = Object.entries(queryCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, limit)
                .map(([query, count]) => ({ query, count }));

            // Cache for 1 hour
            await cacheService.set(cacheKey, popularSearches, 3600);

            return popularSearches;

        } catch (error) {
            logger.error('Get popular searches error:', error);
            return [];
        }
    }

    // Search filters
    async getSearchFilters() {
        try {
            const cacheKey = 'search_filters';
            let filters = await cacheService.get(cacheKey);

            if (filters) {
                return filters;
            }

            // Get filter options from database
            const [eventTypes, categories, locations] = await Promise.all([
                Event.distinct('eventType'),
                Event.distinct('category').then(cats =>
                    Event.populate(cats, { path: '_id', model: 'Category', select: 'name color' })
                ),
                Event.distinct('location.type')
            ]);

            filters = {
                eventTypes: eventTypes.map(type => ({
                    value: type,
                    label: this.getEventTypeLabel(type)
                })),
                categories: categories.map(cat => ({
                    value: cat._id,
                    label: cat.name,
                    color: cat.color
                })),
                locations: locations.map(loc => ({
                    value: loc,
                    label: this.getLocationTypeLabel(loc)
                })),
                priceRanges: [
                    { value: 'free', label: 'Miễn phí', min: 0, max: 0 },
                    { value: 'low', label: 'Dưới 100k', min: 0, max: 100000 },
                    { value: 'medium', label: '100k - 500k', min: 100000, max: 500000 },
                    { value: 'high', label: 'Trên 500k', min: 500000, max: null }
                ],
                timeRanges: [
                    { value: 'today', label: 'Hôm nay' },
                    { value: 'tomorrow', label: 'Ngày mai' },
                    { value: 'this_week', label: 'Tuần này' },
                    { value: 'next_week', label: 'Tuần tới' },
                    { value: 'this_month', label: 'Tháng này' },
                    { value: 'next_month', label: 'Tháng tới' }
                ]
            };

            // Cache for 2 hours
            await cacheService.set(cacheKey, filters, 7200);

            return filters;

        } catch (error) {
            logger.error('Get search filters error:', error);
            return {
                eventTypes: [],
                categories: [],
                locations: [],
                priceRanges: [],
                timeRanges: []
            };
        }
    }

    // Utility methods
    buildSort(sortBy = 'relevance', sortOrder = 'desc') {
        const sortMap = {
            'relevance': [{ _score: { order: 'desc' } }],
            'date': [{ 'schedule.startDate': { order: sortOrder } }],
            'title': [{ 'title.keyword': { order: sortOrder } }],
            'created': [{ createdAt: { order: sortOrder } }],
            'popular': [{ 'stats.views': { order: 'desc' } }, { 'stats.registrations': { order: 'desc' } }],
            'rating': [{ 'stats.averageRating': { order: 'desc' } }]
        };

        return sortMap[sortBy] || sortMap['relevance'];
    }

    getEventTypeLabel(type) {
        const labels = {
            'seminar': 'Hội thảo',
            'workshop': 'Thực hành',
            'conference': 'Hội nghị',
            'competition': 'Cuộc thi',
            'cultural': 'Văn hóa',
            'sports': 'Thể thao',
            'academic': 'Học thuật',
            'social': 'Xã hội',
            'career': 'Nghề nghiệp',
            'volunteer': 'Tình nguyện'
        };

        return labels[type] || type;
    }

    getLocationTypeLabel(type) {
        const labels = {
            'physical': 'Trực tiếp',
            'online': 'Trực tuyến',
            'hybrid': 'Kết hợp'
        };

        return labels[type] || type;
    }

    // Health check
    async healthCheck() {
        try {
            if (!this.client) {
                return {
                    status: 'unavailable',
                    message: 'Elasticsearch not configured'
                };
            }

            const health = await this.client.cluster.health({
                timeout: '5s'
            });

            return {
                status: health.status,
                cluster_name: health.cluster_name,
                number_of_nodes: health.number_of_nodes,
                active_shards: health.active_shards,
                indices: Object.keys(this.indices).length
            };

        } catch (error) {
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    // Reindex all data
    async reindexAll() {
        try {
            if (!this.client) {
                throw new Error('Elasticsearch not available');
            }

            logger.info('Starting full reindex...');

            // Delete existing indices
            for (const indexName of Object.values(this.indices)) {
                try {
                    await this.client.indices.delete({ index: indexName });
                } catch (error) {
                    // Index might not exist, continue
                }
            }

            // Recreate indices
            await this.createIndices();

            // Reindex events
            const events = await Event.find({ status: { $ne: 'draft' } })
                .populate('organizer', 'profile email')
                .populate('category', 'name');

            await this.bulkIndexEvents(events);

            // Reindex users
            const users = await User.find({ status: 'active' });

            for (const user of users) {
                await this.indexUser(user);
            }

            logger.info(`Reindex completed: ${events.length} events, ${users.length} users`);

            return {
                success: true,
                eventsIndexed: events.length,
                usersIndexed: users.length
            };

        } catch (error) {
            logger.error('Reindex all error:', error);
            throw error;
        }
    }
}

module.exports = new SearchService();