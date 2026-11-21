import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import "../../../assets/css/dropdown-validation.css";
import PageHeader from '../common/PageHeader';
import ProfileMetricCard from '../../components/Common/ProfileMetricCard';
import ProfileMetricCardSkeleton from '../../components/Common/ProfileMetricCardSkeleton';
import OverflowTabs from '../../components/Common/OverflowTabs';
import PartnerMailNotificationTab from './components/PartnerMailNotificationTab';
import { PARTNER_MAIL_NOTIFICATION_TAB, PARTNER_MAIL_NOTIFICATION_FORM_ID } from '../../config/partnerMailNotification';
import { createPartner, updatePartner, getPartner, getPartnerStatusAgent, updatePartnerStatusAgent, allUsers, fetchPartnerProfileStats, attachPartnerDocuments, getNextPartnerId, fetchPartnerPlans, buildPartnerFormDataPayload, mapPartnerBackendErrors, defaultInstallmentMonths } from '../../modules/partner';
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
import PartnerCommissionTab from './components/PartnerCommissionTab';
import { PARTNER_COMMISSION_TAB, PARTNER_COMMISSION_FORM_ID, COMMISSION_VIEW_PERMISSION, COMMISSION_MANAGE_PERMISSION } from '../../config/partnerCommission';
import ErrorPage from '../Utility/ErrorPage';
import { FILE_MANAGER_CONFIG } from '../../modules/filemanager/config';
import { emailFieldValue } from '../../modules/account';

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
        // Priority 3: the first tab, Partner information - for a new partner and
        // an existing one alike, so a reload (which keeps no tab) starts there.
        return 'personalDetails';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab());
    const [errors, setErrors] = useState({});
    // The partner does not exist (or is out of reach): shown as Partner Not Found (partnerNotFound).
    const isMissing = (error) => [403, 404].includes(error?.response?.status);
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

    // Agent options: active staff only, keeping the partner's saved Agent even
    // if since made inactive - so an existing partner waits for its data.
    const partnerLoaded = !id || formData.id != null;
    const savedAgentId = formData.assigned_user_id ?? null;
    useEffect(() => {
        if (!partnerLoaded) return;
        const fetchUsers = async () => {
            try {
                const response = await allUsers({
                    active_only: true,
                    ...(savedAgentId ? { keep_ids: [Number(savedAgentId)] } : {}),
                });
                if (response.status && response.data) {
                    setUsers(response.data);
                }
            } catch (error) {
                toast.error('Failed to load users');
            }
        };
        fetchUsers();
    }, [partnerLoaded, savedAgentId]);

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
        } else {
            // Priority 3: the first tab, Partner information (see getInitialTab).
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
    const [partnerNotFound, setPartnerNotFound] = useState(false);
    // Set once the user changes Status or Agent: from then on a load that comes
    // back late (details or status-agent) must not put the old values back, or
    // Update saves those instead of the user's choice (BUG-171). Cleared by a
    // save and by opening another partner.
    const statusAgentEditedRef = useRef(false);

    useEffect(() => {
        setPartnerNotFound(false);
        statusAgentEditedRef.current = false;
    }, [id]);
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

    // Counters and activity wait for the partner: an id that is not one
    // (/partners/abc) must not reach them (BUG-001).
    useEffect(() => {
        if (partnerLoaded) loadProfileStats();
    }, [partnerLoaded, loadProfileStats]);

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
                // The pending email while a change waits, and the one still in
                // use beside it for the notice (BUG-203). Never sent back.
                email: emailFieldValue(data.email, data.pending_email),
                signin_email: data.email || '',
                country: finalCountry,
                state: finalState,
                city: cityValue, // Set city (either actual city or "Others")
                other_city: otherCityValue, // Set other_city if applicable
                // Keep the user's unsaved Status/Agent if this load came back after they changed them (BUG-171).
                agent: statusAgentEditedRef.current ? prev.agent : (data.assigned_user_id || ''), // Keep as number/string from DB
                status: statusAgentEditedRef.current ? prev.status : (data.status || ''), // Explicitly map status
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
            // 404/403: shown as Partner Not Found, as clients and leads do (BUG-030).
            if ([403, 404].includes(error?.response?.status)) {
                setPartnerNotFound(true);
            } else {
                toast.error("Failed to load partner data");
            }
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

    // The Status & Agent tab's values, from its own endpoint. The agent's email
    // and mobile are read-only and may be empty.
    // A load is skipped while the user has unsaved Status/Agent changes; the
    // saved values (force) always apply.
    const applyStatusAgent = useCallback((sa, { force = false } = {}) => {
        if (!sa || typeof sa !== 'object' || Array.isArray(sa)) return;
        if (statusAgentEditedRef.current && !force) return;
        setFormData(prev => ({
            ...prev,
            status: sa.status || '',
            agent: sa.assign_to ?? '',
            agentEmail: sa.agent?.email || '',
            agentPhone: sa.agent?.phone_number || ''
        }));
    }, []);

    const fetchStatusAgent = useCallback(async () => {
        if (!id) return;
        try {
            applyStatusAgent(await getPartnerStatusAgent(id));
        } catch (error) {
            if (isMissing(error)) setPartnerNotFound(true);
            else toast.error(error.response?.data?.message || 'Failed to load status and agent');
        }
    }, [id, applyStatusAgent]);

    useEffect(() => {
        if (activeTab === 'statusAgent') {
            fetchStatusAgent();
        }
    }, [activeTab, fetchStatusAgent]);

    // The Agreement tab saved the switch itself: keep the new value, nothing to reload.
    const handleAgreementRequiredChange = useCallback((required) => {
        setFormData(prev => ({ ...prev, agreement_required: required }));
    }, []);

    // The Commissions tab saved the tiers itself: keep them, nothing to reload.
    const handleCommissionSaved = useCallback((saved) => {
        setFormData(prev => ({
            ...prev,
            commission_tiers: saved.commission_tiers,
            funded_deal_count: saved.funded_deal_count,
        }));
    }, []);

    // Partner profile › Commissions: the host's team sets a partner's share of
    // the success fee. Not on the host's own profile - the admin keeps it all.
    const canViewCommission = Boolean(id)
        && Number(authUser?.is_host) === 1
        && Number(formData.is_host) === 0
        && hasPermission(COMMISSION_VIEW_PERMISSION);
    const canEditCommission = canViewCommission && hasPermission(COMMISSION_MANAGE_PERMISSION);
    // The tab reports whether its rate changed / is saving, for the header's Save button.
    const [commissionForm, setCommissionForm] = useState({ dirty: false, saving: false });
    const [mailNotificationForm, setMailNotificationForm] = useState({ dirty: false, saving: false });

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
        if (name === 'status' || name === 'agent') statusAgentEditedRef.current = true;

        if (type === 'file') {
            const file = files[0];
            if (file) {
                // Validate file type
                const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                if (!validTypes.includes(file.type)) {
                    setErrors(prev => ({ ...prev, partner_image: 'Only JPG, JPEG, and PNG image formats are allowed.' }));
                    return;
                }

                // The API's picture limit, 5 MB (BUG-014)
                const maxSize = FILE_MANAGER_CONFIG.MAX_PICTURE_SIZE;
                if (file.size > maxSize) {
                    setErrors(prev => ({ ...prev, partner_image: `The image size must not exceed ${maxSize / 1024 / 1024} MB.` }));
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
                    // 12, or the plan's Installment Upto when lower (BUG-114).
                    const months = defaultInstallmentMonths(selectedPlan);
                    fees.installment_months = months;
                    fees.installment_monthly_amount = (selectedPlan.total_amount || 0) / months;
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
        statusAgentEditedRef.current = true;
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
            // The Status & Agent tab saves only its two fields, on their own endpoint.
            if (id && activeTab === 'statusAgent') {
                const saved = await updatePartnerStatusAgent(id, {
                    status: formData.status || '',
                    assign_to: formData.agent || ''
                });
                // Saved: what the API kept is now the form's value, and later loads apply again.
                statusAgentEditedRef.current = false;
                applyStatusAgent(saved, { force: true });
                setErrors(prev => ({ ...prev, status: null, agent: null }));
                toast.success('Status and agent updated successfully');
                window.dispatchEvent(new Event('refreshActivities'));
                return;
            }

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

    // The profile's tabs, in order. Those that need a saved partner are shown, but disabled, while creating one.
    const partnerTabs = [
        { key: 'personalDetails', label: 'Partner information' },
        { key: 'statusAgent', label: 'Status & Agent', disabled: !id },
        { key: 'documents', label: 'Documents', disabled: !id },
        { key: 'clientList', label: 'Client List', disabled: !id },
        { key: 'subscription', label: 'Subscription', disabled: !id },
        ...(formData.partner_type == PARTNER_TYPES.WHITE_LABEL && Number(formData.is_host) == 0
            ? [{ key: 'tenantConfig', label: 'Tenant Config', disabled: !id }]
            : []),
        // The host also uses it before signing, to excuse this partner.
        ...((formData.has_sign || (Number(authUser?.is_host) == 1 && id)) && Number(formData.is_host) == 0
            ? [{ key: 'agreement', label: 'Agreement' }]
            : []),
        ...(canConfigure && Number(formData.is_host) == 0 ? [{ key: PARTNER_CONFIGURATION_TAB, label: 'Configuration' }] : []),
        ...(canViewCommission ? [{ key: PARTNER_COMMISSION_TAB, label: 'Commissions' }] : []),
        { key: PARTNER_MAIL_NOTIFICATION_TAB, label: 'Mail Notification', disabled: !id },
    ];

    // Say so rather than show an empty form with Update, as for clients, leads and employees.
    if (partnerNotFound) {
        return <ErrorPage status={404} title="Partner Not Found" message="The partner you are looking for does not exist or you do not have permission to view it." />;
    }

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
                    {!['documents', 'clientList', 'subscription', 'agreement', 'tenantConfig', PARTNER_CONFIGURATION_TAB, PARTNER_COMMISSION_TAB, PARTNER_MAIL_NOTIFICATION_TAB].includes(activeTab) && (
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

                    {/* Mail Notification tab: submits its form (PartnerMailNotificationTab) */}
                    {activeTab === PARTNER_MAIL_NOTIFICATION_TAB && id && (
                        <button
                            type="submit"
                            form={PARTNER_MAIL_NOTIFICATION_FORM_ID}
                            className="btn btn-primary w-lg waves-effect"
                            disabled={!mailNotificationForm.dirty || mailNotificationForm.saving}
                        >
                            {mailNotificationForm.saving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <i className="ri-save-3-line align-middle me-1"></i> Save Mail Notification
                                </>
                            )}
                        </button>
                    )}

                    {/* Commissions tab: submits its form (PartnerCommissionTab) */}
                    {activeTab === PARTNER_COMMISSION_TAB && canEditCommission && (
                        <button
                            type="submit"
                            form={PARTNER_COMMISSION_FORM_ID}
                            className="btn btn-primary w-lg waves-effect"
                            disabled={!commissionForm.dirty || commissionForm.saving}
                        >
                            {commissionForm.saving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <i className="ri-save-3-line align-middle me-1"></i> Save Commission
                                </>
                            )}
                        </button>
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
                                {/* One line; the tabs that do not fit go into More. */}
                                <OverflowTabs
                                    tabs={partnerTabs}
                                    activeKey={activeTab}
                                    onSelect={setActiveTab}
                                    ariaLabel="Partner sections"
                                />
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
                                ) : activeTab === PARTNER_MAIL_NOTIFICATION_TAB && id ? (
                                    <PartnerMailNotificationTab
                                        key={id}
                                        partnerId={id}
                                        partnerEmail={formData.email}
                                        onStateChange={setMailNotificationForm}
                                    />
                                ) : activeTab === PARTNER_COMMISSION_TAB && canViewCommission ? (
                                    <PartnerCommissionTab
                                        partnerId={id}
                                        tiers={formData.commission_tiers}
                                        fundedDealCount={formData.funded_deal_count}
                                        canEdit={canEditCommission}
                                        onSaved={handleCommissionSaved}
                                        onStateChange={setCommissionForm}
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
                                        isHostViewer={Number(authUser?.is_host) == 1}
                                        loading={isPartnerLoading}
                                        onSelectedFilesChange={setSelectedDocumentsToAttach}
                                        documentsReloadKey={documentsReloadKey}
                                        documentsClearKey={documentsClearKey}
                                        partnerPlans={partnerPlans}
                                        onRefresh={handleRefresh}
                                        setIsSaving={setIsSaving}
                                        wasFreeTrial={wasFreeTrial}
                                        onAgreementRequiredChange={handleAgreementRequiredChange}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Activity Sidebar */}
                    {id && (
                        <div className="col-xxl-4">
                            <ActivitySidebar entityId={id} entityType="Partner" loading={isPartnerLoading} enabled={partnerLoaded} partnerEmail={formData.email} taskOwner={formData.agent ? { id: formData.agent, name: formData.assigned_user_name } : null} />
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
