import { useMutation, useQuery } from '@tanstack/react-query';
import { sendTestMail, fetchGlobalConfigurations } from './services';
import type { SendTestMailPayload, SendTestMailResponse } from './types';

export const useSendTestMail = () => {
    return useMutation<SendTestMailResponse, Error, SendTestMailPayload>({
        mutationFn: sendTestMail,
    });
};

export const useGlobalConfigurations = (enabled = true) => {
    return useQuery({
        queryKey: ['globalConfigurations'],
        queryFn: fetchGlobalConfigurations,
        enabled,
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
};
