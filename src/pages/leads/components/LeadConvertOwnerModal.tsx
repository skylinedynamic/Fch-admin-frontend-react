import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import Modal from 'bootstrap/js/dist/modal';
import { LEAD_CONVERT_AS, type Lead, type LeadConvertAs, type LeadConvertAsOption } from '../../../modules/leads/types';

const FALLBACK_OWNER_NAME: Record<LeadConvertAs, string> = {
    [LEAD_CONVERT_AS.HOST]: 'Host Partner',
    [LEAD_CONVERT_AS.LEAD_PARTNER]: 'Lead Owner Partner',
};

const OWNER_ROLE: Record<LeadConvertAs, string> = {
    [LEAD_CONVERT_AS.LEAD_PARTNER]: 'Lead owner',
    [LEAD_CONVERT_AS.HOST]: 'Host partner',
};

/** The lead owner is offered first, and is the default. */
const DEFAULT_CHOICE: LeadConvertAs = LEAD_CONVERT_AS.LEAD_PARTNER;

const ownerName = (option: LeadConvertAsOption): string =>
    option.company_name || FALLBACK_OWNER_NAME[option.value];

interface LeadConvertOwnerModalProps {
    show: boolean;
    options: LeadConvertAsOption[];
    lead?: Pick<Lead, 'contact_person' | 'company_name'> | null;
    onSelect: (value: LeadConvertAs) => void;
    onHide: () => void;
}

/** Asks the host which partner another partner's lead becomes a borrower of. */
export default function LeadConvertOwnerModal({ show, options, lead, onSelect, onHide }: LeadConvertOwnerModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<Modal | null>(null);
    const [selected, setSelected] = useState<LeadConvertAs>(DEFAULT_CHOICE);

    useEffect(() => {
        if (!modalRef.current) return;
        modalInstanceRef.current = new Modal(modalRef.current, { backdrop: 'static', keyboard: false });

        return () => {
            modalInstanceRef.current?.dispose();
            modalInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (show) setSelected(DEFAULT_CHOICE);

        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            modal.show();
        } else {
            modal.hide();
        }
    }, [show]);

    const ordered = [...options].sort((a, b) => Number(b.value === DEFAULT_CHOICE) - Number(a.value === DEFAULT_CHOICE));
    const leadOwner = options.find((option) => option.value === LEAD_CONVERT_AS.LEAD_PARTNER);
    const selectedOption = options.find((option) => option.value === selected);
    const leadName = [lead?.contact_person, lead?.company_name].filter((part) => part && part.trim() !== '').join(' · ');

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex={-1} aria-hidden="true" aria-labelledby="lead-convert-owner-title">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header p-3 bg-light border-bottom">
                        <h5 id="lead-convert-owner-title" className="modal-title fs-16 d-flex align-items-center gap-2">
                            <i className="ri-user-received-2-line text-primary fs-20"></i>
                            Convert Lead to Borrower
                        </h5>
                        <button type="button" className="btn-close" onClick={onHide} aria-label="Close"></button>
                    </div>

                    <div className="modal-body p-4">
                        <div className="mb-4">
                            {leadName && (
                                <p className="text-muted mb-1">Lead: <span className="fw-medium text-body">{leadName}</span></p>
                            )}
                            <p className="text-muted mb-0">Owned by: <span className="fw-medium text-body">{leadOwner ? ownerName(leadOwner) : 'another partner'}</span></p>
                        </div>

                        <h6 id="lead-convert-owner-question" className="fs-14 fw-semibold mb-2">Borrower belongs to</h6>
                        <div className="d-flex flex-column gap-2" role="radiogroup" aria-labelledby="lead-convert-owner-question">
                            {ordered.map((option) => {
                                const role = OWNER_ROLE[option.value];
                                const inputId = `lead-convert-as-${option.value}`;
                                const checked = selected === option.value;
                                return (
                                    <label
                                        key={option.value}
                                        htmlFor={inputId}
                                        className={`d-flex align-items-center gap-3 border rounded p-3 mb-0 ${checked ? 'border-primary bg-primary-subtle' : ''}`}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <input
                                            id={inputId}
                                            type="radio"
                                            name="lead-convert-as"
                                            className="form-check-input mt-0 flex-shrink-0"
                                            aria-label={`${ownerName(option)}, ${role}`}
                                            checked={checked}
                                            onChange={() => setSelected(option.value)}
                                        />
                                        <span className="fw-medium text-body flex-grow-1">{ownerName(option)}</span>
                                        <span className="badge bg-white text-body border fs-12">{role}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="modal-footer px-4 pb-4 pt-0 border-0">
                        <div className="hstack gap-2 justify-content-end w-100">
                            <button type="button" className="btn btn-light" onClick={onHide}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={!selectedOption}
                                onClick={() => selectedOption && onSelect(selectedOption.value)}
                            >
                                Continue <i className="ri-arrow-right-line align-middle ms-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
