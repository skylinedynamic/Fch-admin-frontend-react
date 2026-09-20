import React, { useEffect, useRef, useState, useMemo } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { Dropdown } from 'primereact/dropdown';
import { fetchPartnerPlans, getPartnerBorrowerFee } from '../../../modules/partner/services';
import { fetchBorrowerPlans } from '../../../modules/client/services';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_BORROWER } from '../../../config/appConfig';
import LeadConvertSkeleton from '../../../components/Loader/LeadConvertSkeleton';
import { useAuthStore } from '../../../store/auth/authStore';
import InstallmentDetailsModal from '../../../components/Common/Payment/InstallmentDetailsModal';
import { ENROLLMENT_TYPE_INSTALLMENT } from '../../../config/subscriptionConfig';

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

    const currentUser = useAuthStore((state) => state.user);
    const userSubscription = useAuthStore((state) => state.userSubscription);
    const isPartnerOnFreeTrial = currentUser?.entity_type === ENTITY_TYPE_PARTNER && !!userSubscription?.is_free_trail;

    const [isFreeTrail, setIsFreeTrail] = useState(false);

    // Installment configuration state
    const [showInstallmentModal, setShowInstallmentModal] = useState(false);
    const [installmentApplied, setInstallmentApplied] = useState(false);
    const [installmentDownPayment, setInstallmentDownPayment] = useState(0);
    const [installmentMonths, setInstallmentMonths] = useState(12);
    const [installmentMonthlyAmount, setInstallmentMonthlyAmount] = useState(0);
    const [enrollmentAmount, setEnrollmentAmount] = useState(0);

    // Transitions & Modal synchronizations
    const pendingOpenInstallmentRef = useRef(false);
    const ignoreShowRef = useRef(false);

    useEffect(() => {
        if (show) {
            if (isPartnerOnFreeTrial && targetType === ENTITY_TYPE_BORROWER) {
                setIsFreeTrail(true);
            } else {
                setIsFreeTrail(false);
            }
        }
    }, [show, isPartnerOnFreeTrial, targetType]);

    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    // Hide main modal and set pending flag to open calculator once main modal has fully hidden
    const openInstallmentCalculator = () => {
        const modal = modalInstanceRef.current;
        if (modal) {
            pendingOpenInstallmentRef.current = true;
            modal.hide();
        }
    };

    // When calculator finishes hiding, re-show the main convert modal
    const handleInstallmentHidden = () => {
        if (show) {
            ignoreShowRef.current = true;
            const modal = modalInstanceRef.current;
            if (modal) {
                modal.show();
            }
        }
    };

    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });

            // Listen to hidden event to show calculator cleanly
            modalRef.current.addEventListener('hidden.bs.modal', () => {
                if (pendingOpenInstallmentRef.current) {
                    pendingOpenInstallmentRef.current = false;
                    setShowInstallmentModal(true);
                }
            });

            // Listen to shown event to reset ignoring show flag
            modalRef.current.addEventListener('shown.bs.modal', () => {
                ignoreShowRef.current = false;
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
        if (isHost || currentUser?.is_host) {
            setFixedEnrollmentAmount(0);
            return;
        }

        const fetchPartnerBorrowerFee = async () => {
            try {
                const response = await getPartnerBorrowerFee();
                if (response?.status && response?.data?.borrower_fee_amount !== undefined) {
                    setFixedEnrollmentAmount(Number(response.data.borrower_fee_amount));
                }
            } catch (error) {
                console.error('Failed to fetch partner borrower fee:', error);
            }
        };
        fetchPartnerBorrowerFee();
    }, [isHost, currentUser?.is_host]);

    useEffect(() => {
        const loadPlans = async () => {
            setFetching(true);
            try {
                const [partnerPlansRes, borrowerPlansRes] = await Promise.all([
                    fetchPartnerPlans(),
                    fetchBorrowerPlans(),
                ]);

                if (partnerPlansRes?.status) setPartnerPlans(partnerPlansRes.data || []);
                if (borrowerPlansRes?.status) setBorrowerPlans(borrowerPlansRes.data || []);
            } catch (err) {
                console.error('Failed to fetch plan data:', err);
            } finally {
                setFetching(false);
            }
        };

        loadPlans();
    }, []);

    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            if (ignoreShowRef.current) {
                return;
            }
            modal.show();

            if (borrowerPlans.length > 0 && targetType === ENTITY_TYPE_BORROWER) {
                setPlanId(borrowerPlans[0].id);
                setEnrollmentType(borrowerPlans[0].enrollment_type);
                setCustomEnrollmentAmount(borrowerPlans[0].total_amount || '');
                setCustomPlatformFee(borrowerPlans[0].platform_fee || 0);

                // Setup defaults if it's installment plan type
                const isInst = borrowerPlans[0].enrollment_type?.toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase() || (borrowerPlans[0].total_installments_count > 1);
                if (isInst) {
                    const totalVal = Number(borrowerPlans[0].total_amount || 0);
                    setEnrollmentAmount(totalVal);
                    setInstallmentDownPayment(0);
                    setInstallmentMonths(12);
                    setInstallmentMonthlyAmount(totalVal > 0 ? Number((totalVal / 12).toFixed(2)) : 0);
                    setInstallmentApplied(true);
                    openInstallmentCalculator();
                } else {
                    setInstallmentApplied(false);
                }
            }
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
            setInstallmentApplied(false);
            setInstallmentDownPayment(0);
            setInstallmentMonths(12);
            setInstallmentMonthlyAmount(0);
            setEnrollmentAmount(0);
        }
    }, [show, borrowerPlans, targetType, isHost]);

    const enrollmentOptions = useMemo(() => {
        return borrowerPlans.map(plan => ({
            label: plan.enrollment_type,
            value: plan.id,
            price: Number(plan.total_amount),
            enrollment_type: plan.enrollment_type
        }));
    }, [borrowerPlans]);

    const selectedBorrowerPlan = borrowerPlans.find(p => p.id === planId);

    const selectedPartnerPlan = useMemo(() => {
        if (targetType != ENTITY_TYPE_PARTNER) return null;
        return partnerPlans.find(plan =>
            (plan.partner_type === partnerType || (!partnerType && !plan.partner_type)) &&
            plan.enrollment_type === partnerEnrollmentType
        );
    }, [partnerPlans, partnerType, partnerEnrollmentType, targetType]);

    const isBorrowerInstallmentPlan = enrollmentType?.toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase() || (selectedBorrowerPlan?.total_installments_count > 1);
    const isPartnerInstallmentPlan = partnerEnrollmentType?.toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase() || (selectedPartnerPlan?.total_installments_count > 1);

    const handleConfirm = () => {
        setValidationErrors({});

        const payload = {
            is_free_trail: isFreeTrail,
        };

        if (targetType == ENTITY_TYPE_BORROWER) {
            if (!isFreeTrail) {
                payload.plan_id = planId;
                payload.enrollment_type = enrollmentType;

                const selectedPlan = borrowerPlans.find(plan => plan.id === planId);
                if (selectedPlan) {
                    payload.enrollment_amount = customEnrollmentAmount;
                    if (isHost) {
                        payload.monthly_platform_fee = customPlatformFee;
                    }
                    if (isBorrowerInstallmentPlan && installmentApplied) {
                        payload.installment_down_payment = installmentDownPayment;
                        payload.installment_months = installmentMonths;
                        payload.installment_monthly_amount = installmentMonthlyAmount;
                        payload.installment_remaining_balance = Math.max(0, Number(enrollmentAmount || 0) - Number(installmentDownPayment || 0));
                    }
                }
            }
        } else if (targetType == ENTITY_TYPE_PARTNER) {
            payload.partner_type = partnerType;
            if (!isFreeTrail) {
                payload.enrollment_type = partnerEnrollmentType;

                const selectedPlan = partnerPlans.find(plan =>
                    (plan.partner_type === partnerType || (!partnerType && !plan.partner_type)) &&
                    plan.enrollment_type === partnerEnrollmentType
                );

                if (selectedPlan) {
                    payload.plan_id = selectedPlan.id;
                    payload.enrollment_amount = customEnrollmentAmount;
                    if (isHost) {
                        payload.monthly_platform_fee = customPlatformFee;
                    }
                    if (isPartnerInstallmentPlan && installmentApplied) {
                        payload.installment_down_payment = installmentDownPayment;
                        payload.installment_months = installmentMonths;
                        payload.installment_monthly_amount = installmentMonthlyAmount;
                        payload.installment_remaining_balance = Math.max(0, Number(enrollmentAmount || 0) - Number(installmentDownPayment || 0));
                    }
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

    // The displayed enrollment amount — live for both host (editable) and non-host (DB value)
    const displayBorrowerAmount = Number(customEnrollmentAmount || 0);

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-4 text-center">
                        {fetching ? (
                            <LeadConvertSkeleton targetType={targetType} isHost={isHost} />
                        ) : (
                            <>
                                <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-4 text-start">
                                    <h5 className="modal-title fw-bold text-dark fs-16 d-flex align-items-center gap-2">
                                        <i className={`${icon} fs-20`}></i>
                                        {title}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
                                </div>

                                {/* ── Borrower Conversion ── */}
                                {targetType == ENTITY_TYPE_BORROWER && (
                                    <div className="mb-4 text-start">
                                        {/* Borrower Free Trial Switch */}
                                        {!isHost && isPartnerOnFreeTrial ? (
                                            <div className="trial-switch-container animate__animated animate__fadeIn">
                                                <div className="d-flex align-items-center">
                                                    <div className="avatar-xs d-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle me-3 trial-avatar">
                                                        <i className="ri-vip-crown-line fs-18"></i>
                                                    </div>
                                                    <div>
                                                        <h6 className="mb-0 fw-semibold text-dark">Activate Lifetime Limited Free Plan</h6>
                                                        <small className="text-muted trial-subtext">Your account is on a Free Plan. This client will automatically be converted to a Limited Free Plan account.</small>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="trial-switch-container animate__animated animate__fadeIn">
                                                <div className="d-flex align-items-center">
                                                    <div className="avatar-xs d-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle me-3 trial-avatar">
                                                        <i className="ri-vip-crown-line fs-18"></i>
                                                    </div>
                                                    <div>
                                                        <h6 className="mb-0 fw-semibold text-dark">Activate Lifetime Limited Free Plan</h6>
                                                        <small className="text-muted trial-subtext">Converts lead as a free plan client with limited features.</small>
                                                    </div>
                                                </div>
                                                <div className="form-check form-switch form-switch-md me-1">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input trial-switch-input"
                                                        id="is_free_trail_borrower"
                                                        name="is_free_trail"
                                                        checked={isFreeTrail}
                                                        disabled={isPartnerOnFreeTrial}
                                                        onChange={(e) => {
                                                            setIsFreeTrail(e.target.checked);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {!isFreeTrail && (
                                            <>
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold">Select Enrollment Type <span className="text-danger">*</span></label>
                                                    <Dropdown
                                                        value={planId}
                                                        options={enrollmentOptions}
                                                        onChange={(e) => {
                                                            setPlanId(e.value);
                                                            const opt = enrollmentOptions.find(o => o.value === e.value);
                                                            if (opt) {
                                                                setEnrollmentType(opt.enrollment_type);
                                                                setCustomEnrollmentAmount(opt.price || '');
                                                                const matchingPlan = borrowerPlans.find(p => p.id === e.value);
                                                                setCustomPlatformFee(matchingPlan?.platform_fee || 0);

                                                                // Set default installment details if clicked/switched to installment option
                                                                const isInst = opt.enrollment_type?.toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase() || (matchingPlan?.total_installments_count > 1);
                                                                if (isInst) {
                                                                    const totalVal = Number(matchingPlan?.total_amount || 0);
                                                                    setEnrollmentAmount(totalVal);
                                                                    setInstallmentDownPayment(0);
                                                                    setInstallmentMonths(12);
                                                                    setInstallmentMonthlyAmount(totalVal > 0 ? Number((totalVal / 12).toFixed(2)) : 0);
                                                                    setInstallmentApplied(true);
                                                                    openInstallmentCalculator();
                                                                } else {
                                                                    setInstallmentApplied(false);
                                                                }
                                                            }
                                                            if (onFieldChange) onFieldChange(['plan_id', 'enrollment_type', 'amount', 'enrollment_amount']);
                                                        }}
                                                        optionLabel="label"
                                                        optionValue="value"
                                                        placeholder="Select Enrollment Type"
                                                        className="w-100"
                                                        appendTo="self"
                                                    />
                                                </div>

                                                {/* Enrollment Payment — editable for host, editable (DB pre-filled) for non-host */}
                                                {planId && !isBorrowerInstallmentPlan && !installmentApplied && (
                                                    <div className="row g-3 mb-3 animate__animated animate__fadeIn">
                                                        <div className="col-lg-12">
                                                            <label className="form-label fw-semibold">Enrollment Payment <span className="text-danger">*</span></label>
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
                                                    <div className="bg-success-subtle border border-success-subtle rounded-3 px-4 py-3 animate__animated animate__fadeInUp">
                                                        {isBorrowerInstallmentPlan ? (
                                                            <>
                                                                {installmentApplied ? (
                                                                    <>
                                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                                            <span style={{ fontWeight: 600 }} className="text-dark">
                                                                                <i className="ri-hand-coin-line text-primary me-1"></i> Total Enrollment Amount:
                                                                            </span>
                                                                            <span className="info-value fw-semibold text-dark">
                                                                                ${Number(enrollmentAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                                            <span style={{ fontWeight: 600 }} className="text-dark">
                                                                                <i className="ri-wallet-3-line text-primary me-1"></i> Down Payment (Upfront):
                                                                            </span>
                                                                            <span className="info-value text-success fw-semibold">
                                                                                ${Number(installmentDownPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                                            <span style={{ fontWeight: 600 }} className="text-dark">
                                                                                <i className="ri-calendar-line text-primary me-1"></i> Installment Duration:
                                                                            </span>
                                                                            <span className="info-value fw-semibold text-dark">
                                                                                {installmentMonths || 12} Months
                                                                            </span>
                                                                        </div>
                                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                                            <span style={{ fontWeight: 600 }} className="text-dark">
                                                                                <i className="ri-money-dollar-circle-line text-primary me-1"></i> Monthly Installment Amount:
                                                                            </span>
                                                                            <span className="amount-value text-success fw-semibold">
                                                                                ${Number(installmentMonthlyAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="d-flex gap-2 mt-3 mb-2 justify-content-start">
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-outline-primary"
                                                                                onClick={openInstallmentCalculator}
                                                                            >
                                                                                <i className="ri-edit-line me-1"></i> Adjust Plan
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-outline-secondary"
                                                                                onClick={() => {
                                                                                    const initialVal = Number(selectedBorrowerPlan?.total_amount || 0);
                                                                                    setEnrollmentAmount(initialVal);
                                                                                    setInstallmentDownPayment(0);
                                                                                    setInstallmentMonths(12);
                                                                                    setInstallmentMonthlyAmount(initialVal > 0 ? Number((initialVal / 12).toFixed(2)) : 0);
                                                                                    setInstallmentApplied(true);
                                                                                }}
                                                                            >
                                                                                <i className="ri-restart-line me-1"></i> Reset
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                                            <span style={{ fontWeight: 600 }} className="text-dark">
                                                                                <i className="ri-hand-coin-line text-primary me-1"></i> Total Enrollment Cost:
                                                                            </span>
                                                                            <span className="amount-value text-success fw-semibold">
                                                                                ${Number(selectedBorrowerPlan?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="custom-notice mb-2">
                                                                            <i className="ri-information-line"></i>
                                                                            <p className="custom-notice-text">
                                                                                Flexible installment plan. Choose a down payment and duration to calculate the monthly amount.
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm installment-trigger-btn mt-2"
                                                                            onClick={openInstallmentCalculator}
                                                                        >
                                                                            <i className="ri-calculator-line me-1"></i> View Installment Details
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
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
                                                            </>
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
                                                                        Two separate invoices are created. The Borrower pays <strong>${Number(isBorrowerInstallmentPlan ? (installmentApplied ? installmentDownPayment : (selectedBorrowerPlan?.total_amount || 0)) : customEnrollmentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>, and <strong>${fixedEnrollmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> is automatically charged to the Partner.
                                                                    </p>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                                {/* ── Partner Conversion ── */}
                                {targetType == ENTITY_TYPE_PARTNER && (
                                    <div className="mb-4 text-start">
                                        {/* Partner Free Trial Switch (only for host) */}
                                        {isHost && (
                                            <div className="trial-switch-container animate__animated animate__fadeIn">
                                                <div className="d-flex align-items-center">
                                                    <div className="avatar-xs d-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle me-3 trial-avatar">
                                                        <i className="ri-vip-crown-line fs-18"></i>
                                                    </div>
                                                    <div>
                                                        <h6 className="mb-0 fw-semibold text-dark">Activate 30 Days Free Trial</h6>
                                                        <small className="text-muted trial-subtext">Convert lead as a partner free trial account.</small>
                                                    </div>
                                                </div>
                                                <div className="form-check form-switch form-switch-md me-1">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input trial-switch-input"
                                                        id="is_free_trail_partner"
                                                        name="is_free_trail"
                                                        checked={isFreeTrail}
                                                        onChange={(e) => {
                                                            setIsFreeTrail(e.target.checked);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}

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

                                        {!isFreeTrail && (
                                            <>
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
                                                                setCustomEnrollmentAmount(selectedPlan.total_amount || '');
                                                                setCustomPlatformFee(selectedPlan.platform_fee || 0);

                                                                // Set default installment details if clicked/switched to installment option
                                                                const isInst = e.value?.toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase() || (selectedPlan?.total_installments_count > 1);
                                                                if (isInst) {
                                                                    const totalVal = Number(selectedPlan.total_amount || 0);
                                                                    setEnrollmentAmount(totalVal);
                                                                    setInstallmentDownPayment(0);
                                                                    setInstallmentMonths(12);
                                                                    setInstallmentMonthlyAmount(totalVal > 0 ? Number((totalVal / 12).toFixed(2)) : 0);
                                                                    setInstallmentApplied(true);
                                                                    openInstallmentCalculator();
                                                                } else {
                                                                    setInstallmentApplied(false);
                                                                }

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
                                                        {!(isPartnerInstallmentPlan || installmentApplied) ? (
                                                            <>
                                                                <div className="col-lg-6">
                                                                    <label className="form-label fw-semibold">Enrollment Payment <span className="text-danger">*</span></label>
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
                                                                    <label className="form-label fw-semibold">Platform Fee Payment <span className="text-danger">*</span></label>
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
                                                            </>
                                                        ) : (
                                                            <div className="col-lg-12 col-12 animate__animated animate__fadeInUp">
                                                                <label className="form-label fw-semibold">Platform Fee Payment <span className="text-danger">*</span></label>
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
                                                        )}
                                                    </div>
                                                )}

                                                {/* Partner Fee Summary Card */}
                                                {selectedPartnerPlan && (
                                                    <div className="bg-success-subtle border border-success-subtle rounded-3 px-4 py-3 animate__animated animate__fadeInUp">
                                                        {isPartnerInstallmentPlan ? (
                                                            <>
                                                                {installmentApplied ? (
                                                                    <>
                                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                                            <span style={{ fontWeight: 600 }} className="text-dark">
                                                                                <i className="ri-hand-coin-line text-success me-1"></i> Total Enrollment Amount:
                                                                            </span>
                                                                            <span className="info-value fw-semibold text-dark">
                                                                                ${Number(enrollmentAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                                            <span style={{ fontWeight: 600 }} className="text-dark">
                                                                                <i className="ri-wallet-3-line text-success me-1"></i> Down Payment (Upfront):
                                                                            </span>
                                                                            <span className="info-value text-success fw-semibold">
                                                                                ${Number(installmentDownPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                                            <span style={{ fontWeight: 600 }} className="text-dark">
                                                                                <i className="ri-calendar-line text-success me-1"></i> Installment Duration:
                                                                            </span>
                                                                            <span className="info-value fw-semibold text-dark">
                                                                                {installmentMonths || 12} Months
                                                                            </span>
                                                                        </div>
                                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                                            <span style={{ fontWeight: 600 }} className="text-dark">
                                                                                <i className="ri-money-dollar-circle-line text-success me-1"></i> Monthly Installment Amount:
                                                                            </span>
                                                                            <span className="amount-value text-success fw-semibold">
                                                                                ${Number(installmentMonthlyAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="d-flex gap-2 mt-3 mb-2 justify-content-start">
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-outline-success"
                                                                                onClick={openInstallmentCalculator}
                                                                            >
                                                                                <i className="ri-edit-line me-1"></i> Adjust Plan
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-outline-secondary"
                                                                                onClick={() => {
                                                                                    const initialVal = Number(selectedPartnerPlan?.total_amount || 0);
                                                                                    setEnrollmentAmount(initialVal);
                                                                                    setInstallmentDownPayment(0);
                                                                                    setInstallmentMonths(12);
                                                                                    setInstallmentMonthlyAmount(initialVal > 0 ? Number((initialVal / 12).toFixed(2)) : 0);
                                                                                    setInstallmentApplied(true);
                                                                                }}
                                                                            >
                                                                                <i className="ri-restart-line me-1"></i> Reset
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                                            <span style={{ fontWeight: 600 }} className="text-dark">
                                                                                <i className="ri-hand-coin-line text-success me-1"></i> Total Enrollment Cost:
                                                                            </span>
                                                                            <span className="amount-value text-success fw-semibold">
                                                                                ${Number(selectedPartnerPlan?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="custom-notice mb-2">
                                                                            <i className="ri-information-line"></i>
                                                                            <p className="custom-notice-text">
                                                                                Flexible installment plan. Choose a down payment and duration to calculate the monthly amount.
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm installment-trigger-btn mt-2"
                                                                            onClick={openInstallmentCalculator}
                                                                        >
                                                                            <i className="ri-calculator-line me-1"></i> View Installment Details
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {/* Partner Invoice row */}
                                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                                    <span style={{ fontWeight: 600 }} className="text-dark">
                                                                        <i className="ri-shield-user-line me-1 text-success"></i> Partner Invoice:
                                                                    </span>
                                                                    <span className="text-success fw-bold" style={{ fontSize: '1.05rem' }}>
                                                                        ${Number(customEnrollmentAmount !== '' ? customEnrollmentAmount : selectedPartnerPlan.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                                                            ${(Number(customEnrollmentAmount !== '' ? customEnrollmentAmount : selectedPartnerPlan.total_amount) * selectedPartnerPlan.total_installments_count).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </>
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
                                            </>
                                        )}
                                    </div>
                                )}

                                <div className="hstack gap-2 justify-content-end">
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
            <InstallmentDetailsModal
                show={showInstallmentModal}
                onHide={() => setShowInstallmentModal(false)}
                onHidden={handleInstallmentHidden}
                defaultMonths={
                    targetType === ENTITY_TYPE_BORROWER
                        ? (selectedBorrowerPlan?.total_installments_count || 12)
                        : (selectedPartnerPlan?.total_installments_count || 12)
                }
                totalAmount={
                    targetType === ENTITY_TYPE_BORROWER
                        ? Number(selectedBorrowerPlan?.total_amount || 0)
                        : Number(selectedPartnerPlan?.total_amount || 0)
                }
                appliedTotalAmount={enrollmentAmount}
                appliedDownPayment={installmentDownPayment}
                appliedMonths={installmentMonths}
                appliedApplied={installmentApplied}
                installmentMinMonths={
                    targetType === ENTITY_TYPE_BORROWER
                        ? selectedBorrowerPlan?.installment_min_months
                        : selectedPartnerPlan?.installment_min_months
                }
                installmentMaxMonths={
                    targetType === ENTITY_TYPE_BORROWER
                        ? selectedBorrowerPlan?.installment_max_months
                        : selectedPartnerPlan?.installment_max_months
                }
                installmentDefaultMonths={
                    targetType === ENTITY_TYPE_BORROWER
                        ? selectedBorrowerPlan?.installment_default_months
                        : selectedPartnerPlan?.installment_default_months
                }
                onApply={(data) => {
                    setInstallmentDownPayment(data.downPayment);
                    setInstallmentMonths(data.months);
                    setInstallmentMonthlyAmount(data.monthlyPayment);
                    setEnrollmentAmount(data.totalAmount);
                    setCustomEnrollmentAmount(data.totalAmount);
                    setInstallmentApplied(true);
                }}
            />
        </div>
    );
}
