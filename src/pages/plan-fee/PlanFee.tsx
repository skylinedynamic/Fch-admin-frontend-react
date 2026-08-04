import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPlanFeeSubscriptions, updatePlanFeeSubscription } from '../../modules/subscription-plan';
import { toast } from 'react-toastify';

interface Plan {
    id: number;
    partner_type: string;
    partner_type_slug: string;
    enrollment_type: string;
    enrollment_type_slug: string;
    entity_type: string;
    is_partner_paying: boolean | number;
    total_installments_count: number | null;
    subscription_period_month: number | null;
    total_amount: string | number;
    platform_fee: string | number;
    currency: string;
    currency_symbol: string;
    status: boolean | number;
}

interface EditState {
    total_amount: string;
    platform_fee: string;
}

export default function PlanFee() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [editedValues, setEditedValues] = useState<Record<number, EditState>>({});
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const response = await fetchPlanFeeSubscriptions();
            if (response.status) {
                const plansList = response.data || [];
                setPlans(plansList);
                
                // Initialize edited values
                const initialEdits: Record<number, EditState> = {};
                plansList.forEach((plan: Plan) => {
                    initialEdits[plan.id] = {
                        total_amount: String(plan.total_amount ?? '0.00'),
                        platform_fee: String(plan.platform_fee ?? '0.00'),
                    };
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

    // Handle single plan update
    const handleUpdate = async (id: number) => {
        const edits = editedValues[id];
        if (!edits) return;

        setUpdatingId(id);
        try {
            const response = await updatePlanFeeSubscription(id, {
                total_amount: parseFloat(edits.total_amount) || 0,
                platform_fee: parseFloat(edits.platform_fee) || 0,
            });

            if (response.status) {
                toast.success(response.message || 'Plan updated successfully');
                loadPlans(); // Reload to refresh table
            } else {
                toast.error(response.message || 'Failed to update plan');
            }
        } catch (error) {
            console.error('Error updating plan:', error);
            toast.error('Failed to update plan');
        } finally {
            setUpdatingId(null);
        }
    };

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

    // Filter plans into partner and client
    const partnerPlans = plans.filter(plan => plan.entity_type ? plan.entity_type.includes('Partner') : false);
    const clientPlans = plans.filter(plan => plan.entity_type ? plan.entity_type.includes('Borrower') : false);

    const getEnrollmentBadge = (type: string) => {
        const lower = (type || '').toLowerCase();
        if (lower.includes('monthly')) return 'bg-info-subtle text-info border border-info-subtle';
        if (lower.includes('annual') || lower.includes('year')) return 'bg-purple-subtle text-purple border border-purple-subtle';
        if (lower.includes('installment')) return 'bg-warning-subtle text-warning border border-warning-subtle';
        return 'bg-secondary-subtle text-secondary border border-secondary-subtle';
    };

    const renderPlansTable = (plansList: Plan[], showPartnerType: boolean = true) => {
        if (plansList.length === 0) {
            return (
                <div className="text-center py-5">
                    <div className="avatar-md mx-auto mb-3">
                        <div className="avatar-title bg-light text-muted rounded-circle fs-24">
                            <i className="ri-inbox-archive-line"></i>
                        </div>
                    </div>
                    <h6 className="text-muted fw-normal">No active plans configured for this tier.</h6>
                </div>
            );
        }

        return (
            <div className="table-responsive">
                <table className="table table-hover align-middle table-nowrap mb-0">
                    <thead className="table-light text-muted fs-11 text-uppercase fw-semibold" style={{ letterSpacing: '0.5px' }}>
                        <tr>
                            {showPartnerType && <th scope="col" style={{ width: '24%' }} className="ps-3">Partner Type</th>}
                            <th scope="col" style={{ width: showPartnerType ? '24%' : '48%' }} className={!showPartnerType ? "ps-3" : ""}>Enrollment Type</th>
                            <th scope="col" style={{ width: '22%' }}>Total Amount</th>
                            <th scope="col" style={{ width: '22%' }}>Platform Fee</th>
                            <th scope="col" style={{ width: '12%' }} className="text-end pe-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="fs-13">
                        {plansList.map((plan) => {
                            const isInstallment = plan.total_installments_count && plan.total_installments_count > 0;
                            const edits = editedValues[plan.id] || { total_amount: '0', platform_fee: '0' };
                            const isUpdating = updatingId === plan.id;

                            return (
                                <tr key={plan.id} className="transition-all">
                                    {showPartnerType && (
                                        <td className="ps-3">
                                            <span className="badge bg-primary-subtle text-primary fs-12 px-2.5 py-1.5 rounded-2 fw-semibold">
                                                {formatSlug(plan.partner_type)}
                                            </span>
                                        </td>
                                    )}
                                    <td className={!showPartnerType ? "ps-3" : ""}>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={`badge ${getEnrollmentBadge(plan.enrollment_type)} fs-11 px-2.5 py-1 rounded-pill`}>
                                                {formatSlug(plan.enrollment_type)}
                                            </span>
                                            {isInstallment && (
                                                <span className="badge bg-light text-dark border fs-10 px-2 py-0.5 rounded-pill">
                                                    <i className="ri-calendar-event-line me-1 text-muted"></i>
                                                    {plan.total_installments_count} Installments
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="input-group input-group-sm shadow-none" style={{ maxWidth: '200px' }}>
                                            <span className="input-group-text bg-light text-muted fw-bold border-end-0 fs-12 px-2.5">
                                                {plan.currency_symbol || '$'}
                                            </span>
                                            <input 
                                                type="number" 
                                                className="form-control border-start-0 ps-1 fw-semibold text-dark fs-13" 
                                                value={edits.total_amount}
                                                onChange={(e) => handleInputChange(plan.id, 'total_amount', e.target.value)}
                                                min="0"
                                                step="0.01"
                                                disabled={isUpdating}
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <div className="input-group input-group-sm shadow-none" style={{ maxWidth: '200px' }}>
                                            <span className="input-group-text bg-light text-muted fw-bold border-end-0 fs-12 px-2.5">
                                                {plan.currency_symbol || '$'}
                                            </span>
                                            <input 
                                                type="number" 
                                                className="form-control border-start-0 ps-1 fw-semibold text-dark fs-13" 
                                                value={edits.platform_fee}
                                                onChange={(e) => handleInputChange(plan.id, 'platform_fee', e.target.value)}
                                                min="0"
                                                step="0.01"
                                                disabled={isUpdating}
                                            />
                                        </div>
                                    </td>
                                    <td className="text-end pe-3">
                                        <button 
                                            type="button" 
                                            className="btn btn-sm btn-success shadow-sm px-3 rounded-2 fw-medium d-inline-flex align-items-center gap-1" 
                                            onClick={() => handleUpdate(plan.id)}
                                            disabled={isUpdating}
                                        >
                                            {isUpdating ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                    <span>Saving...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <i className="ri-check-double-line fs-14"></i>
                                                    <span>Save Changes</span>
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                
                {/* Header Section */}
                <div className="row pb-3 mobile-sticky-header">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-2">
                            <div>
                                <div className="d-flex align-items-center gap-2">
                                    <div className="avatar-xs flex-shrink-0">
                                        <div className="avatar-title bg-primary text-white rounded-2 fs-16 shadow-sm">
                                            <i className="ri-price-tag-3-line"></i>
                                        </div>
                                    </div>
                                    <h4 className="fs-20 fw-bold text-dark mb-0">Plan & Fee Management</h4>
                                </div>
                                <nav aria-label="breadcrumb" className="mt-1">
                                    <ol className="breadcrumb m-0 fs-12 text-muted">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">Plan & Fee</li>
                                    </ol>
                                </nav>
                            </div>

                            {/* Summary Pills */}
                            <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-white text-dark border shadow-sm px-3 py-2 rounded-3 d-flex align-items-center gap-2 fs-12">
                                    <span className="w-2 h-2 rounded-circle bg-primary d-inline-block"></span>
                                    <span>Partner Plans: <strong>{partnerPlans.length}</strong></span>
                                </span>
                                <span className="badge bg-white text-dark border shadow-sm px-3 py-2 rounded-3 d-flex align-items-center gap-2 fs-12">
                                    <span className="w-2 h-2 rounded-circle bg-success d-inline-block"></span>
                                    <span>Client Plans: <strong>{clientPlans.length}</strong></span>
                                </span>
                                <button 
                                    onClick={loadPlans} 
                                    className="btn btn-sm btn-light border shadow-sm px-2.5 py-1.5 rounded-3 text-muted hover-dark"
                                    title="Reload Plans"
                                    disabled={loading}
                                >
                                    <i className={`ri-refresh-line fs-14 ${loading ? 'spin' : ''}`}></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-primary-subtle text-primary-emphasis">
                            <div className="card-body p-3.5 d-flex align-items-center gap-3">
                                <div className="avatar-sm flex-shrink-0">
                                    <div className="avatar-title bg-primary text-white rounded-circle fs-18 shadow-sm">
                                        <i className="ri-information-line"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1">
                                    <h6 className="fw-bold mb-0.5 text-primary">Subscription Rates & Fee Engine</h6>
                                    <p className="fs-12 text-muted mb-0">Configure default enrollment pricing and recurring platform fees for Partner and Client accounts. Updates take effect immediately for upcoming billing cycles.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {loading && plans.length === 0 ? (
                    <div className="row">
                        {[1, 2].map((n) => (
                            <div key={n} className="col-12 mb-4">
                                <div className="card border-0 shadow-sm rounded-3 p-4">
                                    <div className="placeholder-glow">
                                        <div className="placeholder col-3 mb-3 rounded" style={{ height: '24px' }}></div>
                                        <div className="placeholder col-12 mb-2 rounded" style={{ height: '44px' }}></div>
                                        <div className="placeholder col-12 mb-2 rounded" style={{ height: '44px' }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="row">
                        
                        {/* Partner Plans Card */}
                        <div className="col-12 mb-4">
                            <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
                                <div className="card-header bg-white border-bottom py-3 px-4">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="avatar-xs flex-shrink-0">
                                                <div className="avatar-title bg-primary-subtle text-primary rounded-2 fs-15">
                                                    <i className="ri-handshake-line"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h5 className="card-title mb-0 fw-bold fs-15 text-dark">Partner Subscription Tiers</h5>
                                                <span className="fs-11 text-muted">Pricing structures applicable to partner entities</span>
                                            </div>
                                        </div>
                                        <span className="badge bg-primary-subtle text-primary rounded-pill px-2.5 py-1 fs-11 fw-semibold">
                                            {partnerPlans.length} Configured
                                        </span>
                                    </div>
                                </div>
                                <div className="card-body p-0">
                                    {renderPlansTable(partnerPlans, true)}
                                </div>
                            </div>
                        </div>

                        {/* Client Plans Card */}
                        <div className="col-12 mb-4">
                            <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
                                <div className="card-header bg-white border-bottom py-3 px-4">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="avatar-xs flex-shrink-0">
                                                <div className="avatar-title bg-success-subtle text-success rounded-2 fs-15">
                                                    <i className="ri-user-follow-line"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h5 className="card-title mb-0 fw-bold fs-15 text-dark">Client Subscription Tiers</h5>
                                                <span className="fs-11 text-muted">Direct borrower and client subscription rates</span>
                                            </div>
                                        </div>
                                        <span className="badge bg-success-subtle text-success rounded-pill px-2.5 py-1 fs-11 fw-semibold">
                                            {clientPlans.length} Configured
                                        </span>
                                    </div>
                                </div>
                                <div className="card-body p-0">
                                    {renderPlansTable(clientPlans, false)}
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}
