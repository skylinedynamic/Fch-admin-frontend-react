import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import "../../../assets/css/dropdown-validation.css";
import PageHeader from '../common/PageHeader';
import ProfileMetricCard from '../../components/Common/ProfileMetricCard';
import ProfileMetricCardSkeleton from '../../components/Common/ProfileMetricCardSkeleton';
import { createPartner, updatePartner, getPartner, allUsers, fetchPartnerProfileStats, attachPartnerDocuments, getNextPartnerId, fetchPartnerPlans, buildPartnerFormDataPayload, mapPartnerBackendErrors } from '../../modules/partner';
import { locationData } from '../../modules/location';
import { getCountryPhoneInfo } from '../../config/locations';
import { PARTNER_TYPES } from '../../config/partnerTypeOptions';
import { validateRequired, validateEmail } from '../../components/errors/validation';
import PartnerForm from './components/PartnerForm';
import avatarDefault from "../../../assets/images/users/avatar-1.jpg";
import EmailComposeModal from '../../components/Common/Modals/EmailComposeModal';
import ActivityCreateModal from '../../components/Common/Modals/ActivityCreateModal';
import ActivitySidebar from '../../components/Common/Activity/ActivitySidebar';
import { usePermissions } from '../../lib/auth/usePermissions';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { refreshUserData } from '../../lib/auth/auth';
import { ENROLLMENT_TYPE_INSTALLMENT } from '../../config/subscriptionConfig';
import { PARTNER_CONFIGURATION_TAB, canManagePartnerConfiguration } from '../../config/partnerConfiguration';
import { useAuthStore } from '../../store/auth/authStore';
import PartnerConfigurationSection from './components/PartnerConfigurationSection';

export default function PartnerProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { hasPermission } = usePermissions();
    const authUser = useAuthStore((state) => state.user);
    // Partner profile › Configuration: the host edits this partner's Email, SMS, Branding and Payment settings.
    const canConfigure = canManagePartnerConfiguration(authUser, hasPermission, id);

    // Permission checks
    const canCreate = hasPermission('create partners');


    // Access control: redirect to access-denied if lacks required permission

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
            value: locationData[key].name
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
        country: 'United States', // Default to full name
        country_code: getCountryPhoneInfo('USA')?.prefix || '+1',
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
        recurring_amount: '', // Legacy, keep for mapping
        monthly_platform_fee: '', // Accurate code: map to backend field
        total_paid_amount: '', // Renamed from total_amount
        subscription_start_date: '',
        subscription_end_date: '',
        expiry_date: '',
        termination_date: '',
        subscription_status: '',
        partner_domain: '',
        borrower_domain: '',
        is_free_trail: false,
        free_trail_end_date: '',
        // Installment plan fields
        installment_applied: false,
        installment_down_payment: 0,
        installment_months: 0,
        installment_monthly_amount: 0,
        installment_remaining_balance: 0,
        subscriptions: [],
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
        if (!id && formData.country) {
            // Find key from name
            const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === formData.country || key === formData.country);
            const countryCode = countryEntry ? countryEntry[0] : null;

            if (countryCode && locationData[countryCode]) {
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
    const [wasFreeTrial, setWasFreeTrial] = useState(false);

    // Fetch Partner Plans on mount
    const loadPlans = useCallback(async () => {
        try {
            const response = await fetchPartnerPlans();
            if (response.status) {
                setPartnerPlans(response.data || []);
            }
        } catch (err) {
            toast.error('Failed to load partner plans');
        }
    }, []);

    useEffect(() => {
        // Only load partner plans if creating a new partner, or if the partner is currently on a free trial (as they may convert to a paid plan)
        const isCreateMode = !id;
        const isFreeTrial = formData.is_free_trail == 1 || formData.is_free_trail === true || formData.is_free_trail === 'true' || wasFreeTrial;

        if (isCreateMode || isFreeTrial) {
            loadPlans();
        }
    }, [id, wasFreeTrial, formData.is_free_trail, loadPlans]);

    // Metrics Configuration
    const metricsConfig = [
        { label: 'Meetings', dataKey: 'total_meetings', icon: 'ri-calendar-line' },
        { label: 'Total Clients', dataKey: 'total_clients', icon: 'ri-star-line' },
        { label: 'Invoiced', dataKey: 'total_invoice', icon: 'ri-file-edit-line' },
        { label: 'Subscriptions', dataKey: 'enrollment_type', icon: 'ri-money-dollar-circle-line' },
        { label: 'Tickets', dataKey: 'total_tickets', icon: 'ri-lifebuoy-line' },
    ];

    // Fetch Profile Statistics
    const loadProfileStats = useCallback(async () => {
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
    }, [id]);

    useEffect(() => {
        loadProfileStats();
    }, [loadProfileStats]);

    const [profileImage, setProfileImage] = useState(avatarDefault);

    // Fetch partner data if ID exists
    const fetchPartnerData = useCallback(async (force = false) => {
        if (!id) return;

        // Skip if data is already loaded for this ID to prevent redundant calls on tab switch
        // But allow 'force' to bypass this (e.g., after saving)
        if (!force && formData && String(formData.id || formData.entity_id) === String(id) && formData.full_name) {
            return;
        }

        setIsPartnerLoading(true);
        try {
            const response = await getPartner(id);
            const data = response.data || response; // Handle both response.data and direct data

            // Normalize Country: Ensure it's the full name (United States/Canada) to match dropdown values
            let finalCountry = data.country;
            const countryEntry = Object.entries(locationData).find(([key, val]) => key === finalCountry || val.name === finalCountry);
            const countryCode = countryEntry ? countryEntry[0] : null;
            if (countryEntry) {
                finalCountry = countryEntry[1].name;
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
                status: data.status || '', // Explicitly map status
                address_line_1: data.address_line_1 || '', // Map address_line_1 → address
                partner_image: data.partner_image || '', // Map company_logo → partner_image
                country_code: data.country_code || ((finalCountry === 'United States' || finalCountry === 'Canada') ? '+1' : ''),
                plan_id: data.enrollment_details?.plan_id || '',
                enrollment_type: data.enrollment_details?.enrollment_type || '',
                payable_amount: data.enrollment_details?.payable_amount !== undefined && data.enrollment_details?.payable_amount !== null ? data.enrollment_details.payable_amount : '',
                total_subscription_amount: data.enrollment_details?.total_subscription_amount !== undefined && data.enrollment_details?.total_subscription_amount !== null ? data.enrollment_details.total_subscription_amount : '',
                monthly_platform_fee: data.enrollment_details?.monthly_platform_fee !== undefined && data.enrollment_details?.monthly_platform_fee !== null ? data.enrollment_details.monthly_platform_fee : '',
                enrollment_amount: data.enrollment_details?.enrollment_amount !== undefined && data.enrollment_details?.enrollment_amount !== null ? data.enrollment_details.enrollment_amount : '',
                installment_applied: data.enrollment_details?.installment_applied === true || data.enrollment_details?.installment_applied === 'true' || data.enrollment_details?.installment_applied === 1 || data.enrollment_details?.installment_applied === '1',
                installment_down_payment: Number(data.enrollment_details?.installment_down_payment || 0),
                installment_months: Number(data.enrollment_details?.installment_months || 0),
                installment_monthly_amount: Number(data.enrollment_details?.installment_monthly_amount || 0),
                installment_remaining_balance: Number(data.enrollment_details?.installment_remaining_balance || 0),
                // Formatted fields using helper strings from enrollment_details
                payable_amount_formatted: data.enrollment_details?.payable_amount_formatted || '',
                total_subscription_amount_formatted: data.enrollment_details?.total_subscription_amount_formatted || '',
                monthly_platform_fee_formatted: data.enrollment_details?.monthly_platform_fee_formatted || '',
                enrollment_amount_formatted: data.enrollment_details?.enrollment_amount_formatted || '',
                installment_down_payment_formatted: data.enrollment_details?.installment_down_payment_formatted || '',
                installment_monthly_amount_formatted: data.enrollment_details?.installment_monthly_amount_formatted || '',
                installment_remaining_balance_formatted: data.enrollment_details?.installment_remaining_balance_formatted || '',
                subscriptions: data.subscriptions || [],
            }));
            setWasFreeTrial(!!data.is_free_trail);

            // Set profile image from company_logo field
            if (data.partner_image) {
                setProfileImage(data.partner_image);
            }

        } catch (error) {
            toast.error("Failed to load partner data");
        } finally {
            setIsPartnerLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPartnerData();
    }, [fetchPartnerData]);

    const handleRefresh = useCallback(() => {
        fetchPartnerData();
        loadProfileStats();
    }, [fetchPartnerData, loadProfileStats]);

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
            const countryInfo = getCountryPhoneInfo(value);
            const countryCodePrefix = countryInfo ? countryInfo.prefix : '';
            setFormData(prev => ({ ...prev, country: value, country_code: countryCodePrefix, state: '', city: '', other_city: '' }));
            setErrors(prev => ({ ...prev, country: null }));

            const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === value || key === value);
            const code = countryEntry ? countryEntry[0] : null;

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

            const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === formData.country || key === formData.country);
            const countryCode = countryEntry ? countryEntry[0] : null;

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
                (plan.enrollment_type || '').toString().toLowerCase() === (currentEnrollmentType || '').toString().toLowerCase()
            );
            if (selectedPlan) {
                fees.enrollment_amount = selectedPlan.total_amount !== null && selectedPlan.total_amount !== undefined ? selectedPlan.total_amount.toString() : '0';
                fees.monthly_platform_fee = (selectedPlan.platform_fee || 0).toString();
                fees.recurring_amount = (selectedPlan.platform_fee || 0).toString();

                if ((currentEnrollmentType || '').toString().toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase()) {
                    fees.installment_applied = true;
                    fees.enrollment_amount = selectedPlan.total_amount || 0;
                    fees.installment_down_payment = 0;
                    fees.installment_months = 12;
                    fees.installment_monthly_amount = (selectedPlan.total_amount || 0) / 12;
                    fees.installment_remaining_balance = selectedPlan.total_amount || 0;
                } else {
                    fees.installment_applied = false;
                    fees.installment_down_payment = 0;
                    fees.installment_months = 0;
                    fees.installment_monthly_amount = 0;
                    fees.installment_remaining_balance = 0;
                }
            } else {
                // Fallback for types not in plans (like Referral)
                fees.enrollment_amount = '0';
                fees.monthly_platform_fee = '0';
                fees.recurring_amount = '0';
            }

            setFormData(prev => ({
                ...prev,
                [name]: newValue,
                ...fees
            }));
            setErrors(prev => ({ ...prev, [name]: null }));
        } else if (name === 'enrollment_amount') {
            setFormData(prev => {
                const remaining = Math.max(0, Number(value || 0) - Number(prev.installment_down_payment || 0));
                return {
                    ...prev,
                    enrollment_amount: value,
                    installment_remaining_balance: remaining
                };
            });
            setErrors(prev => ({ ...prev, enrollment_amount: null }));
        } else if (name === 'monthly_platform_fee' || name === 'recurring_amount') {
            setFormData(prev => ({ ...prev, monthly_platform_fee: value, recurring_amount: value }));
            setErrors(prev => ({ ...prev, monthly_platform_fee: null, platform_fee: null }));
        } else {
            setFormData(prev => {
                const nextState = { ...prev, [name]: value };
                if (name === 'installment_down_payment') {
                    nextState.installment_remaining_balance = Math.max(0, Number(nextState.enrollment_amount || 0) - Number(value || 0));
                }
                return nextState;
            });
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

    // Handle form submission
    const handleSave = async () => {
        setIsSaving(true);
        try {


            const formDataToSend = buildPartnerFormDataPayload(formData, id, wasFreeTrial, partnerPlans);

            if (id) {
                const updateResponse = await updatePartner(id, formDataToSend);
                // Force refresh both local form data and global user session
                await fetchPartnerData(true);
                await refreshUserData();

                toast.success('Partner updated successfully');
                window.dispatchEvent(new Event('refreshActivities'));

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
                // Stay on the tab that was saved.
            } else {
                const response = await createPartner(formDataToSend);
                toast.success('Partner created successfully');
                window.dispatchEvent(new Event('refreshActivities'));

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
                    // Open the new partner on the tab it was created from.
                    setTimeout(() => navigate(`/partners/${newPartnerId}`, { state: { activeTab } }), 800);
                } else {
                    // Fallback to partners list if no ID returned
                    setTimeout(() => navigate('/partners'), 800);
                }
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                const newErrors = mapPartnerBackendErrors(error.response.data.errors);
                setErrors(newErrors);
                requestAnimationFrame(() => {
                    const firstErrorField = document.querySelector('.is-invalid, .p-invalid');
                    if (firstErrorField) {
                        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
            } else if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(id ? 'Failed to update partner' : 'Failed to save partner');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                <PageHeader
                    title={id ? (formData.company_name || formData.full_name || 'Partner Profile') : 'Create Partner'}
                    breadcrumbs={[
                        { label: 'Partners', path: '/partners' },
                        { label: id ? (formData.company_name || formData.full_name || 'Partner Profile') : 'Create Partner' }
                    ]}
                >
                    <Link to="/partners" className="btn btn-outline-secondary w-lg waves-effect">
                        <i className="ri-arrow-left-line align-middle me-1"></i> Back
                    </Link>

                    {/* Generic Partner Save Button */}
                    {!['documents', 'clientList', 'subscription', 'agreement', 'tenantConfig', PARTNER_CONFIGURATION_TAB].includes(activeTab) && (
                        ((id && hasPermission('update partners')) || (!id && hasPermission('create partners'))) && (
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
                        )
                    )}

                    {/* Specific Tenant Config Save Button */}
                    {activeTab === 'tenantConfig' && id && hasPermission('update partners') && (
                        <button type="submit" form="tenant-config-form" className="btn btn-primary w-lg waves-effect" disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <i className="ri-save-3-line align-middle me-1"></i> Update
                                </>
                            )}
                        </button>
                    )}
                </PageHeader>

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
                    <div className={id ? "col-xxl-8" : "col-12"}>
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
                                    {formData.partner_type == PARTNER_TYPES.WHITE_LABEL && Number(formData.is_host) == 0 && (
                                        <li className="nav-item">
                                            <a
                                                className={`nav-link ${activeTab === 'tenantConfig' ? 'active' : ''} ${!id ? 'disabled' : ''}`}
                                                onClick={() => id && setActiveTab('tenantConfig')}
                                                role="tab"
                                                style={{ cursor: id ? 'pointer' : 'not-allowed', opacity: id ? 1 : 0.5 }}
                                            >
                                                Tenant Config
                                            </a>
                                        </li>
                                    )}
                                    {formData.has_sign && Number(formData.is_host) == 0 && (
                                        <li className="nav-item">
                                            <a
                                                className={`nav-link ${activeTab === 'agreement' ? 'active' : ''}`}
                                                onClick={() => setActiveTab('agreement')}
                                                role="tab"
                                                style={{ cursor: 'pointer' }}
                                            >
                                                Agreement
                                            </a>
                                        </li>
                                    )}
                                    {canConfigure && Number(formData.is_host) == 0 && (
                                        <li className="nav-item">
                                            <a
                                                className={`nav-link ${activeTab === PARTNER_CONFIGURATION_TAB ? 'active' : ''}`}
                                                onClick={() => setActiveTab(PARTNER_CONFIGURATION_TAB)}
                                                role="tab"
                                                style={{ cursor: 'pointer' }}
                                            >
                                                Configuration
                                            </a>
                                        </li>
                                    )}
                                </ul>
                            </div>
                            <div className="card-body p-4">
                                {activeTab === PARTNER_CONFIGURATION_TAB && canConfigure && Number(formData.is_host) == 0 ? (
                                    // Keyed by partner, so another partner's settings never carry over.
                                    <PartnerConfigurationSection
                                        key={id}
                                        partner={{
                                            id: Number(id),
                                            company_name: formData.company_name,
                                            partner_type: formData.partner_type,
                                            is_host: formData.is_host,
                                            full_name: formData.full_name,
                                            email: formData.email,
                                            phone_number: formData.phone_number,
                                            status: formData.status,
                                        }}
                                    />
                                ) : (
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
                                    onRefresh={handleRefresh}
                                    setIsSaving={setIsSaving}
                                    wasFreeTrial={wasFreeTrial}
                                />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Activity Sidebar */}
                    {id && (
                        <div className="col-xxl-4">
                            <ActivitySidebar entityId={id} entityType="Partner" loading={isPartnerLoading} partnerEmail={formData.email} />
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <EmailComposeModal entityId={id} entityType="Partner" />
            <ActivityCreateModal entityId={id} entityType="Partner" />
        </div >
    );
}
