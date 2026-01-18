import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getLead, createLead, updateLead, convertLead, fetchGlobalStats } from '../../modules/leads/services';
import { allUsers } from '../../modules/partner/services';
import { usePermissions } from '../../lib/auth/usePermissions';
import { useAuthStore } from '../../store/auth/authStore';
import { Navigate } from 'react-router-dom';
import ProfileMetricCard from '../../components/Common/ProfileMetricCard';
import ProfileMetricCardSkeleton from '../../components/Common/ProfileMetricCardSkeleton';
import EmailComposeModal from '../../components/Common/Modals/EmailComposeModal';
import ActivityCreateModal from '../../components/Common/Modals/ActivityCreateModal';
import ActivitySidebar from '../../components/Common/Activity/ActivitySidebar';
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
import LeadConvertModal from './components/LeadConvertModal';
import LeadMissingInfoModal from './components/LeadMissingInfoModal';

export default function LeadDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { hasPermission } = usePermissions();
    const currentUser = useAuthStore((state) => state.user);
    const isHost = currentUser?.is_host === 1;

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'leadDetails');
    
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

    const [loading, setLoading] = useState(false);
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
        partner_manager: ''
    });

    const [users, setUsers] = useState([]);
    const [partners, setPartners] = useState([]);
    const [profileStats, setProfileStats] = useState({
        total_meetings: 0,
        total_clients: 0,
        total_invoice: 0,
        enrollment_type: 'N/A',
        total_tickets: 0
    });
    const [statsLoading, setStatsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Conversion Modal state
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
    const [conversionLoading, setConversionLoading] = useState(false);

    // Location states
    const [countries] = useState(
        Object.keys(locationData).map((key) => ({
            label: locationData[key].name,
            value: locationData[key].name
        }))
    );
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'country') {
            setFormData(prev => ({ ...prev, country: value, state: '', city: '', other_city: '' }));
        } else if (name === 'state') {
            setFormData(prev => ({ ...prev, state: value, city: '', other_city: '' }));
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
        const newErrors = {};
        const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/; // (555) 555-5555
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Validation for Contact Info Tab
        if (activeTab === 'contactInfo') {
            if (!formData.contact_person?.trim()) newErrors.contact_person = 'Contact person is required';
            
            if (!formData.phone_number?.trim()) {
                newErrors.phone_number = 'Phone number is required';
            } else if (!phoneRegex.test(formData.phone_number)) {
                newErrors.phone_number = 'Phone number must be 10 digits';
            }

            if (!formData.email?.trim()) {
                newErrors.email = 'Email is required';
            } else if (!emailRegex.test(formData.email)) {
                newErrors.email = 'Invalid email format';
            }

            if (!formData.country) newErrors.country = 'Country is required';
            if (!formData.state) newErrors.state = 'State is required';
            if (!formData.city) newErrors.city = 'City is required';

            // Business phone is optional now
            if (formData.business_phone?.trim() && !phoneRegex.test(formData.business_phone)) {
                newErrors.business_phone = 'Business phone must be 10 digits';
            }
        }

        // Validation for Lead Details Tab
        if (activeTab === 'leadDetails') {
            if (!formData.company_name?.trim()) newErrors.company_name = 'Organization Name is required';
            if (!formData.probability) newErrors.probability = 'Probability is required';
            if (!formData.lead_type) newErrors.lead_type = 'Lead Type is required';
            if (!formData.status) newErrors.status = 'Status is required';
            if (!formData.salesperson_id) newErrors.salesperson_id = 'Salesperson is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        if (!validateForm()) {
            // toast.error('Please fill in all required fields correctly');
            return;
        }

        setErrors({});
        setLoading(true);

        try {
            const payload = { ...formData };
            if (payload.city === 'Others') {
                payload.city = payload.other_city || '';
            }
            delete payload.other_city;

            if (id) {
                await updateLead(id, payload);
                if (activeTab === 'leadDetails') {
                    toast.success('Lead Details updated successfully');
                } else {
                    toast.success('Lead contact information updated successfully');
                }
                // navigate('/leads');
            } else {
                const response = await createLead(payload);
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
            setLoading(false);
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
            await updateLead(id, updatedData);
            setFormData(prev => ({ ...prev, ...updatedData }));
            setShowMissingInfoModal(false);
            setShowConvertModal(true);
        } catch (err) {
            console.error('Update missing info error:', err);
            toast.error(err.response?.data?.message || 'Failed to update lead information');
        } finally {
            setConversionLoading(false);
        }
    };

    const handleConvertConfirm = async () => {
        const targetType = formData.lead_type === 'Partner' ? 'Partner' : 'Borrower';
        try {
            setConversionLoading(true);
            const response = await convertLead(id);
            if (response.status && response.data?.id) {
                toast.success(`Lead successfully updated and converted to ${targetType}`);
                navigate('/leads');
            } else {
                toast.success(`Lead converted to ${targetType} successfully`);
                navigate('/leads');
            }
        } catch (err) {
            console.error('Conversion error:', err);
            toast.error(err.response?.data?.message || `Failed to convert lead to ${targetType}`);
        } finally {
            setConversionLoading(false);
            setShowConvertModal(false);
        }
    };

    // Summernote for Requirement Details
    const { editorRef } = useSummernote('requirement_details', formData.requirement_details, handleInputChange, { height: 150 }, activeTab === 'contactInfo');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const usersRes = await allUsers();
                if (usersRes.status) setUsers(usersRes.data);
                
                // Fetch partners list for the dropdown
                const partnersRes = await fetch('/api/admin/partners/get-all-partners').then(res => res.json()); 
                if (partnersRes.status) setPartners(partnersRes.data);
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
                    const cityOptions = cityList.map((city) => ({ label: city, value: city }));
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
            setLoading(true);
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
                            cityOptions = cityList.map((city) => ({ label: city, value: city }));
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
                        other_city: otherCityValue
                    }));
                }
            } catch (err) {
                console.error('Failed to load lead details:', err);
                toast.error('Failed to load lead details');
            } finally {
                setLoading(false);
            }
        };

        loadLead();
    }, [id, navigate]);

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
                <ToastContainer position="top-right" autoClose={3000} />
            <div className="container-fluid">
                {/* Page Title */}
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
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
                                    <button className="btn btn-primary w-lg waves-effect" onClick={handleSave} disabled={loading}>
                                        <i className="ri-save-3-line align-middle me-1"></i> {id ? 'Update' : 'Save'}
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
                                    {activeTab === 'leadDetails' && (
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
                                                    <label className="form-label">Salesperson <span className="text-danger">*</span></label>
                                                    <Dropdown
                                                        value={formData.salesperson_id}
                                                        options={users.map(user => ({ label: user.name, value: user.id }))}
                                                        onChange={(e) => handleInputChange({ target: { name: 'salesperson_id', value: e.value } })}
                                                        placeholder="Select salesperson"
                                                        filter
                                                        className={`w-100 ${errors.salesperson_id ? 'p-invalid' : ''}`}
                                                    />
                                                    {errors.salesperson_id && <div className="invalid-feedback d-block">{errors.salesperson_id}</div>}
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Organization Name <span className="text-danger">*</span></label>
                                                    <input type="text" className={`form-control ${errors.company_name ? 'is-invalid' : ''}`} name="company_name" value={formData.company_name} onChange={handleInputChange} placeholder="Enter organization name" />
                                                    {errors.company_name && <div className="invalid-feedback">{errors.company_name}</div>}
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Domain</label>
                                                    <input type="text" className={`form-control ${errors.domain ? 'is-invalid' : ''}`} name="domain" value={formData.domain} onChange={handleInputChange} placeholder="Enter domain" />
                                                    {errors.domain && <div className="invalid-feedback">{errors.domain}</div>}
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
                                                        className={`w-100 ${errors.lead_source ? 'p-invalid' : ''}`}
                                                    />
                                                    {errors.lead_source && <div className="invalid-feedback d-block">{errors.lead_source}</div>}
                                                </div>
                                            </div>
                                            
                                        </div>
                                    )}

                                    {activeTab === 'contactInfo' && (
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
                                                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Legal Business Name</label>
                                                    <input type="text" className={`form-control ${errors.legal_business_name ? 'is-invalid' : ''}`} name="legal_business_name" value={formData.legal_business_name} onChange={handleInputChange} placeholder="Enter business name" />
                                                    {errors.legal_business_name && <div className="invalid-feedback">{errors.legal_business_name}</div>}
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Business EIN</label>
                                                    <input type="text" className={`form-control ${errors.business_ein ? 'is-invalid' : ''}`} name="business_ein" value={formData.business_ein} onChange={handleInputChange} placeholder="Enter 9-digit EIN" />
                                                    {errors.business_ein && <div className="invalid-feedback">{errors.business_ein}</div>}
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">State File Number</label>
                                                    <input type="text" className={`form-control ${errors.state_file_number ? 'is-invalid' : ''}`} name="state_file_number" value={formData.state_file_number} onChange={handleInputChange} placeholder="Enter state file number" />
                                                    {errors.state_file_number && <div className="invalid-feedback">{errors.state_file_number}</div>}
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
                                                        onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                                                    />
                                                    {errors.duns_number && <div className="invalid-feedback">{errors.duns_number}</div>}
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Business Address</label>
                                                    <input type="text" className={`form-control ${errors.business_address ? 'is-invalid' : ''}`} name="business_address" value={formData.business_address} onChange={handleInputChange} placeholder="Enter business address" />
                                                    {errors.business_address && <div className="invalid-feedback">{errors.business_address}</div>}
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
                                                        <input type="text" className="form-control" name="other_city" value={formData.other_city} onChange={handleInputChange} placeholder="Enter city name" />
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
                                                    <input type="text" className="form-control" name="zip_code" value={formData.zip_code} onChange={handleInputChange} placeholder="Enter zipcode" />
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
                                                        className="w-100"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Industry Type</label>
                                                    <Dropdown
                                                        value={formData.industry_type}
                                                        options={LEAD_INDUSTRY_TYPE_OPTIONS}
                                                        onChange={(e) => handleInputChange({ target: { name: 'industry_type', value: e.value } })}
                                                        placeholder="Select industry type"
                                                        className="w-100"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Business Start Date</label>
                                                    <Flatpickr
                                                        options={{ dateFormat: "d M, Y" }}
                                                        value={formData.business_start_date ? new Date(formData.business_start_date) : undefined}
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
                                                    <input type="text" className="form-control" name="ssn_last_4" value={formData.ssn_last_4} onChange={handleInputChange} placeholder="Enter last 4 digits of SSN" />
                                                </div>
                                            </div>
                                            <div className="col-lg-12">
                                                <div className="mb-3">
                                                    <label className="form-label">Requirement Details</label>
                                                    <textarea ref={editorRef} className="form-control" name="requirement_details" value={formData.requirement_details} onChange={handleInputChange} rows="3" placeholder="Enter details"></textarea>
                                                </div>
                                            </div>
                                        </div>
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
                onHide={() => setShowConvertModal(false)}
                onConfirm={handleConvertConfirm}
                lead={formData}
                targetType={formData.lead_type === 'Partner' ? 'Partner' : 'Borrower'}
                loading={conversionLoading}
            />
            <LeadMissingInfoModal
                show={showMissingInfoModal}
                onHide={() => setShowMissingInfoModal(false)}
                onConfirm={handleMissingInfoConfirm}
                lead={formData}
                targetType={formData.lead_type === 'Partner' ? 'Partner' : 'Borrower'}
                loading={conversionLoading}
            />
        </>
    );
}
