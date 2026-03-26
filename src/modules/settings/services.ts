import { apiClient } from '../../lib/http/apiClient';
import type { SettingsData, UpdateSettingsPayload, SettingsResponse } from './types';

// Base API path
const BASE_PATH = '/common/settings';

export const fetchSettings = async (): Promise<SettingsResponse> => {
    const { data } = await apiClient.get(BASE_PATH);
    return data;
};

export const updateSettings = async (payload: UpdateSettingsPayload): Promise<SettingsData> => {
    const { data } = await apiClient.post(BASE_PATH, payload);
    return data;
};

export const fetchAppConfig = async (key: string): Promise<any> => {
    const { data } = await apiClient.post('/common/app-config/show', { key });
    return data;
};

export const saveAppConfig = async (key: string, value: any): Promise<any> => {
    const { data } = await apiClient.post('/common/app-config/save', { key, value });
    return data;
};
