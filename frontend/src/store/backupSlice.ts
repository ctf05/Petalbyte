// frontend/src/store/backupSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { backupApi } from '../api/backup';
import type { BackupRequest, BackupResult, BackupProgress, BackupHistoryItem } from '@/api/backup';

interface BackupState {
    currentBackup: BackupResult | null;
    progress: BackupProgress | null;
    history: BackupHistoryItem[];
    loading: boolean;
    error: string | null;
}

const initialState: BackupState = {
    currentBackup: null,
    progress: null,
    history: [],
    loading: false,
    error: null,
};

export const startBackup = createAsyncThunk(
    'backup/start',
    async (request: BackupRequest) => {
        return await backupApi.startBackup(request);
    }
);

export const fetchBackupProgress = createAsyncThunk(
    'backup/progress',
    async () => {
        return await backupApi.getBackupStatus();
    }
);

export const cancelBackup = createAsyncThunk(
    'backup/cancel',
    async () => {
        await backupApi.cancelBackup();
    }
);

export const fetchBackupHistory = createAsyncThunk(
    'backup/history',
    async (params?: { limit?: number; offset?: number; status?: string }) => {
        return await backupApi.getHistory(params);
    }
);

const backupSlice = createSlice({
    name: 'backup',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        updateProgress: (state, action) => {
            state.progress = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Start backup
            .addCase(startBackup.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(startBackup.fulfilled, (state, action) => {
                state.loading = false;
                state.currentBackup = action.payload;
            })
            .addCase(startBackup.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to start backup';
            })
            // Fetch progress
            .addCase(fetchBackupProgress.fulfilled, (state, action) => {
                state.progress = action.payload;
            })
            // Cancel backup
            .addCase(cancelBackup.fulfilled, (state) => {
                state.currentBackup = null;
                state.progress = null;
            })
            // Fetch history
            .addCase(fetchBackupHistory.fulfilled, (state, action) => {
                state.history = action.payload;
            });
    },
});

export const { clearError, updateProgress } = backupSlice.actions;
export default backupSlice.reducer;