/**
 * Which environment a payment is in - fch-api's PaymentProvider::MODE_*. Most
 * payments take it from the payment method used; a commission payout goes
 * through no gateway, so the host picks it in the payout dialog.
 */
export const PAYMENT_ENVIRONMENT = {
    SANDBOX: 'sandbox',
    PRODUCTION: 'production',
} as const;

export type PaymentEnvironment = typeof PAYMENT_ENVIRONMENT[keyof typeof PAYMENT_ENVIRONMENT];

export const PAYMENT_ENVIRONMENT_OPTIONS: { label: string; value: PaymentEnvironment }[] = [
    { label: 'Sandbox', value: PAYMENT_ENVIRONMENT.SANDBOX },
    { label: 'Production', value: PAYMENT_ENVIRONMENT.PRODUCTION },
];
