import api from './api';

class ReportService {
    async getEventReports(params = {}) {
        const response = await api.get('/reports/events', { params });
        return response.data;
    }

    async getUserReports(params = {}) {
        const response = await api.get('/reports/users', { params });
        return response.data;
    }

    async getAttendanceReports(params = {}) {
        const response = await api.get('/reports/attendance', { params });
        return response.data;
    }

    async getCertificateReports(params = {}) {
        const response = await api.get('/reports/certificates', { params });
        return response.data;
    }

    async getFinancialReports(params = {}) {
        const response = await api.get('/reports/financial', { params });
        return response.data;
    }

    async getDashboardSummary() {
        const response = await api.get('/reports/dashboard-summary');
        return response.data;
    }

    async exportReport(reportType, params = {}) {
        const response = await api.get(`/reports/${reportType}/export`, {
            params,
            responseType: 'blob'
        });
        return response.data;
    }

    async generateCustomReport(reportConfig) {
        const response = await api.post('/reports/custom', reportConfig);
        return response.data;
    }
}

export const reportService = new ReportService();