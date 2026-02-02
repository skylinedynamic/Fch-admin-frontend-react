import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

import { FundingApplicationDetails as FundingApplicationDetailsType } from '../../../modules/application/types';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import { APPLICATION_STATUS_OPTIONS, FUNDING_APPLICATION_STATUS_OPTIONS } from '../../../config/borrower';
import { useUpdateFundingApplicationStatus, useFundingApplicationDetails, useSaveFundingApplicationCommission } from '../../../modules/application/queries';
// @ts-ignore
import ApplicationDetailsLoader from '../../../components/Loader/ApplicationDetailsLoader';
// @ts-ignore
import ConfirmationModal from '../../../components/Common/Modals/ConfirmationModal';
import { useAuthStore } from '../../../store/auth/authStore';

type StepType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const STEPS = [
    { id: 1, title: 'Business Information', icon: 'ri-building-line' },
    { id: 2, title: 'Ownership Information', icon: 'ri-user-line' },
    { id: 3, title: 'Financial Information', icon: 'ri-money-dollar-circle-line' },
    { id: 4, title: 'Funding Request', icon: 'ri-hand-coin-line' },
    { id: 5, title: 'Document Upload', icon: 'ri-file-upload-line' },
    { id: 6, title: 'Disclosures and consent', icon: 'ri-shield-check-line' },
    { id: 7, title: 'Federal Compliance Disclosures', icon: 'ri-government-line' },
    { id: 8, title: 'Attestation and authorization', icon: 'ri-checkbox-circle-line' }
];

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="col-md-6 mb-3">
        <label className="form-label fs-13 ">{label}</label>
        <div className="text-muted fs-13">{value || '-'}</div>
    </div>
);

export default function FundingApplicationDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState<StepType>(1);

    // Status update state
    const [status, setStatus] = useState<string>('');
    const [status_note, setStatusNote] = useState<string>('');
    const [notesError, setNotesError] = useState<string>('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const updateMutation = useUpdateFundingApplicationStatus();

    // Commission state
    const [adminCommissionRate, setAdminCommissionRate] = useState<string>('');
    const [partnerCommissionRate, setPartnerCommissionRate] = useState<string>('');
    const [commissionErrors, setCommissionErrors] = useState<{ admin_commission?: string; partner_commission?: string }>({});
    const saveCommissionMutation = useSaveFundingApplicationCommission();

    const { user } = useAuthStore();
    const isPartner = user?.is_host === false;
    const authPartnerId = (user as any)?.partner_id;

    const { data: apiResponse, isLoading, error } = useFundingApplicationDetails(id || '');

    const app = (apiResponse?.data || apiResponse || {}) as FundingApplicationDetailsType;
    const showPartnerCommission = app?.partner_id !== authPartnerId;

    // Sync status and commission with fetched data
    useEffect(() => {
        if (app?.status) setStatus(app.status);
        if (app?.status_note) setStatusNote(app.status_note);
        
        // Sync commission rates from response
        if (app && 'admin_commission' in app && app.admin_commission !== null && app.admin_commission !== undefined) {
            setAdminCommissionRate(app.admin_commission.toString());
        }
        if (app && 'partner_commission' in app && app.partner_commission !== null && app.partner_commission !== undefined) {
            setPartnerCommissionRate(app.partner_commission.toString());
        }
    }, [app]);

    useEffect(() => {
        if (error || (!isLoading && !apiResponse)) {
            toast.error('Failed to load application details');
            navigate('/intake-review/funding-review');
        }
    }, [error, apiResponse, isLoading, navigate]);

    const handleUpdateClick = () => {
        setNotesError('');
        setShowConfirmModal(true);
    };

    const handleConfirmUpdate = () => {
        if (!app.id) return;
        updateMutation.mutate({
            funding_application_id: app.id,
            status: status,
            status_note: status_note
        }, {
            onSuccess: () => {
                toast.success('Status updated successfully');
                setShowConfirmModal(false);
                setNotesError('');
            },
            onError: (error: any) => {
                setShowConfirmModal(false);
                if (error?.response?.data?.errors) {
                    const backendErrors = error.response.data.errors;
                    if (backendErrors.status_note) {
                        const message = Array.isArray(backendErrors.status_note)
                            ? backendErrors.status_note[0]
                            : backendErrors.status_note;
                        setNotesError(message);
                    }
                } else {
                    toast.error('Failed to update status. Please try again.');
                }
            }
        });
    };

    // Commission helper functions
    const parseCurrency = (value: string | number | null | undefined): number => {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        return parseFloat(value.replace(/[^0-9.-]+/g, ''));
    };

    const requestedAmount = parseCurrency(app.requested_amount);
    
    // Hierarchical Calculation Logic
    // totalRate is stored in adminCommissionRate state
    // partnerRate is stored in partnerCommissionRate state (representing % of the total commission)
    
    // 1. Total Commission Amount (Requested Amount * Total Rate)
    const totalCommissionAmount = requestedAmount * (parseFloat(adminCommissionRate || '0') / 100);
        
    // 2. Partner Commission Amount (Total Commission * Partner Rate %)
    const partnerCommissionAmount = (partnerCommissionRate === app.partner_commission?.toString()) && (app as any).partner_commission_amount
        ? parseCurrency((app as any).partner_commission_amount)
        : totalCommissionAmount * (parseFloat(partnerCommissionRate || '0') / 100);

    // 3. Admin Commission Amount (Total - Partner)
    // If partner commission is hidden (same partner), admin gets the total
    const adminCommissionAmount = showPartnerCommission 
        ? totalCommissionAmount - partnerCommissionAmount 
        : totalCommissionAmount;

    // 4. Admin Commission effective rate for display (Total Rate - (Total Rate * Partner Rate %))
    const effectiveAdminRate = showPartnerCommission
        ? parseFloat(adminCommissionRate || '0') - (parseFloat(adminCommissionRate || '0') * (parseFloat(partnerCommissionRate || '0') / 100))
        : parseFloat(adminCommissionRate || '0');

    // 5. Admin share percentage of the Total Commission
    const adminShareRate = showPartnerCommission
        ? 100 - parseFloat(partnerCommissionRate || '0')
        : 100;

    // Helper for negative-safe currency display
    const formatCurrencyValue = (amount: number) => {
        const isNegative = amount < 0;
        const absAmount = Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return isNegative ? `-$${absAmount}` : `$${absAmount}`;
    };

    const handleSaveCommission = () => {
        if (!app.id) return;
        
        setCommissionErrors({});
        
        // Send rate as null if no value is entered
        const adminRate = adminCommissionRate && adminCommissionRate !== '' 
            ? parseFloat(adminCommissionRate)
            : null;
        
        const partnerRate = partnerCommissionRate && partnerCommissionRate !== '' 
            ? parseFloat(partnerCommissionRate)
            : null;
        
        saveCommissionMutation.mutate({
            funding_application_id: app.id,
            admin_commission: adminRate,
            partner_commission: partnerRate
        }, {
            onSuccess: () => {
                toast.success('Commission saved successfully');
            },
            onError: (error: any) => {
                if (error?.response?.data?.errors) {
                    const backendErrors = error.response.data.errors;
                    setCommissionErrors({
                        admin_commission: Array.isArray(backendErrors.admin_commission) 
                            ? backendErrors.admin_commission[0] 
                            : backendErrors.admin_commission,
                        partner_commission: Array.isArray(backendErrors.partner_commission) 
                            ? backendErrors.partner_commission[0] 
                            : backendErrors.partner_commission
                    });
                } else {
                    toast.error('Failed to save commission. Please try again.');
                }
            }
        });
    };

    if (isLoading) {
        return <ApplicationDetailsLoader />;
    }

    if (error || !apiResponse) {
        return null;
    }


    const renderBusinessInformation = () => (
        <div className="row">
            <DetailRow label="Full Name" value={app.full_name} />
            <DetailRow label="Business Name" value={app.business_name} />
            <DetailRow label="Email" value={app.business_email} />
            <DetailRow label="Mobile Phone" value={app.business_phone_no} />
            <DetailRow label="Business Street Address" value={app.business_address} />
            <DetailRow label="City" value={app.business_city} />
            <DetailRow label="State of Incorporation" value={app.business_state} />
            <DetailRow label="Zip Code" value={app.business_postal_code} />
            <DetailRow label="Industry Type" value={app.industry_type} />
            <DetailRow label="Entity Type" value={app.entity_type} />
            <DetailRow label="Time in Business" value={app.years_in_business} />
            <DetailRow label="Number of Employees" value={app.number_of_employees} />
        </div>
    );

    const renderOwnershipInformation = () => (
        <div className="row">
            <DetailRow label="First Name" value={app.first_name} />
            <DetailRow label="Last Name" value={app.last_name} />
            <DetailRow label="Date of Birth" value={app.date_of_birth} />
            <DetailRow label="Social Security Number (SSN)" value={app.ssn ? app.ssn : '-'} />
            <DetailRow label="Citizenship Status" value={app.citizenship_status} />
            <DetailRow label="Street Address" value={app.street_address} />
            <DetailRow label="State" value={app.state} />
            <DetailRow label="City" value={app.city} />
            <DetailRow label="Zip Code" value={app.zip_code} />
            <DetailRow label="Ownership %" value={app.ownership} />
            <div className="col-12 mb-3">
                <label className="form-label fs-13">Has Co-Borrower?</label>
                <div className="text-muted fs-13">{app.has_co_borrower ? 'Yes' : 'No'}</div>
            </div>

            {app.has_co_borrower && app.co_borrowers && app.co_borrowers.length > 0 && (
                <div className="col-12 mt-3">
                    <h5 className="fs-15 fw-bold mb-3 border-bottom pb-2">Co-Borrower Information</h5>
                    {app.co_borrowers.map((borrower, index) => (
                        <div key={borrower.id} className="card border shadow-none mb-3">
                            <div className="card-header bg-light p-2 ps-3">
                                <h6 className="mb-0 fs-13 fw-bold">Co-Borrower {index + 1}: {borrower.first_name} {borrower.last_name}</h6>
                            </div>
                            <div className="card-body p-3">
                                <div className="row">
                                    <DetailRow label="First Name" value={borrower.first_name} />
                                    <DetailRow label="Last Name" value={borrower.last_name} />
                                    <DetailRow label="Role" value={borrower.role} />
                                    <DetailRow label="Ownership %" value={borrower.ownership} />
                                    <DetailRow label="Email" value={borrower.email} />
                                    <DetailRow label="Mobile Phone" value={borrower.mobile_phone} />
                                    <DetailRow label="Home Phone" value={borrower.home_phone} />
                                    <DetailRow label="Date of Birth" value={borrower.date_of_birth ? new Date(borrower.date_of_birth).toLocaleDateString() : '-'} />
                                    <DetailRow label="Home Phone" value={borrower.home_phone} />
                                    <DetailRow label="Date of Birth" value={borrower.date_of_birth ? new Date(borrower.date_of_birth).toLocaleDateString() : '-'} />
                                    <DetailRow label="SSN" value={borrower.ssn || '-'} />

                                    <div className="col-12"><hr className="my-2" /></div>
                                    <h6 className="mb-3 fs-13 text-muted text-uppercase fw-semibold">Address</h6>
                                    <DetailRow label="Street Address" value={borrower.street_address} />
                                    <DetailRow label="City" value={borrower.city} />
                                    <DetailRow label="State" value={borrower.state} />
                                    <DetailRow label="Zip Code" value={borrower.zip_code} />

                                    <div className="col-12"><hr className="my-2" /></div>
                                    <h6 className="mb-3 fs-13 text-muted text-uppercase fw-semibold">Driver's License</h6>
                                    <DetailRow label="License Number" value={borrower.drivers_license_number} />
                                    <DetailRow label="Issuing State" value={borrower.drivers_license_state} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderFinancialInformation = () => (
        <div className="row">
            <DetailRow label="Monthly Revenue" value={app.monthly_revenue ? `$${parseFloat(app.monthly_revenue).toLocaleString()}` : '-'} />
            <DetailRow label="Annual Revenue" value={app.annual_revenue ? `$${parseFloat(app.annual_revenue).toLocaleString()}` : '-'} />
            <DetailRow label="Business Bank Name" value={app.business_bank_name} />
            <DetailRow label="Business Checking Start Date" value={app.business_checking_start_date} />
            <DetailRow label="Self-Reported Personal Credit Score" value={app.self_reported_personal_credit_score} />
            <DetailRow label="Self-Reported Business Credit Score" value={app.self_reported_business_credit_score} />
            <div className="col-12 mb-3">
                <label className="form-label fs-13">Existing Business Debt?</label>
                <div className="text-muted fs-13">{app.has_business_debt ? 'Yes' : 'No'}</div>
            </div>
            {app.has_business_debt && (
                <DetailRow label="Debt Balance" value={app.debt_balance ? `$${parseFloat(app.debt_balance).toLocaleString()}` : '-'} />
            )}
        </div>
    );

    const renderFundingRequest = () => (
        <div className="row">
            <DetailRow label="Requested Amount" value={app.requested_amount ? `$${parseFloat(app.requested_amount).toLocaleString()}` : '-'} />
            <DetailRow label="Purpose of Funds" value={app.purpose_of_funds} />
            <DetailRow label="Preferred Funding Type" value={app.preferred_funding_type} />
            <DetailRow label="Timeframe Needed" value={app.timeframe_needed} />
            <div className="col-12 mb-3">
                <label className="form-label fs-13">Collateral Available?</label>
                <div className="text-muted fs-13">{app.collateral_available}</div>
            </div>
        </div>
    );

    const getFileIcon = (extension: string) => {
        switch (extension.toLowerCase()) {
            case 'pdf': return 'ri-file-pdf-line text-danger';
            case 'doc':
            case 'docx': return 'ri-file-word-line text-primary';
            case 'xls':
            case 'xlsx': return 'ri-file-excel-line text-success';
            case 'jpg':
            case 'jpeg':
            case 'png': return 'ri-image-line text-warning';
            default: return 'ri-file-line text-secondary';
        }
    };

    const renderDocumentUpload = () => (
        <div className="row">
            {app.documents && app.documents.length > 0 ? (
                app.documents.map((docType, index) => (
                    <div key={index} className="col-12 mb-4">
                        <h6 className="fs-15 fw-bold mb-3 border-bottom pb-2">{docType.type}</h6>
                        <div className="card border shadow-none">
                            <ul className="list-group list-group-flush">
                                {docType.files.map((file) => (
                                    <li key={file.id} className="list-group-item">
                                        <div className="d-flex align-items-center">
                                            <div className="flex-shrink-0 avatar-xs">
                                                <div className="avatar-title bg-light text-primary rounded fs-20">
                                                    <i className={`${getFileIcon(file.extension)} fs-18`}></i>
                                                </div>
                                            </div>
                                            <div className="flex-grow-1 ms-3">
                                                <h6 className="fs-13 mb-0">
                                                    <a href={file.url} target="_blank" rel="noreferrer" className="text-reset">{file.original_name}</a>
                                                </h6>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <a href={file.url} download={file.original_name} target="_blank" rel="noreferrer" className="btn btn-icon btn-sm btn-ghost-primary text-primary" title="Download">
                                                    <i className="ri-download-2-line fs-18"></i>
                                                </a>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))
            ) : (
                <div className="col-12">
                    <div className="alert alert-info">
                        <i className="ri-information-line me-2"></i>
                        No documents uploaded available for viewing.
                    </div>
                </div>
            )}
        </div>
    );

    const renderDisclosuresAndConsent = () => (
        <div className="row">
            <div className="col-md-6 mb-3">
                <label className="form-label fs-13">Credit Pull Authorization</label>
                <div>{app.credit_pull_authorization ? <span className="badge bg-success">Authorized</span> : <span className="badge bg-secondary">Not Authorized</span>}</div>
            </div>
            <div className="col-md-6 mb-3">
                <label className="form-label fs-13">Terms & Conditions Acceptance</label>
                <div>{app.terms_conditions_acceptance ? <span className="badge bg-success">Accepted</span> : <span className="badge bg-secondary">Not Accepted</span>}</div>
            </div>
        </div>
    );

    const renderFederalCompliance = () => (
        <div className="row">
            <DetailRow label="Filed for Bankruptcy" value={app.filed_for_bankruptcy ? 'Yes' : 'No'} />
            <DetailRow label="Any Pending Lawsuits" value={app.any_pending_lawsuits ? 'Yes' : 'No'} />
            <DetailRow label="Has Federal Loan" value={app.has_federal_loan ? 'Yes' : 'No'} />
            <DetailRow label="Has Federal Debt" value={app.has_federal_debt ? 'Yes' : 'No'} />
            <DetailRow label="Has Criminal Offense" value={app.has_criminal_offense ? 'Yes' : 'No'} />
            <DetailRow label="Has Parole or Probation" value={app.has_parole_or_probation ? 'Yes' : 'No'} />
            <DetailRow label="Suspended or Debarred" value={app.suspended_or_debarred ? 'Yes' : 'No'} />
            <DetailRow label="Outstanding Judgments (Business)" value={app.any_outstanding_judgments_business ? 'Yes' : 'No'} />
            <DetailRow label="Outstanding Judgments (Owner)" value={app.any_outstanding_judgments_owner ? 'Yes' : 'No'} />
            {app.federal_compliance_disclosures_explanation && (
                <div className="col-12 mb-3">
                    <label className="form-label fs-13">Explanation</label>
                    <div className="text-muted fs-13">{app.federal_compliance_disclosures_explanation}</div>
                </div>
            )}
        </div>
    );

    const renderAttestationAndAuthorization = () => (
        <div className="row">
            <div className="col-md-6 mb-3">
                <label className="form-label fs-13">Attestation Authorization</label>
                <div>{app.attestation_authorization ? <span className="badge bg-success">Authorized</span> : <span className="badge bg-secondary">Not Authorized</span>}</div>
            </div>

        </div>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: return renderBusinessInformation();
            case 2: return renderOwnershipInformation();
            case 3: return renderFinancialInformation();
            case 4: return renderFundingRequest();
            case 5: return renderDocumentUpload();
            case 6: return renderDisclosuresAndConsent();
            case 7: return renderFederalCompliance();
            case 8: return renderAttestationAndAuthorization();
            default: return null;
        }
    };

    const currentStepData = STEPS.find(s => s.id === currentStep);
    const progress = Math.round((currentStep / STEPS.length) * 100);

    return (
        <>
            <div className="page-content">
                <div className="container-fluid">
                    {/* Header */}
                    <div className="row mb-3 pb-1">
                        <div className="col-12">
                            <div className="d-flex align-items-center justify-content-between flex-row">
                                <div className="flex-grow-1">
                                    <h4 className="fs-20 mb-1">Funding Application Details</h4>
                                    <nav aria-label="breadcrumb">
                                        <ol className="breadcrumb m-0">
                                            <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                            <li className="breadcrumb-item"><Link to="/intake-review/funding-review">Funding Applications</Link></li>
                                            <li className="breadcrumb-item active" aria-current="page">Details</li>
                                        </ol>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Commission Section */}
                    <div className="row">
                        <div className="col-12">
                            {isPartner ? (
                                /* Partner View - Read Only */
                                <div className="card shadow-sm border-0 mb-4 overflow-hidden">
                                    <div className="card-header bg-white border-bottom py-3">
                                        <div className="d-flex align-items-center">
                                            <div className="avatar-xs me-3">
                                                <div className="avatar-title bg-success bg-opacity-10 text-success rounded-circle">
                                                    <i className="ri-shake-hands-line fs-18"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h5 className="card-title mb-0 fs-16">Partner Commission Details</h5>
                                                <p className="text-muted mb-0 fs-12">Below are the details of your calculated commission for this application.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="row align-items-center">
                                            <div className="col-md-4">
                                                <div className="p-3 bg-light rounded text-center">
                                                    <p className="text-muted text-uppercase mb-2 fs-11 fw-semibold">Total Requested Amount</p>
                                                    <h3 className="mb-0 fw-bold">${requestedAmount.toLocaleString()}</h3>
                                                </div>
                                            </div>
                                            <div className="col-md-1 d-none d-md-block text-center text-muted">
                                                <i className="ri-arrow-right-line fs-24"></i>
                                            </div>
                                            <div className="col-md-7">
                                                <div className="card border-0 bg-success bg-opacity-10 mb-0">
                                                    <div className="card-body p-4">
                                                        <div className="d-flex align-items-start justify-content-between mb-3">
                                                            <div>
                                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Your Commission Amount</p>
                                                                <h2 className="mb-0 fw-bold text-success">
                                                                    {formatCurrencyValue(partnerCommissionAmount)}
                                                                </h2>
                                                            </div>
                                                            <div className="badge bg-success bg-opacity-20 text-success fs-13 py-2 px-3">
                                                                {partnerCommissionRate || '0'}% Commission Rate
                                                            </div>
                                                        </div>
                                                        <div className="d-flex align-items-center text-muted fs-13">
                                                            <i className="ri-information-line me-2"></i>
                                                            <span>Your commission is calculated based on the approved admin commission amount.</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Admin View - Calculator */
                                <div className="card shadow-sm border-0 mb-4 overflow-hidden">
                                    <div className="card-header bg-white border-bottom">
                                        <h5 className="card-title mb-0 fs-16">Commission Details</h5>
                                    </div>
                                    <div className="card-body p-0">
                                        <div className="row g-0">
                                            {/* Left Side: Inputs */}
                                            <div className="col-md-5 border-end border-light">
                                                <div className="p-4 h-100 bg-light bg-opacity-50">
                                                    <form onSubmit={(e) => {
                                                        e.preventDefault();
                                                        handleSaveCommission();
                                                    }}>
                                                        <div className="mb-4">
                                                            <label className="form-label fs-13 text-muted fw-medium text-primary">Commission Rate</label>
                                                            <div className="input-group">
                                                                <input 
                                                                    type="number" 
                                                                    className={`form-control ${commissionErrors.admin_commission ? 'is-invalid border-danger' : ''}`}
                                                                    placeholder="0"
                                                                    value={adminCommissionRate}
                                                                    onChange={(e) => {
                                                                        setAdminCommissionRate(e.target.value);
                                                                        if (commissionErrors.admin_commission) {
                                                                            setCommissionErrors({ ...commissionErrors, admin_commission: undefined });
                                                                        }
                                                                    }}
                                                                    min="0"
                                                                    max="100"
                                                                    step="0.1"
                                                                />
                                                                <span className="input-group-text bg-white text-muted">%</span>
                                                            </div>
                                                            {commissionErrors.admin_commission && (
                                                                <div className="text-danger fs-12 mt-1">{commissionErrors.admin_commission}</div>
                                                            )}
                                                            <div className="form-text fs-12 text-muted mt-1">
                                                                Calculated from Requested Amount (${requestedAmount.toLocaleString()})
                                                            </div>
                                                        </div>

                                                        {showPartnerCommission && (
                                                            <div className="mb-0">
                                                                <label className="form-label fs-13 text-muted fw-medium text-success">Partner Commission Rate</label>
                                                                <div className="input-group">
                                                                    <input 
                                                                        type="number" 
                                                                        className={`form-control ${commissionErrors.partner_commission ? 'is-invalid border-danger' : ''}`}
                                                                        placeholder="0" 
                                                                        value={partnerCommissionRate}
                                                                        onChange={(e) => {
                                                                            setPartnerCommissionRate(e.target.value);
                                                                            if (commissionErrors.partner_commission) {
                                                                                setCommissionErrors({ ...commissionErrors, partner_commission: undefined });
                                                                            }
                                                                        }}
                                                                        min="0"
                                                                        max="100"
                                                                        step="0.1"
                                                                    />
                                                                    <span className="input-group-text bg-white text-muted">%</span>
                                                                </div>
                                                                {commissionErrors.partner_commission && (
                                                                    <div className="text-danger fs-12 mt-1">{commissionErrors.partner_commission}</div>
                                                                )}
                                                                <div className="form-text fs-12 text-muted mt-1">
                                                                    Calculated from Total Commission Amount used as base
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Hidden submit button to enable Enter key submission */}
                                                        <button type="submit" style={{ display: 'none' }} aria-hidden="true"></button>
                                                    </form>
                                                </div>
                                            </div>

                                            {/* Right Side: Results */}
                                            <div className="col-md-7">
                                                <div className="p-3 h-100 d-flex flex-column">
                                                    <div className="flex-grow-1">
                                                        {/* Requested Amount - Top */}
                                                        <div className="alert alert-primary border mb-3 py-2">
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <i className="bx bx-credit-card text-primary me-2"></i>
                                                                    <span className="fw-medium">Total Requested Amount:</span>
                                                                </div>
                                                                <h5 className="mb-0 fw-bold">${requestedAmount.toLocaleString()}</h5>
                                                            </div>
                                                        </div>

                                                        <div className="row g-2">
                                                            {showPartnerCommission && (
                                                                <div className="col-md-12">
                                                                    <div className="alert alert-secondary border-dashed mb-3 py-2 bg-light">
                                                                        <div className="d-flex justify-content-between align-items-center">
                                                                            <div>
                                                                                <i className="ri-pie-chart-line text-secondary me-2"></i>
                                                                                <span className="fw-medium">Total Commission Amount:</span>
                                                                            </div>
                                                                            <h5 className="mb-0 fw-bold">{formatCurrencyValue(totalCommissionAmount)}</h5>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className={`${showPartnerCommission ? 'col-md-6' : 'col-md-12'}`}>
                                                                <div className="card border-0 bg-primary bg-opacity-10 mb-0">
                                                                    <div className="card-body pt-3 px-4">
                                                                        <div className="d-flex align-items-center mb-2">
                                                                            <div className="flex-shrink-0">
                                                                                <div className="avatar-xs">
                                                                                    <span className="avatar-title bg-primary text-white rounded fs-14">
                                                                                        <i className="ri-admin-line"></i>
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex-grow-1 ms-2">
                                                                                <p className="text-muted mb-0 fs-11 text-uppercase">Admin Commission</p>
                                                                            </div>
                                                                        </div>
                                                                        <h4 className="mb-0 fw-bold text-primary fs-18">
                                                                            {formatCurrencyValue(adminCommissionAmount)}
                                                                        </h4>
                                                                        <p className="text-muted mb-0 mt-2 fs-12">
                                                                            <span className="badge bg-primary fs-10">{adminShareRate}%</span>
                                                                            <span className="ms-1">of Total Commission Amount</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {showPartnerCommission && (
                                                                <div className="col-md-6">
                                                                    <div className="card border-0 bg-success bg-opacity-10 mb-0">
                                                                        <div className="card-body pt-3 px-4">
                                                                            <div className="d-flex align-items-center mb-2">
                                                                                <div className="flex-shrink-0">
                                                                                    <div className="avatar-xs">
                                                                                        <span className="avatar-title bg-success text-white rounded fs-14">
                                                                                            <i className="ri-shake-hands-line"></i>
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-grow-1 ms-2">
                                                                                    <p className="text-muted mb-0 fs-11 text-uppercase">Partner Commission</p>
                                                                                </div>
                                                                            </div>
                                                                            <h4 className="mb-0 fw-bold text-success fs-18">
                                                                                {formatCurrencyValue(partnerCommissionAmount)}
                                                                            </h4>
                                                                            <p className="text-muted mb-0 mt-2 fs-12">
                                                                                <span className="badge bg-success fs-10">{partnerCommissionRate || '0'}%</span>
                                                                                <span className="ms-1">of Total Commission Amount</span>
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 text-end">
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary"
                                                            onClick={handleSaveCommission}
                                                            disabled={saveCommissionMutation.isPending}
                                                        >
                                                            {saveCommissionMutation.isPending ? (
                                                                <>
                                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                                    Saving Commission...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="ri-save-line me-2"></i>
                                                                    Save Commission
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>


                    <div className="row">
                        {/* Sidebar */}
                        <div className="col-lg-3">
                            {/* Steps List */}
                            <div className="card">
                                <div className="card-header bg-white py-3">
                                    <h6 className="card-title mb-0 fs-16">Application Progress Steps</h6>
                                </div>
                                <div className="list-group list-group-flush">
                                    {STEPS.map((step) => (
                                        <button
                                            key={step.id}
                                            type="button"
                                            className={`list-group-item list-group-item-action d-flex align-items-center ${currentStep === step.id ? 'active' : ''}`}
                                            onClick={() => setCurrentStep(step.id as StepType)}
                                        >
                                            <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${currentStep === step.id ? 'bg-white text-primary' : 'bg-light text-muted'}`} style={{ width: '32px', height: '32px', fontSize: '13px', fontWeight: '600' }}>
                                                {step.id}
                                            </div>
                                            <div className="flex-grow-1">
                                                <div className={`fw-medium ${currentStep === step.id ? 'text-white' : 'text-dark'}`} style={{ fontSize: '13px' }}>
                                                    {step.title}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Status Update Card */}
                            <div className="card">
                                <div className="card-body">
                                    <h5 className="fs-15 fw-bold mb-3">Application Status</h5>

                                    <div className="mb-3">
                                        <label htmlFor="status-select" className="form-label text-muted">Status</label>
                                        <Dropdown
                                            value={status}
                                            options={FUNDING_APPLICATION_STATUS_OPTIONS}
                                            onChange={(e) => setStatus(e.value)}
                                            optionLabel="label"
                                            optionValue="value"
                                            placeholder="Select status..."
                                            className="w-100"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="status-notes" className="form-label text-muted">Status Notes <span className="text-danger">*</span></label>
                                        <textarea
                                            className={`form-control ${notesError ? 'is-invalid' : ''}`}
                                            id="status-notes"
                                            rows={3}
                                            placeholder="Add notes..."
                                            value={status_note}
                                            onChange={(e) => {
                                                setStatusNote(e.target.value);
                                                if (notesError) setNotesError('');
                                            }}
                                        ></textarea>
                                        {notesError && <div className="invalid-feedback">{notesError}</div>}
                                    </div>
                                    <div className="d-grid">
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleUpdateClick}
                                            disabled={updateMutation.isPending}
                                        >
                                            {updateMutation.isPending ? 'Updating...' : 'Update Status'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="col-lg-9">
                            <div className="card">
                                <div className="card-header">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <h5 className="card-title mb-0">
                                            <i className={`${currentStepData?.icon} me-2`}></i>
                                            Step {currentStep} of {STEPS.length}: {currentStepData?.title}
                                        </h5>
                                    </div>
                                </div>
                                <div className="card-body p-4">
                                    {renderStepContent()}

                                    <div className="d-flex justify-content-between mt-4 pt-3 border-top">
                                        <button
                                            type="button"
                                            className="btn btn-light"
                                            onClick={() => setCurrentStep(Math.max(1, currentStep - 1) as StepType)}
                                            disabled={currentStep === 1}
                                        >
                                            <i className="ri-arrow-left-line me-1"></i> Previous
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => setCurrentStep(Math.min(8, currentStep + 1) as StepType)}
                                            disabled={currentStep === 8}
                                        >
                                            Next <i className="ri-arrow-right-line ms-1"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                show={showConfirmModal}
                onHide={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmUpdate}
                loading={updateMutation.isPending}
                title="Update Status"
                message="Are you sure you want to update the application status?"
                confirmText="Update"
                variant="primary"
            />
        </>
    );
}
