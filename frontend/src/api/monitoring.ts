// frontend/src/api/monitoring.ts
import { apiClient } from './client';

export interface SystemMetrics {
    current: {
        timestamp: string;
        cpu_percent: number;
        memory: {
            percent: number;
            used: number;
            total: number;
        };
        disk: {
            percent: number;
            used: number;
            total: number;
        };
        network: {
            bytes_sent: number;
            bytes_recv: number;
        };
    };
    history: {
        cpu: Array<{ timestamp: string; value: number }>;
        memory: Array<{ timestamp: string; value: number }>;
        disk: Array<{ timestamp: string; value: number }>;
        bandwidth: Array<{ timestamp: string; value: number }>;
    };
    period: string;
}

export interface StorageStats {
    total_size: number;
    total_backups: number;
    full_backups: number;
    incremental_backups: number;
    by_month: Record<string, { count: number; size: number }>;
    by_subvolume: Record<string, { count: number; size: number }>;
}

export interface BandwidthUsage {
    period: string;
    average_speed_mbps: number;
    peak_speed_mbps: number;
    total_transferred_gb: number;
}

export const monitoringApi = {
    async getMetrics(period: '1h' | '6h' | '24h' | '7d' | '30d' = '1h'): Promise<SystemMetrics> {
        const response = await apiClient.get<SystemMetrics>('/api/monitoring/metrics', {
            params: { period },
        });
        return response.data;
    },

    async getStorageStats(): Promise<StorageStats> {
        const response = await apiClient.get<StorageStats>('/api/monitoring/storage');
        return response.data;
    },

    async getBandwidthUsage(period: '1h' | '24h' | '7d' = '24h'): Promise<BandwidthUsage> {
        const response = await apiClient.get<BandwidthUsage>('/api/monitoring/bandwidth', {
            params: { period },
        });
        return response.data;
    },
};