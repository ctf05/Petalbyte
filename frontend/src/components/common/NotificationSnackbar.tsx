// frontend/src/components/common/NotificationSnackbar.tsx
import React from 'react';
import { Snackbar, Alert, Stack } from '@mui/material';
import { useAppSelector, useAppDispatch } from '@/hooks/store';
import { hideNotification } from '@/store/notificationSlice';

const NotificationSnackbar: React.FC = () => {
    const dispatch = useAppDispatch();
    const notifications = useAppSelector((state) => state.notification.notifications);

    const handleClose = (id: string) => {
        dispatch(hideNotification(id));
    };

    return (
        <Stack spacing={1} sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
            {notifications.map((notification) => (
                <Snackbar
                    key={notification.id}
                    open={true}
                    autoHideDuration={notification.autoHideDuration}
                    onClose={() => handleClose(notification.id)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert
                        onClose={() => handleClose(notification.id)}
                        severity={notification.severity}
                        sx={{ width: '100%' }}
                        variant="filled"
                        elevation={6}
                    >
                        {notification.message}
                    </Alert>
                </Snackbar>
            ))}
        </Stack>
    );
};

export default NotificationSnackbar;