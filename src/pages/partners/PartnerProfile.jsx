import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../assets/css/dropdown-validation.css';
import { createPartner, updatePartner, getPartner, allUsers, getSubscription, saveSubscription } from '../../modules/partner/services';
import { locationData } from '../../config/locations';
import { validateRequired, validateEmail, validatePhone } from '../../components/errors/validation';
import PartnerForm from './components/PartnerForm';

export default function PartnerProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    // Determine initial active tab based on navigation state or defaults
    const getInitialTab = () => {
        // Priority 1: URL query parameter
        if (searchParams.get('tab')) return searchParams.get('tab');
        // Priority 2: Navigation state (from Link)
        if (location.state?.activeTab) return location.state.activeTab;
        // Priority 3: Default based on whether it's a new partner or existing
        return id ? 'statusAgent' : 'personalDetails';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab());
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
        status: '',
        contact_person: '',
        contact_person_phone_number: '',
        contact_person_email: '',
        contact_person_relation: '',
        contact_person_relation_other: '',
        partner_type: '',
        state: '',
        city: '',
        other_city: '',
        country: 'USA', // Default to USA
        country_code: '+1', // Default to +1 for USA
        postal_code: '',
        address_line_1: '',
        tax_id: '',
        website: '',
        joining_date: '',
        partner_image: '',
        // Agent fields
        agent: '',
        agentEmail: '',
        agentPhone: '',
        partnerStatus: '',
        // Subscription - using snake_case to match API
        partner_url: '',
        billing_term: '',
        first_reg_date: '',
        first_reg_amount: '',
        first_reg_amount_2: '',
        first_payment_amount: '',
        recurring_amount: '',
        total_amount: '',
        subscription_start_date: '',
        subscription_end_date: '',
        expiry_date: '',
        termination_date: ''
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

    // Initialize states for default country (USA) on new partner creation
    useEffect(() => {
        if (!id && formData.country === 'USA') {
            const stateOptions = Object.keys(locationData['USA'].states).map((key) => ({
                label: locationData['USA'].states[key].name,
                value: key
            }));
            setStates(stateOptions);
        }
    }, [id]);

    // Update active tab when URL search params, location state, or ID changes
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam) {
            // Priority 1: URL query parameter
            setActiveTab(tabParam);
        } else if (location.state?.activeTab) {
            // Priority 2: Navigation state (from Link)
            setActiveTab(location.state.activeTab);
        } else if (id) {
            // Priority 3: If there's an ID but no explicit tab, default to statusAgent
            setActiveTab('statusAgent');
        } else {
            // Priority 4: New partner creation, default to personalDetails
            setActiveTab('personalDetails');
        }
    }, [searchParams, location.state, id]);

    const [profileImage, setProfileImage] = useState('/assets/images/users/avatar-1.jpg');

    // Fetch partner data if ID exists
    useEffect(() => {
        const fetchPartnerData = async () => {
            if (!id) return;
            try {
                const response = await getPartner(id);
                const data = response.data || response; // Handle both response.data and direct data

                console.log('Fetched partner data:', data); // Debug log

                // Handle location cascading first to ensure options are available
                let cityOptions = [];
                if (data.country && locationData[data.country]) {
                    const stateOptions = Object.keys(locationData[data.country].states).map((key) => ({
                        label: locationData[data.country].states[key].name,
                        value: key
                    }));
                    setStates(stateOptions);

                    if (data.state && locationData[data.country].states[data.state]) {
                        const cityList = locationData[data.country].states[data.state].cities;
                        cityOptions = cityList.map((city) => ({ label: city, value: city }));
                        setCities(cityOptions);
                    }
                }

                // Check if the city exists in the dropdown
                const cityExists = cityOptions.some(cityOption => cityOption.value === data.city);

                // If city doesn't exist in dropdown and city has a value, it's a custom city
                let cityValue = data.city || '';
                let otherCityValue = '';

                if (data.city && !cityExists) {
                    // City is not in dropdown, set to "Others" and populate other_city
                    otherCityValue = data.city;
                    cityValue = 'Others';
                }

                // Update form data - spread all backend data first, then override with mapped fields
                setFormData(prev => ({
                    ...prev,
                    ...data, // Keep all existing backend fields
                    city: cityValue, // Set city (either actual city or "Others")
                    other_city: otherCityValue, // Set other_city if applicable
                    agent: data.assigned_user_id || '', // Keep as number/string from DB
                    address_line_1: data.address_line_1 || '', // Map address_line_1 → address
                    partner_image: data.partner_image || '', // Map company_logo → partner_image
                    country_code: data.country_code || ((data.country === 'USA' || data.country === 'Canada') ? '+1' : ''),
                }));

                // Set profile image from company_logo field
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

    // Update Agent Email/Phone when Agent or Users change
    useEffect(() => {
        if (formData.agent && users.length > 0) {
            // Use loose equality (==) to match number from DB with number/string from options
            const selectedUser = users.find(user => user.id == formData.agent);
            if (selectedUser) {
                setFormData(prev => ({
                    ...prev,
                    agentEmail: selectedUser.email || '',
                    agentPhone: selectedUser.phone_number || ''
                }));
            }
        }
    }, [formData.agent, users]);

    // Fetch subscription data when subscription tab is active
    useEffect(() => {
        const fetchSubscriptionData = async () => {
            if (!id || activeTab !== 'subscription') return;

            try {
                const response = await getSubscription(id);
                if (response.status && response.data) {
                    const subscriptionData = response.data;
                    setFormData(prev => ({
                        ...prev,
                        partner_url: subscriptionData.partner_url || '',
                        billing_term: subscriptionData.billing_term || '',
                        first_reg_date: subscriptionData.first_reg_date || '',
                        first_reg_amount: subscriptionData.first_reg_amount || '',
                        first_reg_amount_2: subscriptionData.first_reg_amount_2 || '',
                        first_payment_amount: subscriptionData.first_payment_amount || '',
                        recurring_amount: subscriptionData.recurring_amount || '',
                        total_amount: subscriptionData.total_amount || '',
                        subscription_start_date: subscriptionData.subscription_start_date || '',
                        subscription_end_date: subscriptionData.subscription_end_date || '',
                        expiry_date: subscriptionData.expiry_date || '',
                        termination_date: subscriptionData.termination_date || ''
                    }));
                }
            } catch (error) {
                // console.error('Failed to fetch subscription data', error);
                // Don't show error toast if subscription doesn't exist yet (404)
                if (error.response?.status !== 404) {
                }
            }
        };

        fetchSubscriptionData();
    }, [id, activeTab]);

    // Validation function
    const validateField = (name, value) => {
        let error = null;
        switch (name) {
            case 'full_name':
            case 'company_name':
            case 'country':
            case 'state':
            case 'partner_type':
                error = validateRequired(value, name.replace('_', ' '));
                break;
            case 'city':
                error = validateRequired(value, 'city');
                break;
            case 'other_city':
                // Only validate other_city if city is set to "Others"
                if (formData.city === 'Others') {
                    error = validateRequired(value, 'Other City');
                }
                break;
            case 'address_line_1':
                error = validateRequired(value, 'Address');
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
            case 'status':
                error = validateRequired(value, 'Status');
                break;
            case 'agent':
                error = validateRequired(value, 'Agent');
                break;
            // Subscription validations - all fields required
            case 'partner_url':
                error = validateRequired(value, 'Partner URL');
                if (!error) {
                    try {
                        new URL(value);
                    } catch (_) {
                        error = 'Please enter a valid URL (Example: https://www.fourcornerholdings.com)';
                    }
                }
                break;
            case 'billing_term':
                error = validateRequired(value, 'Billing Term');
                break;
            case 'first_reg_date':
                error = validateRequired(value, 'First Registration Date');
                if (!error && isNaN(new Date(value).getTime())) {
                    error = 'Invalid Date';
                }
                break;
            case 'first_reg_amount':
                error = validateRequired(value, 'First Registration Amount');
                break;
            case 'first_payment_amount':
                error = validateRequired(value, 'First Payment Amount');
                break;
            case 'first_reg_amount_2':
                error = validateRequired(value, 'First Registration Amount 2');
                break;
            case 'recurring_amount':
                error = validateRequired(value, 'Recurring Amount');
                break;
            case 'total_amount':
                error = validateRequired(value, 'Total Amount');
                break;
            case 'subscription_start_date':
                error = validateRequired(value, 'Subscription Start Date');
                if (!error && isNaN(new Date(value).getTime())) {
                    error = 'Invalid Date';
                }
                // Also validate against end date if end date exists
                if (!error && formData.subscription_end_date && value) {
                    const startDate = new Date(value);
                    const endDate = new Date(formData.subscription_end_date);
                    if (startDate >= endDate) {
                        error = 'Subscription Start Date must be before End Date';
                    }
                }
                break;
            case 'subscription_end_date':
                error = validateRequired(value, 'Subscription End Date');
                if (!error && isNaN(new Date(value).getTime())) {
                    error = 'Invalid Date';
                }
                // Also validate against start date if start date exists
                if (!error && formData.subscription_start_date && value) {
                    const startDate = new Date(formData.subscription_start_date);
                    const endDate = new Date(value);
                    if (endDate <= startDate) {
                        error = 'Subscription End Date must be after Start Date';
                    }
                }
                break;
            case 'expiry_date':
                error = validateRequired(value, 'Expiry Date');
                if (!error && isNaN(new Date(value).getTime())) {
                    error = 'Invalid Date';
                }
                break;
            case 'termination_date':
                error = validateRequired(value, 'Termination Date');
                if (!error && isNaN(new Date(value).getTime())) {
                    error = 'Invalid Date';
                }
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
                // Validate file type
                const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                if (!validTypes.includes(file.type)) {
                    setErrors(prev => ({ ...prev, partner_image: 'Only JPG, JPEG, and PNG image formats are allowed.' }));
                    return;
                }

                // Validate file size (e.g., 2MB)
                const maxSize = 1 * 1024 * 1024; // 1MB
                if (file.size > maxSize) {
                    setErrors(prev => ({ ...prev, partner_image: 'The image size must not exceed 1 MB (1024 KB).' }));
                    return;
                }

                // Clear any previous image errors
                setErrors(prev => ({ ...prev, partner_image: null }));

                // Store the File object in formData
                setFormData(prev => ({ ...prev, partner_image: file }));
                // Create preview
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
            let countryCode = '';
            if (value === 'USA' || value === 'Canada') {
                countryCode = '+1';
            }
            setFormData(prev => ({ ...prev, country: value, country_code: countryCode, state: '', city: '', other_city: '' }));
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
            setFormData(prev => ({ ...prev, state: value, city: '', other_city: '' }));
            validateField('state', value);
            const countryCode = formData.country;
            if (countryCode && locationData[countryCode] && locationData[countryCode].states[value]) {
                const cityList = locationData[countryCode].states[value].cities;
                const cityOptions = cityList.map((city) => ({ label: city, value: city }));
                setCities(cityOptions);
            } else {
                setCities([]);
            }
        } else if (name === 'city') {
            // If city is not "Others", clear other_city
            if (value !== 'Others') {
                setFormData(prev => ({ ...prev, city: value, other_city: '' }));
            } else {
                setFormData(prev => ({ ...prev, city: value }));
            }
            validateField('city', value);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
            validateField(name, value);
        }
    };

    // Handle agent selection
    const handleAgentChange = (e) => {
        const agentId = e.target.value;
        const selectedUser = users.find(user => user.id == agentId);
        setFormData(prev => ({
            ...prev,
            agent: agentId,
            agentEmail: selectedUser?.email || '',
            agentPhone: selectedUser?.phone_number || ''
        }));
        // Validate agent field
        validateField('agent', agentId);
    };

    // Handle subscription save
    const handleSubscriptionSave = async () => {
        if (!id) {
            toast.error('Please save the partner first before adding subscription details');
            return;
        }

        try {
            // Validate all required subscription fields
            const requiredSubscriptionFields = {
                partner_url: formData.partner_url,
                billing_term: formData.billing_term,
                first_reg_date: formData.first_reg_date,
                first_reg_amount: formData.first_reg_amount,
                first_payment_amount: formData.first_payment_amount,
                first_reg_amount_2: formData.first_reg_amount_2,
                recurring_amount: formData.recurring_amount,
                total_amount: formData.total_amount,
                subscription_start_date: formData.subscription_start_date,
                subscription_end_date: formData.subscription_end_date,
                expiry_date: formData.expiry_date,
                termination_date: formData.termination_date
            };

            const fieldErrors = {};
            Object.entries(requiredSubscriptionFields).forEach(([field, value]) => {
                const error = validateField(field, value);
                if (error) {
                    fieldErrors[field] = error;
                }
            });

            // Additional date range validation
            if (formData.subscription_start_date && formData.subscription_end_date) {
                const startDate = new Date(formData.subscription_start_date);
                const endDate = new Date(formData.subscription_end_date);
                if (startDate >= endDate) {
                    fieldErrors.subscription_start_date = 'Subscription Start Date must be before End Date';
                    setErrors(prev => ({ ...prev, subscription_start_date: fieldErrors.subscription_start_date }));
                }
            }

            // If there are validation errors, show them and stop submission
            if (Object.keys(fieldErrors).length > 0) {
                toast.error('Please fill in all required fields correctly');
                return;
            }

            const subscriptionPayload = {
                partner_id: id,
                partner_url: formData.partner_url,
                billing_term: formData.billing_term,
                first_reg_date: formData.first_reg_date,
                first_reg_amount: formData.first_reg_amount,
                first_payment_amount: formData.first_payment_amount,
                first_reg_amount_2: formData.first_reg_amount_2,
                recurring_amount: formData.recurring_amount,
                total_amount: formData.total_amount,
                subscription_start_date: formData.subscription_start_date,
                subscription_end_date: formData.subscription_end_date,
                expiry_date: formData.expiry_date,
                termination_date: formData.termination_date
            };

            await saveSubscription(subscriptionPayload);
            toast.success('Subscription saved successfully');

            // Clear errors for successfully saved fields
            if (Object.keys(errors).length > 0) {
                setErrors((prev) => {
                    const newErrors = { ...prev };
                    Object.keys(requiredSubscriptionFields).forEach((field) => {
                        delete newErrors[field];
                    });
                    return newErrors;
                });
            }

            // Stay on subscription tab after save (no redirect)
        } catch (error) {
            console.error('Subscription save error:', error);
            if (error.response?.data?.errors) {
                const backendErrors = error.response.data.errors;
                // Set errors in state for display
                const errorObj = {};
                Object.entries(backendErrors).forEach(([field, errorMsg]) => {
                    const message = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
                    errorObj[field] = message;
                    toast.error(message);
                });
                setErrors(prev => ({ ...prev, ...errorObj }));
            } else if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to save subscription');
            }
        }
    };

    // Handle form submission
    const handleSave = async () => {
        // Delegate to subscription save if on subscription tab
        if (activeTab === 'subscription') {
            await handleSubscriptionSave();
            return;
        }

        try {
            // Validate required fields based on active tab
            let requiredFields = {};

            if (activeTab === 'statusAgent') {
                // Only validate status and agent for Status & Agent tab
                requiredFields = {
                    status: formData.status,
                    agent: formData.agent
                };
            } else {
                // Validate partner information fields for other tabs
                requiredFields = {
                    full_name: formData.full_name,
                    company_name: formData.company_name,
                    phone_number: formData.phone_number,
                    email: formData.email,
                    partner_type: formData.partner_type,
                    address_line_1: formData.address_line_1,
                    country: formData.country,
                    state: formData.state,
                    city: formData.city
                };

                // If city is "Others", also validate other_city
                if (formData.city === 'Others') {
                    requiredFields.other_city = formData.other_city;
                }
            }

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

            // Append all form fields with proper field name mapping
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    if (key === 'partner_image') {
                        // Only append if it's a File object (user selected a new image)
                        if (value instanceof File) {
                            // Send as 'partner_image' - the backend field name
                            formDataToSend.append('partner_image', value);
                        }
                        // Skip if it's a URL string (existing image from server)
                    } else if (key === 'agent') {
                        // Map 'agent' to 'assign_to' for backend
                        if (value !== '') {
                            formDataToSend.append('assign_to', value);
                        }
                    } else if (key === 'city') {
                        // If city is "Others", save the other_city value to city column
                        if (value === 'Others' && formData.other_city) {
                            formDataToSend.append('city', formData.other_city);
                        } else if (value !== 'Others') {
                            // Otherwise, save the selected city
                            formDataToSend.append('city', value);
                        }
                    } else if (key === 'other_city') {
                        // Don't send other_city as a separate field to backend
                        // It's handled in the city field logic above
                    } else if (key === 'agentEmail' || key === 'agentPhone' || key === 'company_logo') {
                        // Skip these:
                        // - agentEmail/Phone are frontend-only
                        // - company_logo (string) should not be sent back; we only send it if it's a File (handled above)
                    } else if (key === 'country_code') {
                        // Always send country_code if it exists
                        if (value) {
                            formDataToSend.append('country_code', value);
                        }
                    } else if (value !== '') {
                        formDataToSend.append(key, value);
                    }
                }
            });

            // Debug: Log what we're sending
            console.log('Sending FormData with:');
            for (let pair of formDataToSend.entries()) {
                console.log(pair[0] + ': ', pair[1]);
            }

            if (id) {
                await updatePartner(id, formDataToSend);
                toast.success('Partner updated successfully');

                // Redirect to next tab after update
                const tabOrder = ['personalDetails', 'statusAgent', 'documents', 'clientList', 'subscription'];
                const currentIndex = tabOrder.indexOf(activeTab);
                const nextTab = tabOrder[currentIndex + 1];

                if (nextTab) {
                    setTimeout(() => navigate(`/partners/${id}`, { state: { activeTab: nextTab } }), 800);
                } else {
                    // If on last tab, stay on current tab
                    setTimeout(() => navigate(`/partners/${id}`, { state: { activeTab: activeTab } }), 800);
                }
            } else {
                const response = await createPartner(formDataToSend);
                toast.success('Partner created successfully');

                // Get the newly created partner ID from response
                const newPartnerId = response?.data?.id || response?.id;

                if (newPartnerId) {
                    // Redirect to the partner profile page with Status & Agent tab active
                    setTimeout(() => navigate(`/partners/${newPartnerId}`, { state: { activeTab: 'statusAgent' } }), 800);
                } else {
                    // Fallback to partners list if no ID returned
                    setTimeout(() => navigate('/partners'), 800);
                }
            }

        } catch (error) {
            console.error('Save error:', error);
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
                                        <a
                                            className={`nav-link ${activeTab === 'statusAgent' ? 'active' : ''} ${!id ? 'disabled' : ''}`}
                                            onClick={() => id && setActiveTab('statusAgent')}
                                            role="tab"
                                            style={{ cursor: id ? 'pointer' : 'not-allowed', opacity: id ? 1 : 0.5 }}
                                        >
                                            <i className="far fa-user"></i> Status &amp; Agent
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a
                                            className={`nav-link ${activeTab === 'documents' ? 'active' : ''} ${!id ? 'disabled' : ''}`}
                                            onClick={() => id && setActiveTab('documents')}
                                            role="tab"
                                            style={{ cursor: id ? 'pointer' : 'not-allowed', opacity: id ? 1 : 0.5 }}
                                        >
                                            <i className="far fa-envelope"></i> Documents
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a
                                            className={`nav-link ${activeTab === 'clientList' ? 'active' : ''} ${!id ? 'disabled' : ''}`}
                                            onClick={() => id && setActiveTab('clientList')}
                                            role="tab"
                                            style={{ cursor: id ? 'pointer' : 'not-allowed', opacity: id ? 1 : 0.5 }}
                                        >
                                            <i className="far fa-list-alt"></i> Client List
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a
                                            className={`nav-link ${activeTab === 'subscription' ? 'active' : ''} ${!id ? 'disabled' : ''}`}
                                            onClick={() => id && setActiveTab('subscription')}
                                            role="tab"
                                            style={{ cursor: id ? 'pointer' : 'not-allowed', opacity: id ? 1 : 0.5 }}
                                        >
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
                                    partnerId={id}
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
                                                                    <small className="text-muted">Lead status updated: moved to "Proposal" — 05:16 PM</small>
                                                                </div>
                                                            </div>
                                                        </a>
                                                    </div>
                                                    <div id="collapseOne" className="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#accordionExample">
                                                        <div className="accordion-body ms-2 ps-5">
                                                            <p className="text-muted mb-0">Lead update: changed stage from "Qualified" to "Proposal". Next: follow-up call scheduled.</p>
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
        </div >
    );
}
