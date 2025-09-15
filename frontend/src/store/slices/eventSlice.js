import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { eventService } from '../../services/eventService';

export const fetchEvents = createAsyncThunk(
    'events/fetchEvents',
    async (params = {}) => {
        const response = await eventService.getEvents(params);
        return response.data;
    }
);

export const fetchEventById = createAsyncThunk(
    'events/fetchEventById',
    async (id) => {
        const response = await eventService.getEventById(id);
        return response.data;
    }
);

export const createEvent = createAsyncThunk(
    'events/createEvent',
    async (eventData) => {
        const response = await eventService.createEvent(eventData);
        return response.data;
    }
);

export const updateEvent = createAsyncThunk(
    'events/updateEvent',
    async ({ id, eventData }) => {
        const response = await eventService.updateEvent(id, eventData);
        return response.data;
    }
);

export const deleteEvent = createAsyncThunk(
    'events/deleteEvent',
    async (id) => {
        await eventService.deleteEvent(id);
        return id;
    }
);

const initialState = {
    events: [],
    currentEvent: null,
    categories: [],
    registrations: [],
    attendances: [],
    loading: false,
    error: null,
    filters: {
        category: '',
        status: '',
        dateFrom: '',
        dateTo: '',
        search: ''
    },
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    }
};

const eventSlice = createSlice({
    name: 'events',
    initialState,
    reducers: {
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearFilters: (state) => {
            state.filters = initialState.filters;
        },
        setPagination: (state, action) => {
            state.pagination = { ...state.pagination, ...action.payload };
        },
        setCurrentEvent: (state, action) => {
            state.currentEvent = action.payload;
        },
        clearCurrentEvent: (state) => {
            state.currentEvent = null;
        },
        setRegistrations: (state, action) => {
            state.registrations = action.payload;
        },
        addRegistration: (state, action) => {
            state.registrations.push(action.payload);
        },
        removeRegistration: (state, action) => {
            state.registrations = state.registrations.filter(
                reg => reg.id !== action.payload
            );
        },
        setAttendances: (state, action) => {
            state.attendances = action.payload;
        },
        updateAttendance: (state, action) => {
            const index = state.attendances.findIndex(
                att => att.id === action.payload.id
            );
            if (index !== -1) {
                state.attendances[index] = action.payload;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Events
            .addCase(fetchEvents.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchEvents.fulfilled, (state, action) => {
                state.loading = false;
                state.events = action.payload.events || action.payload;
                if (action.payload.pagination) {
                    state.pagination = action.payload.pagination;
                }
            })
            .addCase(fetchEvents.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })

            // Fetch Event By ID
            .addCase(fetchEventById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchEventById.fulfilled, (state, action) => {
                state.loading = false;
                state.currentEvent = action.payload;
            })
            .addCase(fetchEventById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })

            // Create Event
            .addCase(createEvent.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createEvent.fulfilled, (state, action) => {
                state.loading = false;
                state.events.unshift(action.payload);
            })
            .addCase(createEvent.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })

            // Update Event
            .addCase(updateEvent.fulfilled, (state, action) => {
                const index = state.events.findIndex(
                    event => event.id === action.payload.id
                );
                if (index !== -1) {
                    state.events[index] = action.payload;
                }
                if (state.currentEvent && state.currentEvent.id === action.payload.id) {
                    state.currentEvent = action.payload;
                }
            })

            // Delete Event
            .addCase(deleteEvent.fulfilled, (state, action) => {
                state.events = state.events.filter(event => event.id !== action.payload);
                if (state.currentEvent && state.currentEvent.id === action.payload) {
                    state.currentEvent = null;
                }
            });
    },
});

export const {
    setFilters,
    clearFilters,
    setPagination,
    setCurrentEvent,
    clearCurrentEvent,
    setRegistrations,
    addRegistration,
    removeRegistration,
    setAttendances,
    updateAttendance
} = eventSlice.actions;

export default eventSlice.reducer;