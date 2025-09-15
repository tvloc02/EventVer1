import React, { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import EventList from '../components/events/EventList';
import EventForm from '../components/events/EventForm';
import Modal from '../components/common/Modal';

const EventsPage = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleCreateEvent = () => {
        setShowCreateModal(true);
    };

    const handleEventCreated = () => {
        setShowCreateModal(false);
        // Refresh events list
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                            <Calendar className="w-6 h-6" />
                            <span>Quản lý sự kiện</span>
                        </h1>
                        <p className="text-gray-600 mt-1">Tạo và quản lý các sự kiện của bạn</p>
                    </div>

                    <button
                        onClick={handleCreateEvent}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Tạo sự kiện mới</span>
                    </button>
                </div>

                {/* Events List */}
                <EventList />

                {/* Create Event Modal */}
                <Modal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    title="Tạo sự kiện mới"
                    size="large"
                >
                    <EventForm
                        onSubmit={handleEventCreated}
                        onCancel={() => setShowCreateModal(false)}
                    />
                </Modal>
            </div>
        </div>
    );
};

export default EventsPage;