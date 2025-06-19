// frontend/src/pages/DependenciesPage.tsx
import React, { useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    Button,
    Chip,
    CircularProgress,
    Alert,
    AlertTitle,
    Collapse,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    CheckCircle as CheckIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Build as FixIcon,
    Refresh as RefreshIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { checkDependencies, fixDependency } from '../store/dependenciesSlice';
import { showNotification } from '../store/notificationSlice';

const DependenciesPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { items, loading, fixing } = useAppSelector((state) => state.dependencies);
    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

    useEffect(() => {
        dispatch(checkDependencies());
    }, [dispatch]);

    const handleFix = async (name: string) => {
        try {
            const result = await dispatch(fixDependency(name)).unwrap();
            if (result.result.success) {
                dispatch(showNotification({
                    message: `Fixed: ${result.result.message}`,
                    severity: 'success',
                }));
            } else {
                dispatch(showNotification({
                    message: `Fix failed: ${result.result.message}`,
                    severity: 'error',
                }));
            }
        } catch (error) {
            dispatch(showNotification({
                message: 'Failed to fix dependency',
                severity: 'error',
            }));
        }
    };

    const toggleExpanded = (name: string) => {
        setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ok':
                return <CheckIcon color="success" />;
            case 'warning':
                return <WarningIcon color="warning" />;
            case 'error':
                return <ErrorIcon color="error" />;
            default:
                return <InfoIcon />;
        }
    };

    const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
        switch (status) {
            case 'ok':
                return 'success';
            case 'warning':
                return 'warning';
            case 'error':
                return 'error';
            default:
                return 'default';
        }
    };

    const criticalDependencies = items.filter((d) => d.status === 'error');
    const warningDependencies = items.filter((d) => d.status === 'warning');
    const okDependencies = items.filter((d) => d.status === 'ok');

    if (loading && items.length === 0) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h1">
                        System Dependencies
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => dispatch(checkDependencies())}
                        disabled={loading}
                    >
                        Recheck All
                    </Button>
                </Box>

                {criticalDependencies.length > 0 && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        <AlertTitle>Critical Issues</AlertTitle>
                        {criticalDependencies.length} critical {criticalDependencies.length === 1 ? 'dependency' : 'dependencies'} need attention. Backups may not work properly until resolved.
                    </Alert>
                )}

                {warningDependencies.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        <AlertTitle>Warnings</AlertTitle>
                        {warningDependencies.length} {warningDependencies.length === 1 ? 'dependency has' : 'dependencies have'} warnings that may affect functionality.
                    </Alert>
                )}

                {criticalDependencies.length === 0 && warningDependencies.length === 0 && (
                    <Alert severity="success" sx={{ mb: 3 }}>
                        <AlertTitle>All Systems Go!</AlertTitle>
                        All dependencies are satisfied. Your backup system is ready.
                    </Alert>
                )}

                <Paper>
                    <List>
                        {/* Critical Dependencies First */}
                        {criticalDependencies.map((dep) => (
                            <React.Fragment key={dep.name}>
                                <ListItem>
                                    <ListItemIcon>{getStatusIcon(dep.status)}</ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="subtitle1">{dep.display_name}</Typography>
                                                <Chip
                                                    label={dep.status}
                                                    color={getStatusColor(dep.status)}
                                                    size="small"
                                                />
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="body2" color="text.secondary">
                                                    {dep.description}
                                                </Typography>
                                                <Typography variant="body2" sx={{ mt: 1 }}>
                                                    {dep.message}
                                                </Typography>
                                            </>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            {dep.metadata && Object.keys(dep.metadata).length > 0 && (
                                                <IconButton onClick={() => toggleExpanded(dep.name)}>
                                                    {expanded[dep.name] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                </IconButton>
                                            )}
                                            {dep.can_fix && dep.status !== 'ok' && (
                                                <Tooltip title="Attempt automatic fix">
                                                    <span>
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            startIcon={fixing[dep.name] ? <CircularProgress size={16} /> : <FixIcon />}
                                                            onClick={() => handleFix(dep.name)}
                                                            disabled={fixing[dep.name]}
                                                        >
                                                            Fix
                                                        </Button>
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                {dep.metadata && Object.keys(dep.metadata).length > 0 && (
                                    <Collapse in={expanded[dep.name]} timeout="auto" unmountOnExit>
                                        <Box sx={{ pl: 9, pr: 3, pb: 2 }}>
                                            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Additional Information
                                                </Typography>
                                                {Object.entries(dep.metadata).map(([key, value]) => (
                                                    <Typography key={key} variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                        {key}: {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                                    </Typography>
                                                ))}
                                            </Paper>
                                        </Box>
                                    </Collapse>
                                )}
                            </React.Fragment>
                        ))}

                        {/* Warning Dependencies */}
                        {warningDependencies.map((dep) => (
                            <React.Fragment key={dep.name}>
                                <ListItem>
                                    <ListItemIcon>{getStatusIcon(dep.status)}</ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="subtitle1">{dep.display_name}</Typography>
                                                <Chip
                                                    label={dep.status}
                                                    color={getStatusColor(dep.status)}
                                                    size="small"
                                                />
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="body2" color="text.secondary">
                                                    {dep.description}
                                                </Typography>
                                                <Typography variant="body2" sx={{ mt: 1 }}>
                                                    {dep.message}
                                                </Typography>
                                            </>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            {dep.metadata && Object.keys(dep.metadata).length > 0 && (
                                                <IconButton onClick={() => toggleExpanded(dep.name)}>
                                                    {expanded[dep.name] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                </IconButton>
                                            )}
                                            {dep.can_fix && dep.status !== 'ok' && (
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={fixing[dep.name] ? <CircularProgress size={16} /> : <FixIcon />}
                                                    onClick={() => handleFix(dep.name)}
                                                    disabled={fixing[dep.name]}
                                                >
                                                    Fix
                                                </Button>
                                            )}
                                        </Box>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                {dep.metadata && Object.keys(dep.metadata).length > 0 && (
                                    <Collapse in={expanded[dep.name]} timeout="auto" unmountOnExit>
                                        <Box sx={{ pl: 9, pr: 3, pb: 2 }}>
                                            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Additional Information
                                                </Typography>
                                                {Object.entries(dep.metadata).map(([key, value]) => (
                                                    <Typography key={key} variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                        {key}: {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                                    </Typography>
                                                ))}
                                            </Paper>
                                        </Box>
                                    </Collapse>
                                )}
                            </React.Fragment>
                        ))}

                        {/* OK Dependencies */}
                        {okDependencies.map((dep) => (
                            <React.Fragment key={dep.name}>
                                <ListItem>
                                    <ListItemIcon>{getStatusIcon(dep.status)}</ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="subtitle1">{dep.display_name}</Typography>
                                                <Chip
                                                    label={dep.status}
                                                    color={getStatusColor(dep.status)}
                                                    size="small"
                                                />
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="body2" color="text.secondary">
                                                    {dep.description}
                                                </Typography>
                                                <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>
                                                    {dep.message}
                                                </Typography>
                                            </>
                                        }
                                    />
                                    {dep.metadata && Object.keys(dep.metadata).length > 0 && (
                                        <ListItemSecondaryAction>
                                            <IconButton onClick={() => toggleExpanded(dep.name)}>
                                                {expanded[dep.name] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    )}
                                </ListItem>
                                {dep.metadata && Object.keys(dep.metadata).length > 0 && (
                                    <Collapse in={expanded[dep.name]} timeout="auto" unmountOnExit>
                                        <Box sx={{ pl: 9, pr: 3, pb: 2 }}>
                                            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Additional Information
                                                </Typography>
                                                {Object.entries(dep.metadata).map(([key, value]) => (
                                                    <Typography key={key} variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                        {key}: {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                                    </Typography>
                                                ))}
                                            </Paper>
                                        </Box>
                                    </Collapse>
                                )}
                            </React.Fragment>
                        ))}
                    </List>
                </Paper>
            </Box>
        </Container>
    );
};

export default DependenciesPage;