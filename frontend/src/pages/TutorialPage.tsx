// frontend/src/pages/TutorialPage.tsx
import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Tab,
    Tabs,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Alert,
    AlertTitle,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    Divider,
    Card,
    CardContent,
    Grid,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Computer as ComputerIcon,
    Storage as StorageIcon,
    Backup as BackupIcon,
    Restore as RestoreIcon,
    CheckCircle as CheckIcon,
    Warning as WarningIcon,
    Schedule as ScheduleIcon,
    Security as SecurityIcon,
    Settings as SettingsIcon,
    CloudDownload as DownloadIcon,
    Folder as FolderIcon,
    Terminal as TerminalIcon,
} from '@mui/icons-material';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tutorial-tabpanel-${index}`}
            aria-labelledby={`tutorial-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
};

const TutorialPage: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Petalbyte Tutorial
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Complete guide for setting up and using Petalbyte backup system
                </Typography>

                <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={handleTabChange} aria-label="tutorial tabs">
                        <Tab label="Installing Pop!_OS" icon={<ComputerIcon />} iconPosition="start" />
                        <Tab label="Setup Unraid" icon={<StorageIcon />} iconPosition="start" />
                        <Tab label="Using Backups" icon={<BackupIcon />} iconPosition="start" />
                        <Tab label="Restoring" icon={<RestoreIcon />} iconPosition="start" />
                    </Tabs>
                </Paper>

                <TabPanel value={tabValue} index={0}>
                    <Typography variant="h5" gutterBottom>
                        Installing Pop!_OS with Btrfs
                    </Typography>

                    <Alert severity="info" sx={{ mb: 3 }}>
                        <AlertTitle>Prerequisites</AlertTitle>
                        <List dense>
                            <ListItem>
                                <ListItemText primary="Pop!_OS 24.04 installation USB" />
                            </ListItem>
                            <ListItem>
                                <ListItemText primary="UEFI-capable system" />
                            </ListItem>
                            <ListItem>
                                <ListItemText primary="At least 20GB of storage" />
                            </ListItem>
                        </List>
                    </Alert>

                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Why Btrfs + LUKS?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                <ListItem>
                                    <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                                    <ListItemText
                                        primary="Snapshots"
                                        secondary="Instant, space-efficient backups of your system"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                                    <ListItemText
                                        primary="Compression"
                                        secondary="Save 30-50% disk space with transparent compression"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                                    <ListItemText
                                        primary="Encryption"
                                        secondary="Full disk encryption protects your data"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                                    <ListItemText
                                        primary="Subvolumes"
                                        secondary="Separate system and home for flexible backups"
                                    />
                                </ListItem>
                            </List>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Installation Process</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="subtitle2" gutterBottom>
                                The process requires two installation runs:
                            </Typography>
                            <List>
                                <ListItem>
                                    <ListItemText
                                        primary="1. First run: Enable encryption"
                                        secondary="Standard installation with 'Encrypt Drive' checked"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="2. Second run: Convert to Btrfs"
                                        secondary="Custom installation to format as Btrfs"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="3. Run setup script"
                                        secondary="Configure subvolumes and compression"
                                    />
                                </ListItem>
                            </List>
                            <Alert severity="warning" sx={{ mt: 2 }}>
                                <AlertTitle>Important</AlertTitle>
                                Do not reboot between installations! Complete both runs before restarting.
                            </Alert>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Common Issues</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                <ListItem>
                                    <ListItemIcon><WarningIcon color="warning" /></ListItemIcon>
                                    <ListItemText
                                        primary="Cannot find encrypted partition"
                                        secondary="Look for the partition labeled 'crypto_LUKS' - usually the largest one"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><WarningIcon color="warning" /></ListItemIcon>
                                    <ListItemText
                                        primary="Boot fails after setup"
                                        secondary="Boot from USB, unlock drive, mount subvolumes, and check /etc/fstab entries"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><WarningIcon color="warning" /></ListItemIcon>
                                    <ListItemText
                                        primary="Script fails to mount"
                                        secondary="Ensure the LUKS container is unlocked and device names are correct"
                                    />
                                </ListItem>
                            </List>
                        </AccordionDetails>
                    </Accordion>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Typography variant="h5" gutterBottom>
                        Setting Up Unraid for Petalbyte
                    </Typography>

                    <Alert severity="success" sx={{ mb: 3 }}>
                        <AlertTitle>Unraid Configuration</AlertTitle>
                        Unraid provides the perfect backup destination with built-in redundancy and easy management.
                    </Alert>

                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Create Backup Share</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                <ListItem>
                                    <ListItemText
                                        primary="1. Open Unraid web interface"
                                        secondary="Navigate to Shares tab"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="2. Add new share named 'backups'"
                                        secondary="Set minimum free space to 100GB+"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="3. Configure share settings"
                                        secondary="Export: No, Security: Private"
                                    />
                                </ListItem>
                            </List>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Install Tailscale Plugin</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                <ListItem>
                                    <ListItemText
                                        primary="1. Install from Community Applications"
                                        secondary="Search for 'Tailscale' in CA"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="2. Authenticate Tailscale"
                                        secondary="Use same account as your backup clients"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="3. Note the device name"
                                        secondary="This will be used in Petalbyte settings"
                                    />
                                </ListItem>
                            </List>
                            <Chip label="Tip" color="primary" size="small" sx={{ mt: 1 }} />
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                Tailscale provides secure, encrypted connections without port forwarding.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Enable SSH & Configure Keys</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                <ListItem>
                                    <ListItemText
                                        primary="1. Enable SSH"
                                        secondary="Settings → SSH Server → Enable SSH: Yes"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="2. Permit Root Login: Yes"
                                        secondary="Required for backup operations"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="3. Add SSH public key"
                                        secondary="Copy from Petalbyte dependencies page → paste to /root/.ssh/authorized_keys"
                                    />
                                </ListItem>
                            </List>
                            <Alert severity="info" sx={{ mt: 2 }}>
                                The SSH key will be generated automatically when you first run Petalbyte.
                            </Alert>
                        </AccordionDetails>
                    </Accordion>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <Typography variant="h5" gutterBottom>
                        Using the Backup System
                    </Typography>

                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Initial Setup</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                <ListItem>
                                    <ListItemIcon><CheckIcon /></ListItemIcon>
                                    <ListItemText
                                        primary="Configure Petalbyte settings"
                                        secondary="Enter your Unraid Tailscale name and backup path"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><SecurityIcon /></ListItemIcon>
                                    <ListItemText
                                        primary="Check dependencies"
                                        secondary="Go to Dependencies page and fix any issues"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><ScheduleIcon /></ListItemIcon>
                                    <ListItemText
                                        primary="Set backup schedule"
                                        secondary="Configure automatic daily backups at your preferred time"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><BackupIcon /></ListItemIcon>
                                    <ListItemText
                                        primary="Run first backup"
                                        secondary="Manually trigger your first full backup"
                                    />
                                </ListItem>
                            </List>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Backup Types</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" color="primary" gutterBottom>
                                                Full Backup
                                            </Typography>
                                            <List dense>
                                                <ListItem>
                                                    <ListItemText primary="Automatic on 1st of each month" />
                                                </ListItem>
                                                <ListItem>
                                                    <ListItemText primary="Complete system snapshot" />
                                                </ListItem>
                                                <ListItem>
                                                    <ListItemText primary="No dependencies on other backups" />
                                                </ListItem>
                                                <ListItem>
                                                    <ListItemText primary="Larger size but complete" />
                                                </ListItem>
                                            </List>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" color="secondary" gutterBottom>
                                                Incremental Backup
                                            </Typography>
                                            <List dense>
                                                <ListItem>
                                                    <ListItemText primary="Daily (except 1st of month)" />
                                                </ListItem>
                                                <ListItem>
                                                    <ListItemText primary="Only changes since last backup" />
                                                </ListItem>
                                                <ListItem>
                                                    <ListItemText primary="Requires parent snapshot" />
                                                </ListItem>
                                                <ListItem>
                                                    <ListItemText primary="Much smaller and faster" />
                                                </ListItem>
                                            </List>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Monitoring Backups</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                <ListItem>
                                    <ListItemIcon><BackupIcon /></ListItemIcon>
                                    <ListItemText
                                        primary="Dashboard Overview"
                                        secondary="Quick status of last backup and next scheduled run"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><StorageIcon /></ListItemIcon>
                                    <ListItemText
                                        primary="Backup History"
                                        secondary="View all past backups with size and duration"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><WarningIcon /></ListItemIcon>
                                    <ListItemText
                                        primary="Failed Backups"
                                        secondary="Automatic cleanup and retry on next schedule"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><FolderIcon /></ListItemIcon>
                                    <ListItemText
                                        primary="Browse Remote Backups"
                                        secondary="View backups stored on Unraid by month"
                                    />
                                </ListItem>
                            </List>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Important Notes</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <AlertTitle>Encryption Key Backup</AlertTitle>
                                Your encryption key is stored at <code>/app/data/backup-encryption.key</code>.
                                Back this up! You cannot restore backups without it.
                            </Alert>
                            <Alert severity="info">
                                <AlertTitle>Storage Requirements</AlertTitle>
                                Plan for 2-3x your data size on Unraid. Full backups are compressed but still substantial.
                            </Alert>
                        </AccordionDetails>
                    </Accordion>
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                    <Typography variant="h5" gutterBottom>
                        Restoring from Backups
                    </Typography>

                    <Alert severity="error" sx={{ mb: 3 }}>
                        <AlertTitle>Before You Restore</AlertTitle>
                        Restoring will overwrite existing data. Always backup current state before restoring!
                    </Alert>

                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Types of Restore</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                Full System Restore
                                            </Typography>
                                            <Typography variant="body2" paragraph>
                                                Restore both @ and @home subvolumes to recover entire system.
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Use when: System failure, major corruption, or fresh install
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                Selective Restore
                                            </Typography>
                                            <Typography variant="body2" paragraph>
                                                Restore only specific subvolumes or to alternate location.
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Use when: Recovering specific files or testing backups
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Restore Process</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                <ListItem>
                                    <ListItemIcon>1</ListItemIcon>
                                    <ListItemText
                                        primary="Boot from Live USB"
                                        secondary="Use Pop!_OS installation media"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>2</ListItemIcon>
                                    <ListItemText
                                        primary="Install Petalbyte in live environment"
                                        secondary="Run the Docker container from live session"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>3</ListItemIcon>
                                    <ListItemText
                                        primary="Select backup to restore"
                                        secondary="Choose date and backup type (full/incremental)"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>4</ListItemIcon>
                                    <ListItemText
                                        primary="Verify backup integrity"
                                        secondary="Run verification before restore"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>5</ListItemIcon>
                                    <ListItemText
                                        primary="Perform restore"
                                        secondary="Download and decrypt backup, then restore to filesystem"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>6</ListItemIcon>
                                    <ListItemText
                                        primary="Update bootloader if needed"
                                        secondary="Reinstall GRUB if system restore was performed"
                                    />
                                </ListItem>
                            </List>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Emergency Recovery</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="subtitle2" gutterBottom>
                                If your system won't boot:
                            </Typography>
                            <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                                    # Boot from USB and open terminal
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                                    # Unlock encrypted drive
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                                    cryptsetup luksOpen /dev/nvme0n1p3 cryptdata
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                                    # Mount subvolumes
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                                    mount -o subvol=@ /dev/mapper/cryptdata /mnt
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                                    mount -o subvol=@home /dev/mapper/cryptdata /mnt/home
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                                    mount /dev/nvme0n1p1 /mnt/boot/efi
                                </Typography>
                            </Paper>
                            <Alert severity="info">
                                After mounting, you can either fix issues manually or proceed with restore.
                            </Alert>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Testing Backups</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body1" paragraph>
                                Regular testing ensures your backups are valid and restorable:
                            </Typography>
                            <List>
                                <ListItem>
                                    <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                                    <ListItemText
                                        primary="Monthly verification"
                                        secondary="Use 'Verify Only' option to check backup integrity"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                                    <ListItemText
                                        primary="Test restore to alternate location"
                                        secondary="Restore to /tmp/test-restore to verify process"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                                    <ListItemText
                                        primary="Document restore time"
                                        secondary="Know how long recovery takes for planning"
                                    />
                                </ListItem>
                            </List>
                        </AccordionDetails>
                    </Accordion>
                </TabPanel>
            </Box>
        </Container>
    );
};

export default TutorialPage;