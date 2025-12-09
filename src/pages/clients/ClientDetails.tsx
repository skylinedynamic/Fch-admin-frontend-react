import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ClientForm from './components/ClientForm';
import { createClient, updateClient, fetchClientById } from '../../modules/client/services';
import type { Client } from '../../modules/client/types';
import { locationData } from '../../config/locations';

export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('personalDetails');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Initial form state
    const [formData, setFormData] = useState<Client>({
        // Personal Details
        first_name: '',
        last_name: '',
        phone_number: '',
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
        const fetchClient = async () => {
            if (!id) return;

            setIsLoading(true);
            try {
                const response: any = await fetchClientById(id);
                if (response) {
                    // Check if response has 'data' property (Laravel Resource format)
                    const clientData = response.data || response;

                    setFormData(prev => ({
                        ...prev,
                        ...clientData,
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch client details", error);
                toast.error("Failed to load client details");
            } finally {
                setIsLoading(false);
            }
        };

        fetchClient();
    }, [id]);

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

    const handleSave = async (e: React.FormEvent | React.MouseEvent) => {
        if (e && e.preventDefault) e.preventDefault();

        setErrors({}); // Clear previous errors
        setIsLoading(true);

        try {
            if (id) {
                await updateClient(id, formData);
                toast.success("Client updated successfully");
            } else {
                const response: any = await createClient(formData);
                toast.success("Client created successfully");

                // Check if response has 'data' property
                const clientData = response.data || response;

                // Redirect to edit page and switch to business financials tab
                if (clientData && clientData.id) {
                    navigate(`/clients/${clientData.id}`, { state: { activeTab: 'businessFinancials' } });
                } else {
                    navigate('/clients');
                }
            }
        } catch (error: any) {
            console.error("Save error:", error);

            // Handle backend validation errors
            if (error.response && error.response.data) {
                const { errors: backendErrors } = error.response.data;

                if (backendErrors) {
                    // Map backend errors to state
                    // The backend might return array of strings for each field or just a string
                    const mappedErrors: Record<string, string> = {};
                    Object.keys(backendErrors).forEach(key => {
                        mappedErrors[key] = Array.isArray(backendErrors[key])
                            ? backendErrors[key][0]
                            : backendErrors[key];
                    });
                    setErrors(mappedErrors);
                }
            }
        } finally {
            setIsLoading(false);
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
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
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

                {/* Metrics Strip (Only show if editing or desired) */}
                <div className="row pt-1">
                    <div className="col-12">
                        <div className="d-flex flex-wrap metrics-strip justify-content-center">
                            {/* Metrics placeholders as per original design */}
                            <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                <i className="ri-calendar-line me-2 text-warning fs-4"></i>
                                <div className="metrics-content">
                                    <div className="metrics-label text-muted">Meetings</div>
                                    <div className="metrics-value fw-semibold">0</div>
                                </div>
                            </a>
                            <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                <i className="ri-bill-line me-2 text-warning fs-4"></i>
                                <div className="metrics-content">
                                    <div className="metrics-label text-muted">Invoiced</div>
                                    <div className="metrics-value fw-semibold">0</div>
                                </div>
                            </a>
                            <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                <i className="ri-refresh-line me-2 text-warning fs-4"></i>
                                <div className="metrics-content">
                                    <div className="metrics-label text-muted">Subscriptions</div>
                                    <div className="metrics-value fw-semibold">N/A</div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-xxl-8">
                        <div className="card">
                            <div className="card-header">
                                <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === 'personalDetails' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('personalDetails')}
                                            type="button"
                                            role="tab"
                                        >
                                            <i className="fas fa-home"></i> Client Info
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === 'businessFinancials' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('businessFinancials')}
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
                                            onClick={() => setActiveTab('documentChecklist')}
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
                                            onClick={() => setActiveTab('documents')}
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
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
