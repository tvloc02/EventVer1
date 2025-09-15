import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
    constructor() {
        this.axiosInstance = axios.create({
            baseURL: API_BASE_URL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    setupInterceptors() {
        // Request interceptor
        this.axiosInstance.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.axiosInstance.interceptors.response.use(
            (response) => {
                return response;
            },
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        const refreshToken = localStorage.getItem('refreshToken');
                        if (refreshToken) {
                            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                                refreshToken
                            });

                            const { accessToken } = response.data;
                            localStorage.setItem('accessToken', accessToken);

                            // Retry original request
                            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                            return this.axiosInstance(originalRequest);
                        }
                    } catch (refreshError) {
                        // Refresh failed, redirect to login
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                        window.location.href = '/login';
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    // HTTP methods
    async get(url, config = {}) {
        const response = await this.axiosInstance.get(url, config);
        return response;
    }

    async post(url, data = {}, config = {}) {
        const response = await this.axiosInstance.post(url, data, config);
        return response;
    }

    async put(url, data = {}, config = {}) {
        const response = await this.axiosInstance.put(url, data, config);
        return response;
    }

    async patch(url, data = {}, config = {}) {
        const response = await this.axiosInstance.patch(url, data, config);
        return response;
    }

    async delete(url, config = {}) {
        const response = await this.axiosInstance.delete(url, config);
        return response;
    }

    // File upload helper
    async uploadFile(url, file, onUploadProgress = null) {
        const formData = new FormData();
        formData.append('file', file);

        return this.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress,
        });
    }

    // Download helper
    async downloadFile(url, filename = null) {
        const response = await this.get(url, {
            responseType: 'blob'
        });

        if (filename) {
            const blob = new Blob([response.data]);
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        }

        return response;
    }

    // Cancel request
    createCancelToken() {
        return axios.CancelToken.source();
    }

    // Get base URL
    getBaseURL() {
        return API_BASE_URL;
    }
}

export default new ApiService();