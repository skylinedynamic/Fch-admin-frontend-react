import React, { useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';

// Embed form applicants are always enrolled on a free trial — no plan, no
// enrollment payment, and no end date until the account is manually upgraded.
export default function EmbedFormConvertModal({
    show,
    onHide,
    onConfirm,
    submission,
    loading,
}) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

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
        if (onConfirm) {
            onConfirm({
                is_free_trail: true,
                free_trail_end_date: null,
            });
        }
    };

    const handleClose = () => {
        if (!loading && onHide) {
            onHide();
        }
    };

    const applicantName = submission
        ? `${submission.first_name || ''} ${submission.last_name || ''}`.trim() || 'Applicant'
        : 'Applicant';
    const initials = submission
        ? `${submission.first_name?.[0] || ''}${submission.last_name?.[0] || ''}`.toUpperCase() || 'AP'
        : 'AP';

    return (
        <div className="modal fade flip ef-convert-modal" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header">
                        <div className="d-flex align-items-center gap-3">
                            <div className="ef-convert-modal__icon flex-shrink-0">
                                <i className="ri-vip-crown-2-line" />
                            </div>
                            <div>
                                <h5 className="modal-title mb-0">Convert to Free Plan Borrower</h5>
                                <p className="text-muted fs-12 mb-0">No plan or payment required</p>
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

                        <ul className="ef-convert-modal__list list-unstyled mb-0">
                            <li>
                                <i className="ri-checkbox-circle-fill text-primary" />
                                <span>
                                    An <strong className="text-dark">active borrower account</strong> is created and
                                    welcome credentials are emailed to the applicant.
                                </span>
                            </li>
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
                            <li>
                                <i className="ri-information-line text-warning" />
                                <span>This submission is marked as converted and cannot be converted again.</span>
                            </li>
                        </ul>
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
                                    Convert to Free Plan Borrower
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
