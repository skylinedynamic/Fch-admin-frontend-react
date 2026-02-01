import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ClientForm from './components/ClientForm';
// @ts-ignore - JSX component imported in TSX file
import ActivitySidebar from '../../components/Common/Activity/ActivitySidebar';
// @ts-ignore - JSX component imported in TSX file
import EmailComposeModal from '../../components/Common/Modals/EmailComposeModal';
// @ts-ignore - JSX component imported in TSX file
import ActivityCreateModal from '../../components/Common/Modals/ActivityCreateModal';
// @ts-ignore
import { createClient, updateClient, fetchClientById, fetchClientChecklist, saveClientChecklist, fetchBorrowerProfileStats } from '../../modules/client/services';
// @ts-ignore
import { fetchSettings } from '../../modules/settings/services'; 
import { fetchNonHostBorrowerPlans } from '../../modules/partner/services';
import type { Client, ChecklistItem } from '../../modules/client/types';
import { locationData } from '../../config';
import { usePermissions } from '../../lib/auth/usePermissions';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth/authStore';
// @ts-ignore
import LeadPaymentModal from '../leads/components/LeadPaymentModal';
// ENROLLMENT_TYPE_OPTIONS removed - using dynamic settings instead


export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { hasPermission } = usePermissions();
    const currentUser = useAuthStore((state) => state.user);
    const isHost = currentUser?.is_host === 1;

    // Permission checks
    const canCreate = hasPermission('create clients');
    const canUpdate = hasPermission('update clients');

    // Access control: redirect to access-denied if lacks required permission
    if (id && !canUpdate) {
        return <Navigate to="/access-denied" replace />;
    }
    if (!id && !canCreate) {
        return <Navigate to="/access-denied" replace />;
    }

    const [activeTab, setActiveTab] = useState('personalDetails');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [originalChecklist, setOriginalChecklist] = useState<ChecklistItem[]>([]); // To detect changes if needed

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [newBorrowerId, setNewBorrowerId] = useState<string | number | null>(null);
    const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | number | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);

    // Profile stats state
    const [profileStats, setProfileStats] = useState({
        total_meetings: 0,
        total_invoices: 0,
        enrollment_type: 'N/A',
        total_prequalification: 0,
        total_tickets: 0,
        total_documents: 0
    });
    const [statsLoading, setStatsLoading] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [nonHostPlan, setNonHostPlan] = useState<any>(null);

    // Initial form state
    const [formData, setFormData] = useState<Client>({
        // Personal Details
        first_name: '',
        last_name: '',
        phone_number: '',
        country_code: '+1',
        email: '',
        signup_id: '',
        website: '',

        // Business Info
        legal_business_name: '',
        business_ein: '',
        state_file_number: '',
        duns_number: '',
        business_address: '',
        country: 'United States',
        city: '',
        other_city: '',
        state: '',
        business_zip: '',
        business_phone: '',
        entity_type: '',
        industry_type: '',
        business_start_date: '',
        ssn_last_4: '',
        enrollment_type: '',
        notes: '',

        // Financials
        currency: 'USD',
        monthly_revenue: '',
        avg_bank_balance: '',
        annual_revenue: '',
        profit_margin: '',
        current_business_debt: '',
        fico_score: '',
        paydex_score: '',
        years_in_business: '',
        number_of_employees: '',
        nsf_days: '',
        funding_urgency: ''
    });

    // Location data state
    const [countries] = useState(
        Object.keys(locationData).map((key) => ({
            label: locationData[key].name,
            value: locationData[key].name
        }))
    );
    const [states, setStates] = useState<{ label: string; value: string }[]>([]);
    const [cities, setCities] = useState<{ label: string; value: string }[]>([]);

    // Check for activeTab in navigation state (redirect from create)
    useEffect(() => {
        if (location.state && location.state.activeTab) {
            setActiveTab(location.state.activeTab);
            // Optional: clear state so refresh doesn't keep resetting? 
            // Standard behavior usually fine, but let's keep it simple.
        }
    }, [location.state]);

    // Handle cascading    // Load Data and Settings on Mount
    useEffect(() => {
        const loadInitialData = async () => {
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

        // Find country code based on Name
        const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === formData.country);
        const countryCode = countryEntry ? countryEntry[0] : (formData.country === 'USA' ? 'USA' : 'USA'); // Default fallback/handling

        if (countryCode && locationData[countryCode]) {
            const stateOptions = Object.keys(locationData[countryCode].states).map((key) => ({
                label: locationData[countryCode].states[key].name,
                value: locationData[countryCode].states[key].name
            }));
            setStates(stateOptions);
        } else {
            setStates([]);
        }

        // State -> City
        if (countryCode && formData.state && locationData[countryCode]) {
            const stateEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === formData.state);
            const stateCode = stateEntry ? stateEntry[0] : null;

            if (stateCode) {
                const cityList = locationData[countryCode].states[stateCode].cities;
                const cityOptions = cityList.map((city: string) => ({ label: city, value: city }));
                setCities(cityOptions);
            } else {
                setCities([]);
            }
        } else {
            setCities([]);
        }
    }, [formData.country, formData.state]);

    // Fetch client data if id exists
    useEffect(() => {
        const loadData = async () => {
            if (!id) return;

            setIsLoading(true);
            try {
                // Fetch both in parallel
                await Promise.all([fetchClient(), fetchChecklist(), fetchProfileStats()]);
            } catch (error) {
                console.error("Error loading data", error);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchClient = async () => {
            try {
                const response: any = await fetchClientById(id as string);
                if (response) {
                    // Check if response has 'data' property (Laravel Resource format)
                    const clientData = response.data || response;

                    // Logic to handle "Others" city if the fetched city isn't in valid list
                    let finalCity = clientData.city;
                    let finalOtherCity = clientData.other_city;

                    // Normalize Country: If it matches a key in locationData, convert to Name
                    let finalCountry = clientData.country;
                    if (locationData[finalCountry]) {
                        finalCountry = locationData[finalCountry].name;
                    }

                    // Normalize State: Name lookup needs Country Code first
                    let finalState = clientData.state;
                    // Find code for finalCountry
                    const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === finalCountry);
                    const countryCode = countryEntry ? countryEntry[0] : null;

                    if (countryCode && locationData[countryCode] && locationData[countryCode].states[finalState]) {
                        // It was a code, convert to Name
                        finalState = locationData[countryCode].states[finalState].name;
                    }

                    if (finalCountry && finalState && finalCity && finalCity !== 'Others') {
                        const searchCountryCode = countryCode || 'USA'; // fallback
                        // Find state code if finalState is Name
                        let stateCode = null;
                        if (locationData[searchCountryCode]) {
                            const sEntry = Object.entries(locationData[searchCountryCode].states).find(([key, val]) => val.name === finalState);
                            stateCode = sEntry ? sEntry[0] : finalState; // fallback to value itself
                        }

                        // Reconstruct logic from useEffect that derived cities
                        if (locationData[searchCountryCode] && locationData[searchCountryCode].states[stateCode]) {
                            const validCities = locationData[searchCountryCode].states[stateCode].cities;
                            if (!validCities.includes(finalCity)) {
                                // fetched city is NOT in the accepted list -> it's an "Others" city
                                finalCity = 'Others';
                                finalOtherCity = clientData.city;
                            }
                        }
                    }

                    setFormData(prev => ({
                        ...prev,
                        ...clientData,
                        country: finalCountry,
                        state: finalState,
                        city: finalCity,
                        other_city: finalOtherCity
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch client details", error);
                toast.error("Failed to load client details");
            }
        };

        const fetchChecklist = async () => {
            try {
                const response = await fetchClientChecklist(id as string);
                if (response && response.data) {
                    const sortedList = response.data.sort((a: ChecklistItem, b: ChecklistItem) => a.sort_order - b.sort_order);
                    setChecklist(sortedList);
                    setOriginalChecklist(JSON.parse(JSON.stringify(sortedList)));
                }
            } catch (error) {
                console.error("Failed to fetch checklist", error);
            }
        };

        const fetchProfileStats = async () => {
            try {
                setStatsLoading(true);
                const response = await fetchBorrowerProfileStats(id as string);
                if (response && response.status && response.data) {
                    setProfileStats({
                        total_meetings: response.data.total_meetings || 0,
                        total_invoices: response.data.total_invoices || 0,
                        enrollment_type: response.data.enrollment_type || 'N/A',
                        total_prequalification: response.data.total_prequalification || 0,
                        total_tickets: response.data.total_tickets || 0,
                        total_documents: response.data.total_documents || 0
                    });
                }
            } catch (error) {
                console.error("Failed to fetch profile stats", error);
            } finally {
                setStatsLoading(false);
            }
        };

        loadData();
    }, [id]);

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

            // Handle cascading clears
            if (name === 'country') {
                newData.state = '';
                newData.city = '';
            } else if (name === 'state') {
                newData.city = '';
            } else if (name === 'city' && value !== 'Others') {
                newData.other_city = '';
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

    const handleChecklistChange = (itemId: number) => {
        setChecklist(prev => prev.map(item =>
            item.id === itemId ? { ...item, current_status: !item.current_status } : item
        ));
    };

    const handleSave = async (e: React.FormEvent | React.MouseEvent) => {
        if (e && e.preventDefault) e.preventDefault();

        setErrors({}); // Clear previous errors
        setIsSaving(true);

        try {
            if (!id) {
                // CREATE NEW CLIENT
                const payload = { ...formData };
                if (payload.city === 'Others') {
                    payload.city = payload.other_city;
                }
                
                // Calculate Enrollment Type and Amount - ACCURATE LEAD PATTERN
                let amount = 0;
                let enrollment_type = payload.enrollment_type;

                if (isHost) {
                    amount = payload.payment_amount ? parseFloat(payload.payment_amount as string) : 0;
                } else {
                    amount = nonHostPlan.payment_amount ? parseFloat(nonHostPlan.payment_amount) : 0;
                    enrollment_type = nonHostPlan.enrollment_type;
                }

                // Accurate Payload Fields
                // @ts-ignore
                payload.amount = amount;
                payload.enrollment_type = enrollment_type;
                // @ts-ignore
                payload.payment_amount = amount; // Keeping both for safety as per earlier user request "payment_amount in payload"
                // @ts-ignore
                payload.entity_type = 'Borrower';

                const response: any = await createClient(payload);
                
                // Handle Payment for Non-Hosts - ACCURATE LEAD PATTERN (is_host == 0)
                const clientData = response.data || response;
                const bId = clientData?.borrower?.id || clientData?.id || response.id;
                const invId = response.data?.invoice?.id || clientData?.invoice?.id || response.invoice?.id || null;

                if (!isHost && bId && amount > 0) {
                    setNewBorrowerId(bId);
                    setPaymentInvoiceId(invId);
                    setPaymentAmount(amount);
                    
                    // Sync formData with response
                    setFormData(prev => ({ ...prev, ...clientData }));
                    
                    setShowPaymentModal(true);
                    toast.success("Client created. Please complete the payment.");
                    return;
                }

                toast.success("Client created successfully");

                // Redirect to edit page and switch to business financials tab
                if (clientData && clientData.id) {
                    navigate(`/clients/${clientData.id}`, { state: { activeTab: 'businessFinancials' } });
                } else {
                    navigate('/clients');
                }
            } else {
                // UPDATE EXISTING CLIENT

                if (activeTab === 'documentChecklist') {
                    // SAVE CHECKLIST ONLY
                    const checkedIds = checklist.filter(item => item.current_status).map(item => item.id);
                    await saveClientChecklist(id, checkedIds);
                    toast.success("Document checklist saved successfully");
                } else if (activeTab === 'documents') {
                    // Do nothing or maybe valid saving documents logic if needed
                    // Usually documents are uploaded individually.
                    toast.info("Please upload documents using the specific upload buttons.");
                } else {
                    // SAVE CLIENT DETAILS (Info or Financials)
                    const payload = { ...formData };
                    if (payload.city === 'Others') {
                        payload.city = payload.other_city;
                    }

                    await updateClient(id, payload);
                    toast.success("Client updated successfully");
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


                    // Show a general toast if there are errors, to alert user
                    // toast.error("Please check the form for errors.");
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
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="container-fluid">
                {/* Page Header */}
                <div className="row pb-1 page-subheader-sticky bg-body">
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
                                <button
                                    type="button"
                                    className="btn btn-primary w-lg waves-effect"
                                    onClick={handleSave}
                                    disabled={isSaving || isLoading}
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-save-3-line align-middle me-1"></i> Save
                                        </>
                                    )}
                                </button>
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
                    <div className="col-xxl-12">
                        <div className="card">
                            <div className="card-header">
                                <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === 'personalDetails' ? 'active' : ''}`}
                                            onClick={() => handleTabChange('personalDetails')}
                                            type="button"
                                            role="tab"
                                        >
                                            <i className="fas fa-home"></i> Client Info
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === 'businessFinancials' ? 'active' : ''}`}
                                            onClick={() => handleTabChange('businessFinancials')}
                                            type="button"
                                            role="tab"
                                            disabled={!id}
                                        >
                                            <i className="far fa-user"></i> Business Financials
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === 'documentChecklist' ? 'active' : ''}`}
                                            onClick={() => handleTabChange('documentChecklist')}
                                            type="button"
                                            role="tab"
                                            disabled={!id}
                                        >
                                            <i className="far fa-envelope"></i> Document Checklist
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === 'documents' ? 'active' : ''}`}
                                            onClick={() => handleTabChange('documents')}
                                            type="button"
                                            role="tab"
                                            disabled={!id}
                                        >
                                            <i className="far fa-envelope"></i> Documents
                                        </button>
                                    </li>
                                </ul>

                            </div>
                            <div className="card-body p-4">
                                <ClientForm
                                    activeTab={activeTab}
                                    formData={formData}
                                    errors={errors}
                                    handleInputChange={handleInputChange}
                                    countries={countries}
                                    states={states}
                                    cities={cities}
                                    checklist={checklist}
                                    handleChecklistChange={handleChecklistChange}
                                    isLoading={isLoading}
                                    isHost={isHost}
                                    // @ts-ignore
                                    settings={settings}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Activity Sidebar */}
                    {/* <div className="col-xxl-4">
                        <ActivitySidebar entityId={id} entityType="Client" />
                    </div> */}
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
                    entity_type: 'Borrower'
                }} // Pass constructed contact_person and role for modal UI/Logic accuracy
                borrowerId={newBorrowerId}
                invoiceId={paymentInvoiceId}
                amount={paymentAmount}
            />
        </div>
    );
}
