import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import Modal from 'bootstrap/js/dist/modal';
import { LEAD_CONVERT_AS, type Lead, type LeadConvertAs, type LeadConvertAsOption } from '../../../modules/leads/types';

const FALLBACK_OWNER_NAME: Record<LeadConvertAs, string> = {
    [LEAD_CONVERT_AS.HOST]: 'Host Partner',
    [LEAD_CONVERT_AS.LEAD_PARTNER]: 'Lead Owner Partner',
};

const OWNER_ROLE: Record<LeadConvertAs, { label: string; description: string }> = {
    [LEAD_CONVERT_AS.LEAD_PARTNER]: {
        label: 'Lead owner',
        description: 'The partner who brought in this lead manages the borrower.',
    },
    [LEAD_CONVERT_AS.HOST]: {
        label: 'Host partner',
        description: 'Your company manages the borrower directly.',
    },
};

/** The lead owner is offered first, and is the default. */
const DEFAULT_CHOICE: LeadConvertAs = LEAD_CONVERT_AS.LEAD_PARTNER;

const ownerName = (option: LeadConvertAsOption): string =>
    option.company_name || FALLBACK_OWNER_NAME[option.value];

const initialsOf = (name: string): string =>
    name.split(/\s+/).filter((word) => /^[a-z0-9]/i.test(word)).slice(0, 2).map((word) => word[0].toUpperCase()).join('');

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
    const hasText = (value?: string | null) => !!value && value.trim() !== '';

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex={-1} aria-hidden="true" aria-labelledby="lead-convert-owner-title">
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header p-3 bg-light border-bottom">
                        <h5 id="lead-convert-owner-title" className="modal-title fs-16 d-flex align-items-center gap-2">
                            <i className="ri-user-received-2-line text-primary fs-20"></i>
                            Convert Lead to Borrower
                        </h5>
                        <button type="button" className="btn-close" onClick={onHide} aria-label="Close"></button>
                    </div>

                    <div className="modal-body p-4">
                        <div className="bg-light rounded p-3 mb-4">
                            <dl className="row g-3 mb-0">
                                <div className="col-sm-6">
                                    <dt className="text-muted text-uppercase fs-11 fw-medium mb-1">Lead</dt>
                                    <dd className="mb-0">
                                        <span className="d-block fw-semibold text-body">{hasText(lead?.contact_person) ? lead?.contact_person : '-'}</span>
                                        {hasText(lead?.company_name) && <span className="d-block text-muted fs-13">{lead?.company_name}</span>}
                                    </dd>
                                </div>
                                <div className="col-sm-6">
                                    <dt className="text-muted text-uppercase fs-11 fw-medium mb-1">Owned by</dt>
                                    <dd className="mb-0 fw-semibold text-body">{leadOwner ? ownerName(leadOwner) : 'Another partner'}</dd>
                                </div>
                            </dl>
                        </div>

                        <h6 id="lead-convert-owner-question" className="fs-14 fw-semibold mb-1">Borrower belongs to</h6>
                        <p className="text-muted fs-13 mb-3">Choose the partner that will manage this borrower.</p>

                        <div className="row g-3" role="radiogroup" aria-labelledby="lead-convert-owner-question">
                            {ordered.map((option) => {
                                const role = OWNER_ROLE[option.value];
                                const name = ownerName(option);
                                const inputId = `lead-convert-as-${option.value}`;
                                const checked = selected === option.value;
                                return (
                                    <div className="col-sm-6" key={option.value}>
                                        <label
                                            htmlFor={inputId}
                                            className={`card h-100 mb-0 shadow-none border ${checked ? 'border-primary bg-primary-subtle' : ''}`}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="card-body p-3">
                                                <div className="d-flex align-items-start gap-3">
                                                    <div className="avatar-sm flex-shrink-0">
                                                        <span className={`avatar-title rounded-circle fs-15 fw-semibold ${checked ? 'bg-primary text-white' : 'bg-light text-primary'}`}>
                                                            {initialsOf(name)}
                                                        </span>
                                                    </div>
                                                    <div className="flex-grow-1 overflow-hidden">
                                                        <h6 className="fs-14 fw-semibold text-body mb-1">{name}</h6>
                                                        <div className="d-flex">
                                                            <span className="badge bg-white text-body border fs-11">{role.label}</span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        id={inputId}
                                                        type="radio"
                                                        name="lead-convert-as"
                                                        className="form-check-input mt-0 flex-shrink-0"
                                                        aria-label={`${name}, ${role.label}`}
                                                        checked={checked}
                                                        onChange={() => setSelected(option.value)}
                                                    />
                                                </div>
                                                <p className="text-muted fs-13 mb-0 mt-3">{role.description}</p>
                                            </div>
                                        </label>
                                    </div>
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
