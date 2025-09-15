import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { Provider } from 'react-redux';
import { store } from './store/store';

// Components
import Layout from './components/common/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import CertificatesPage from './pages/CertificatesPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

// Ant Design theme
const theme = {
    token: {
        colorPrimary: '#1890ff',
        colorSuccess: '#52c41a',
        colorWarning: '#faad14',
        colorError: '#f5222d',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        borderRadius: 8,
    },
    components: {
        Button: {
            borderRadius: 8,
            controlHeight: 40,
        },
        Input: {
            borderRadius: 8,
            controlHeight: 40,
        },
        Card: {
            borderRadius: 12,
        },
        Modal: {
            borderRadius: 12,
        },
    },
};

function App() {
    return (
        <ErrorBoundary>
            <Provider store={store}>
                <ConfigProvider theme={theme}>
                    <Router>
                        <div className="App">
                            <Routes>
                                {/* Public Routes */}
                                <Route path="/" element={<Layout />}>
                                    <Route index element={<HomePage />} />
                                    <Route path="events" element={<EventsPage />} />
                                    <Route path="events/:id" element={<EventDetailPage />} />
                                    <Route path="dashboard" element={<DashboardPage />} />
                                    <Route path="profile" element={<ProfilePage />} />
                                    <Route path="certificates" element={<CertificatesPage />} />
                                    <Route path="notifications" element={<NotificationsPage />} />
                                    <Route path="settings" element={<SettingsPage />} />
                                </Route>

                                {/* Auth Routes - No Layout */}
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />

                                {/* 404 */}
                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
                        </div>
                    </Router>
                </ConfigProvider>
            </Provider>
        </ErrorBoundary>
    );
}

export default App;