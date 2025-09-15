import api from './api';

class SearchService {
    async searchAll(query, filters = {}) {
        const response = await api.get('/search', {
            params: { q: query, ...filters }
        });
        return response.data;
    }

    async searchEvents(query, filters = {}) {
        const response = await api.get('/search/events', {
            params: { q: query, ...filters }
        });
        return response.data;
    }

    async searchUsers(query, filters = {}) {
        const response = await api.get('/search/users', {
            params: { q: query, ...filters }
        });
        return response.data;
    }

    async searchCertificates(query, filters = {}) {
        const response = await api.get('/search/certificates', {
            params: { q: query, ...filters }
        });
        return response.data;
    }

    async getSearchSuggestions(query, type = 'all') {
        const response = await api.get('/search/suggestions', {
            params: { q: query, type }
        });
        return response.data;
    }

    async getPopularSearches() {
        const response = await api.get('/search/popular');
        return response.data;
    }

    async saveSearchHistory(query, type, results) {
        const response = await api.post('/search/history', {
            query,
            type,
            resultsCount: results.length
        });
        return response.data;
    }

    async getSearchHistory() {
        const response = await api.get('/search/history');
        return response.data;
    }

    async clearSearchHistory() {
        const response = await api.delete('/search/history');
        return response.data;
    }
}

export const searchService = new SearchService();