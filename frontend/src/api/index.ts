// frontend/src/api/index.ts
export * from './client';
export * from './backup';
export * from './dependencies';
export * from './monitoring';
export * from './settings';
export * from './status';
export * from './setup';

// Re-export all API modules for convenience
import * as backupApi from './backup';
import * as dependenciesApi from './dependencies';
import * as monitoringApi from './monitoring';
import * as settingsApi from './settings';
import * as statusApi from './status';
import * as setupApi from './setup';

export const api = {
    backup: backupApi.backupApi,
    dependencies: dependenciesApi.dependenciesApi,
    monitoring: monitoringApi.monitoringApi,
    settings: settingsApi.settingsApi,
    status: statusApi.statusApi,
    setup: setupApi.setupApi,
};