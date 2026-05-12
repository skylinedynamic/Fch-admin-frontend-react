import { apiClient } from '../../lib/http/apiClient';
import type { SettingsData, UpdateSettingsPayload, SettingsResponse, SendTestMailPayload, SendTestMailResponse, AppConfigResponse } from './types';

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

export const fetchAppConfig = async <T = string>(key: string): Promise<AppConfigResponse<Record<string, T>>> => {
    const { data } = await apiClient.post('/admin/app-configurations/show', { keys: [key] });
    return data;
};

export const fetchMultipleAppConfigs = async <T = Record<string, string>>(keys: string[]): Promise<AppConfigResponse<T>> => {
    const { data } = await apiClient.post('/admin/app-configurations/show', { keys });
    return data;
};

export const saveAppConfig = async (key: string, value: any): Promise<AppConfigResponse<null>> => {
    const { data } = await apiClient.post('/admin/app-configurations/save', { [key]: value });
    return data;
};

export const saveMultipleAppConfigs = async (settings: object): Promise<AppConfigResponse<null>> => {
    const { data } = await apiClient.post('/admin/app-configurations/save', settings);
    return data;
};

export const sendTestMail = async (payload: SendTestMailPayload): Promise<SendTestMailResponse> => {
    const { data } = await apiClient.post('/notifications/test-email', payload);
    return data;
};
