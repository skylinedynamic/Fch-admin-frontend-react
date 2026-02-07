import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import Flatpickr from 'react-flatpickr';
import { toast } from 'react-toastify';
import { formatPhoneNumber } from '../../../utils/formatters';
import type { Client } from '../../../modules/client/types';
import { useSummernote } from '../../../hooks/useSummernote';
import { entityTypes, industryTypes } from '../../../config/borrower';
import { locationData } from '../../../config'; // Import locationData
import { useClient, useUpdateClient, useBorrowerPlans, useNonHostBorrowerPlans } from '../../../modules/client/queries';

// Default/Empty Client State
const defaultClientState: Client = {
    first_name: '',
    last_name: '',
    phone_number: '',
    country_code: '+1',
    email: '',
    business_website: '',
    business_name: '',
    business_ein: '',
    state_file_number: '',
    duns_number: '',
    business_address: '',
    country: 'United States',
    city: '',
    other_city: '',
    state: '',
    business_postal_code: '',
    business_phone: '',
    business_entity_type: '',
    business_industry_type: '',
    business_start_date: '',
    last_4_ssn: '',
    enrollment_type: '',
    notes: '',
};

const DATE_PICKER_OPTIONS = { dateFormat: "d M, Y" };

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
    settings?: any;
    nonHostPlan?: any;
    onSaveSuccess?: () => void;
}

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
    settings = null,
    nonHostPlan = null,
    onSaveSuccess
}, ref) => {
    // 1. Data Fetching (only if clientId exists)
    const { data: fetchedData, isLoading: isFetching } = useClient(clientId as string, !!clientId);
    const updateMutation = useUpdateClient();

    // Fetch Plans
    const { data: borrowerPlans = [] } = useBorrowerPlans(isHost);
    const { data: nonHostPlans = [] } = useNonHostBorrowerPlans(!isHost);

    const enrollmentOptions = React.useMemo(() => {
        const plans = isHost ? borrowerPlans : nonHostPlans;
        return plans.map((plan: any) => ({
            label: `${plan.enrollment_type} - $${plan.payment_amount}`,
            value: plan.enrollment_type,
            price: plan.payment_amount,
            ...plan
        }));
    }, [isHost, borrowerPlans, nonHostPlans]);

    // 2. Local State
    const [formData, setFormData] = useState<Client>(initialData || defaultClientState);

    // 3. Sync Fetch to Local State
    useEffect(() => {
        if (fetchedData) {
            // @ts-ignore
            const apiData = fetchedData.data || fetchedData;
            setFormData(prev => ({ ...prev, ...apiData }));
        }
    }, [fetchedData]);

    // Local Location Options Logic
    const [localStates, setLocalStates] = useState<{ label: string; value: string }[]>([]);
    const [localCities, setLocalCities] = useState<{ label: string; value: string }[]>([]);

    // Countries is static from locationData
    const localCountries = React.useMemo(() => Object.keys(locationData).map(key => ({
        label: locationData[key].name,
        value: locationData[key].name
    })), []);

    useEffect(() => {
        // Compute States based on Country
        const countryName = formData.country;
        const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === countryName);
        const countryCode = countryEntry ? countryEntry[0] : (countryName === 'USA' ? 'USA' : 'USA'); // Default fallback

        if (countryCode && locationData[countryCode]) {
            const stateOpts = Object.keys(locationData[countryCode].states).map((key) => ({
                label: locationData[countryCode].states[key].name,
                value: locationData[countryCode].states[key].name
            }));
            setLocalStates(stateOpts);
        } else {
            setLocalStates([]);
        }

        // Compute Cities based on State
        if (countryCode && formData.state && locationData[countryCode]) {
            const stateEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === formData.state);
            const stateCode = stateEntry ? stateEntry[0] : null; // or match by name if stored by name

            // If stored by name, we need to find the key. 
            // locationData structure: { USA: { name: 'USA', states: { AL: { name: 'Alabama', cities: [...] } } } }

            if (stateCode) {
                const cityList = locationData[countryCode].states[stateCode].cities;
                setLocalCities(cityList.map((city: string) => ({ label: city, value: city })));
            } else {
                setLocalCities([]);
            }
        } else {
            setLocalCities([]);
        }

    }, [formData.country, formData.state]);

    // 4. Handle Inputs
    const handleInputChange = (e: any) => {
        const name = e.target ? e.target.name : e.name;
        const value = e.target ? e.target.value : e.value;

        setFormData(prev => ({ ...prev, [name]: value }));

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
    const { editorRef } = useSummernote('notes', formData.notes, handleInputChange);

    // 5. Expose Save via Ref
    useImperativeHandle(ref, () => ({
        save: async () => {
            const payload = {
                ...formData,
                id: clientId,
                city: formData.city === 'Others' ? formData.other_city : formData.city
            };

            if (!isHost) {
                // @ts-ignore
                payload.is_partner_paying = true;
            }

            if (isHost && !payload.enrollment_type) {
                const err = { enrollment_type: 'Enrollment type is required' };
                if (setErrors) setErrors(err);
                toast.error("Please select an enrollment type");
                return Promise.reject(new Error("Validation failed"));
            }

            return new Promise((resolve, reject) => {
                // @ts-ignore
                updateMutation.mutate({ id: clientId, data: payload }, {
                    onSuccess: () => {
                        toast.success("Client personal details updated successfully");
                        if (onSaveSuccess) onSaveSuccess();
                        resolve();
                    },
                    onError: (error: any) => {
                        console.error("Save error:", error);
                        if (error.response && error.response.data && error.response.data.errors && setErrors) {
                            const backendErrors = error.response.data.errors;
                            const mappedErrors: Record<string, string> = {};
                            Object.keys(backendErrors).forEach(key => {
                                mappedErrors[key] = Array.isArray(backendErrors[key]) ? backendErrors[key][0] : backendErrors[key];
                            });
                            setErrors(mappedErrors);
                        }
                        reject(error);
                    }
                });
            });
        }
    }));

    // 6. Settings Logic (Sync Payment Amount)
    useEffect(() => {
        if (formData.enrollment_type) {
            const selectedOption = enrollmentOptions.find(opt => opt.value === formData.enrollment_type);
            if (selectedOption && formData.payment_amount !== selectedOption.price) {
                handleInputChange({ target: { name: 'payment_amount', value: selectedOption.price } });
            }
        }
    }, [isHost, enrollmentOptions, formData.enrollment_type, formData.payment_amount, clientId]);

    if (isFetching && clientId) {
        return (
            <div className="row">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div className="col-lg-6 mb-3" key={i}>
                        <div className="placeholder-glow">
                            <span className="placeholder col-4 mb-2"></span>
                            <span className="placeholder col-12 p-3"></span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Reuse rendering logic
    return (
        <form onSubmit={(e) => e.preventDefault()}>
            <div className="row">
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
                            {(formData.country === 'USA' || formData.country === 'Canada') && (
                                <span className="input-group-text bg-light border">
                                    <span className="me-1">{formData.country === 'USA' ? 'USA' : 'CAN'}</span>
                                    <span className="text-muted">+1</span>
                                </span>
                            )}
                            <input
                                type="text"
                                className={`form-control ${errors.phone_number ? 'is-invalid' : ''}`}
                                id="phone_number"
                                name="phone_number"
                                placeholder="(555) 555-5555"
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
                            placeholder="Enter email"
                            value={formData.email || ''}
                            onChange={handleInputChange}
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>
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

                {/* Business Information */}
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
                            placeholder="Enter 9-digit EIN"
                            maxLength={9}
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
                        <label className="form-label">State <span className="text-danger">*</span></label>
                        <Dropdown
                            value={formData.state}
                            options={localStates}
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
                        <label className="form-label">City <span className="text-danger">*</span></label>
                        <Dropdown
                            value={formData.city}
                            options={[...localCities, { label: 'Others', value: 'Others' }]}
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
                                id="city"
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
                        <label htmlFor="business_postal_code" className="form-label">Zip Code</label>
                        <input
                            type="text"
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
                        <label htmlFor="business_phone" className="form-label">Business Phone </label>
                        <div className="input-group">
                            {(formData.country === 'USA' || formData.country === 'Canada') && (
                                <span className="input-group-text bg-light border">
                                    <span className="me-1">{formData.country === 'USA' ? 'USA' : 'CAN'}</span>
                                    <span className="text-muted">+1</span>
                                </span>
                            )}
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
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_industry_type" className="form-label">Industry Type</label>
                        <Dropdown
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
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_start_date" className="form-label">Business Start Date</label>
                        <Flatpickr
                            options={DATE_PICKER_OPTIONS}
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
                        {errors.business_start_date && <div className="invalid-feedback">{errors.business_start_date}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="last_4_ssn" className="form-label">SSN Last 4</label>
                        <input
                            type="text"
                            className={`form-control ${errors.last_4_ssn ? 'is-invalid' : ''}`}
                            id="last_4_ssn"
                            name="last_4_ssn"
                            placeholder="Enter last 4 digits of SSN"
                            maxLength={4}
                            value={formData.last_4_ssn || ''}
                            onChange={handleInputChange}
                        />
                        {errors.last_4_ssn && <div className="invalid-feedback">{errors.last_4_ssn}</div>}
                    </div>
                </div>

                {/* Enrollment Type Dropdown (Now for both Host and Non-Host) */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="enrollment_type" className="form-label">
                            Enrollment Type <span className="text-danger">*</span>
                        </label>
                        <Dropdown
                            value={formData.enrollment_type}
                            options={enrollmentOptions}
                            onChange={(e) => {
                                const selectedVal = e.value;
                                const selectedOption = enrollmentOptions.find(opt => opt.value === selectedVal);
                                const price = selectedOption ? selectedOption.price : 0;

                                setFormData(prev => ({
                                    ...prev,
                                    enrollment_type: selectedVal,
                                    payment_amount: price
                                }));

                                // Propagate changes
                                if (handleLocationChange) {
                                    handleLocationChange('enrollment_type', selectedVal);
                                }

                                // Clear error if present
                                if (setErrors && errors.enrollment_type) {
                                    const newErrors = { ...errors };
                                    delete newErrors.enrollment_type;
                                    setErrors(newErrors);
                                }
                            }}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select Enrollment Type"
                            className={`w-100 ${errors.enrollment_type ? 'p-invalid' : ''}`}
                            appendTo="self"
                        />
                        {errors.enrollment_type && <small className="p-error">{errors.enrollment_type}</small>}
                    </div>
                </div>

                {/* Enrollment Amount - Dynamic Display */}
                {formData.enrollment_type && (
                    <div className="col-lg-12">
                        <div className="mb-3">
                            <label className="form-label">Enrollment Amount</label>
                            <div className="card border border-primary bg-light-subtle animate__animated animate__fadeIn">
                                <div className="card-body p-3">
                                    {(() => {
                                        const selectedOption = enrollmentOptions.find(opt => opt.value === formData.enrollment_type);
                                        if (!selectedOption) return null;

                                        const installments = selectedOption.total_installments_count || (selectedOption.value && selectedOption.value.includes('One Time') ? 1 : 1);
                                        // For Host, if it's not One Time, it used to imply 6 months, but now we should probably trust the API data or fall back to previous logic if API doesn't send installments count for host
                                        // The JSON example for host showed "total_installments_count": null for One Time, and 6 for "6 Month Payment". So we can trust API.

                                        const totalAmount = selectedOption.total_amount || selectedOption.price; // Fallback
                                        const duration = installments;

                                        return (
                                            <>
                                                {!isHost && (
                                                    <input type="hidden" name="is_partner_paying" value="true" />
                                                )}

                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-semibold text-dark">Client Type:</span>
                                                    <span className={`badge ${isHost ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'}`}>
                                                        {isHost ? 'Host Client' : 'Partner Client'}
                                                    </span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-semibold text-dark">Payment Plan:</span>
                                                    <span className="text-muted">{selectedOption.enrollment_type}</span>
                                                </div>
                                                <hr className="my-2" />
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-semibold text-dark">
                                                        {installments > 1 ? 'Monthly Payment:' : 'One-Time Cost:'}
                                                    </span>
                                                    <span className={`fs-5 fw-bold ${installments > 1 ? 'text-primary' : 'text-success'}`}>
                                                        ${selectedOption.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                                {installments > 1 && (
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <span className="text-muted">Duration:</span>
                                                        <span className="text-muted">{installments} months</span>
                                                    </div>
                                                )}
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-semibold text-dark">Total:</span>
                                                    <span className="fw-bold text-dark">
                                                        ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
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
        </form>
    );
});

export default ClientInfoSection;