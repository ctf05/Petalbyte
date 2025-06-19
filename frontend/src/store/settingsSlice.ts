// frontend/src/store/settingsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { settingsApi } from '../api/settings';
import type { Settings, SettingsUpdate } from '../api/settings';

interface SettingsState {
    data: Settings | null;
    loading: boolean;
    saving: boolean;
    error: string | null;
}

const initialState: SettingsState = {
    data: null,
    loading: false,
    saving: false,
    error: null,
};

export const loadSettings = createAsyncThunk(
    'settings/load',
    async () => {
        return await settingsApi.getSettings();
    }
);

export const updateSettings = createAsyncThunk(
    'settings/update',
    async (settings: SettingsUpdate) => {
        const result = await settingsApi.updateSettings(settings);
        return result.settings;
    }
);

export const resetSettings = createAsyncThunk(
    'settings/reset',
    async () => {
        const result = await settingsApi.resetSettings();
        return result.settings;
    }
);

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Load settings
            .addCase(loadSettings.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loadSettings.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
            })
            .addCase(loadSettings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to load settings';
            })
            // Update settings
            .addCase(updateSettings.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(updateSettings.fulfilled, (state, action) => {
                state.saving = false;
                state.data = action.payload;
            })
            .addCase(updateSettings.rejected, (state, action) => {
                state.saving = false;
                state.error = action.error.message || 'Failed to update settings';
            })
            // Reset settings
            .addCase(resetSettings.fulfilled, (state, action) => {
                state.data = action.payload;
            });
    },
});

export const { clearError } = settingsSlice.actions;
export default settingsSlice.reducer;