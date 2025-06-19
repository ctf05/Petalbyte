// frontend/src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Divider,
    Alert,
    Chip,
    InputAdornment,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tab,
    Tabs,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import {
    Save as SaveIcon,
    RestartAlt as ResetIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Schedule as ScheduleIcon,
    Storage as StorageIcon,
    Security as SecurityIcon,
    Network as NetworkIcon,
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { loadSettings, updateSettings, resetSettings } from '@/store/settingsSlice';
import { showNotification } from '@/store/notificationSlice';

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

const SettingsPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { data: settings, saving } = useAppSelector((state) => state.settings);
    const [tabValue, setTabValue] = useState(0);
    const [localSettings, setLocalSettings] = useState<any>({});
    const [showPassword, setShowPassword] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (!settings) {
            dispatch(loadSettings());
        } else {
            setLocalSettings(settings);
        }
    }, [dispatch, settings]);

    const handleChange = (field: string, value: any) => {
        setLocalSettings({ ...localSettings, [field]: value });
        setHasChanges(true);
    };

    const handleScheduleDaysChange = (day: string) => {
        const currentDays = localSettings.backup_schedule_days || [];
        if (currentDays.includes(day)) {
            handleChange('backup_schedule_days', currentDays.filter((d: string) => d !== day));
        } else {
            handleChange('backup_schedule_days', [...currentDays, day]);
        }
    };

    const handleSave = async () => {
        try {
            await dispatch(updateSettings(localSettings)).unwrap();
            dispatch(showNotification({
                message: 'Settings saved successfully',
                severity: 'success',
            }));
            setHasChanges(false);
        } catch (error) {
            dispatch(showNotification({
                message: 'Failed to save settings',
                severity: 'error',
            }));
        }
    };

    const handleReset = async () => {
        try {
            await dispatch(resetSettings()).unwrap();
            dispatch(showNotification({
                message: 'Settings reset to defaults',
                severity: 'success',
            }));
            setResetDialogOpen(false);
            setHasChanges(false);
        } catch (error) {
            dispatch(showNotification({
                message: 'Failed to reset settings',
                severity: 'error',
            }));
        }
    };

    const weekDays = [
        { value: 'mon', label: 'Mon' },
        { value: 'tue', label: 'Tue' },
        { value: 'wed', label: 'Wed' },
        { value: 'thu', label: 'Thu' },
        { value: 'fri', label: 'Fri' },
        { value: 'sat', label: 'Sat' },
        { value: 'sun', label: 'Sun' },
    ];

    if (!localSettings.app_name) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <Typography>Loading settings...</Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h1">
                        Settings
                    </Typography>
                    <Box>
                        <Button
                            variant="outlined"
                            startIcon={<ResetIcon />}
                            onClick={() => setResetDialogOpen(true)}
                            sx={{ mr: 2 }}
                        >
                            Reset to Defaults
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                        >
                            Save Changes
                        </Button>
                    </Box>
                </Box>

                {hasChanges && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        You have unsaved changes. Don't forget to save!
                    </Alert>
                )}

                <Paper>
                    <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                        <Tab icon={<StorageIcon />} label="Backup" iconPosition="start" />
                        <Tab icon={<NetworkIcon />} label="Connection" iconPosition="start" />
                        <Tab icon={<ScheduleIcon />} label="Schedule" iconPosition="start" />
                        <Tab icon={<SecurityIcon />} label="Advanced" iconPosition="start" />
                    </Tabs>

                    <Box sx={{ p: 3 }}>
                        <TabPanel value={tabValue} index={0}>
                            <Typography variant="h6" gutterBottom>
                                Backup Settings
                            </Typography>
                            <Divider sx={{ mb: 3 }} />

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Months to Keep"
                                        type="number"
                                        value={localSettings.months_to_keep}
                                        onChange={(e) => handleChange('months_to_keep', parseInt(e.target.value))}
                                        InputProps={{
                                            inputProps: { min: 1, max: 24 }
                                        }}
                                        helperText="Number of monthly backups to retain"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Daily Incremental Days"
                                        type="number"
                                        value={localSettings.daily_incremental_days}
                                        onChange={(e) => handleChange('daily_incremental_days', parseInt(e.target.value))}
                                        InputProps={{
                                            inputProps: { min: 1, max: 365 }
                                        }}
                                        helperText="Days to keep incremental backups"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Local Snapshot Days"
                                        type="number"
                                        value={localSettings.local_snapshot_days}
                                        onChange={(e) => handleChange('local_snapshot_days', parseInt(e.target.value))}
                                        InputProps={{
                                            inputProps: { min: 1, max: 30 }
                                        }}
                                        helperText="Days to keep local snapshots"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Snapshot Directory"
                                        value={localSettings.snapshot_dir}
                                        onChange={(e) => handleChange('snapshot_dir', e.target.value)}
                                        helperText="Local directory for snapshots"
                                    />
                                </Grid>
                            </Grid>
                        </TabPanel>

                        <TabPanel value={tabValue} index={1}>
                            <Typography variant="h6" gutterBottom>
                                Unraid Connection
                            </Typography>
                            <Divider sx={{ mb: 3 }} />

                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={localSettings.use_tailscale}
                                                onChange={(e) => handleChange('use_tailscale', e.target.checked)}
                                            />
                                        }
                                        label="Use Tailscale VPN"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Unraid Tailscale Name"
                                        value={localSettings.unraid_tailscale_name}
                                        onChange={(e) => handleChange('unraid_tailscale_name', e.target.value)}
                                        helperText="Tailscale device name or IP"
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="SSH Port"
                                        type="number"
                                        value={localSettings.unraid_ssh_port}
                                        onChange={(e) => handleChange('unraid_ssh_port', parseInt(e.target.value))}
                                        InputProps={{
                                            inputProps: { min: 1, max: 65535 }
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="SSH User"
                                        value={localSettings.unraid_user}
                                        onChange={(e) => handleChange('unraid_user', e.target.value)}
                                        helperText="Usually 'root' for Unraid"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Backup Base Path"
                                        value={localSettings.unraid_base_path}
                                        onChange={(e) => handleChange('unraid_base_path', e.target.value)}
                                        helperText="Path on Unraid for backups"
                                    />
                                </Grid>
                            </Grid>
                        </TabPanel>

                        <TabPanel value={tabValue} index={2}>
                            <Typography variant="h6" gutterBottom>
                                Backup Schedule
                            </Typography>
                            <Divider sx={{ mb: 3 }} />

                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={localSettings.backup_schedule_enabled}
                                                onChange={(e) => handleChange('backup_schedule_enabled', e.target.checked)}
                                            />
                                        }
                                        label="Enable Scheduled Backups"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Backup Time"
                                        value={localSettings.backup_schedule_time}
                                        onChange={(e) => handleChange('backup_schedule_time', e.target.value)}
                                        disabled={!localSettings.backup_schedule_enabled}
                                        helperText="24-hour format (HH:MM)"
                                        placeholder="02:00"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Backup Days
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {weekDays.map((day) => (
                                            <Chip
                                                key={day.value}
                                                label={day.label}
                                                onClick={() => handleScheduleDaysChange(day.value)}
                                                color={localSettings.backup_schedule_days?.includes(day.value) ? 'primary' : 'default'}
                                                disabled={!localSettings.backup_schedule_enabled}
                                            />
                                        ))}
                                    </Box>
                                </Grid>
                            </Grid>
                        </TabPanel>

                        <TabPanel value={tabValue} index={3}>
                            <Typography variant="h6" gutterBottom>
                                Advanced Settings
                            </Typography>
                            <Divider sx={{ mb: 3 }} />

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Client Name"
                                        value={localSettings.client_name}
                                        disabled
                                        helperText="Auto-detected from hostname"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Tailscale Timeout"
                                        type="number"
                                        value={localSettings.tailscale_timeout}
                                        onChange={(e) => handleChange('tailscale_timeout', parseInt(e.target.value))}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">seconds</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Alert severity="info">
                                        <Typography variant="subtitle2" gutterBottom>
                                            Important Paths
                                        </Typography>
                                        <List dense>
                                            <ListItem>
                                                <ListItemText
                                                    primary="Encryption Key"
                                                    secondary={localSettings.encryption_key_path}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <ListItemText
                                                    primary="Database"
                                                    secondary={localSettings.sent_snapshots_db}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <ListItemText
                                                    primary="Settings File"
                                                    secondary={localSettings.settings_file}
                                                />
                                            </ListItem>
                                        </List>
                                    </Alert>
                                </Grid>
                            </Grid>
                        </TabPanel>
                    </Box>
                </Paper>
            </Box>

            {/* Reset Dialog */}
            <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
                <DialogTitle>Reset Settings to Defaults?</DialogTitle>
                <DialogContent>
                    <Alert severity="warning">
                        This will reset all settings to their default values. Your backups and data will not be affected.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleReset} color="error" variant="contained">
                        Reset Settings
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default SettingsPage;