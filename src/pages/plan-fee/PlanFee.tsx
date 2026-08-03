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

    const renderPlansTable = (plansList: Plan[]) => {
        if (plansList.length === 0) {
            return (
                <div className="text-center py-4 text-muted fs-13">
                    No active plans configured.
                </div>
            );
        }

        return (
            <div className="table-responsive">
                <table className="table table-bordered table-centered align-middle table-nowrap mb-0">
                    <thead className="table-light text-muted">
                        <tr>
                            <th scope="col" style={{ width: '25%' }}>Partner / Client Type</th>
                            <th scope="col" style={{ width: '25%' }}>Enrollment Type</th>
                            <th scope="col" style={{ width: '20%' }}>Total Amount</th>
                            <th scope="col" style={{ width: '20%' }}>Platform Fee</th>
                            <th scope="col" style={{ width: '10%' }} className="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {plansList.map((plan) => {
                            const isInstallment = plan.total_installments_count && plan.total_installments_count > 0;
                            const edits = editedValues[plan.id] || { total_amount: '0', platform_fee: '0' };
                            const isUpdating = updatingId === plan.id;

                            return (
                                <tr key={plan.id}>
                                    <td className="fw-semibold text-primary">
                                        {formatSlug(plan.partner_type)}
                                    </td>
                                    <td>
                                        {formatSlug(plan.enrollment_type)}
                                        {isInstallment && (
                                            <span className="text-muted small d-block">
                                                ({plan.total_installments_count} Installments)
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text">{plan.currency_symbol}</span>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={edits.total_amount}
                                                onChange={(e) => handleInputChange(plan.id, 'total_amount', e.target.value)}
                                                min="0"
                                                step="0.01"
                                                disabled={isUpdating}
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text">{plan.currency_symbol}</span>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={edits.platform_fee}
                                                onChange={(e) => handleInputChange(plan.id, 'platform_fee', e.target.value)}
                                                min="0"
                                                step="0.01"
                                                disabled={isUpdating}
                                            />
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <button 
                                            type="button" 
                                            className="btn btn-sm btn-success px-3" 
                                            onClick={() => handleUpdate(plan.id)}
                                            disabled={isUpdating}
                                        >
                                            {isUpdating ? (
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                            ) : (
                                                <i className="ri-save-line align-middle me-1"></i>
                                            )}
                                            Update
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
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-22 fw-bold text-dark mb-1">Plan & Fee</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0 fs-12 text-muted">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">Plan & Fee</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subtitle Description */}
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="alert alert-info border-0 rounded-lg p-3 shadow-sm d-flex align-items-center gap-3">
                            <div className="avatar-sm flex-shrink-0">
                                <div className="avatar-title bg-info-subtle text-info rounded-circle fs-20">
                                    <i className="ri-information-line"></i>
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <h5 className="fs-15 fw-semibold text-info mb-1">Subscription Plans Settings</h5>
                                <p className="text-muted fs-13 mb-0">Modify amount configuration for Partner and Client subscription plans. These rates drive all automated invoice calculations and charges in the system.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {loading && plans.length === 0 ? (
                    <div className="row">
                        {[1, 2].map((n) => (
                            <div key={n} className="col-12 mb-4">
                                <div className="card shadow-sm border-0 p-4">
                                    <div className="placeholder-glow">
                                        <div className="placeholder col-4 mb-3 rounded" style={{ height: '24px' }}></div>
                                        <div className="placeholder col-12 mb-2 rounded" style={{ height: '40px' }}></div>
                                        <div className="placeholder col-12 mb-2 rounded" style={{ height: '40px' }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="row">
                        
                        {/* Partner Plans Card */}
                        <div className="col-12 mb-4">
                            <div className="card shadow border-0 rounded-lg">
                                <div className="card-header bg-light border-0 py-3">
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-xs me-2.5">
                                            <div className="avatar-title bg-primary-subtle text-primary rounded fs-16">
                                                <i className="ri-handshake-line"></i>
                                            </div>
                                        </div>
                                        <h5 className="card-title mb-0 fw-bold fs-16 text-dark">Partner Plans</h5>
                                    </div>
                                </div>
                                <div className="card-body p-4">
                                    {renderPlansTable(partnerPlans)}
                                </div>
                            </div>
                        </div>

                        {/* Client Plans Card */}
                        <div className="col-12 mb-4">
                            <div className="card shadow border-0 rounded-lg">
                                <div className="card-header bg-light border-0 py-3">
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-xs me-2.5">
                                            <div className="avatar-title bg-success-subtle text-success rounded fs-16">
                                                <i className="ri-user-follow-line"></i>
                                            </div>
                                        </div>
                                        <h5 className="card-title mb-0 fw-bold fs-16 text-dark">Client Plans</h5>
                                    </div>
                                </div>
                                <div className="card-body p-4">
                                    {renderPlansTable(clientPlans)}
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}
