import api from './api';

class NotificationService {
    async getNotifications(params = {}) {
        const response = await api.get('/notifications', { params });
        return response.data;
    }

    async markAsRead(id) {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    }

    async markAllAsRead() {
        const response = await api.put('/notifications/mark-all-read');
        return response.data;
    }

    async deleteNotification(id) {
        const response = await api.delete(`/notifications/${id}`);
        return response.data;
    }

    async createNotification(notificationData) {
        const response = await api.post('/notifications', notificationData);
        return response.data;
    }

    async getNotificationSettings() {
        const response = await api.get('/notifications/settings');
        return response.data;
    }

    async updateNotificationSettings(settings) {
        const response = await api.put('/notifications/settings', settings);
        return response.data;
    }

    async sendBulkNotification(notificationData) {
        const response = await api.post('/notifications/bulk', notificationData);
        return response.data;
    }

    async getUnreadCount() {
        const response = await api.get('/notifications/unread-count');
        return response.data;
    }
}

export const notificationService = new NotificationService();