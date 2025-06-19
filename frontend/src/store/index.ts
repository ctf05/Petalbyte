// frontend/src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import statusReducer from './statusSlice';
import backupReducer from './backupSlice';
import dependenciesReducer from './dependenciesSlice';
import settingsReducer from './settingsSlice';
import notificationReducer from './notificationSlice';
import monitoringReducer from './monitoringSlice';

export const store = configureStore({
    reducer: {
        status: statusReducer,
        backup: backupReducer,
        dependencies: dependenciesReducer,
        settings: settingsReducer,
        notification: notificationReducer,
        monitoring: monitoringReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;