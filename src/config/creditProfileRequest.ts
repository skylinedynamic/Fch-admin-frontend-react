/**
 * Where a client's credit request stands, as the API reports it.
 *
 * The values mirror CreditAuthorizationConsent::REQUEST_PENDING / REQUEST_COMPLETED
 * in fch-api - a change to one belongs in both.
 */
export const CREDIT_REQUEST_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
} as const;

export type CreditRequestStatus = (typeof CREDIT_REQUEST_STATUS)[keyof typeof CREDIT_REQUEST_STATUS];

/** How each status is shown in the Request Credit Profile list. */
export const CREDIT_REQUEST_STATUS_DISPLAY: Record<
    CreditRequestStatus,
    { label: string; badgeClass: string; icon: string }
> = {
    [CREDIT_REQUEST_STATUS.PENDING]: {
        label: 'Pending',
        badgeClass: 'bg-warning-subtle text-warning',
        icon: 'ri-time-line',
    },
    [CREDIT_REQUEST_STATUS.COMPLETED]: {
        label: 'Completed',
        badgeClass: 'bg-success-subtle text-success',
        icon: 'ri-checkbox-circle-line',
    },
};
