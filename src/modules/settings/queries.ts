import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    sendTestMail,
    fetchGlobalConfigurations,
    fetchEmailConfigurations,
    saveEmailConfiguration,
    toggleEmailConfigStatus,
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
 * Hook to fetch email configurations.
 */
export const useEmailConfigurations = (enabled = true) => {
    return useQuery({
        queryKey: ['emailConfigurations'],
        queryFn: fetchEmailConfigurations,
        enabled,
    });
};

/**
 * Hook to save or update email configurations.
 */
export const useSaveEmailConfiguration = () => {
    const qc = useQueryClient();
    return useMutation<any, Error, any>({
        mutationFn: saveEmailConfiguration,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['emailConfigurations'] });
            qc.invalidateQueries({ queryKey: ['globalConfigurations'] });
        },
    });
};

/**
 * Hook to toggle email configurations status.
 */
export const useToggleEmailConfigStatus = () => {
    const qc = useQueryClient();
    return useMutation<any, Error, void>({
        mutationFn: toggleEmailConfigStatus,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['emailConfigurations'] });
            qc.invalidateQueries({ queryKey: ['globalConfigurations'] });
        },
    });
};

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
