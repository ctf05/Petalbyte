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
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Computer as ComputerIcon,
    Storage as StorageIcon,
    Backup as BackupIcon,
    Restore as RestoreIcon,
    CheckCircle as CheckIcon,
    Warning as WarningIcon,
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
                            <Typography variant="h6">Enable SSH</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                <ListItem>
                                    <ListItemText
                                        primary="Settings → SSH Server"
                                        secondary="Enable SSH: Yes"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="Permit Root Login: Yes"
                                        secondary="Required for backup operations"
                                    />
                                </ListItem>
                            </List>
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
                                        secondary="Enter