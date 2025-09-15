const express = require('express');
const { query, body, param } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const searchController = require('../controllers/search/SearchFilterController');
const router = express.Router();

// Global search (public)
router.get('/',
    query('q').notEmpty().withMessage('Search query is required'),
    query('type').optional().isIn(['events', 'users', 'all']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('sort').optional().isIn(['relevance', 'date', 'popularity']),
    authMiddleware.optionalAuth,
    searchController.globalSearch
);

// Advanced search (public)
router.get('/advanced',
    query('title').optional().isString(),
    query('description').optional().isString(),
    query('category').optional().isMongoId(),
    query('eventType').optional().isString(),
    query('location').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('priceMin').optional().isFloat({ min: 0 }),
    query('priceMax').optional().isFloat({ min: 0 }),
    query('capacity').optional().isInt({ min: 1 }),
    query('organizer').optional().isString(),
    query('tags').optional().isString(),
    query('featured').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('sort').optional().isIn(['relevance', 'date', 'popularity', 'price']),
    authMiddleware.optionalAuth,
    searchController.advancedSearch
);

// Search events
router.get('/events',
    query('q').optional().isString(),
    query('category').optional().isMongoId(),
    query('eventType').optional().isString(),
    query('location').optional().isString(),
    query('dateRange').optional().isString(),
    query('price').optional().isString(),
    query('featured').optional().isBoolean(),
    query('status').optional().isIn(['upcoming', 'ongoing', 'past']),
    query('registrationOpen').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('sort').optional().isIn(['relevance', 'date', 'popularity', 'price', 'title']),
    authMiddleware.optionalAuth,
    searchController.searchEvents
);

// Search users (authenticated only)
router.get('/users',
    authMiddleware.authenticate,
    query('q').notEmpty().withMessage('Search query is required'),
    query('role').optional().isIn(['student', 'organizer', 'moderator', 'admin']),
    query('faculty').optional().isString(),
    query('year').optional().isInt({ min: 1, max: 6 }),
    query('isActive').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('sort').optional().isIn(['relevance', 'name', 'joinDate']),
    authMiddleware.requireModerator,
    searchController.searchUsers
);

// Search by geolocation
router.get('/nearby',
    query('lat').isFloat().withMessage('Valid latitude is required'),
    query('lng').isFloat().withMessage('Valid longitude is required'),
    query('radius').optional().isFloat({ min: 0.1, max: 100 }),
    query('unit').optional().isIn(['km', 'miles']),
    query('type').optional().isIn(['events', 'venues']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    authMiddleware.optionalAuth,
    searchController.searchNearby
);

// Search suggestions/autocomplete
router.get('/suggestions',
    query('q').notEmpty().withMessage('Search query is required'),
    query('type').optional().isIn(['events', 'users', 'categories', 'locations']),
    query('limit').optional().isInt({ min: 1, max: 20 }),
    authMiddleware.optionalAuth,
    searchController.getSearchSuggestions
);

// Search filters
router.get('/filters',
    authMiddleware.optionalAuth,
    searchController.getSearchFilters
);

// Popular searches
router.get('/popular',
    query('timeframe').optional().isIn(['24h', '7d', '30d']),
    query('type').optional().isIn(['events', 'users', 'all']),
    query('limit').optional().isInt({ min: 1, max: 20 }),
    searchController.getPopularSearches
);

// Search history (authenticated users)
router.get('/history',
    authMiddleware.authenticate,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    searchController.getSearchHistory
);

router.delete('/history',
    authMiddleware.authenticate,
    searchController.clearSearchHistory
);

router.delete('/history/:searchId',
    authMiddleware.authenticate,
    param('searchId').isMongoId().withMessage('Valid search ID is required'),
    searchController.deleteSearchHistory
);

// Saved searches
router.get('/saved',
    authMiddleware.authenticate,
    searchController.getSavedSearches
);

router.post('/saved',
    authMiddleware.authenticate,
    body('name').notEmpty().withMessage('Search name is required'),
    body('query').isObject().notEmpty().withMessage('Search query is required'),
    body('filters').optional().isObject(),
    body('isPublic').optional().isBoolean(),
    searchController.saveSearch
);

router.put('/saved/:searchId',
    authMiddleware.authenticate,
    param('searchId').isMongoId().withMessage('Valid search ID is required'),
    body('name').optional().notEmpty(),
    body('query').optional().isObject(),
    body('filters').optional().isObject(),
    searchController.updateSavedSearch
);

router.delete('/saved/:searchId',
    authMiddleware.authenticate,
    param('searchId').isMongoId().withMessage('Valid search ID is required'),
    searchController.deleteSavedSearch
);

router.post('/saved/:searchId/execute',
    authMiddleware.authenticate,
    param('searchId').isMongoId().withMessage('Valid search ID is required'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    searchController.executeSavedSearch
);

// Search analytics (admin/moderator only)
router.get('/analytics/overview',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    searchController.getSearchAnalytics
);

router.get('/analytics/popular-terms',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    searchController.getPopularSearchTerms
);

router.get('/analytics/no-results',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    searchController.getNoResultsQueries
);

router.get('/analytics/user-behavior',
    authMiddleware.requireModerator,
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    searchController.getSearchBehaviorAnalytics
);

// Search index management (admin only)
router.get('/index/status',
    authMiddleware.requireAdmin,
    searchController.getIndexStatus
);

router.post('/index/rebuild',
    authMiddleware.requireAdmin,
    body('index').optional().isIn(['events', 'users', 'all']),
    body('force').optional().isBoolean(),
    searchController.rebuildSearchIndex
);

router.post('/index/optimize',
    authMiddleware.requireAdmin,
    searchController.optimizeSearchIndex
);

router.get('/index/health',
    authMiddleware.requireAdmin,
    searchController.getIndexHealth
);

// Search configuration (admin only)
router.get('/config',
    authMiddleware.requireAdmin,
    searchController.getSearchConfig
);

router.put('/config',
    authMiddleware.requireAdmin,
    body('synonyms').optional().isArray(),
    body('stopWords').optional().isArray(),
    body('boostFields').optional().isObject(),
    body('fuzzyMatchThreshold').optional().isFloat({ min: 0, max: 1 }),
    body('maxResults').optional().isInt({ min: 1, max: 1000 }),
    searchController.updateSearchConfig
);

// Search by category
router.get('/categories/:categoryId',
    param('categoryId').isMongoId().withMessage('Valid category ID is required'),
    query('q').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('sort').optional().isIn(['relevance', 'date', 'popularity']),
    authMiddleware.optionalAuth,
    searchController.searchByCategory
);

// Search by tags
router.get('/tags',
    query('tag').notEmpty().withMessage('Tag is required'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('sort').optional().isIn(['relevance', 'date', 'popularity']),
    authMiddleware.optionalAuth,
    searchController.searchByTag
);

// Get all available tags
router.get('/tags/list',
    query('category').optional().isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    searchController.getAvailableTags
);

// Search similar events
router.get('/events/:eventId/similar',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    query('limit').optional().isInt({ min: 1, max: 20 }),
    authMiddleware.optionalAuth,
    searchController.getSimilarEvents
);

// Search recommendations
router.get('/recommendations',
    authMiddleware.authenticate,
    query('type').optional().isIn(['events', 'users', 'categories']),
    query('limit').optional().isInt({ min: 1, max: 20 }),
    searchController.getSearchRecommendations
);

// Trending searches
router.get('/trending',
    query('timeframe').optional().isIn(['24h', '7d', '30d']),
    query('type').optional().isIn(['events', 'users', 'all']),
    query('limit').optional().isInt({ min: 1, max: 20 }),
    searchController.getTrendingSearches
);

// Search within user's content
router.get('/my/events',
    authMiddleware.authenticate,
    query('q').notEmpty().withMessage('Search query is required'),
    query('status').optional().isIn(['upcoming', 'past', 'cancelled']),
    query('role').optional().isIn(['organizer', 'participant']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    searchController.searchMyEvents
);

// Quick search (minimal results for autocomplete)
router.get('/quick',
    query('q').notEmpty().withMessage('Search query is required'),
    query('type').optional().isIn(['events', 'users', 'categories']),
    query('limit').optional().isInt({ min: 1, max: 10 }),
    authMiddleware.optionalAuth,
    searchController.quickSearch
);

// Search performance metrics (admin only)
router.get('/performance',
    authMiddleware.requireAdmin,
    query('timeframe').optional().isIn(['24h', '7d', '30d']),
    searchController.getSearchPerformance
);

// Search A/B testing (admin only)
router.get('/ab-tests',
    authMiddleware.requireAdmin,
    searchController.getSearchABTests
);

router.post('/ab-tests',
    authMiddleware.requireAdmin,
    body('name').notEmpty().withMessage('Test name is required'),
    body('description').optional().isString(),
    body('variants').isArray().isLength({ min: 2 }).withMessage('At least 2 variants required'),
    body('trafficSplit').isArray().withMessage('Traffic split array is required'),
    body('duration').isInt({ min: 1 }).withMessage('Valid duration is required'),
    searchController.createSearchABTest
);

router.get('/ab-tests/:testId/results',
    authMiddleware.requireAdmin,
    param('testId').isMongoId().withMessage('Valid test ID is required'),
    searchController.getSearchABTestResults
);

// Search suggestions management (moderator+)
router.get('/suggestions/manage',
    authMiddleware.requireModerator,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('approved').optional().isBoolean(),
    searchController.getSearchSuggestionsManagement
);

router.post('/suggestions/submit',
    authMiddleware.authenticate,
    body('query').notEmpty().withMessage('Search query is required'),
    body('suggestion').notEmpty().withMessage('Suggestion is required'),
    body('category').optional().isString(),
    searchController.submitSearchSuggestion
);

router.put('/suggestions/:suggestionId/approve',
    authMiddleware.requireModerator,
    param('suggestionId').isMongoId().withMessage('Valid suggestion ID is required'),
    searchController.approveSearchSuggestion
);

router.delete('/suggestions/:suggestionId',
    authMiddleware.requireModerator,
    param('suggestionId').isMongoId().withMessage('Valid suggestion ID is required'),
    searchController.deleteSearchSuggestion
);

// Search alerts/notifications
router.get('/alerts',
    authMiddleware.authenticate,
    searchController.getSearchAlerts
);

router.post('/alerts',
    authMiddleware.authenticate,
    body('query').notEmpty().withMessage('Search query is required'),
    body('name').notEmpty().withMessage('Alert name is required'),
    body('frequency').isIn(['immediate', 'daily', 'weekly']).withMessage('Valid frequency is required'),
    body('filters').optional().isObject(),
    body('isActive').optional().isBoolean(),
    searchController.createSearchAlert
);

router.put('/alerts/:alertId',
    authMiddleware.authenticate,
    param('alertId').isMongoId().withMessage('Valid alert ID is required'),
    body('name').optional().notEmpty(),
    body('query').optional().notEmpty(),
    body('frequency').optional().isIn(['immediate', 'daily', 'weekly']),
    body('isActive').optional().isBoolean(),
    searchController.updateSearchAlert
);

router.delete('/alerts/:alertId',
    authMiddleware.authenticate,
    param('alertId').isMongoId().withMessage('Valid alert ID is required'),
    searchController.deleteSearchAlert
);

// Faceted search
router.get('/facets',
    query('q').optional().isString(),
    query('facets').optional().isArray(),
    query('filters').optional().isObject(),
    authMiddleware.optionalAuth,
    searchController.getFacetedSearch
);

// Export search results
router.get('/export',
    authMiddleware.authenticate,
    query('q').notEmpty().withMessage('Search query is required'),
    query('type').optional().isIn(['events', 'users']),
    query('format').isIn(['xlsx', 'csv', 'pdf']).withMessage('Valid format is required'),
    query('filters').optional().isObject(),
    query('limit').optional().isInt({ min: 1, max: 10000 }),
    searchController.exportSearchResults
);

// Search within specific event
router.get('/events/:eventId/content',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    query('q').notEmpty().withMessage('Search query is required'),
    query('type').optional().isIn(['description', 'comments', 'announcements']),
    authMiddleware.optionalAuth,
    searchController.searchEventContent
);

// Search event registrations (for organizers)
router.get('/events/:eventId/registrations',
    param('eventId').isMongoId().withMessage('Valid event ID is required'),
    authMiddleware.canManageEvent,
    query('q').notEmpty().withMessage('Search query is required'),
    query('fields').optional().isArray(),
    query('status').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    searchController.searchEventRegistrations
);

// Search admin logs (admin only)
router.get('/logs',
    authMiddleware.requireAdmin,
    query('q').optional().isString(),
    query('level').optional().isIn(['error', 'warn', 'info', 'debug']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    searchController.searchLogs
);

// Search feedback and reviews
router.get('/feedback',
    authMiddleware.authenticate,
    query('q').optional().isString(),
    query('eventId').optional().isMongoId(),
    query('rating').optional().isInt({ min: 1, max: 5 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    searchController.searchFeedback
);

// Semantic search (advanced AI-powered search)
router.post('/semantic',
    authMiddleware.optionalAuth,
    body('query').notEmpty().withMessage('Search query is required'),
    body('type').optional().isIn(['events', 'users', 'content']),
    body('context').optional().isString(),
    body('limit').optional().isInt({ min: 1, max: 20 }),
    searchController.semanticSearch
);

// Search spell check
router.get('/spellcheck',
    query('q').notEmpty().withMessage('Search query is required'),
    searchController.spellCheckQuery
);

// Search synonyms
router.get('/synonyms',
    authMiddleware.requireModerator,
    query('term').optional().isString(),
    searchController.getSearchSynonyms
);

router.post('/synonyms',
    authMiddleware.requireModerator,
    body('term').notEmpty().withMessage('Term is required'),
    body('synonyms').isArray().notEmpty().withMessage('Synonyms array is required'),
    searchController.addSearchSynonym
);

router.put('/synonyms/:synonymId',
    authMiddleware.requireModerator,
    param('synonymId').isMongoId().withMessage('Valid synonym ID is required'),
    body('synonyms').isArray().notEmpty().withMessage('Synonyms array is required'),
    searchController.updateSearchSynonym
);

router.delete('/synonyms/:synonymId',
    authMiddleware.requireModerator,
    param('synonymId').isMongoId().withMessage('Valid synonym ID is required'),
    searchController.deleteSearchSynonym
);

// Search ranking configuration (admin only)
router.get('/ranking/config',
    authMiddleware.requireAdmin,
    searchController.getRankingConfig
);

router.put('/ranking/config',
    authMiddleware.requireAdmin,
    body('fieldWeights').optional().isObject(),
    body('boostFactors').optional().isObject(),
    body('decayFunctions').optional().isObject(),
    searchController.updateRankingConfig
);

// Personalized search preferences
router.get('/preferences',
    authMiddleware.authenticate,
    searchController.getSearchPreferences
);

router.put('/preferences',
    authMiddleware.authenticate,
    body('defaultSort').optional().isIn(['relevance', 'date', 'popularity']),
    body('defaultLimit').optional().isInt({ min: 1, max: 100 }),
    body('includePersonalizedResults').optional().isBoolean(),
    body('saveSearchHistory').optional().isBoolean(),
    body('preferredCategories').optional().isArray(),
    searchController.updateSearchPreferences
);

// Search feedback
router.post('/feedback',
    authMiddleware.authenticate,
    body('query').notEmpty().withMessage('Search query is required'),
    body('resultId').optional().isMongoId(),
    body('relevant').isBoolean().withMessage('Relevance feedback is required'),
    body('position').optional().isInt({ min: 1 }),
    body('comments').optional().isString(),
    searchController.submitSearchFeedback
);

// Machine learning search improvements (admin only)
router.get('/ml/model-performance',
    authMiddleware.requireAdmin,
    query('model').optional().isIn(['ranking', 'recommendation', 'autocomplete']),
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    searchController.getMLModelPerformance
);

router.post('/ml/retrain',
    authMiddleware.requireAdmin,
    body('model').isIn(['ranking', 'recommendation', 'autocomplete']).withMessage('Valid model is required'),
    body('force').optional().isBoolean(),
    searchController.retrainMLModel
);

// Real-time search suggestions via WebSocket info
router.get('/realtime/info',
    searchController.getRealtimeSearchInfo
);

// Search cache management (admin only)
router.get('/cache/stats',
    authMiddleware.requireAdmin,
    searchController.getSearchCacheStats
);

router.delete('/cache/clear',
    authMiddleware.requireAdmin,
    body('pattern').optional().isString(),
    searchController.clearSearchCache
);

// Error handler for search routes
router.use((error, req, res, next) => {
    const logger = require('../utils/logger');

    logger.error('Search route error:', {
        error: error.message,
        stack: error.stack,
        path: req.originalUrl,
        method: req.method,
        user: req.user?.userId,
        ip: req.ip
    });

    res.status(error.status || 500).json({
        success: false,
        message: 'Search operation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;