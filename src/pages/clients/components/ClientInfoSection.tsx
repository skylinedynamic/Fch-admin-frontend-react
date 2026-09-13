import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';

import { toast } from 'react-toastify';
import { formatPhoneNumber, normalizeDate, formatZipCode, formatBusinessEIN, formatDUNS } from '../../../utils/formatters';
import { formatSSN } from '../../../utils/borrowerFormatters';
import {
    useClient,
    useUpdateClient,
    useBorrowerPlans,
    DEFAULT_CLIENT_STATE,
    DATE_PICKER_OPTIONS,
    mapClientUpdatePayload,
    calculateEnrollmentDetails
} from '../../../modules/client';
import type { Client, BorrowerPlan } from '../../../modules/client/types';
import { useSummernote } from '../../../hooks/useSummernote';
import { industryTypes, entityTypes } from '../../../config/borrower';
import { scrollToFirstError } from '../../../utils/formUtils';
import { locationData } from '../../../modules/location';
import { getCountryPhoneInfo } from '../../../config/locations';
import { allUsers, getPartnerBorrowerFee } from '../../../modules/partner/services';
import { BORROWER_STATUS } from '../../../config/statusOptions';
import { useAuthStore } from '../../../store/auth/authStore';
import { ENROLLMENT_TYPE_INSTALLMENT, ENROLLMENT_TYPE_ONE_TIME } from '../../../config/subscriptionConfig';
import { PARTNER_TYPES, CLIENT_TYPE_LABELS } from '../../../config/partnerTypeOptions';
import { ENTITY_TYPE_PARTNER } from '../../../config/appConfig';
import avatarDefault from '../../../../assets/images/users/avatar-1.jpg';
import { Link } from 'react-router-dom';
import InstallmentDetailsModal from '../../../components/Common/Payment/InstallmentDetailsModal';


interface ClientInfoSectionProps {
    clientId?: string | null;
    initialData?: Client; // Logic for Create Mode
    // Common props for UI
    errors?: Record<string, string>;
    setErrors?: (errors: Record<string, string>) => void;
    countries: { label: string; value: string }[];
    states: { label: string; value: string }[];
    cities: { label: string; value: string }[];
    handleLocationChange?: (name: string, value: any) => void; // Parent handles cascading location options for now
    isHost?: boolean;
    nonHostPlan?: any;
    onSaveSuccess?: () => void;
    isLoading?: boolean;
}

const toLocalDateString = (date: Date | undefined | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export interface ClientInfoSectionRef {
    save: () => Promise<void>;
}

const ClientInfoSection = forwardRef<ClientInfoSectionRef, ClientInfoSectionProps>(({
    clientId,
    initialData,
    errors = {},
    setErrors,
    countries,
    states,
    cities,
    handleLocationChange,
    isHost = false,
    nonHostPlan = null,
    onSaveSuccess,
    isLoading: parentLoading = false
}, ref) => {
    // 1. Data Fetching (only if clientId exists)
    const { data: fetchedData, isLoading: isFetching } = useClient(clientId as string, !!clientId);
    const rawIsFreeTrail = fetchedData?.data?.is_free_trail ?? fetchedData?.is_free_trail ?? false;
    const wasFreeTrial = rawIsFreeTrail == 1 || rawIsFreeTrail === true || rawIsFreeTrail === 'true' || rawIsFreeTrail === '1';
    const updateMutation = useUpdateClient();

    const currentUser = useAuthStore((state) => state.user);
    const userSubscription = useAuthStore((state) => state.userSubscription);
    const isPartnerOnFreeTrial = currentUser?.entity_type === ENTITY_TYPE_PARTNER && !!userSubscription?.is_free_trail;

    // Borrower's owning partner ID (present only in edit mode)
    const borrowerPartnerId = fetchedData?.data?.partner_id ?? fetchedData?.partner_id ?? null;

    // The free-edition section is visible only when:
    //  • creating a new borrower (no clientId), OR
    //  • the borrower IS on free trial AND the logged-in partner owns them
    const canManageFreeTrial = !clientId
        || (wasFreeTrial && borrowerPartnerId !== null && String(currentUser?.partner_id) === String(borrowerPartnerId));

    // 2. Local State - Moved up to avoid TDZ (Temporal Dead Zone) in enrollmentOptions
    const [formData, setFormData] = useState<Client>(initialData || DEFAULT_CLIENT_STATE);
    const [isSynced, setIsSynced] = useState(false); // Track if data has been synced from API
    const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
    const [showInstallmentModal, setShowInstallmentModal] = useState(false);

    // Fetch Plans
    const { data: borrowerPlans = [] } = useBorrowerPlans();
    const [fixedEnrollmentAmount, setFixedEnrollmentAmount] = useState<number>(0);

    const isUserHost = Boolean(currentUser?.is_host || isHost);

    useEffect(() => {
        // If auth user is host (is_host == 1), no need to call
        if (isUserHost) {
            setFixedEnrollmentAmount(0);
            return;
        }

        // If updating an existing client who is NOT in a free trial, do NOT fetch borrower fee
        if (clientId && !isFetching && !wasFreeTrial) {
            return;
        }

        // If in update mode and still fetching client data, wait for it before deciding
        if (clientId && isFetching) {
            return;
        }

        const fetchPartnerBorrowerFee = async () => {
            try {
                const response = await getPartnerBorrowerFee();
                if (response?.status && response?.data?.borrower_fee_amount !== undefined) {
                    setFixedEnrollmentAmount(Number(response.data.borrower_fee_amount));
                }
            } catch (error) {
                console.error('Failed to fetch partner borrower fee:', error);
            }
        };
        fetchPartnerBorrowerFee();
    }, [isUserHost, clientId, isFetching, wasFreeTrial]);

    const enrollmentOptions = React.useMemo(() => {
        const plans = borrowerPlans;
        const options = plans.map((plan: BorrowerPlan) => ({
            ...plan,
            label: `${plan.enrollment_type}`,
            value: plan.id, // Use ID as value
            price: Number(plan.total_amount)
        }));

        // Always inject a fallback display option so the (possibly disabled) dropdown
        // can show the borrower's current enrollment type even if that plan is no longer
        // present in the plans list loaded from the API.
        // NOTE: 'current_selection' is a frontend-only placeholder — it is stripped from
        //       the update payload in mapClientUpdatePayload() and never sent to the API.
        if (formData.plan_id && formData.plan_id !== 'current_selection' && !options.find((opt: any) => String(opt.value) === String(formData.plan_id))) {
            // Real plan_id but not found in the fetched list — inject it so it stays visible
            const currentPrice = Number(formData.payable_amount || formData.payment_amount || formData.amount || 0);
            options.unshift({
                label: formData.enrollment_type || 'Current Plan',
                value: formData.plan_id,
                enrollment_type: formData.enrollment_type,
                payment_amount: currentPrice,
                price: currentPrice
            });
        } else if (formData.enrollment_type && (formData.plan_id === 'current_selection' || !formData.plan_id)) {
            // Have an enrollment_type but no resolvable numeric ID — inject virtual placeholder
            // so the label is visible. Only shown when there is no type-name match in the list.
            const match = options.find((opt: any) =>
                opt.enrollment_type?.toLowerCase().trim() === formData.enrollment_type?.toLowerCase().trim()
            );

            if (!match) {
                const currentPrice = Number(formData.payable_amount || formData.payment_amount || formData.amount || 0);
                options.unshift({
                    label: formData.enrollment_type,
                    value: 'current_selection',
                    enrollment_type: formData.enrollment_type,
                    payment_amount: currentPrice,
                    price: currentPrice
                });
            }
        }

        return options;
    }, [isHost, borrowerPlans, formData.plan_id, formData.enrollment_type, formData.payable_amount, formData.payment_amount, formData.amount]);

    // 3. Sync Fetch to Local State - Use ref to prevent infinite loops
    const hasSyncedData = React.useRef(false);

    useEffect(() => {
        if (fetchedData && !hasSyncedData.current) {
            // @ts-ignore
            const apiData = fetchedData.data || fetchedData;

            // Normalize date
            if (apiData.business_start_date) {
                apiData.business_start_date = normalizeDate(apiData.business_start_date);
            }

            // Format the raw digits the API returns into XXX-XX-XXXX for display/editing
            if (apiData.ssn) {
                apiData.ssn = formatSSN(apiData.ssn);
            }

            // Ensure country uses full name for mapping to dropdown value
            if (apiData.country) {
                const entry = Object.entries(locationData).find(([key, val]) => key === apiData.country || val.name === apiData.country);
                if (entry) {
                    apiData.country = entry[1].name;
                }
            }

            // Flatten enrollment_details into apiData — mirrors PartnerProfile.jsx pattern.
            // The API now returns all enrollment/subscription fields nested under enrollment_details.
            const ed = apiData.enrollment_details;
            if (ed) {
                apiData.plan_id = ed.plan_id || '';
                apiData.enrollment_type = ed.enrollment_type || '';
                apiData.payable_amount = ed.payable_amount !== undefined && ed.payable_amount !== null ? ed.payable_amount : '';
                apiData.payment_amount = ed.payable_amount !== undefined && ed.payable_amount !== null ? ed.payable_amount : '';
                apiData.borrower_fee_amount = ed.borrower_fee_amount !== undefined && ed.borrower_fee_amount !== null ? ed.borrower_fee_amount : '';
                apiData.total_subscription_amount = ed.total_subscription_amount !== undefined && ed.total_subscription_amount !== null ? ed.total_subscription_amount : '';
                apiData.monthly_platform_fee = ed.monthly_platform_fee !== undefined && ed.monthly_platform_fee !== null ? ed.monthly_platform_fee : '';
                apiData.enrollment_amount = ed.enrollment_amount !== undefined && ed.enrollment_amount !== null ? ed.enrollment_amount : '';
                apiData.installment_applied = ed.installment_applied === true || ed.installment_applied === 'true' || ed.installment_applied === 1 || ed.installment_applied === '1';
                apiData.installment_down_payment = Number(ed.installment_down_payment || 0);
                apiData.installment_months = Number(ed.installment_months || 0);
                apiData.installment_monthly_amount = Number(ed.installment_monthly_amount || 0);
                apiData.installment_remaining_balance = Number(ed.installment_remaining_balance || 0);
                // Formatted display strings
                apiData.borrower_fee_amount_formatted = ed.borrower_fee_amount_formatted || '';
                apiData.payable_amount_formatted = ed.payable_amount_formatted || '';
                apiData.total_subscription_amount_formatted = ed.total_subscription_amount_formatted || '';
                apiData.monthly_platform_fee_formatted = ed.monthly_platform_fee_formatted || '';
                apiData.enrollment_amount_formatted = ed.enrollment_amount_formatted || '';
                apiData.installment_down_payment_formatted = ed.installment_down_payment_formatted || '';
                apiData.installment_monthly_amount_formatted = ed.installment_monthly_amount_formatted || '';
                apiData.installment_remaining_balance_formatted = ed.installment_remaining_balance_formatted || '';
            }

            // Sync enrollment_payment from payable_amount for edit mode consistency
            if (apiData.payable_amount && (!apiData.enrollment_payment || apiData.enrollment_payment === '')) {
                apiData.enrollment_payment = apiData.payable_amount;
            }

            setFormData(prev => ({ ...prev, ...apiData }));

            hasSyncedData.current = true;
            setIsSynced(true);
        } else if (!clientId && !hasSyncedData.current) {
            // If creating new client (no ID), we are synced immediately
            if (isPartnerOnFreeTrial) {
                setFormData(prev => ({ ...prev, is_free_trail: true }));
                if (handleLocationChange) {
                    handleLocationChange('is_free_trail', true);
                }
            }
            setIsSynced(true);
            hasSyncedData.current = true;
        }
    }, [fetchedData, clientId]);

    // plan_id now comes directly from the API — no retry/matching effect needed.

    // Fetch Users for Assign to dropdown
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await allUsers();
                if (response.status && response.data) {
                    setUsers(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch users:', error);
            }
        };
        fetchUsers();
    }, []);

    // Local Location Options Logic
    const [businessStates, setBusinessStates] = useState<{ label: string; value: string }[]>([]);
    const [businessCities, setBusinessCities] = useState<{ label: string; value: string }[]>([]);
    const [homeStates, setHomeStates] = useState<{ label: string; value: string }[]>([]);
    const [homeCities, setHomeCities] = useState<{ label: string; value: string }[]>([]);

    // Countries is static from locationData
    const localCountries = React.useMemo(() => Object.keys(locationData).map(key => ({
        label: locationData[key].name,
        value: locationData[key].name
    })), []);

    useEffect(() => {
        // Business Address Cascading Logic
        const countryName = formData.business_country;
        const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === countryName);
        const countryCode = countryEntry ? countryEntry[0] : (countryName === 'USA' ? 'USA' : null);

        if (countryCode && locationData[countryCode]) {
            const stateOpts = Object.keys(locationData[countryCode].states).map((key) => ({
                label: locationData[countryCode].states[key].name,
                value: locationData[countryCode].states[key].name
            }));
            setBusinessStates(stateOpts);
        } else {
            setBusinessStates([]);
        }

        if (countryCode && formData.business_state && locationData[countryCode]) {
            const stateEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === formData.business_state);
            const stateCode = stateEntry ? stateEntry[0] : null;

            if (stateCode) {
                const cityList = locationData[countryCode].states[stateCode].cities;
                setBusinessCities(cityList.map((city: string) => ({ label: city, value: city })));
            } else {
                setBusinessCities([]);
            }
        } else {
            setBusinessCities([]);
        }
    }, [formData.business_country, formData.business_state]);

    useEffect(() => {
        // Home Address Cascading Logic
        const countryName = formData.country;
        const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === countryName);
        const countryCode = countryEntry ? countryEntry[0] : (countryName === 'USA' ? 'USA' : null);

        if (countryCode && locationData[countryCode]) {
            const stateOpts = Object.keys(locationData[countryCode].states).map((key) => ({
                label: locationData[countryCode].states[key].name,
                value: locationData[countryCode].states[key].name
            }));
            setHomeStates(stateOpts);
        } else {
            setHomeStates([]);
        }

        if (countryCode && formData.state && locationData[countryCode]) {
            const stateEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === formData.state);
            const stateCode = stateEntry ? stateEntry[0] : null;

            if (stateCode) {
                const cityList = locationData[countryCode].states[stateCode].cities;
                setHomeCities(cityList.map((city: string) => ({ label: city, value: city })));
            } else {
                setHomeCities([]);
            }
        } else {
            setHomeCities([]);
        }
    }, [formData.country, formData.state]);

    // After localCities load: if the stored city is not in the list and is not already 'Others',
    // treat it as a custom "other" city → move it to other_city and set city = 'Others'
    useEffect(() => {
        if (!isSynced) return;
        if (!formData.business_city || formData.business_city === 'Others') return;
        if (businessCities.length === 0) return;

        const cityExistsInList = businessCities.some(
            (c) => c.value === formData.business_city || c.label === formData.business_city
        );

        if (!cityExistsInList) {
            setFormData(prev => ({
                ...prev,
                business_other_city: prev.business_city,
                business_city: 'Others',
            }));
        }
    }, [businessCities, isSynced]);

    useEffect(() => {
        if (!isSynced) return;
        if (!formData.city || formData.city === 'Others') return;
        if (homeCities.length === 0) return;

        const cityExistsInList = homeCities.some(
            (c) => c.value === formData.city || c.label === formData.city
        );

        if (!cityExistsInList) {
            setFormData(prev => ({
                ...prev,
                other_city: prev.city,
                city: 'Others',
            }));
        }
    }, [homeCities, isSynced]);

    // 4. Handle Inputs
    const handleInputChange = (e: any) => {
        const name = e.target ? e.target.name : e.name;
        let value = e.target ? e.target.value : e.value;

        if (name === 'postal_code' || name === 'business_postal_code') {
            value = formatZipCode(value);
        } else if (name === 'business_ein') {
            value = formatBusinessEIN(value);
        } else if (name === 'duns_number') {
            value = formatDUNS(value);
        }

        if (name === 'enrollment_payment') {
            setFormData(prev => ({
                ...prev,
                enrollment_payment: value,
                payment_amount: value,
                amount: value
            }));
        } else {
            setFormData(prev => {
                const newData = { ...prev, [name]: value };

                // Cascade clears for local state
                if (name === 'country') {
                    newData.state = '';
                    newData.city = '';
                } else if (name === 'state') {
                    newData.city = '';
                } else if (name === 'city' && value !== 'Others') {
                    newData.other_city = '';
                } else if (name === 'business_country') {
                    newData.business_state = '';
                    newData.business_city = '';
                } else if (name === 'business_state') {
                    newData.business_city = '';
                } else if (name === 'business_city' && value !== 'Others') {
                    newData.business_other_city = '';
                }

                return newData;
            });
        }

        // Notify parent of ALL changes (important for Create Mode and Location Logic)
        if (handleLocationChange) {
            handleLocationChange(name, value);
        }

        // Clear local error if any (if setErrors passed)
        if (setErrors && errors[name]) {
            const newErrors = { ...errors };
            delete newErrors[name];
            setErrors(newErrors);
        }
    };

    // Summernote
    // Enable editor only when data is synced to prevent empty initialization race condition
    const isEditorEnabled = !isFetching && isSynced;
    const { editorRef } = useSummernote('notes', formData.notes, handleInputChange, {}, isEditorEnabled);

    // Date Robust Parsing
    const parseDate = (dateStr: any) => {
        if (!dateStr) return undefined;
        if (dateStr instanceof Date) return dateStr;

        // Handle MM-DD-YYYY or YYYY-MM-DD
        const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                // YYYY-MM-DD
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else if (parts[2].length === 4) {
                // MM-DD-YYYY
                return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
            }
        }

        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? undefined : d;
    };

    // 5. Expose Save via Ref
    useImperativeHandle(ref, () => ({
        save: async () => {
            console.log('[ClientInfoSection] Starting save...', { clientId, formData });
            const payload = mapClientUpdatePayload(formData, isHost, wasFreeTrial);
            console.log('[ClientInfoSection] Mapped payload:', payload);

            return new Promise((resolve, reject) => {
                // @ts-ignore
                updateMutation.mutate({ id: clientId, data: payload }, {
                    onSuccess: (data) => {
                        console.log('[ClientInfoSection] Save SUCCESS!', data);
                        toast.success("Client personal details updated successfully");
                        if (onSaveSuccess) onSaveSuccess();
                        resolve();
                    },
                    onError: (error: any) => {
                        console.error("[ClientInfoSection] Save ERROR:", error);

                        const responseData = error?.response?.data;
                        const isValidationError = error?.response?.status === 422;

                        // 422 = server-side validation. Always shown as field-level
                        // danger + under-field messages — never a toast, even if the
                        // errors payload is missing/oddly shaped for some field.
                        if (isValidationError && setErrors) {
                            const backendErrors = responseData?.errors || {};
                            const mappedErrors: Record<string, string> = {};

                            // Remap enrollment.* dotted keys → flat UI field names
                            const enrollmentKeyMap: Record<string, string> = {
                                'enrollment': 'enrollment',
                                'enrollment.plan_id': 'plan_id',
                                'enrollment.enrollment_type': 'enrollment_type',
                                'enrollment.amount': 'enrollment_amount',
                                'enrollment.down_payment': 'installment_down_payment',
                                'enrollment.months': 'installment_months',
                                'enrollment.monthly_amount': 'installment_monthly_amount',
                                'enrollment.remaining_balance': 'installment_remaining_balance',
                            };

                            Object.keys(backendErrors).forEach(key => {
                                const mappedKey = enrollmentKeyMap[key] ?? key;
                                mappedErrors[mappedKey] = Array.isArray(backendErrors[key])
                                    ? backendErrors[key][0]
                                    : backendErrors[key];
                            });
                            setErrors(mappedErrors);
                            scrollToFirstError(mappedErrors);
                            // Inline field errors are already visible — no toast needed
                        } else if (!isValidationError) {
                            // Real server/network error: no inline errors possible, so a toast is the only feedback
                            const toastMessage = responseData?.message || "Failed to update client details";
                            toast.error(toastMessage);
                        }

                        reject(error);
                    }
                });
            });
        }
    }));



    if ((isFetching && clientId) || (clientId && !isSynced)) {
        return (
            <div className="row g-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(i => (
                    <div className="col-lg-6" key={i}>
                        <div className="mb-2">
                            <div className="skeleton-line" style={{ width: '30%', height: 14, borderRadius: 4 }}></div>
                        </div>
                        <div className="skeleton-line w-100" style={{ height: 42, borderRadius: 6 }}></div>
                    </div>
                ))}
            </div>
        );
    }
    const selectedOption = enrollmentOptions.find((opt: any) =>
        String(opt.value) === String(formData.plan_id)
    ) || enrollmentOptions.find((opt: any) =>
        opt.enrollment_type === formData.enrollment_type
    );

    const isInstallmentPlan = (selectedOption?.enrollment_type || formData.enrollment_type || '').toString().toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase();

    const partnerName = formData.partner_name || 'N/A';
    const partnerCompanyName = formData.partner_company || 'N/A';
    const partnerPhone = formData.partner_phone || 'N/A';
    const partnerEmailAddress = formData.partner_email || 'N/A';
    const partnerLogo = formData.partner_logo || null;

    // Reuse rendering logic
    return (
        <form onSubmit={(e) => e.preventDefault()}>
            <div className="row">
                {/* Partner Details Section */}
                {isHost && !!clientId && (
                    <div className="col-12">
                        <div className="card partner-details-section p-0">
                            <div className="card-header partner-section-header bg-transparent border-bottom border-bottom-dashed d-flex align-items-center justify-content-between py-3 px-4">
                                <div className="partner-section-title-wrap d-flex align-items-center gap-3">
                                    {partnerLogo ? (
                                        <img
                                            src={partnerLogo}
                                            alt="Partner Logo"
                                            className="partner-logo-img"
                                        />
                                    ) : (
                                        <div className="partner-logo-fallback">
                                            <i className="ri-user-line"></i>
                                        </div>
                                    )}
                                    <div>
                                        <h5 className="partner-section-title mb-1">Partner Details</h5>
                                        <p className="partner-section-subtitle mb-0">Assigned partner information and referral status</p>
                                    </div>
                                </div>
                                {formData.partner_id ? (
                                    <Link to={`/partners/${formData.partner_id}`} className="btn btn-sm btn-soft-primary d-flex align-items-center gap-1 partner-profile-btn">
                                        <i className="ri-external-link-line"></i> View Profile
                                    </Link>
                                ) : (
                                    <span className="partner-status-badge">No Assigned Partner</span>
                                )}
                            </div>
                            <div className="card-body partner-details-body p-4">
                                <div className="partner-info-grid">
                                    <div className="partner-info-card">
                                        <span className="partner-info-label">Partner Name</span>
                                        <span className="partner-info-val">{partnerName}</span>
                                    </div>
                                    <div className="partner-info-card">
                                        <span className="partner-info-label">Company</span>
                                        <span className="partner-info-val">{partnerCompanyName}</span>
                                    </div>
                                    <div className="partner-info-card">
                                        <span className="partner-info-label">Phone</span>
                                        <span className="partner-info-val">{partnerPhone}</span>
                                    </div>
                                    <div className="partner-info-card">
                                        <span className="partner-info-label">Email</span>
                                        <span className="partner-info-val">{partnerEmailAddress}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="col-12 mt-2 mb-2">
                    <h5 className="text-primary fs-16 mb-1">Personal Information</h5>
                    <hr className="mt-1" />
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="first_name" className="form-label">First Name <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                            id="first_name"
                            name="first_name"
                            placeholder="Enter first name"
                            value={formData.first_name || ''}
                            onChange={handleInputChange}
                        />
                        {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="last_name" className="form-label">Last Name <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                            id="last_name"
                            name="last_name"
                            placeholder="Enter last name"
                            value={formData.last_name || ''}
                            onChange={handleInputChange}
                        />
                        {errors.last_name && <div className="invalid-feedback">{errors.last_name}</div>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="phone_number" className="form-label">Phone Number <span className="text-danger">*</span></label>
                        <div className="input-group">
                            {(() => {
                                const info = getCountryPhoneInfo(formData.country);
                                if (!info) return null;
                                return (
                                    <span className="input-group-text bg-light border">
                                        <span className="me-1">{info.label}</span>
                                        <span className="text-muted">{info.prefix}</span>
                                    </span>
                                );
                            })()}
                            <input
                                type="text"
                                className={`form-control ${errors.phone_number ? 'is-invalid' : ''}`}
                                id="phone_number"
                                name="phone_number"
                                placeholder="Enter phone number"
                                value={formData.phone_number || ''}
                                onChange={(e) => {
                                    const formatted = formatPhoneNumber(e.target.value);
                                    handleInputChange({ target: { name: 'phone_number', value: formatted } });
                                }}
                            />
                            {errors.phone_number && <div className="invalid-feedback">{errors.phone_number}</div>}
                        </div>
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="email" className="form-label">Email Address <span className="text-danger">*</span></label>
                        <input
                            type="email"
                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                            id="email"
                            name="email"
                            placeholder="Enter email address"
                            value={formData.email || ''}
                            onChange={handleInputChange}
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="home_address" className="form-label">Home Address
                        </label>
                        <input
                            type="text"
                            className={`form-control ${errors.home_address ? 'is-invalid' : ''}`}
                            id="home_address"
                            name="home_address"
                            placeholder="Enter address"
                            value={formData.home_address || ''}
                            onChange={handleInputChange}
                        />
                        {errors.home_address && <div className="invalid-feedback">{errors.home_address}</div>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Country <span className="text-danger">*</span></label>
                        <Dropdown
                            inputId="country"
                            value={formData.country}
                            options={localCountries}
                            onChange={(e) => handleInputChange({ target: { name: 'country', value: e.value } })}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select Country"
                            className={`w-100 ${errors.country ? 'p-invalid' : ''}`}
                            appendTo="self"
                        />
                        {errors.country && <small className="p-error">{errors.country}</small>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">State</label>
                        <Dropdown
                            inputId="state"
                            value={formData.state}
                            options={homeStates}
                            onChange={(e) => handleInputChange({ target: { name: 'state', value: e.value } })}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select State"
                            filter
                            className={`w-100 ${errors.state ? 'p-invalid' : ''}`}
                            disabled={!formData.country}
                            appendTo="self"
                        />
                        {errors.state && <small className="p-error">{errors.state}</small>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">City</label>
                        <Dropdown
                            inputId="city"
                            value={formData.city}
                            options={[...homeCities, { label: 'Others', value: 'Others' }]}
                            onChange={(e) => handleInputChange({ target: { name: 'city', value: e.value } })}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select City"
                            filter
                            className={`w-100 ${errors.city ? 'p-invalid' : ''}`}
                            disabled={!formData.state}
                            appendTo="self"
                        />
                        {errors.city && <small className="p-error">{errors.city}</small>}
                    </div>
                </div>

                {formData.city === 'Others' && (
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label htmlFor="other_city" className="form-label">Other City <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className={`form-control ${errors.other_city ? 'is-invalid' : ''}`}
                                id="other_city"
                                name="other_city"
                                placeholder="Enter city name"
                                value={formData.other_city || ''}
                                onChange={handleInputChange}
                            />
                            {errors.other_city && <div className="invalid-feedback">{errors.other_city}</div>}
                        </div>
                    </div>
                )}

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="postal_code" className="form-label">Zip Code</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={5}
                            className={`form-control ${errors.postal_code ? 'is-invalid' : ''}`}
                            id="postal_code"
                            name="postal_code"
                            placeholder="Enter zip code"
                            value={formData.postal_code || ''}
                            onChange={handleInputChange}
                        />
                        {errors.postal_code && <div className="invalid-feedback">{errors.postal_code}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="date_of_birth" className="form-label">Date of Birth</label>
                        <div className="custom-datepicker">
                            <Calendar
                                id="date_of_birth"
                                value={parseDate(formData.date_of_birth)}
                                onChange={(e) => {
                                    const date = e.value as Date;
                                    const dateString = date
                                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                        : "";
                                    handleInputChange({ target: { name: 'date_of_birth', value: dateString } });
                                }}
                                dateFormat="dd M, yy"
                                maxDate={new Date()}
                                placeholder="Select date"
                                showIcon
                                className="w-100"
                                appendTo="self"
                                readOnlyInput
                            />
                        </div>
                        {errors.date_of_birth && <div className="text-danger mt-1 small">{errors.date_of_birth}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="ssn" className="form-label">Social Security Number</label>
                        <input
                            type="text"
                            className={`form-control ${errors.ssn ? 'is-invalid' : ''}`}
                            id="ssn"
                            name="ssn"
                            placeholder="XXX-XX-XXXX"
                            value={formData.ssn || ''}
                            onChange={(e) => {
                                const formatted = formatSSN(e.target.value);
                                handleInputChange({ target: { name: 'ssn', value: formatted } });
                            }}
                        />
                        {errors.ssn && <div className="invalid-feedback">{errors.ssn}</div>}
                    </div>
                </div>



                <div className="col-12 mt-4 mb-2">
                    <h5 className="text-primary fs-16 mb-1">Business Information</h5>
                    <hr className="mt-1" />
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_website" className="form-label">Website</label>
                        <input
                            type="text"
                            className={`form-control ${errors.business_website ? 'is-invalid' : ''}`}
                            id="business_website"
                            name="business_website"
                            placeholder="www.example.com"
                            value={formData.business_website || ''}
                            onChange={handleInputChange}
                        />
                        {errors.business_website && <div className="invalid-feedback">{errors.business_website}</div>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_name" className="form-label">Legal Business Name</label>
                        <input
                            type="text"
                            className={`form-control ${errors.business_name ? 'is-invalid' : ''}`}
                            id="business_name"
                            name="business_name"
                            placeholder="Enter legal business name"
                            value={formData.business_name || ''}
                            onChange={handleInputChange}
                        />
                        {errors.business_name && <div className="invalid-feedback">{errors.business_name}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_ein" className="form-label">Business EIN</label>
                        <input
                            type="text"
                            className={`form-control ${errors.business_ein ? 'is-invalid' : ''}`}
                            id="business_ein"
                            name="business_ein"
                            placeholder="XX-XXXXXXX"
                            maxLength={10}
                            value={formData.business_ein || ''}
                            onChange={handleInputChange}
                        />
                        {errors.business_ein && <div className="invalid-feedback">{errors.business_ein}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="state_file_number" className="form-label">State File Number</label>
                        <input
                            type="text"
                            className={`form-control ${errors.state_file_number ? 'is-invalid' : ''}`}
                            id="state_file_number"
                            name="state_file_number"
                            placeholder="Enter state file number"
                            value={formData.state_file_number || ''}
                            onChange={handleInputChange}
                        />
                        {errors.state_file_number && <div className="invalid-feedback">{errors.state_file_number}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="duns_number" className="form-label">D-U-N-S Number</label>
                        <input
                            type="text"
                            className={`form-control ${errors.duns_number ? 'is-invalid' : ''}`}
                            id="duns_number"
                            name="duns_number"
                            placeholder="Enter 9-digit D-U-N-S"
                            maxLength={9}
                            value={formData.duns_number || ''}
                            onChange={handleInputChange}
                        />
                        {errors.duns_number && <div className="invalid-feedback">{errors.duns_number}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_address" className="form-label">Business Address</label>
                        <input
                            type="text"
                            className={`form-control ${errors.business_address ? 'is-invalid' : ''}`}
                            id="business_address"
                            name="business_address"
                            placeholder="Enter business address"
                            value={formData.business_address || ''}
                            onChange={handleInputChange}
                        />
                        {errors.business_address && <div className="invalid-feedback">{errors.business_address}</div>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Country <span className="text-danger">*</span></label>
                        <Dropdown
                            inputId="business_country"
                            value={formData.business_country}
                            options={localCountries}
                            onChange={(e) => handleInputChange({ target: { name: 'business_country', value: e.value } })}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select Country"
                            className={`w-100 ${errors.business_country ? 'p-invalid' : ''}`}
                            appendTo="self"
                        />
                        {errors.business_country && <small className="p-error">{errors.business_country}</small>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">State</label>
                        <Dropdown
                            inputId="business_state"
                            value={formData.business_state}
                            options={businessStates}
                            onChange={(e) => handleInputChange({ target: { name: 'business_state', value: e.value } })}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select State"
                            filter
                            className={`w-100 ${errors.business_state ? 'p-invalid' : ''}`}
                            disabled={!formData.business_country}
                            appendTo="self"
                        />
                        {errors.business_state && <small className="p-error">{errors.business_state}</small>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">City</label>
                        <Dropdown
                            inputId="business_city"
                            value={formData.business_city}
                            options={[...businessCities, { label: 'Others', value: 'Others' }]}
                            onChange={(e) => handleInputChange({ target: { name: 'business_city', value: e.value } })}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select City"
                            filter
                            className={`w-100 ${errors.business_city ? 'p-invalid' : ''}`}
                            disabled={!formData.business_state}
                            appendTo="self"
                        />
                        {errors.business_city && <small className="p-error">{errors.business_city}</small>}
                    </div>
                </div>

                {formData.business_city === 'Others' && (
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label htmlFor="business_other_city" className="form-label">Other City <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className={`form-control ${errors.business_other_city ? 'is-invalid' : ''}`}
                                id="business_other_city"
                                name="business_other_city"
                                placeholder="Enter city name"
                                value={formData.business_other_city || ''}
                                onChange={handleInputChange}
                            />
                            {errors.business_other_city && <div className="invalid-feedback">{errors.business_other_city}</div>}
                        </div>
                    </div>
                )}

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_postal_code" className="form-label">Zip Code</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={5}
                            className={`form-control ${errors.business_postal_code ? 'is-invalid' : ''}`}
                            id="business_postal_code"
                            name="business_postal_code"
                            placeholder="Enter zip code"
                            value={formData.business_postal_code || ''}
                            onChange={handleInputChange}
                        />
                        {errors.business_postal_code && <div className="invalid-feedback">{errors.business_postal_code}</div>}
                    </div>
                </div>


                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="fico_score" className="form-label">Personal Credit Scores</label>
                        <input
                            type="number"
                            className={`form-control ${errors.fico_score ? 'is-invalid' : ''}`}
                            id="fico_score"
                            name="fico_score"
                            placeholder="0"
                            value={formData.fico_score || ''}
                            onChange={handleInputChange}
                        />
                        {errors.fico_score && <div className="invalid-feedback">{errors.fico_score}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="paydex_score" className="form-label">Business Credit Scores</label>
                        <input
                            type="number"
                            className={`form-control ${errors.paydex_score ? 'is-invalid' : ''}`}
                            id="paydex_score"
                            name="paydex_score"
                            placeholder="0"
                            value={formData.paydex_score || ''}
                            onChange={handleInputChange}
                        />
                        {errors.paydex_score && <div className="invalid-feedback">{errors.paydex_score}</div>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_phone" className="form-label">Business Phone </label>
                        <div className="input-group">
                            {(() => {
                                const info = getCountryPhoneInfo(formData.business_country);
                                if (!info) return null;
                                return (
                                    <span className="input-group-text bg-light border">
                                        <span className="me-1">{info.label}</span>
                                        <span className="text-muted">{info.prefix}</span>
                                    </span>
                                );
                            })()}
                            <input
                                type="text"
                                className={`form-control ${errors.business_phone ? 'is-invalid' : ''}`}
                                id="business_phone"
                                name="business_phone"
                                placeholder="(555) 555-5555"
                                value={formData.business_phone || ''}
                                onChange={(e) => {
                                    const formatted = formatPhoneNumber(e.target.value);
                                    handleInputChange({ target: { name: 'business_phone', value: formatted } });
                                }}
                            />
                            {errors.business_phone && <div className="invalid-feedback">{errors.business_phone}</div>}
                        </div>
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_entity_type" className="form-label">Entity Type</label>
                        <Dropdown
                            inputId="business_entity_type"
                            value={formData.business_entity_type}
                            options={entityTypes}
                            onChange={(e) => handleInputChange({ target: { name: 'business_entity_type', value: e.value } })}
                            optionLabel="label"
                            placeholder="Select entity type"
                            filter
                            className={`w-100 ${errors.business_entity_type ? 'p-invalid' : ''}`}
                            appendTo="self"
                        />
                        {errors.business_entity_type && <small className="p-error">{errors.business_entity_type}</small>}
                    </div>
                </div>
                {formData.business_entity_type === (entityTypes.find(e => e.label === 'Other')?.value || 'Other') && (
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label htmlFor="business_entity_type_note" className="form-label">Entity Type Details <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className={`form-control ${errors.business_entity_type_note ? 'is-invalid' : ''}`}
                                id="business_entity_type_note"
                                name="business_entity_type_note"
                                placeholder="Enter entity type details"
                                value={formData.business_entity_type_note || ''}
                                onChange={handleInputChange}
                            />
                            {errors.business_entity_type_note && <div className="invalid-feedback">{errors.business_entity_type_note}</div>}
                        </div>
                    </div>
                )}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_industry_type" className="form-label">Industry Type</label>
                        <Dropdown
                            inputId="business_industry_type"
                            value={formData.business_industry_type}
                            options={industryTypes}
                            onChange={(e) => handleInputChange({ target: { name: 'business_industry_type', value: e.value } })}
                            optionLabel="label"
                            placeholder="Select industry type"
                            filter
                            className={`w-100 ${errors.business_industry_type ? 'p-invalid' : ''}`}
                            appendTo="self"
                        />
                        {errors.business_industry_type && <small className="p-error">{errors.business_industry_type}</small>}
                    </div>
                </div>
                {formData.business_industry_type === (industryTypes.find(i => i.label === 'Other')?.value || 'Other') && (
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label htmlFor="business_industry_type_note" className="form-label">Industry Type Details <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className={`form-control ${errors.business_industry_type_note ? 'is-invalid' : ''}`}
                                id="business_industry_type_note"
                                name="business_industry_type_note"
                                placeholder="Enter industry type details"
                                value={formData.business_industry_type_note || ''}
                                onChange={handleInputChange}
                            />
                            {errors.business_industry_type_note && <div className="invalid-feedback">{errors.business_industry_type_note}</div>}
                        </div>
                    </div>
                )}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_start_date" className="form-label">Business Start Date</label>
                        <div className="custom-datepicker">
                            <Calendar
                                id="business_start_date"
                                value={parseDate(formData.business_start_date)}
                                onChange={(e) => {
                                    const date = e.value as Date;
                                    const dateString = date
                                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                        : "";
                                    handleInputChange({ target: { name: 'business_start_date', value: dateString } });
                                }}
                                dateFormat="dd M, yy"
                                maxDate={new Date()}
                                placeholder="Select date"
                                showIcon
                                className="w-100"
                                appendTo="self"
                                readOnlyInput
                            />
                        </div>
                        {errors.business_start_date && <div className="text-danger mt-1 small">{errors.business_start_date}</div>}
                    </div>
                </div>

                <div className="col-12 mt-4 mb-2">
                    <h5 className="text-primary fs-16 mb-1">Additional Information</h5>
                    <hr className="mt-1" />
                </div>

                {clientId && (
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label htmlFor="status" className="form-label">Status</label>
                            <Dropdown
                                inputId="status"
                                value={formData.status}
                                options={BORROWER_STATUS}
                                onChange={(e) => handleInputChange({ target: { name: 'status', value: e.value } })}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Select Status"
                                className={`w-100 ${errors.status ? 'p-invalid' : ''}`}
                                appendTo="self"
                            />
                            {errors.status && <small className="p-error">{errors.status}</small>}
                        </div>
                    </div>
                )}

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="assign_id" className="form-label">Assign to</label>
                        <Dropdown
                            inputId="assign_id"
                            value={formData.assign_id}
                            options={users.map(user => ({ label: user.name, value: user.id }))}
                            onChange={(e) => handleInputChange({ target: { name: 'assign_id', value: e.value } })}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select User"
                            filter
                            className={`w-100 ${errors.assign_id ? 'p-invalid' : ''}`}
                            appendTo="self"
                        />
                        {errors.assign_id && <small className="p-error">{errors.assign_id}</small>}
                    </div>
                </div>

                {/* Free Trial Section — only visible to the borrower's own partner */}
                {canManageFreeTrial && (
                    <div className="col-12 mt-4">
                        <div className="card border-0 bg-light-subtle shadow-sm mb-4">
                            <div className="card-body p-4 rounded" style={{ backgroundColor: 'var(--vz-light)' }}>
                                <div className="d-flex align-items-center mb-3">
                                    <i className="ri-gift-line text-warning fs-3 me-2"></i>
                                    <h5 className="mb-0 text-primary fw-semibold">Allow Limited Free Plan (Funding Readiness Assessment)</h5>
                                </div>

                                <p className="text-muted fs-13 mb-4">
                                    Enable the Limited Free Plan for this client. Please note that features including Capital Access, Invoicing, Payments, the Resource Hub, and Credit Builder will be disabled in this version.
                                </p>
                                <div className="row align-items-center g-3">
                                    <div className="col-md-6">
                                        <div className="form-check form-switch form-switch-md">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="is_free_trail"
                                                name="is_free_trail"
                                                checked={formData.is_free_trail == 1 || formData.is_free_trail === true || formData.is_free_trail === 'true' || formData.is_free_trail === '1'}
                                                style={isPartnerOnFreeTrial ? { opacity: 1, pointerEvents: 'none' } : undefined}
                                                onChange={(e) => {
                                                    if (isPartnerOnFreeTrial) return;
                                                    const checked = e.target.checked;

                                                    setFormData(prev => ({
                                                        ...prev,
                                                        is_free_trail: checked,
                                                    }));

                                                    if (handleLocationChange) {
                                                        handleLocationChange('is_free_trail', checked);
                                                    }

                                                    if (setErrors) {
                                                        const newErrors = { ...errors };
                                                        delete newErrors.is_free_trail;
                                                        setErrors(newErrors);
                                                    }
                                                }}
                                            />
                                            <label className="form-check-label fw-semibold text-dark fs-14 ms-2 mb-0" htmlFor="is_free_trail">
                                                Activate Limited Free Plan
                                            </label>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!(formData.is_free_trail == 1 || formData.is_free_trail === true || formData.is_free_trail === 'true' || formData.is_free_trail === '1') && (
                    <>
                        {/* Enrollment Type Dropdown — shown when creating or when converting from free trial */}
                        {!(!!clientId && !wasFreeTrial) && (
                            <div className="col-lg-6">
                                <div className="mb-3">
                                    <label htmlFor="enrollment_type" className="form-label">
                                        Enrollment Type <span className="text-danger">*</span>
                                    </label>
                                    <Dropdown
                                        inputId="plan_id"
                                        value={formData.plan_id}
                                        options={enrollmentOptions}
                                        onChange={(e) => {
                                            const selectedVal = e.value;
                                            const selectedOption = enrollmentOptions.find((opt: any) => String(opt.value) === String(selectedVal));

                                            const isInstallmentSelected = (selectedOption?.enrollment_type || '').toString().toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase();

                                            const updates: any = {
                                                plan_id: selectedVal,
                                                enrollment_type: selectedOption?.enrollment_type || formData.enrollment_type || '',
                                                enrollment_payment: selectedOption ? selectedOption.total_amount : '',
                                                payment_amount: selectedOption ? selectedOption.total_amount : '',
                                                amount: selectedOption ? selectedOption.total_amount : ''
                                            };

                                            if (isInstallmentSelected) {
                                                setShowInstallmentModal(true);

                                                const planTotal = Number(selectedOption?.total_amount || 0);
                                                const planMonths = Number(selectedOption?.total_installments_count || 12);
                                                const defaultMonthly = planMonths > 0 ? (planTotal / planMonths) : 0;

                                                updates.installment_applied = true;
                                                updates.installment_down_payment = 0;
                                                updates.installment_months = planMonths;
                                                updates.installment_monthly_amount = defaultMonthly;
                                                updates.enrollment_amount = planTotal;

                                                updates.enrollment_payment = planTotal;
                                                updates.payment_amount = planTotal;
                                                updates.amount = planTotal;
                                            } else {
                                                updates.installment_applied = false;
                                                updates.installment_down_payment = 0;
                                                updates.installment_months = 0;
                                                updates.installment_monthly_amount = 0;
                                            }

                                            setFormData(prev => ({
                                                ...prev,
                                                ...updates
                                            }));

                                            // Propagate changes to parent
                                            if (handleLocationChange) {
                                                Object.entries(updates).forEach(([name, value]) => {
                                                    handleLocationChange(name, value);
                                                });
                                            }

                                            // Clear error if present
                                            if (setErrors && errors.plan_id) {
                                                const newErrors = { ...errors };
                                                delete newErrors.plan_id;
                                                setErrors(newErrors);
                                            }
                                        }}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Select Enrollment Type"
                                        className={`w-100 ${errors.plan_id ? 'p-invalid' : ''}`}
                                        appendTo="self"
                                    />
                                    {errors.plan_id && <small className="p-error">{errors.plan_id}</small>}
                                </div>
                            </div>
                        )}

                        {/* Custom Override Inputs for isHost, White-Label or Certified Partner — hidden for installment plans */}
                        {(isHost || currentUser?.partner_type === PARTNER_TYPES.WHITE_LABEL || currentUser?.partner_type === PARTNER_TYPES.CERTIFIED) && (formData.plan_id || formData.enrollment_type) && !isInstallmentPlan && !(formData.installment_applied === true || formData.installment_applied === 'true') && (
                            <>
                                <div className="col-lg-6">
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Enrollment Payment ($) <span className="text-danger">*</span>
                                        </label>
                                        <InputText
                                            type="number"
                                            className={`form-control ${errors.enrollment_payment || errors.payment_amount || errors.amount ? 'is-invalid' : ''}`}
                                            name="enrollment_payment"
                                            placeholder="Enter amount"
                                            value={formData.enrollment_payment !== undefined && formData.enrollment_payment !== null && formData.enrollment_payment !== '' ? formData.enrollment_payment : (formData.enrollment_payment === 0 || formData.enrollment_payment === '0' ? 0 : '')}
                                            onChange={handleInputChange}
                                            disabled={!!clientId && !wasFreeTrial}
                                        />
                                        {(errors.enrollment_payment || errors.payment_amount || errors.amount) && (
                                            <div className="invalid-feedback">{errors.enrollment_payment || errors.payment_amount || errors.amount}</div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Enrollment Amount - Dynamic Display */}
                        {(formData.plan_id || formData.enrollment_type) && (
                            <div className="col-lg-12">
                                <div className="mb-3">
                                    <label className="form-label">{clientId ? 'Enrollment Details' : 'Enrollment Amount'}</label>
                                    <div className="enrollment-base-alert">
                                        <div className="card-body">
                                            {(() => {
                                                if (!selectedOption && !formData.enrollment_type) return null;

                                                const { installments, totalAmount, price } = selectedOption
                                                    ? calculateEnrollmentDetails({
                                                        ...selectedOption,
                                                        total_amount: (selectedOption as any).total_amount || formData.payable_amount || formData.payment_amount || formData.amount || 0
                                                    }, isHost)
                                                    : {
                                                        installments: (formData.enrollment_type === ENROLLMENT_TYPE_ONE_TIME || (formData.enrollment_type || '').toLowerCase().includes('one time'))
                                                            ? 1
                                                            : (Number(formData.installment_count || formData.installments) || 1),
                                                        totalAmount: formData.payable_amount || formData.payment_amount || formData.amount || 0,
                                                        price: formData.payable_amount || formData.payment_amount || formData.amount || 0
                                                    };

                                                const hasCustomEnrollment = formData.enrollment_payment !== undefined && formData.enrollment_payment !== '';

                                                const currentPaymentAmount = hasCustomEnrollment ? formData.enrollment_payment : price;

                                                // Final total calculation
                                                const displayTotal = (installments > 1)
                                                    ? Number(currentPaymentAmount) * installments
                                                    : Number(currentPaymentAmount);
                                                const partnerType = formData.partner_type || currentUser?.partner_type;
                                                const isWL = partnerType === PARTNER_TYPES.WHITE_LABEL;
                                                const isCP = partnerType === PARTNER_TYPES.CERTIFIED;
                                                const isWLOrCP = (isWL || isCP) && !isHost;

                                                const renderInstallmentContent = (forWLOrCP: boolean) => {
                                                    // Borrower is "already in paid mode" when they have a saved subscription
                                                    // (clientId exists) and are NOT on a free trial — mirrors partner logic.
                                                    const isAlreadyInPaidMode = !!clientId && !wasFreeTrial;
                                                    const labelClass = forWLOrCP ? 'text-primary' : '';
                                                    const labelStyle = forWLOrCP ? { fontWeight: 600 } : undefined;
                                                    const valueClass = forWLOrCP ? 'text-primary fw-semibold' : 'fw-semibold text-success';
                                                    const amtClass = forWLOrCP ? 'text-primary' : 'amount-success';
                                                    const infoIconClass = forWLOrCP ? 'text-primary' : 'text-success';

                                                    return (
                                                        <>
                                                            {(formData.installment_applied === true || formData.installment_applied === 'true') ? (
                                                                <>
                                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                                        <span className={`info-label ${labelClass}`} style={labelStyle}>
                                                                            <i className={`ri-hand-coin-line ${infoIconClass} me-1`}></i> Total Enrollment Amount:
                                                                        </span>
                                                                        <span className={`info-value ${valueClass}`}>
                                                                            {formData.enrollment_amount_formatted || ('$' + Number(formData.enrollment_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                                                                        </span>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                                        <span className={`info-label ${labelClass}`} style={labelStyle}>
                                                                            <i className={`ri-wallet-3-line ${infoIconClass} me-1`}></i> Down Payment (Upfront):
                                                                        </span>
                                                                        <span className="info-value text-success fw-semibold">
                                                                            {formData.installment_down_payment_formatted || ('$' + Number(formData.installment_down_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                                                                        </span>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                                        <span className={`info-label ${labelClass}`} style={labelStyle}>
                                                                            <i className={`ri-calendar-line ${infoIconClass} me-1`}></i> Installment Duration:
                                                                        </span>
                                                                        <span className="info-value fw-semibold">
                                                                            {formData.installment_months || 12} Months
                                                                        </span>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                                        <span className={`info-label ${labelClass}`} style={labelStyle}>
                                                                            <i className={`ri-money-dollar-circle-line ${infoIconClass} me-1`}></i> Monthly Installment Amount:
                                                                        </span>
                                                                        <span className="amount-value text-success fw-semibold">
                                                                            {formData.installment_monthly_amount_formatted || ('$' + Number(
                                                                                formData.installment_monthly_amount !== undefined && formData.installment_monthly_amount !== ''
                                                                                    ? formData.installment_monthly_amount
                                                                                    : ((Number(formData.enrollment_amount) || 0) - (Number(formData.installment_down_payment) || 0)) / (Number(formData.installment_months) || 12)
                                                                            ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                                                                        </span>
                                                                    </div>
                                                                    {!isAlreadyInPaidMode && (
                                                                        <div className={`d-flex gap-2 mt-3 ${forWLOrCP ? 'mb-3' : 'mb-2'}`}>
                                                                            {!isAlreadyInPaidMode && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="btn btn-sm installment-trigger-btn"
                                                                                    onClick={() => setShowInstallmentModal(true)}
                                                                                    style={{ opacity: 1, cursor: 'pointer' }}
                                                                                >
                                                                                    <i className="ri-edit-line me-1"></i> View Payment Details
                                                                                </button>
                                                                            )}
                                                                            {!isAlreadyInPaidMode && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="btn btn-sm btn-light border"
                                                                                    onClick={() => {
                                                                                        handleInputChange({ target: { name: 'installment_applied', value: false } });
                                                                                        handleInputChange({ target: { name: 'installment_down_payment', value: 0 } });
                                                                                        handleInputChange({ target: { name: 'installment_months', value: 0 } });
                                                                                        handleInputChange({ target: { name: 'installment_monthly_amount', value: 0 } });
                                                                                        handleInputChange({ target: { name: 'enrollment_type', value: '' } });
                                                                                        handleInputChange({ target: { name: 'enrollment_amount', value: '' } });
                                                                                        handleInputChange({ target: { name: 'monthly_platform_fee', value: '' } });
                                                                                        handleInputChange({ target: { name: 'plan_id', value: '' } });
                                                                                        handleInputChange({ target: { name: 'enrollment_payment', value: '' } });
                                                                                        handleInputChange({ target: { name: 'payment_amount', value: '' } });
                                                                                        handleInputChange({ target: { name: 'amount', value: '' } });
                                                                                    }}
                                                                                >
                                                                                    <i className="ri-refresh-line me-1"></i> Reset
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                                        <span className={`info-label ${labelClass}`} style={labelStyle}>
                                                                            <i className={`ri-hand-coin-line ${forWLOrCP ? 'text-primary' : ''} me-1`}></i> Total Enrollment Cost:
                                                                        </span>
                                                                        <span className={`amount-value ${amtClass}`} style={forWLOrCP ? { fontWeight: 'bold' } : undefined}>
                                                                            {formData.total_subscription_amount_formatted || ('$' + Number(selectedOption?.total_amount || formData.total_subscription_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                                                                        </span>
                                                                    </div>
                                                                    <div className="custom-notice mb-2">
                                                                        <i className="ri-information-line"></i>
                                                                        <p className="custom-notice-text">
                                                                            Flexible installment plan. Choose a down payment and duration to calculate the monthly amount.
                                                                        </p>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        className={`btn btn-sm installment-trigger-btn mt-2 ${forWLOrCP ? 'mb-3' : ''}`}
                                                                        onClick={() => setShowInstallmentModal(true)}
                                                                        disabled={isAlreadyInPaidMode}
                                                                    >
                                                                        <i className="ri-calculator-line me-1"></i> View Installment Details
                                                                    </button>
                                                                </>
                                                            )}
                                                        </>
                                                    );
                                                };

                                                if (isWLOrCP) {
                                                    const customAmount = currentPaymentAmount;

                                                    return (
                                                        <>
                                                            <input type="hidden" name="is_partner_paying" value="false" />

                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <span className="info-label">
                                                                    <i className="ri-bank-card-line"></i> Payment Plan:
                                                                </span>
                                                                <span className="info-value text-muted">
                                                                    {selectedOption?.enrollment_type || formData.enrollment_type}
                                                                </span>
                                                            </div>
                                                            <hr />

                                                            {/* Borrower Invoice Section */}
                                                            {isInstallmentPlan ? renderInstallmentContent(true) : (
                                                                <>
                                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                                        <span className="info-label text-primary" style={{ fontWeight: 600 }}>
                                                                            <i className="ri-file-list-3-line text-primary me-1"></i> Borrower Invoice:
                                                                        </span>
                                                                        <span className="amount-value text-primary" style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                                                                            ${Number(customAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </div>
                                                                    {installments > 1 && (
                                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                                            <span className="info-label text-primary" style={{ fontWeight: 600 }}>
                                                                                <i className="ri-calendar-line text-primary me-1"></i> Duration:
                                                                            </span>
                                                                            <span className="info-value text-muted">{installments} months</span>
                                                                        </div>
                                                                    )}
                                                                    {installments > 1 && (
                                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                                            <span className="info-label text-primary" style={{ fontWeight: 600 }}>
                                                                                <i className="ri-calculator-line text-primary me-1"></i> Total Amount:
                                                                            </span>
                                                                            <span className="amount-value text-primary" style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                                                                                ${displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                            <div className="d-flex justify-content-between align-items-center mb-3">

                                                            </div>

                                                            {/* Partner Invoice Section */}
                                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                                <span className="info-label text-warning" style={{ fontWeight: 600 }}>
                                                                    <i className="ri-shield-user-line text-warning me-1"></i> Partner Invoice:
                                                                </span>
                                                                <span className="amount-value text-warning" style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                                                                    {formData.borrower_fee_amount_formatted || (formData.enrollment_details?.borrower_fee_amount_formatted) || ('$' + fixedEnrollmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                                                                </span>
                                                            </div>
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <span className="text-muted" style={{ fontSize: '0.75rem', paddingLeft: '1.25rem' }}>
                                                                    Charged automatically on Partner's account.
                                                                </span>
                                                            </div>

                                                            <div className="mt-3 p-2 rounded text-center" style={{ backgroundColor: 'rgba(23, 162, 184, 0.1)', border: '1px dashed rgba(23, 162, 184, 0.3)' }}>
                                                                <p className="mb-0 text-info" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                                                    <i className="ri-information-line me-1" style={{ verticalAlign: 'middle' }}></i>
                                                                    Two completely separate invoices are created. The Borrower pays ${Number(isInstallmentPlan ? (formData.installment_applied ? formData.installment_down_payment : (selectedOption?.total_amount || 0)) : customAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, and upon successful payment, ${fixedEnrollmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} is automatically charged to the Partner account immediately.
                                                                </p>
                                                            </div>
                                                        </>
                                                    );
                                                }

                                                return (
                                                    <>
                                                        {!isHost && (
                                                            <input type="hidden" name="is_partner_paying" value="true" />
                                                        )}

                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <span className="info-label">
                                                                <i className="ri-bank-card-line"></i> Payment Plan:
                                                            </span>
                                                            <span className="info-value text-muted">{selectedOption?.enrollment_type || formData.enrollment_type}</span>
                                                        </div>
                                                        <hr />
                                                        {isInstallmentPlan ? renderInstallmentContent(false) : (
                                                            <>
                                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                                    <span className="info-label">
                                                                        <i className={installments > 1 ? 'ri-money-dollar-circle-line' : 'ri-hand-coin-line'}></i>
                                                                        {selectedOption?.enrollment_type || formData.enrollment_type}:
                                                                    </span>
                                                                    <span className="amount-value text-success">
                                                                        ${Number(currentPaymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                                {installments > 1 && (
                                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                                        <span className="info-label">
                                                                            <i className="ri-calendar-line"></i> Duration:
                                                                        </span>
                                                                        <span className="info-value text-muted">{installments} months</span>
                                                                    </div>
                                                                )}
                                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                                    <span className="info-label">
                                                                        <i className="ri-calculator-line"></i> Total Amount:
                                                                    </span>
                                                                    <span className="amount-value text-success">
                                                                        ${Number(displayTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="col-lg-12">
                    <div className="mb-3 pb-2">
                        <label htmlFor="notes" className="form-label">Notes</label>
                        <textarea
                            ref={editorRef}
                            id="notes"
                            name="notes"
                            className={`form-control ${errors.notes ? 'is-invalid' : ''}`}
                        />
                        {errors.notes && <div className="invalid-feedback d-block">{errors.notes}</div>}
                    </div>
                </div>
            </div>
            {isInstallmentPlan && (
                <InstallmentDetailsModal
                    show={showInstallmentModal}
                    onHide={() => setShowInstallmentModal(false)}
                    defaultMonths={selectedOption?.total_installments_count || formData.installment_months || 12}
                    totalAmount={Number(selectedOption?.total_amount || formData.enrollment_amount || formData.total_subscription_amount || 0)}
                    appliedTotalAmount={formData.enrollment_amount}
                    appliedDownPayment={formData.installment_down_payment}
                    appliedMonths={formData.installment_months}
                    appliedApplied={formData.installment_applied}
                    installmentMinMonths={selectedOption?.installment_min_months}
                    installmentMaxMonths={selectedOption?.installment_max_months}
                    installmentDefaultMonths={selectedOption?.installment_default_months}
                    onApply={(data: any) => {
                        handleInputChange({ target: { name: 'installment_down_payment', value: data.downPayment } });
                        handleInputChange({ target: { name: 'installment_months', value: data.months } });
                        handleInputChange({ target: { name: 'installment_monthly_amount', value: data.monthlyPayment } });
                        handleInputChange({ target: { name: 'enrollment_amount', value: data.totalAmount } });
                        handleInputChange({ target: { name: 'installment_applied', value: true } });

                        // Update payment override inputs to be the total amount (not down payment)
                        handleInputChange({ target: { name: 'enrollment_payment', value: data.totalAmount } });
                        handleInputChange({ target: { name: 'payment_amount', value: data.totalAmount } });
                        handleInputChange({ target: { name: 'amount', value: data.totalAmount } });
                    }}
                />
            )}
        </form>
    );
});

export default ClientInfoSection;
