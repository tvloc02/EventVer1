const searchService = require('../../services/search/searchService');
const filterService = require('../../services/search/filterService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class SearchFilterController {
    // Tìm kiếm tổng hợp
    async globalSearch(req, res) {
        try {
            const { q: query, type, limit = 10, page = 1 } = req.query;

            if (!query || query.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Từ khóa tìm kiếm không được để trống'
                });
            }

            const searchOptions = {
                types: type ? type.split(',') : ['events', 'users', 'certificates'],
                limit: parseInt(limit),
                page: parseInt(page),
                userId: req.user?.userId
            };

            const results = await searchService.globalSearch(query, searchOptions);

            res.json({
                success: true,
                data: results
            });

        } catch (error) {
            logger.error('Global search controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tìm kiếm thất bại'
            });
        }
    }

    // Tìm kiếm sự kiện
    async searchEvents(req, res) {
        try {
            const { q: query } = req.query;

            if (!query || query.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Từ khóa tìm kiếm không được để trống'
                });
            }

            const filters = {
                category: req.query.category,
                eventType: req.query.eventType,
                location: req.query.location,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                status: req.query.status || 'published',
                featured: req.query.featured === 'true'
            };

            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                sortBy: req.query.sortBy || 'relevance',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const results = await searchService.searchEvents(query, filters, options);

            res.json({
                success: true,
                data: results.events,
                pagination: results.pagination,
                facets: results.facets
            });

        } catch (error) {
            logger.error('Search events controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tìm kiếm sự kiện thất bại'
            });
        }
    }

    // Tìm kiếm người dùng (chỉ admin)
    async searchUsers(req, res) {
        try {
            // Only admin can search users
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền tìm kiếm người dùng'
                });
            }

            const { q: query } = req.query;

            if (!query || query.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Từ khóa tìm kiếm không được để trống'
                });
            }

            const filters = {
                role: req.query.role,
                status: req.query.status,
                faculty: req.query.faculty,
                department: req.query.department,
                emailVerified: req.query.emailVerified
            };

            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                sortBy: req.query.sortBy || 'relevance'
            };

            const results = await searchService.searchUsers(query, filters, options);

            res.json({
                success: true,
                data: results.users,
                pagination: results.pagination
            });

        } catch (error) {
            logger.error('Search users controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tìm kiếm người dùng thất bại'
            });
        }
    }

    // Tìm kiếm gợi ý
    async getSearchSuggestions(req, res) {
        try {
            const { q: query, type = 'events', limit = 5 } = req.query;

            if (!query || query.trim() === '' || query.length < 2) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const suggestions = await searchService.getSearchSuggestions(
                query,
                type,
                parseInt(limit)
            );

            res.json({
                success: true,
                data: suggestions
            });

        } catch (error) {
            logger.error('Get search suggestions controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy gợi ý tìm kiếm thất bại'
            });
        }
    }

    // Lưu lịch sử tìm kiếm
    async saveSearchHistory(req, res) {
        try {
            const { query, type, filters } = req.body;
            const userId = req.user?.userId;

            if (!userId) {
                return res.json({
                    success: true,
                    message: 'Không lưu lịch sử cho người dùng ẩn danh'
                });
            }

            await searchService.saveSearchHistory(userId, query, type, filters);

            res.json({
                success: true,
                message: 'Lưu lịch sử tìm kiếm thành công'
            });

        } catch (error) {
            logger.error('Save search history controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lưu lịch sử tìm kiếm thất bại'
            });
        }
    }

    // Lấy lịch sử tìm kiếm
    async getSearchHistory(req, res) {
        try {
            const userId = req.user.userId;
            const { limit = 10 } = req.query;

            const history = await searchService.getSearchHistory(userId, parseInt(limit));

            res.json({
                success: true,
                data: history
            });

        } catch (error) {
            logger.error('Get search history controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy lịch sử tìm kiếm thất bại'
            });
        }
    }

    // Xóa lịch sử tìm kiếm
    async clearSearchHistory(req, res) {
        try {
            const userId = req.user.userId;

            await searchService.clearSearchHistory(userId);

            res.json({
                success: true,
                message: 'Xóa lịch sử tìm kiếm thành công'
            });

        } catch (error) {
            logger.error('Clear search history controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Xóa lịch sử tìm kiếm thất bại'
            });
        }
    }

    // Lấy các bộ lọc có sẵn
    async getAvailableFilters(req, res) {
        try {
            const { type = 'events' } = req.query;

            const filters = await filterService.getAvailableFilters(type);

            res.json({
                success: true,
                data: filters
            });

        } catch (error) {
            logger.error('Get available filters controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy bộ lọc thất bại'
            });
        }
    }

    // Áp dụng bộ lọc
    async applyFilters(req, res) {
        try {
            const { type, filters, options } = req.body;

            const filterOptions = {
                page: parseInt(options?.page) || 1,
                limit: parseInt(options?.limit) || 20,
                sortBy: options?.sortBy || 'createdAt',
                sortOrder: options?.sortOrder || 'desc'
            };

            const results = await filterService.applyFilters(type, filters, filterOptions);

            res.json({
                success: true,
                data: results.data,
                pagination: results.pagination,
                appliedFilters: results.appliedFilters
            });

        } catch (error) {
            logger.error('Apply filters controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Áp dụng bộ lọc thất bại'
            });
        }
    }

    // Lưu bộ lọc tùy chỉnh
    async saveCustomFilter(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const filterData = {
                name: req.body.name,
                description: req.body.description,
                type: req.body.type,
                filters: req.body.filters,
                isPublic: req.body.isPublic === true
            };

            const savedFilter = await filterService.saveCustomFilter(
                filterData,
                req.user.userId
            );

            res.status(201).json({
                success: true,
                message: 'Lưu bộ lọc tùy chỉnh thành công',
                data: savedFilter
            });

        } catch (error) {
            logger.error('Save custom filter controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lưu bộ lọc tùy chỉnh thất bại'
            });
        }
    }

    // Lấy bộ lọc tùy chỉnh của người dùng
    async getCustomFilters(req, res) {
        try {
            const userId = req.user.userId;
            const { type } = req.query;

            const filters = await filterService.getCustomFilters(userId, type);

            res.json({
                success: true,
                data: filters
            });

        } catch (error) {
            logger.error('Get custom filters controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy bộ lọc tùy chỉnh thất bại'
            });
        }
    }

    // Xóa bộ lọc tùy chỉnh
    async deleteCustomFilter(req, res) {
        try {
            const { filterId } = req.params;

            await filterService.deleteCustomFilter(filterId, req.user.userId);

            res.json({
                success: true,
                message: 'Xóa bộ lọc tùy chỉnh thành công'
            });

        } catch (error) {
            logger.error('Delete custom filter controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Xóa bộ lọc tùy chỉnh thất bại'
            });
        }
    }

    // Tìm kiếm nâng cao
    async advancedSearch(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const searchParams = {
                query: req.body.query,
                type: req.body.type,
                filters: req.body.filters,
                dateRange: req.body.dateRange,
                location: req.body.location,
                tags: req.body.tags,
                excludeTerms: req.body.excludeTerms,
                exactPhrase: req.body.exactPhrase
            };

            const options = {
                page: parseInt(req.body.page) || 1,
                limit: parseInt(req.body.limit) || 20,
                sortBy: req.body.sortBy || 'relevance',
                sortOrder: req.body.sortOrder || 'desc',
                includeAggregations: req.body.includeAggregations === true
            };

            const results = await searchService.advancedSearch(searchParams, options);

            res.json({
                success: true,
                data: results.data,
                pagination: results.pagination,
                aggregations: results.aggregations,
                searchInfo: results.searchInfo
            });

        } catch (error) {
            logger.error('Advanced search controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tìm kiếm nâng cao thất bại'
            });
        }
    }

    // Tìm kiếm theo vị trí địa lý
    async locationSearch(req, res) {
        try {
            const { lat, lng, radius = 10, type = 'events' } = req.query;

            if (!lat || !lng) {
                return res.status(400).json({
                    success: false,
                    message: 'Tọa độ địa lý không hợp lệ'
                });
            }

            const location = {
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
                radius: parseFloat(radius)
            };

            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const results = await searchService.searchByLocation(type, location, options);

            res.json({
                success: true,
                data: results.data,
                pagination: results.pagination
            });

        } catch (error) {
            logger.error('Location search controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tìm kiếm theo vị trí thất bại'
            });
        }
    }

    // Tìm kiếm tương tự
    async findSimilar(req, res) {
        try {
            const { itemId, type, limit = 5 } = req.query;

            if (!itemId || !type) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu thông tin tìm kiếm'
                });
            }

            const similarItems = await searchService.findSimilarItems(
                type,
                itemId,
                parseInt(limit)
            );

            res.json({
                success: true,
                data: similarItems
            });

        } catch (error) {
            logger.error('Find similar controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tìm kiếm tương tự thất bại'
            });
        }
    }

    // Lấy từ khóa phổ biến
    async getPopularKeywords(req, res) {
        try {
            const { type = 'events', limit = 10, timeframe = '30d' } = req.query;

            const keywords = await searchService.getPopularKeywords(
                type,
                parseInt(limit),
                timeframe
            );

            res.json({
                success: true,
                data: keywords
            });

        } catch (error) {
            logger.error('Get popular keywords controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy từ khóa phổ biến thất bại'
            });
        }
    }

    // Tìm kiếm theo tag
    async searchByTags(req, res) {
        try {
            const { tags, type = 'events' } = req.query;

            if (!tags) {
                return res.status(400).json({
                    success: false,
                    message: 'Danh sách tag không được để trống'
                });
            }

            const tagArray = tags.split(',').map(tag => tag.trim());

            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                matchAll: req.query.matchAll === 'true'
            };

            const results = await searchService.searchByTags(type, tagArray, options);

            res.json({
                success: true,
                data: results.data,
                pagination: results.pagination
            });

        } catch (error) {
            logger.error('Search by tags controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tìm kiếm theo tag thất bại'
            });
        }
    }

    // Lấy thống kê tìm kiếm
    async getSearchStatistics(req, res) {
        try {
            // Only admin can view search statistics
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền xem thống kê tìm kiếm'
                });
            }

            const { timeframe = '30d' } = req.query;

            const stats = await searchService.getSearchStatistics(timeframe);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get search statistics controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Lấy thống kê tìm kiếm thất bại'
            });
        }
    }

    // Tái tạo index tìm kiếm
    async rebuildSearchIndex(req, res) {
        try {
            // Only admin can rebuild search index
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền tái tạo index tìm kiếm'
                });
            }

            const { type } = req.body;

            const result = await searchService.rebuildSearchIndex(type, req.user.userId);

            res.json({
                success: true,
                message: 'Bắt đầu tái tạo index tìm kiếm',
                data: {
                    jobId: result.jobId,
                    estimatedTime: result.estimatedTime
                }
            });

        } catch (error) {
            logger.error('Rebuild search index controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Tái tạo index tìm kiếm thất bại'
            });
        }
    }

    // Kiểm tra trạng thái index
    async getIndexStatus(req, res) {
        try {
            // Only admin can check index status
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền kiểm tra trạng thái index'
                });
            }

            const status = await searchService.getIndexStatus();

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            logger.error('Get index status controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Kiểm tra trạng thái index thất bại'
            });
        }
    }
}

module.exports = new SearchFilterController();