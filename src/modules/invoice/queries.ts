import { useMutation } from '@tanstack/react-query';
import { confirmAuthenticatedPayment, processUnifiedPayment } from './services';
import type { ProcessPaymentPayload } from './types';

/** Pay an invoice. A 3-D Secure card answers with `requires_action` - see useConfirmAuthenticatedPayment. */
export const useProcessPayment = () => {
    return useMutation({
        mutationFn: (payload: ProcessPaymentPayload) => processUnifiedPayment(payload),
    });
};

/** Settle a card payment once the payer has done the bank's 3-D Secure challenge. */
export const useConfirmAuthenticatedPayment = () => {
    return useMutation({
        mutationFn: (paymentId: number) => confirmAuthenticatedPayment(paymentId),
    });
};
