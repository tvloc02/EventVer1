import api from './api';

class CertificateService {
    async getCertificates(params = {}) {
        const response = await api.get('/certificates', { params });
        return response.data;
    }

    async getCertificateById(id) {
        const response = await api.get(`/certificates/${id}`);
        return response.data;
    }

    async generateCertificate(eventId, userId, templateData = {}) {
        const response = await api.post(`/certificates/generate`, {
            eventId,
            userId,
            ...templateData
        });
        return response.data;
    }

    async generateBulkCertificates(eventId, userIds, templateData = {}) {
        const response = await api.post(`/certificates/generate-bulk`, {
            eventId,
            userIds,
            ...templateData
        });
        return response.data;
    }

    async downloadCertificate(id) {
        const response = await api.get(`/certificates/${id}/download`, {
            responseType: 'blob'
        });
        return response.data;
    }

    async downloadCertificateByCode(code) {
        const response = await api.get(`/certificates/download/${code}`, {
            responseType: 'blob'
        });
        return response.data;
    }

    async verifyCertificate(code) {
        const response = await api.get(`/certificates/verify/${code}`);
        return response.data;
    }

    async getMyCertificates(params = {}) {
        const response = await api.get('/certificates/my-certificates', { params });
        return response.data;
    }

    async sendCertificateByEmail(id, email) {
        const response = await api.post(`/certificates/${id}/send-email`, { email });
        return response.data;
    }

    async getCertificateTemplates() {
        const response = await api.get('/certificates/templates');
        return response.data;
    }

    async createCertificateTemplate(templateData) {
        const response = await api.post('/certificates/templates', templateData);
        return response.data;
    }

    async updateCertificateTemplate(id, templateData) {
        const response = await api.put(`/certificates/templates/${id}`, templateData);
        return response.data;
    }

    async deleteCertificateTemplate(id) {
        const response = await api.delete(`/certificates/templates/${id}`);
        return response.data;
    }
}

export const certificateService = new CertificateService();