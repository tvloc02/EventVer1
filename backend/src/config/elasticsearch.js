const { Client } = require('@elastic/elasticsearch');
const logger = require('../utils/logger');

class ElasticsearchClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            const config = {
                node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
                auth: {
                    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
                    password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
                },
                requestTimeout: 30000,
                pingTimeout: 3000,
                maxRetries: 3,
                ssl: {
                    rejectUnauthorized: process.env.NODE_ENV === 'production'
                }
            };

            this.client = new Client(config);

            // Test connection
            const health = await this.client.cluster.health();
            logger.info('Elasticsearch connected successfully', {
                cluster: health.body.cluster_name,
                status: health.body.status
            });

            this.isConnected = true;
            await this.setupIndices();

            // Handle connection events
            this.client.on('response', (err, result) => {
                if (err) {
                    logger.error('Elasticsearch response error:', err);
                }
            });

            return this.client;
        } catch (error) {
            logger.error('Elasticsearch connection failed:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.client) {
                await this.client.close();
                logger.info('Elasticsearch connection closed');
            }
        } catch (error) {
            logger.error('Error closing Elasticsearch connection:', error);
        }
    }

    async setupIndices() {
        const indices = [
            {
                index: 'events',
                body: {
                    mappings: {
                        properties: {
                            title: { type: 'text', analyzer: 'standard' },
                            description: {
                                properties: {
                                    short: { type: 'text' },
                                    full: { type: 'text' }
                                }
                            },
                            eventType: { type: 'keyword' },
                            category: { type: 'keyword' },
                            tags: { type: 'keyword' },
                            location: {
                                properties: {
                                    type: { type: 'keyword' },
                                    venue: { type: 'text' },
                                    address: { type: 'text' },
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
                            organizer: { type: 'keyword' },
                            status: { type: 'keyword' },
                            featured: { type: 'boolean' },
                            searchKeywords: { type: 'text' },
                            createdAt: { type: 'date' },
                            updatedAt: { type: 'date' }
                        }
                    },
                    settings: {
                        number_of_shards: 1,
                        number_of_replicas: 0,
                        analysis: {
                            analyzer: {
                                vietnamese_analyzer: {
                                    type: 'custom',
                                    tokenizer: 'standard',
                                    filter: ['lowercase', 'asciifolding']
                                }
                            }
                        }
                    }
                }
            },
            {
                index: 'users',
                body: {
                    mappings: {
                        properties: {
                            username: { type: 'keyword' },
                            email: { type: 'keyword' },
                            profile: {
                                properties: {
                                    firstName: { type: 'text' },
                                    lastName: { type: 'text' },
                                    fullName: { type: 'text' }
                                }
                            },
                            student: {
                                properties: {
                                    studentId: { type: 'keyword' },
                                    faculty: { type: 'keyword' },
                                    department: { type: 'keyword' },
                                    major: { type: 'keyword' },
                                    year: { type: 'integer' }
                                }
                            },
                            roles: { type: 'keyword' },
                            isActive: { type: 'boolean' },
                            createdAt: { type: 'date' }
                        }
                    }
                }
            }
        ];

        for (const indexConfig of indices) {
            try {
                const exists = await this.client.indices.exists({ index: indexConfig.index });
                if (!exists.body) {
                    await this.client.indices.create(indexConfig);
                    logger.info(`Created Elasticsearch index: ${indexConfig.index}`);
                }
            } catch (error) {
                logger.error(`Failed to create index ${indexConfig.index}:`, error);
            }
        }
    }

    async indexEvent(event) {
        if (!this.isConnected) return false;

        try {
            const searchKeywords = [
                event.title,
                event.description?.short,
                event.description?.full,
                event.eventType,
                event.category?.name,
                event.location?.venue,
                ...(event.tags || [])
            ].filter(Boolean).join(' ');

            const document = {
                id: event._id.toString(),
                title: event.title,
                description: event.description,
                eventType: event.eventType,
                category: event.category?._id?.toString() || event.category,
                tags: event.tags,
                location: event.location,
                schedule: event.schedule,
                organizer: event.organizer?._id?.toString() || event.organizer,
                status: event.status,
                featured: event.featured,
                searchKeywords,
                createdAt: event.createdAt,
                updatedAt: event.updatedAt
            };

            await this.client.index({
                index: 'events',
                id: event._id.toString(),
                body: document
            });

            return true;
        } catch (error) {
            logger.error('Error indexing event:', error);
            return false;
        }
    }

    async indexUser(user) {
        if (!this.isConnected) return false;

        try {
            const document = {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                profile: user.profile,
                student: user.student,
                roles: user.roles,
                isActive: user.isActive,
                createdAt: user.createdAt
            };

            await this.client.index({
                index: 'users',
                id: user._id.toString(),
                body: document
            });

            return true;
        } catch (error) {
            logger.error('Error indexing user:', error);
            return false;
        }
    }

    async searchEvents(query, filters = {}, page = 1, limit = 20) {
        if (!this.isConnected) return { events: [], total: 0 };

        try {
            const must = [];
            const filter = [];

            // Text search
            if (query && query.trim()) {
                must.push({
                    multi_match: {
                        query: query.trim(),
                        fields: ['title^3', 'description.short^2', 'description.full', 'searchKeywords'],
                        type: 'best_fields',
                        fuzziness: 'AUTO'
                    }
                });
            }

            // Filters
            if (filters.eventType) {
                filter.push({ term: { eventType: filters.eventType } });
            }

            if (filters.category) {
                filter.push({ term: { category: filters.category } });
            }

            if (filters.featured !== undefined) {
                filter.push({ term: { featured: filters.featured } });
            }

            if (filters.status) {
                filter.push({ term: { status: filters.status } });
            }

            if (filters.dateRange) {
                filter.push({
                    range: {
                        'schedule.startDate': {
                            gte: filters.dateRange.start,
                            lte: filters.dateRange.end
                        }
                    }
                });
            }

            if (filters.location && filters.location.coordinates && filters.location.distance) {
                filter.push({
                    geo_distance: {
                        distance: filters.location.distance,
                        'location.coordinates': filters.location.coordinates
                    }
                });
            }

            const searchBody = {
                query: {
                    bool: {
                        must: must.length > 0 ? must : [{ match_all: {} }],
                        filter
                    }
                },
                sort: [
                    { featured: { order: 'desc' } },
                    { 'schedule.startDate': { order: 'asc' } },
                    { _score: { order: 'desc' } }
                ],
                from: (page - 1) * limit,
                size: limit,
                highlight: {
                    fields: {
                        title: {},
                        'description.short': {},
                        'description.full': {}
                    }
                }
            };

            const response = await this.client.search({
                index: 'events',
                body: searchBody
            });

            const events = response.body.hits.hits.map(hit => ({
                ...hit._source,
                _id: hit._source.id,
                _score: hit._score,
                highlight: hit.highlight
            }));

            return {
                events,
                total: response.body.hits.total.value,
                maxScore: response.body.hits.max_score
            };
        } catch (error) {
            logger.error('Error searching events:', error);
            return { events: [], total: 0 };
        }
    }

    async searchUsers(query, filters = {}, page = 1, limit = 20) {
        if (!this.isConnected) return { users: [], total: 0 };

        try {
            const must = [];
            const filter = [];

            // Text search
            if (query && query.trim()) {
                must.push({
                    multi_match: {
                        query: query.trim(),
                        fields: ['username^2', 'profile.firstName', 'profile.lastName', 'profile.fullName^2', 'email'],
                        type: 'best_fields',
                        fuzziness: 'AUTO'
                    }
                });
            }

            // Filters
            if (filters.roles && filters.roles.length > 0) {
                filter.push({ terms: { roles: filters.roles } });
            }

            if (filters.faculty) {
                filter.push({ term: { 'student.faculty': filters.faculty } });
            }

            if (filters.department) {
                filter.push({ term: { 'student.department': filters.department } });
            }

            if (filters.year) {
                filter.push({ term: { 'student.year': filters.year } });
            }

            if (filters.isActive !== undefined) {
                filter.push({ term: { isActive: filters.isActive } });
            }

            const searchBody = {
                query: {
                    bool: {
                        must: must.length > 0 ? must : [{ match_all: {} }],
                        filter
                    }
                },
                sort: [
                    { _score: { order: 'desc' } },
                    { createdAt: { order: 'desc' } }
                ],
                from: (page - 1) * limit,
                size: limit
            };

            const response = await this.client.search({
                index: 'users',
                body: searchBody
            });

            const users = response.body.hits.hits.map(hit => ({
                ...hit._source,
                _id: hit._source.id,
                _score: hit._score
            }));

            return {
                users,
                total: response.body.hits.total.value
            };
        } catch (error) {
            logger.error('Error searching users:', error);
            return { users: [], total: 0 };
        }
    }

    async deleteEvent(eventId) {
        if (!this.isConnected) return false;

        try {
            await this.client.delete({
                index: 'events',
                id: eventId
            });
            return true;
        } catch (error) {
            logger.error('Error deleting event from index:', error);
            return false;
        }
    }

    async deleteUser(userId) {
        if (!this.isConnected) return false;

        try {
            await this.client.delete({
                index: 'users',
                id: userId
            });
            return true;
        } catch (error) {
            logger.error('Error deleting user from index:', error);
            return false;
        }
    }

    async getSearchSuggestions(query, type = 'events') {
        if (!this.isConnected || !query) return [];

        try {
            const suggestionField = type === 'events' ? 'title' : 'profile.fullName';

            const response = await this.client.search({
                index: type,
                body: {
                    suggest: {
                        suggestions: {
                            prefix: query,
                            completion: {
                                field: suggestionField
                            }
                        }
                    }
                }
            });

            return response.body.suggest.suggestions[0].options.map(option => option.text);
        } catch (error) {
            logger.error('Error getting search suggestions:', error);
            return [];
        }
    }

    async reindexAll(Model, indexName) {
        if (!this.isConnected) return false;

        try {
            // Delete existing index
            await this.client.indices.delete({ index: indexName, ignore: [404] });

            // Recreate index
            await this.setupIndices();

            // Index all documents
            const documents = await Model.find({}).lean();
            const bulk = [];

            for (const doc of documents) {
                bulk.push({ index: { _index: indexName, _id: doc._id.toString() } });

                if (indexName === 'events') {
                    bulk.push(this.prepareEventForIndex(doc));
                } else if (indexName === 'users') {
                    bulk.push(this.prepareUserForIndex(doc));
                }
            }

            if (bulk.length > 0) {
                await this.client.bulk({ body: bulk });
            }

            logger.info(`Reindexed ${documents.length} documents in ${indexName}`);
            return true;
        } catch (error) {
            logger.error(`Error reindexing ${indexName}:`, error);
            return false;
        }
    }

    prepareEventForIndex(event) {
        const searchKeywords = [
            event.title,
            event.description?.short,
            event.description?.full,
            event.eventType,
            event.category?.name,
            event.location?.venue,
            ...(event.tags || [])
        ].filter(Boolean).join(' ');

        return {
            id: event._id.toString(),
            title: event.title,
            description: event.description,
            eventType: event.eventType,
            category: event.category?._id?.toString() || event.category,
            tags: event.tags,
            location: event.location,
            schedule: event.schedule,
            organizer: event.organizer?._id?.toString() || event.organizer,
            status: event.status,
            featured: event.featured,
            searchKeywords,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        };
    }

    prepareUserForIndex(user) {
        return {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            profile: user.profile,
            student: user.student,
            roles: user.roles,
            isActive: user.isActive,
            createdAt: user.createdAt
        };
    }

    getClient() {
        return this.client;
    }

    isHealthy() {
        return this.isConnected;
    }

    async healthCheck() {
        try {
            const health = await this.client.cluster.health();
            return {
                status: 'healthy',
                cluster: health.body.cluster_name,
                clusterStatus: health.body.status,
                nodes: health.body.number_of_nodes
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

module.exports = new ElasticsearchClient();