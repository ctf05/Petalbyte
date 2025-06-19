// frontend/src/api/dependencies.ts
import { apiClient } from './client';

export interface DependencyInfo {
    name: string;
    display_name: string;
    description: string;
    status: 'ok' | 'warning' | 'error' | 'checking';
    message: string;
    can_fix: boolean;
    last_check?: string;
    metadata?: Record<string, any>;
}

export interface FixResult {
    success: boolean;
    message: string;
    new_status?: string;
    metadata?: Record<string, any>;
}

export const dependenciesApi = {
    async checkAll(): Promise<DependencyInfo[]> {
        const response = await apiClient.get<DependencyInfo[]>('/api/dependencies');
        return response.data;
    },

    async checkDependency(name: string): Promise<DependencyInfo> {
        const response = await apiClient.get<DependencyInfo>(`/api/dependencies/${name}`);
        return response.data;
    },

    async fixDependency(name: string): Promise<FixResult> {
        const response = await apiClient.post<FixResult>(`/api/dependencies/${name}/fix`);
        return response.data;
    },
};