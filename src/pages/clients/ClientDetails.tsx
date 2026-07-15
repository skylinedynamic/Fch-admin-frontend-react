import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import ClientForm from './components/ClientForm';
import { ClientInfoSectionRef } from './components/ClientInfoSection';
import { BusinessFinancialsSectionRef } from './components/BusinessFinancialsSection';
import { DocumentChecklistSectionRef } from './components/DocumentChecklistSection';
// @ts-ignore - JSX component imported in TSX file
import ActivitySidebar from '../../components/Common/Activity/ActivitySidebar';
// @ts-ignore - JSX component imported in TSX file
import EmailComposeModal from '../../components/Common/Modals/EmailComposeModal';
// @ts-ignore - JSX component imported in TSX file
import ActivityCreateModal from '../../components/Common/Modals/ActivityCreateModal';
// @ts-ignore
import {
    useClientProfileStats,
    useClient,
    createClient,
    updateClient,
    DEFAULT_CLIENT_STATE,
    ENROLLMENT_TABS,
    mapClientPayload
} from '../../modules/client';
import { fetchSettings } from '../../modules/settings/services';
import { fetchNonHostBorrowerPlans } from '../../modules/partner/services';
import { apiClient } from '../../lib/http/apiClient';
import type { Client, ClientProfileStats } from '../../modules/client/types';
import { locationData } from '../../config';
import { usePermissions } from '../../lib/auth/usePermissions';
import { scrollToFirstError } from '../../utils/formUtils';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth/authStore';
import { PARTNER_TYPES } from '../../config/partnerTypeOptions';
// @ts-ignore
import LeadPaymentModal from '../leads/components/LeadPaymentModal';
// ENROLLMENT_TYPE_OPTIONS removed - using dynamic settings instead


export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { hasPermission } = usePermissions();
    const currentUser = useAuthStore((state) => state.user);
    const isHost = currentUser?.is_host == 1;
    const canCreate = hasPermission('create clients');
    const canUpdate = hasPermission('update clients');

    const [activeTab, setActiveTab] = useState(ENROLLMENT_TABS.PERSONAL);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [newBorrowerId, setNewBorrowerId] = useState<string | number | null>(null);
    const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | number | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);

    // Profile stats state
    const [profileStats, setProfileStats] = useState<ClientProfileStats>({
        total_meetings: 0,
        total_invoices: 0,
        enrollment_type: 'N/A',
        total_prequalification: 0,
        total_tickets: 0,
        total_documents: 0
    });
    // const [statsLoading, setStatsLoading] = useState(false); // Managed by Query
    const [settings, setSettings] = useState<any>(null);
    const [nonHostPlan, setNonHostPlan] = useState<any>(null);
    const [fixedEnrollmentAmount, setFixedEnrollmentAmount] = useState<number>(0);

    // Refs for Child Components
    const clientInfoRef = useRef<ClientInfoSectionRef>(null);
    const financialsRef = useRef<BusinessFinancialsSectionRef>(null);
    const checklistRef = useRef<DocumentChecklistSectionRef>(null);

    // Initial form state
    const [formData, setFormData] = useState<Client>(DEFAULT_CLIENT_STATE);

    // Location data state for Create Mode or simple passing (Child manages detailed logic)
    const [countries] = useState(
        Object.keys(locationData).map((key) => ({
            label: locationData[key].name,
            value: locationData[key].name
        }))
    );
    // Parent doesn't need states/cities anymore for its own rendering, 
    // but ClientForm might expect them if we kept the props. 
    // We removed them from ClientInfoSection props usage but kept in ClientForm? 
    // Actually ClientForm passes them to ClientInfoSection. 
    // But ClientInfoSection ignores them now.
    // So we can pass empty arrays or remove the props from ClientForm.
    // Let's pass empty arrays to satisfy TS for now, or remove if we update ClientForm.
    // Update: ClientDetails passes `states` and `cities` to ClientForm. 
    // Ideally we should remove them from ClientForm props too, but to minimize changes:
    const [states, setStates] = useState<{ label: string; value: string }[]>([]);
    const [cities, setCities] = useState<{ label: string; value: string }[]>([]);


    // Check for activeTab in navigation state (redirect from create)
    useEffect(() => {
        if (location.state && location.state.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);

    // Profile Stats Query
    const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useClientProfileStats(id as string, !!id);
    const { data: clientFullData, refetch: refetchClient } = useClient(id as string, !!id);

    const handleRefresh = () => {
        refetchStats();
        refetchClient();
    };

    // Effect to update form data when full data arrives
    useEffect(() => {
        if (clientFullData) {
            // @ts-ignore
            const apiData = clientFullData.data || clientFullData;
            setFormData(prev => ({ ...prev, ...apiData }));
        }
    }, [clientFullData]);

    // Effect to update stats state when data arrives
    useEffect(() => {
        if (statsData && statsData.data) {
            setProfileStats({
                total_meetings: statsData.data.total_meetings || 0,
                total_invoices: statsData.data.total_invoices || 0,
                enrollment_type: statsData.data.enrollment_type || 'N/A',
                total_prequalification: statsData.data.total_prequalification || 0,
                total_tickets: statsData.data.total_tickets || 0,
                total_documents: statsData.data.total_documents || 0
            });
        }
    }, [statsData]);

    // Initial Data Loading Effect (Settings only)
    useEffect(() => {
        const fetchFixedPlan = async () => {
            try {
                const response = await apiClient.get('/common/partner-plans/fixed-enrollment');
                if (response.data?.status && response.data?.data?.payment_amount) {
                    setFixedEnrollmentAmount(Number(response.data.data.payment_amount));
                }
            } catch (error) {
                console.error('Failed to fetch fixed enrollment plan:', error);
            }
        };

        const loadInitialData = async () => {
            // ... kept same ...
            try {
                const settingPromise = fetchSettings();
                const promises = [settingPromise];

                if (!isHost) {
                    promises.push(fetchNonHostBorrowerPlans());
                }

                const results = await Promise.all(promises);
                const settingsRes = results[0];
                const plansRes = !isHost ? results[1] : null;

                if (settingsRes.status) {
                    setSettings(settingsRes.data);
                }

                // @ts-ignore
                if (plansRes && plansRes.status && plansRes.data && plansRes.data.length > 0) {
                    // @ts-ignore
                    setNonHostPlan(plansRes.data[0]);
                }
            } catch (err) {
                console.error('Failed to fetch settings:', err);
            }
        };
        loadInitialData();
        fetchFixedPlan();
        // Removed redundant location logic here. Child handles it.
    }, []);

    // Fetch Stats only (Client Data fetched by Child)
    // Refactored to use useClientProfileStats hook above
    // useEffect(() => {
    //    // ...
    // }, [id]);

    const handleTabChange = (tabInfo: string) => {
        if (activeTab === tabInfo) return;

        setIsLoading(true);
        setActiveTab(tabInfo);

        // Simulate loading delay for skeleton check
        setTimeout(() => {
            setIsLoading(false);
        }, 500);
    };

    const handleInputChange = (e: any) => {
        // Handle both standard events and custom objects from our components
        const name = e.target ? e.target.name : e.name;
        const value = e.target ? e.target.value : e.value;

        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            if (name === 'enrollment_payment') {
                newData.payment_amount = value;
                newData.amount = value;
            }

            // Handle cascading clears
            if (name === 'country') {
                newData.state = '';
                newData.city = '';
            } else if (name === 'state') {
                newData.city = '';
            } else if (name === 'city' && value !== 'Others') {
                newData.other_city = '';
            } else if (name === 'business_country') {
                newData.business_state = '';
                newData.business_city = '';
            } else if (name === 'business_state') {
                newData.business_city = '';
            } else if (name === 'business_city' && value !== 'Others') {
                newData.business_other_city = '';
            }

            return newData;
        });

        // Clear error for the field being edited
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };



    const handleSave = async (e: React.FormEvent | React.MouseEvent) => {
        if (e && e.preventDefault) e.preventDefault();

        setErrors({}); // Clear previous errors
        setIsSaving(true);


        try {
            if (!id) {
                // CREATE NEW CLIENT - Use centralized mapping logic
                const payload = mapClientPayload(formData, isHost, nonHostPlan);

                const amount = payload.payment_amount ? parseFloat(payload.payment_amount as string) : 0;

                const response: any = await createClient(payload);

                const clientData = response?.data?.data || response?.data || response;
                const bId = clientData?.id || clientData?.borrower_id;
                const invId = clientData?.invoice_id;

                const isWLOrCP = currentUser?.partner_type === PARTNER_TYPES.WHITE_LABEL || currentUser?.partner_type === PARTNER_TYPES.CERTIFIED;

                if (!isHost && !isWLOrCP && bId && amount > 0) {
                    setNewBorrowerId(bId);
                    setPaymentInvoiceId(invId);
                    setPaymentAmount(amount);

                    // Sync formData with response
                    setFormData(prev => ({ ...prev, ...clientData }));

                    setShowPaymentModal(true);
                    toast.success("Client created. Please complete the payment.");
                    return;
                }


                if (isWLOrCP) {
                    toast.success(`Client created successfully.`);
                } else {
                    toast.success("Client created successfully");
                }

                if (clientData && clientData.id) {
                    window.dispatchEvent(new Event('refreshActivities'));
                    navigate(`/clients/${clientData.id}`, { state: { activeTab: 'businessFinancials' } });
                } else {
                    window.dispatchEvent(new Event('refreshActivities'));
                    navigate('/clients');
                }
            } else {
                // UPDATE EXISTING CLIENT (Use Refs)
                let updateSuccess = false;

                if (activeTab === ENROLLMENT_TABS.PERSONAL && clientInfoRef.current) {
                    await clientInfoRef.current.save();
                    window.dispatchEvent(new Event('refreshActivities'));
                    updateSuccess = true;
                } else if (activeTab === ENROLLMENT_TABS.FINANCIALS && financialsRef.current) {
                    await financialsRef.current.save();
                    window.dispatchEvent(new Event('refreshActivities'));
                    updateSuccess = true;
                } else if (activeTab === ENROLLMENT_TABS.CHECKLIST && checklistRef.current) {
                    await checklistRef.current.save();
                    toast.success("Document checklist saved successfully");
                    window.dispatchEvent(new Event('refreshActivities'));
                    updateSuccess = true;
                } else if (activeTab === ENROLLMENT_TABS.DOCUMENTS) {
                    toast.info("Please upload documents using the specific upload buttons.");
                } else if (activeTab === ENROLLMENT_TABS.CREDIT_PROFILE) {
                    toast.info("Please use the 'Save Credit Profile' button in the validation panel.");
                } else {
                    // Fallback
                    toast.warn("No handler for this tab.");
                    window.dispatchEvent(new Event('refreshActivities'));
                }

                if (updateSuccess) {
                    const tabOrder = [
                        ENROLLMENT_TABS.PERSONAL,
                        ENROLLMENT_TABS.FINANCIALS,
                        ENROLLMENT_TABS.CHECKLIST,
                        ENROLLMENT_TABS.DOCUMENTS
                    ];
                    const currentIndex = tabOrder.indexOf(activeTab);
                    const nextTab = tabOrder[currentIndex + 1];

                    if (nextTab) {
                        setTimeout(() => navigate(`/clients/${id}`, { state: { activeTab: nextTab } }), 800);
                    } else {
                        setTimeout(() => navigate(`/clients/${id}`, { state: { activeTab: activeTab } }), 800);
                    }
                }
            }
        } catch (error: any) {
            console.error("Save erroraaaa:", error);

            // Handle backend validation errors
            if (error.response && error.response.data) {
                const { errors: backendErrors, message } = error.response.data;

                if (backendErrors) {
                    const mappedErrors: Record<string, string> = {};
                    Object.keys(backendErrors).forEach(key => {
                        mappedErrors[key] = Array.isArray(backendErrors[key])
                            ? backendErrors[key][0]
                            : backendErrors[key];
                    });
                    setErrors(mappedErrors);
                    scrollToFirstError(mappedErrors);
                } else if (message) {
                    // toast.error(message);
                }
            } else {
                // toast.error("An error occurred while saving.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Page Header */}
                <div className="row pb-1 bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">{id ? 'Edit Client' : 'Add Client'} Details</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/clients">Clients</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">{id ? 'Edit Client' : 'Add Client'}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/clients" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                {(id ? canUpdate : canCreate) && ![ENROLLMENT_TABS.AGREEMENT, ENROLLMENT_TABS.DOCUMENTS, ENROLLMENT_TABS.CREDIT_PROFILE, ENROLLMENT_TABS.CAPITAL_ACCESS, ENROLLMENT_TABS.FUNDING_REQUESTS].includes(activeTab as any) && (
                                    <button
                                        type="button"
                                        className="btn btn-primary w-lg waves-effect"
                                        onClick={handleSave}
                                        disabled={isSaving || isLoading}
                                    >
                                        {isSaving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                {id ? 'Updating...' : 'Saving...'}
                                            </>
                                        ) : (
                                            <>
                                                <i className="ri-save-3-line align-middle me-1"></i> {id ? 'Update' : 'Save'}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics Strip (Only show if editing) */}
                {id && (
                    <div className="row pt-1">
                        <div className="col-12">
                            <div className="d-flex flex-wrap metrics-strip justify-content-center">
                                {statsLoading ? (
                                    <>
                                        {[1, 2, 3, 4, 5, 6].map((i) => (
                                            <div key={`skeleton-${i}`} className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative px-3 py-2 shadow-sm">
                                                <div className="placeholder-glow w-100">
                                                    <span className="placeholder col-12 mb-1"></span>
                                                    <span className="placeholder col-8"></span>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                            <i className="ri-calendar-line me-2 text-warning fs-4"></i>
                                            <div className="metrics-content">
                                                <div className="metrics-label text-muted">Meetings</div>
                                                <div className="metrics-value fw-semibold">{profileStats.total_meetings}</div>
                                            </div>
                                        </a>
                                        <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                            <i className="ri-bill-line me-2 text-warning fs-4"></i>
                                            <div className="metrics-content">
                                                <div className="metrics-label text-muted">Invoiced</div>
                                                <div className="metrics-value fw-semibold">{profileStats.total_invoices}</div>
                                            </div>
                                        </a>
                                        <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                            <i className="ri-refresh-line me-2 text-warning fs-4"></i>
                                            <div className="metrics-content">
                                                <div className="metrics-label text-muted">Subscriptions</div>
                                                <div className="metrics-value fw-semibold">{profileStats.enrollment_type}</div>
                                            </div>
                                        </a>
                                        <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                            <i className="ri-check-double-line me-2 text-primary fs-4"></i>
                                            <div className="metrics-content">
                                                <div className="metrics-label text-muted">Prequalification</div>
                                                <div className="metrics-value fw-semibold">{profileStats.total_prequalification}</div>
                                            </div>
                                        </a>
                                        <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                            <i className="ri-ticket-line me-2 text-info fs-4"></i>
                                            <div className="metrics-content">
                                                <div className="metrics-label text-muted">Tickets</div>
                                                <div className="metrics-value fw-semibold">{profileStats.total_tickets}</div>
                                            </div>
                                        </a>
                                        <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                            <i className="ri-file-text-line me-2 text-success fs-4"></i>
                                            <div className="metrics-content">
                                                <div className="metrics-label text-muted">Documents</div>
                                                <div className="metrics-value fw-semibold">{profileStats.total_documents}</div>
                                            </div>
                                        </a>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="row">
                    <div className={id && activeTab !== ENROLLMENT_TABS.CREDIT_PROFILE ? "col-xxl-8" : "col-12"}>
                        <div className="card">
                            <div className="card-header">
                                <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === ENROLLMENT_TABS.PERSONAL ? 'active' : ''}`}
                                            onClick={() => handleTabChange(ENROLLMENT_TABS.PERSONAL)}
                                            type="button"
                                            role="tab"
                                        >
                                            Client Info
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === ENROLLMENT_TABS.FINANCIALS ? 'active' : ''}`}
                                            onClick={() => handleTabChange(ENROLLMENT_TABS.FINANCIALS)}
                                            type="button"
                                            role="tab"
                                            disabled={!id}
                                        >
                                            Business Financials
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === ENROLLMENT_TABS.CHECKLIST ? 'active' : ''}`}
                                            onClick={() => handleTabChange(ENROLLMENT_TABS.CHECKLIST)}
                                            type="button"
                                            role="tab"
                                            disabled={!id}
                                        >
                                            Document Checklist
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === ENROLLMENT_TABS.DOCUMENTS ? 'active' : ''}`}
                                            onClick={() => handleTabChange(ENROLLMENT_TABS.DOCUMENTS)}
                                            type="button"
                                            role="tab"
                                            disabled={!id}
                                        >
                                            Documents
                                        </button>
                                    </li>

                                    {isHost && (
                                        <li className="nav-item">
                                            <button
                                                className={`nav-link ${activeTab === ENROLLMENT_TABS.TASK_LIST ? 'active' : ''}`}
                                                onClick={() => handleTabChange(ENROLLMENT_TABS.TASK_LIST)}
                                                type="button"
                                                role="tab"
                                                disabled={!id}
                                            >
                                                Task List
                                            </button>
                                        </li>
                                    )}

                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === ENROLLMENT_TABS.CREDIT_PROFILE ? 'active' : ''}`}
                                            onClick={() => handleTabChange(ENROLLMENT_TABS.CREDIT_PROFILE)}
                                            type="button"
                                            role="tab"
                                            disabled={!id}
                                        >
                                            Credit Profile
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === ENROLLMENT_TABS.CAPITAL_ACCESS ? 'active' : ''}`}
                                            onClick={() => handleTabChange(ENROLLMENT_TABS.CAPITAL_ACCESS)}
                                            type="button"
                                            role="tab"
                                            disabled={!id}
                                        >
                                            Capital Access
                                        </button>
                                    </li>

                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === ENROLLMENT_TABS.FUNDING_REQUESTS ? 'active' : ''}`}
                                            onClick={() => handleTabChange(ENROLLMENT_TABS.FUNDING_REQUESTS)}
                                            type="button"
                                            role="tab"
                                            disabled={!id}
                                        >
                                            <i className="fas fa-hand-holding-usd"></i> Funding Sequence
                                        </button>
                                    </li>
                                    {formData.has_sign && (
                                        <li className="nav-item">
                                            <button
                                                className={`nav-link ${activeTab === ENROLLMENT_TABS.AGREEMENT ? 'active' : ''}`}
                                                onClick={() => handleTabChange(ENROLLMENT_TABS.AGREEMENT)}
                                                type="button"
                                                role="tab"
                                            >
                                                Agreement
                                            </button>
                                        </li>
                                    )}
                                </ul>

                            </div>
                            <div className="card-body p-4">
                                <ClientForm
                                    clientId={id}
                                    activeTab={activeTab}
                                    personalRef={clientInfoRef}
                                    financialRef={financialsRef}
                                    checklistRef={checklistRef}
                                    formData={formData}
                                    errors={errors}
                                    handleInputChange={handleInputChange}
                                    countries={countries}
                                    states={states}
                                    cities={cities}
                                    isLoading={isLoading}
                                    isHost={isHost}
                                    // @ts-ignore
                                    settings={settings}
                                    nonHostPlan={nonHostPlan}
                                    onRefresh={handleRefresh}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Activity Sidebar */}
                    {id && activeTab !== ENROLLMENT_TABS.CREDIT_PROFILE && (
                        <div className="col-xxl-4">
                            <ActivitySidebar entityId={id} entityType="Client" loading={isSaving} borrowerEmail={formData.email} />
                        </div>
                    )}
                </div>
            </div>
            <EmailComposeModal entityId={id} entityType="Client" />
            <ActivityCreateModal entityId={id} entityType="Client" />

            <LeadPaymentModal
                show={showPaymentModal}
                onHide={() => {
                    setShowPaymentModal(false);
                    // On close/cancel, maybe still navigate to edit page so they don't lose created client?
                    // Or let them stay on create page? 
                    // Usually safer to navigate to the created client so they aren't stuck on "create" form with "update" logic pending?
                    // But if they cancel payment, they might want to retry?
                    // Let's navigate to edit page just like success, but maybe with a warning? 
                    // For now, let's just close modal. If they check "Clients" list, the client exists.
                    if (newBorrowerId) {
                        navigate(`/clients/${newBorrowerId}`, { state: { activeTab: 'businessFinancials' } });
                    }
                }}
                onSuccess={() => {
                    setShowPaymentModal(false);
                    // toast.success("Client payment completed successfully!");
                    if (newBorrowerId) {
                        navigate(`/clients/${newBorrowerId}`, { state: { activeTab: 'businessFinancials' } });
                    } else {
                        navigate('/clients');
                    }
                }}
                lead={{
                    ...formData,
                    contact_person: `${formData.first_name} ${formData.last_name}`.trim(),
                    entity_type: 'Borrower',
                    is_partner_paying: !isHost
                }} // Pass constructed contact_person and role for modal UI/Logic accuracy
                borrowerId={newBorrowerId}
                invoiceId={paymentInvoiceId}
                amount={paymentAmount}
            />
        </div>
    );
}