// frontend/src/pages/MonitoringPage.tsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    ToggleButton,
    ToggleButtonGroup,
    CircularProgress,
    useTheme,
} from '@mui/material';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { fetchMetrics, fetchStorageStats, fetchBandwidthUsage } from '../store/monitoringSlice';

const MonitoringPage: React.FC = () => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const [metricsPeriod, setMetricsPeriod] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
    const [bandwidthPeriod, setBandwidthPeriod] = useState<'1h' | '24h' | '7d'>('24h');

    const { metrics, storage, bandwidth, loading } = useAppSelector((state) => state.monitoring);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [metricsPeriod, bandwidthPeriod]);

    const loadData = () => {
        dispatch(fetchMetrics(metricsPeriod));
        dispatch(fetchStorageStats());
        dispatch(fetchBandwidthUsage(bandwidthPeriod));
    };

    const formatBytes = (bytes: number): string => {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    const COLORS = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.warning.main];

    if (loading && !metrics) {
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
                <Typography variant="h4" component="h1" gutterBottom>
                    System Monitoring
                </Typography>

                {/* Current Metrics */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" gutterBottom>
                                    CPU Usage
                                </Typography>
                                <Typography variant="h4">
                                    {metrics?.current.cpu_percent.toFixed(1)}%
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" gutterBottom>
                                    Memory Usage
                                </Typography>
                                <Typography variant="h4">
                                    {metrics?.current.memory.percent.toFixed(1)}%
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {metrics && formatBytes(metrics.current.memory.used)} / {metrics && formatBytes(metrics.current.memory.total)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" gutterBottom>
                                    Disk Usage
                                </Typography>
                                <Typography variant="h4">
                                    {metrics?.current.disk.percent.toFixed(1)}%
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {metrics && formatBytes(metrics.current.disk.used)} / {metrics && formatBytes(metrics.current.disk.total)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" gutterBottom>
                                    Total Backups
                                </Typography>
                                <Typography variant="h4">
                                    {storage?.total_backups || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {storage && formatBytes(storage.total_size)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Historical Metrics */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6">System Metrics</Typography>
                        <ToggleButtonGroup
                            value={metricsPeriod}
                            exclusive
                            onChange={(_, v) => v && setMetricsPeriod(v)}
                            size="small"
                        >
                            <ToggleButton value="1h">1H</ToggleButton>
                            <ToggleButton value="6h">6H</ToggleButton>
                            <ToggleButton value="24h">24H</ToggleButton>
                            <ToggleButton value="7d">7D</ToggleButton>
                            <ToggleButton value="30d">30D</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                                CPU Usage
                            </Typography>
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={metrics?.history.cpu || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                                    />
                                    <YAxis />
                                    <Tooltip
                                        labelFormatter={(time) => new Date(time).toLocaleString()}
                                        formatter={(value: number) => `${value.toFixed(1)}%`}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={theme.palette.primary.main}
                                        fill={theme.palette.primary.main}
                                        fillOpacity={0.3}
                                        name="CPU %"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                                Memory Usage
                            </Typography>
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={metrics?.history.memory || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                                    />
                                    <YAxis />
                                    <Tooltip
                                        labelFormatter={(time) => new Date(time).toLocaleString()}
                                        formatter={(value: number) => `${value.toFixed(1)}%`}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={theme.palette.secondary.main}
                                        fill={theme.palette.secondary.main}
                                        fillOpacity={0.3}
                                        name="Memory %"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Storage Statistics */}
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Backup Types Distribution
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Full Backups', value: storage?.full_backups || 0 },
                                            { name: 'Incremental Backups', value: storage?.incremental_backups || 0 },
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.name}: ${entry.value}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {COLORS.map((color, index) => (
                                            <Cell key={`cell-${index}`} fill={color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Storage by Month
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={storage ? Object.entries(storage.by_month).map(([month, data]) => ({
                                        month,
                                        size: data.size / (1024 * 1024 * 1024), // Convert to GB
                                        count: data.count
                                    })) : []}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value: number, name) =>
                                            name === 'size' ? `${value.toFixed(2)} GB` : value
                                        }
                                    />
                                    <Legend />
                                    <Bar dataKey="size" fill={theme.palette.primary.main} name="Size (GB)" />
                                    <Bar dataKey="count" fill={theme.palette.secondary.main} name="Count" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Bandwidth Usage */}
                <Paper sx={{ p: 3, mt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6">Bandwidth Usage</Typography>
                        <ToggleButtonGroup
                            value={bandwidthPeriod}
                            exclusive
                            onChange={(_, v) => v && setBandwidthPeriod(v)}
                            size="small"
                        >
                            <ToggleButton value="1h">1H</ToggleButton>
                            <ToggleButton value="24h">24H</ToggleButton>
                            <ToggleButton value="7d">7D</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Average Speed
                            </Typography>
                            <Typography variant="h5">
                                {bandwidth?.average_speed_mbps.toFixed(1) || 0} MB/s
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Peak Speed
                            </Typography>
                            <Typography variant="h5">
                                {bandwidth?.peak_speed_mbps.toFixed(1) || 0} MB/s
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Total Transferred
                            </Typography>
                            <Typography variant="h5">
                                {bandwidth?.total_transferred_gb.toFixed(1) || 0} GB
                            </Typography>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        </Container>
    );
};

export default MonitoringPage;