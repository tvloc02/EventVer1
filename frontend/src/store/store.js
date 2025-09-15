import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import eventReducer from './slices/eventSlice';
import userReducer from './slices/userSlice';
import notificationReducer from './slices/notificationSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        events: eventReducer,
        users: userReducer,
        notifications: notificationReducer,
        ui: uiReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST'],
            },
        }),
    devTools: process.env.NODE_ENV !== 'production',
});

