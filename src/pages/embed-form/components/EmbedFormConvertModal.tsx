import { useEffect, useRef } from 'react';
// bootstrap ships no type declarations for this subpath export
// @ts-expect-error -- untyped third-party module
import Modal from 'bootstrap/js/dist/modal';
import { useConversionPreview, type ExistingBorrowerSummary } from '../../../modules/embed-form';
import ConvertClientNotice from './ConvertClientNotice';

type Submission = {
    id?: number | string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
};

type ConvertPayload = {
    is_free_trail: true;
    free_trail_end_date: null;
    confirm_existing_borrower?: true;
};

type Props = {
    show: boolean;
    onHide?: () => void;
    onConfirm?: (payload: ConvertPayload) => void;
    submission?: Submission | null;
    loading?: boolean;
    /** Set by the page when converting answered 409: a client appeared since the preview. */
    existingBorrower?: ExistingBorrowerSummary | null;
};

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : '—');

// Embed form applicants are always enrolled on a free trial — no plan, no
// enrollment payment, and no end date until the account is manually upgraded.
export default function EmbedFormConvertModal({
    show,
    onHide,
    onConfirm,
    submission,
    loading = false,
    existingBorrower: reportedBorrower = null,
}: Props) {
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<{ show(): void; hide(): void; dispose(): void } | null>(null);

    // Asked each time the modal opens, so it says up front whether this joins
    // an existing client or creates a new one.
    const preview = useConversionPreview(submission?.id, show);
    const existingBorrower = reportedBorrower ?? preview.data?.existing_borrower ?? null;
    const isExisting = !!existingBorrower;
    const isReady = !!reportedBorrower || preview.isSuccess;
    const previewError: string | null = preview.isError
        ? (preview.error as any)?.response?.data?.message || 'Could not check whether this client already exists.'
        : null;

    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }

        return () => {
            if (modalInstanceRef.current) {
                modalInstanceRef.current.hide();
                modalInstanceRef.current.dispose();
                modalInstanceRef.current = null;
            }
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
            document.body.style.paddingRight = '';
            document.body.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            modal.show();
        } else {
            const modalElement = modalRef.current;
            if (modalElement && modalElement.classList.contains('show')) {
                modal.hide();
            }
        }
    }, [show]);

    const handleConfirm = () => {
        onConfirm?.({
            is_free_trail: true,
            free_trail_end_date: null,
            ...(isExisting ? { confirm_existing_borrower: true as const } : {}),
        });
    };

    const handleClose = () => {
        if (!loading) onHide?.();
    };

    const applicantName = submission
        ? `${submission.first_name || ''} ${submission.last_name || ''}`.trim() || 'Applicant'
        : 'Applicant';
    const initials = submission
        ? `${submission.first_name?.[0] || ''}${submission.last_name?.[0] || ''}`.toUpperCase() || 'AP'
        : 'AP';

    const title = !isReady ? 'Convert Application' : isExisting ? 'Existing Client Found' : 'Create New Client';
    const subtitle = !isReady
        ? 'Checking client records'
        : isExisting
            ? 'Please review before continuing'
            : 'Free plan · no payment required';

    return (
        <div className="modal fade flip ef-convert-modal" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header">
                        <div className="d-flex align-items-center gap-3">
                            <div className={`ef-convert-modal__icon flex-shrink-0 ${isReady ? (isExisting ? 'is-existing' : 'is-new') : ''}`}>
                                <i className={isExisting ? 'ri-user-follow-line' : 'ri-user-add-line'} />
                            </div>
                            <div>
                                <h5 className="modal-title mb-0">{title}</h5>
                                <p className="text-muted fs-12 mb-0">{subtitle}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            disabled={loading}
                            aria-label="Close"
                        />
                    </div>

                    <div className="modal-body">
                        <div className="ef-convert-modal__applicant d-flex align-items-center gap-3 p-3 mb-3">
                            <div className="ef-avatar ef-avatar--md flex-shrink-0">{initials}</div>
                            <div className="min-w-0">
                                <div className="fw-semibold text-dark fs-14 text-truncate">{applicantName}</div>
                                {submission?.email && (
                                    <div className="text-muted fs-12 text-truncate">
                                        <i className="ri-mail-line me-1" />
                                        {submission.email}
                                    </div>
                                )}
                            </div>
                        </div>

                        {!isReady && !previewError && (
                            <div className="d-flex align-items-center gap-2 text-muted fs-13 py-3" role="status">
                                <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                                Checking if this client already exists…
                            </div>
                        )}

                        {previewError && !reportedBorrower && (
                            <div className="alert alert-danger mb-0" role="alert">
                                <i className="ri-close-circle-line me-1" />
                                {previewError}
                            </div>
                        )}

                        {isReady && (
                            <>
                                <ConvertClientNotice email={submission?.email} existingBorrower={existingBorrower} />

                                {existingBorrower ? (
                                    <div className="ef-convert-modal__details mt-3">
                                        <div className="ef-convert-modal__details-label">Existing client details</div>
                                        <dl className="row fs-13 mb-0">
                                            <dt className="col-5 fw-normal text-muted">Name</dt>
                                            <dd className="col-7 mb-1">{existingBorrower.name || '—'}</dd>
                                            <dt className="col-5 fw-normal text-muted">Phone</dt>
                                            <dd className="col-7 mb-1">{existingBorrower.phone_number || '—'}</dd>
                                            <dt className="col-5 fw-normal text-muted">Business</dt>
                                            <dd className="col-7 mb-1">{existingBorrower.business_name || '—'}</dd>
                                            <dt className="col-5 fw-normal text-muted">Status</dt>
                                            <dd className="col-7 mb-1 text-capitalize">{existingBorrower.status || '—'}</dd>
                                            <dt className="col-5 fw-normal text-muted">Partner</dt>
                                            <dd className="col-7 mb-1">{existingBorrower.partner_name || '—'}</dd>
                                            <dt className="col-5 fw-normal text-muted">Funding applications</dt>
                                            <dd className="col-7 mb-1">{existingBorrower.funding_applications_count ?? 0}</dd>
                                            <dt className="col-5 fw-normal text-muted">Client since</dt>
                                            <dd className="col-7 mb-0">{formatDate(existingBorrower.created_at)}</dd>
                                        </dl>
                                    </div>
                                ) : (
                                    <ul className="ef-convert-modal__list list-unstyled mt-3 mb-0">
                                        <li>
                                            <i className="ri-infinity-line text-primary" />
                                            <span>
                                                The free plan has <strong className="text-dark">no end date</strong> — access
                                                stays active until the account is upgraded or suspended.
                                            </span>
                                        </li>
                                        <li>
                                            <i className="ri-bank-card-line text-muted" />
                                            <span>No invoice is generated and nothing is charged.</span>
                                        </li>
                                    </ul>
                                )}

                                <ul className="ef-convert-modal__list list-unstyled mt-2 mb-0">
                                    <li>
                                        <i className="ri-information-line text-warning" />
                                        <span>This submission is marked as converted and cannot be converted again.</span>
                                    </li>
                                </ul>
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-light"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        {isReady && (
                            <button
                                type="button"
                                className="btn btn-primary d-inline-flex align-items-center gap-1"
                                onClick={handleConfirm}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                        Converting...
                                    </>
                                ) : (
                                    <>
                                        <i className="ri-user-follow-line align-bottom" />
                                        {isExisting ? 'Use Existing Client & Create Funding Application' : 'Create Client & Funding Application'}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
