// frontend/src/pages/DashboardPage.tsx
import React, { useEffect } from 'react';
import {
    Box,
    Container,
    Grid,
    Paper,
    Typography,
    Card,
    CardContent,
    Button,
    LinearProgress,
    Chip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Alert,
} from '@mui/material';
import {
    Backup as BackupIcon,
    Schedule as ScheduleIcon,
    Storage as StorageIcon,
    CheckCircle as CheckIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    CloudQueue as CloudIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { fetchSystemStatus } from '@/store/statusSlice';
import { fetchBackupHistory } from '@/store/backupSlice';
import { fetchStorageStats } from '@/store/monitoringSlice';
import { formatDistanceToNow, format } from 'date-fns';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const systemStatus = useAppSelector((state) => state.status.data);
    const backupHistory = useAppSelector((state) => state.backup.history);
    const storageStats = useAppSelector((state) => state.monitoring.storage);
    const dependencyIssues = useAppSelector((state) =>
        state.dependencies.items.filter(dep => dep.status !== 'ok')
    );

    useEffect(() => {
        // Load dashboard data
        dispatch(fetchSystemStatus());
        dispatch(fetchBackupHistory({ limit: 5 }));
        dispatch(fetchStorageStats());
    }, [dispatch]);

    const formatBytes = (bytes: number): string => {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'success':
                return <CheckIcon color="success" />;
            case 'degraded':
            case 'partial':
                return <WarningIcon color="warning" />;
            case 'error':
            case 'failed':
                return <ErrorIcon color="error" />;
            default:
                return <CloudIcon />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'success':
                return 'success';
            case 'degraded':
            case 'partial':
                return 'warning';
            case 'error':
            case 'failed':
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Dashboard
                </Typography>

                {/* Dependency Issues Alert */}
                {dependencyIssues.length > 0 && (
                    <Alert
                        severity="warning"
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() => navigate('/dependencies')}
                            >
                                View Issues
                            </Button>
                        }
                        sx={{ mb: 3 }}
                    >
                        {dependencyIssues.length} dependency {dependencyIssues.length === 1 ? 'issue' : 'issues'} detected
                    </Alert>
                )}

                {/* System Overview Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    {getStatusIcon(systemStatus?.status || 'unknown')}
                                    <Typography variant="h6" sx={{ ml: 1 }}>
                                        System Status
                                    </Typography>
                                </Box>
                                <Chip
                                    label={systemStatus?.status || 'Unknown'}
                                    color={getStatusColor(systemStatus?.status || 'unknown') as any}
                                    size="small"
                                />
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <BackupIcon color="primary" />
                                    <Typography variant="h6" sx={{ ml: 1 }}>
                                        Last Backup
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    {systemStatus?.last_backup
                                        ? formatDistanceToNow(new Date(systemStatus.last_backup.start_time), {
                                            addSuffix: true,
                                        })
                                        : 'Never'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <ScheduleIcon color="primary" />
                                    <Typography variant="h6" sx={{ ml: 1 }}>
                                        Next Backup
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    {systemStatus?.next_scheduled
                                        ? format(new Date(systemStatus.next_scheduled), 'MMM d, h:mm a')
                                        : 'Not scheduled'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <StorageIcon color="primary" />
                                    <Typography variant="h6" sx={{ ml: 1 }}>
                                        Total Backups
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    {storageStats?.total_backups || 0} backups
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <Grid container spacing={3}>
                    {/* Disk Space */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Disk Space
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2">Local Snapshots</Typography>
                                    <Typography variant="body2">
                                        {systemStatus?.disk_space
                                            ? `${formatBytes(systemStatus.disk_space.used)} / ${formatBytes(
                                                systemStatus.disk_space.total
                                            )}`
                                            : 'N/A'}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={systemStatus?.disk_space?.percent || 0}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                            </Box>
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2">Remote Backups</Typography>
                                    <Typography variant="body2">
                                        {storageStats ? formatBytes(storageStats.total_size) : 'N/A'}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={50} // Would need remote storage info
                                    sx={{ height: 8, borderRadius: 4 }}
                                    color="secondary"
                                />
                            </Box>
                        </Paper>
                    </Grid>

                    {/* System Metrics */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                System Metrics
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        CPU Usage
                                    </Typography>
                                    <Typography variant="h5">
                                        {systemStatus?.system_metrics?.cpu_percent?.toFixed(1) || 0}%
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Memory Usage
                                    </Typography>
                                    <Typography variant="h5">
                                        {systemStatus?.system_metrics?.memory_percent?.toFixed(1) || 0}%
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                        Load Average
                                    </Typography>
                                    <Typography variant="body1">
                                        {systemStatus?.system_metrics?.load_average?.join(', ') || 'N/A'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Recent Backups */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">Recent Backups</Typography>
                                <Button
                                    size="small"
                                    onClick={() => navigate('/backup')}
                                >
                                    View All
                                </Button>
                            </Box>
                            <List>
                                {backupHistory.length === 0 ? (
                                    <ListItem>
                                        <ListItemText
                                            primary="No backups yet"
                                            secondary="Start your first backup to protect your data"
                                        />
                                    </ListItem>
                                ) : (
                                    backupHistory.map((backup, index) => (
                                        <React.Fragment key={backup.id}>
                                            <ListItem>
                                                <ListItemIcon>
                                                    {getStatusIcon(backup.status)}
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Chip
                                                                label={backup.backup_type}
                                                                size="small"
                                                                color={backup.backup_type === 'full' ? 'primary' : 'default'}
                                                            />
                                                            <Typography variant="body2">
                                                                {format(new Date(backup.timestamp), 'MMM d, yyyy h:mm a')}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Box>
                                                            {backup.size_bytes && (
                                                                <Typography variant="caption">
                                                                    Size: {formatBytes(backup.size_bytes)}
                                                                </Typography>
                                                            )}
                                                            {backup.duration_seconds && (
                                                                <Typography variant="caption" sx={{ ml: 2 }}>
                                                                    Duration: {Math.round(backup.duration_seconds / 60)} min
                                                                </Typography>
                                                            )}
                                                            {backup.error_message && (
                                                                <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                                                                    {backup.error_message}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {index < backupHistory.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))
                                )}
                            </List>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </Container>
    );
};

export default DashboardPage;