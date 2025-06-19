// frontend/src/api/status.ts
import { apiClient } from './client';
import { DependencyInfo } from './dependencies';

export interface SystemStatus {
    status: 'healthy' | 'degraded' | 'error' | 'busy';
    backup_running: boolean;
    last_backup?: {
        backup_id: number;
        status: string;
        backup_type: string;
        start_time: string;
        duration_seconds?: number;
        size_bytes?: number;
        error_message?: string;
    };
    next_scheduled?: string;
    dependencies: DependencyInfo[];
    disk_space: {
        total: number;
        used: number;
        free: number;
        percent: number;
    };
    system_metrics: {
        cpu_percent: number;
        memory_percent: number;
        load_average: number[];
        uptime: number;
    };
}

export interface HealthCheck {
    status: string;
    service: string;
    timestamp: string;
}

export interface VersionInfo {
    name: string;
    version: string;
    description: string;
    api_version: string;
}

export const statusApi = {
    async getSystemStatus(): Promise<SystemStatus> {
        const response = await apiClient.get<SystemStatus>('/api/status');
        return response.data;
    },

    async healthCheck(): Promise<HealthCheck> {
        const response = await apiClient.get<HealthCheck>('/api/status/health');
        return response.data;
    },

    async getVersion(): Promise<VersionInfo> {
        const response = await apiClient.get<VersionInfo>('/api/status/version');
        return response.data;
    },
};