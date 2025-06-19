// frontend/src/api/setup.ts
import { apiClient } from './client';

export interface SetupConfig {
    root_device: string;
    boot_device: string;
    username: string;
    compression: string;
}

export interface DeviceDetection {
    boot_device: string | null;
    root_device: string | null;
    devices: Array<{
        name: string;
        path: string;
        size: string;
        size_mb: number;
        type: string;
        fstype: string;
        mountpoint: string;
    }>;
}

export interface SetupInstructions {
    title: string;
    overview: string;
    requirements: string[];
    steps: Array<{
        number: number;
        title: string;
        substeps: string[];
    }>;
    troubleshooting: Array<{
        issue: string;
        solution: string;
    }>;
}

export const setupApi = {
    async getInstallerScript(): Promise<string> {
        const response = await apiClient.get('/api/setup/scripts/popos-installer', {
            responseType: 'text',
        });
        return response.data;
    },

    async generateScript(config: SetupConfig): Promise<string> {
        const response = await apiClient.post('/api/setup/scripts/generate-popos', config, {
            responseType: 'text',
        });
        return response.data;
    },

    async getInstructions(): Promise<SetupInstructions> {
        const response = await apiClient.get<SetupInstructions>('/api/setup/instructions/popos');
        return response.data;
    },

    async detectDevices(): Promise<DeviceDetection> {
        const response = await apiClient.get<DeviceDetection>('/api/setup/device-detection');
        return response.data;
    },
};