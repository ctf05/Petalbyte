// frontend/src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import Layout from '@/components/common/Layout';
import DashboardPage from '@/pages/DashboardPage';
import BackupPage from '@/pages/BackupPage';
import MonitoringPage from '@/pages/MonitoringPage';
import SettingsPage from '@/pages/SettingsPage';
import SetupPage from '@/pages/SetupPage';
import TutorialPage from '@/pages/TutorialPage';
import DependenciesPage from '@/pages/DependenciesPage';

import { useAppDispatch } from '@/hooks/store';
import { checkDependencies } from '@/store/dependenciesSlice';
import { fetchSystemStatus } from '@/store/statusSlice';
import { loadSettings } from '@/store/settingsSlice';

const App: React.FC = () => {
    const dispatch = useAppDispatch();

    useEffect(() => {
        // Initial data loading
        dispatch(checkDependencies());
        dispatch(fetchSystemStatus());
        dispatch(loadSettings());

        // Set up periodic status updates
        const interval = setInterval(() => {
            dispatch(fetchSystemStatus());
        }, 30000); // Every 30 seconds

        return () => clearInterval(interval);
    }, [dispatch]);

    return (
        <Layout>
            <Box sx={{ height: '100%', overflow: 'auto' }}>
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/backup" element={<BackupPage />} />
                    <Route path="/monitoring" element={<MonitoringPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/setup" element={<SetupPage />} />
                    <Route path="/tutorial" element={<TutorialPage />} />
                    <Route path="/dependencies" element={<DependenciesPage />} />
                </Routes>
            </Box>
        </Layout>
    );
};

export default App;