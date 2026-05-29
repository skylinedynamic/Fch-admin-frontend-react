import React, { useEffect, useRef, useState, useMemo } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { Dropdown } from 'primereact/dropdown';
import { fetchPartnerPlans } from '../../../modules/partner/services';
import { fetchBorrowerPlans, fetchNonHostBorrowerPlans } from '../../../modules/client/services';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_BORROWER } from '../../../config/appConfig';
import LeadConvertSkeleton from '../../../components/Loader/LeadConvertSkeleton';
import { apiClient } from '../../../lib/http/apiClient';

export default function LeadConvertModal({ show, onHide, onConfirm, lead, targetType = ENTITY_TYPE_BORROWER, loading, isHost, backendErrors = {}, onFieldChange }) {
    const [planId, setPlanId] = useState(null);
    const [enrollmentType, setEnrollmentType] = useState('');
    const [partnerType, setPartnerType] = useState('');
    const [partnerEnrollmentType, setPartnerEnrollmentType] = useState('');
    const [partnerPlans, setPartnerPlans] = useState([]);
    const [borrowerPlans, setBorrowerPlans] = useState([]);
    const [fetching, setFetching] = useState(false);

    const [customEnrollmentAmount, setCustomEnrollmentAmount] = useState('');
    const [customPlatformFee, setCustomPlatformFee] = useState('');
    const [fixedEnrollmentAmount, setFixedEnrollmentAmount] = useState(0);

    const [validationErrors, setValidationErrors] = useState({});

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
    }, [modalRef]);

    useEffect(() => {
        if (backendErrors && Object.keys(backendErrors).length > 0) {
            setValidationErrors(backendErrors);
        }
    }, [backendErrors]);

    useEffect(() => {
        const fetchFixedPlan = async () => {
            try {
                const response = await apiClient.get('/common/partner-plans/fixed-enrollment');
                if (response.data?.status && response.data?.data?.payment_amount) {
                    setFixedEnrollmentAmount(Number(response.data.data.payment_amount));
                }
            } catch (error) {
                console.error('Failed to fetch fixed enrollment plan:', error);
            }
        };
        fetchFixedPlan();
    }, []);

    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            setFetching(true);
            modal.show();
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
                        if (plans.length > 0) {
                            setPlanId(plans[0].id);
                            setEnrollmentType(plans[0].enrollment_type);
                            setCustomEnrollmentAmount(plans[0].payment_amount || '');
                            setCustomPlatformFee(plans[0].platform_fee || 0);
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
            const modalElement = modalRef.current;
            if (modalElement && modalElement.classList.contains('show')) {
                modal.hide();
            }
            setPlanId(null);
            setEnrollmentType('');
            setPartnerType('');
            setPartnerEnrollmentType('');
            setCustomEnrollmentAmount('');
            setCustomPlatformFee('');
            setValidationErrors({});
        }
    }, [show, isHost, targetType]);

    const enrollmentOptions = useMemo(() => {
        return borrowerPlans.map(plan => ({
            label: plan.enrollment_type,
            value: plan.id,
            price: Number(plan.payment_amount),
            enrollment_type: plan.enrollment_type
        }));
    }, [borrowerPlans]);

    const handleConfirm = () => {
        setValidationErrors({});

        const payload = {};

        if (targetType == ENTITY_TYPE_BORROWER) {
            payload.plan_id = planId;
            payload.enrollment_type = enrollmentType;

            const selectedPlan = borrowerPlans.find(plan => plan.id === planId);
            if (selectedPlan) {
                // Both host and non-host use customEnrollmentAmount (synced from DB, editable by host)
                payload.enrollment_amount = customEnrollmentAmount;
                payload.amount = customEnrollmentAmount;
                if (isHost) {
                    payload.monthly_platform_fee = customPlatformFee;
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
                payload.enrollment_amount = customEnrollmentAmount;
                payload.amount = customEnrollmentAmount;
                if (isHost) {
                    payload.monthly_platform_fee = customPlatformFee;
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

    // The displayed enrollment amount — live for both host (editable) and non-host (DB value)
    const displayBorrowerAmount = Number(customEnrollmentAmount || 0);

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

                                {/* ── Borrower Conversion ── */}
                                {targetType == ENTITY_TYPE_BORROWER && (
                                    <div className="mb-4 text-start">

                                        {/* Enrollment dropdown — visible for BOTH host and non-host */}
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">Select Enrollment Type <span className="text-danger">*</span></label>
                                            <Dropdown
                                                value={planId}
                                                options={enrollmentOptions}
                                                onChange={(e) => {
                                                    setPlanId(e.value);
                                                    const opt = enrollmentOptions.find(o => o.value === e.value);
                                                    setEnrollmentType(opt ? opt.enrollment_type : '');
                                                    if (onFieldChange) onFieldChange(['plan_id', 'enrollment_type']);
                                                    const originalPlan = borrowerPlans.find(plan => plan.id === e.value);
                                                    if (originalPlan) {
                                                        setCustomEnrollmentAmount(originalPlan.payment_amount || '');
                                                        setCustomPlatformFee(originalPlan.platform_fee || 0);
                                                        if (onFieldChange) onFieldChange(['enrollment_amount', 'amount', 'monthly_platform_fee', 'platform_fee']);
                                                    }
                                                }}
                                                optionLabel="label"
                                                optionValue="value"
                                                placeholder="Select Enrollment Type"
                                                className={`w-100 ${(validationErrors.plan_id || backendErrors?.plan_id || backendErrors?.enrollment_type) ? 'p-invalid' : ''}`}
                                                appendTo="self"
                                            />
                                            {(validationErrors.plan_id || backendErrors?.plan_id || backendErrors?.enrollment_type) && (
                                                <div className="invalid-feedback d-block">
                                                    {validationErrors.plan_id || backendErrors?.plan_id || backendErrors?.enrollment_type}
                                                </div>
                                            )}
                                        </div>

                                        {/* Enrollment Payment — editable for host, editable (DB pre-filled) for non-host */}
                                        {planId && (
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
                                                        <div className="invalid-feedback">
                                                            {validationErrors.customEnrollmentAmount || backendErrors?.enrollment_amount || backendErrors?.amount}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Fee Summary Card */}
                                        {selectedBorrowerPlan && (
                                            <div className="border rounded-3 px-4 py-3 animate__animated animate__fadeInUp">

                                                {/* Borrower Invoice row */}
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <span style={{ fontWeight: 600 }} className="text-dark">
                                                        <i className="ri-user-line me-1 text-primary"></i> Borrower Invoice:
                                                    </span>
                                                    <span className="text-success fw-bold" style={{ fontSize: '1.05rem' }}>
                                                        ${displayBorrowerAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="text-muted ps-3" style={{ fontSize: '0.75rem' }}>
                                                        Charged to the borrower upon enrollment.
                                                    </span>
                                                </div>

                                                {/* Duration row — shown for multi-installment plans */}
                                                {selectedBorrowerPlan.total_installments_count > 1 && (
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <span style={{ fontWeight: 600 }} className="text-dark">
                                                            <i className="ri-calendar-line me-1 text-primary"></i> Duration:
                                                        </span>
                                                        <span className="text-muted" style={{ fontSize: '0.95rem' }}>
                                                            {selectedBorrowerPlan.total_installments_count} months
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Total Amount row — shown for multi-installment plans */}
                                                {selectedBorrowerPlan.total_installments_count > 1 && (
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <span style={{ fontWeight: 600 }} className="text-dark">
                                                            <i className="ri-calculator-line me-1 text-primary"></i> Total Amount:
                                                        </span>
                                                        <span className="text-success fw-bold" style={{ fontSize: '1.05rem' }}>
                                                            ${(displayBorrowerAmount * selectedBorrowerPlan.total_installments_count).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Partner Invoice row — shown when fixedEnrollmentAmount exists */}
                                                {!isHost && fixedEnrollmentAmount > 0 && (
                                                    <>
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <span style={{ fontWeight: 600 }} className="text-warning">
                                                                <i className="ri-shield-user-line text-warning me-1"></i> Partner Invoice:
                                                            </span>
                                                            <span className="text-warning fw-bold" style={{ fontSize: '1.05rem' }}>
                                                                ${fixedEnrollmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <span className="text-muted ps-3" style={{ fontSize: '0.75rem' }}>
                                                                Charged automatically on Partner's card.
                                                            </span>
                                                        </div>

                                                        {/* Info note */}
                                                        <div className="mt-3 p-2 rounded text-center" style={{ backgroundColor: 'rgba(23, 162, 184, 0.1)', border: '1px dashed rgba(23, 162, 184, 0.3)' }}>
                                                            <p className="mb-0 text-info" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                                                <i className="ri-information-line me-1" style={{ verticalAlign: 'middle' }}></i>
                                                                Two completely separate invoices are created. The Borrower pays <strong>${displayBorrowerAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>, and upon successful payment, <strong>${fixedEnrollmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> is automatically charged to the Partner account immediately.
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Partner Conversion ── */}
                                {targetType == ENTITY_TYPE_PARTNER && (
                                    <div className="mb-4 text-start">

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
                                                        setPartnerEnrollmentType('');
                                                        setCustomEnrollmentAmount('');
                                                        setCustomPlatformFee('');
                                                        setValidationErrors(prev => ({ ...prev, partnerType: '' }));
                                                        if (onFieldChange) onFieldChange(['partner_type']);
                                                    }}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select Partner Type"
                                                    className={`w-100 ${backendErrors?.partner_type ? 'p-invalid' : ''}`}
                                                    appendTo="self"
                                                />
                                                {backendErrors?.partner_type && (
                                                    <div className="invalid-feedback d-block">{backendErrors.partner_type}</div>
                                                )}
                                            </div>
                                        )}

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">Select Enrollment Type <span className="text-danger">*</span></label>
                                            <Dropdown
                                                value={partnerEnrollmentType}
                                                options={(partnerPlans || [])
                                                    .filter(plan => !partnerType || plan.partner_type === partnerType || (Array.from(new Set((partnerPlans || []).map(p => p.partner_type))).filter(Boolean).length === 0))
                                                    .map(plan => ({
                                                        label: plan.enrollment_type,
                                                        value: plan.enrollment_type
                                                    }))
                                                }
                                                onChange={(e) => {
                                                    setPartnerEnrollmentType(e.value);
                                                    if (onFieldChange) onFieldChange(['enrollment_type', 'plan_id']);
                                                    const selectedPlan = partnerPlans.find(plan =>
                                                        (plan.partner_type === partnerType || (!partnerType && !plan.partner_type)) &&
                                                        plan.enrollment_type === e.value
                                                    );
                                                    if (selectedPlan) {
                                                        setCustomEnrollmentAmount(selectedPlan.payment_amount || '');
                                                        setCustomPlatformFee(selectedPlan.platform_fee || 0);
                                                        if (onFieldChange) onFieldChange(['enrollment_amount', 'amount', 'monthly_platform_fee', 'platform_fee']);
                                                    }
                                                }}
                                                optionLabel="label"
                                                optionValue="value"
                                                placeholder="Select Enrollment Type"
                                                className={`w-100 ${(validationErrors.partnerEnrollmentType || backendErrors?.enrollment_type || backendErrors?.plan_id) ? 'p-invalid' : ''}`}
                                                appendTo="self"
                                                disabled={Array.from(new Set((partnerPlans || []).map(p => p.partner_type))).filter(Boolean).length > 0 && !partnerType}
                                            />
                                            {(validationErrors.partnerEnrollmentType || backendErrors?.enrollment_type || backendErrors?.plan_id) && (
                                                <div className="invalid-feedback d-block">
                                                    {validationErrors.partnerEnrollmentType || backendErrors?.enrollment_type || backendErrors?.plan_id}
                                                </div>
                                            )}
                                        </div>

                                        {/* Editable amount inputs — only for isHost */}
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
                                                        <div className="invalid-feedback">
                                                            {validationErrors.customEnrollmentAmount || backendErrors?.enrollment_amount || backendErrors?.amount}
                                                        </div>
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
                                                        <div className="invalid-feedback d-block">
                                                            {validationErrors.customPlatformFee || backendErrors?.monthly_platform_fee || backendErrors?.platform_fee}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Partner Fee Summary Card */}
                                        {!isHost && selectedPartnerPlan && (
                                            <div className="border rounded-3 px-4 py-3 animate__animated animate__fadeInUp">

                                                {/* Partner Invoice row */}
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <span style={{ fontWeight: 600 }} className="text-dark">
                                                        <i className="ri-shield-user-line me-1 text-success"></i> Partner Invoice:
                                                    </span>
                                                    <span className="text-success fw-bold" style={{ fontSize: '1.05rem' }}>
                                                        ${Number(customEnrollmentAmount !== '' ? customEnrollmentAmount : selectedPartnerPlan.payment_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="text-muted ps-3" style={{ fontSize: '0.75rem' }}>
                                                        Charged to the partner upon enrollment.
                                                    </span>
                                                </div>

                                                {/* Duration row — shown for multi-installment plans */}
                                                {selectedPartnerPlan.total_installments_count > 1 && (
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <span style={{ fontWeight: 600 }} className="text-dark">
                                                            <i className="ri-calendar-line me-1 text-success"></i> Duration:
                                                        </span>
                                                        <span className="text-muted" style={{ fontSize: '0.95rem' }}>
                                                            {selectedPartnerPlan.total_installments_count} months
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Total Amount row — shown for multi-installment plans */}
                                                {selectedPartnerPlan.total_installments_count > 1 && (
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <span style={{ fontWeight: 600 }} className="text-dark">
                                                            <i className="ri-calculator-line me-1 text-success"></i> Total Amount:
                                                        </span>
                                                        <span className="text-success fw-bold" style={{ fontSize: '1.05rem' }}>
                                                            ${(Number(customEnrollmentAmount !== '' ? customEnrollmentAmount : selectedPartnerPlan.payment_amount) * selectedPartnerPlan.total_installments_count).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Platform Fee row */}
                                                {isHost && customPlatformFee > 0 && (
                                                    <>
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <span style={{ fontWeight: 600 }} className="text-warning">
                                                                <i className="ri-money-dollar-circle-line text-warning me-1"></i> Platform Fee:
                                                            </span>
                                                            <span className="text-warning fw-bold" style={{ fontSize: '1.05rem' }}>
                                                                ${Number(customPlatformFee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                                                            </span>
                                                        </div>
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <span className="text-muted ps-3" style={{ fontSize: '0.75rem' }}>
                                                                Starts on the 12th month.
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
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
