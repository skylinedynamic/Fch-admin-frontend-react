import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getLead, createLeadDetails, updateLeadDetails, updateLeadContactInfo, convertLead, fetchGlobalStats } from '../../modules/leads/services';
import { allUsers } from '../../modules/partner/services';
import { usePermissions } from '../../lib/auth/usePermissions';
import { useAuthStore } from '../../store/auth/authStore';
import { Navigate } from 'react-router-dom';
import ProfileMetricCard from '../../components/Common/ProfileMetricCard';
import ProfileMetricCardSkeleton from '../../components/Common/ProfileMetricCardSkeleton';
import EmailComposeModal from '../../components/Common/Modals/EmailComposeModal';
import ActivityCreateModal from '../../components/Common/Modals/ActivityCreateModal';
import ActivitySidebar from '../../components/Common/Activity/ActivitySidebar';
import FormLoader from '../../components/Loader/FormLoader';
import { Dropdown } from 'primereact/dropdown';
import {
    LEAD_PROBABILITY_OPTIONS,
    LEAD_TYPE_OPTIONS,
    LEAD_STATUS_OPTIONS,
    LEAD_SOURCE_OPTIONS,
    LEAD_ENTITY_TYPE_OPTIONS,
    LEAD_INDUSTRY_TYPE_OPTIONS
} from '../../config/leadOptions';
import { locationData } from '../../config';
import { formatPhoneNumber } from '../../utils/formatters';
import { useSummernote } from '../../hooks/useSummernote';
import Flatpickr from 'react-flatpickr';
import { parseDate as parseDateHelper, normalizeDate } from '../../utils/formatters';
import LeadConvertModal from './components/LeadConvertModal';
import LeadMissingInfoModal from './components/LeadMissingInfoModal';
import LeadPaymentModal from './components/LeadPaymentModal';

export default function LeadDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { hasPermission } = usePermissions();
    const currentUser = useAuthStore((state) => state.user);
    const isHost = currentUser?.is_host === 1;

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'leadDetails');
    const [isLoading, setIsLoading] = useState(!!id);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        lead_id: '',
        tasks_no: '',
        probability: '',
        lead_type: '',
        status: '',
        salesperson_id: '',
        company_name: '',
        domain: '',
        lead_source: '',
        employees: '',
        contact_person: '',
        phone_number: '',
        email: '',
        legal_business_name: '',
        business_ein: '',
        state_file_number: '',
        duns_number: '',
        business_address: '',
        country: '',
        city: '',
        state: '',
        zip_code: '',
        business_phone: '',
        entity_type: '',
        industry_type: '',
        business_start_date: '',
        ssn_last_4: '',
        requirement_details: '',
        partner_id: '',
        partner_manager: '',
        lead_source_note: '',
        entity_type_note: '',
        industry_type_note: ''
    });

    const [users, setUsers] = useState([]);

    const [profileStats, setProfileStats] = useState({
        total_meetings: 0,
        total_clients: 0,
        total_invoice: 0,
        enrollment_type: 'N/A',
        total_tickets: 0
    });
    const [statsLoading, setStatsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Conversion and Payment Modal states
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [newBorrowerId, setNewBorrowerId] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentInvoiceId, setPaymentInvoiceId] = useState(null);
    const [conversionLoading, setConversionLoading] = useState(false);
    const [convertErrors, setConvertErrors] = useState({});
    const [missingInfoErrors, setMissingInfoErrors] = useState({});

    // Location states
    const [countries] = useState(
        Object.keys(locationData).map((key) => ({
            label: locationData[key].name,
            value: locationData[key].name
        }))
    );
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    // ── Effects (all state is declared above, so setFormData etc. are safe to use here) ──
    // NOTE: Do NOT move useEffects above the useState declarations — setFormData would be in TDZ

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            if (tab === 'contactInfo' && !id) {
                setActiveTab('leadDetails');
                navigate('?tab=leadDetails', { replace: true });
            } else {
                setActiveTab(tab);
            }
        }
    }, [searchParams, id]);

    // Force Lead Type to Borrower if not host
    useEffect(() => {
        if (!isHost) {
            setFormData(prev => ({ ...prev, lead_type: 'Borrower' }));
        }
    }, [isHost]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Instant Error Clearing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

        if (name === 'country') {
            setFormData(prev => ({ ...prev, country: value, state: '', city: '', other_city: '' }));
            setErrors(prev => ({ ...prev, country: '', state: '', city: '' }));
        } else if (name === 'state') {
            setFormData(prev => ({ ...prev, state: value, city: '', other_city: '' }));
            setErrors(prev => ({ ...prev, state: '', city: '' }));
        } else if (name === 'city') {
            if (value !== 'Others') {
                setFormData(prev => ({ ...prev, city: value, other_city: '' }));
            } else {
                setFormData(prev => ({ ...prev, city: value }));
            }
        } else if (name === 'duns_number') {
            // DUNS is strictly 9 digits
            const val = value.replace(/\D/g, '').slice(0, 9);
            setFormData(prev => ({ ...prev, [name]: val }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const validateForm = () => {
        setErrors({});
        return true;
    };

    const handleSave = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        if (!validateForm()) {
            // toast.error('Please fill in all required fields correctly');
            return;
        }

        setErrors({});
        setIsSaving(true);

        try {
            let finalPayload = {};

            if (activeTab === 'leadDetails') {
                finalPayload = {
                    probability: formData.probability,
                    lead_type: formData.lead_type,
                    status: formData.status,
                    salesperson_id: formData.salesperson_id,
                    company_name: formData.company_name,
                    domain: formData.domain,
                    lead_source: formData.lead_source,
                    lead_source_note: formData.lead_source_note,
                    requirement_details: formData.requirement_details
                };
            } else {
                finalPayload = {
                    contact_person: formData.contact_person,
                    phone_number: formData.phone_number,
                    email: formData.email,
                    legal_business_name: formData.legal_business_name,
                    business_ein: formData.business_ein,
                    state_file_number: formData.state_file_number,
                    duns_number: formData.duns_number,
                    business_address: formData.business_address,
                    country: formData.country,
                    state: formData.state,
                    city: formData.city === 'Others' ? (formData.other_city || '') : formData.city,
                    zip_code: formData.zip_code,
                    business_phone: formData.business_phone,
                    entity_type: formData.entity_type,
                    entity_type_note: formData.entity_type_note,
                    industry_type: formData.industry_type,
                    industry_type_note: formData.industry_type_note,
                    business_start_date: formData.business_start_date ? normalizeDate(formData.business_start_date) : '',
                    ssn_last_4: formData.ssn_last_4,
                    employees: formData.employees
                };
            }

            if (id) {
                if (activeTab === 'leadDetails') {
                    await updateLeadDetails(id, finalPayload);
                    toast.success('Lead Details updated successfully');
                } else {
                    await updateLeadContactInfo(id, finalPayload);
                    toast.success('Lead contact information updated successfully');
                }
                // navigate('/leads');
            } else {
                const response = await createLeadDetails(finalPayload);
                toast.success('Lead Details Completed successfully');
                if (response.status && response.data?.id) {
                    navigate(`/leads/${response.data.id}?tab=contactInfo`);
                } else {
                    navigate('/leads');
                }
            }
        } catch (err) {
            console.error('Save lead error:', err);
            if (err.response?.data?.errors) {
                const backendErrors = err.response.data.errors;
                const mappedErrors = {};
                Object.keys(backendErrors).forEach(key => {
                    mappedErrors[key] = Array.isArray(backendErrors[key]) ? backendErrors[key][0] : backendErrors[key];
                });
                setErrors(mappedErrors);
            } else {
                toast.error(err.response?.data?.message || 'Failed to save lead');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleConvertClick = () => {
        const isMissingInfo = !formData.contact_person || !formData.email || !formData.phone_number || !formData.country || !formData.state || !formData.city;
        if (isMissingInfo) {
            setShowMissingInfoModal(true);
        } else {
            setShowConvertModal(true);
        }
    };

    const handleMissingInfoConfirm = async (updatedData) => {
        if (!id) {
            toast.error('Lead ID is missing');
            return;
        }
        try {
            setConversionLoading(true);
            await updateLeadContactInfo(id, updatedData);
            setFormData(prev => ({ ...prev, ...updatedData }));
            setMissingInfoErrors({});
            setShowMissingInfoModal(false);
            setShowConvertModal(true);
        } catch (err) {
            console.error('Update missing info error:', err);
            const backendFieldErrors = err.response?.data?.errors;
            if (backendFieldErrors && typeof backendFieldErrors === 'object') {
                const flatErrors = {};
                Object.keys(backendFieldErrors).forEach(key => {
                    const val = backendFieldErrors[key];
                    flatErrors[key] = Array.isArray(val) ? val[0] : val;
                });
                setMissingInfoErrors(flatErrors);
            } else {
                toast.error(err.response?.data?.message || 'Failed to update lead information');
            }
        } finally {
            setConversionLoading(false);
        }
    };

    const handleConvertConfirm = async (payload = {}) => {
        const targetType = formData.lead_type === 'Partner' ? 'Partner' : 'Borrower';
        try {
            setConversionLoading(true);
            const response = await convertLead(id, payload);

            if (response.status || response.id) {
                const bId = response.data?.borrower?.id || response.data?.id || response.id;
                const invId = response.data?.invoice?.id || null;

                // If it's a borrower and there's an amount to pay, and no payment yet, and user is NOT a host
                if (!isHost && targetType === 'Borrower' && payload?.amount > 0 && !payload?.payment_intent_id) {
                    setNewBorrowerId(bId);
                    setPaymentAmount(payload.amount);
                    setPaymentInvoiceId(invId);
                    setShowConvertModal(false);
                    // Add a small delay for LeadConvertModal to close before showing LeadPaymentModal
                    setTimeout(() => {
                        setShowPaymentModal(true);
                    }, 300);
                    toast.success(`Lead successfully converted. Please complete the payment.`);
                    return;
                }

                toast.success(`Lead successfully converted to ${targetType}`);
                setShowConvertModal(false);
                setShowPaymentModal(false);
                navigate('/leads');
            }
        } catch (err) {
            console.error('Conversion error:', err);
            // Extract backend validation errors and show them inline in the modal
            const backendFieldErrors = err.response?.data?.errors;
            if (backendFieldErrors && typeof backendFieldErrors === 'object') {
                // Flatten array values (Laravel returns arrays per field)
                const flatErrors = {};
                Object.keys(backendFieldErrors).forEach(key => {
                    const val = backendFieldErrors[key];
                    flatErrors[key] = Array.isArray(val) ? val[0] : val;
                });
                setConvertErrors(flatErrors);
            } else {
                toast.error(err.response?.data?.message || `Failed to convert lead to ${targetType}`);
            }
        } finally {
            setConversionLoading(false);
        }
    };

    // Summernote Editors
    const { editorRef: requirementDetailsRef } = useSummernote('requirement_details', formData.requirement_details, handleInputChange, { height: 250 }, activeTab === 'leadDetails' && !isLoading);

    const { editorRef: leadSourceNoteRef } = useSummernote(
        'lead_source_note',
        formData.lead_source_note,
        handleInputChange,
        { height: 150 },
        activeTab === 'leadDetails' && formData.lead_source === 'Other' && !isLoading
    );

    const { editorRef: entityTypeNoteRef } = useSummernote(
        'entity_type_note',
        formData.entity_type_note,
        handleInputChange,
        { height: 150 },
        activeTab === 'contactInfo' && formData.entity_type === 'Other / Unknown' && !isLoading
    );

    const { editorRef: industryTypeNoteRef } = useSummernote(
        'industry_type_note',
        formData.industry_type_note,
        handleInputChange,
        { height: 150 },
        activeTab === 'contactInfo' && formData.industry_type === 'Other / Unknown' && !isLoading
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                const usersRes = await allUsers();
                if (usersRes.status) setUsers(usersRes.data || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchData();
    }, []);

    // Cascading logic for location
    useEffect(() => {
        if (formData.country) {
            const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === formData.country);
            const code = countryEntry ? countryEntry[0] : null;

            if (code && locationData[code]) {
                const stateOptions = Object.keys(locationData[code].states).map((key) => ({
                    label: locationData[code].states[key].name,
                    value: locationData[code].states[key].name
                }));
                setStates(stateOptions);
            } else {
                setStates([]);
                setCities([]);
            }
        }
    }, [formData.country]);

    useEffect(() => {
        if (formData.state && formData.country) {
            const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === formData.country);
            const countryCode = countryEntry ? countryEntry[0] : null;

            if (countryCode && locationData[countryCode]) {
                const sEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === formData.state);
                const stateCode = sEntry ? sEntry[0] : null;

                if (stateCode && locationData[countryCode].states[stateCode]) {
                    const cityList = locationData[countryCode].states[stateCode].cities;
                    const cityOptions = (cityList || []).map((city) => ({ label: city, value: city }));
                    setCities(cityOptions);
                } else {
                    setCities([]);
                }
            }
        }
    }, [formData.state, formData.country]);

    useEffect(() => {
        if (!id) return;

        const loadLead = async () => {
            setIsLoading(true);
            try {
                const response = await getLead(id);
                if (response.status && response.data) {
                    const data = response.data;

                    // Normalize Country
                    let finalCountry = data.country;
                    if (locationData[finalCountry]) {
                        finalCountry = locationData[finalCountry].name;
                    }

                    // Find country code based on Name
                    const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === finalCountry);
                    const countryCode = countryEntry ? countryEntry[0] : null;

                    // Normalize State
                    let finalState = data.state;
                    if (countryCode && locationData[countryCode] && locationData[countryCode].states[finalState]) {
                        finalState = locationData[countryCode].states[finalState].name;
                    }

                    // Handle location cascading
                    let cityOptions = [];
                    if (countryCode && locationData[countryCode]) {
                        const stateOptions = Object.keys(locationData[countryCode].states).map((key) => ({
                            label: locationData[countryCode].states[key].name,
                            value: locationData[countryCode].states[key].name
                        }));
                        setStates(stateOptions);

                        // Find State Code
                        const sEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === finalState);
                        const stateCode = sEntry ? sEntry[0] : finalState;

                        if (stateCode && locationData[countryCode].states[stateCode]) {
                            const cityList = locationData[countryCode].states[stateCode].cities;
                            cityOptions = (cityList || []).map((city) => ({ label: city, value: city }));
                            setCities(cityOptions);
                        }
                    }


                    // Check if city exists
                    const cityExists = cityOptions.some(cityOption => cityOption.value === data.city);
                    let cityValue = data.city || '';
                    let otherCityValue = '';
                    if (data.city && cityExists) {
                        cityValue = data.city;
                    } else if (data.city) {
                        cityValue = 'Others';
                        otherCityValue = data.city;
                    }

                    setFormData(prev => ({
                        ...prev,
                        ...data,
                        country: finalCountry,
                        state: finalState,
                        city: cityValue,
                        legal_business_name: data.company_name,
                        other_city: otherCityValue,
                        business_start_date: data.business_start_date ? normalizeDate(data.business_start_date) : ''
                    }));
                }
            } catch (err) {
                console.error('Failed to load lead details:', err);
                toast.error('Failed to load lead details');
            } finally {
                setIsLoading(false);
            }
        };

        loadLead();
    }, [id]);

    // Fetch Stats
    useEffect(() => {
        const loadStats = async () => {
            if (!id) return;
            try {
                setStatsLoading(true);
                const result = await fetchGlobalStats({ id });
                if (result.status && result.data) {
                    setProfileStats(result.data);
                }
            } catch (err) {
                console.error('Failed to load stats:', err);
            } finally {
                setStatsLoading(false);
            }
        };

        if (id) {
            loadStats();
        }
    }, [id]);

    const metricsConfig = [
        { label: 'Meetings', dataKey: 'total_meetings', icon: 'ri-calendar-line' },
        { label: 'Total Clients', dataKey: 'total_clients', icon: 'ri-star-line' },
        { label: 'Invoiced', dataKey: 'total_invoice', icon: 'ri-file-edit-line' },
        { label: 'Subscriptions', dataKey: 'enrollment_type', icon: 'ri-money-dollar-circle-line' },
        { label: 'Tickets', dataKey: 'total_tickets', icon: 'ri-lifebuoy-line' },
    ];

    return (
        <>
            {!hasPermission('view leads') && <Navigate to="/" replace />}
            <div className="page-content">
                <div className="container-fluid">
                    {/* Page Title */}
                    <div className="row pb-1 page-subheader-sticky bg-body">
                        <div className="col-12">
                            <div className="d-flex align-items-center justify-content-between flex-row py-2">
                                <div className="flex-grow-1">
                                    <h4 className="fs-20 mb-1">Lead Profile</h4>
                                    <nav aria-label="breadcrumb">
                                        <ol className="breadcrumb m-0">
                                            <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                            <li className="breadcrumb-item"><Link to="/leads">Leads</Link></li>
                                            <li className="breadcrumb-item active">Lead Profile</li>
                                        </ol>
                                    </nav>
                                </div>
                                <div className="d-flex gap-2">
                                    <Link to="/leads" className="btn btn-outline-secondary w-lg waves-effect">
                                        <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                    </Link>
                                    {((id && hasPermission('update leads')) || (!id && hasPermission('create leads'))) && (
                                        <button className="btn btn-primary w-lg waves-effect" onClick={handleSave} disabled={isSaving || isLoading}>
                                            {isSaving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                    Saving...
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

                    {/* Metrics Strip */}
                    <div className="row pt-1">
                        <div className="col-12">
                            <div className="d-flex flex-wrap metrics-strip justify-content-center">
                                {statsLoading ? (
                                    [1, 2, 3, 4, 5].map((_, index) => (
                                        <ProfileMetricCardSkeleton key={index} />
                                    ))
                                ) : (
                                    metricsConfig.map((metric, index) => (
                                        <ProfileMetricCard
                                            key={index}
                                            label={metric.label}
                                            value={profileStats[metric.dataKey]}
                                            icon={metric.icon}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        {/* Main Content */}
                        <div className="col-xxl-12">
                            <div className="card">
                                <div className="card-header">
                                    <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                                        <li className="nav-item">
                                            <a className={`nav-link ${activeTab === 'leadDetails' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('leadDetails'); setErrors({}); navigate('?tab=leadDetails', { replace: true }); }} href="#">Lead Details</a>
                                        </li>
                                        <li className="nav-item">
                                            <a
                                                className={`nav-link ${activeTab === 'contactInfo' ? 'active' : ''} ${!id ? 'disabled opacity-50' : ''}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (id) {
                                                        setActiveTab('contactInfo');
                                                        setErrors({});
                                                        navigate('?tab=contactInfo', { replace: true });
                                                    } else {
                                                        toast.info('Please save lead details first to access contact info.');
                                                    }
                                                }}
                                                href="#"
                                                style={!id ? { cursor: 'not-allowed' } : {}}
                                            >
                                                Contact Info
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                                <div className="card-body p-4">
                                    <div className="tab-content">
                                        {isLoading ? (
                                            <FormLoader count={12} />
                                        ) : (
                                            <>
                                                {activeTab === 'leadDetails' && (
                                                    <div className="tab-pane active fade show">
                                                        <div className="row">
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Probability (%) <span className="text-danger">*</span></label>
                                                                    <Dropdown
                                                                        value={formData.probability}
                                                                        options={LEAD_PROBABILITY_OPTIONS}
                                                                        onChange={(e) => handleInputChange({ target: { name: 'probability', value: e.value } })}
                                                                        placeholder="Select probability"
                                                                        className={`w-100 ${errors.probability ? 'p-invalid' : ''}`}
                                                                    />
                                                                    {errors.probability && <div className="invalid-feedback d-block">{errors.probability}</div>}
                                                                </div>
                                                            </div>
                                                            {isHost && (
                                                                <div className="col-lg-6">
                                                                    <div className="mb-3">
                                                                        <label className="form-label">Lead Type <span className="text-danger">*</span></label>
                                                                        <Dropdown
                                                                            value={formData.lead_type}
                                                                            options={LEAD_TYPE_OPTIONS}
                                                                            onChange={(e) => handleInputChange({ target: { name: 'lead_type', value: e.value } })}
                                                                            placeholder="Select type"
                                                                            className={`w-100 ${errors.lead_type ? 'p-invalid' : ''}`}
                                                                        />
                                                                        {errors.lead_type && <div className="invalid-feedback d-block">{errors.lead_type}</div>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Status <span className="text-danger">*</span></label>
                                                                    <Dropdown
                                                                        value={formData.status}
                                                                        options={LEAD_STATUS_OPTIONS}
                                                                        onChange={(e) => handleInputChange({ target: { name: 'status', value: e.value } })}
                                                                        placeholder="Select status"
                                                                        className={`w-100 ${errors.status ? 'p-invalid' : ''}`}
                                                                    />
                                                                    {errors.status && <div className="invalid-feedback d-block">{errors.status}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Lead Owner
                                                                        {/* <span className="text-danger">*</span> */}
                                                                    </label>
                                                                    <Dropdown
                                                                        value={formData.salesperson_id}
                                                                        options={Array.isArray(users) ? users.map(user => ({ label: user.name, value: user.id })) : []}
                                                                        onChange={(e) => handleInputChange({ target: { name: 'salesperson_id', value: e.value } })}
                                                                        placeholder="Select Lead Owner"
                                                                        filter
                                                                        className={`w-100 ${errors.salesperson_id ? 'p-invalid' : ''}`}
                                                                    />
                                                                    {/* {errors.salesperson_id && <div className="invalid-feedback d-block">{errors.salesperson_id}</div>} */}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Organization Name <span className="text-danger">*</span></label>
                                                                    <input type="text" className={`form-control ${errors.company_name ? 'is-invalid' : ''}`} name="company_name" value={formData.company_name} onChange={handleInputChange} placeholder="Enter organization name" />
                                                                    {errors.company_name && <div className="invalid-feedback d-block">{errors.company_name}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Domain</label>
                                                                    <input type="text" className={`form-control ${errors.domain ? 'is-invalid' : ''}`} name="domain" value={formData.domain} onChange={handleInputChange} placeholder="Enter domain" />
                                                                    {errors.domain && <div className="invalid-feedback d-block">{errors.domain}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Lead Source</label>
                                                                    <Dropdown
                                                                        value={formData.lead_source}
                                                                        options={LEAD_SOURCE_OPTIONS}
                                                                        onChange={(e) => handleInputChange({ target: { name: 'lead_source', value: e.value } })}
                                                                        placeholder="Select source"
                                                                        filter
                                                                        className={`w-100 ${errors.lead_source ? 'p-invalid' : ''}`}
                                                                    />
                                                                    {errors.lead_source && <div className="invalid-feedback d-block">{errors.lead_source}</div>}
                                                                </div>
                                                            </div>

                                                            {formData.lead_source === 'Other' && (
                                                                <div className="col-lg-12">
                                                                    <div className="mb-3">
                                                                        <label className="form-label">Note <span className="text-danger">*</span></label>
                                                                        <textarea
                                                                            ref={leadSourceNoteRef}
                                                                            className={`form-control ${errors.lead_source_note ? 'is-invalid' : ''}`}
                                                                            name="lead_source_note"
                                                                            placeholder="Please specify lead source"
                                                                        ></textarea>
                                                                        {errors.lead_source_note && <div className="invalid-feedback d-block">{errors.lead_source_note}</div>}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="col-lg-12" key="requirement-details-field">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Requirement Details</label>
                                                                    <textarea
                                                                        ref={requirementDetailsRef}
                                                                        className={`form-control ${errors.requirement_details ? 'is-invalid' : ''}`}
                                                                        name="requirement_details"
                                                                        placeholder="Enter details"
                                                                    ></textarea>
                                                                    {errors.requirement_details && <div className="invalid-feedback d-block">{errors.requirement_details}</div>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {activeTab === 'contactInfo' && (
                                                    <div className="tab-pane active fade show">
                                                        <div className="row">
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Contact person <span className="text-danger">*</span></label>
                                                                    <input type="text" className={`form-control ${errors.contact_person ? 'is-invalid' : ''}`} name="contact_person" value={formData.contact_person} onChange={handleInputChange} placeholder="Dave" />
                                                                    {errors.contact_person && <div className="invalid-feedback">{errors.contact_person}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                                                                    <div className="input-group">
                                                                        {(formData.country === 'United States' || formData.country === 'Canada') && (
                                                                            <span className="input-group-text bg-light border">
                                                                                <span className="me-1">{formData.country === 'United States' ? 'USA' : 'CAN'}</span>
                                                                                <span className="text-muted">+1</span>
                                                                            </span>
                                                                        )}
                                                                        <input
                                                                            type="text"
                                                                            className={`form-control ${errors.phone_number ? 'is-invalid' : ''}`}
                                                                            name="phone_number"
                                                                            value={formData.phone_number}
                                                                            onChange={(e) => {
                                                                                const formatted = formatPhoneNumber(e.target.value);
                                                                                handleInputChange({ target: { name: 'phone_number', value: formatted } });
                                                                            }}
                                                                            placeholder="(555) 555-5555"
                                                                        />
                                                                        {errors.phone_number && <div className="invalid-feedback d-block">{errors.phone_number}</div>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Lead Contact Email <span className="text-danger">*</span></label>
                                                                    <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} name="email" value={formData.email} onChange={handleInputChange} placeholder="dave@example.com" />
                                                                    {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Legal Business Name</label>
                                                                    <input type="text" className={`form-control ${errors.legal_business_name ? 'is-invalid' : ''}`} name="legal_business_name" value={formData.legal_business_name} onChange={handleInputChange} placeholder="Enter business name" />
                                                                    {errors.legal_business_name && <div className="invalid-feedback d-block">{errors.legal_business_name}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Business EIN</label>
                                                                    <input
                                                                        type="number"
                                                                        className={`form-control ${errors.business_ein ? 'is-invalid' : ''}`}
                                                                        name="business_ein"
                                                                        value={formData.business_ein}
                                                                        onChange={handleInputChange}
                                                                        placeholder="Enter 9-digit EIN"
                                                                        onInput={(e) => { if (e.target.value.length > 9) e.target.value = e.target.value.slice(0, 9); }}
                                                                        onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                                                                    />
                                                                    {errors.business_ein && <div className="invalid-feedback d-block">{errors.business_ein}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">State File Number</label>
                                                                    <input type="text" onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()} className={`form-control ${errors.state_file_number ? 'is-invalid' : ''}`} name="state_file_number" value={formData.state_file_number} onChange={handleInputChange} placeholder="Enter state file number" />
                                                                    {errors.state_file_number && <div className="invalid-feedback d-block">{errors.state_file_number}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">D-U-N-S Number</label>
                                                                    <input
                                                                        type="number"
                                                                        className={`form-control ${errors.duns_number ? 'is-invalid' : ''}`}
                                                                        name="duns_number"
                                                                        value={formData.duns_number}
                                                                        onChange={handleInputChange}
                                                                        placeholder="Enter 9-digit D-U-N-S"
                                                                        onInput={(e) => { if (e.target.value.length > 9) e.target.value = e.target.value.slice(0, 9); }}
                                                                        onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                                                                    />
                                                                    {errors.duns_number && <div className="invalid-feedback d-block">{errors.duns_number}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Business Address</label>
                                                                    <input type="text" className={`form-control ${errors.business_address ? 'is-invalid' : ''}`} name="business_address" value={formData.business_address} onChange={handleInputChange} placeholder="Enter business address" />
                                                                    {errors.business_address && <div className="invalid-feedback d-block">{errors.business_address}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-4">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Country <span className="text-danger">*</span></label>
                                                                    <Dropdown
                                                                        value={formData.country}
                                                                        options={countries}
                                                                        onChange={(e) => handleInputChange({ target: { name: 'country', value: e.value } })}
                                                                        optionLabel="label"
                                                                        placeholder="Select Country"
                                                                        filter
                                                                        className={`w-100 ${errors.country ? 'p-invalid' : ''}`}
                                                                    />
                                                                    {errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-4">
                                                                <div className="mb-3">
                                                                    <label className="form-label">State <span className="text-danger">*</span></label>
                                                                    <Dropdown
                                                                        value={formData.state}
                                                                        options={states}
                                                                        onChange={(e) => handleInputChange({ target: { name: 'state', value: e.value } })}
                                                                        optionLabel="label"
                                                                        placeholder="Select State"
                                                                        filter
                                                                        className={`w-100 ${errors.state ? 'p-invalid' : ''}`}
                                                                        disabled={!formData.country}
                                                                    />
                                                                    {errors.state && <div className="invalid-feedback d-block">{errors.state}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-4">
                                                                <div className="mb-3">
                                                                    <label className="form-label">City <span className="text-danger">*</span></label>
                                                                    <Dropdown
                                                                        value={formData.city}
                                                                        options={[...cities, { label: 'Others', value: 'Others' }]}
                                                                        onChange={(e) => handleInputChange({ target: { name: 'city', value: e.value } })}
                                                                        optionLabel="label"
                                                                        placeholder="Select City"
                                                                        filter
                                                                        className={`w-100 ${errors.city ? 'p-invalid' : ''}`}
                                                                        disabled={!formData.state}
                                                                    />
                                                                    {errors.city && <div className="invalid-feedback d-block">{errors.city}</div>}
                                                                </div>
                                                            </div>
                                                            {formData.city === 'Others' && (
                                                                <div className="col-lg-4">
                                                                    <div className="mb-3">
                                                                        <label className="form-label">Other City <span className="text-danger">*</span></label>
                                                                        <input type="text" className={`form-control ${errors.other_city ? 'is-invalid' : ''}`} name="other_city" value={formData.other_city} onChange={handleInputChange} placeholder="Enter city name" />
                                                                        {errors.other_city && <div className="invalid-feedback d-block">{errors.other_city}</div>}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Business Phone</label>
                                                                    <div className="input-group">
                                                                        {(formData.country === 'United States' || formData.country === 'Canada') && (
                                                                            <span className="input-group-text bg-light border">
                                                                                <span className="me-1">{formData.country === 'United States' ? 'USA' : 'CAN'}</span>
                                                                                <span className="text-muted">+1</span>
                                                                            </span>
                                                                        )}
                                                                        <input
                                                                            type="text"
                                                                            className={`form-control ${errors.business_phone ? 'is-invalid' : ''}`}
                                                                            name="business_phone"
                                                                            value={formData.business_phone}
                                                                            onChange={(e) => {
                                                                                const formatted = formatPhoneNumber(e.target.value);
                                                                                handleInputChange({ target: { name: 'business_phone', value: formatted } });
                                                                            }}
                                                                            placeholder="(555) 555-5555"
                                                                        />
                                                                        {errors.business_phone && <div className="invalid-feedback d-block">{errors.business_phone}</div>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Zip Code</label>
                                                                    <input type="text" className={`form-control ${errors.zip_code ? 'is-invalid' : ''}`} name="zip_code" value={formData.zip_code} onChange={handleInputChange} placeholder="Enter zipcode" />
                                                                    {errors.zip_code && <div className="invalid-feedback d-block">{errors.zip_code}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Entity Type</label>
                                                                    <Dropdown
                                                                        value={formData.entity_type}
                                                                        options={LEAD_ENTITY_TYPE_OPTIONS}
                                                                        onChange={(e) => handleInputChange({ target: { name: 'entity_type', value: e.value } })}
                                                                        placeholder="Select entity type"
                                                                        filter
                                                                        className={`w-100 ${errors.entity_type ? 'p-invalid' : ''}`}
                                                                    />
                                                                    {errors.entity_type && <div className="invalid-feedback d-block">{errors.entity_type}</div>}
                                                                </div>
                                                            </div>

                                                            {formData.entity_type === 'Other / Unknown' && (
                                                                <div className="col-lg-12">
                                                                    <div className="mb-3">
                                                                        <label className="form-label">Entity Type Details <span className="text-danger">*</span></label>
                                                                        <textarea
                                                                            ref={entityTypeNoteRef}
                                                                            className={`form-control ${errors.entity_type_note ? 'is-invalid' : ''}`}
                                                                            name="entity_type_note"
                                                                            placeholder="Please specify entity type"
                                                                        ></textarea>
                                                                        {errors.entity_type_note && <div className="invalid-feedback d-block">{errors.entity_type_note}</div>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Industry Type</label>
                                                                    <Dropdown
                                                                        value={formData.industry_type}
                                                                        options={LEAD_INDUSTRY_TYPE_OPTIONS}
                                                                        onChange={(e) => handleInputChange({ target: { name: 'industry_type', value: e.value } })}
                                                                        placeholder="Select industry type"
                                                                        filter
                                                                        className={`w-100 ${errors.industry_type ? 'p-invalid' : ''}`}
                                                                    />
                                                                    {errors.industry_type && <div className="invalid-feedback d-block">{errors.industry_type}</div>}
                                                                </div>
                                                            </div>

                                                            {formData.industry_type === 'Other / Unknown' && (
                                                                <div className="col-lg-12">
                                                                    <div className="mb-3">
                                                                        <label className="form-label">Industry Type Details <span className="text-danger">*</span></label>
                                                                        <textarea
                                                                            ref={industryTypeNoteRef}
                                                                            className={`form-control ${errors.industry_type_note ? 'is-invalid' : ''}`}
                                                                            name="industry_type_note"
                                                                            placeholder="Please specify industry type"
                                                                        ></textarea>
                                                                        {errors.industry_type_note && <div className="invalid-feedback d-block">{errors.industry_type_note}</div>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">Business Start Date</label>
                                                                    <Flatpickr
                                                                        options={{
                                                                            dateFormat: "Y-m-d",
                                                                            altInput: true,
                                                                            altFormat: "d M, Y"
                                                                        }}
                                                                        value={parseDateHelper(formData.business_start_date)}
                                                                        onChange={(dates) => {
                                                                            const date = dates[0];
                                                                            const dateString = date
                                                                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                                                                : "";
                                                                            handleInputChange({ target: { name: "business_start_date", value: dateString } });
                                                                        }}
                                                                        className={`form-control ${errors.business_start_date ? 'is-invalid' : ''}`}
                                                                        placeholder="Select date"
                                                                    />
                                                                    {errors.business_start_date && <div className="invalid-feedback d-block">{errors.business_start_date}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="mb-3">
                                                                    <label className="form-label">SSN Last 4</label>
                                                                    <input
                                                                        type="number"
                                                                        className={`form-control ${errors.ssn_last_4 ? 'is-invalid' : ''}`}
                                                                        name="ssn_last_4"
                                                                        value={formData.ssn_last_4}
                                                                        onChange={handleInputChange}
                                                                        placeholder="Enter last 4 digits"
                                                                        onInput={(e) => { if (e.target.value.length > 4) e.target.value = e.target.value.slice(0, 4); }}
                                                                        onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                                                                    />
                                                                    {errors.ssn_last_4 && <div className="invalid-feedback d-block">{errors.ssn_last_4}</div>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activity Sidebar */}
                        {/* <div className="col-xxl-4">
                        <ActivitySidebar entityId={id} entityType="Lead" />
                    </div> */}
                    </div>
                </div>
            </div>

            {/* Modals rendered outside main content to prevent z-index issues */}
            <EmailComposeModal entityId={id} entityType="Lead" />
            <ActivityCreateModal entityId={id} entityType="Lead" />
            <LeadConvertModal
                show={showConvertModal}
                onHide={() => { setShowConvertModal(false); setConvertErrors({}); }}
                onConfirm={handleConvertConfirm}
                lead={formData}
                targetType={formData.lead_type === 'Partner' ? 'Partner' : 'Borrower'}
                loading={conversionLoading}
                isHost={isHost}
                backendErrors={convertErrors}
            />
            <LeadMissingInfoModal
                show={showMissingInfoModal}
                onHide={() => { setShowMissingInfoModal(false); setMissingInfoErrors({}); }}
                onConfirm={handleMissingInfoConfirm}
                lead={formData}
                targetType={formData.lead_type === 'Partner' ? 'Partner' : 'Borrower'}
                loading={conversionLoading}
                backendErrors={missingInfoErrors}
            />
            <LeadPaymentModal
                show={showPaymentModal}
                onHide={() => setShowPaymentModal(false)}
                onSuccess={() => {
                    setShowPaymentModal(false);
                    toast.success("Lead conversion and payment completed successfully!");
                    navigate('/leads');
                }}
                lead={formData}
                borrowerId={newBorrowerId}
                invoiceId={paymentInvoiceId}
                amount={paymentAmount}
            />
        </>
    );
}
