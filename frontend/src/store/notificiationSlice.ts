// frontend/src/store/notificationSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
    id: string;
    message: string;
    severity: 'error' | 'warning' | 'info' | 'success';
    autoHideDuration?: number;
}

interface NotificationState {
    notifications: Notification[];
}

const initialState: NotificationState = {
    notifications: [],
};

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        showNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
            const notification: Notification = {
                ...action.payload,
                id: Date.now().toString(),
                autoHideDuration: action.payload.autoHideDuration || 6000,
            };
            state.notifications.push(notification);
        },
        hideNotification: (state, action: PayloadAction<string>) => {
            state.notifications = state.notifications.filter(n => n.id !== action.payload);
        },
        clearNotifications: (state) => {
            state.notifications = [];
        },
    },
});

export const { showNotification, hideNotification, clearNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;