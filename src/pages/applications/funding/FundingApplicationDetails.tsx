import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

import { FundingApplicationDetails as FundingApplicationDetailsType } from '../../../modules/application/types';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import { FUNDING_APPLICATION_STATUS_OPTIONS, FUNDING_APPLICATION_STATUS_CLASS_MAP, FUNDING_APPLICATION_STATUS } from '../../../config/borrower';
import { useUpdateFundingApplicationStatus, useFundingApplicationDetails, useSaveFundingApplicationCommission } from '../../../modules/application/queries';
// @ts-ignore
import ApplicationDetailsLoader from '../../../components/Loader/ApplicationDetailsLoader';
// @ts-ignore
import ConfirmationModal from '../../../components/Common/Modals/ConfirmationModal';
import FundedAmountModal from '../../../components/Common/Modals/FundedAmountModal';
import { useAuthStore } from '../../../store/auth/authStore';
import { usePermissions } from '../../../lib/auth/usePermissions';

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
    const [showFundedModal, setShowFundedModal] = useState(false);
    const [fundedAmount, setFundedAmount] = useState<string>('');
    const updateMutation = useUpdateFundingApplicationStatus();

    // Commission state
    const [successFee, setSuccessFee] = useState<string>('');
    const [requestedAmountInput, setRequestedAmountInput] = useState<string>('');
    const [isEditingRequestedAmount, setIsEditingRequestedAmount] = useState<boolean>(false);
    const [tempRequestedAmount, setTempRequestedAmount] = useState<string>('');
    const [adminCommissionRate, setAdminCommissionRate] = useState<string>('');
    const [partnerCommissionRate, setPartnerCommissionRate] = useState<string>('');
    const [commissionErrors, setCommissionErrors] = useState<{ admin_commission?: string; partner_commission?: string }>({});
    const saveCommissionMutation = useSaveFundingApplicationCommission();

    const { user } = useAuthStore();
    const { hasPermission } = usePermissions();
    const isPartner = user?.is_host == false;
    const authPartnerId = (user as any)?.partner_id;

    const { data: apiResponse, isLoading, error } = useFundingApplicationDetails(id || '');

    const app = (apiResponse?.data || apiResponse || {}) as FundingApplicationDetailsType;
    const showPartnerCommission = app?.partner_id !== authPartnerId;

    // Sync status and commission with fetched data
    useEffect(() => {
        if (app?.status) setStatus(app.status);
        if (app?.status_note) setStatusNote(app.status_note);
        if (app?.requested_amount) setRequestedAmountInput(app.requested_amount.toString());

        // Sync commission rates from response
        if (app) {
            let fetchedSuccessFee = '';
            let fetchedPartnerShare = '';
            let fetchedAdminShare = '';

            // Determine Success Fee / Total Rate
            if ('total_commission' in app && app.total_commission !== null && app.total_commission !== undefined) {
                fetchedSuccessFee = app.total_commission.toString();
            }

            // Determine Partner Share
            if ('partner_commission' in app && app.partner_commission !== null && app.partner_commission !== undefined) {
                fetchedPartnerShare = app.partner_commission.toString();
            }

            // Determine Admin Share
            if ('admin_commission' in app && app.admin_commission !== null && app.admin_commission !== undefined) {
                fetchedAdminShare = app.admin_commission.toString();
            } else if (fetchedSuccessFee !== '') {
                const pShare = parseFloat(fetchedPartnerShare || '0');
                fetchedAdminShare = (100 - pShare).toString();
            }

            setSuccessFee(fetchedSuccessFee);
            setPartnerCommissionRate(fetchedPartnerShare);
            setAdminCommissionRate(fetchedAdminShare);
        }
    }, [app]);

    useEffect(() => {
        if (error || (!isLoading && !apiResponse)) {
            toast.error('Failed to load application details');
            navigate('/intake-review/funding-review');
        }
    }, [error, apiResponse, isLoading, navigate]);

    const handleUpdateClick = () => {
        if (status === FUNDING_APPLICATION_STATUS.CLOSED) {
            setFundedAmount(app.total_funded_amount?.toString() || app.requested_amount?.toString() || '');
            setShowFundedModal(true);
        } else {
            setShowConfirmModal(true);
        }
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

    const handleFundedConfirm = (amount: string) => {
        if (!app.id) return;
        updateMutation.mutate({
            funding_application_id: app.id,
            status: status,
            status_note: status_note,
            funded_amount: amount
        }, {
            onSuccess: () => {
                toast.success('Status updated successfully');
                setShowFundedModal(false);
                setNotesError('');
            },
            onError: (error: any) => {
                if (error?.response?.data?.errors) {
                    const backendErrors = error.response.data.errors;
                    if (backendErrors.status_note) {
                        const message = Array.isArray(backendErrors.status_note)
                            ? backendErrors.status_note[0]
                            : backendErrors.status_note;
                        setNotesError(message);
                    }
                    if (backendErrors.funded_amount) {
                        toast.error(Array.isArray(backendErrors.funded_amount) ? backendErrors.funded_amount[0] : backendErrors.funded_amount);
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

    const requestedAmount = parseFloat(requestedAmountInput || '0');

    // Hierarchical Calculation Logic

    const baseCommissionAmount = (app.total_funded_amount && parseFloat(app.total_funded_amount.toString()) > 0)
        ? parseFloat(app.total_funded_amount.toString())
        : requestedAmount;

    // 1. Total Commission Amount
    const totalCommissionAmount = (successFee === (app.total_commission?.toString() || '') && requestedAmountInput === (app.requested_amount?.toString() || '') && app.total_commission_amount && (!app.total_funded_amount || parseFloat(app.total_funded_amount.toString()) === 0))
        ? parseCurrency(app.total_commission_amount)
        : baseCommissionAmount * (parseFloat(successFee || '0') / 100);

    // Shares (Input as 0-100)
    // If no partner is shown, Admin takes 100% of the Success Fee
    const adminShareVal = showPartnerCommission ? parseFloat(adminCommissionRate || '0') : 100;
    const partnerShareVal = showPartnerCommission ? parseFloat(partnerCommissionRate || '0') : 0;

    // 2. Admin Commission Amount
    const adminCommissionAmount = (adminCommissionRate === (app.admin_commission?.toString() || '') && requestedAmountInput === (app.requested_amount?.toString() || '') && app.admin_commission_amount)
        ? parseCurrency(app.admin_commission_amount)
        : totalCommissionAmount * (adminShareVal / 100);

    // 3. Partner Commission Amount
    const partnerCommissionAmount = (partnerCommissionRate === (app.partner_commission?.toString() || '') && requestedAmountInput === (app.requested_amount?.toString() || '') && app.partner_commission_amount)
        ? parseCurrency(app.partner_commission_amount)
        : totalCommissionAmount * (partnerShareVal / 100);

    // 4. Shares for Display
    const adminShareRate = adminShareVal;
    const partnerShareRate = partnerShareVal;

    // Helper for negative-safe currency display
    const formatCurrencyValue = (amount: number) => {
        const isNegative = amount < 0;
        const absAmount = Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return isNegative ? `-$${absAmount}` : `$${absAmount}`;
    };

    const formatSSN = (ssn: string | null | undefined) => {
        if (!ssn) return '-';
        const cleaned = ssn.toString().replace(/\D/g, '');
        if (cleaned.length === 9) {
            return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 9)}`;
        }
        return ssn;
    };

    const handleSaveCommission = () => {
        if (!app.id) return;

        setCommissionErrors({});

        const totalRate = successFee && successFee !== '' ? parseFloat(successFee) : 0;
        const aShare = adminCommissionRate && adminCommissionRate !== '' ? parseFloat(adminCommissionRate) : 0;
        const pShare = partnerCommissionRate && partnerCommissionRate !== '' ? parseFloat(partnerCommissionRate) : 0;

        const payload: any = {
            funding_application_id: Number(app.id),
            total_commission: totalRate,
        };

        if (showPartnerCommission) {
            payload.admin_commission = aShare;
            payload.partner_commission = pShare;
        } else {
            // If no partner, admin commission matches the total success fee
            payload.admin_commission = totalRate;
        }

        // Only pass requested_amount if it has changed from the original app data
        if (requestedAmountInput !== app.requested_amount?.toString()) {
            payload.requested_amount = parseFloat(requestedAmountInput || '0');
        }

        saveCommissionMutation.mutate(payload, {
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
            <DetailRow label="Social Security Number (SSN)" value={formatSSN(app.ssn)} />
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
                                    <DetailRow label="SSN" value={formatSSN(borrower.ssn)} />

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
            {app.purpose_note && <DetailRow label="Purpose of Funding Note" value={app.purpose_note} />}
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
                    <div className="card border-dashed bg-light bg-opacity-50 py-5">
                        <div className="card-body text-center">
                            <div className="avatar-lg mx-auto mb-4">
                                <div className="avatar-title bg-white text-primary rounded-circle shadow-sm border">
                                    <i className="ri-file-search-line fs-48"></i>
                                </div>
                            </div>
                            <h5 className="fs-16 fw-bold mb-2">No Documents Available</h5>
                            <p className="text-muted mb-0 mx-auto" style={{ maxWidth: '300px' }}>
                                There are currently no uploaded documents for this application step.
                            </p>
                        </div>
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
                    <div className="row pb-1 page-subheader-sticky bg-body">
                        <div className="col-12">
                            <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
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
                                <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                    <Link to="/intake-review/funding-review" className="btn btn-outline-secondary w-lg waves-effect">
                                        <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                    </Link>
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
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-body p-4">
                                        {/* Commission Breakdown */}
                                        <div className="card border border-success border-opacity-25 shadow-sm mb-0">
                                            <div className="card-body p-4">
                                                <div className="row align-items-center">
                                                    <div className="col-lg-12">
                                                        <div className="d-flex align-items-start">
                                                            <div className="flex-shrink-0">
                                                                <div className="avatar-md rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center">
                                                                    <i className="ri-trophy-line text-success fs-2"></i>
                                                                </div>
                                                            </div>
                                                            <div className="flex-grow-1 ms-4">
                                                                <h5 className="mb-2 fw-semibold">Your Commission Breakdown</h5>
                                                                <p className="text-muted mb-0 fs-13">
                                                                    You will earn <strong className="text-success">{formatCurrencyValue(partnerCommissionAmount)}</strong> which is
                                                                    <strong className="text-success"> {partnerCommissionRate || '0'}%</strong> of the total commission amount.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Admin View - Calculator */

                                hasPermission('view commission') && (
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
                                                            if (hasPermission('update commission')) {
                                                                handleSaveCommission();
                                                            }
                                                        }}>
                                                            <div className="mb-3">
                                                                <label className="form-label fs-12 text-muted fw-medium text-primary">Success Fee (%)</label>
                                                                <div className="input-group">
                                                                    <input
                                                                        type="number"
                                                                        className="form-control"
                                                                        placeholder="0"
                                                                        value={successFee}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            if (val === '') {
                                                                                setSuccessFee(val);
                                                                                return;
                                                                            }
                                                                            const numVal = parseFloat(val);
                                                                            if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
                                                                                setSuccessFee(val);
                                                                            }
                                                                        }}
                                                                        min="0"
                                                                        max="100"
                                                                        step="0.1"
                                                                    />
                                                                    <span className="input-group-text bg-white text-muted">%</span>
                                                                </div>
                                                            </div>

                                                            {showPartnerCommission && (
                                                                <div className="row">
                                                                    <div className="col-md-6 mb-0">
                                                                        <label className="form-label fs-12 text-muted fw-medium text-primary">Admin Commission Rate</label>
                                                                        <div className="input-group">
                                                                            <input
                                                                                type="number"
                                                                                className={`form-control ${commissionErrors.admin_commission ? 'is-invalid border-danger' : ''}`}
                                                                                placeholder="0"
                                                                                value={adminCommissionRate}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    if (val === '') {
                                                                                        setAdminCommissionRate(val);
                                                                                        return;
                                                                                    }
                                                                                    const newAdminShare = parseFloat(val);
                                                                                    if (!isNaN(newAdminShare) && newAdminShare >= 0 && newAdminShare <= 100) {
                                                                                        setAdminCommissionRate(val);
                                                                                        const newPartnerShare = 100 - newAdminShare;
                                                                                        setPartnerCommissionRate(newPartnerShare >= 0 ? newPartnerShare.toFixed(2).replace(/\.00$/, '') : '0');
                                                                                    }

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
                                                                    </div>
                                                                    <div className="col-md-6 mb-0">
                                                                        <label className="form-label fs-12 text-muted fw-medium text-success">Partner Commission Rate</label>
                                                                        <div className="input-group">
                                                                            <input
                                                                                type="number"
                                                                                className={`form-control bg-white ${commissionErrors.partner_commission ? 'is-invalid border-danger' : ''}`}
                                                                                placeholder="0"
                                                                                value={partnerCommissionRate}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    if (val === '') {
                                                                                        setPartnerCommissionRate(val);
                                                                                        return;
                                                                                    }
                                                                                    const newPartnerShare = parseFloat(val);

                                                                                    if (!isNaN(newPartnerShare) && newPartnerShare >= 0 && newPartnerShare <= 100) {
                                                                                        setPartnerCommissionRate(val);
                                                                                        const newAdminShare = 100 - newPartnerShare;
                                                                                        setAdminCommissionRate(newAdminShare >= 0 ? newAdminShare.toFixed(2).replace(/\.00$/, '') : '0');
                                                                                    }
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
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {hasPermission('update commission') && (
                                                                <>
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
                                                                    {/* Hidden submit button to enable Enter key submission */}
                                                                    <button type="submit" style={{ display: 'none' }} aria-hidden="true"></button>
                                                                </>
                                                            )}
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
                                                                    {!isEditingRequestedAmount ? (
                                                                        <div
                                                                            className={`px-2 py-1 rounded transition-all d-flex align-items-center ${hasPermission('update commission') ? 'cursor-pointer bg-hover-light' : ''}`}
                                                                            style={{
                                                                                transition: 'all 0.2s ease',
                                                                                border: '1px solid transparent'
                                                                            }}
                                                                            onClick={() => {
                                                                                if (hasPermission('update commission')) {
                                                                                    setTempRequestedAmount(requestedAmountInput);
                                                                                    setIsEditingRequestedAmount(true);
                                                                                }
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                if (hasPermission('update commission')) {
                                                                                    e.currentTarget.style.backgroundColor = 'rgba(10, 179, 156, 0.05)';
                                                                                    e.currentTarget.style.borderColor = 'rgba(10, 179, 156, 0.1)';
                                                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                                                }
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                if (hasPermission('update commission')) {
                                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                                    e.currentTarget.style.borderColor = 'transparent';
                                                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                                                }
                                                                            }}
                                                                        >
                                                                            <h5 className="mb-0 fw-bold text-primary">
                                                                                {formatCurrencyValue(requestedAmount)}
                                                                            </h5>
                                                                            {hasPermission('update commission') && (
                                                                                <i className="ri-edit-2-line ms-2 fs-14"></i>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="d-flex align-items-center gap-1 bg-white p-1 rounded border shadow-sm" style={{ width: '200px' }}>
                                                                            <div className="input-group input-group-sm">
                                                                                <span className="input-group-text bg-transparent border-0 text-muted ps-1 pe-0">$</span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control border-0 shadow-none ps-1"
                                                                                    value={tempRequestedAmount}
                                                                                    onChange={(e) => setTempRequestedAmount(e.target.value)}
                                                                                    autoFocus
                                                                                    placeholder="0.00"
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') {
                                                                                            setRequestedAmountInput(tempRequestedAmount);
                                                                                            setIsEditingRequestedAmount(false);
                                                                                        } else if (e.key === 'Escape') {
                                                                                            setIsEditingRequestedAmount(false);
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <div className="d-flex gap-1">
                                                                                <button
                                                                                    className="btn btn-sm btn-soft-primary px-2"
                                                                                    type="button"
                                                                                    title="Save"
                                                                                    onClick={() => {
                                                                                        setRequestedAmountInput(tempRequestedAmount);
                                                                                        setIsEditingRequestedAmount(false);
                                                                                    }}
                                                                                >
                                                                                    <i className="ri-check-line"></i>
                                                                                </button>
                                                                                <button
                                                                                    className="btn btn-sm btn-soft-danger px-2"
                                                                                    type="button"
                                                                                    title="Cancel"
                                                                                    onClick={() => setIsEditingRequestedAmount(false)}
                                                                                >
                                                                                    <i className="ri-close-line"></i>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {app.total_funded_amount && parseFloat(app.total_funded_amount.toString()) > 0 && (
                                                                    <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-primary border-opacity-10">
                                                                        <div>
                                                                            <i className="ri-money-dollar-box-line text-success me-2"></i>
                                                                            <span className="fw-medium">Total Funded Amount:</span>
                                                                        </div>
                                                                        <h5 className="mb-0 fw-bold text-success">
                                                                            {formatCurrencyValue(parseFloat(app.total_funded_amount.toString()))}
                                                                        </h5>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="row g-2">
                                                                {!showPartnerCommission ? (
                                                                    <div className="col-md-12">
                                                                        <div className="alert alert-success border mb-0 py-3 bg-success-subtle">
                                                                            <div className="d-flex justify-content-between align-items-center">
                                                                                <div className="d-flex align-items-center">
                                                                                    <div className="avatar-xs me-3">
                                                                                        <div className="avatar-title bg-success text-white rounded">
                                                                                            <i className="ri-admin-line"></i>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="fw-medium text-muted fs-11 text-uppercase d-block">Admin Commission Amount</span>
                                                                                        <h4 className="mb-0 fw-bold text-success">
                                                                                            {formatCurrencyValue(totalCommissionAmount)}
                                                                                        </h4>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-end">
                                                                                    <span className="badge bg-success text-white fs-12 px-3">
                                                                                        {successFee || '0'}% Admin Commission
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="col-md-12">
                                                                            <div className="alert alert-secondary border-dashed mb-3 py-2 bg-light">
                                                                                <div className="d-flex justify-content-between align-items-center">
                                                                                    <div>
                                                                                        <i className="ri-pie-chart-line text-secondary me-2"></i>
                                                                                        <span className="fw-medium">Success Commission Amount:</span>
                                                                                    </div>
                                                                                    <h5 className="mb-0 fw-bold">{formatCurrencyValue(totalCommissionAmount)}</h5>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="col-md-6">
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
                                                                                        <span className="badge bg-primary fs-10">{adminShareRate.toFixed(1).replace(/\.0$/, '')}%</span>
                                                                                        <span className="ms-1">Share of Success Fee</span>
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>

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
                                                                                        <span className="badge bg-success fs-10">{partnerShareRate.toFixed(1).replace(/\.0$/, '')}%</span>
                                                                                        <span className="ms-1">Share of Success Fee</span>
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>


                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
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

                                    {isPartner ? (
                                        /* Partner View - Read Only */
                                        <>
                                            <div className="mb-3">
                                                <label className="form-label text-muted">Status</label>
                                                <div className="p-0 rounded">
                                                    <span className={`badge ${FUNDING_APPLICATION_STATUS_CLASS_MAP[status] || 'bg-primary-subtle text-primary'} fs-12 text-uppercase`}>
                                                        {FUNDING_APPLICATION_STATUS_OPTIONS.find(opt => opt.value === status)?.label || status || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label text-muted">Status Notes</label>
                                                <div className="p-3 bg-light rounded text-muted">
                                                    {status_note || 'No notes available'}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        /* Admin View - Editable */
                                        <>
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
                                                    disabled={!hasPermission("update funding application")}
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
                                                    disabled={!hasPermission("update funding application")}
                                                ></textarea>
                                                {notesError && <div className="invalid-feedback">{notesError}</div>}
                                            </div>
                                            {hasPermission("update funding application") && (
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
                                            )}
                                        </>
                                    )}
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
            </div >

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

            <FundedAmountModal
                show={showFundedModal}
                onHide={() => setShowFundedModal(false)}
                onConfirm={handleFundedConfirm}
                loading={updateMutation.isPending}
                initialAmount={fundedAmount}
                title="Status Update: Closed (Completed)"
                message="Since the status is Closed (Completed), please specify the final funded amount for this application."
            />
        </>
    );
}
