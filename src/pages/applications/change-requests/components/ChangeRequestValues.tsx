import { useState } from 'react';
import { CHANGE_REQUEST_SSN_FIELDS, useRevealChangeRequest } from '../../../../modules/change-request';
import type { ChangeRequest, ChangeRequestRevealed } from '../../../../modules/change-request';
import { formatEIN, formatSSN } from '../../../../utils/borrowerFormatters';

/**
 * The review's current and requested values. An SSN or EIN change arrives
 * masked (BUG-014); one button fetches both numbers in full and hides them again.
 */
export default function ChangeRequestValues({ row }: { row: ChangeRequest }) {
    const reveal = useRevealChangeRequest();
    const [revealed, setRevealed] = useState<ChangeRequestRevealed | null>(null);
    const [visible, setVisible] = useState(false);
    const format = CHANGE_REQUEST_SSN_FIELDS.includes(row.field_name) ? formatSSN : formatEIN;

    const toggle = async () => {
        if (visible) {
            setVisible(false);
            return;
        }
        if (!revealed) {
            try {
                setRevealed(await reveal.mutateAsync(row.id));
            } catch {
                return;
            }
        }
        setVisible(true);
    };

    const shown = (masked: string | null, full: string | null | undefined) =>
        (visible && full ? format(full) : masked) || <span className="fst-italic text-muted fw-normal">empty</span>;

    return (
        <div className="mb-4">
            <div className="row g-3">
                <div className="col-6">
                    <div className="p-3 rounded bg-danger-subtle">
                        <p className="text-muted fs-11 mb-1 text-uppercase fw-semibold" style={{ letterSpacing: '0.08em' }}>
                            Current Value
                        </p>
                        <p className="mb-0 fw-medium text-danger text-decoration-line-through">
                            {shown(row.old_value, revealed?.old_value)}
                        </p>
                    </div>
                </div>
                <div className="col-6">
                    <div className="p-3 rounded bg-success-subtle">
                        <p className="text-muted fs-11 mb-1 text-uppercase fw-semibold" style={{ letterSpacing: '0.08em' }}>
                            Requested Value
                        </p>
                        <p className="mb-0 fw-semibold text-success">
                            {shown(row.new_value, revealed?.new_value)}
                        </p>
                    </div>
                </div>
            </div>
            {row.is_masked && (
                <button
                    type="button"
                    className="btn btn-sm btn-link px-0 mt-2 text-muted"
                    onClick={toggle}
                    disabled={reveal.isPending}
                    aria-label={visible ? 'Hide numbers' : 'Show numbers'}
                >
                    <i className={`${visible ? 'ri-eye-close-line' : 'ri-eye-2-line'} me-1`}></i>
                    {visible ? 'Hide numbers' : 'Show numbers'}
                </button>
            )}
        </div>
    );
}
