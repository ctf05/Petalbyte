// frontend/src/pages/SetupPage.tsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Button,
    Paper,
    TextField,
    Alert,
    AlertTitle,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    IconButton,
    Tooltip,
    CircularProgress,
    Card,
    CardContent,
    Grid,
    FormHelperText,
} from '@mui/material';
import {
    Terminal as TerminalIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    ContentCopy as CopyIcon,
    Download as DownloadIcon,
    Storage as StorageIcon,
    Security as SecurityIcon,
    Folder as FolderIcon,
    Code as CodeIcon,
} from '@mui/icons-material';
import { setupApi } from '../api/setup';
import { useAppDispatch } from '../hooks/store';
import { showNotification } from '../store/notificationSlice';

interface DeviceInfo {
    name: string;
    path: string;
    size: string;
    size_mb: number;
    type: string;
    fstype: string;
    mountpoint: string;
}

interface SetupConfig {
    root_device: string;
    boot_device: string;
    username: string;
    compression: string;
}

const SetupPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const [activeStep, setActiveStep] = useState(0);
    const [devices, setDevices] = useState<DeviceInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<SetupConfig>({
        root_device: '/dev/nvme0n1p3',
        boot_device: '/dev/nvme0n1p1',
        username: '',
        compression: 'zstd:1',
    });

    const steps = [
        'First Installation',
        'Second Installation',
        'Configure & Run Script',
        'Post-Installation',
    ];

    useEffect(() => {
        detectDevices();
    }, []);

    const detectDevices = async () => {
        try {
            setLoading(true);
            const result = await setupApi.detectDevices();
            setDevices(result.devices);

            // Auto-fill detected devices
            if (result.boot_device) {
                setConfig(prev => ({ ...prev, boot_device: result.boot_device }));
            }
            if (result.root_device) {
                setConfig(prev => ({ ...prev, root_device: result.root_device }));
            }
        } catch (error) {
            console.error('Failed to detect devices:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadScript = async () => {
        try {
            const response = await setupApi.generateScript(config);
            const blob = new Blob([response], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'popos-btrfs-setup.sh';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            dispatch(showNotification({
                message: 'Setup script downloaded successfully',
                severity: 'success',
            }));
        } catch (error) {
            dispatch(showNotification({
                message: 'Failed to download script',
                severity: 'error',
            }));
        }
    };

    const copyCommand = (command: string) => {
        navigator.clipboard.writeText(command);
        dispatch(showNotification({
            message: 'Command copied to clipboard',
            severity: 'success',
        }));
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Box>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <AlertTitle>First Installation - Enable Encryption</AlertTitle>
                            This step sets up Pop!_OS with LUKS encryption enabled.
                        </Alert>

                        <List>
                            <ListItem>
                                <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                                <ListItemText
                                    primary="Boot from Pop!_OS installation media"
                                    secondary="Download Pop!_OS 24.04 and create bootable USB"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                                <ListItemText
                                    primary="Select language and keyboard layout"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                                <ListItemText
                                    primary="Choose 'Clean Install'"
                                    secondary="This will erase all data on the selected drive"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><SecurityIcon color="error" /></ListItemIcon>
                                <ListItemText
                                    primary="Enable 'Encrypt Drive' option"
                                    secondary="IMPORTANT: Remember your encryption password!"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><WarningIcon color="warning" /></ListItemIcon>
                                <ListItemText
                                    primary="Complete installation but DO NOT REBOOT"
                                    secondary="Click 'Quit' when installation finishes"
                                />
                            </ListItem>
                        </List>
                    </Box>
                );

            case 1:
                return (
                    <Box>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <AlertTitle>Second Installation - Setup Btrfs</AlertTitle>
                            This step converts the filesystem to btrfs. Do not skip any steps!
                        </Alert>

                        <List>
                            <ListItem>
                                <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                                <ListItemText
                                    primary="Reopen the installer"
                                    secondary="Activities → Install Pop!_OS"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                                <ListItemText
                                    primary="Choose 'Custom (Advanced)' installation"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><SecurityIcon color="primary" /></ListItemIcon>
                                <ListItemText
                                    primary="Unlock your encrypted partition"
                                    secondary="Enter the password you set in step 1"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><StorageIcon color="primary" /></ListItemIcon>
                                <ListItemText
                                    primary="Format 'data-root' as btrfs"
                                    secondary="Select data-root → Format → Choose 'btrfs' → Set mount point as '/'"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><WarningIcon color="warning" /></ListItemIcon>
                                <ListItemText
                                    primary="Complete installation but DO NOT REBOOT"
                                    secondary="Click 'Quit' when finished"
                                />
                            </ListItem>
                        </List>
                    </Box>
                );

            case 2:
                return (
                    <Box>
                        <Alert severity="success" sx={{ mb: 2 }}>
                            <AlertTitle>Configure & Run Setup Script</AlertTitle>
                            Configure your system settings and download the setup script.
                        </Alert>

                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    System Configuration
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Root Device</InputLabel>
                                    <Select
                                        value={config.root_device}
                                        onChange={(e) => setConfig({ ...config, root_device: e.target.value })}
                                        label="Root Device"
                                    >
                                        {devices
                                            .filter(d => d.fstype === 'crypto_LUKS' || d.type === 'part')
                                            .map(device => (
                                                <MenuItem key={device.path} value={device.path}>
                                                    {device.path} - {device.size} {device.fstype && `(${device.fstype})`}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                    <FormHelperText>Usually the encrypted partition</FormHelperText>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Boot Device</InputLabel>
                                    <Select
                                        value={config.boot_device}
                                        onChange={(e) => setConfig({ ...config, boot_device: e.target.value })}
                                        label="Boot Device"
                                    >
                                        {devices
                                            .filter(d => d.fstype === 'vfat' || (d.type === 'part' && d.size_mb < 1024))
                                            .map(device => (
                                                <MenuItem key={device.path} value={device.path}>
                                                    {device.path} - {device.size} {device.fstype && `(${device.fstype})`}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                    <FormHelperText>EFI boot partition (usually ~512MB FAT32)</FormHelperText>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Username"
                                    value={config.username}
                                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                                    required
                                    helperText="Your Pop!_OS username"
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Compression</InputLabel>
                                    <Select
                                        value={config.compression}
                                        onChange={(e) => setConfig({ ...config, compression: e.target.value })}
                                        label="Compression"
                                    >
                                        <MenuItem value="zstd:1">zstd:1 (Recommended - Fast)</MenuItem>
                                        <MenuItem value="zstd:2">zstd:2 (Balanced)</MenuItem>
                                        <MenuItem value="zstd:3">zstd:3 (Better compression)</MenuItem>
                                        <MenuItem value="lzo">lzo (Fastest)</MenuItem>
                                        <MenuItem value="zlib">zlib (Compatible)</MenuItem>
                                        <MenuItem value="none">none (No compression)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    startIcon={<DownloadIcon />}
                                    onClick={downloadScript}
                                    disabled={!config.username}
                                    fullWidth
                                >
                                    Download Configured Script
                                </Button>
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Run the Script
                                </Typography>
                                <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.900' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <TerminalIcon sx={{ mr: 1, color: 'success.main' }} />
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                                            chmod +x popos-btrfs-setup.sh
                                        </Typography>
                                        <IconButton size="small" onClick={() => copyCommand('chmod +x popos-btrfs-setup.sh')}>
                                            <CopyIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <TerminalIcon sx={{ mr: 1, color: 'success.main' }} />
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                                            sudo ./popos-btrfs-setup.sh
                                        </Typography>
                                        <IconButton size="small" onClick={() => copyCommand('sudo ./popos-btrfs-setup.sh')}>
                                            <CopyIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>
                );

            case 3:
                return (
                    <Box>
                        <Alert severity="success" sx={{ mb: 2 }}>
                            <AlertTitle>Post-Installation Setup</AlertTitle>
                            Final steps to complete your Petalbyte-ready system.
                        </Alert>

                        <Typography variant="h6" gutterBottom>
                            After Reboot
                        </Typography>

                        <List>
                            <ListItem>
                                <ListItemIcon><CodeIcon color="primary" /></ListItemIcon>
                                <ListItemText
                                    primary="Install btrfs tools"
                                    secondary={
                                        <Box component="span" sx={{ fontFamily: 'monospace' }}>
                                            sudo apt install btrfs-progs btrfs-compsize
                                        </Box>
                                    }
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                                <ListItemText
                                    primary="Verify compression is working"
                                    secondary={
                                        <Box component="span" sx={{ fontFamily: 'monospace' }}>
                                            sudo compsize /
                                        </Box>
                                    }
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><FolderIcon color="primary" /></ListItemIcon>
                                <ListItemText
                                    primary="Check subvolumes"
                                    secondary={
                                        <Box component="span" sx={{ fontFamily: 'monospace' }}>
                                            sudo btrfs subvolume list /
                                        </Box>
                                    }
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><StorageIcon color="success" /></ListItemIcon>
                                <ListItemText
                                    primary="Setup Petalbyte"
                                    secondary="Configure automated backups to your Unraid server"
                                />
                            </ListItem>
                        </List>

                        <Card sx={{ mt: 3, bgcolor: 'success.dark' }}>
                            <CardContent>
                                <Typography variant="h6" color="success.contrastText" gutterBottom>
                                    🎉 Setup Complete!
                                </Typography>
                                <Typography variant="body2" color="success.contrastText">
                                    Your Pop!_OS system is now configured with btrfs + LUKS encryption
                                    and ready for Petalbyte backups.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Pop!_OS Setup Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Follow this guide to install Pop!_OS 24.04 with btrfs filesystem and LUKS encryption,
                    optimized for Petalbyte backups.
                </Typography>

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                <Stepper activeStep={activeStep} orientation="vertical">
                    {steps.map((label, index) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                            <StepContent>
                                {renderStepContent(index)}
                                <Box sx={{ mb: 2, mt: 2 }}>
                                    <Button
                                        variant="contained"
                                        onClick={() => setActiveStep(index + 1)}
                                        sx={{ mt: 1, mr: 1 }}
                                        disabled={index === steps.length - 1}
                                    >
                                        Continue
                                    </Button>
                                    <Button
                                        disabled={index === 0}
                                        onClick={() => setActiveStep(index - 1)}
                                        sx={{ mt: 1, mr: 1 }}
                                    >
                                        Back
                                    </Button>
                                </Box>
                            </StepContent>
                        </Step>
                    ))}
                </Stepper>

                {activeStep === steps.length && (
                    <Paper square elevation={0} sx={{ p: 3 }}>
                        <Typography>All steps completed - your system is ready!</Typography>
                        <Button onClick={() => setActiveStep(0)} sx={{ mt: 1, mr: 1 }}>
                            Start Over
                        </Button>
                    </Paper>
                )}
            </Box>
        </Container>
    );
};

export default SetupPage;