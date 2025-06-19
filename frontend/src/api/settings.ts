// frontend/src/api/settings.ts
import { apiClient } from './client';

export interface Settings {
    app_name: string;
    api_port: number;
    months_to_keep: number;
    daily_incremental_days: number;
    local_snapshot_days: number;
    unraid_tailscale_name: string;
    unraid_user: string;
    unraid_base_path: string;
    unraid_ssh_port: number;
    snapshot_dir: string;
    encryption_key_path: string;
    sent_snapshots_db: string;
    settings_file_path: string;
    use_tailscale: boolean;
    tailscale_timeout: number;
    backup_schedule_enabled: boolean;
    backup_schedule_time: string;
    backup_schedule_days: string[];
    notifications_enabled: boolean;
    notification_email?: string;
    notification_webhook?: string;
    host_root: string;
    host_home: string;
    client_name: string;
}

export interface SettingsUpdate {
    months_to_keep?: number;
    daily_incremental_days?: number;
    local_snapshot_days?: number;
    unraid_tailscale_name?: string;
    unraid_user?: string;
    unraid_base_path?: string;
    unraid_ssh_port?: number;
    use_tailscale?: boolean;
    backup_schedule_enabled?: boolean;
    backup_schedule_time?: string;
    backup_schedule_days?: string[];
    notifications_enabled?: boolean;
    notification_email?: string;
    notification_webhook?: string;
    client_name?: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export const settingsApi = {
    async getSettings(): Promise<Settings> {
        const response = await apiClient.get<Settings>('/api/settings');
        return response.data;
    },

    async updateSettings(settings: SettingsUpdate): Promise<{
        message: string;
        settings: Settings;
    }> {
        const response = await apiClient.put('/api/settings', settings);
        return response.data;
    },

    async validateSettings(settings: Record<string, any>): Promise<ValidationResult> {
        const response = await apiClient.post<ValidationResult>('/api/settings/validate', settings);
        return response.data;
    },

    async resetSettings(): Promise<{
        message: string;
        settings: Settings;
    }> {
        const response = await apiClient.post('/api/settings/reset');
        return response.data;
    },
};