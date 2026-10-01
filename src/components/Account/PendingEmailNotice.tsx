import React, { useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { cancelEmailChange, resendEmailChange } from '../../modules/account';

type Props = {
  /** The login the pending change belongs to. */
  userId?: string | number | null;
  pendingEmail?: string | null;
  /** Called with the pending email after a resend, or null after a cancel. */
  onChange: (pendingEmail: string | null) => void;
  /** Hide the actions for someone who can view but not edit the record. */
  canManage?: boolean;
};

const BUBBLE_BG = 'var(--vz-warning-bg-subtle, #fef4e4)';
const BUBBLE_BORDER = 'var(--vz-warning-border-subtle, #fbd9a6)';
const BUBBLE_TEXT = 'var(--vz-warning-text-emphasis, #9c6b16)';

/** Space kept between the end of the label and the bubble. */
const LABEL_GAP = 12;

/**
 * A new sign-in email isn't applied when the form is saved — it waits until
 * the link emailed to the new address is clicked. This says so in a bubble
 * floating above the email field, pointing down at it, and lets an admin
 * resend that link or withdraw the change.
 *
 * Render it directly AFTER the field's label and before the input: it starts
 * where the label ends (so the label stays visible), is at most two lines
 * tall, and takes no space of its own, so the form layout doesn't shift.
 */
export default function PendingEmailNotice({ userId, pendingEmail, onChange, canManage = true }: Props) {
  const [busy, setBusy] = useState<'resend' | 'cancel' | null>(null);
  const [labelWidth, setLabelWidth] = useState(0);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Start the bubble after the label, following it if the layout resizes.
  useLayoutEffect(() => {
    const label = anchorRef.current?.previousElementSibling as HTMLElement | null;
    if (!label) return;

    const measure = () => {
      // The label's text, not the (block-level) element's full width.
      const range = document.createRange();
      range.selectNodeContents(label);
      setLabelWidth(Math.ceil(range.getBoundingClientRect().width));
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(label);
    return () => observer.disconnect();
  }, [pendingEmail, userId]);

  if (!pendingEmail || !userId) {
    return null;
  }

  const run = async (action: 'resend' | 'cancel') => {
    setBusy(action);
    try {
      if (action === 'resend') {
        await resendEmailChange(userId);
        toast.success(`A new confirmation link has been sent to ${pendingEmail}.`);
        onChange(pendingEmail);
      } else {
        await cancelEmailChange(userId);
        toast.success('The pending email change has been cancelled.');
        onChange(null);
      }
    } catch (error: any) {
      // 403s are already toasted by the shared API client.
      if (error?.response?.status !== 403) {
        toast.error(error?.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(null);
    }
  };

  const message = `Waiting for confirmation from ${pendingEmail}. The sign-in email changes once the link sent there is clicked.`;

  return (
    <div ref={anchorRef} style={{ position: 'relative', height: 0 }}>
      <div
        role="status"
        className="d-flex align-items-center gap-2 px-3 py-2 fs-12 rounded shadow-sm"
        style={{
          position: 'absolute',
          left: labelWidth + LABEL_GAP,
          right: 0,
          bottom: 8,
          zIndex: 5,
          lineHeight: 1.6,
          background: BUBBLE_BG,
          border: `1px solid ${BUBBLE_BORDER}`,
          color: BUBBLE_TEXT,
        }}
      >
        {/* At most two lines; the full text is in the tooltip if it's cut. */}
        <span
          title={message}
          className="flex-grow-1 text-break"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minWidth: 0 }}
        >
          {/* Inline, so the second line wraps back under the icon. */}
          <i className="ri-mail-send-line me-1" style={{ fontSize: 13, lineHeight: 1, verticalAlign: '-2px' }}></i>
          Waiting for confirmation from <strong>{pendingEmail}</strong>. The sign-in email changes once the link
          sent there is clicked.
        </span>

        {canManage && (
          <span className="d-flex flex-shrink-0 gap-2 text-nowrap">
            <button type="button" className="btn btn-link p-0 fs-12 fw-medium" disabled={!!busy} onClick={() => run('resend')}>
              {busy === 'resend' ? 'Sending…' : 'Resend link'}
            </button>
            <button type="button" className="btn btn-link p-0 fs-12 fw-medium text-danger" disabled={!!busy} onClick={() => run('cancel')}>
              {busy === 'cancel' ? 'Cancelling…' : 'Cancel change'}
            </button>
          </span>
        )}

        {/* The arrow, pointing down at the email field. */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 28,
            bottom: -7,
            width: 12,
            height: 12,
            transform: 'rotate(45deg)',
            background: BUBBLE_BG,
            borderRight: `1px solid ${BUBBLE_BORDER}`,
            borderBottom: `1px solid ${BUBBLE_BORDER}`,
          }}
        />
      </div>
    </div>
  );
}
