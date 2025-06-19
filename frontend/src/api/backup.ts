// frontend/src/api/backup.ts
import { apiClient } from './client';

export interface BackupRequest {
    backup_type?: 'full' | 'incremental';
    force_full?: boolean;
    subvolumes?: string[];
}

export interface BackupProgress {
    current_step: string;
    total_steps: number;
    current_step_num: number;
    percentage: number;
    current_file?: string;
    speed_mbps?: number;
    eta_seconds?: number;
    log_messages: string[];
}

export interface BackupResult {
    backup_id: number;
    status: 'pending' | 'running' | 'success' | 'failed' | 'partial' | 'cancelled';
    backup_type: 'full' | 'incremental';
    start_time: string;
    end_time?: string;
    duration_seconds?: number;
    size_bytes?: number;
    error_message?: string;
    subvolumes: Record<string, any>;
}

export interface BackupHistoryItem {
    id: number;
    timestamp: string;
    backup_type: 'full' | 'incremental';
    status: string;
    size_bytes?: number;
    duration_seconds?: number;
    error_message?: string;
    subvolume?: string;
}

export interface BrowseBackupsResponse {
    months?: string[];
    month?: string;
    full_backups?: Array<{
        name: string;
        size: number;
        modified: string;
        permissions: string;
    }>;
    incremental_backups?: Array<{
        name: string;
        size: number;
        modified: string;
        permissions: string;
    }>;
}

export const backupApi = {
    async startBackup(request: BackupRequest): Promise<BackupResult> {
        const response = await apiClient.post<BackupResult>('/api/backup/start', request);
        return response.data;
    },

    async getBackupStatus(): Promise<BackupProgress | null> {
        const response = await apiClient.get<BackupProgress | null>('/api/backup/status');
        return response.data;
    },

    async cancelBackup(): Promise<void> {
        await apiClient.delete('/api/backup/cancel');
    },

    async getHistory(params?: {
        limit?: number;
        offset?: number;
        status?: string;
    }): Promise<BackupHistoryItem[]> {
        const response = await apiClient.get<BackupHistoryItem[]>('/api/backup/history', { params });
        return response.data;
    },

    async getBackupDetails(backupId: number): Promise<BackupHistoryItem> {
        const response = await apiClient.get<BackupHistoryItem>(`/api/backup/history/${backupId}`);
        return response.data;
    },

    async browseBackups(month?: string): Promise<BrowseBackupsResponse> {
        const params = month ? { month } : undefined;
        const response = await apiClient.get<BrowseBackupsResponse>('/api/backup/browse', { params });
        return response.data;
    },
};