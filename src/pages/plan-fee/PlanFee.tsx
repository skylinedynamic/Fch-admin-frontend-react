import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPlanFeeSubscriptions, updatePlanFeeSubscription } from '../../modules/subscription-plan';
import { toast } from 'react-toastify';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import {
    PLAN_GROUP_PARTNER_ENROLLMENT,
    PLAN_GROUP_BORROWER_ENROLLMENT,
    PLAN_GROUP_BORROWER_FEE,
    PLAN_GROUP_USER_SEAT,
    PLAN_GROUP_UNASSIGNED
} from '../../config/subscriptionConfig';

interface Plan {
    id: number;
    partner_type: string;
    partner_type_slug: string | null;
    enrollment_type: string;
    enrollment_type_slug: string | null;
    entity_type: string;
    is_partner_paying: boolean | number;
    total_installments_count: number | null;
    subscription_period_month: number | null;
    total_amount: string | number;
    platform_fee: string | number;
    total_installment_count_upto?: number | null;
    currency: string;
    currency_symbol: string;
    status: boolean | number;
    is_installment?: boolean;
}

interface EditState {
    total_amount: string;
    platform_fee: string;
    total_installment_count_upto: string;
}

const groupMeta: Record<string, { title: string; icon: string; bg: string; text: string; desc: string }> = {
    [PLAN_GROUP_PARTNER_ENROLLMENT]: {
        title: 'Partner Enrollment Plans',
        icon: 'ri-handshake-line',
        bg: 'bg-primary-subtle',
        text: 'text-primary',
        desc: 'Pricing structures applicable to partner entities'
    },
    [PLAN_GROUP_BORROWER_ENROLLMENT]: {
        title: 'Borrower Enrollment Plans',
        icon: 'ri-user-follow-line',
        bg: 'bg-success-subtle',
        text: 'text-success',
        desc: 'Direct borrower signup rates'
    },
    [PLAN_GROUP_BORROWER_FEE]: {
        title: 'Borrower Fee Plans',
        icon: 'ri-bank-card-line',
        bg: 'bg-warning-subtle',
        text: 'text-warning',
        desc: 'Additional fee structures for borrowers'
    },
    [PLAN_GROUP_USER_SEAT]: {
        title: 'User Seat Plans',
        icon: 'ri-group-line',
        bg: 'bg-info-subtle',
        text: 'text-info',
        desc: 'Pricing for additional user/employee seats'
    },
    [PLAN_GROUP_UNASSIGNED]: {
        title: 'Other Plans',
        icon: 'ri-price-tag-3-line',
        bg: 'bg-secondary-subtle',
        text: 'text-secondary',
        desc: 'Uncategorized subscription plans'
    }
};

const groupOrder = [
    PLAN_GROUP_PARTNER_ENROLLMENT,
    PLAN_GROUP_BORROWER_ENROLLMENT,
    PLAN_GROUP_BORROWER_FEE,
    PLAN_GROUP_USER_SEAT,
    PLAN_GROUP_UNASSIGNED
];

export default function PlanFee() {
    const [plans, setPlans] = useState<Record<string, Plan[]>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [editedValues, setEditedValues] = useState<Record<number, EditState>>({});
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<string>(PLAN_GROUP_PARTNER_ENROLLMENT);

    // Modal states
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [selectedPlanForUpdate, setSelectedPlanForUpdate] = useState<Plan | null>(null);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const response = await fetchPlanFeeSubscriptions();
            if (response.status) {
                const plansGrouped = response.data || {};
                setPlans(plansGrouped);

                // Set default active tab
                const available = groupOrder.filter(groupKey => (plansGrouped[groupKey] || []).length > 0);
                if (available.length > 0) {
                    setActiveTab(prev => available.includes(prev) ? prev : available[0]);
                }

                // Initialize edited values
                const initialEdits: Record<number, EditState> = {};
                Object.values(plansGrouped).forEach((plansList: any) => {
                    if (Array.isArray(plansList)) {
                        plansList.forEach((plan: Plan) => {
                            initialEdits[plan.id] = {
                                total_amount: String(plan.total_amount ?? '0.00'),
                                platform_fee: String(plan.platform_fee ?? '0.00'),
                                total_installment_count_upto: String(plan.total_installment_count_upto ?? ''),
                            };
                        });
                    }
                });
                setEditedValues(initialEdits);
            } else {
                toast.error(response.message || 'Failed to fetch subscription plans');
            }
        } catch (error) {
            console.error('Error fetching subscription plans:', error);
            toast.error('Failed to load subscription plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlans();
    }, []);

    // Handle input changes
    const handleInputChange = (id: number, field: keyof EditState, value: string) => {
        setEditedValues(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    // Helper to format text
    const formatSlug = (slug: string) => {
        if (!slug) return '';
        return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const getEnrollmentBadge = (type: string) => {
        const lower = (type || '').toLowerCase();
        if (lower.includes('installment')) {
            return 'bg-warning-subtle text-warning';
        }
        return 'bg-secondary-subtle text-secondary';
    };

    const getPlanAvatarStyle = (index: number) => {
        const styles = [
            { bg: 'bg-primary-subtle', text: 'text-primary', icon: 'ri-vip-diamond-line' },
            { bg: 'bg-success-subtle', text: 'text-success', icon: 'ri-shield-flash-line' },
            { bg: 'bg-warning-subtle', text: 'text-warning', icon: 'ri-award-line' },
            { bg: 'bg-info-subtle', text: 'text-info', icon: 'ri-medal-line' },
        ];
        return styles[index % styles.length];
    };

    const isInstallmentPlan = (plan: Plan) => {
        const slug = (plan.enrollment_type_slug || '').toLowerCase();
        const name = (plan.enrollment_type || '').toLowerCase();
        return !!plan.is_installment
            || slug === 'installment'
            || slug === 'payment-plan-11-month-plan'
            || slug === '6-month-payment'
            || name === 'installment'
            || name.includes('installment');
    };

    // Initiate update modal confirmation
    const handleInitiateUpdate = (plan: Plan) => {
        const edits = editedValues[plan.id];
        if (!edits) return;

        const showPlatformFee = activeTab !== PLAN_GROUP_BORROWER_FEE && activeTab !== PLAN_GROUP_USER_SEAT && activeTab !== PLAN_GROUP_BORROWER_ENROLLMENT;

        const originalAmount = parseFloat(String(plan.total_amount || 0));
        const editedAmount = parseFloat(edits.total_amount || '0');
        const amountChanged = originalAmount !== editedAmount;

        const originalFee = parseFloat(String(plan.platform_fee || 0));
        const editedFee = parseFloat(edits.platform_fee || '0');
        const platformFeeChanged = showPlatformFee && (originalFee !== editedFee);

        const originalLimit = plan.total_installment_count_upto;
        const editedLimit = edits.total_installment_count_upto ? parseInt(edits.total_installment_count_upto) : null;
        const limitChanged = isInstallmentPlan(plan) && (originalLimit !== editedLimit);

        if (!amountChanged && !platformFeeChanged && !limitChanged) {
            toast.info('No changes detected for this plan.');
            return;
        }

        setSelectedPlanForUpdate(plan);
        setShowConfirmModal(true);
    };

    const handleExecuteUpdate = async () => {
        if (!selectedPlanForUpdate) return;
        const id = selectedPlanForUpdate.id;
        const edits = editedValues[id];
        if (!edits) return;

        setShowConfirmModal(false);
        setUpdatingId(id);

        try {
            const isInstallment = isInstallmentPlan(selectedPlanForUpdate);
            const showPlatformFee = activeTab !== PLAN_GROUP_BORROWER_FEE && activeTab !== PLAN_GROUP_USER_SEAT && activeTab !== PLAN_GROUP_BORROWER_ENROLLMENT;

            const payload: any = {
                total_amount: parseFloat(edits.total_amount) || 0,
            };

            if (showPlatformFee) {
                payload.platform_fee = parseFloat(edits.platform_fee) || 0;
            }

            if (isInstallment) {
                payload.total_installment_count_upto = edits.total_installment_count_upto ? parseInt(edits.total_installment_count_upto) : null;
            }

            const response = await updatePlanFeeSubscription(id, payload);

            if (response.status) {
                toast.success(response.message || 'Plan updated successfully');
                loadPlans(); // Reload to refresh
            } else {
                toast.error(response.message || 'Failed to update plan');
            }
        } catch (error) {
            console.error('Error updating plan:', error);
            toast.error('Failed to update plan');
        } finally {
            setUpdatingId(null);
            setSelectedPlanForUpdate(null);
        }
    };

    const availableGroups = groupOrder.filter(groupKey => (plans[groupKey] || []).length > 0);
    const activePlansList = plans[activeTab] || [];
    const showPartnerType = activeTab === PLAN_GROUP_PARTNER_ENROLLMENT || activeTab === PLAN_GROUP_USER_SEAT || activeTab === PLAN_GROUP_UNASSIGNED;
    const showPlatformFee = activeTab !== PLAN_GROUP_BORROWER_FEE && activeTab !== PLAN_GROUP_USER_SEAT && activeTab !== PLAN_GROUP_BORROWER_ENROLLMENT;

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Standard Sticky Subheader */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Plan & Fee</h4>
                                <nav aria-label="breadcrumb" className="d-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active fw-medium" aria-current="page">Plan & Fee</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                {loading && Object.keys(plans).length === 0 ? (
                    <div className="card shadow-sm border-0 p-4" style={{ borderRadius: '4px' }}>
                        <div className="placeholder-glow">
                            <div className="placeholder col-4 mb-4 rounded" style={{ height: '30px' }}></div>
                            <div className="placeholder col-12 mb-2 rounded" style={{ height: '44px' }}></div>
                            <div className="placeholder col-12 mb-2 rounded" style={{ height: '44px' }}></div>
                            <div className="placeholder col-12 mb-2 rounded" style={{ height: '44px' }}></div>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Info Banner */}
                        <div className="alert alert-info bg-info-subtle border-0 text-dark d-flex align-items-center gap-2.5 p-3 rounded-3 mb-4 fs-13 shadow-xs">
                            <i className="ri-information-line fs-20 text-info flex-shrink-0"></i>
                            <div>
                                <strong className="text-dark">You control what your clients pay.</strong>{' '}
                                <span className="text-muted">Create and manage the subscription plan rates. Only active plans will be shown to your clients.</span>
                            </div>
                        </div>

                        {/* Combined Navigation Tabs & Configurator Card */}
                        <div className="card border-0 shadow-sm bg-white overflow-hidden plan-fee-main-card">
                            <div className="card-header border-0 bg-light bg-opacity-25 pb-0 pt-3">
                                <ul className="nav nav-tabs nav-tabs-custom nav-primary border-bottom-0" role="tablist">
                                    {availableGroups.map((groupKey) => {
                                        const meta = groupMeta[groupKey] || groupMeta.unassigned;
                                        const isActive = activeTab === groupKey;
                                        return (
                                            <li className="nav-item" key={groupKey}>
                                                <button
                                                    className={`nav-link py-3 px-3.5 fw-medium border-0 fs-13 d-flex align-items-center gap-2 ${isActive ? 'active text-primary fw-bold' : 'text-muted'}`}
                                                    onClick={() => setActiveTab(groupKey)}
                                                    type="button"
                                                >
                                                    <i className={`${meta.icon} fs-16 ${isActive ? 'text-primary' : 'text-muted'}`}></i>
                                                    <span>{meta.title.replace(' Plans', '')}</span>
                                                    <span className={`badge ${isActive ? 'bg-primary text-white' : 'bg-light text-dark'} rounded-pill px-2.5 py-0.5 fs-10 fw-semibold`}>
                                                        {(plans[groupKey] || []).length}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="card-body p-4 pt-3">
                                {activePlansList.length > 0 ? (
                                    <div className="d-flex flex-column gap-3">
                                        {activePlansList.map((plan, index) => {
                                            const isInstallment = isInstallmentPlan(plan);
                                            const edits = editedValues[plan.id] || { total_amount: '0', platform_fee: '0', total_installment_count_upto: '' };
                                            const isUpdating = updatingId === plan.id;
                                            const currency = plan.currency_symbol || plan.currency || '$';
                                            const partnerName = formatSlug(plan.partner_type || plan.partner_type_slug || '');
                                            const enrollmentName = formatSlug(plan.enrollment_type || plan.enrollment_type_slug || '');
                                            const avatarStyle = getPlanAvatarStyle(index);

                                            return (
                                                <div key={plan.id} className="p-3 bg-light bg-opacity-40 rounded mb-2 transition-all hover-shadow-sm">
                                                    <div className="row align-items-center g-3">
                                                        {/* Left Details Column */}
                                                        <div className="col-12 col-md-5 d-flex align-items-center gap-3">
                                                            <div className={`avatar-md flex-shrink-0 d-flex align-items-center justify-content-center plan-fee-avatar-square ${avatarStyle.bg}`}>
                                                                <span className={`${avatarStyle.text} fs-18 fw-bold`}>
                                                                    <i className={avatarStyle.icon}></i>
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <h5 className="mb-1 fw-bold text-dark fs-14">
                                                                    {partnerName ? `${partnerName} - ${enrollmentName}` : enrollmentName}
                                                                </h5>
                                                                <p className="text-muted mb-0 fs-12 lh-base">
                                                                    {isInstallment
                                                                        ? 'Installment billing parameters and payment counts.'
                                                                        : 'Standard single transaction payment rate.'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Right Inputs Column */}
                                                        <div className="col-12 col-md-7">
                                                            <div className="d-flex align-items-center justify-content-md-end flex-wrap gap-3">
                                                                {/* Total Amount */}
                                                                <div className="plan-fee-input-width">
                                                                    <label className="form-label text-muted small mb-1">Total Amount</label>
                                                                    <div className="input-group input-group-sm plan-fee-input-group">
                                                                        <span className="input-group-text bg-light text-muted">{currency}</span>
                                                                        <input
                                                                            type="number"
                                                                            className="form-control form-control-sm bg-white"
                                                                            value={edits.total_amount}
                                                                            onChange={(e) => handleInputChange(plan.id, 'total_amount', e.target.value)}
                                                                            min="0"
                                                                            step="0.01"
                                                                            disabled={isUpdating}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Platform Fee */}
                                                                {showPlatformFee && (
                                                                    <div className="plan-fee-input-width">
                                                                        <label className="form-label text-muted small mb-1">Platform Fee</label>
                                                                        <div className="input-group input-group-sm plan-fee-input-group">
                                                                            <span className="input-group-text bg-light text-muted">{currency}</span>
                                                                            <input
                                                                                type="number"
                                                                                className="form-control form-control-sm bg-white"
                                                                                value={edits.platform_fee}
                                                                                onChange={(e) => handleInputChange(plan.id, 'platform_fee', e.target.value)}
                                                                                min="0"
                                                                                step="0.01"
                                                                                disabled={isUpdating}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Installment Limit */}
                                                                {isInstallment && (
                                                                    <div className="plan-fee-input-width">
                                                                        <label className="form-label text-muted small mb-1">Installment Upto</label>
                                                                        <div className="input-group input-group-sm plan-fee-input-group-limit">
                                                                            <input
                                                                                type="number"
                                                                                className="form-control form-control-sm bg-white text-center"
                                                                                value={edits.total_installment_count_upto ?? ''}
                                                                                onChange={(e) => handleInputChange(plan.id, 'total_installment_count_upto', e.target.value)}
                                                                                min="1"
                                                                                step="1"
                                                                                disabled={isUpdating}
                                                                            />
                                                                            <span className="input-group-text bg-light text-muted">months</span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Save Action */}
                                                                <div className="align-self-end">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm waves-effect waves-light d-flex align-items-center plan-fee-save-btn"
                                                                        onClick={() => handleInitiateUpdate(plan)}
                                                                        disabled={isUpdating}
                                                                    >
                                                                        {isUpdating ? (
                                                                            <>
                                                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                                                <span>Saving</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <i className="ri-save-line fs-13 me-2"></i>
                                                                                <span>Save</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-5 text-center bg-white">
                                        <div className="avatar-md mx-auto mb-3">
                                            <div className="avatar-title bg-light text-muted rounded-circle fs-24">
                                                <i className="ri-inbox-archive-line"></i>
                                            </div>
                                        </div>
                                        <h6 className="text-muted fw-normal m-0">No active plans configured for this tier.</h6>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                toggle={() => setShowConfirmModal(false)}
                centered
                modalClassName="flip plan-fee-confirm-modal"
                contentClassName="border-0 shadow-lg"
            >
                <ModalHeader toggle={() => setShowConfirmModal(false)} className="bg-light border-bottom py-3">
                    <span className="fs-15 fw-bold text-dark mb-0">
                        <i className="ri-shield-check-line text-primary me-2 align-middle fs-18"></i>
                        Confirm Rate Changes
                    </span>
                </ModalHeader>
                <ModalBody className="p-4 bg-white plan-fee-confirm-modal-body">
                    {selectedPlanForUpdate && (() => {
                        const edits = editedValues[selectedPlanForUpdate.id] || { total_amount: '0', platform_fee: '0', total_installment_count_upto: '' };
                        const currency = selectedPlanForUpdate.currency_symbol || selectedPlanForUpdate.currency || '$';
                        const isInstallment = isInstallmentPlan(selectedPlanForUpdate);
                        const showPlatformFee = activeTab !== PLAN_GROUP_BORROWER_FEE && activeTab !== PLAN_GROUP_USER_SEAT && activeTab !== PLAN_GROUP_BORROWER_ENROLLMENT;
                        const partnerName = formatSlug(selectedPlanForUpdate.partner_type || selectedPlanForUpdate.partner_type_slug || '');
                        const enrollmentName = formatSlug(selectedPlanForUpdate.enrollment_type || selectedPlanForUpdate.enrollment_type_slug || '');

                        const originalAmount = parseFloat(String(selectedPlanForUpdate.total_amount || 0));
                        const editedAmount = parseFloat(edits.total_amount || '0');
                        const amountChanged = originalAmount !== editedAmount;

                        const originalFee = parseFloat(String(selectedPlanForUpdate.platform_fee || 0));
                        const editedFee = parseFloat(edits.platform_fee || '0');
                        const platformFeeChanged = showPlatformFee && (originalFee !== editedFee);

                        const originalLimit = selectedPlanForUpdate.total_installment_count_upto;
                        const editedLimit = edits.total_installment_count_upto ? parseInt(edits.total_installment_count_upto) : null;
                        const limitChanged = isInstallment && (originalLimit !== editedLimit);

                        const changedItems = [];
                        if (amountChanged) {
                            changedItems.push({
                                label: 'Total Amount',
                                oldVal: `${currency}${originalAmount.toFixed(2)}`,
                                newVal: `${currency}${editedAmount.toFixed(2)}`
                            });
                        }
                        if (platformFeeChanged) {
                            changedItems.push({
                                label: 'Platform Fee',
                                oldVal: `${currency}${originalFee.toFixed(2)}`,
                                newVal: `${currency}${editedFee.toFixed(2)}`
                            });
                        }
                        if (limitChanged) {
                            changedItems.push({
                                label: 'Installment Upto',
                                oldVal: originalLimit ? `${originalLimit} months` : 'Unlimited',
                                newVal: editedLimit ? `${editedLimit} months` : 'Unlimited'
                            });
                        }

                        return (
                            <div>
                                <p className="text-muted mb-4 fs-13">
                                    Please review and confirm the rate modifications for <strong className="text-dark">{partnerName ? `${partnerName} - ${enrollmentName}` : enrollmentName}</strong>:
                                </p>

                                <div className="bg-info-subtle p-3 mb-4 plan-fee-changed-items-box">
                                    <div className="d-flex flex-column gap-3 fs-13">
                                        {changedItems.map((item) => (
                                            <div key={item.label} className="d-flex align-items-center justify-content-between">
                                                <span className="text-muted fw-semibold">{item.label}</span>
                                                <div className="d-flex align-items-center gap-2 font-monospace">
                                                    <span className="text-muted text-decoration-line-through">{item.oldVal}</span>
                                                    <i className="ri-arrow-right-line text-muted"></i>
                                                    <span className="text-success fw-bold">{item.newVal}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="alert alert-warning border-0 border-start border-3 border-warning bg-warning-subtle text-dark p-3 rounded-0 mb-4 fs-12 plan-fee-alert-note">
                                    <div className="d-flex gap-2">
                                        <div>
                                            <strong className="text-dark">Please note:</strong> This rate modification will apply immediately to new registrations. Existing users' plans will remain unchanged.
                                        </div>
                                    </div>
                                </div>

                                <div className="hstack gap-2 justify-content-end mt-4">
                                    <button type="button" className="btn btn-light px-4 py-2 border fw-semibold fs-13 plan-fee-modal-btn" onClick={() => setShowConfirmModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="button" className="btn btn-primary px-4 py-2 fw-semibold fs-13 d-flex align-items-center gap-2 plan-fee-modal-btn" onClick={handleExecuteUpdate}>
                                        <i className="ri-check-line fs-15"></i>
                                        Confirm & Save
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </ModalBody>
            </Modal>
        </div>
    );
}
