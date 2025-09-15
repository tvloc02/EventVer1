import api from './api';

class EventService {
    async getEvents(params = {}) {
        const response = await api.get('/events', { params });
        return response.data;
    }

    async getEventById(id) {
        const response = await api.get(`/events/${id}`);
        return response.data;
    }

    async createEvent(eventData) {
        const response = await api.post('/events', eventData);
        return response.data;
    }

    async updateEvent(id, eventData) {
        const response = await api.put(`/events/${id}`, eventData);
        return response.data;
    }

    async deleteEvent(id) {
        const response = await api.delete(`/events/${id}`);
        return response.data;
    }

    async getEventCategories() {
        const response = await api.get('/events/categories');
        return response.data;
    }

    async registerForEvent(eventId, registrationData) {
        const response = await api.post(`/events/${eventId}/register`, registrationData);
        return response.data;
    }

    async cancelRegistration(eventId) {
        const response = await api.delete(`/events/${eventId}/register`);
        return response.data;
    }

    async getEventRegistrations(eventId, params = {}) {
        const response = await api.get(`/events/${eventId}/registrations`, { params });
        return response.data;
    }

    async updateRegistrationStatus(eventId, userId, status) {
        const response = await api.put(`/events/${eventId}/registrations/${userId}`, { status });
        return response.data;
    }

    async getEventAttendance(eventId) {
        const response = await api.get(`/events/${eventId}/attendance`);
        return response.data;
    }

    async markAttendance(eventId, attendanceData) {
        const response = await api.post(`/events/${eventId}/attendance`, attendanceData);
        return response.data;
    }

    async scanQRCode(eventId, qrData) {
        const response = await api.post(`/events/${eventId}/scan-qr`, { qrData });
        return response.data;
    }

    async getEventCertificates(eventId) {
        const response = await api.get(`/events/${eventId}/certificates`);
        return response.data;
    }

    async generateCertificate(eventId, userId) {
        const response = await api.post(`/events/${eventId}/certificates/${userId}`);
        return response.data;
    }

    async downloadCertificate(certificateId) {
        const response = await api.get(`/certificates/${certificateId}/download`, {
            responseType: 'blob'
        });
        return response.data;
    }

    async getEventStats() {
        const response = await api.get('/events/stats');
        return response.data;
    }

    async getEventsByDateRange(startDate, endDate) {
        const response = await api.get('/events/date-range', {
            params: { startDate, endDate }
        });
        return response.data;
    }

    async searchEvents(query) {
        const response = await api.get('/events/search', {
            params: { q: query }
        });
        return response.data;
    }

    async getMyEvents(params = {}) {
        const response = await api.get('/events/my-events', { params });
        return response.data;
    }

    async getMyRegistrations(params = {}) {
        const response = await api.get('/events/my-registrations', { params });
        return response.data;
    }

    async uploadEventImage(eventId, imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await api.post(`/events/${eventId}/upload-image`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    async exportEvents(params = {}) {
        const response = await api.get('/events/export', {
            params,
            responseType: 'blob'
        });
        return response.data;
    }

    async importEvents(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/events/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
}

export const eventService = new EventService();