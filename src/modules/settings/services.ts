import { apiClient } from '../../lib/http/apiClient';
import type { SettingsData, UpdateSettingsPayload } from './types';

// Base API path
const BASE_PATH = '/admin/settings';

export const fetchSettings = async (): Promise<SettingsData> => {
    const { data } = await apiClient.get(BASE_PATH);
    return data;
};

export const updateSettings = async (payload: UpdateSettingsPayload): Promise<SettingsData> => {
    const { data } = await apiClient.post(BASE_PATH, payload);
    return data;
};
