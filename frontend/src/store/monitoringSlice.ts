// frontend/src/store/monitoringSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { monitoringApi } from '../api/monitoring';
import type { SystemMetrics, StorageStats, BandwidthUsage } from '../api/monitoring';

interface MonitoringState {
    metrics: SystemMetrics | null;
    storage: StorageStats | null;
    bandwidth: BandwidthUsage | null;
    loading: boolean;
    error: string | null;
}

const initialState: MonitoringState = {
    metrics: null,
    storage: null,
    bandwidth: null,
    loading: false,
    error: null,
};

export const fetchMetrics = createAsyncThunk(
    'monitoring/fetchMetrics',
    async (period: '1h' | '6h' | '24h' | '7d' | '30d' = '1h') => {
        return await monitoringApi.getMetrics(period);
    }
);

export const fetchStorageStats = createAsyncThunk(
    'monitoring/fetchStorage',
    async () => {
        return await monitoringApi.getStorageStats();
    }
);

export const fetchBandwidthUsage = createAsyncThunk(
    'monitoring/fetchBandwidth',
    async (period: '1h' | '24h' | '7d' = '24h') => {
        return await monitoringApi.getBandwidthUsage(period);
    }
);

const monitoringSlice = createSlice({
    name: 'monitoring',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch metrics
            .addCase(fetchMetrics.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMetrics.fulfilled, (state, action) => {
                state.loading = false;
                state.metrics = action.payload;
            })
            .addCase(fetchMetrics.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch metrics';
            })
            // Fetch storage stats
            .addCase(fetchStorageStats.fulfilled, (state, action) => {
                state.storage = action.payload;
            })
            // Fetch bandwidth usage
            .addCase(fetchBandwidthUsage.fulfilled, (state, action) => {
                state.bandwidth = action.payload;
            });
    },
});

export const { clearError } = monitoringSlice.actions;
export default monitoringSlice.reducer;