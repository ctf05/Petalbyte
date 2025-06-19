// frontend/src/components/common/Layout.tsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    List,
    Typography,
    Divider,
    IconButton,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Badge,
    useTheme,
    useMediaQuery,
    Tooltip,
    Avatar,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    Backup as BackupIcon,
    Timeline as TimelineIcon,
    Settings as SettingsIcon,
    School as SchoolIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    CloudQueue as CloudIcon,
    Build as BuildIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../hooks/store';
import NotificationSnackbar from './NotificationSnackbar';

const drawerWidth = 240;

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [mobileOpen, setMobileOpen] = useState(false);

    const systemStatus = useAppSelector((state) => state.status.data);
    const dependencyIssues = useAppSelector((state) =>
        state.dependencies.items.filter(dep => dep.status !== 'ok').length
    );

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const menuItems = [
        {
            text: 'Dashboard',
            icon: <DashboardIcon />,
            path: '/dashboard',
        },
        {
            text: 'Backup',
            icon: <BackupIcon />,
            path: '/backup',
        },
        {
            text: 'Monitoring',
            icon: <TimelineIcon />,
            path: '/monitoring',
        },
        {
            text: 'Settings',
            icon: <SettingsIcon />,
            path: '/settings',
        },
        {
            text: 'Setup Guide',
            icon: <BuildIcon />,
            path: '/setup',
        },
        {
            text: 'Tutorial',
            icon: <SchoolIcon />,
            path: '/tutorial',
        },
        {
            text: 'Dependencies',
            icon: dependencyIssues > 0 ? (
                <Badge badgeContent={dependencyIssues} color="error">
                    <WarningIcon />
                </Badge>
            ) : (
                <CheckCircleIcon />
            ),
            path: '/dependencies',
        },
    ];

    const drawer = (
        <div>
            <Toolbar>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Avatar
                        sx={{
                            bgcolor: 'primary.main',
                            width: 36,
                            height: 36,
                            mr: 1,
                            fontSize: '1rem',
                        }}
                    >
                        P
                    </Avatar>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        Petalbyte
                    </Typography>
                </Box>
            </Toolbar>
            <Divider />
            <List>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => {
                                navigate(item.path);
                                if (isMobile) {
                                    setMobileOpen(false);
                                }
                            }}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider />
            <Box sx={{ p: 2, mt: 'auto' }}>
                <Typography variant="caption" color="text.secondary">
                    Version 1.0.0
                </Typography>
            </Box>
        </div>
    );

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        {menuItems.find(item => item.path === location.pathname)?.text || 'Petalbyte'}
                    </Typography>
                    <Tooltip title={systemStatus?.status || 'Unknown'}>
                        <CloudIcon
                            color={systemStatus?.status === 'healthy' ? 'success' : 'warning'}
                        />
                    </Tooltip>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                <Drawer
                    variant={isMobile ? 'temporary' : 'permanent'}
                    open={isMobile ? mobileOpen : true}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                    sx={{
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                        },
                    }}
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    mt: 8,
                    height: '100vh',
                    overflow: 'auto',
                }}
            >
                {children}
            </Box>
            <NotificationSnackbar />
        </Box>
    );
};

export default Layout;