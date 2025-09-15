import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isSidebarOpen: false,
    theme: 'light',
    loading: {
        global: false,
        events: false,
        users: false,
        certificates: false
    },
    modals: {
        eventForm: false,
        userForm: false,
        confirmDelete: false,
        certificateViewer: false
    },
    toasts: [],
    currentView: 'dashboard',
    breadcrumbs: []
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.isSidebarOpen = !state.isSidebarOpen;
        },
        setSidebarOpen: (state, action) => {
            state.isSidebarOpen = action.payload;
        },
        setTheme: (state, action) => {
            state.theme = action.payload;
        },
        setLoading: (state, action) => {
            const { key, value } = action.payload;
            state.loading[key] = value;
        },
        openModal: (state, action) => {
            state.modals[action.payload] = true;
        },
        closeModal: (state, action) => {
            state.modals[action.payload] = false;
        },
        closeAllModals: (state) => {
            Object.keys(state.modals).forEach(key => {
                state.modals[key] = false;
            });
        },
        addToast: (state, action) => {
            const toast = {
                id: Date.now(),
                type: 'info',
                duration: 5000,
                ...action.payload
            };
            state.toasts.push(toast);
        },
        removeToast: (state, action) => {
            state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
        },
        clearToasts: (state) => {
            state.toasts = [];
        },
        setCurrentView: (state, action) => {
            state.currentView = action.payload;
        },
        setBreadcrumbs: (state, action) => {
            state.breadcrumbs = action.payload;
        },
        addBreadcrumb: (state, action) => {
            state.breadcrumbs.push(action.payload);
        },
        removeBreadcrumb: (state, action) => {
            state.breadcrumbs = state.breadcrumbs.slice(0, action.payload);
        }
    }
});

export const {
    toggleSidebar,
    setSidebarOpen,
    setTheme,
    setLoading,
    openModal,
    closeModal,
    closeAllModals,
    addToast,
    removeToast,
    clearToasts,
    setCurrentView,
    setBreadcrumbs,
    addBreadcrumb,
    removeBreadcrumb
} = uiSlice.actions;

export default uiSlice.reducer;