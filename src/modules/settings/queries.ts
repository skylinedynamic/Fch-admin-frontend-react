import { useMutation } from '@tanstack/react-query';
import { sendTestMail } from './services';
import type { SendTestMailPayload, SendTestMailResponse } from './types';

export const useSendTestMail = () => {
    return useMutation<SendTestMailResponse, Error, SendTestMailPayload>({
        mutationFn: sendTestMail,
    });
};
