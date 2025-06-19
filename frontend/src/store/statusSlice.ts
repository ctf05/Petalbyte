// frontend/src/store/statusSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { statusApi } from '@/api/status';
import type { SystemStatus } from '@/api/status';

interface StatusState {
    data: SystemStatus | null;
    loading: boolean;
    error: string | null;
}

const initialState: StatusState = {
    data: null,
    loading: false,
    error: null,
};

export const fetchSystemStatus = createAsyncThunk(
    'status/fetchSystem',
    async () => {
        return await statusApi.getSystemStatus();
    }
);

const statusSlice = createSlice({
    name: 'status',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSystemStatus.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSystemStatus.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
            })
            .addCase(fetchSystemStatus.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch system status';
            });
    },
});

export const { clearError } = statusSlice.actions;
export default statusSlice.reducer;