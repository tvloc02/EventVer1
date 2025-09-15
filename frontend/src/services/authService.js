import api from './api';

class AuthService {
    // Đăng nhập
    async login(credentials) {
        try {
            const response = await api.post('/auth/login', credentials);

            // Lưu token vào localStorage
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                this.setAuthHeader(response.data.token);
            }

            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Đăng nhập thất bại');
        }
    }

    // Đăng ký
    async register(userData) {
        try {
            const response = await api.post('/auth/register', userData);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Đăng ký thất bại');
        }
    }

    // Đăng xuất
    async logout() {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            this.removeAuthHeader();
        }
    }

    // Lấy thông tin user hiện tại
    async getCurrentUser() {
        try {
            const response = await api.get('/auth/me');
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Không thể lấy thông tin người dùng');
        }
    }

    // Cập nhật profile
    async updateProfile(userData) {
        try {
            const response = await api.put('/auth/profile', userData);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Cập nhật thông tin thất bại');
        }
    }

    // Đổi mật khẩu
    async changePassword(passwordData) {
        try {
            const response = await api.put('/auth/change-password', passwordData);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Đổi mật khẩu thất bại');
        }
    }

    // Quên mật khẩu
    async forgotPassword(email) {
        try {
            const response = await api.post('/auth/forgot-password', { email });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Gửi email thất bại');
        }
    }

    // Đặt lại mật khẩu
    async resetPassword(token, newPassword) {
        try {
            const response = await api.post('/auth/reset-password', {
                token,
                password: newPassword
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Đặt lại mật khẩu thất bại');
        }
    }

    // Xác thực email
    async verifyEmail(token) {
        try {
            const response = await api.post('/auth/verify-email', { token });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Xác thực email thất bại');
        }
    }

    // Gửi lại email xác thực
    async resendVerificationEmail() {
        try {
            const response = await api.post('/auth/resend-verification');
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Gửi email xác thực thất bại');
        }
    }

    // Refresh token
    async refreshToken() {
        try {
            const response = await api.post('/auth/refresh');

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                this.setAuthHeader(response.data.token);
            }

            return response.data;
        } catch (error) {
            // Nếu refresh token thất bại, logout user
            this.logout();
            throw new Error('Session expired');
        }
    }

    // OAuth Login
    async oauthLogin(provider, code) {
        try {
            const response = await api.post(`/auth/oauth/${provider}`, { code });

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                this.setAuthHeader(response.data.token);
            }

            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || `Đăng nhập ${provider} thất bại`);
        }
    }

    // Set Authorization header
    setAuthHeader(token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Remove Authorization header
    removeAuthHeader() {
        delete api.defaults.headers.common['Authorization'];
    }

    // Kiểm tra token có hợp lệ không
    isTokenValid() {
        const token = localStorage.getItem('token');
        if (!token) return false;

        try {
            // Decode JWT token để kiểm tra expiry
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;

            return payload.exp > currentTime;
        } catch (error) {
            return false;
        }
    }

    // Lấy token từ localStorage
    getToken() {
        return localStorage.getItem('token');
    }

    // Khởi tạo auth header nếu có token
    initializeAuth() {
        const token = this.getToken();
        if (token && this.isTokenValid()) {
            this.setAuthHeader(token);
        } else {
            localStorage.removeItem('token');
        }
    }
}

// Khởi tạo auth khi service load
const authService = new AuthService();
authService.initializeAuth();

export default authService;