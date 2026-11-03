import React, { useState, useEffect, useRef } from 'react';
import { formatApiDate } from '../../../utils/dates';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../common/PageHeader';
import { queryKeys } from '../../../lib/query/queryKeys';

import { FundingApplicationDetails as FundingApplicationDetailsType } from '../../../modules/application/types';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import { FUNDING_APPLICATION_STATUS_OPTIONS, FUNDING_APPLICATION_STATUS_CLASS_MAP, FUNDING_APPLICATION_STATUS, FUNDING_APPLICATION_STATUS_NOTE_MAX } from '../../../config/borrower';
import { PARTNER_EDITOR_TYPES } from '../../../config/partnerTypeOptions';
import { useUpdateFundingApplicationStatus, useFundingApplicationDetails, useSaveFundingApplicationCommission, useAssignLenderToFundingApplication } from '../../../modules/application/queries';
import LenderInformationCard, { type MatchedLender } from '../../../components/Common/Lender/LenderInformationCard';
import { downloadFundingApplication, downloadFundingSignature, downloadFundingZip, downloadFundingApplicationDocument } from '../../../modules/application/services';
import { handleFileDownload } from '../../../utils/fileDownload';
// @ts-ignore
import ApplicationDetailsLoader from '../../../components/Loader/ApplicationDetailsLoader';
// @ts-ignore
import ConfirmationModal from '../../../components/Common/Modals/ConfirmationModal';
import { Modal, ModalBody } from 'reactstrap';
import SsnValue from '../../../components/Common/SsnValue';
import FundedAmountModal, { type CommissionRates } from '../../../components/Common/Modals/FundedAmountModal';
import ClosedApplicationSummary from './components/ClosedApplicationSummary';
import DownloadPdfModal from './DownloadPdfModal';
import ActivitySidebar from '../../../components/Common/Activity/ActivitySidebar';
import { useAuthStore } from '../../../store/auth/authStore';
import { usePermissions } from '../../../lib/auth/usePermissions';

type StepType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

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
    const queryClient = useQueryClient();
    const [currentStep, setCurrentStep] = useState<StepType>(1);

    // Status update state
    const [status, setStatus] = useState<string>('');
    const [status_note, setStatusNote] = useState<string>('');
    const [notesError, setNotesError] = useState<string>('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showFundedModal, setShowFundedModal] = useState(false);
    const [fundedAmount, setFundedAmount] = useState<string>('');
    const updateMutation = useUpdateFundingApplicationStatus();

    // Lender Information (host only)
    const assignLenderMutation = useAssignLenderToFundingApplication();
    const lenderCardRef = useRef<HTMLDivElement>(null);
    const [highlightLenders, setHighlightLenders] = useState(false);
    const [showMissingLenderModal, setShowMissingLenderModal] = useState(false);

    // PDF Download state
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadType, setDownloadType] = useState<'application' | 'signature'>('application');

    // Commission - set in the Closed (Completed) modal
    const saveCommissionMutation = useSaveFundingApplicationCommission();

    const { user } = useAuthStore();
    const { hasPermission } = usePermissions();
    const isPartner = user?.is_host == false;
    const isHost = user?.is_host == true;
    const authPartnerId = (user as any)?.partner_id;

    const { data: apiResponse, isLoading, error } = useFundingApplicationDetails(id || '');

    const app = (apiResponse?.data || apiResponse || {}) as FundingApplicationDetailsType;
    const showPartnerCommission = app?.partner_id !== authPartnerId;
    const isClosed = app?.status === FUNDING_APPLICATION_STATUS.CLOSED;
    const isCommissionSet = app?.total_commission !== null && app?.total_commission !== undefined;
    // Editable whenever the application is in one of the API's editable
    // statuses (config `statuses.editable`) - however it was created: from a
    // funding request, or converted from the embed form with no funding request
    // at all. The server sends that as is_editable, so no status names are
    // compared here. The host edits any partner's application; a white-label or
    // certified partner only its own borrowers'.
    const canEditApplication =
        (isHost || (PARTNER_EDITOR_TYPES.includes(user?.partner_type as string) && app?.partner_id == authPartnerId)) &&
        !!app?.id &&
        !!app?.is_editable;
    // Out of everyone's hands (status not in the editable list): every viewer -
    // host, white-label and certified partner - is told so instead of just
    // losing the Edit button: a "Cannot Edit Funding Application" banner. The
    // reason comes from the API.
    const isLockedForEdit = !!app?.id && app?.is_editable === false;
    const lockedReason = app?.locked_reason
        || `This funding application is "${app?.status}", so it can no longer be edited. Funding applications can only be edited while their status is one of the editable statuses.`;
    // The banner shows the first sentence in bold and the rest beneath it.
    const [, lockedHeadline = lockedReason, lockedDetail = ''] = lockedReason.match(/^(.*?\.)\s+(.*)$/) ?? [];

    // Sync the status with fetched data. (The commission is read straight from
    // the application by the Closed (Completed) modal and summary.)
    useEffect(() => {
        if (app?.status) setStatus(app.status);
        if (app?.status_note) setStatusNote(app.status_note);
    }, [app]);

    useEffect(() => {
        if (error || (!isLoading && !apiResponse)) {
            toast.error('Failed to load application details');
            navigate('/intake-review/funding-application');
        }
    }, [error, apiResponse, isLoading, navigate]);

    const assignLender = (lender: MatchedLender) =>
        assignLenderMutation.mutateAsync({ id: app.id, lender_ids: [lender.id] }).then(
            () => {
                toast.success('Lender assigned successfully');
                window.dispatchEvent(new Event('refreshActivities'));
            },
            (err: any) => {
                toast.error(err?.response?.data?.message || 'Failed to assign lender');
                throw err;
            }
        );

    // Every status outside the editable ones needs a lender first (the API refuses too).
    const leavesEditableStatuses = status !== app?.status && !!app?.lender_required_statuses?.includes(status);
    // Only the host changes the status here (partners see it read-only), and the
    // host has Lender Information - so the Lender Required modal always offers it.
    const needsLenderFirst = leavesEditableStatuses && !app?.has_assigned_lender;

    // In Lender Information while the lender can still change.
    const lenderNotice = app?.is_editable
        ? `This application is currently "${app?.status}", so you can still assign or change its lender.`
        : undefined;

    // Host: take them to Lender Information and point at it.
    // "Got it, take me there!": close the modal first, and scroll once it has
    // closed (handleMissingLenderClosed) - scrolling while it closes made the
    // page jump down and back up.
    const takeMeToLenders = useRef(false);
    const requestGoToLenderInformation = () => {
        takeMeToLenders.current = true;
        setShowMissingLenderModal(false);
    };
    const handleMissingLenderClosed = () => {
        if (takeMeToLenders.current) {
            takeMeToLenders.current = false;
            goToLenderInformation();
        }
    };

    const goToLenderInformation = () => {
        setShowMissingLenderModal(false);
        if (!lenderCardRef.current) return;
        lenderCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // As the funding request page: the first row pulses, the card is outlined.
        lenderCardRef.current.classList.add('border-danger');
        setHighlightLenders(true);
        setTimeout(() => {
            lenderCardRef.current?.classList.remove('border-danger');
            setHighlightLenders(false);
        }, 30000);
    };


    const handleUpdateClick = () => {
        if (status_note.length > FUNDING_APPLICATION_STATUS_NOTE_MAX) {
            setNotesError(`The status note may not be greater than ${FUNDING_APPLICATION_STATUS_NOTE_MAX.toLocaleString('en-US')} characters.`);
            return;
        }
        // Nothing to update - as the funding request page says. (Also what is
        // left after a status that needs a lender was picked and set back.)
        if (status === app?.status && status_note.trim() === (app?.status_note || '').trim()) {
            toast.info('Status is unchanged.');
            return;
        }
        if (needsLenderFirst) {
            // As the funding request page: the Lender Required modal; the host
            // goes on from there to Lender Information. Nothing is saved.
            setShowMissingLenderModal(true);
            return;
        }
        if (status === FUNDING_APPLICATION_STATUS.CLOSED) {
            setFundedAmount(app.total_funded_amount?.toString() || (requestedAmountValue ? requestedAmountValue.toString() : ''));
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
                window.dispatchEvent(new Event('refreshActivities'));
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

    const [closingCommissionErrors, setClosingCommissionErrors] = useState<{ total_commission?: string; admin_commission?: string; partner_commission?: string }>({});

    const handleFundedConfirm = async (amount: string, commission: CommissionRates | null) => {
        if (!app.id) return;
        setClosingCommissionErrors({});

        // Commission first, through the same API as the Commission Details card:
        // closing locks it, and the API works the amounts out from it on close.
        const commissionChanged = commission && (
            commission.successFee !== (app.total_commission?.toString() || '')
            || (showPartnerCommission && commission.adminRate !== (app.admin_commission?.toString() || ''))
            || (showPartnerCommission && commission.partnerRate !== (app.partner_commission?.toString() || ''))
        );
        if (commission && commissionChanged) {
            try {
                await saveCommissionMutation.mutateAsync(buildCommissionPayload(commission));
                // As the Commission Details card did on save.
                toast.success('Commission saved successfully');
                window.dispatchEvent(new Event('refreshActivities'));
            } catch (error: any) {
                if (error?.response?.data?.errors) {
                    setClosingCommissionErrors(commissionErrorsFrom(error));
                } else {
                    toast.error('Failed to save commission. The status was not changed.');
                }
                return;
            }
        }

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
                window.dispatchEvent(new Event('refreshActivities'));
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

    // The amount the page shows as requested: the application's own, or - for one
    // from a funding request, whose own is empty - the request's (requested_amount).
    const requestedAmountValue = app.requested_amount_original != null
        ? Number(app.requested_amount_original)
        : parseCurrency(app.requested_amount) || 0;


    const formatSSN = (ssn: string | null | undefined) => {
        if (!ssn) return '-';
        const cleaned = ssn.toString().replace(/\D/g, '');
        if (cleaned.length === 9) {
            return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
        }
        return ssn;
    };

    // The save-commission payload, from the rates as typed in the Closed
    // (Completed) modal - the shape the Commission Details card used to send.
    const buildCommissionPayload = (rates: CommissionRates) => {
        const totalRate = rates.successFee && rates.successFee !== '' ? parseFloat(rates.successFee) : 0;
        const aShare = rates.adminRate && rates.adminRate !== '' ? parseFloat(rates.adminRate) : 0;
        const pShare = rates.partnerRate && rates.partnerRate !== '' ? parseFloat(rates.partnerRate) : 0;

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

        // Never requested_amount: nothing on this page edits it any more, and for an
        // application from a funding request its own value is empty - sending
        // it overwrote the requested amount with 0.

        return payload;
    };

    const commissionErrorsFrom = (error: any) => {
        const backendErrors = error?.response?.data?.errors || {};
        const first = (v: any) => (Array.isArray(v) ? v[0] : v);
        return {
            total_commission: first(backendErrors.total_commission),
            admin_commission: first(backendErrors.admin_commission),
            partner_commission: first(backendErrors.partner_commission),
        };
    };

    if (isLoading) {
        return (
            <ApplicationDetailsLoader
                title="Funding Application Details"
                breadcrumbs={[
                    { label: 'Funding Applications', path: '/intake-review/funding-application' },
                    { label: 'Details' }
                ]}
            />
        );
    }

    if (error || !apiResponse) {
        return null;
    }


    const renderBusinessInformation = () => (
        <div className="row">
            <DetailRow label="Business Contact Name" value={app.full_name} />
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
            <DetailRow label="Social Security Number (SSN)" value={<SsnValue value={app.ssn} />} />
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
                                    <DetailRow label="Date of Birth" value={borrower.date_of_birth ? formatApiDate(borrower.date_of_birth) : '-'} />
                                    <DetailRow label="SSN" value={<SsnValue value={borrower.ssn} />} />

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
            <DetailRow label="Monthly Revenue" value={app.monthly_revenue || '-'} />
            <DetailRow label="Annual Revenue" value={app.annual_revenue || '-'} />
            <DetailRow label="Business Bank Name" value={app.business_bank_name} />
            <DetailRow label="Business Checking Start Date" value={app.business_checking_start_date} />
            <DetailRow label="Self-Reported Personal Credit Score" value={app.self_reported_personal_credit_score} />
            <DetailRow label="Self-Reported Business Credit Score" value={app.self_reported_business_credit_score} />
            <div className="col-12 mb-3">
                <label className="form-label fs-13">Existing Business Debt?</label>
                <div className="text-muted fs-13">{app.has_business_debt ? 'Yes' : 'No'}</div>
            </div>
            {app.has_business_debt && (
                <DetailRow label="Debt Balance" value={app.debt_balance || '-'} />
            )}
        </div>
    );

    const renderFundingRequest = () => (
        <div className="row">
            <DetailRow label="Requested Amount" value={app.requested_amount || '-'} />
            <DetailRow label="Purpose of Funds" value={app.purpose_of_funds} />
            {app.purpose_note && <DetailRow label="Purpose of Funding Note" value={app.purpose_note} />}
            <DetailRow label="Preferred Funding Type" value={app.preferred_funding_type} />
            <DetailRow label="Additional Funding Types" value={app.additional_funding_types?.join(', ')} />
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

    // Saves the file in place. A plain <a href download> to the API's storage URL
    // is cross-origin, so the browser ignored `download` and opened a new tab.
    const downloadDocumentFile = (e: React.MouseEvent, file: { id: number | string; original_name?: string; url?: string }) => {
        e.preventDefault();
        handleFileDownload(
            () => downloadFundingApplicationDocument(file.id),
            file.original_name || 'document',
            file.url
        );
    };

    const renderDocumentUpload = () => (
        <div className="row">
            {app.documents && app.documents.length > 0 ? (
                app.documents.map((docType, index) => (
                    <div key={index} className="col-12 mb-4">
                        <h6 className="fs-15 fw-bold mb-3 border-bottom pb-2">
                            {docType.type}
                            <span className="ms-2 badge bg-primary-subtle text-primary fs-12">
                                {docType.files.length} {docType.files.length === 1 ? 'file' : 'files'}
                            </span>
                        </h6>
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
                                            {/* minWidth 0 lets a long name shrink and end in "…" instead of pushing the download icon out of the box. */}
                                            <div className="flex-grow-1 ms-3" style={{ minWidth: 0 }}>
                                                <h6 className="fs-13 mb-0 text-truncate" title={file.original_name}>
                                                    <a href="#" onClick={(e) => downloadDocumentFile(e, file)} className="text-reset">{file.original_name}</a>
                                                </h6>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <button type="button" onClick={(e) => downloadDocumentFile(e, file)} className="btn btn-icon btn-sm btn-ghost-primary text-primary" title="Download">
                                                    <i className="ri-download-2-line fs-18"></i>
                                                </button>
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

    // One signature, laid out the way the borrower sees it on their signing
    // step: the signature on the left (the image for an e-signature, the name
    // for a typed one), its date on the right, and who signed underneath.
    const renderSignaturePanel = (
        title: string,
        signature: any,
        options: { badge: React.ReactNode; faded?: boolean; emptyText: string }
    ) => {
        const isEsign = signature?.signature_type === 'esign' && signature?.signature_image;
        const hasSignature = Boolean(signature && (isEsign || signature.signature_name));
        // Both dates arrive already formatted by the API (toTimezone). An
        // e-signature carries the date the borrower chose; a typed name has
        // only the moment it was submitted.
        const dateCaption = signature?.signature_date ? 'Signature Date' : 'Signed On';
        const dateValue = signature?.signature_date || signature?.signed_at || '—';
        const captionStyle: React.CSSProperties = { fontSize: 10.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 };

        return (
            <div className="col-12 mb-3 d-flex flex-column">
                <label className="form-label fs-13 d-flex align-items-center gap-2">{title} {options.badge}</label>
                <div className="border rounded overflow-hidden flex-grow-1 d-flex flex-column bg-white">
                    <div className="row g-0 flex-grow-1">
                        <div className={hasSignature ? 'col-sm-7' : 'col-12'}>
                            <div className="h-100 d-flex align-items-center justify-content-center text-center p-3" style={{ minHeight: 130 }}>
                                {!hasSignature ? (
                                    <span className="text-muted fs-13">{options.emptyText}</span>
                                ) : isEsign ? (
                                    <img
                                        src={signature.signature_image}
                                        alt={`Signature of ${signature.signature_name || 'the borrower'}`}
                                        className="mw-100"
                                        style={{ maxHeight: 100, objectFit: 'contain', opacity: options.faded ? 0.45 : 1 }}
                                    />
                                ) : (
                                    <span className={`fs-18 fw-semibold text-break ${options.faded ? 'text-decoration-line-through text-muted' : 'text-dark'}`}>
                                        {signature.signature_name}
                                    </span>
                                )}
                            </div>
                        </div>
                        {hasSignature && (
                            <div className="col-sm-5 border-start bg-light">
                                <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center px-3 py-3">
                                    <i className="ri-calendar-check-line mb-1" style={{ fontSize: 20, color: '#3b518d', opacity: 0.7 }}></i>
                                    <div className="w-100 pb-1 text-dark fs-13 text-nowrap" style={{ borderBottom: '1px solid #64748b' }}>
                                        {dateValue}
                                    </div>
                                    <span className="mt-1 text-nowrap" style={captionStyle}>{dateCaption}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {hasSignature && (
                        <div className="border-top bg-light px-3 py-2">
                            <div className="row g-2 fs-13">
                                <div className="col-sm-4">
                                    <span className="text-muted fs-12 d-block">Signed By</span>
                                    <span className="fw-medium text-break">{signature.signature_name || 'N/A'}</span>
                                </div>
                                <div className="col-sm-4">
                                    <span className="text-muted fs-12 d-block">Signature Type</span>
                                    <span className="fw-medium">{isEsign ? 'E-Signature' : 'Typed Name'}</span>
                                </div>
                                <div className="col-sm-4">
                                    <span className="text-muted fs-12 d-block">Submitted On</span>
                                    <span className="fw-medium">{signature.signed_at || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderAttestationAndAuthorization = () => {
        const current = (app as any).signature_data;
        const previous = (app as any).previous_signature;
        const requiresResign = Boolean((app as any).requires_resign);

        return (
            <div className="row">
                <div className="col-12 mb-3">
                    <label className="form-label fs-13">Attestation Authorization</label>
                    <div>{app.attestation_authorization ? <span className="badge bg-success">Authorized</span> : <span className="badge bg-secondary">Not Authorized</span>}</div>
                </div>

                {/* Previous first, then the new one - the same order the
                    borrower signs in. */}
                {previous && renderSignaturePanel('Previous Signature', previous, {
                    badge: <span className="badge bg-danger-subtle text-danger">No longer valid</span>,
                    faded: true,
                    emptyText: '',
                })}

                {renderSignaturePanel(previous ? 'New Electronic Signature' : 'Electronic Signature', current, {
                    badge: current
                        ? <span className="badge bg-success-subtle text-success">Currently on file</span>
                        : <span className="badge bg-warning-subtle text-warning">{requiresResign ? 'Awaiting re-signature' : 'Not signed yet'}</span>,
                    emptyText: requiresResign
                        ? 'The borrower has not signed again yet.'
                        : 'This application has not been signed yet.',
                })}
            </div>
        );
    };

    const renderDocumentAuditHistory = () => (
        <div className="row">
            <div className="col-12 mb-4">
                <h5 className="fs-15 fw-bold mb-3 border-bottom pb-2">Signature Certificate Metadata</h5>
                {app.certificates && app.certificates.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table table-bordered table-striped fs-13">
                            <thead>
                                <tr>
                                    <th>Certificate ID</th>
                                    <th>Version</th>
                                    <th>SHA-256 Hash</th>
                                    <th>Signature Date</th>
                                    <th>Generated Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {app.certificates.map(cert => (
                                    <tr key={cert.id}>
                                        <td className="fw-medium">{cert.certificate_id}</td>
                                        <td>{cert.application_version}</td>
                                        <td style={{ wordBreak: 'break-all', maxWidth: '250px' }}>{cert.executed_application_sha256}</td>
                                        <td>{new Date(cert.signature_timestamp).toLocaleString()}</td>
                                        <td>{new Date(cert.pdf_generation_timestamp).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-muted fs-13">No signature certificate metadata available yet.</div>
                )}
            </div>

            <div className="col-12">
                <h5 className="fs-15 fw-bold mb-3 border-bottom pb-2">Document Audit History</h5>
                {app.download_histories && app.download_histories.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table table-bordered table-striped fs-13">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Action</th>
                                    <th>Document Type</th>
                                    <th>SHA-256 Hash</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {app.download_histories.map(history => (
                                    <tr key={history.id}>
                                        <td>{new Date(history.downloaded_at).toLocaleString()}</td>
                                        <td className="fw-medium">{history.user_name || 'System'}</td>
                                        <td className="text-capitalize">{history.user_type || 'System'}</td>
                                        <td>
                                            <span className={`badge ${history.action === 'generated' ? 'bg-success' :
                                                history.action.includes('with_password') ? 'bg-warning' : 'bg-primary'
                                                }`}>
                                                {history.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>{history.file_type}</td>
                                        <td style={{ wordBreak: 'break-all', maxWidth: '200px' }}>{history.sha256_hash}</td>
                                        <td>{history.ip_address}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-muted fs-13">No document history recorded yet.</div>
                )}
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
            case 9: return renderDocumentAuditHistory();
            default: return null;
        }
    };

    const currentStepData = STEPS.find(s => s.id === currentStep);
    const progress = Math.round((currentStep / STEPS.length) * 100);

    return (
        <>
            <div className="page-content" style={{ overflow: 'visible' }}>
                <div className="container-fluid">
                    {/* Locked: above the page title, the first thing on the page. */}
                    {isLockedForEdit && !isClosed && (
                        <div
                            className="d-flex align-items-center mb-3 rounded-3"
                            role="status"
                            style={{ background: '#fff4de', border: '1px solid #f7b84b', padding: '14px 18px' }}
                        >
                            <span
                                className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                                style={{ width: 36, height: 36, background: '#f7931e', color: '#fff' }}
                                aria-hidden="true"
                            >
                                <i className="ri-lock-2-fill fs-17"></i>
                            </span>
                            <span className="flex-shrink-0 mx-3 align-self-stretch" style={{ width: 3, background: '#f7931e', borderRadius: 2 }} />
                            <div style={{ color: '#3b2a12' }}>
                                <div className="fw-semibold fs-15">{lockedHeadline}</div>
                                {lockedDetail && <div className="fs-13">{lockedDetail}</div>}
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="row pb-1 page-subheader-sticky bg-body">
                        <div className="col-12">
                            <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                                <div className="flex-grow-1">
                                    <h4 className="fs-20 mb-1">Funding Application Details</h4>
                                    <nav aria-label="breadcrumb">
                                        <ol className="breadcrumb m-0">
                                            <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                            <li className="breadcrumb-item"><Link to="/intake-review/funding-application">Funding Applications</Link></li>
                                            <li className="breadcrumb-item active" aria-current="page">Details</li>
                                        </ol>
                                    </nav>
                                </div>
                                <div className="page-actions page-actions-wrap d-flex align-items-center flex-wrap gap-2 mt-2 mt-lg-0">
                                    {isHost && (
                                        <Link to={`/intake-review/funding-application/${id}/audit-history`} className="btn btn-primary w-lg waves-effect">
                                            <i className="ri-history-line align-middle me-1"></i> Audit History
                                        </Link>
                                    )}
                                    <button
                                        type="button"
                                        className="btn btn-primary w-lg waves-effect"
                                        onClick={() => {
                                            setShowDownloadModal(true);
                                        }}
                                    >
                                        <i className="ri-file-download-line align-middle me-1"></i> Download
                                    </button>
                                    {canEditApplication && (
                                        <Link
                                            to={`/intake-review/funding-application/${app.id}/edit`}
                                            className="btn btn-warning waves-effect py-2 fw-normal"
                                            title="Editing will require the borrower to re-sign the application"
                                        >
                                            <i className="ri-edit-line align-middle me-1"></i> Edit Funding Application
                                        </Link>
                                    )}
                                    <Link to="/intake-review/funding-application" className="btn btn-outline-secondary w-lg waves-effect">
                                        <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        {/* Left Column (Commission + Content) */}
                        <div className="col-lg-8">
                            {/* Closed (Completed): the summary at the top of the left column -
                                the host the whole picture, a partner only their commission. */}
                            {isClosed && (
                                <ClosedApplicationSummary
                                    app={app}
                                    viewer={isPartner ? 'partner' : 'host'}
                                    partnerApplication={showPartnerCommission}
                                    requestedAmount={requestedAmountValue}
                                />
                            )}

                            {/* Commission: shown only once the application is Closed (Completed), in the
                                summary above - to the host and to a partner. Nothing before that. */}

                            {/* Steps & Main Content Row */}
                            <div className="row">
                                {/* Sidebar */}
                                <div className="col-lg-4 mb-4">
                                    {/* Steps List */}
                                    <div className="card">
                                        <div className="card-header bg-white py-3">
                                            <h6 className="card-title mb-0 fs-16">Application Progress Steps</h6>
                                        </div>
                                        <div className="list-group list-group-flush application-steps">
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
                                                        <div className={`fw-medium fs-13 step-title-text ${currentStep === step.id ? 'text-white' : 'text-dark'}`} style={{ fontSize: '13px' }}>
                                                            {step.title}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Status Update Card */}
                                    <div className="card mb-0">
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
                                                            disabled={!hasPermission("update funding application") || isClosed}
                                                        />
                                                    </div>
                                                    <div className="mb-3">
                                                        <label htmlFor="status-notes" className="form-label text-muted">Status Notes</label>
                                                        <textarea
                                                            className={`form-control ${notesError ? 'is-invalid' : ''}`}
                                                            id="status-notes"
                                                            rows={3}
                                                            placeholder="Add notes..."
                                                            value={status_note}
                                                            maxLength={FUNDING_APPLICATION_STATUS_NOTE_MAX}
                                                            onChange={(e) => {
                                                                setStatusNote(e.target.value);
                                                                if (notesError) setNotesError('');
                                                            }}
                                                            disabled={!hasPermission("update funding application") || isClosed}
                                                        ></textarea>
                                                        {notesError && <div className="invalid-feedback">{notesError}</div>}
                                                        <div className="form-text text-end">
                                                            {status_note.length.toLocaleString('en-US')} / {FUNDING_APPLICATION_STATUS_NOTE_MAX.toLocaleString('en-US')}
                                                        </div>
                                                    </div>
                                                    {hasPermission("update funding application") && !isClosed && (
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
                                <div className="col-lg-8 mb-4 fa-step-col">
                                    <div className="fa-step-wrap">
                                        <div className="card mb-0 fa-step-card">
                                            <div className="card-header">
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <h5 className="card-title mb-0">
                                                        <i className={`${currentStepData?.icon} me-2`}></i>
                                                        Step {currentStep} of {STEPS.length}: {currentStepData?.title}
                                                    </h5>
                                                </div>
                                            </div>
                                            {/* Scrolls inside the card on desktop (fa-step-card) */}
                                            <div className="card-body p-4">
                                                {renderStepContent()}
                                            </div>
                                            <div className="card-footer bg-white d-flex justify-content-between py-3">
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

                            {/* Lender Information - host only (the API sends it only to the host),
                                below Application Status. */}
                            {isHost && Array.isArray(app.matched_lenders) && (
                                <LenderInformationCard
                                    cardRef={lenderCardRef}
                                    lenders={app.matched_lenders}
                                    assignedLenderIds={app.assigned_lender_ids || []}
                                    subjectLabel="funding application"
                                    onAssign={assignLender}
                                    isBusy={assignLenderMutation.isPending || updateMutation.isPending}
                                    // Optional and changeable in the editable statuses; past them, fixed once assigned.
                                    canAssign={app.can_assign_lender !== false}
                                    assignDisabledReason={`The lender can't be changed now that this application is "${app.status}".`}
                                    // Past the editable statuses with a lender: just that lender.
                                    onlyAssigned={app.can_assign_lender === false && (app.assigned_lender_ids || []).length > 0}
                                    notice={lenderNotice}
                                    highlightFirstRow={highlightLenders}
                                    emptyText={app.funding_request_id
                                        ? 'No matched lenders found for this funding type.'
                                        : 'No matched lenders found for the Preferred or Additional Funding Types.'}
                                />
                            )}
                        </div>

                        {/* Right Column (Activity Sidebar) */}
                        <div className="col-lg-4" >
                            <ActivitySidebar
                                entityId={id}
                                entityType="Funding Application"
                                loading={isLoading}
                                partnerId={app?.partner_id}
                                taskOwner={(() => {
                                    // No owner field of its own: its borrower's "Assign to".
                                    const assignId = (app as FundingApplicationDetailsType & { borrower?: { assign_id?: number | string | null } | null })?.borrower?.assign_id;
                                    return assignId ? { id: assignId } : null;
                                })()}
                                partnerEmail={undefined}
                                hostEmail={undefined}
                                isHost={isHost}
                                borrowerEmail={(app as FundingApplicationDetailsType & { borrower?: { email?: string | null } | null })?.borrower?.email}
                            />
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

            {/* Lender Required - the funding request page's modal */}
            <Modal isOpen={showMissingLenderModal} toggle={() => setShowMissingLenderModal(false)} onClosed={handleMissingLenderClosed} returnFocusAfterClose={false} centered size="md" contentClassName="border-0 shadow-lg" modalClassName="flip">
                <ModalBody className="p-0">
                    <div className="text-center pt-4 pb-3 px-2 rounded-top-3 bg-white">
                        <div className="avatar-md mx-auto mb-3">
                            <span className="avatar-title rounded-circle fs-22 text-white bg-dark">
                                <i className="ri-bank-line"></i>
                            </span>
                        </div>
                        <h5 className="fw-bold mb-1">Lender Required</h5>
                        <p className="text-muted fs-13 mb-0">
                            Assign to Lender. You can assign before <strong className="text-dark">{status}</strong>
                        </p>
                    </div>
                    <div className="p-4">
                        <div className="d-flex justify-content-center gap-3 mt-2">
                            <button
                                type="button"
                                className="btn btn-light fw-medium px-4"
                                onClick={() => setShowMissingLenderModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-dark fw-medium px-4"
                                onClick={requestGoToLenderInformation}
                            >
                                Got it, take me there! <i className="ri-arrow-right-line ms-1"></i>
                            </button>
                        </div>
                    </div>
                </ModalBody>
            </Modal>

            <FundedAmountModal
                show={showFundedModal}
                onHide={() => setShowFundedModal(false)}
                onConfirm={handleFundedConfirm}
                loading={updateMutation.isPending || saveCommissionMutation.isPending}
                initialAmount={fundedAmount}
                title="Status Update: Closed (Completed)"
                message="Since the status is Closed (Completed), please specify the final funded amount for this application."
                successFeeRate={parseFloat(app.total_commission?.toString() || '0')}
                adminCommissionRate={parseFloat(app.admin_commission?.toString() || '0')}
                partnerCommissionRate={parseFloat(app.partner_commission?.toString() || '0')}
                showPartnerCommission={showPartnerCommission}
                isCommissionSet={isCommissionSet}
                requestedAmount={requestedAmountValue}
                // As the Commission Details card: admin view with "update commission".
                canEditCommission={!isPartner && hasPermission('view commission') && hasPermission('update commission')}
                commissionErrors={closingCommissionErrors}
            />

            <DownloadPdfModal
                hasSignature={!!((app as any)?.signature_data) || !!(app?.certificates && app.certificates.length > 0)}
                show={showDownloadModal}
                onHide={() => setShowDownloadModal(false)}
                onDownload={async (type, password) => {
                    if (type === 'application') {
                        await downloadFundingApplication(id || '', password);
                    } else if (type === 'signature') {
                        await downloadFundingSignature(id || '', password);
                    } else if (type === 'both') {
                        await downloadFundingZip(id || '', password);
                    }
                    // Refresh data after download to show latest activity logs
                    queryClient.invalidateQueries({ queryKey: queryKeys.application.detail(id || '') });
                    window.dispatchEvent(new Event('refreshActivities'));
                }}
            />
        </>
    );
}
