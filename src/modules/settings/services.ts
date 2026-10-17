import axios from 'axios';
import { apiClient } from '../../lib/http/apiClient';
import type {
    SendTestMailPayload,
    SendTestMailResponse,
    AppConfigResponse,
    ThemeConfigurations,
    ScoreConfigurationResponse,
    SmsConfigurationResponse,
    SaveSmsConfigurationPayload,
    SendTestSmsPayload,
    SendTestSmsResponse,
    MailConfigurationsResponse,
    FallbackMailConfigurationResponse,
    SaveMailConfigurationPayload,
    MailConfigurationActionResponse,
} from './types';

// Base API path


export const sendTestMail = async (payload: SendTestMailPayload): Promise<SendTestMailResponse> => {
    const { data } = await apiClient.post('/notifications/test-email', payload);
    return data;
};

// Mail configuration: the partner's providers, each verified by a code sent
// through it, and the one platform-wide fallback the host partner keeps.
const MAIL = '/common/mail-configurations';

export const fetchMailConfigurations = async (): Promise<MailConfigurationsResponse> => {
    const { data } = await apiClient.get(MAIL);
    return data;
};

export const saveMailConfiguration = async (payload: SaveMailConfigurationPayload): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(MAIL, payload);
    return data;
};

export const deleteMailConfiguration = async (id: number): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.delete(`${MAIL}/${id}`);
    return data;
};

export const makeDefaultMailConfiguration = async (id: number): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(`${MAIL}/${id}/default`);
    return data;
};

export const sendMailConfigurationCode = async (id: number): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(`${MAIL}/${id}/send-code`);
    return data;
};

export const verifyMailConfiguration = async (id: number, code: string): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(`${MAIL}/${id}/verify`, { code });
    return data;
};

export const fetchFallbackMailConfiguration = async (): Promise<FallbackMailConfigurationResponse> => {
    const { data } = await apiClient.get(`${MAIL}/fallback`);
    return data;
};

export const saveFallbackMailConfiguration = async (payload: SaveMailConfigurationPayload): Promise<FallbackMailConfigurationResponse> => {
    const { data } = await apiClient.post(`${MAIL}/fallback`, payload);
    return data;
};

export const sendFallbackMailCode = async (): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(`${MAIL}/fallback/send-code`);
    return data;
};

export const verifyFallbackMailConfiguration = async (code: string): Promise<FallbackMailConfigurationResponse> => {
    const { data } = await apiClient.post(`${MAIL}/fallback/verify`, { code });
    return data;
};


// SMS configuration of the signed-in user's partner, with the countries and
// providers the form offers. The auth token comes back masked, never in clear.
export const fetchSmsConfiguration = async (): Promise<SmsConfigurationResponse> => {
    const { data } = await apiClient.get('/common/sms-configuration');
    return data;
};

export const saveSmsConfiguration = async (payload: SaveSmsConfigurationPayload): Promise<SmsConfigurationResponse> => {
    const { data } = await apiClient.post('/common/sms-configuration', payload);
    return data;
};

// Sends a test text with the saved (not necessarily enabled) configuration.
export const sendTestSms = async (payload: SendTestSmsPayload): Promise<SendTestSmsResponse> => {
    const { data } = await apiClient.post('/common/sms-configuration/test', payload);
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

// Current OpenAI settings. Deliberately never includes the API key itself —
// only whether one is stored — so the credential stays server-side.
export const fetchOpenAiConfig = async (): Promise<any> => {
    const { data } = await apiClient.get('/common/openai/config');
    return data;
};

// Model ids available to the configured OpenAI key, for the Settings dropdown.
export const fetchOpenAiModels = async (): Promise<any> => {
    const { data } = await apiClient.get('/common/openai/models');
    return data;
};

// Dedicated (validated) save — the generic app-configurations endpoint stores
// whatever it is given, which would let a blank or malformed key through.
export const saveOpenAiConfig = async (payload: {
    api_key: string;
    aue_model: string;
    reasoning_effort: string;
}): Promise<any> => {
    const { data } = await apiClient.post('/common/openai/config', payload);
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



