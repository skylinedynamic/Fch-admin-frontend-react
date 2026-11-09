import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ConfirmationModal from '../../../components/Common/Modals/ConfirmationModal';
import { RESUME_RESULT, useResumeMySubscription } from '../../../modules/my-subscription';
import { refreshSubscription } from '../../../lib/auth/auth';

/** What the partner is told before resuming. */
export const RESUME_CONFIRM_MESSAGE =
  'Billing continues on your current plan. If your billing period has already ended, you will be asked to pay the next invoice first.';

type Props = {
  /** Reload the page's subscription data once it is active again. */
  onResumed: () => void;
};

/**
 * BUG-069: Resume a cancelled subscription. Active again at once, or - once
 * the period has ended - the invoice to pay first, which reactivates it.
 */
export default function ResumeSubscription({ onResumed }: Props) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const resume = useResumeMySubscription();

  const handleConfirm = () => {
    resume.mutate(undefined, {
      onSuccess: async (result) => {
        setConfirming(false);

        if (result.status === RESUME_RESULT.PAYMENT_REQUIRED && result.invoice_id) {
          toast.info(result.message);
          navigate(`/invoices/${result.invoice_id}`);
          return;
        }

        toast.success(result.message);
        // The route guards and the menu read the stored status: unlock them now.
        await refreshSubscription();
        onResumed();
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to resume the subscription.');
      },
    });
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-success px-2.5 py-1 fs-12 fw-medium rounded-1 d-inline-flex align-items-center gap-1"
        onClick={() => setConfirming(true)}
      >
        <i className="ri-refresh-line"></i> Resume Subscription
      </button>

      <ConfirmationModal
        show={confirming}
        onHide={() => setConfirming(false)}
        onConfirm={handleConfirm}
        loading={resume.isPending}
        title="Resume Subscription"
        message={RESUME_CONFIRM_MESSAGE}
        confirmText="Yes, Resume"
        cancelText="Not Now"
        variant="success"
      />
    </>
  );
}
