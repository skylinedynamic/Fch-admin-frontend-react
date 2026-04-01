import React, { useEffect, useRef, useState, useMemo } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { Dropdown } from 'primereact/dropdown';
import { fetchPartnerPlans } from '../../../modules/partner/services';
import { fetchBorrowerPlans, fetchNonHostBorrowerPlans } from '../../../modules/client/services';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_BORROWER } from '../../../config/appConfig';
import LeadConvertSkeleton from '../../../components/Loader/LeadConvertSkeleton';

export default function LeadConvertModal({ show, onHide, onConfirm, lead, targetType = ENTITY_TYPE_BORROWER, loading, isHost, backendErrors = {}, onFieldChange }) {
    const [planId, setPlanId] = useState(null);
    const [enrollmentType, setEnrollmentType] = useState('');
    const [partnerType, setPartnerType] = useState('');
    const [partnerEnrollmentType, setPartnerEnrollmentType] = useState('');
    const [partnerPlans, setPartnerPlans] = useState([]);
    const [borrowerPlans, setBorrowerPlans] = useState([]);
    const [fetching, setFetching] = useState(false);

    // Custom overrides for isHost
    const [customEnrollmentAmount, setCustomEnrollmentAmount] = useState('');
    const [customPlatformFee, setCustomPlatformFee] = useState('');

    // Validation errors
    const [validationErrors, setValidationErrors] = useState({});

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

    useEffect(() => {
        if (backendErrors && Object.keys(backendErrors).length > 0) {
            setValidationErrors(backendErrors);
        }
    }, [backendErrors]);

    // Show/Hide Logic
    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            setFetching(true);
            modal.show();
            // Fetch plans when modal opens
            const loadData = async () => {
                try {
                    const promises = [fetchPartnerPlans()];

                    if (targetType == ENTITY_TYPE_BORROWER) {
                        if (isHost) {
                            promises.push(fetchBorrowerPlans());
                        } else {
                            promises.push(fetchNonHostBorrowerPlans());
                        }
                    }

                    const results = await Promise.all([
                        ...promises,
                        new Promise(resolve => setTimeout(resolve, 500))
                    ]);
                    const partnerPlansRes = results[0];
                    const borrowerPlansRes = results[1];

                    if (partnerPlansRes.status) setPartnerPlans(partnerPlansRes.data || []);
                    if (borrowerPlansRes && borrowerPlansRes.status) {
                        const plans = borrowerPlansRes.data || [];
                        setBorrowerPlans(plans);
                        // Auto-select first plan (especially for non-host)
                        if (plans.length > 0) {
                            setPlanId(plans[0].id);
                            setEnrollmentType(plans[0].enrollment_type);
                            if (isHost) {
                                setCustomEnrollmentAmount(plans[0].payment_amount || '');
                                setCustomPlatformFee(plans[0].platform_fee || 0);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch lead conversion data:', err);
                } finally {
                    setFetching(false);
                }
            };
            loadData();
        } else {
            // Check if it's already shown before calling hide
            const modalElement = modalRef.current;
            if (modalElement && modalElement.classList.contains('show')) {
                modal.hide();
            }
            // Reset state
            setPlanId(null);
            setEnrollmentType('');
            setPartnerType('');
            setPartnerEnrollmentType('');
            setValidationErrors({});
        }
    }, [show, isHost, targetType]);

    const enrollmentOptions = useMemo(() => {
        return borrowerPlans.map(plan => ({
            label: `${plan.enrollment_type} ($${Number(plan.payment_amount).toLocaleString()})`,
            value: plan.id,
            price: Number(plan.payment_amount),
            enrollment_type: plan.enrollment_type
        }));
    }, [borrowerPlans]);

    const handleConfirm = () => {
        setValidationErrors({}); // Clear errors before submission

        // --- Build Payload ---
        const payload = {};
        if (targetType == ENTITY_TYPE_BORROWER) {
            payload.plan_id = planId;
            payload.enrollment_type = enrollmentType;

            const selectedPlan = borrowerPlans.find(plan => plan.id === planId);
            if (selectedPlan) {
                if (isHost) {
                    payload.enrollment_amount = customEnrollmentAmount;
                    payload.amount = customEnrollmentAmount;
                    payload.monthly_platform_fee = customPlatformFee;
                } else {
                    payload.enrollment_amount = selectedPlan.payment_amount;
                    payload.amount = selectedPlan.payment_amount;
                }
            }
        } else if (targetType == ENTITY_TYPE_PARTNER) {
            payload.partner_type = partnerType;
            payload.enrollment_type = partnerEnrollmentType;

            const selectedPlan = partnerPlans.find(plan =>
                (plan.partner_type === partnerType || (!partnerType && !plan.partner_type)) &&
                plan.enrollment_type === partnerEnrollmentType
            );

            if (selectedPlan) {
                payload.plan_id = selectedPlan.id;
                if (isHost) {
                    payload.enrollment_amount = customEnrollmentAmount;
                    payload.amount = customEnrollmentAmount;
                    payload.monthly_platform_fee = customPlatformFee;
                } else {
                    payload.enrollment_amount = (selectedPlan.payment_amount || 0);
                    payload.amount = payload.enrollment_amount;
                }
            }
        }
        onConfirm(payload);
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    const title = `Convert Lead to ${targetType}`;
    const confirmBtnClass = targetType == ENTITY_TYPE_PARTNER ? 'btn-success' : 'btn-primary';
    const confirmBtnText = `Convert to ${targetType}`;
    const icon = targetType == ENTITY_TYPE_PARTNER ? 'ri-shake-hands-line text-success' : 'ri-user-received-2-line text-primary';

    const selectedBorrowerPlan = borrowerPlans.find(p => p.id === planId);
    const selectedPartnerPlan = useMemo(() => {
        if (targetType != ENTITY_TYPE_PARTNER) return null;
        return partnerPlans.find(plan =>
            (plan.partner_type === partnerType || (!partnerType && !plan.partner_type)) &&
            plan.enrollment_type === partnerEnrollmentType
        );
    }, [partnerPlans, partnerType, partnerEnrollmentType, targetType]);

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-4 text-center">
                        {fetching ? (
                            <LeadConvertSkeleton targetType={targetType} isHost={isHost} />
                        ) : (
                            <>
                                <i className={`${icon} display-4 mb-3 d-block`}></i>
                                <h4 className="mb-2">{title}</h4>
                                <p className="text-muted mb-4">
                                    Are you sure you want to convert <strong>{lead?.contact_person || lead?.contact_name || lead?.company_name || 'this lead'}</strong> to a <strong>{targetType}</strong>?
                                    This action will create a new {targetType.toLowerCase()} profile and cannot be undone.
                                </p>

                                {/* Borrower Conversion Fees - Dynamic */}
                                {targetType == ENTITY_TYPE_BORROWER && (
                                    <div className="mb-4 text-start">
                                        {isHost ? (
                                            <div className="mb-3">
                                                <label className="form-label fw-semibold">Select Enrollment Type <span className="text-danger">*</span></label>
                                                <Dropdown
                                                    value={planId}
                                                    options={enrollmentOptions}
                                                    onChange={(e) => {
                                                        setPlanId(e.value);
                                                        const opt = enrollmentOptions.find(o => o.value === e.value);
                                                        const type = opt ? opt.enrollment_type : '';
                                                        setEnrollmentType(type);

                                                        // Inform parent to clear backend errors for these fields
                                                        if (onFieldChange) {
                                                            onFieldChange(['plan_id', 'enrollment_type']);
                                                        }

                                                        // Sync custom amounts for host
                                                        if (isHost && opt) {
                                                            const originalPlan = borrowerPlans.find(plan => plan.id === e.value);
                                                            if (originalPlan) {
                                                                setCustomEnrollmentAmount(originalPlan.payment_amount || '');
                                                                setCustomPlatformFee(originalPlan.platform_fee || 0);
                                                                if (onFieldChange) {
                                                                    onFieldChange(['enrollment_amount', 'amount', 'monthly_platform_fee', 'platform_fee']);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select Enrollment Type"
                                                    className={`w-100 ${(validationErrors.plan_id || backendErrors?.plan_id || backendErrors?.enrollment_type) ? 'p-invalid' : ''}`}
                                                    appendTo="self"
                                                />
                                                {(validationErrors.plan_id || backendErrors?.plan_id || backendErrors?.enrollment_type) && <div className="invalid-feedback d-block">{validationErrors.plan_id || backendErrors?.plan_id || backendErrors?.enrollment_type}</div>}
                                            </div>
                                        ) : (
                                            /* Hidden plan selector logic for non-host - happens in useEffect */
                                            null
                                        )}

                                        {isHost && planId && (
                                            <div className="row g-3 mb-3 animate__animated animate__fadeIn">
                                                <div className="col-lg-12">
                                                    <label className="form-label fw-semibold">Enrollment Payment ($) <span className="text-danger">*</span></label>
                                                    <input
                                                        type="number"
                                                        className={`form-control ${(validationErrors.customEnrollmentAmount || backendErrors?.enrollment_amount || backendErrors?.amount) ? 'is-invalid' : ''}`}
                                                        value={customEnrollmentAmount}
                                                        onChange={(e) => {
                                                            setCustomEnrollmentAmount(e.target.value);
                                                            setValidationErrors(prev => ({ ...prev, customEnrollmentAmount: '' }));
                                                        }}
                                                        placeholder="Enter amount"
                                                    />
                                                    {(validationErrors.customEnrollmentAmount || backendErrors?.enrollment_amount || backendErrors?.amount) && (
                                                        <div className="invalid-feedback">{validationErrors.customEnrollmentAmount || backendErrors?.enrollment_amount || backendErrors?.amount}</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {selectedBorrowerPlan && (
                                            <div className="bg-success bg-opacity-10 p-4 rounded-2 d-flex align-items-center animate__animated animate__fadeInUp">
                                                <div className="flex-shrink-0 me-3">
                                                    <div className="bg-white p-3 rounded-3 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                                                        <i className="ri-money-dollar-box-fill text-success" style={{ fontSize: '3rem' }}></i>
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1 ps-2">
                                                    <h5 className="text-success fw-bold mb-1 fs-18">Enrollment Fee Applied</h5>
                                                    <p className="mb-0 text-muted fs-15 lh-base">
                                                        A {selectedBorrowerPlan.enrollment_type.toLowerCase()} fee <span className="text-success fw-bold fs-18">${Number(isHost && customEnrollmentAmount !== '' ? customEnrollmentAmount : selectedBorrowerPlan.payment_amount).toFixed(2)}</span>
                                                        {selectedBorrowerPlan.total_installments_count && (
                                                            <span> for {selectedBorrowerPlan.total_installments_count} installments</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Partner Conversion Fields */}
                                {targetType == ENTITY_TYPE_PARTNER && (
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
                                                        setCustomEnrollmentAmount(''); // Reset amount for host override
                                                        setCustomPlatformFee(''); // Reset fee for host override
                                                        setValidationErrors(prev => ({ ...prev, partnerType: '' }));
                                                        if (onFieldChange) onFieldChange(['partner_type']);
                                                    }}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select Partner Type"
                                                    className={`w-100 ${backendErrors?.partner_type ? 'p-invalid' : ''}`}
                                                    appendTo="self"
                                                />
                                                {backendErrors?.partner_type && <div className="invalid-feedback d-block">{backendErrors.partner_type}</div>}
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
                                                onChange={(e) => {
                                                    setPartnerEnrollmentType(e.value);
                                                    if (onFieldChange) onFieldChange(['enrollment_type', 'plan_id']);

                                                    // Sync custom amounts for host
                                                    if (isHost) {
                                                        const selectedPlan = partnerPlans.find(plan =>
                                                            (plan.partner_type === partnerType || (!partnerType && !plan.partner_type)) &&
                                                            plan.enrollment_type === e.value
                                                        );
                                                        if (selectedPlan) {
                                                            setCustomEnrollmentAmount(selectedPlan.payment_amount || '');
                                                            setCustomPlatformFee(selectedPlan.platform_fee || 0);
                                                            if (onFieldChange) onFieldChange(['enrollment_amount', 'amount', 'monthly_platform_fee', 'platform_fee']);
                                                        }
                                                    }
                                                }}
                                                optionLabel="label"
                                                optionValue="value"
                                                placeholder="Select Enrollment Type"
                                                className={`w-100 ${(validationErrors.partnerEnrollmentType || backendErrors?.enrollment_type || backendErrors?.plan_id) ? 'p-invalid' : ''}`}
                                                appendTo="self"
                                                // Disabled only if we have partner types but haven't selected one yet
                                                disabled={Array.from(new Set((partnerPlans || []).map(p => p.partner_type))).filter(Boolean).length > 0 && !partnerType}
                                            />
                                            {(validationErrors.partnerEnrollmentType || backendErrors?.enrollment_type || backendErrors?.plan_id) && (
                                                <div className="invalid-feedback d-block">
                                                    {validationErrors.partnerEnrollmentType || backendErrors?.enrollment_type || backendErrors?.plan_id}
                                                </div>
                                            )}
                                        </div>

                                        {isHost && partnerEnrollmentType && (
                                            <div className="row g-3 mb-3 animate__animated animate__fadeInUp">
                                                <div className="col-lg-6">
                                                    <label className="form-label fw-semibold">Enrollment Payment ($) <span className="text-danger">*</span></label>
                                                    <input
                                                        type="number"
                                                        className={`form-control ${(validationErrors.customEnrollmentAmount || backendErrors?.enrollment_amount || backendErrors?.amount) ? 'is-invalid' : ''}`}
                                                        value={customEnrollmentAmount}
                                                        onChange={(e) => {
                                                            setCustomEnrollmentAmount(e.target.value);
                                                            setValidationErrors(prev => ({ ...prev, customEnrollmentAmount: '' }));
                                                        }}
                                                        placeholder="Enter amount"
                                                    />
                                                    {(validationErrors.customEnrollmentAmount || backendErrors?.enrollment_amount || backendErrors?.amount) && (
                                                        <div className="invalid-feedback">{validationErrors.customEnrollmentAmount || backendErrors?.enrollment_amount || backendErrors?.amount}</div>
                                                    )}
                                                </div>
                                                <div className="col-lg-6">
                                                    <label className="form-label fw-semibold">Platform Fee Payment ($) <span className="text-danger">*</span></label>
                                                    <input
                                                        type="number"
                                                        className={`form-control ${(validationErrors.customPlatformFee || backendErrors?.monthly_platform_fee || backendErrors?.platform_fee) ? 'is-invalid' : ''}`}
                                                        value={customPlatformFee}
                                                        onChange={(e) => {
                                                            setCustomPlatformFee(e.target.value);
                                                            setValidationErrors(prev => ({ ...prev, customPlatformFee: '' }));
                                                            if (onFieldChange) onFieldChange(['monthly_platform_fee', 'platform_fee']);
                                                        }}
                                                        placeholder="Enter amount"
                                                    />
                                                    {(validationErrors.customPlatformFee || backendErrors?.monthly_platform_fee || backendErrors?.platform_fee) && (
                                                        <div className="invalid-feedback d-block">{validationErrors.customPlatformFee || backendErrors?.monthly_platform_fee || backendErrors?.platform_fee}</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {selectedPartnerPlan && (
                                            <div className="bg-success bg-opacity-10 p-4 rounded-2 d-flex align-items-center animate__animated animate__fadeInUp">
                                                <div className="flex-shrink-0 me-3">
                                                    <div className="bg-white p-3 rounded-3 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                                                        <i className="ri-money-dollar-box-fill text-success" style={{ fontSize: '3rem' }}></i>
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1 ps-2">
                                                    <h5 className="text-success fw-bold mb-1 fs-18">Enrollment Fee Applied</h5>
                                                    <p className="mb-0 text-muted fs-15 lh-base">
                                                        A {selectedPartnerPlan.enrollment_type.toLowerCase()} fee <span className="text-success fw-bold fs-18">${Number(isHost && customEnrollmentAmount !== '' ? customEnrollmentAmount : selectedPartnerPlan.payment_amount).toFixed(2)}</span>
                                                        {selectedPartnerPlan.total_installments_count && (
                                                            <span>/month</span>
                                                        )}
                                                        {isHost && (
                                                            <div className="small mt-1 text-success">
                                                                <i className="ri-information-line me-1"></i>
                                                                Platform fee of <strong>${Number(customPlatformFee).toLocaleString()}/mo</strong> starts on the 12th month
                                                            </div>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
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
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                Converting...
                                            </>
                                        ) : confirmBtnText}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

