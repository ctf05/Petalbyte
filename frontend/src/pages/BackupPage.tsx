// frontend/src/pages/BackupPage.tsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Paper,
    Grid,
    Card,
    CardContent,
    CardActions,
    LinearProgress,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Alert,
    Tab,
    Tabs,
} from '@mui/material';
import {
    PlayArrow as StartIcon,
    Stop as StopIcon,
    Refresh as RefreshIcon,
    Info as InfoIcon,
    CloudUpload as UploadIcon,
    CloudDownload as DownloadIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import {
    startBackup,
    cancelBackup,
    fetchBackupHistory,
    fetchBackupProgress,
} from '@/store/backupSlice';
import { showNotification } from '@/store/notificationSlice';
import { WebSocketClient } from '@/api/client';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
    return (
        <Box hidden={value !== index} sx={{ pt: 3 }}>
            {value === index && children}
        </Box>
    );
};

const BackupPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const [tabValue, setTabValue] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [startDialogOpen, setStartDialogOpen] = useState(false);
    const [backupType, setBackupType] = useState<'full' | 'incremental'>('incremental');
    const [forceFullBackup, setForceFullBackup] = useState(false);
    const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);

    const currentBackup = useAppSelector((state) => state.backup.currentBackup);
    const progress = useAppSelector((state) => state.backup.progress);
    const history = useAppSelector((state) => state.backup.history);
    const systemStatus = useAppSelector((state) => state.status.data);

    useEffect(() => {
        // Load backup history
        dispatch(fetchBackupHistory());

        // Setup WebSocket for progress updates
        const client = new WebSocketClient('/ws/progress');
        client.connect(
            (data) => {
                if (data.type === 'progress') {
                    dispatch({ type: 'backup/updateProgress', payload: data });
                }
            },
            () => console.log('Progress WebSocket connected'),
            () => console.log('Progress WebSocket disconnected')
        );
        setWsClient(client);

        // Poll for progress if backup is running
        const interval = setInterval(() => {
            if (systemStatus?.backup_running) {
                dispatch(fetchBackupProgress());
            }
        }, 2000);

        return () => {
            clearInterval(interval);
            client.disconnect();
        };
    }, [dispatch, systemStatus?.backup_running]);

    const handleStartBackup = async () => {
        try {
            await dispatch(startBackup({
                backup_type: backupType,
                force_full: forceFullBackup,
            })).unwrap();

            dispatch(showNotification({
                message: 'Backup started successfully',
                severity: 'success',
            }));
            setStartDialogOpen(false);
        } catch (error) {
            dispatch(showNotification({
                message: 'Failed to start backup',
                severity: 'error',
            }));
        }
    };

    const handleCancelBackup = async () => {
        try {
            await dispatch(cancelBackup()).unwrap();
            dispatch(showNotification({
                message: 'Backup cancelled',
                severity: 'info',
            }));
        } catch (error) {
            dispatch(showNotification({
                message: 'Failed to cancel backup',
                severity: 'error',
            }));
        }
    };

    const formatBytes = (bytes: number): string => {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'success';
            case 'failed':
                return 'error';
            case 'partial':
                return 'warning';
            case 'running':
                return 'info';
            default:
                return 'default';
        }
    };

    const isBackupRunning = systemStatus?.backup_running || false;

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h1">
                        Backup Management
                    </Typography>
                    <Box>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={() => dispatch(fetchBackupHistory())}
                            sx={{ mr: 2 }}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={isBackupRunning ? <StopIcon /> : <StartIcon />}
                            onClick={isBackupRunning ? handleCancelBackup : () => setStartDialogOpen(true)}
                            color={isBackupRunning ? 'error' : 'primary'}
                        >
                            {isBackupRunning ? 'Cancel Backup' : 'Start Backup'}
                        </Button>
                    </Box>
                </Box>

                {/* Current Backup Progress */}
                {isBackupRunning && progress && (
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Backup in Progress
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2">
                                        {progress.current_step} ({progress.current_step_num}/{progress.total_steps})
                                    </Typography>
                                    <Typography variant="body2">{progress.percentage.toFixed(1)}%</Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={progress.percentage} />
                            </Box>
                            {progress.current_file && (
                                <Typography variant="body2" color="text.secondary">
                                    Current file: {progress.current_file}
                                </Typography>
                            )}
                            {progress.speed_mbps && (
                                <Typography variant="body2" color="text.secondary">
                                    Speed: {progress.speed_mbps.toFixed(1)} MB/s
                                </Typography>
                            )}
                            {progress.eta_seconds && (
                                <Typography variant="body2" color="text.secondary">
                                    ETA: {formatDuration(progress.eta_seconds)}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Paper>
                    <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                        <Tab label="History" />
                        <Tab label="Browse Backups" />
                    </Tabs>

                    <TabPanel value={tabValue} index={0}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Size</TableCell>
                                        <TableCell>Duration</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {history
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((backup) => (
                                            <TableRow key={backup.id}>
                                                <TableCell>
                                                    {format(new Date(backup.timestamp), 'MMM d, yyyy h:mm a')}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={backup.backup_type}
                                                        size="small"
                                                        color={backup.backup_type === 'full' ? 'primary' : 'default'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={backup.status}
                                                        size="small"
                                                        color={getStatusColor(backup.status) as any}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {backup.size_bytes ? formatBytes(backup.size_bytes) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {backup.duration_seconds ? formatDuration(backup.duration_seconds) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton size="small">
                                                        <InfoIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    {history.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">
                                                <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                                    No backup history available
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={history.length}
                            page={page}
                            onPageChange={(e, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                        />
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <BrowseBackupsTab />
                    </TabPanel>
                </Paper>
            </Box>

            {/* Start Backup Dialog */}
            <Dialog open={startDialogOpen} onClose={() => setStartDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Start Backup</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Backup Type</InputLabel>
                            <Select
                                value={backupType}
                                onChange={(e) => setBackupType(e.target.value as 'full' | 'incremental')}
                                label="Backup Type"
                            >
                                <MenuItem value="incremental">Incremental (Recommended)</MenuItem>
                                <MenuItem value="full">Full Backup</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={forceFullBackup}
                                    onChange={(e) => setForceFullBackup(e.target.checked)}
                                />
                            }
                            label="Force full backup (ignore schedule)"
                        />

                        <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                                • Incremental backups only send changes since the last backup
                            </Typography>
                            <Typography variant="body2">
                                • Full backups send all data and are automatically done on the 1st of each month
                            </Typography>
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStartDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleStartBackup} variant="contained" startIcon={<StartIcon />}>
                        Start Backup
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

// Browse Backups Tab Component
const BrowseBackupsTab: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [browseData, setBrowseData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadMonths();
    }, []);

    const loadMonths = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/backup/browse');
            const data = await response.json();
            setBrowseData(data);
        } catch (error) {
            console.error('Failed to load backup months:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMonthBackups = async (month: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/backup/browse?month=${month}`);
            const data = await response.json();
            setBrowseData(data);
            setSelectedMonth(month);
        } catch (error) {
            console.error('Failed to load month backups:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatMonthYear = (monthStr: string): string => {
        const year = monthStr.substring(0, 4);
        const month = monthStr.substring(4, 6);
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return format(date, 'MMMM yyyy');
    };

    const formatBytes = (bytes: number): string => {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Typography>Loading...</Typography>
            </Box>
        );
    }

    if (!selectedMonth && browseData?.months) {
        return (
            <Grid container spacing={2}>
                {browseData.months.map((month: string) => (
                    <Grid item xs={12} sm={6} md={4} key={month}>
                        <Card
                            sx={{ cursor: 'pointer' }}
                            onClick={() => loadMonthBackups(month)}
                        >
                            <CardContent>
                                <Typography variant="h6">
                                    {formatMonthYear(month)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Click to browse backups
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                {browseData.months.length === 0 && (
                    <Grid item xs={12}>
                        <Typography variant="body1" color="text.secondary" align="center">
                            No backups found on Unraid
                        </Typography>
                    </Grid>
                )}
            </Grid>
        );
    }

    if (selectedMonth && browseData) {
        return (
            <Box>
                <Button
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                        setSelectedMonth('');
                        loadMonths();
                    }}
                    sx={{ mb: 2 }}
                >
                    Back to Months
                </Button>

                <Typography variant="h6" gutterBottom>
                    {formatMonthYear(selectedMonth)}
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Full Backups ({browseData.full_backups?.length || 0})
                            </Typography>
                            <List>
                                {browseData.full_backups?.map((file: any) => (
                                    <ListItem key={file.name}>
                                        <ListItemIcon>
                                            <UploadIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={file.name}
                                            secondary={`${formatBytes(file.size)} • ${file.modified}`}
                                        />
                                    </ListItem>
                                )) || (
                                    <ListItem>
                                        <ListItemText
                                            primary="No full backups"
                                            secondary="Full backups are created on the 1st of each month"
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Incremental Backups ({browseData.incremental_backups?.length || 0})
                            </Typography>
                            <List>
                                {browseData.incremental_backups?.map((file: any) => (
                                    <ListItem key={file.name}>
                                        <ListItemIcon>
                                            <DownloadIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={file.name}
                                            secondary={`${formatBytes(file.size)} • ${file.modified}`}
                                        />
                                    </ListItem>
                                )) || (
                                    <ListItem>
                                        <ListItemText
                                            primary="No incremental backups"
                                            secondary="Incremental backups contain only changes since the last backup"
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        );
    }

    return null;
};

export default BackupPage;