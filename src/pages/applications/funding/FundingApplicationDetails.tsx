import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

import { FundingApplicationDetails as FundingApplicationDetailsType } from '../../../modules/application/types';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import { APPLICATION_STATUS_OPTIONS, FUNDING_APPLICATION_STATUS_OPTIONS } from '../../../config/borrower';
import { useUpdateFundingApplicationStatus, useFundingApplicationDetails } from '../../../modules/application/queries';
// @ts-ignore
import ApplicationDetailsLoader from '../../../components/Loader/ApplicationDetailsLoader';
// @ts-ignore
import ConfirmationModal from '../../../components/Common/Modals/ConfirmationModal';

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
        <label className="form-label fs-14 ">{label}</label>
        <div className="text-muted fs-14">{value || '-'}</div>
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

    const { data: apiResponse, isLoading, error } = useFundingApplicationDetails(id || '');

    const app = (apiResponse?.data || apiResponse || {}) as FundingApplicationDetailsType;

    // Sync status with fetched data
    useEffect(() => {
        if (app?.status) setStatus(app.status);
        if (app?.status_note) setStatusNote(app.status_note);
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
            id: app.id,
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
            <DetailRow label="Social Security Number (SSN)" value={app.ssn ? '***-**-****' : '-'} />
            <DetailRow label="Citizenship Status" value={app.citizenship_status} />
            <DetailRow label="Street Address" value={app.street_address} />
            <DetailRow label="State" value={app.state} />
            <DetailRow label="City" value={app.city} />
            <DetailRow label="Zip Code" value={app.zip_code} />
            <DetailRow label="Ownership %" value={app.ownership} />
            <div className="col-12 mb-3">
                <label className="form-label fs-14">Has Co-Borrower?</label>
                <div className="text-muted fs-14">{app.has_co_borrower ? 'Yes' : 'No'}</div>
            </div>

            {app.has_co_borrower && app.co_borrowers && app.co_borrowers.length > 0 && (
                <div className="col-12 mt-3">
                    <h5 className="fs-15 fw-bold mb-3 border-bottom pb-2">Co-Borrower Information</h5>
                    {app.co_borrowers.map((borrower, index) => (
                        <div key={borrower.id} className="card border shadow-none mb-3">
                            <div className="card-header bg-light p-2 ps-3">
                                <h6 className="mb-0 fs-14 fw-bold">Co-Borrower {index + 1}: {borrower.first_name} {borrower.last_name}</h6>
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
                <label className="form-label fs-14">Existing Business Debt?</label>
                <div className="text-muted fs-14">{app.has_business_debt ? 'Yes' : 'No'}</div>
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
                <label className="form-label fs-14">Collateral Available?</label>
                <div className="text-muted fs-14">{app.collateral_available}</div>
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
                                                <h6 className="fs-14 mb-0">
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
                <label className="form-label fs-14">Credit Pull Authorization</label>
                <div>{app.credit_pull_authorization ? <span className="badge bg-success">Authorized</span> : <span className="badge bg-secondary">Not Authorized</span>}</div>
            </div>
            <div className="col-md-6 mb-3">
                <label className="form-label fs-14">Terms & Conditions Acceptance</label>
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
                    <label className="form-label fs-14">Explanation</label>
                    <div className="text-muted fs-14">{app.federal_compliance_disclosures_explanation}</div>
                </div>
            )}
        </div>
    );

    const renderAttestationAndAuthorization = () => (
        <div className="row">
            <div className="col-md-6 mb-3">
                <label className="form-label fs-14">Attestation Authorization</label>
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
                                            <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${currentStep === step.id ? 'bg-white text-primary' : 'bg-light text-muted'}`} style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: '600' }}>
                                                {step.id}
                                            </div>
                                            <div className="flex-grow-1">
                                                <div className={`fw-medium ${currentStep === step.id ? 'text-white' : 'text-dark'}`} style={{ fontSize: '14px' }}>
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
