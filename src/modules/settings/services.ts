import { apiClient } from '../../lib/http/apiClient';
import type { SettingsData, UpdateSettingsPayload, SettingsResponse, SendTestMailPayload, SendTestMailResponse, AppConfigResponse } from './types';

// Base API path
const BASE_PATH = '/common/payment-methods';

export const fetchSettings = async (): Promise<SettingsResponse> => {
    const { data } = await apiClient.get(BASE_PATH);
    return data;
};

export const updateSettings = async (payload: UpdateSettingsPayload): Promise<SettingsData> => {
    const { data } = await apiClient.post(BASE_PATH, payload);
    return data;
};

export const fetchAppConfig = async <T = string>(key: string): Promise<AppConfigResponse<Record<string, T>>> => {
    const { data } = await apiClient.post('/common/app-config/show', { key });
    return data;
};

export const fetchMultipleAppConfigs = async <T = Record<string, string>>(keys: string[]): Promise<AppConfigResponse<T>> => {
    const { data } = await apiClient.post('/common/app-config/show', { keys });
    return data;
};

export const saveAppConfig = async (key: string, value: any): Promise<AppConfigResponse<null>> => {
    const { data } = await apiClient.post('/common/app-config/save', { key, value });
    return data;
};

export const saveMultipleAppConfigs = async (settings: object): Promise<AppConfigResponse<null>> => {
    const { data } = await apiClient.post('/common/app-config/save', settings);
    return data;
};

export const sendTestMail = async (payload: SendTestMailPayload): Promise<SendTestMailResponse> => {
    const { data } = await apiClient.post('/notifications/test-email', payload);
    return data;
};

export const fetchEmailConfigurations = async (): Promise<any> => {
    const { data } = await apiClient.get('/common/email-configurations');
    return data;
};

export const saveEmailConfiguration = async (payload: any): Promise<any> => {
    const { data } = await apiClient.post('/common/email-configurations', payload);
    return data;
};

export const toggleEmailConfigStatus = async (): Promise<any> => {
    const { data } = await apiClient.get('/common/email-configurations/toggle-status');
    return data;
};

// Branding Information
export const fetchGeneralInformation = async (): Promise<any> => {
    const { data } = await apiClient.get('/common/branding-info');
    return data;
};

export const updateGeneralInformation = async (payload: any): Promise<any> => {
    const { data } = await apiClient.post('/common/branding-info', payload);
    return data;
};

export const fetchGlobalConfigurations = async (): Promise<any> => {
    const { data } = await apiClient.get('/common/global-configurations');
    return data;
};
