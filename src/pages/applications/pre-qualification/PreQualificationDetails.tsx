
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PreQualificationApplicationDetails as PreQualificationApplicationDetailsType } from '../../../modules/application/types';
import { APPLICATION_STATUS_OPTIONS } from '../../../config/borrower';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import { usePreQualificationApplicationDetails, useUpdateApplicationStatus } from '../../../modules/application/queries';
// @ts-ignore
import ConfirmationModal from '../../../components/Common/Modals/ConfirmationModal';
// @ts-ignore
import ApplicationDetailsLoader from '../../../components/Loader/ApplicationDetailsLoader';

type StepType = 1 | 2 | 3;

const STEPS = [
    { id: 1, title: 'Personal Info', icon: 'ri-user-line' },
    { id: 2, title: 'Business Details', icon: 'ri-briefcase-line' },
    { id: 3, title: 'Funding Needs', icon: 'ri-money-dollar-circle-line' }
];



const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="row mb-3">
        <label className="col-sm-4 form-label fs-14">{label}</label>
        <div className="col-sm-8">
            <div className="text-muted fs-14">{value || '-'}</div>
        </div>
    </div>
);

export default function PreQualificationDetails() {
    const { id } = useParams();
    const { data: details, isLoading, error } = usePreQualificationApplicationDetails(id || '');
    const [currentStep, setCurrentStep] = useState<StepType>(1);
    
    // Status update state
    const app = (details?.data || details || {}) as PreQualificationApplicationDetailsType;
    const [status, setStatus] = useState<string>('');
    const [status_note, setStatusNote] = useState<string>('');
    const [notesError, setNotesError] = useState<string>('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const updateMutation = useUpdateApplicationStatus();

    // Sync state with fetched data
    useEffect(() => {
        if (app?.status) setStatus(app.status);
        if (app?.status_note) setStatusNote(app.status_note);
    }, [app]);

    const handleUpdateClick = () => {
        // Clear previous errors and show confirmation modal
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
                setNotesError(''); // Clear any errors on success
            },
            onError: (error: any) => {
                setShowConfirmModal(false);
                // Handle validation errors from backend
                if (error?.response?.data?.errors) {
                    const backendErrors = error.response.data.errors;
                    // Check for status_note validation error
                    if (backendErrors.status_note) {
                        const message = Array.isArray(backendErrors.status_note) 
                            ? backendErrors.status_note[0] 
                            : backendErrors.status_note;
                        setNotesError(message);
                    }
                    // Do NOT show any toast for validation errors - only field-level display
                } else {
                    // Only show toast for non-validation errors (network errors, server errors, etc.)
                    toast.error('Failed to update status. Please try again.');
                }
            }
        });
    };

    // Show error toast and redirect if error
    useEffect(() => {
        if (error || (!isLoading && !details)) {
            toast.error('Failed to load application details');
        }
    }, [error, details, isLoading]);

    if (isLoading) {
        return <ApplicationDetailsLoader />;
    }

    if (error || !details) {
        return null; // Error toast is shown via useEffect
    }

    const renderPersonalInfo = () => (
        <>
            <DetailRow label="First Name" value={app.first_name} />
            <DetailRow label="Last Name" value={app.last_name} />
            <DetailRow label="Email" value={app.email} />
            <DetailRow label="Phone Number" value={app.phone_number} />
             <DetailRow label="Business Website" value={<a href={app.business_website} target="_blank" rel="noopener noreferrer">{app.business_website}</a>} />
             <DetailRow label="State of Incorporation" value={app.state_of_incorporation} />
        </>
    );

    const renderBusinessDetails = () => (
        <>
            <DetailRow label="Business Name" value={app.business_name} />
            <DetailRow label="Industry Type" value={app.industry_type} />
            <DetailRow label="Business Structure" value={app.business_structure} />
            <DetailRow label="Monthly Revenue" value={app.monthly_revenue} />
            <DetailRow label="Annual Revenue" value={app.annual_revenue} />
            <DetailRow label="Years in Business" value={app.years_in_business} />
        </>
    );

    const renderFundingNeeds = () => (
        <>
             <DetailRow label="Funding Requested Amount" value={app.funding_requested_amount} />
             <DetailRow label="Funding Urgency" value={app.funding_urgency} />
             <DetailRow label="Purpose of Funding" value={app.purpose_of_funding} />
             <DetailRow label="Personal Credit Score" value={app.personal_credit_score} />
             <DetailRow label="Estimated Business Credit Score" value={app.estimated_business_credit_score} />
             <DetailRow label="Existing Business Debt" value={app.existing_business_debt ? 'Yes' : 'No'} />
             <DetailRow label="Debt Balance" value={app.debt_balance} />
             <DetailRow label="Notes" value={app.notes} />
        </>
    );

    return (
        <>
            <div className="page-content">
                <div className="container-fluid">
                    {/* Header */}
                    <div className="row mb-3 pb-1">
                        <div className="col-12">
                             <div className="d-flex align-items-center justify-content-between flex-row">
                                 <div className="flex-grow-1">
                                    <h4 className="fs-20 mb-1">Application Details</h4>
                                    <nav aria-label="breadcrumb">
                                        <ol className="breadcrumb m-0">
                                            <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                             <li className="breadcrumb-item"><Link to="/intake-review/pre-qualification">Pre-Qualification Applications</Link></li>
                                             <li className="breadcrumb-item active" aria-current="page">Details</li>
                                        </ol>
                                    </nav>
                                 </div>
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        {/* Sidebar Tabs */}
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
                            {/* Status Card */}
                            <div className="card">
                                 <div className="card-body">
                                     <h5 className="fs-15 fw-bold mb-3">Application Status</h5>

                                     <div className="mb-3">
                                         <label htmlFor="status-select" className="form-label text-muted">Status</label>
                                         <Dropdown
                                            value={status}
                                            options={APPLICATION_STATUS_OPTIONS}
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

                        {/* Content Area */}
                        <div className="col-lg-9">
                            <div className="card">
                                <div className="card-header">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <h5 className="card-title mb-0">
                                            {STEPS.find(s => s.id === currentStep)?.title}
                                        </h5>
                                    </div>
                                </div>
                                <div className="card-body p-4">
                                    {currentStep === 1 && renderPersonalInfo()}
                                    {currentStep === 2 && renderBusinessDetails()}
                                    {currentStep === 3 && renderFundingNeeds()}
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
