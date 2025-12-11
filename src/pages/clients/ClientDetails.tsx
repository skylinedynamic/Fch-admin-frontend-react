import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ClientForm from './components/ClientForm';
import { createClient, updateClient, fetchClientById, fetchClientChecklist, saveClientChecklist, fetchBorrowerProfileStats } from '../../modules/client/services';
import type { Client, ChecklistItem } from '../../modules/client/types';
import { locationData } from '../../config/locations';

export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('personalDetails');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [originalChecklist, setOriginalChecklist] = useState<ChecklistItem[]>([]); // To detect changes if needed

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
        country: 'USA',
        city: '',
        other_city: '',
        state: '',
        business_zip: '',
        business_phone: '',
        entity_type: '',
        industry_type: '',
        business_start_date: '',
        ssn_last_4: '',
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
        time_in_business: '',
        funding_urgency: ''
    });

    // Location data state
    const [countries] = useState(
        Object.keys(locationData).map((key) => ({
            label: locationData[key].name,
            value: key
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

    // Handle cascading location logic
    useEffect(() => {
        // Country -> State
        // Default to USA if no country set (or based on business requirement)
        const countryCode = formData.country || 'USA';

        if (locationData[countryCode]) {
            const stateOptions = Object.keys(locationData[countryCode].states).map((key) => ({
                label: locationData[countryCode].states[key].name,
                value: key
            }));
            setStates(stateOptions);
        } else {
            setStates([]);
        }

        // State -> City
        if (countryCode && formData.state && locationData[countryCode]?.states[formData.state]) {
            const cityList = locationData[countryCode].states[formData.state].cities;
            const cityOptions = cityList.map((city: string) => ({ label: city, value: city }));
            setCities(cityOptions);
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

                    if (clientData.country && clientData.state && clientData.city && clientData.city !== 'Others') {
                        const countryCode = clientData.country;
                        const stateCode = clientData.state;

                        // Reconstruct logic from useEffect that derived cities
                        if (locationData[countryCode] && locationData[countryCode].states[stateCode]) {
                            const validCities = locationData[countryCode].states[stateCode].cities;
                            if (!validCities.includes(clientData.city)) {
                                // fetched city is NOT in the accepted list -> it's an "Others" city
                                finalCity = 'Others';
                                finalOtherCity = clientData.city;
                            }
                        }
                    }

                    setFormData(prev => ({
                        ...prev,
                        ...clientData,
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
                // Ensure country_code is handled if needed, or rely on formData

                const response: any = await createClient(payload);
                toast.success("Client created successfully");

                // Check if response has 'data' property
                const clientData = response.data || response;

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
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column">
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
                    <div className="col-xxl-8">
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
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
