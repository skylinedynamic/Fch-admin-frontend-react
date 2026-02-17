import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import '../../../assets/css/dropdown-validation.css';
import ProfileMetricCard from '../../components/Common/ProfileMetricCard';
import ProfileMetricCardSkeleton from '../../components/Common/ProfileMetricCardSkeleton';
import { createPartner, updatePartner, getPartner, allUsers, getSubscription, saveSubscription, fetchPartnerProfileStats, attachPartnerDocuments, getNextPartnerId, fetchPartnerPlans } from '../../modules/partner/services';
import { locationData } from '../../config';
import { PARTNER_TYPES, ENROLLMENT_TYPES, SUBSCRIPTION_PARTNER_TYPES, PARTNER_TYPE_OPTIONS, PAYMENT_TYPE_OPTIONS, PARTNER_INFORMATION_TYPE_OPTIONS } from '../../config/partnerTypeOptions';
import { validateRequired, validateEmail, validatePhone } from '../../components/errors/validation';
import PartnerForm from './components/PartnerForm';
import avatarDefault from '../../../assets/images/users/avatar-1.jpg';
import EmailComposeModal from '../../components/Common/Modals/EmailComposeModal';
import ActivityCreateModal from '../../components/Common/Modals/ActivityCreateModal';
import { usePermissions } from '../../lib/auth/usePermissions';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function PartnerProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { hasPermission } = usePermissions();

    // Permission checks
    const canCreate = hasPermission('create partners');
    const canUpdate = hasPermission('update partners');

    // Access control: redirect to access-denied if lacks required permission
    if (id && !canUpdate) {
        return <Navigate to="/access-denied" replace />;
    }
    if (!id && !canCreate) {
        return <Navigate to="/access-denied" replace />;
    }

    // Determine initial active tab based on navigation state or defaults
    const getInitialTab = () => {
        // Priority 1: URL query parameter
        if (searchParams.get('tab')) return searchParams.get('tab');
        // Priority 2: Navigation state (from Link or navigate)
        if (location.state && location.state.activeTab) return location.state.activeTab;
        // Priority 3: Default based on whether it's a new partner or existing
        return id ? 'statusAgent' : 'personalDetails';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab());
    const [errors, setErrors] = useState({});
    const [selectedDocumentsToAttach, setSelectedDocumentsToAttach] = useState([]);
    const [documentsReloadKey, setDocumentsReloadKey] = useState(0);
    const [documentsClearKey, setDocumentsClearKey] = useState(0);

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
        entity_id: '',
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
        country: 'USA', // Default to key
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
        enrollment_type: '', // Replaces billing_term or adds to it
        enrollment_amount: '',
        first_reg_date: '',
        first_reg_amount: '',
        first_reg_amount_2: '',
        first_reg_payment_2: '',
        first_reg_payment: '',
        recurring_amount: '',
        total_paid_amount: '', // Renamed from total_amount
        subscription_start_date: '',
        subscription_end_date: '',
        expiry_date: '',
        termination_date: '',
        subscription_status: ''
    });

    // Fetch Partner Plans on mount
    useEffect(() => {
        const loadPlans = async () => {
            try {
                const response = await fetchPartnerPlans();
                if (response.status) {
                    setPartnerPlans(response.data || []);
                }
            } catch (err) {
                toast.error('Failed to load partner plans');
            }
        };
        loadPlans();
    }, []);

    // Fetch users on mount
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await allUsers();
                if (response.status && response.data) {
                    setUsers(response.data);
                }
            } catch (error) {
                toast.error('Failed to load users');
            }
        };
        fetchUsers();
    }, []);

    // Fetch next partner ID for new partners
    useEffect(() => {
        const fetchNextId = async () => {
            if (!id) {
                try {
                    const response = await getNextPartnerId();
                    const nextId = response.next_id || response.data?.next_id;
                    if (nextId) {
                        setFormData(prev => ({
                            ...prev,
                            entity_id: nextId
                        }));
                    }
                } catch (error) {
                    // console.error('Failed to fetch next partner ID', error);
                } finally {
                    setIsPartnerLoading(false);
                }
            } else {
                // If we have ID, loading is handled by fetchPartnerData
                // But if fetchPartnerData dependency logic is complex, ensuring defaults:
            }
        };
        fetchNextId();
    }, [id]);

    // Initialize states for default country (United States) on new partner creation
    useEffect(() => {
        if (!id && formData.country === 'USA') {
            const countryCode = 'USA';

            if (locationData[countryCode]) {
                const stateOptions = Object.keys(locationData[countryCode].states).map((key) => ({
                    label: locationData[countryCode].states[key].name,
                    value: locationData[countryCode].states[key].name
                }));
                setStates(stateOptions);
            }
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

    // Clear errors when active tab changes
    useEffect(() => {
        setErrors({});
    }, [activeTab]);

    // Profile Statistics State
    const [profileStats, setProfileStats] = useState({
        total_meetings: 0,
        total_clients: 0,
        total_invoice: 0,
        enrollment_type: 'N/A',
        total_tickets: 0
    });
    const [profileStatsLoading, setProfileStatsLoading] = useState(true);
    const [isPartnerLoading, setIsPartnerLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [partnerPlans, setPartnerPlans] = useState([]);

    // Metrics Configuration
    const metricsConfig = [
        { label: 'Meetings', dataKey: 'total_meetings', icon: 'ri-calendar-line' },
        { label: 'Total Clients', dataKey: 'total_clients', icon: 'ri-star-line' },
        { label: 'Invoiced', dataKey: 'total_invoice', icon: 'ri-file-edit-line' },
        { label: 'Subscriptions', dataKey: 'enrollment_type', icon: 'ri-money-dollar-circle-line' },
        { label: 'Tickets', dataKey: 'total_tickets', icon: 'ri-lifebuoy-line' },
    ];

    // Fetch Profile Statistics
    useEffect(() => {
        const loadProfileStats = async () => {
            if (!id) {
                setProfileStatsLoading(false);
                return;
            }

            try {
                setProfileStatsLoading(true);
                const result = await fetchPartnerProfileStats(id);
                if (result.status && result.data) {
                    setProfileStats(result.data);
                }
            } catch (error) {
            } finally {
                setProfileStatsLoading(false);
            }
        };

        loadProfileStats();
    }, [id]);

    const [profileImage, setProfileImage] = useState(avatarDefault);

    // Fetch partner data if ID exists
    useEffect(() => {
        const fetchPartnerData = async () => {
            if (!id) return;
            setIsPartnerLoading(true);
            try {
                const response = await getPartner(id);
                const data = response.data || response; // Handle both response.data and direct data

                // Normalize Country: Ensure it's a key (USA/Canada)
                let finalCountry = data.country;
                const countryEntry = Object.entries(locationData).find(([key, val]) => key === finalCountry || val.name === finalCountry);
                const countryCode = countryEntry ? countryEntry[0] : null;
                if (countryCode) {
                    finalCountry = countryCode;
                }

                // Normalize State
                let finalState = data.state;
                if (countryCode && locationData[countryCode]) {
                    const sEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => key === finalState || val.name === finalState);
                    if (sEntry) {
                        finalState = sEntry[1].name;
                    }
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
                    const stateCode = sEntry ? sEntry[0] : null;

                    if (stateCode && locationData[countryCode].states[stateCode]) {
                        const cityList = locationData[countryCode].states[stateCode].cities;
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
                    country: finalCountry,
                    state: finalState,
                    city: cityValue, // Set city (either actual city or "Others")
                    other_city: otherCityValue, // Set other_city if applicable
                    agent: data.assigned_user_id || '', // Keep as number/string from DB
                    address_line_1: data.address_line_1 || '', // Map address_line_1 → address
                    partner_image: data.partner_image || '', // Map company_logo → partner_image
                    country_code: data.country_code || ((finalCountry === 'United States' || finalCountry === 'Canada') ? '+1' : ''),
                }));

                // Set profile image from company_logo field
                if (data.partner_image) {
                    setProfileImage(data.partner_image);
                }

            } catch (error) {
                toast.error("Failed to load partner data");
            } finally {
                setIsPartnerLoading(false);
            }
        };

        fetchPartnerData();
    }, [id, activeTab]);

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
            if (!id || activeTab !== 'subscription' || isPartnerLoading) return;

            try {
                const response = await getSubscription(id);
                if (response.status && response.data) {
                    const subscriptionData = response.data;
                    setFormData(prev => ({
                        ...prev,
                        partner_type: subscriptionData.partner_type || prev.partner_type,
                        enrollment_type: subscriptionData.enrollment_type || '',
                        enrollment_amount: subscriptionData.enrollment_amount || '',
                        first_reg_date: subscriptionData.first_reg_date || '',
                        first_reg_amount: subscriptionData.first_reg_amount || '',
                        first_reg_amount_2: subscriptionData.first_reg_amount_2 || '',
                        first_reg_payment: subscriptionData.first_reg_payment || '',
                        first_reg_payment_2: subscriptionData.first_reg_payment_2 || '',
                        recurring_amount: subscriptionData.monthly_platform_fee || subscriptionData.recurring_amount || '',
                        total_paid_amount: subscriptionData.total_paid_amount || '',
                        subscription_start_date: subscriptionData.subscription_start_date || '',
                        subscription_end_date: subscriptionData.subscription_end_date || '',
                        expiry_date: subscriptionData.expiry_date || '',
                        termination_date: subscriptionData.termination_date || '',
                        subscription_status: subscriptionData.status || ''
                    }));
                }
            } catch (error) {
                // console.error('Failed to fetch subscription data', error);
                // If subscription doesn't exist (404), reset subscription fields to empty
                if (error.response?.status === 404) {
                    setFormData(prev => ({
                        ...prev,
                        enrollment_type: '',
                        enrollment_amount: '',
                        first_reg_date: '',
                        first_reg_amount: '',
                        first_reg_payment: '',
                        first_reg_payment_2: '',
                        recurring_amount: '',
                        total_paid_amount: '',
                        subscription_start_date: '',
                        subscription_end_date: '',
                        expiry_date: '',
                        termination_date: '',
                        subscription_status: ''
                    }));
                }
            }
        };

        fetchSubscriptionData();
    }, [id, activeTab, isPartnerLoading]);



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
            let countryCodePrefix = '';
            if (value === 'USA' || value === 'Canada') {
                countryCodePrefix = '+1';
            }
            setFormData(prev => ({ ...prev, country: value, country_code: countryCodePrefix, state: '', city: '', other_city: '' }));
            setErrors(prev => ({ ...prev, country: null }));

            const code = value; // Value is now the code "USA" or "Canada"

            if (code && locationData[code]) {
                const stateOptions = Object.keys(locationData[code].states).map((key) => ({
                    label: locationData[code].states[key].name,
                    value: locationData[code].states[key].name
                }));
                setStates(stateOptions);
                setCities([]);
            } else {
                setStates([]);
                setCities([]);
            }
        } else if (name === 'state') {
            setFormData(prev => ({ ...prev, state: value, city: '', other_city: '' }));
            setErrors(prev => ({ ...prev, state: null }));

            const countryCode = formData.country; // Already the code

            if (countryCode && locationData[countryCode]) {
                const sEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === value);
                const stateCode = sEntry ? sEntry[0] : null;

                if (stateCode && locationData[countryCode].states[stateCode]) {
                    const cityList = locationData[countryCode].states[stateCode].cities;
                    const cityOptions = cityList.map((city) => ({ label: city, value: city }));
                    setCities(cityOptions);
                } else {
                    setCities([]);
                }
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
            setErrors(prev => ({ ...prev, city: null }));
        } else if (name === 'enrollment_type' || name === 'partner_type') {
            const newValue = value;
            const currentPartnerType = name === 'partner_type' ? newValue : formData.partner_type;
            const currentEnrollmentType = name === 'enrollment_type' ? newValue : formData.enrollment_type;

            let fees = {};

            // Find the matching plan from fetched partnerPlans
            const selectedPlan = partnerPlans.find(plan =>
                plan.partner_type === currentPartnerType &&
                plan.enrollment_type === currentEnrollmentType
            );

            if (selectedPlan) {
                fees.enrollment_amount = selectedPlan.payment_amount.toString();
                fees.first_reg_amount = selectedPlan.payment_amount.toString();
                fees.first_reg_payment = selectedPlan.payment_amount.toString();
                fees.recurring_amount = (selectedPlan.platform_fee || 0).toString();

                // Special case for Payment Plan
                if (currentEnrollmentType.includes('Payment Plan')) {
                    fees.recurring_amount = selectedPlan.payment_amount.toString();
                }
            } else {
                // Fallback for types not in plans (like Referral)
                fees.enrollment_amount = '0';
                fees.recurring_amount = '0';
                fees.first_reg_amount = '0';
                fees.first_reg_payment = '0';
            }

            setFormData(prev => ({
                ...prev,
                [name]: newValue,
                ...fees
            }));
            setErrors(prev => ({ ...prev, [name]: null }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
            setErrors(prev => ({ ...prev, [name]: null }));
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
        setErrors(prev => ({ ...prev, agent: null }));
    };

    // Handle subscription save
    const handleSubscriptionSave = async () => {
        if (!id) {
            toast.error('Please save the partner first before adding subscription details');
            return;
        }

        try {


            const subscriptionPayload = {
                partner_id: id,
                partner_type: formData.partner_type,
                enrollment_type: formData.enrollment_type,
                enrollment_amount: formData.enrollment_amount,
                first_reg_date: formData.first_reg_date,
                first_reg_amount: formData.first_reg_amount,
                first_reg_payment: formData.first_reg_payment,
                first_reg_payment_2: formData.first_reg_payment_2,
                monthly_platform_fee: formData.recurring_amount,
                total_paid_amount: formData.total_paid_amount,
                subscription_start_date: formData.subscription_start_date,
                subscription_end_date: formData.subscription_end_date,
                expiry_date: formData.expiry_date,
                termination_date: formData.termination_date,
                status: formData.subscription_status
            };

            await saveSubscription(subscriptionPayload);
            toast.success('Subscription saved successfully');

            // Clear errors for successfully saved fields
            if (Object.keys(errors).length > 0) {
                setErrors({});
            }

            // Stay on subscription tab after save (no redirect)
        } catch (error) {
            if (error.response?.data?.errors) {
                const backendErrors = error.response.data.errors;
                // Set errors in state for display
                const errorObj = {};
                Object.entries(backendErrors).forEach(([field, errorMsg]) => {
                    const message = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
                    errorObj[field] = message;
                    // toast.error(message);
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
        setIsSaving(true);
        try {
            // Delegate to subscription save if on subscription tab
            if (activeTab === 'subscription') {
                await handleSubscriptionSave();
                return;
            }

            try {
                // Frontend validation for Partner Information removed to rely on backend validation

                const formDataToSend = new FormData();

                // Append all form fields with proper field name mapping
                Object.entries(formData).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                        // Skip partner_type and enrollment_type during update to prevent changes
                        if (id && (key === 'partner_type' || key === 'enrollment_type')) {
                            return;
                        }

                        if (key === 'partner_image') {
                            // Append if it's a File object (user selected a new image) or a string path (from file manager)
                            if (value instanceof File) {
                                // Send as 'partner_image' - the backend field name
                                formDataToSend.append('partner_image', value);
                            } else if (typeof value === 'string' && value.trim() !== '' && !value.startsWith('http')) {
                                // Send path string if it's not a full URL (which usually means it was just selected from file manager)
                                formDataToSend.append('partner_image', value);
                            }
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
                        } else if (key === 'enrollment_amount') {
                            // Explicitly ensure enrollment_amount is included and not null
                            formDataToSend.append('enrollment_amount', value || '');
                        } else if (value !== '' && value !== null) {
                            formDataToSend.append(key, value);
                        }
                    }
                });


                if (id) {
                    await updatePartner(id, formDataToSend);
                    toast.success('Partner updated successfully');

                    // Redirect to next tab after update
                    // Attach any selected documents (selected in DocumentsSection)
                    try {
                        if (selectedDocumentsToAttach && selectedDocumentsToAttach.length > 0) {
                            const filePaths = selectedDocumentsToAttach.map(f => (typeof f === 'string' ? f : (f.path || f)));
                            await attachPartnerDocuments({
                                partner_id: id,
                                files: filePaths,
                                document_type: 'Documents',
                                entity_type: 'partners',
                                entity_id: id
                            });
                            toast.success(`${filePaths.length} document(s) uploaded`);
                            setDocumentsReloadKey(k => k + 1);
                            setDocumentsClearKey(k => k + 1);
                            setSelectedDocumentsToAttach([]);
                        }
                    } catch (e) {
                        toast.error(e.response?.data?.message || 'Failed to attach documents');
                    }
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
                        // If there are selected documents from the DocumentsSection, attach them to the new partner
                        try {
                            if (selectedDocumentsToAttach && selectedDocumentsToAttach.length > 0) {
                                const filePaths = selectedDocumentsToAttach.map(f => (typeof f === 'string' ? f : (f.path || f)));
                                await attachPartnerDocuments({
                                    partner_id: newPartnerId,
                                    files: filePaths,
                                    document_type: 'Documents',
                                    entity_type: 'partners',
                                    entity_id: newPartnerId
                                });
                                toast.success(`${filePaths.length} document(s) uploaded`);
                                setDocumentsReloadKey(k => k + 1);
                                setDocumentsClearKey(k => k + 1);
                                setSelectedDocumentsToAttach([]);
                            }
                        } catch (e) {
                            toast.error(e.response?.data?.message || 'Failed to attach documents');
                        }
                        // Redirect to the partner profile page with Status & Agent tab active
                        setTimeout(() => navigate(`/partners/${newPartnerId}`, { state: { activeTab: 'statusAgent' } }), 800);
                    } else {
                        // Fallback to partners list if no ID returned
                        setTimeout(() => navigate('/partners'), 800);
                    }
                }

            } catch (error) {
                if (error.response?.data?.errors) {
                    const backendErrors = error.response.data.errors;
                    const newErrors = {};
                    Object.entries(backendErrors).forEach(([field, errorMsg]) => {
                        const message = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
                        // toast.error(message);
                        newErrors[field] = message;
                    });
                    setErrors(newErrors);
                } else if (error.response?.data?.message) {
                    toast.error(error.response.data.message);
                } else {
                    toast.error(id ? 'Failed to update partner' : 'Failed to save partner');
                }
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Page Title */}
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
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
                            {!['documents', 'clientList', 'subscription'].includes(activeTab) && (
                                <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                    <Link to="/partners" className="btn btn-outline-secondary w-lg waves-effect">
                                        <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                    </Link>
                                    <button type="button" onClick={handleSave} className="btn btn-primary w-lg waves-effect" disabled={isSaving || isPartnerLoading}>
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
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Metrics Strip */}
                <div className="row pt-1">
                    <div className="col-12">
                        <div className="d-flex flex-wrap metrics-strip justify-content-center">
                            {profileStatsLoading ? (
                                // Loading Skeletons
                                [1, 2, 3, 4, 5].map((_, index) => (
                                    <ProfileMetricCardSkeleton key={index} />
                                ))
                            ) : (
                                // Dynamic Metrics
                                metricsConfig.map((metric, index) => (
                                    <ProfileMetricCard
                                        key={index}
                                        label={metric.label}
                                        value={profileStats[metric.dataKey] !== undefined && profileStats[metric.dataKey] !== null
                                            ? profileStats[metric.dataKey]
                                            : '0'}
                                        icon={metric.icon}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="row">
                    <div className="col-xxl-12">
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
                                            <i className="far fa-list-alt"></i> Subscription
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
                                    loading={isPartnerLoading}
                                    onSelectedFilesChange={setSelectedDocumentsToAttach}
                                    documentsReloadKey={documentsReloadKey}
                                    documentsClearKey={documentsClearKey}
                                    partnerPlans={partnerPlans}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Activity Sidebar */}
                    {/* <div className="col-xxl-4">
                        <div className="card">
                            <div className="card-header px-2 py-2 align-items-center justify-content-between d-flex">
                                <h4 style={{ padding: '8px 0px' }} className="card-title mb-0 me-2">
                                    <i className="ri-history-line align-middle me-2"></i>Activity
                                </h4>
                                <div className="d-flex flex-wrap gap-2 chip-actions">
                                    <button
                                        type="button"
                                        className="btn btn-light btn-sm"
                                        data-bs-toggle="modal"
                                        data-bs-target="#emailComposeModal"
                                    >
                                        <i className="ri-mail-line align-middle me-1"></i>New Email
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-light btn-sm"
                                        data-bs-toggle="modal"
                                        data-bs-target="#activityCreateModal"
                                    >
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
                    </div> */}
                </div>
            </div>

            {/* Modals */}
            <EmailComposeModal />
            <ActivityCreateModal />
        </div >
    );
}
