import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService } from '../../services/userService';

export const fetchUsers = createAsyncThunk(
    'users/fetchUsers',
    async (params = {}) => {
        const response = await userService.getUsers(params);
        return response.data;
    }
);

export const fetchUserById = createAsyncThunk(
    'users/fetchUserById',
    async (id) => {
        const response = await userService.getUserById(id);
        return response.data;
    }
);

export const updateUser = createAsyncThunk(
    'users/updateUser',
    async ({ id, userData }) => {
        const response = await userService.updateUser(id, userData);
        return response.data;
    }
);

export const deleteUser = createAsyncThunk(
    'users/deleteUser',
    async (id) => {
        await userService.deleteUser(id);
        return id;
    }
);

const initialState = {
    users: [],
    currentUser: null,
    loading: false,
    error: null,
    filters: {
        role: '',
        status: '',
        search: ''
    },
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    }
};

const userSlice = createSlice({
    name: 'users',
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
        setCurrentUser: (state, action) => {
            state.currentUser = action.payload;
        },
        clearCurrentUser: (state) => {
            state.currentUser = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.users = action.payload.users || action.payload;
                if (action.payload.pagination) {
                    state.pagination = action.payload.pagination;
                }
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(fetchUserById.fulfilled, (state, action) => {
                state.currentUser = action.payload;
            })
            .addCase(updateUser.fulfilled, (state, action) => {
                const index = state.users.findIndex(user => user.id === action.payload.id);
                if (index !== -1) {
                    state.users[index] = action.payload;
                }
            })
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.users = state.users.filter(user => user.id !== action.payload);
            });
    },
});

export const {
    setFilters,
    clearFilters,
    setPagination,
    setCurrentUser,
    clearCurrentUser
} = userSlice.actions;

export default userSlice.reducer;