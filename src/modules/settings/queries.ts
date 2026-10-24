import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    sendTestMail,
    fetchGlobalConfigurations,
    fetchMailConfigurations,
    saveMailConfiguration,
    deleteMailConfiguration,
    makeDefaultMailConfiguration,
    sendMailConfigurationCode,
    verifyMailConfiguration,
    fetchFallbackMailConfiguration,
    saveFallbackMailConfiguration,
    makeDefaultFallbackMailConfiguration,
    sendFallbackMailCode,
    verifyFallbackMailConfiguration,
    fetchAppConfigurations,
    saveAppConfigurations,
    fetchScoreConfigurations,
    updateScoreConfigurations,
    fetchTimeSettings,
    updateTimeSettings,
    fetchSmsConfiguration,
    saveSmsConfiguration,
    sendTestSms,
} from './services';
import { queryKeys } from '../../lib/query/queryKeys';
import { useConfigPartnerId } from './configPartner';
import type {
    SendTestMailPayload,
    SendTestMailResponse,
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

/**
 * Hook to send a test notification/system email.
 */
export const useSendTestMail = () => {
    return useMutation<SendTestMailResponse, Error, SendTestMailPayload>({
        mutationFn: sendTestMail,
    });
};

/**
 * Hook to fetch merged global configurations (branding + active configurations).
 */
export const useGlobalConfigurations = (enabled = true) => {
    return useQuery({
        queryKey: ['globalConfigurations'],
        queryFn: fetchGlobalConfigurations,
        enabled,
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
};

/**
 * The partner's mail providers, the fallback's status, and the provider forms.
 */
/**
 * The cache key a settings query is held under: the user's own settings, or -
 * inside a ConfigPartnerProvider - that partner's, so the two never mix.
 */
const forPartnerKey = <T extends readonly unknown[]>(key: T, partnerId?: number) =>
    (partnerId ? [...key, { partnerId }] : key) as readonly unknown[];

export const useMailConfigurations = (enabled = true) => {
    const partnerId = useConfigPartnerId();
    return useQuery<MailConfigurationsResponse>({
        queryKey: forPartnerKey(queryKeys.settings.mailConfigurations(), partnerId),
        queryFn: () => fetchMailConfigurations(partnerId),
        enabled,
    });
};

/**
 * Every change to a provider can change which settings mail is sent with, and
 * whether email counts as set up - so the list and the global flags refresh.
 */
const useMailMutation = <TVariables, TResponse = MailConfigurationActionResponse>(
    mutationFn: (variables: TVariables, partnerId?: number) => Promise<TResponse>
) => {
    const qc = useQueryClient();
    const partnerId = useConfigPartnerId();
    return useMutation<TResponse, Error, TVariables>({
        mutationFn: (variables) => mutationFn(variables, partnerId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.settings.mailConfigurations() });
            qc.invalidateQueries({ queryKey: ['globalConfigurations'] });
        },
    });
};

export const useSaveMailConfiguration = () => useMailMutation<SaveMailConfigurationPayload>(saveMailConfiguration);

export const useDeleteMailConfiguration = () => useMailMutation<number>(deleteMailConfiguration);

export const useMakeDefaultMailConfiguration = () => useMailMutation<number>(makeDefaultMailConfiguration);

/** Sending a code changes nothing, so nothing is refreshed. */
export const useSendMailConfigurationCode = () => {
    const partnerId = useConfigPartnerId();
    return useMutation<MailConfigurationActionResponse, Error, number>({
        mutationFn: (id) => sendMailConfigurationCode(id, partnerId),
    });
};

export const useVerifyMailConfiguration = () =>
    useMailMutation<{ id: number; code: string }>(({ id, code }, partnerId) => verifyMailConfiguration(id, code, partnerId));

/**
 * The platform-wide fallback's providers. Only the host partner's own account may
 * read it, so callers pass `enabled` from `can_manage_fallback`.
 */
export const useFallbackMailConfiguration = (enabled = true) => {
    return useQuery<FallbackMailConfigurationResponse>({
        queryKey: queryKeys.settings.fallbackMailConfiguration(),
        queryFn: fetchFallbackMailConfiguration,
        enabled,
    });
};

/**
 * Any change to a fallback provider can change which one mail goes out with,
 * and the partner list carries the fallback's status - so both refresh.
 */
const useFallbackMutation = <TVariables,>(mutationFn: (variables: TVariables) => Promise<MailConfigurationActionResponse>) => {
    const qc = useQueryClient();
    return useMutation<MailConfigurationActionResponse, Error, TVariables>({
        mutationFn,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.settings.fallbackMailConfiguration() });
            qc.invalidateQueries({ queryKey: queryKeys.settings.mailConfigurations() });
        },
    });
};

export const useSaveFallbackMailConfiguration = () =>
    useFallbackMutation<SaveMailConfigurationPayload>(saveFallbackMailConfiguration);

export const useMakeDefaultFallbackMailConfiguration = () =>
    useFallbackMutation<number>(makeDefaultFallbackMailConfiguration);

/** Sending a code changes nothing, so nothing is refreshed. */
export const useSendFallbackMailCode = () =>
    useMutation<MailConfigurationActionResponse, Error, number>({ mutationFn: sendFallbackMailCode });

export const useVerifyFallbackMailConfiguration = () =>
    useFallbackMutation<{ id: number; code: string }>(({ id, code }) => verifyFallbackMailConfiguration(id, code));

/**
 * Hook to fetch app configurations by module.
 */
export const useAppConfigurations = (module: string, enabled = true) => {
    const partnerId = useConfigPartnerId();
    return useQuery({
        queryKey: forPartnerKey(['appConfigurations', module] as const, partnerId),
        queryFn: () => fetchAppConfigurations(module, partnerId),
        enabled: !!module && enabled,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Hook to save app configurations by module.
 */
export const useSaveAppConfigurations = () => {
    const qc = useQueryClient();
    const partnerId = useConfigPartnerId();
    return useMutation<any, Error, { module: string; settings: object }>({
        mutationFn: (variables) => saveAppConfigurations(variables.module, variables.settings, partnerId),
        onSuccess: (res, variables) => {
            qc.invalidateQueries({ queryKey: ['appConfigurations', variables.module] });
            qc.invalidateQueries({ queryKey: ['globalConfigurations'] });
        },
    });
};

export const useScoreConfigurations = (enabled = true) => {
    return useQuery<ScoreConfigurationResponse, Error>({
        queryKey: ['scoreConfigurations'],
        queryFn: fetchScoreConfigurations,
        enabled,
        staleTime: 1000 * 60 * 5,
    });
};

export const useUpdateScoreConfigurations = () => {
    const qc = useQueryClient();
    return useMutation<any, Error, Record<string, any>>({
        mutationFn: updateScoreConfigurations,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['scoreConfigurations'] });
        },
    });
};

export const useTimeSettings = (enabled = true) => {
    return useQuery({
        queryKey: ['timeSettings'],
        queryFn: fetchTimeSettings,
        enabled,
        staleTime: 1000 * 60 * 5,
    });
};

export const useUpdateTimeSettings = () => {
    const qc = useQueryClient();
    return useMutation<any, Error, { time_settings: any[] }>({
        mutationFn: updateTimeSettings,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['timeSettings'] });
        },
    });
};

/**
 * The signed-in partner's SMS configuration and the options its form offers.
 */
export const useSmsConfiguration = (enabled = true) => {
    const partnerId = useConfigPartnerId();
    return useQuery<SmsConfigurationResponse>({
        queryKey: forPartnerKey(queryKeys.settings.smsConfiguration(), partnerId),
        queryFn: () => fetchSmsConfiguration(partnerId),
        enabled,
    });
};

export const useSaveSmsConfiguration = () => {
    const qc = useQueryClient();
    const partnerId = useConfigPartnerId();
    return useMutation<SmsConfigurationResponse, Error, SaveSmsConfigurationPayload>({
        mutationFn: (payload) => saveSmsConfiguration(payload, partnerId),
        onSuccess: (response) => {
            qc.setQueryData(forPartnerKey(queryKeys.settings.smsConfiguration(), partnerId), response);
        },
    });
};

export const useSendTestSms = () => {
    const partnerId = useConfigPartnerId();
    return useMutation<SendTestSmsResponse, Error, SendTestSmsPayload>({
        mutationFn: (payload) => sendTestSms(payload, partnerId),
    });
};
