import React, { useEffect, useRef, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { Dropdown } from 'primereact/dropdown';
import { PAYMENT_TYPE_OPTIONS, ENROLLMENT_TYPES } from '../../../config/partnerTypeOptions';
import { ENROLLMENT_TYPE_OPTIONS } from '../../../config/enrollmentOptions';
import { fetchPartnerPlans, fetchNonHostBorrowerPlans } from '../../../modules/partner/services';

export default function LeadConvertModal({ show, onHide, onConfirm, lead, targetType = 'Borrower', loading, isHost }) {
    const [enrollmentType, setEnrollmentType] = useState('One Time Payment');
    const [partnerType, setPartnerType] = useState('');
    const [partnerEnrollmentType, setPartnerEnrollmentType] = useState('');
    const [partnerPlans, setPartnerPlans] = useState([]);
    const [nonHostPlans, setNonHostPlans] = useState([]);
    
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
            // Robust cleanup of any orphaned backdrop elements
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
            document.body.style.paddingRight = '';
            document.body.style.overflow = '';
        };
    }, [modalRef]);

    // Show/Hide Logic
    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            modal.show();
            // Fetch plans when modal opens
            const loadData = async () => {
                try {
                    const promises = [fetchPartnerPlans()];
                    
                    if (!isHost) {
                        promises.push(fetchNonHostBorrowerPlans());
                    }

                    const results = await Promise.all(promises);
                    const plansRes = results[0];
                    const nonHostPlansRes = !isHost ? results[1] : null;

                    if (plansRes.status) setPartnerPlans(plansRes.data || []);
                    if (nonHostPlansRes && nonHostPlansRes.status) setNonHostPlans(nonHostPlansRes.data || []);
                } catch (err) {
                    console.error('Failed to fetch lead conversion data:', err);
                }
            };
            loadData();
        } else {
            // Check if it's already shown before calling hide
            const modalElement = modalRef.current;
            if (modalElement && modalElement.classList.contains('show')) {
                modal.hide();
            }
        }
    }, [show, isHost]);

    const handleConfirm = () => {
        const payload = {};
        if (targetType === 'Borrower') {
            if (isHost) {
                payload.enrollment_type = enrollmentType;
                const selectedOption = ENROLLMENT_TYPE_OPTIONS.find(opt => opt.value === enrollmentType);
                payload.amount = selectedOption ? selectedOption.price : 0;
            } else {
                const plan = nonHostPlans?.[0];
                payload.enrollment_type = plan?.enrollment_type || '';
                payload.amount = plan?.payment_amount ? parseFloat(plan.payment_amount) : 800;
            }
        } else if (targetType === 'Partner') {
            payload.partner_type = partnerType;
            payload.enrollment_type = partnerEnrollmentType;
            
            // Derive amount from partner type and enrollment type from dynamic plans
            const selectedPlan = partnerPlans.find(plan => 
                (plan.partner_type === partnerType || (!partnerType && !plan.partner_type)) && 
                plan.enrollment_type === partnerEnrollmentType
            );
            
            if (selectedPlan) {
                payload.enrollment_amount = selectedPlan.payment_amount;
                payload.amount = selectedPlan.payment_amount;
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

                        {/* Borrower Conversion Fees - Dynamic */}
                        {targetType === 'Borrower' && (
                            <>
                                {isHost ? (
                                    <div className="mb-4 text-start">
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">Select Enrollment Type <span className="text-danger">*</span></label>
                                            <Dropdown
                                                value={enrollmentType}
                                                options={ENROLLMENT_TYPE_OPTIONS}
                                                onChange={(e) => setEnrollmentType(e.value)}
                                                optionLabel="label"
                                                optionValue="value"
                                                placeholder="Select Enrollment Type"
                                                className="w-100"
                                                appendTo="self"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-4 text-start bg-success bg-opacity-10 p-4 rounded-4 border border-success border-opacity-10 d-flex align-items-center animate__animated animate__fadeInUp">
                                        {/* Hidden enrollment type for non-host */}
                                        <input type="hidden" value={nonHostPlans?.[0]?.enrollment_type || 'Fixed enrollment'} />
                                        <div className="flex-shrink-0 me-3">
                                            <div className="bg-white p-3 rounded-3 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                                                <i className="ri-money-dollar-box-fill text-success" style={{ fontSize: '3rem' }}></i>
                                            </div>
                                        </div>
                                        <div className="flex-grow-1 ps-2">
                                            <h5 className="text-success fw-bold mb-1 fs-18">Enrollment Fee Applied</h5>
                                            <p className="mb-0 text-muted fs-15 lh-base">
                                                A fixed enrollment fee <span className="text-success fw-bold fs-18">${nonHostPlans?.[0]?.payment_amount ? parseFloat(nonHostPlans[0].payment_amount).toFixed(2) : '800.00' }</span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Partner Conversion Fields */}
                        {targetType === 'Partner' && (
                            <div className="mb-4 text-start">
                                {/* Only show Partner Type dropdown if there are distinct non-null partner types */}
                                {Array.from(new Set((partnerPlans || []).map(p => p.partner_type))).filter(Boolean).length > 0 && (
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Select Partner Type <span className="text-danger">*</span></label>
                                        <Dropdown
                                            value={partnerType}
                                            options={Array.from(new Set((partnerPlans || []).map(p => p.partner_type))).filter(Boolean).map(type => ({
                                                label: type,
                                                value: type
                                            }))}
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
                                )}

                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Select Enrollment Type <span className="text-danger">*</span></label>
                                    <Dropdown
                                        value={partnerEnrollmentType}
                                        options={(partnerPlans || [])
                                            .filter(plan => !partnerType || plan.partner_type === partnerType || (Array.from(new Set((partnerPlans || []).map(p => p.partner_type))).filter(Boolean).length === 0))
                                            .map(plan => ({
                                                label: `${plan.enrollment_type} ($${(plan.payment_amount || 0).toLocaleString()})`,
                                                value: plan.enrollment_type
                                            }))
                                        }
                                        onChange={(e) => setPartnerEnrollmentType(e.value)}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Select Enrollment Type"
                                        className="w-100"
                                        appendTo="self"
                                        // Disabled only if we have partner types but haven't selected one yet
                                        disabled={Array.from(new Set((partnerPlans || []).map(p => p.partner_type))).filter(Boolean).length > 0 && !partnerType}
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
                                disabled={loading || (targetType === 'Partner' && (
                                    (Array.from(new Set((partnerPlans || []).map(p => p.partner_type))).filter(Boolean).length > 0 && !partnerType) || 
                                    !partnerEnrollmentType
                                ))}
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

