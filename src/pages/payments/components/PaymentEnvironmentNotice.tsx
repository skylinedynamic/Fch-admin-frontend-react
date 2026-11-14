import {
    PAYMENT_ENVIRONMENT_COLORS,
    PAYMENT_ENVIRONMENT_LABELS,
} from '../../../config/paymentConfig';

type PaymentEnvironmentNoticeProps = {
    /** The payment's `is_environment`: true = Production, false = Sandbox. */
    isProduction: boolean;
    className?: string;
};

/**
 * Shown before a manual payment is approved or rejected (BUG-180): the
 * environment the payment is recorded in, so a test payment is not approved as
 * live money without the approver seeing it.
 */
export default function PaymentEnvironmentNotice({ isProduction, className = '' }: PaymentEnvironmentNoticeProps) {
    const key = isProduction ? 1 : 0;

    return (
        <div
            className={`d-flex flex-wrap align-items-center gap-2 rounded border bg-light px-3 py-2 ${className}`}
            data-testid="payment-environment-notice"
        >
            <span className="fw-semibold fs-13 text-muted">Recorded in</span>
            <span className={`badge bg-${PAYMENT_ENVIRONMENT_COLORS[key]} text-uppercase`}>
                {PAYMENT_ENVIRONMENT_LABELS[key]}
            </span>
            <span className="text-muted fs-12">
                {isProduction
                    ? 'Live money: counted in production reports.'
                    : 'Test payment: not counted as live money.'}
            </span>
        </div>
    );
}
