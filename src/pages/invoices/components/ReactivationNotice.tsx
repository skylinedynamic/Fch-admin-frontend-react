import { refreshSubscription } from '../../../lib/auth/auth';

/** What the payer is told before paying an invoice of a cancelled subscription (BUG-069). */
export const REACTIVATION_NOTICE =
  'Your subscription is cancelled. Paying this invoice will reactivate it, and billing will continue on your current plan.';

type ReactivatingInvoice = { reactivates_subscription?: boolean } | null | undefined;

/**
 * Wraps a payment's onSuccess: once an invoice that reactivates a cancelled
 * subscription is paid, the stored status is refreshed, so the route guard
 * and the menu unlock without a new login.
 */
export function withReactivationRefresh<A extends unknown[]>(invoice: ReactivatingInvoice, onSuccess?: (...args: A) => void) {
  return (...args: A) => {
    if (invoice?.reactivates_subscription) {
      void refreshSubscription();
    }
    onSuccess?.(...args);
  };
}

/** The warning shown in the payment modal for such an invoice. */
export default function ReactivationNotice({ invoice }: { invoice: ReactivatingInvoice }) {
  if (!invoice?.reactivates_subscription) return null;

  return (
    <div className="alert alert-warning border-0 d-flex align-items-start gap-2 mx-3 mt-3 mb-0 fs-13" role="alert">
      <i className="ri-refresh-line fs-16 flex-shrink-0"></i>
      <span>{REACTIVATION_NOTICE}</span>
    </div>
  );
}
