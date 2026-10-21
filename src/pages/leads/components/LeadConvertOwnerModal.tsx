import React, { useEffect, useRef } from 'react';
// @ts-ignore
import Modal from 'bootstrap/js/dist/modal';
import type { Lead } from '../../../modules/leads/types';

const FALLBACK_PARTNER_NAME = 'the lead partner';

/** A little wider than Bootstrap's 500px default, short of modal-lg's 800px. */
const DIALOG_MAX_WIDTH = '600px';

type OwnerLead = Pick<Lead, 'contact_person' | 'company_name' | 'email' | 'convert_on_behalf_of'> & {
    phone_number?: string | null;
};

interface LeadConvertOwnerModalProps {
    show: boolean;
    lead?: OwnerLead | null;
    onContinue: () => void;
    onHide: () => void;
}

const hasText = (value?: string | null): value is string => !!value && value.trim() !== '';

/**
 * Shows the host the lead it is converting and alerts that the lead is
 * another partner's: it is converted on that partner's behalf, and the
 * borrower belongs to that partner.
 */
export default function LeadConvertOwnerModal({ show, lead, onContinue, onHide }: LeadConvertOwnerModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<Modal | null>(null);

    useEffect(() => {
        if (!modalRef.current) return;
        modalInstanceRef.current = new Modal(modalRef.current, { backdrop: 'static', keyboard: false });

        return () => {
            modalInstanceRef.current?.dispose();
            modalInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            modal.show();
        } else {
            modal.hide();
        }
    }, [show]);

    const companyName = lead?.convert_on_behalf_of?.company_name;
    const partnerName = hasText(companyName) ? companyName : FALLBACK_PARTNER_NAME;
    const details: { label: string; value?: string | null }[] = [
        { label: 'Lead', value: lead?.contact_person },
        { label: 'Company', value: lead?.company_name },
        { label: 'Email', value: lead?.email },
        { label: 'Phone', value: lead?.phone_number },
        { label: 'Lead Partner', value: partnerName },
    ];

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex={-1} aria-hidden="true" aria-labelledby="lead-convert-owner-title">
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: DIALOG_MAX_WIDTH }}>
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header p-3 bg-light border-bottom">
                        <h5 id="lead-convert-owner-title" className="modal-title fs-16 d-flex align-items-center gap-2">
                            <i className="ri-user-received-2-line text-primary fs-20"></i>
                            Convert Lead to Borrower
                        </h5>
                        <button type="button" className="btn-close" onClick={onHide} aria-label="Close"></button>
                    </div>

                    <div className="modal-body p-4">
                        {show && (
                            <div className="alert alert-warning d-flex align-items-center gap-3 mb-4" role="alert">
                                <div className="avatar-sm flex-shrink-0">
                                    <span className="avatar-title rounded-circle bg-warning-subtle text-warning fs-22">
                                        <i className="ri-error-warning-line"></i>
                                    </span>
                                </div>
                                <div>
                                    This lead belongs to <strong>{partnerName}</strong>. You are converting it to a borrower on behalf
                                    of <strong>{partnerName}</strong> - the borrower will belong to {partnerName}, not to your company.
                                </div>
                            </div>
                        )}

                        <div className="bg-light rounded p-3">
                            <dl className="row g-3 mb-0">
                                {details.map(({ label, value }) => (
                                    <div className="col-sm-6" key={label}>
                                        <dt className="text-muted text-uppercase fs-11 fw-medium mb-1">{label}</dt>
                                        <dd className="mb-0 fw-semibold text-body text-break">{hasText(value) ? value : '-'}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>

                    <div className="modal-footer px-4 pb-4 pt-0 border-0">
                        <div className="hstack gap-2 justify-content-end w-100">
                            <button type="button" className="btn btn-light" onClick={onHide}>
                                Cancel
                            </button>
                            <button type="button" className="btn btn-primary" onClick={onContinue}>
                                Continue <i className="ri-arrow-right-line align-middle ms-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
