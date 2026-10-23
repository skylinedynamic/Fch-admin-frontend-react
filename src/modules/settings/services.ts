import axios from 'axios';
import { apiClient } from '../../lib/http/apiClient';
import { REFRESH_ACTIVITIES_EVENT } from '../../config/appConfig';
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
// through it, and the platform-wide fallback the host partner keeps - which,
// like a partner, has one configuration per provider.
const MAIL = '/common/mail-configurations';

/**
 * `partner_id` for Partner profile › Configuration, where the host edits
 * another partner's settings; nothing for the user's own (see configPartner).
 */
const forPartner = (partnerId?: number): { partner_id?: number } => (partnerId ? { partner_id: partnerId } : {});

// A change made for another partner is logged on its activity; reload the sidebar so it shows.
const afterPartnerChange = <T>(data: T, partnerId?: number): T => {
    if (partnerId) window.dispatchEvent(new Event(REFRESH_ACTIVITIES_EVENT));
    return data;
};

export const fetchMailConfigurations = async (partnerId?: number): Promise<MailConfigurationsResponse> => {
    const { data } = await apiClient.get(MAIL, { params: forPartner(partnerId) });
    return data;
};

export const saveMailConfiguration = async (payload: SaveMailConfigurationPayload, partnerId?: number): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(MAIL, { ...payload, ...forPartner(partnerId) });
    return afterPartnerChange(data, partnerId);
};

export const deleteMailConfiguration = async (id: number, partnerId?: number): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.delete(`${MAIL}/${id}`, { params: forPartner(partnerId) });
    return afterPartnerChange(data, partnerId);
};

export const makeDefaultMailConfiguration = async (id: number, partnerId?: number): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(`${MAIL}/${id}/default`, forPartner(partnerId));
    return afterPartnerChange(data, partnerId);
};

export const sendMailConfigurationCode = async (id: number, partnerId?: number): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(`${MAIL}/${id}/send-code`, forPartner(partnerId));
    return data;
};

export const verifyMailConfiguration = async (id: number, code: string, partnerId?: number): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(`${MAIL}/${id}/verify`, { code, ...forPartner(partnerId) });
    return afterPartnerChange(data, partnerId);
};

export const fetchFallbackMailConfiguration = async (): Promise<FallbackMailConfigurationResponse> => {
    const { data } = await apiClient.get(`${MAIL}/fallback`);
    return data;
};

export const saveFallbackMailConfiguration = async (payload: SaveMailConfigurationPayload): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(`${MAIL}/fallback`, payload);
    return data;
};

export const makeDefaultFallbackMailConfiguration = async (id: number): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(`${MAIL}/fallback/${id}/default`);
    return data;
};

export const sendFallbackMailCode = async (id: number): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(`${MAIL}/fallback/${id}/send-code`);
    return data;
};

export const verifyFallbackMailConfiguration = async (id: number, code: string): Promise<MailConfigurationActionResponse> => {
    const { data } = await apiClient.post(`${MAIL}/fallback/${id}/verify`, { code });
    return data;
};


// SMS configuration of the signed-in user's partner, with the countries and
// providers the form offers. The auth token comes back masked, never in clear.
export const fetchSmsConfiguration = async (partnerId?: number): Promise<SmsConfigurationResponse> => {
    const { data } = await apiClient.get('/common/sms-configuration', { params: forPartner(partnerId) });
    return data;
};

export const saveSmsConfiguration = async (payload: SaveSmsConfigurationPayload, partnerId?: number): Promise<SmsConfigurationResponse> => {
    const { data } = await apiClient.post('/common/sms-configuration', { ...payload, ...forPartner(partnerId) });
    return afterPartnerChange(data, partnerId);
};

// Sends a test text with the saved (not necessarily enabled) configuration.
export const sendTestSms = async (payload: SendTestSmsPayload, partnerId?: number): Promise<SendTestSmsResponse> => {
    const { data } = await apiClient.post('/common/sms-configuration/test', { ...payload, ...forPartner(partnerId) });
    return data;
};

export const fetchGlobalConfigurations = async (): Promise<any> => {
    const { data } = await apiClient.get('/common/partner-theme');
    return data;
};

// Unified Module Settings Services
// A partner id is accepted for the branding module only (Partner profile › Configuration).
export const fetchAppConfigurations = async (module: string, partnerId?: number): Promise<any> => {
    const { data } = await apiClient.post('/common/app-configurations', { module, ...forPartner(partnerId) });
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


export const saveAppConfigurations = async (module: string, settings: object, partnerId?: number): Promise<any> => {
    const { data } = await apiClient.post('/common/app-configurations/save', { module, ...settings, ...forPartner(partnerId) });
    return afterPartnerChange(data, partnerId);
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
    /**
     * What the method still needs before payers are offered it, for its active
     * mode (e.g. a missing Stripe key, no bank account). Empty when it's ready.
     */
    setup_issues?: string[];
    can_take_payments?: boolean;
}

export interface PartnerPaymentProviderConfig {
    id?: number | null;
    payment_mode?: string;
    payment_provider_id: number;
    status: boolean;
    is_default: boolean;
    configuration: Record<string, any>;
    bank_details?: any[];
    /** What the method is still missing for its active mode (read-only, from the API). */
    setup_issues?: string[];
    /** Whether payers are offered the method meanwhile (false for Stripe or Bank Transfer that isn't set up). */
    can_take_payments?: boolean;
}

export const fetchPartnerPaymentProviders = async (partnerId?: number): Promise<{ status: boolean; data: PartnerPaymentProvider[] }> => {
    const { data } = await apiClient.get('/common/partner-payment-providers', { params: forPartner(partnerId) });
    return data;
};

export const fetchPartnerPaymentProviderConfig = async (providerId: number, partnerId?: number): Promise<{ status: boolean; data: PartnerPaymentProviderConfig }> => {
    const { data } = await apiClient.get(`/common/partner-payment-providers/${providerId}`, { params: forPartner(partnerId) });
    return data;
};

export const updatePartnerPaymentProviderConfig = async (payload: PartnerPaymentProviderConfig, partnerId?: number): Promise<any> => {
    const { data } = await apiClient.post('/common/partner-payment-providers', { ...payload, ...forPartner(partnerId) });
    return afterPartnerChange(data, partnerId);
};

export const updatePartnerPaymentProviderStatus = async (payload: { payment_provider_id: number; status: boolean }, partnerId?: number): Promise<any> => {
    const { data } = await apiClient.post('/common/partner-payment-providers/status', { ...payload, ...forPartner(partnerId) });
    return afterPartnerChange(data, partnerId);
};



