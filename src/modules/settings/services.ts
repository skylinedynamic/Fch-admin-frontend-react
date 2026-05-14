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

export const fetchEmailConfigurations = async (partnerId?: number): Promise<any> => {
    const params = { partner_id: partnerId };
    const { data } = await apiClient.get('/common/email-configurations', { params });
    return data;
};

export const saveEmailConfiguration = async (payload: any): Promise<any> => {
    const { data } = await apiClient.post('/common/email-configurations', payload);
    return data;
};

export const toggleEmailConfigStatus = async (id: number): Promise<any> => {
    const { data } = await apiClient.patch(`/common/email-configurations/${id}/toggle-status`);
    return data;
};

// General Information (Branding)
export const fetchGeneralInformation = async (entityType?: string, entityId?: number): Promise<any> => {
    const params: Record<string, any> = {};
    if (entityType) params.entity_type = entityType;
    if (entityId)   params.entity_id   = entityId;
    const { data } = await apiClient.get('/common/general-information', { params });
    return data;
};

export const updateGeneralInformation = async (payload: any): Promise<any> => {
    const { data } = await apiClient.post('/common/general-information-update', payload);
    return data;
};

export const fetchGlobalConfigurations = async (): Promise<any> => {
    const { data } = await apiClient.get('/common/global-configurations');
    return data;
};
