import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';

// Async thunks
export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await authService.login(credentials);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/registerUser',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await authService.register(userData);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logoutUser',
    async (_, { rejectWithValue }) => {
        try {
            await authService.logout();
            return true;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getCurrentUser = createAsyncThunk(
    'auth/getCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const response = await authService.getCurrentUser();
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateUserProfile = createAsyncThunk(
    'auth/updateUserProfile',
    async (profileData, { rejectWithValue }) => {
        try {
            const response = await authService.updateProfile(profileData);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const changePassword = createAsyncThunk(
    'auth/changePassword',
    async (passwordData, { rejectWithValue }) => {
        try {
            const response = await authService.changePassword(
                passwordData.currentPassword,
                passwordData.newPassword
            );
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const forgotPassword = createAsyncThunk(
    'auth/forgotPassword',
    async (email, { rejectWithValue }) => {
        try {
            const response = await authService.forgotPassword(email);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const resetPassword = createAsyncThunk(
    'auth/resetPassword',
    async ({ token, password }, { rejectWithValue }) => {
        try {
            const response = await authService.resetPassword(token, password);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const verifyEmail = createAsyncThunk(
    'auth/verifyEmail',
    async (token, { rejectWithValue }) => {
        try {
            const response = await authService.verifyEmail(token);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const initialState = {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    loading: false,
    error: null,
    message: null,
    loginAttempts: 0,
    lastLoginAttempt: null,
    twoFactorEnabled: false,
    emailVerified: false,
    permissions: [],
    roles: [],
    sessionExpiry: null
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearMessage: (state) => {
            state.message = null;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setToken: (state, action) => {
            state.token = action.payload;
            if (action.payload) {
                localStorage.setItem('token', action.payload);
            } else {
                localStorage.removeItem('token');
            }
        },
        clearAuth: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.permissions = [];
            state.roles = [];
            state.sessionExpiry = null;
            localStorage.removeItem('token');
        },
        updateUser: (state, action) => {
            state.user = { ...state.user, ...action.payload };
        },
        incrementLoginAttempts: (state) => {
            state.loginAttempts += 1;
            state.lastLoginAttempt = Date.now();
        },
        resetLoginAttempts: (state) => {
            state.loginAttempts = 0;
            state.lastLoginAttempt = null;
        },
        setTwoFactorEnabled: (state, action) => {
            state.twoFactorEnabled = action.payload;
        },
        setEmailVerified: (state, action) => {
            state.emailVerified = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.isAuthenticated = true;
                state.permissions = action.payload.user.permissions || [];
                state.roles = action.payload.user.roles || [action.payload.user.role];
                state.emailVerified = action.payload.user.emailVerified;
                state.twoFactorEnabled = action.payload.user.twoFactorEnabled;
                state.sessionExpiry = action.payload.sessionExpiry;
                state.loginAttempts = 0;
                state.lastLoginAttempt = null;
                localStorage.setItem('token', action.payload.token);
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload.message || 'Đăng nhập thất bại';
                state.loginAttempts += 1;
                state.lastLoginAttempt = Date.now();
            })

            // Register
            .addCase(registerUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false;
                state.message = action.payload.message || 'Đăng ký thành công';
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload.message || 'Đăng ký thất bại';
            })

            // Logout
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                state.permissions = [];
                state.roles = [];
                state.sessionExpiry = null;
                localStorage.removeItem('token');
            })

            // Get Current User
            .addCase(getCurrentUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(getCurrentUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.permissions = action.payload.user.permissions || [];
                state.roles = action.payload.user.roles || [action.payload.user.role];
                state.emailVerified = action.payload.user.emailVerified;
                state.twoFactorEnabled = action.payload.user.twoFactorEnabled;
            })
            .addCase(getCurrentUser.rejected, (state, action) => {
                state.loading = false;
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                state.permissions = [];
                state.roles = [];
                localStorage.removeItem('token');
            })

            // Update Profile
            .addCase(updateUserProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.message = 'Cập nhật thông tin thành công';
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload.message || 'Cập nhật thông tin thất bại';
            })

            // Change Password
            .addCase(changePassword.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(changePassword.fulfilled, (state, action) => {
                state.loading = false;
                state.message = 'Đổi mật khẩu thành công';
            })
            .addCase(changePassword.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload.message || 'Đổi mật khẩu thất bại';
            })

            // Forgot Password
            .addCase(forgotPassword.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(forgotPassword.fulfilled, (state, action) => {
                state.loading = false;
                state.message = action.payload.message || 'Đã gửi link đặt lại mật khẩu';
            })
            .addCase(forgotPassword.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload.message || 'Gửi link thất bại';
            })

            // Reset Password
            .addCase(resetPassword.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(resetPassword.fulfilled, (state, action) => {
                state.loading = false;
                state.message = action.payload.message || 'Đặt lại mật khẩu thành công';
            })
            .addCase(resetPassword.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload.message || 'Đặt lại mật khẩu thất bại';
            })

            // Verify Email
            .addCase(verifyEmail.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(verifyEmail.fulfilled, (state, action) => {
                state.loading = false;
                state.emailVerified = true;
                state.message = action.payload.message || 'Xác thực email thành công';
            })
            .addCase(verifyEmail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload.message || 'Xác thực email thất bại';
            });
    },
});

export const {
    clearError,
    clearMessage,
    setLoading,
    setToken,
    clearAuth,
    updateUser,
    incrementLoginAttempts,
    resetLoginAttempts,
    setTwoFactorEnabled,
    setEmailVerified
} = authSlice.actions;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthMessage = (state) => state.auth.message;
export const selectUserPermissions = (state) => state.auth.permissions;
export const selectUserRoles = (state) => state.auth.roles;
export const selectLoginAttempts = (state) => state.auth.loginAttempts;
export const selectTwoFactorEnabled = (state) => state.auth.twoFactorEnabled;
export const selectEmailVerified = (state) => state.auth.emailVerified;

export default authSlice.reducer;