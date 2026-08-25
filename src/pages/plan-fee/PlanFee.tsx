import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPlanFeeSubscriptions, updatePlanFeeSubscription } from '../../modules/subscription-plan';
import { toast } from 'react-toastify';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import PlanFeeSkeletonLoader from '../../components/Loader/PlanFeeSkeletonLoader';
import {
    PLAN_GROUP_PARTNER_ENROLLMENT,
    PLAN_GROUP_BORROWER_ENROLLMENT,
    PLAN_GROUP_BORROWER_FEE,
    PLAN_GROUP_USER_SEAT,
    PLAN_GROUP_UNASSIGNED,
    checkIsInstallmentPlan
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
    total_seat_count?: number | null;
    currency: string;
    currency_symbol: string;
    status: boolean | number;
    is_installment?: boolean;
}

interface EditState {
    total_amount: string;
    platform_fee: string;
    total_installment_count_upto: string;
    total_seat_count: string;
}

const groupMeta: Record<string, { title: string; icon: string; bg: string; text: string; desc: string; note?: string }> = {
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
        desc: 'Additional fee structures for borrowers',
        note: 'For each borrower, partner has to pay $800 during enrollment.'
    },
    [PLAN_GROUP_USER_SEAT]: {
        title: 'User Seat Plans',
        icon: 'ri-group-line',
        bg: 'bg-info-subtle',
        text: 'text-info',
        desc: 'Pricing for additional user/employee seats',
        note: '3 users are available for free (including partner); after that, each additional user costs $49.'
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
    const [includeExistingSubscription, setIncludeExistingSubscription] = useState<boolean>(false);

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
                                total_seat_count: String(plan.total_seat_count ?? '0'),
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
        return checkIsInstallmentPlan(plan);
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

        const isUserSeat = activeTab === PLAN_GROUP_USER_SEAT;
        const originalSeat = plan.total_seat_count ?? 0;
        const editedSeat = edits.total_seat_count ? parseInt(edits.total_seat_count) : 0;
        const seatChanged = isUserSeat && (originalSeat !== editedSeat);

        if (!amountChanged && !platformFeeChanged && !limitChanged && !seatChanged) {
            toast.info('No changes detected for this plan.');
            return;
        }

        setSelectedPlanForUpdate(plan);
        setIncludeExistingSubscription(false);
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

            if (activeTab === PLAN_GROUP_USER_SEAT) {
                payload.total_seat_count = edits.total_seat_count ? parseInt(edits.total_seat_count) : 0;
            }

            if (activeTab === PLAN_GROUP_BORROWER_FEE || activeTab === PLAN_GROUP_USER_SEAT) {
                payload.include_existing_subscription = includeExistingSubscription;
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
        <div className="page-content">
            <div className="container-fluid">
                {/* Header mirrored from Partners.jsx */}
                <div className="row pb-1 mobile-sticky-header">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Plan & Fee</h4>
                                <nav aria-label="breadcrumb" className="d-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Plan & Fee</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                {loading && Object.keys(plans).length === 0 ? (
                    <PlanFeeSkeletonLoader />
                ) : (
                    <div>
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
                                                    className={`nav-link py-3 px-3.5 fw-medium border-0 fs-13 d-flex align-items-center gap-2 ${isActive ? 'active text-primary' : 'text-muted'}`}
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
                                {/* Polished Alert Note Banner for Borrower Fee */}
                                {activeTab === PLAN_GROUP_BORROWER_FEE && (
                                    <div className="alert alert-warning bg-warning-subtle border-0 text-dark p-3 rounded-3 mb-3 fs-13 shadow-xs">
                                        <div className="d-flex align-items-center gap-2 mb-1.5">
                                            <i className="ri-information-fill fs-18 text-warning flex-shrink-0"></i>
                                            <strong className="text-dark fw-bold">Borrower Fee Policy:</strong>
                                        </div>
                                        <div className="ms-4 text-muted">
                                            <span>For each borrower, partner has to pay the enrollment fee:</span>
                                            {activePlansList.length > 0 && (
                                                <ul className="mb-0 mt-1.5 ps-3 text-dark">
                                                    {activePlansList.map(p => {
                                                        const pName = formatSlug(p.partner_type || p.partner_type_slug || '');
                                                        const amount = editedValues[p.id]?.total_amount ?? p.total_amount ?? '0';
                                                        const curr = p.currency_symbol || p.currency || '$';
                                                        return (
                                                            <li key={p.id} className="mb-1">
                                                                <strong className="text-dark">{pName || 'All Partners'}:</strong> Partner has to pay <span className="fw-bold text-primary">{curr}{amount}</span> for each borrower during enrollment.
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Polished Alert Note Banner for User Seat */}
                                {activeTab === PLAN_GROUP_USER_SEAT && (
                                    <div className="alert alert-info bg-info-subtle border-0 text-dark p-3 rounded-3 mb-3 fs-13 shadow-xs">
                                        <div className="d-flex align-items-center gap-2 mb-1.5">
                                            <i className="ri-group-fill fs-18 text-info flex-shrink-0"></i>
                                            <strong className="text-dark fw-bold">User Seat Policy (Partner Wise):</strong>
                                        </div>
                                        <div className="ms-4 text-muted">
                                            <span>Free user seats and the cost for each additional user seat configured partner-wise:</span>
                                            {activePlansList.length > 0 && (
                                                <ul className="mb-0 mt-1.5 ps-3 text-dark">
                                                    {activePlansList.map(p => {
                                                        const pName = formatSlug(p.partner_type || p.partner_type_slug || '');
                                                        const amount = editedValues[p.id]?.total_amount ?? p.total_amount ?? '0';
                                                        const curr = p.currency_symbol || p.currency || '$';
                                                        return (
                                                            <li key={p.id} className="mb-1">
                                                                <strong className="text-dark">{pName || 'All Partners'}:</strong> {p.total_seat_count ?? 0} free users (including partner), then <span className="fw-bold text-primary">{curr}{amount}</span> per additional user.
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab !== PLAN_GROUP_BORROWER_FEE && activeTab !== PLAN_GROUP_USER_SEAT && groupMeta[activeTab]?.note && (
                                    <div className="alert alert-warning bg-warning-subtle border-0 text-dark d-flex align-items-center gap-2.5 p-3 rounded-3 mb-3 fs-13 shadow-xs">
                                        <i className="ri-information-fill fs-18 text-warning flex-shrink-0"></i>
                                        <div>
                                            <strong className="text-dark">Note:</strong> {groupMeta[activeTab].note}
                                        </div>
                                    </div>
                                )}

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
                                                                <h5 className="mb-1 text-dark fs-15">
                                                                    {partnerName ? `${partnerName} - ${enrollmentName}` : enrollmentName}
                                                                </h5>
                                                                <p className="text-muted mb-0 fs-12 lh-base">
                                                                    {activeTab === PLAN_GROUP_BORROWER_FEE
                                                                        ? `For each borrower, partner has to pay ${currency}${edits.total_amount || '0'} during enrollment.`
                                                                        : activeTab === PLAN_GROUP_USER_SEAT
                                                                            ? `${plan.total_seat_count || 0} users are available for free (including partner); after that, each additional user has to pay ${currency}${edits.total_amount || '0'}.`
                                                                            : isInstallment
                                                                                ? 'Installment billing parameters and payment counts.'
                                                                                : 'Standard single transaction payment rate.'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Right Inputs Column */}
                                                        <div className="col-12 col-md-7">
                                                            <div className="d-flex align-items-center justify-content-md-end flex-wrap gap-3">
                                                                {/* Free Seats (Only for user seat tier) */}
                                                                {activeTab === PLAN_GROUP_USER_SEAT && (
                                                                    <div className="plan-fee-input-width-lg">
                                                                        <label className="form-label text-muted small mb-1">Free Seats including partner</label>
                                                                        <div className="input-group input-group-sm plan-fee-input-group-limit">
                                                                            <input
                                                                                type="number"
                                                                                className="form-control form-control-sm bg-white text-center"
                                                                                value={edits.total_seat_count ?? '0'}
                                                                                onChange={(e) => handleInputChange(plan.id, 'total_seat_count', e.target.value)}
                                                                                min="0"
                                                                                step="1"
                                                                                disabled={isUpdating}
                                                                            />
                                                                            <span className="input-group-text bg-light text-muted">users</span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Total Amount */}
                                                                <div className="plan-fee-input-width">
                                                                    <label className="form-label text-muted small mb-1">Total  Amount</label>
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
                size="lg"
                modalClassName="flip plan-fee-confirm-modal"
                contentClassName="border-0 shadow-lg"
                style={{ borderRadius: '4px' }}
            >
                <ModalHeader toggle={() => setShowConfirmModal(false)} className="bg-light border-0 py-3 px-4">
                    <div className="d-flex align-items-center">
                        <i className="ri-shield-check-line text-primary me-3 fs-18"></i>
                        <span className="fs-15 fw-bold text-dark mb-0">
                            Confirm Rate Changes
                        </span>
                    </div>
                </ModalHeader>
                <ModalBody className="p-4 bg-white plan-fee-confirm-modal-body">
                    {selectedPlanForUpdate && (() => {
                        const edits = editedValues[selectedPlanForUpdate.id] || { total_amount: '0', platform_fee: '0', total_installment_count_upto: '', total_seat_count: '0' };
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

                        const isUserSeat = activeTab === PLAN_GROUP_USER_SEAT;
                        const originalSeat = selectedPlanForUpdate.total_seat_count ?? 0;
                        const editedSeat = edits.total_seat_count ? parseInt(edits.total_seat_count) : 0;
                        const seatChanged = isUserSeat && (originalSeat !== editedSeat);

                        const changedItems = [];
                        if (amountChanged) {
                            changedItems.push({
                                label: 'Total Amount',
                                icon: 'ri-money-dollar-circle-line',
                                oldVal: `${currency}${originalAmount.toFixed(2)}`,
                                newVal: `${currency}${editedAmount.toFixed(2)}`
                            });
                        }
                        if (platformFeeChanged) {
                            changedItems.push({
                                label: 'Platform Fee',
                                icon: 'ri-percent-line',
                                oldVal: `${currency}${originalFee.toFixed(2)}`,
                                newVal: `${currency}${editedFee.toFixed(2)}`
                            });
                        }
                        if (limitChanged) {
                            changedItems.push({
                                label: 'Installment Limit',
                                icon: 'ri-calendar-2-line',
                                oldVal: originalLimit ? `${originalLimit} months` : 'Unlimited',
                                newVal: editedLimit ? `${editedLimit} months` : 'Unlimited'
                            });
                        }
                        if (seatChanged) {
                            changedItems.push({
                                label: 'Free Seats Limit',
                                icon: 'ri-user-shared-line',
                                oldVal: `${originalSeat} Users`,
                                newVal: `${editedSeat} Users`
                            });
                        }

                        return (
                            <div>
                                {/* Plan Header Info */}
                                <div className="d-flex align-items-center justify-content-between mb-3 pb-2.5">
                                    <div>
                                        <span className="text-muted text-uppercase fs-11 fw-semibold d-block mb-1">Target Plan</span>
                                        <h5 className="fs-15 fw-bold text-dark mb-0">
                                            {partnerName ? `${partnerName} — ${enrollmentName}` : enrollmentName}
                                        </h5>
                                    </div>
                                    <span className="badge bg-light text-primary px-3 py-1.5 fs-12 fw-semibold text-capitalize" style={{ borderRadius: '4px' }}>
                                        {activeTab.replace(/_/g, ' ')}
                                    </span>
                                </div>

                                {/* Comparison Table */}
                                <div className="mb-3 overflow-hidden" style={{ borderRadius: '4px' }}>
                                    <table className="plan-fee-param-table mb-0">
                                        <thead>
                                            <tr>
                                                <th>Parameter</th>
                                                <th className="text-center" style={{ width: '32%' }}>Current</th>
                                                <th className="text-center" style={{ width: '34%' }}>Updated</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {changedItems.map((item) => (
                                                <tr key={item.label}>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <i className={`${item.icon} text-primary fs-16 me-3`}></i>
                                                            <span className="text-dark fw-medium fs-13">{item.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="text-muted text-decoration-line-through font-monospace fs-13">{item.oldVal}</span>
                                                    </td>
                                                    <td className="text-center bg-success-subtle bg-opacity-25">
                                                        <span className="text-success fw-bold font-monospace fs-14">{item.newVal}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Include existing subscription card (Borrower Fee & User Seat) */}
                                {(activeTab === PLAN_GROUP_BORROWER_FEE || activeTab === PLAN_GROUP_USER_SEAT) && (
                                    <div
                                        className={`plan-fee-checkbox-card mb-3 ${includeExistingSubscription ? 'is-active' : ''}`}
                                        style={{ borderRadius: '4px' }}
                                        onClick={() => setIncludeExistingSubscription(!includeExistingSubscription)}
                                    >
                                        <div className="d-flex align-items-center">
                                            <input
                                                className="form-check-input cursor-pointer me-3 flex-shrink-0"
                                                type="checkbox"
                                                id="modalIncludeExistingSub"
                                                style={{ width: '1.15rem', height: '1.15rem', marginTop: 0, cursor: 'pointer', borderRadius: '4px' }}
                                                checked={includeExistingSubscription}
                                                onChange={(e) => setIncludeExistingSubscription(e.target.checked)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <label className="form-check-label fs-13 fw-semibold text-dark cursor-pointer mb-0" htmlFor="modalIncludeExistingSub">
                                                Include existing Subscription
                                            </label>
                                        </div>

                                        {/* User Seat specific subtle note with smooth height/opacity transition */}
                                        {activeTab === PLAN_GROUP_USER_SEAT && (
                                            <div className={`plan-fee-warning-collapse ${includeExistingSubscription ? 'show' : ''}`}>
                                                <div className="alert alert-warning bg-warning-subtle border-0 text-dark p-2.5 mb-0 fs-12 d-flex align-items-start shadow-none" style={{ borderRadius: '4px' }}>
                                                    <i className="ri-alert-fill fs-16 text-warning flex-shrink-0 me-3 mt-0.5"></i>
                                                    <div className="text-dark">
                                                        <strong className="text-dark fw-bold">Note:</strong> Only amount will update, seat count will be same.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Informational Notice Alert */}
                                <div className="alert alert-info bg-info-subtle border-0 text-dark p-3 mb-4 fs-12 shadow-none" style={{ borderRadius: '4px' }}>
                                    <div className="d-flex align-items-start">
                                        <i className="ri-information-fill fs-16 text-info flex-shrink-0 me-3 mt-0.5"></i>
                                        <div className="text-dark lh-base">
                                            <strong className="text-dark fw-bold">Please note:</strong>{' '}
                                            {includeExistingSubscription
                                                ? (activeTab === PLAN_GROUP_USER_SEAT
                                                    ? 'This rate modification will apply immediately to new registrations as well as existing active subscriptions (existing user seat counts will remain unchanged).'
                                                    : 'This rate modification will apply immediately to new registrations as well as existing active subscriptions.')
                                                : 'This rate modification will apply immediately to new registrations. Existing users\' plans will remain unchanged.'}
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer Actions */}
                                <div className="hstack gap-2 justify-content-end pt-2 border-top">
                                    <button
                                        type="button"
                                        className="btn btn-light px-4 py-2 border-0 fw-semibold fs-13"
                                        style={{ borderRadius: '4px' }}
                                        onClick={() => setShowConfirmModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary px-4 py-2 fw-semibold fs-13 d-flex align-items-center gap-2"
                                        style={{ borderRadius: '4px' }}
                                        onClick={handleExecuteUpdate}
                                    >
                                        <i className="ri-check-line fs-15 me-2"></i>
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
