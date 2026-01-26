import React, { useEffect, useRef, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { Dropdown } from 'primereact/dropdown';
import { ENROLLMENT_TYPE_OPTIONS, NON_HOST_ENROLLMENT_PRICE, NON_HOST_ENROLLMENT_VALUE } from '../../../config/enrollmentOptions';
import { PARTNER_INFORMATION_TYPE_OPTIONS, PAYMENT_TYPE_OPTIONS, ENROLLMENT_TYPES } from '../../../config/partnerTypeOptions';

export default function LeadConvertModal({ show, onHide, onConfirm, lead, targetType = 'Borrower', loading, isHost }) {
    const [enrollmentType, setEnrollmentType] = useState('One Time Payment');
    const [partnerType, setPartnerType] = useState('');
    const [partnerEnrollmentType, setPartnerEnrollmentType] = useState('');
    
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    // Initialize Modal
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
        };
    }, [modalRef]);

    // Show/Hide Logic
    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            modal.show();
        } else {
            modal.hide();
        }
    }, [show]);

    const handleConfirm = () => {
        const payload = {};
        if (targetType === 'Borrower') {
            payload.enrollment_type = isHost ? enrollmentType : NON_HOST_ENROLLMENT_VALUE;
            
            // Derive amount from enrollment type
            if (isHost) {
                const selectedOption = ENROLLMENT_TYPE_OPTIONS.find(opt => opt.value === enrollmentType);
                payload.amount = selectedOption ? selectedOption.price : 0;
            } else {
                payload.amount = NON_HOST_ENROLLMENT_PRICE;
            }
        } else if (targetType === 'Partner') {
            payload.partner_type = partnerType;
            payload.enrollment_type = partnerEnrollmentType;
            
            // Derive amount from partner type and enrollment type
            const selectedPartnerType = PARTNER_INFORMATION_TYPE_OPTIONS.find(pt => pt.value === partnerType);
            if (selectedPartnerType) {
                if (partnerEnrollmentType === ENROLLMENT_TYPES.ONE_TIME_STR) {
                    payload.amount = selectedPartnerType.oneTimeFee;
                } else if (partnerEnrollmentType === ENROLLMENT_TYPES.PAYMENT_PLAN_STR) {
                    payload.amount = selectedPartnerType.monthlyPayment;
                }
            }
        }
        onConfirm(payload);
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    const title = `Convert Lead to ${targetType}`;
    const confirmBtnClass = targetType === 'Partner' ? 'btn-success' : 'btn-primary';
    const confirmBtnText = `Convert to ${targetType}`;
    const icon = targetType === 'Partner' ? 'ri-shake-hands-line text-success' : 'ri-user-received-2-line text-primary';

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-4 text-center">
                        <i className={`${icon} display-4 mb-3 d-block`}></i>
                        <h4 className="mb-2">{title}</h4>
                        <p className="text-muted mb-4">
                            Are you sure you want to convert <strong>{lead?.contact_person || lead?.contact_name || lead?.company_name || 'this lead'}</strong> to a <strong>{targetType}</strong>? 
                            This action will create a new {targetType.toLowerCase()} profile and cannot be undone.
                        </p>

                        {/* Borrower Conversion Fields */}
                        {targetType === 'Borrower' && isHost && (
                            <div className="mb-4 text-start">
                                <label className="form-label fw-semibold">Select Enrollment Type <span className="text-danger">*</span></label>
                                <Dropdown
                                    value={enrollmentType}
                                    options={ENROLLMENT_TYPE_OPTIONS}
                                    onChange={(e) => setEnrollmentType(e.value)}
                                    placeholder="Select Enrollment Type"
                                    className="w-100"
                                    appendTo="self"
                                />
                                <div className="form-text text-info mt-2">
                                    {enrollmentType === 'One Time Payment' ? (
                                        <span><i className="ri-information-line me-1"></i> Total Payment: <strong>$2,900</strong></span>
                                    ) : (
                                        <span><i className="ri-information-line me-1"></i> Monthly Payment: <strong>$500</strong></span>
                                    )}
                                </div>
                            </div>
                        )}

                        {!isHost && targetType === 'Borrower' && (
                            <div className="mb-4 text-start bg-success bg-opacity-10 p-4 rounded-4 border border-success border-opacity-10 d-flex align-items-center animate__animated animate__fadeInUp">
                                <div className="flex-shrink-0 me-3">
                                    <div className="bg-white p-3 rounded-3 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                                        <i className="ri-money-dollar-box-fill text-success" style={{ fontSize: '3rem' }}></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ps-2">
                                    <h5 className="text-success fw-bold mb-1 fs-18">Enrollment Fee Applied</h5>
                                    <p className="mb-0 text-muted fs-15 lh-base">
                                        A fixed enrollment fee <span className="text-success fw-bold fs-18">${NON_HOST_ENROLLMENT_PRICE}</span>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Partner Conversion Fields */}
                        {targetType === 'Partner' && (
                            <div className="mb-4 text-start">
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Select Partner Type <span className="text-danger">*</span></label>
                                    <Dropdown
                                        value={partnerType}
                                        options={PARTNER_INFORMATION_TYPE_OPTIONS}
                                        onChange={(e) => {
                                            setPartnerType(e.value);
                                            setPartnerEnrollmentType(''); // Reset enrollment type when partner type changes
                                        }}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Select Partner Type"
                                        className="w-100"
                                        appendTo="self"
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Select Enrollment Type <span className="text-danger">*</span></label>
                                    <Dropdown
                                        value={partnerEnrollmentType}
                                        options={(() => {
                                            const selectedPT = PARTNER_INFORMATION_TYPE_OPTIONS.find(pt => pt.value === partnerType);
                                            if (!selectedPT) return PAYMENT_TYPE_OPTIONS;
                                            
                                            return [
                                                {
                                                    label: `${ENROLLMENT_TYPES.ONE_TIME_STR} ($${selectedPT.oneTimeFee?.toLocaleString()})`,
                                                    value: ENROLLMENT_TYPES.ONE_TIME_STR
                                                },
                                                {
                                                    label: `${ENROLLMENT_TYPES.PAYMENT_PLAN_STR.replace(' (', ` ($${selectedPT.monthlyPayment?.toLocaleString()}/mo, `)}`,
                                                    value: ENROLLMENT_TYPES.PAYMENT_PLAN_STR
                                                }
                                            ];
                                        })()}
                                        onChange={(e) => setPartnerEnrollmentType(e.value)}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Select Enrollment Type"
                                        className="w-100"
                                        appendTo="self"
                                        disabled={!partnerType}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="hstack gap-2 justify-content-center">
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
                                className={`btn ${confirmBtnClass}`}
                                onClick={handleConfirm}
                                disabled={loading || (targetType === 'Partner' && (!partnerType || !partnerEnrollmentType))}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                        Converting...
                                    </>
                                ) : confirmBtnText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

