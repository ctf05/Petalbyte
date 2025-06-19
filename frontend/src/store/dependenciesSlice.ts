// frontend/src/store/dependenciesSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dependenciesApi } from '@/api/dependencies';
import type { DependencyInfo } from '@/api/dependencies';

interface DependenciesState {
    items: DependencyInfo[];
    loading: boolean;
    fixing: Record<string, boolean>;
    error: string | null;
}

const initialState: DependenciesState = {
    items: [],
    loading: false,
    fixing: {},
    error: null,
};

export const checkDependencies = createAsyncThunk(
    'dependencies/checkAll',
    async () => {
        return await dependenciesApi.checkAll();
    }
);

export const fixDependency = createAsyncThunk(
    'dependencies/fix',
    async (name: string) => {
        const result = await dependenciesApi.fixDependency(name);
        // Recheck after fix
        const updated = await dependenciesApi.checkDependency(name);
        return { name, result, updated };
    }
);

const dependenciesSlice = createSlice({
    name: 'dependencies',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Check all dependencies
            .addCase(checkDependencies.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(checkDependencies.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(checkDependencies.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to check dependencies';
            })
            // Fix dependency
            .addCase(fixDependency.pending, (state, action) => {
                state.fixing[action.meta.arg] = true;
            })
            .addCase(fixDependency.fulfilled, (state, action) => {
                state.fixing[action.payload.name] = false;
                // Update the dependency in the list
                const index = state.items.findIndex(d => d.name === action.payload.name);
                if (index >= 0) {
                    state.items[index] = action.payload.updated;
                }
            })
            .addCase(fixDependency.rejected, (state, action) => {
                state.fixing[action.meta.arg] = false;
            });
    },
});

export const { clearError } = dependenciesSlice.actions;
export default dependenciesSlice.reducer;