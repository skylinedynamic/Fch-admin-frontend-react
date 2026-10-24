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
export const useMailConfigurations = (enabled = true) => {
    return useQuery<MailConfigurationsResponse>({
        queryKey: queryKeys.settings.mailConfigurations(),
        queryFn: fetchMailConfigurations,
        enabled,
    });
};

/**
 * Every change to a provider can change which settings mail is sent with, and
 * whether email counts as set up - so the list and the global flags refresh.
 */
const useMailMutation = <TVariables, TResponse = MailConfigurationActionResponse>(
    mutationFn: (variables: TVariables) => Promise<TResponse>
) => {
    const qc = useQueryClient();
    return useMutation<TResponse, Error, TVariables>({
        mutationFn,
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
export const useSendMailConfigurationCode = () =>
    useMutation<MailConfigurationActionResponse, Error, number>({ mutationFn: sendMailConfigurationCode });

export const useVerifyMailConfiguration = () =>
    useMailMutation<{ id: number; code: string }>(({ id, code }) => verifyMailConfiguration(id, code));

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
    return useQuery({
        queryKey: ['appConfigurations', module],
        queryFn: () => fetchAppConfigurations(module),
        enabled: !!module && enabled,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Hook to save app configurations by module.
 */
export const useSaveAppConfigurations = () => {
    const qc = useQueryClient();
    return useMutation<any, Error, { module: string; settings: object }>({
        mutationFn: (variables) => saveAppConfigurations(variables.module, variables.settings),
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
    return useQuery<SmsConfigurationResponse>({
        queryKey: queryKeys.settings.smsConfiguration(),
        queryFn: fetchSmsConfiguration,
        enabled,
    });
};

export const useSaveSmsConfiguration = () => {
    const qc = useQueryClient();
    return useMutation<SmsConfigurationResponse, Error, SaveSmsConfigurationPayload>({
        mutationFn: saveSmsConfiguration,
        onSuccess: (response) => {
            qc.setQueryData(queryKeys.settings.smsConfiguration(), response);
        },
    });
};

export const useSendTestSms = () => {
    return useMutation<SendTestSmsResponse, Error, SendTestSmsPayload>({
        mutationFn: sendTestSms,
    });
};
