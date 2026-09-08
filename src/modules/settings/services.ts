import axios from 'axios';
import { apiClient } from '../../lib/http/apiClient';
import type { SendTestMailPayload, SendTestMailResponse, AppConfigResponse, ThemeConfigurations, ScoreConfigurationResponse } from './types';

// Base API path


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

/**
 * Branding on its own, for screens that only need to paint the brand.
 *
 * get-theme also queries the email configuration and the payment providers to
 * build its freshness flags, and the brand had to wait behind both. This returns
 * just the branding - cached server-side - plus `css_vars`, the same precomputed
 * variable map /api/branding.css paints with, so the two cannot disagree.
 */
export const fetchBranding = async (): Promise<{
    success: boolean;
    data: { branding: Record<string, any>; css_vars: Record<string, string>; css_vars_version: number };
}> => {
    const { data } = await apiClient.get('/common/branding');
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

export interface PartnerPaymentProvider {
    id: number;
    name: string;
    slug: string;
    logo: string | null;
    status: boolean;
    is_default: boolean;
    is_configured: boolean;
    payment_mode?: string;
}

export interface PartnerPaymentProviderConfig {
    id?: number | null;
    payment_mode?: string;
    payment_provider_id: number;
    status: boolean;
    is_default: boolean;
    configuration: Record<string, any>;
    bank_details?: any[];
}

export const fetchPartnerPaymentProviders = async (): Promise<{ status: boolean; data: PartnerPaymentProvider[] }> => {
    const { data } = await apiClient.get('/common/partner-payment-providers');
    return data;
};

export const fetchPartnerPaymentProviderConfig = async (providerId: number): Promise<{ status: boolean; data: PartnerPaymentProviderConfig }> => {
    const { data } = await apiClient.get(`/common/partner-payment-providers/${providerId}`);
    return data;
};

export const updatePartnerPaymentProviderConfig = async (payload: PartnerPaymentProviderConfig): Promise<any> => {
    const { data } = await apiClient.post('/common/partner-payment-providers', payload);
    return data;
};

export const updatePartnerPaymentProviderStatus = async (payload: { payment_provider_id: number; status: boolean }): Promise<any> => {
    const { data } = await apiClient.post('/common/partner-payment-providers/status', payload);
    return data;
};



