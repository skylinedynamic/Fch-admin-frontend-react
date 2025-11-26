import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../assets/css/dropdown-validation.css';
import { createPartner, updatePartner, getPartner, allUsers } from '../../modules/partner/services';
import { locationData } from '../../config/locations';
import { validateRequired, validateEmail, validatePhone } from '../../components/errors/validation';
import PartnerForm from './components/PartnerForm';

export default function PartnerProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('personalDetails');
    const [errors, setErrors] = useState({});

    // Location states
    const [countries] = useState(
        Object.keys(locationData).map((key) => ({
            label: locationData[key].name,
            value: key
        }))
    );
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [users, setUsers] = useState([]);

    // Form state matching backend payload
    const [formData, setFormData] = useState({
        full_name: '',
        company_name: '',
        email: '',
        phone_number: '',
        status: 'active',
        contact_person: '',
        contact_person_phone_number: '',
        contact_person_email: '',
        contact_person_relation: '',
        contact_person_relation_other: '',
        partner_type: '',
        state: '',
        city: '',
        country: '',
        postal_code: '',
        address: '',
        address_line_2: '',
        tax_id: '',
        website: '',
        joining_date: '',
        // Agent fields
        agent: '',
        agentEmail: '',
        agentPhone: '',
        partnerStatus: '',
        // Subscription
        partnerUrl: '',
        billingTerm: '',
        firstRegDate: '',
        firstRegAmount: '',
        firstRegAmount2: '',
        firstPaymentAmount: '',
        recurringAmount: '',
        totalAmount: '',
        subscriptionStartDate: '',
        subscriptionEndDate: '',
        expiryDate: '',
        terminationDate: ''
    });

    // Fetch users on mount
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await allUsers();
                if (response.status && response.data) {
                    setUsers(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch users', error);
                toast.error('Failed to load users');
            }
        };
        fetchUsers();
    }, []);

    const [profileImage, setProfileImage] = useState('/assets/images/users/avatar-1.jpg');
    const [imageFile, setImageFile] = useState(null);

    // Fetch partner data if ID exists
    useEffect(() => {
        const fetchPartnerData = async () => {
            if (!id) return;
            try {
                const data = await getPartner(id);

                // Handle location cascading first to ensure options are available
                if (data.country && locationData[data.country]) {
                    const stateOptions = Object.keys(locationData[data.country].states).map((key) => ({
                        label: locationData[data.country].states[key].name,
                        value: key
                    }));
                    setStates(stateOptions);

                    if (data.state && locationData[data.country].states[data.state]) {
                        const cityList = locationData[data.country].states[data.state].cities;
                        const cityOptions = cityList.map((city) => ({ label: city, value: city }));
                        setCities(cityOptions);
                    }
                }

                // Update form data
                setFormData(prev => ({
                    ...prev,
                    ...data,
                }));

                if (data.partner_image) {
                    setProfileImage(data.partner_image);
                }

            } catch (error) {
                console.error("Failed to fetch partner data", error);
                toast.error("Failed to load partner data");
            }
        };

        fetchPartnerData();
    }, [id]);

    // Validation function
    const validateField = (name, value) => {
        let error = null;
        switch (name) {
            case 'full_name':
            case 'company_name':
            case 'country':
            case 'state':
            case 'city':
                error = validateRequired(value, name.replace('_', ' '));
                break;
            case 'email':
                if (!value || (typeof value === 'string' && value.trim() === '')) {
                    error = 'Email is required.';
                } else {
                    error = validateEmail(value);
                }
                break;
            case 'phone_number':
                error = validatePhone(value);
                break;
            default:
                break;
        }
        setErrors((prev) => ({ ...prev, [name]: error }));
        return error;
    };

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value, type, files } = e.target;

        if (type === 'file') {
            const file = files[0];
            if (file) {
                setImageFile(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setProfileImage(reader.result);
                };
                reader.readAsDataURL(file);
            }
            return;
        }

        // Handle country/state/city cascading
        if (name === 'country') {
            setFormData(prev => ({ ...prev, country: value, state: '', city: '' }));
            validateField('country', value);
            if (locationData[value]) {
                const stateOptions = Object.keys(locationData[value].states).map((key) => ({
                    label: locationData[value].states[key].name,
                    value: key
                }));
                setStates(stateOptions);
                setCities([]);
            } else {
                setStates([]);
                setCities([]);
            }
        } else if (name === 'state') {
            setFormData(prev => ({ ...prev, state: value, city: '' }));
            validateField('state', value);
            const countryCode = formData.country;
            if (countryCode && locationData[countryCode] && locationData[countryCode].states[value]) {
                const cityList = locationData[countryCode].states[value].cities;
                const cityOptions = cityList.map((city) => ({ label: city, value: city }));
                setCities(cityOptions);
            } else {
                setCities([]);
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
            validateField(name, value);
        }
    };

    // Handle agent selection
    const handleAgentChange = (e) => {
        const agentId = e.target.value;
        const selectedUser = users.find(user => user.id.toString() === agentId);
        setFormData(prev => ({
            ...prev,
            agent: agentId,
            agentEmail: selectedUser?.email || '',
            agentPhone: selectedUser?.phone_number || ''
        }));
    };

    // Handle form submission
    const handleSave = async () => {
        try {
            // Validate required fields
            const requiredFields = {
                full_name: formData.full_name,
                company_name: formData.company_name,
                phone_number: formData.phone_number,
                email: formData.email,
                country: formData.country,
                state: formData.state,
                city: formData.city
            };

            const fieldErrors = {};
            Object.entries(requiredFields).forEach(([field, value]) => {
                const error = validateField(field, value);
                if (error) {
                    fieldErrors[field] = error;
                }
            });

            // If there are validation errors, show them and stop submission
            if (Object.keys(fieldErrors).length > 0) {
                toast.error('Please fill in all required fields');
                return;
            }

            const formDataToSend = new FormData();

            // Append all form fields
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    formDataToSend.append(key, value);
                }
            });

            // Append image file if selected
            if (imageFile) {
                formDataToSend.append('partner_image', imageFile);
            }

            if (id) {
                await updatePartner(id, formDataToSend);
                toast.success('Partner updated successfully');
            } else {
                await createPartner(formDataToSend);
                toast.success('Partner created successfully');
            }

            setTimeout(() => navigate('/partners'), 800);
        } catch (error) {
            if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                Object.entries(errors).forEach(([field, errorMsg]) => {
                    toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
                });
            } else if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(id ? 'Failed to update partner' : 'Failed to save partner');
            }
        }
    };

    return (
        <div className="page-content">
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="container-fluid">
                {/* Page Title */}
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Partner Profile</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/partners">Partners</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Partner Profile</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/partners" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                <button type="button" onClick={handleSave} className="btn btn-primary w-lg waves-effect">
                                    <i className="ri-save-3-line align-middle me-1"></i> {id ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics Strip */}
                <div className="row pt-1">
                    <div className="col-12">
                        <div className="d-flex flex-wrap metrics-strip justify-content-center">
                            <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                <i className="ri-calendar-line me-2 text-warning fs-4"></i>
                                <div className="metrics-content">
                                    <div className="metrics-label text-muted">Meetings</div>
                                    <div className="metrics-value fw-semibold">2</div>
                                </div>
                            </a>
                            <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                <i className="ri-star-line me-2 text-warning fs-4"></i>
                                <div className="metrics-content">
                                    <div className="metrics-label text-muted">Total Clients</div>
                                    <div className="metrics-value fw-semibold">10</div>
                                </div>
                            </a>
                            <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                <i className="ri-file-edit-line me-2 text-warning fs-4"></i>
                                <div className="metrics-content">
                                    <div className="metrics-label text-muted">Invoiced</div>
                                    <div className="metrics-value fw-semibold">2</div>
                                </div>
                            </a>
                            <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                <i className="ri-money-dollar-circle-line me-2 text-warning fs-4"></i>
                                <div className="metrics-content">
                                    <div className="metrics-label text-muted">Subscriptions</div>
                                    <div className="metrics-value fw-semibold">Yearly</div>
                                </div>
                            </a>
                            <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
                                <i className="ri-lifebuoy-line me-2 text-warning fs-4"></i>
                                <div className="metrics-content">
                                    <div className="metrics-label text-muted">Tickets</div>
                                    <div className="metrics-value fw-semibold">10</div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="row">
                    <div className="col-xxl-8">
                        <div className="card">
                            <div className="card-header">
                                <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                                    <li className="nav-item">
                                        <a className={`nav-link ${activeTab === 'personalDetails' ? 'active' : ''}`} onClick={() => setActiveTab('personalDetails')} role="tab" style={{ cursor: 'pointer' }}>
                                            <i className="fas fa-home"></i> Partner information
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className={`nav-link ${activeTab === 'statusAgent' ? 'active' : ''}`} onClick={() => setActiveTab('statusAgent')} role="tab" style={{ cursor: 'pointer' }}>
                                            <i className="far fa-user"></i> Status & Agent
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className={`nav-link ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')} role="tab" style={{ cursor: 'pointer' }}>
                                            <i className="far fa-envelope"></i> Documents
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className={`nav-link ${activeTab === 'clientList' ? 'active' : ''}`} onClick={() => setActiveTab('clientList')} role="tab" style={{ cursor: 'pointer' }}>
                                            <i className="far fa-list-alt"></i> Client List
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className={`nav-link ${activeTab === 'subscription' ? 'active' : ''}`} onClick={() => setActiveTab('subscription')} role="tab" style={{ cursor: 'pointer' }}>
                                            <i className="far fa-credit-card"></i> Subscription details
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            <div className="card-body p-4">
                                <PartnerForm
                                    activeTab={activeTab}
                                    formData={formData}
                                    errors={errors}
                                    profileImage={profileImage}
                                    handleInputChange={handleInputChange}
                                    handleAgentChange={handleAgentChange}
                                    countries={countries}
                                    states={states}
                                    cities={cities}
                                    users={users}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Activity Sidebar */}
                    <div className="col-xxl-4">
                        <div className="card">
                            <div className="card-header px-2 py-2 align-items-center justify-content-between d-flex">
                                <h4 style={{ padding: '8px 0px' }} className="card-title mb-0 me-2">
                                    <i className="ri-history-line align-middle me-2"></i>Activity
                                </h4>
                                <div className="d-flex flex-wrap gap-2 chip-actions">
                                    <button type="button" className="btn btn-light btn-sm">
                                        <i className="ri-mail-line align-middle me-1"></i>New Email
                                    </button>
                                    <button type="button" className="btn btn-light btn-sm">
                                        <i className="ri-calendar-line align-middle me-1"></i>New Event
                                    </button>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="tab-content text-muted">
                                    <div className="tab-pane active show" id="today" role="tabpanel">
                                        <div className="profile-timeline">
                                            <div className="accordion accordion-flush" id="todayExample">
                                                <div className="accordion-item border-0">
                                                    <div className="accordion-header" id="headingOne">
                                                        <a className="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapseOne" aria-expanded="true">
                                                            <div className="d-flex">
                                                                <div className="flex-shrink-0">
                                                                    <img src="/assets/images/users/avatar-2.jpg" alt="" className="avatar-xs rounded-circle material-shadow" />
                                                                </div>
                                                                <div className="flex-grow-1 ms-3">
                                                                    <h6 className="fs-14 mb-1">
                                                                        Jacqueline Steve
                                                                    </h6>
                                                                    <small className="text-muted">Lead status updated: moved to “Proposal” — 05:16 PM</small>
                                                                </div>
                                                            </div>
                                                        </a>
                                                    </div>
                                                    <div id="collapseOne" className="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#accordionExample">
                                                        <div className="accordion-body ms-2 ps-5">
                                                            <p className="text-muted mb-0">Lead update: changed stage from “Qualified” to “Proposal”. Next: follow-up call scheduled.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
