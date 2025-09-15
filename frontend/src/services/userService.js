import api from './api';

class UserService {
    async getUsers(params = {}) {
        const response = await api.get('/users', { params });
        return response.data;
    }

    async getUserById(id) {
        const response = await api.get(`/users/${id}`);
        return response.data;
    }

    async updateUser(id, userData) {
        const response = await api.put(`/users/${id}`, userData);
        return response.data;
    }

    async deleteUser(id) {
        const response = await api.delete(`/users/${id}`);
        return response.data;
    }

    async getUserProfile() {
        const response = await api.get('/users/profile');
        return response.data;
    }

    async updateProfile(profileData) {
        const response = await api.put('/users/profile', profileData);
        return response.data;
    }

    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await api.post('/users/upload-avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    async getUserStats() {
        const response = await api.get('/users/stats');
        return response.data;
    }

    async getDashboardStats() {
        const response = await api.get('/users/dashboard-stats');
        return response.data;
    }

    async getUserRegistrations(userId, params = {}) {
        const response = await api.get(`/users/${userId}/registrations`, { params });
        return response.data;
    }

    async getUserCertificates(userId, params = {}) {
        const response = await api.get(`/users/${userId}/certificates`, { params });
        return response.data;
    }

    async getUserAttendance(userId, params = {}) {
        const response = await api.get(`/users/${userId}/attendance`, { params });
        return response.data;
    }

    async searchUsers(query) {
        const response = await api.get('/users/search', {
            params: { q: query }
        });
        return response.data;
    }

    async exportUsers(params = {}) {
        const response = await api.get('/users/export', {
            params,
            responseType: 'blob'
        });
        return response.data;
    }

    async importUsers(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/users/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    async changeUserRole(userId, role) {
        const response = await api.put(`/users/${userId}/role`, { role });
        return response.data;
    }

    async changeUserStatus(userId, status) {
        const response = await api.put(`/users/${userId}/status`, { status });
        return response.data;
    }

    async resetUserPassword(userId) {
        const response = await api.post(`/users/${userId}/reset-password`);
        return response.data;
    }

    async sendUserInvitation(email, role = 'student') {
        const response = await api.post('/users/invite', { email, role });
        return response.data;
    }
}

export const userService = new UserService();