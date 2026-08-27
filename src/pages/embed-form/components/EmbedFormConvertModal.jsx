import React, { useEffect, useRef, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { Dropdown } from 'primereact/dropdown';
import { fetchNonHostBorrowerPlans, fetchBorrowerPlans } from '../../../modules/client/services';
import { apiClient } from '../../../lib/http/apiClient';
import { useAuthStore } from '../../../store/auth/authStore';
import { ENTITY_TYPE_PARTNER } from '../../../config/appConfig';

export default function EmbedFormConvertModal({
    show,
    onHide,
    onConfirm,
    submission,
    loading,
    isHost,
}) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    const [borrowerPlans, setBorrowerPlans] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [planId, setPlanId] = useState(null);
    const [enrollmentType, setEnrollmentType] = useState('');
    const [customEnrollmentAmount, setCustomEnrollmentAmount] = useState('');

    const currentUser = useAuthStore((state) => state.user);
    const userSubscription = useAuthStore((state) => state.userSubscription);
    const isPartnerOnFreeTrial = currentUser?.entity_type === ENTITY_TYPE_PARTNER && !!userSubscription?.is_free_trail;
    const [isFreeTrail, setIsFreeTrail] = useState(false);

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
        if (show) {
            setIsFreeTrail(isPartnerOnFreeTrial);
        }
    }, [show, isPartnerOnFreeTrial]);

    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            modal.show();

            if (!isHost) {
                setFetching(true);
                const loadData = async () => {
                    try {
                        const plansRes = await fetchNonHostBorrowerPlans();
                        if (plansRes?.status) {
                            const plans = plansRes.data || [];
                            setBorrowerPlans(plans);
                            if (plans.length > 0) {
                                setPlanId(plans[0].id);
                                setEnrollmentType(plans[0].enrollment_type);
                                setCustomEnrollmentAmount(plans[0].payment_amount || '');
                            }
                        }
                    } catch (err) {
                        console.error('Failed to load conversion plans:', err);
                    } finally {
                        setFetching(false);
                    }
                };
                loadData();
            }
        } else {
            const modalElement = modalRef.current;
            if (modalElement && modalElement.classList.contains('show')) {
                modal.hide();
            }
            setPlanId(null);
            setEnrollmentType('');
            setCustomEnrollmentAmount('');
        }
    }, [show, isHost]);

    const handlePlanChange = (selectedId) => {
        setPlanId(selectedId);
        const selected = borrowerPlans.find(p => p.id === selectedId);
        if (selected) {
            setEnrollmentType(selected.enrollment_type);
            setCustomEnrollmentAmount(selected.payment_amount || '');
        }
    };

    const selectedBorrowerPlan = borrowerPlans.find(p => p.id === planId);

    const handleConfirm = () => {
        const payload = {
            plan_id: planId,
            enrollment_type: enrollmentType,
            enrollment_amount: customEnrollmentAmount !== '' ? Number(customEnrollmentAmount) : (selectedBorrowerPlan?.payment_amount || 0),
            payment_amount: customEnrollmentAmount !== '' ? Number(customEnrollmentAmount) : (selectedBorrowerPlan?.payment_amount || 0),
            is_free_trail: isFreeTrail,
        };

        if (onConfirm) {
            onConfirm(payload);
        }
    };

    const handleClose = () => {
        if (!loading && onHide) {
            onHide();
        }
    };

    const applicantName = submission ? `${submission.first_name || ''} ${submission.last_name || ''}`.trim() || 'Applicant' : 'Applicant';

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-4 text-center">
                        <i className="ri-user-add-line text-success display-4 mb-3 d-block" />
                        <h4 className="mb-2">Convert Application to Borrower</h4>
                        
                        <p className="text-muted mb-3 fs-13">
                            Are you sure you want to convert <strong className="text-dark">{applicantName}</strong> into an active Borrower account?
                        </p>

                        {!isHost && (
                            <div className="text-start bg-light p-3 rounded mb-3">
                                {fetching ? (
                                    <div className="text-center py-2">
                                        <span className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                                        <span className="text-muted fs-12">Loading enrollment plans...</span>
                                    </div>
                                ) : (
                                    <>
                                        <label className="form-label fs-12 fw-semibold mb-1 text-dark">
                                            Select Borrower Plan <span className="text-danger">*</span>
                                        </label>
                                        <Dropdown
                                            value={planId}
                                            options={borrowerPlans.map(p => ({
                                                label: `${p.name || p.enrollment_type || 'Plan'} — $${Number(p.payment_amount || 0).toLocaleString()} ${p.total_installments_count > 1 ? `(${p.total_installments_count} mos)` : '(One Time)'}`,
                                                value: p.id
                                            }))}
                                            onChange={(e) => handlePlanChange(e.value)}
                                            optionLabel="label"
                                            optionValue="value"
                                            placeholder="Select enrollment plan"
                                            className="w-100 mb-2"
                                        />
                                        {selectedBorrowerPlan && (
                                            <div className="d-flex justify-content-between align-items-center pt-1 border-top mt-2">
                                                <span className="text-muted fs-12">Enrollment Fee:</span>
                                                <span className="text-success fw-bold fs-13">
                                                    ${Number(customEnrollmentAmount !== '' ? customEnrollmentAmount : selectedBorrowerPlan.payment_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        <div className="hstack gap-2 justify-content-center mt-4">
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
                                className="btn btn-success"
                                onClick={handleConfirm}
                                disabled={loading || (!isHost && fetching)}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <i className="ri-check-line me-1 align-bottom" />
                                        {!isHost ? 'Continue to Payment' : 'Yes, Convert to Borrower'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
