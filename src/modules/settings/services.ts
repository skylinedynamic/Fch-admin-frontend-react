import { apiClient } from '../../lib/http/apiClient';
import type { SettingsData, UpdateSettingsPayload, SettingsResponse, SendTestMailPayload, SendTestMailResponse } from './types';

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
