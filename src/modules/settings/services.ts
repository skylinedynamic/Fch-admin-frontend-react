import axios from 'axios';
import { apiClient } from '../../lib/http/apiClient';
import type { SettingsData, UpdateSettingsPayload, SettingsResponse, SendTestMailPayload, SendTestMailResponse, AppConfigResponse, ThemeConfigurations, ScoreConfigurationResponse } from './types';

// Base API path


export const fetchSettings = async (): Promise<SettingsResponse> => {
    const { data } = await apiClient.get('/common/payment-methods');
    return data;
};


export const fetchSettingsPaymentIntegration = async (): Promise<SettingsResponse> => {
    const { data } = await apiClient.get('/common/payment-methods-fetch');
    return data;
};

export const updateSettings = async (payload: UpdateSettingsPayload): Promise<SettingsData> => {
    const { data } = await apiClient.post('/common/payment-methods', payload);
    return data;
};

export const updateSettingsPaymentIntegration = async (payload: UpdateSettingsPayload): Promise<SettingsData> => {
    const { data } = await apiClient.post('/common/payment-methods-update', payload);
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


export const fetchGlobalConfigurations = async (): Promise<any> => {
    const { data } = await apiClient.get('/common/partner-theme');
    return data;
};

// Unified Module Settings Services
export const fetchAppConfigurations = async (module: string): Promise<any> => {
    const { data } = await apiClient.post('/common/app-configurations', { module });
    return data;
};

export const fetchThemeConfigurations = async (): Promise<AppConfigResponse<ThemeConfigurations>> => {
    const { data } = await apiClient.get('/common/get-theme');
    return data;
};


export const saveAppConfigurations = async (module: string, settings: object): Promise<any> => {
    const { data } = await apiClient.post('/common/app-configurations/save', { module, ...settings });
    return data;
};

export const fetchScoreConfigurations = async (): Promise<ScoreConfigurationResponse> => {
    const { data } = await apiClient.get('/admin/app-configuration/score');
    return data;
};

export const updateScoreConfigurations = async (payload: Record<string, any>): Promise<any> => {
    const { data } = await apiClient.put('/admin/app-configuration/score', payload);
    return data;
};

export const fetchTimeSettings = async (): Promise<any> => {
    const { data } = await apiClient.get('/admin/app-configuration/time');
    return data;
};

export const updateTimeSettings = async (payload: { time_settings: any[] }): Promise<any> => {
    const { data } = await apiClient.put('/admin/app-configuration/time', payload);
    return data;
};


