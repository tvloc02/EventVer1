import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationService } from '../../services/notificationService';

export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    async (params = {}) => {
        const response = await notificationService.getNotifications(params);
        return response.data;
    }
);

export const markAsRead = createAsyncThunk(
    'notifications/markAsRead',
    async (id) => {
        const response = await notificationService.markAsRead(id);
        return response.data;
    }
);

export const markAllAsRead = createAsyncThunk(
    'notifications/markAllAsRead',
    async () => {
        const response = await notificationService.markAllAsRead();
        return response.data;
    }
);

export const deleteNotification = createAsyncThunk(
    'notifications/deleteNotification',
    async (id) => {
        await notificationService.deleteNotification(id);
        return id;
    }
);

const initialState = {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    settings: {
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false
    }
};

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        addNotification: (state, action) => {
            state.notifications.unshift(action.payload);
            if (!action.payload.read) {
                state.unreadCount += 1;
            }
        },
        updateSettings: (state, action) => {
            state.settings = { ...state.settings, ...action.payload };
        },
        clearNotifications: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.loading = false;
                state.notifications = action.payload.notifications || action.payload;
                state.unreadCount = action.payload.unreadCount || 0;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(markAsRead.fulfilled, (state, action) => {
                const notification = state.notifications.find(n => n.id === action.payload.id);
                if (notification && !notification.read) {
                    notification.read = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })
            .addCase(markAllAsRead.fulfilled, (state) => {
                state.notifications.forEach(n => n.read = true);
                state.unreadCount = 0;
            })
            .addCase(deleteNotification.fulfilled, (state, action) => {
                const notification = state.notifications.find(n => n.id === action.payload);
                if (notification && !notification.read) {
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
                state.notifications = state.notifications.filter(n => n.id !== action.payload);
            });
    },
});

export const {
    addNotification,
    updateSettings,
    clearNotifications
} = notificationSlice.actions;

export default notificationSlice.reducer;