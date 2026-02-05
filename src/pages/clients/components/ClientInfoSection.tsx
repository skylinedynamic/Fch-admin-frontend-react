import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import Flatpickr from 'react-flatpickr';
import { toast } from 'react-toastify';
import { formatPhoneNumber } from '../../../utils/formatters';
import type { Client } from '../../../modules/client/types';
import { useSummernote } from '../../../hooks/useSummernote';
import { ENROLLMENT_TYPE_OPTIONS } from '../../../config/enrollmentOptions';
import { entityTypes, industryTypes } from '../../../config/borrower';
import { locationData } from '../../../config'; // Import locationData
import { useClient, useUpdateClient } from '../../../modules/client/queries';
import { useQueryClient } from '@tanstack/react-query'; // Import queryClient if needed manually, or rely on hook

// Default/Empty Client State
const defaultClientState: Client = {
    first_name: '',
    last_name: '',
    phone_number: '',
    country_code: '+1',
    email: '',
    signup_id: '',
    website: '',
    legal_business_name: '',
    business_ein: '',
    state_file_number: '',
    duns_number: '',
    business_address: '',
    country: 'United States',
    city: '',
    other_city: '',
    state: '',
    business_zip: '',
    business_phone: '',
    entity_type: '',
    industry_type: '',
    business_start_date: '',
    ssn_last_4: '',
    enrollment_type: '',
    notes: '',
    // Financials defaults
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
    funding_urgency: ''
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

    // 2. Local State
    const [formData, setFormData] = useState<Client>(initialData || defaultClientState);

    // 3. Sync Fetch to Local State
    useEffect(() => {
        if (fetchedData) {
            // @ts-ignore
            const dataToSet = fetchedData.data || fetchedData;
            setFormData(prev => ({ ...prev, ...dataToSet }));
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
             // Basic Validation or logic
             const payload = { ...formData, id: clientId };
             if (payload.city === 'Others') {
                 payload.city = payload.other_city;
             }

             if (!isHost) {
                 // @ts-ignore
                 payload.is_partner_paying = true;
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

    // 6. Settings Logic (Sync Payment Amount) - kept from original
    useEffect(() => {
        if (!isHost) {
            const planAmount = nonHostPlan?.payment_amount ? parseFloat(nonHostPlan.payment_amount) : 800;
            const planType = nonHostPlan?.enrollment_type || 'Fixed enrollment';

            if (formData.payment_amount != planAmount && !clientId) { // Only force update if creating or explicitly needed? Existing logic was loose. Let's keep it safe.
                 handleInputChange({ target: { name: 'payment_amount', value: planAmount } });
            }
             if (formData.enrollment_type != planType && !clientId) {
                 handleInputChange({ target: { name: 'enrollment_type', value: planType } });
             }

        } else if (isHost && formData.enrollment_type) {
            const selectedOption = ENROLLMENT_TYPE_OPTIONS.find(opt => opt.value === formData.enrollment_type);
            if (selectedOption && formData.payment_amount !== selectedOption.price) {
                handleInputChange({ target: { name: 'payment_amount', value: selectedOption.price } });
            }
        }
    }, [isHost, settings, formData.enrollment_type, formData.payment_amount, nonHostPlan]);


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
                        <label htmlFor="website" className="form-label">Website</label>
                        <input
                            type="text"
                            className={`form-control ${errors.website ? 'is-invalid' : ''}`}
                            id="website"
                            name="website"
                            placeholder="www.example.com"
                            value={formData.website || ''}
                            onChange={handleInputChange}
                        />
                        {errors.website && <div className="invalid-feedback">{errors.website}</div>}
                    </div>
                </div>

                {/* Business Information */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="legal_business_name" className="form-label">Legal Business Name</label>
                        <input
                            type="text"
                            className={`form-control ${errors.legal_business_name ? 'is-invalid' : ''}`}
                            id="legal_business_name"
                            name="legal_business_name"
                            placeholder="Enter legal business name"
                            value={formData.legal_business_name || ''}
                            onChange={handleInputChange}
                        />
                        {errors.legal_business_name && <div className="invalid-feedback">{errors.legal_business_name}</div>}
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
                        <label htmlFor="business_zip" className="form-label">Zip Code</label>
                        <input
                            type="text"
                            className={`form-control ${errors.business_zip ? 'is-invalid' : ''}`}
                            id="business_zip"
                            name="business_zip"
                            placeholder="Enter zip code"
                            value={formData.business_zip || ''}
                            onChange={handleInputChange}
                        />
                        {errors.business_zip && <div className="invalid-feedback">{errors.business_zip}</div>}
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
                        <label htmlFor="entity_type" className="form-label">Entity Type</label>
                        <Dropdown
                            value={formData.entity_type}
                            options={entityTypes}
                            onChange={(e) => handleInputChange({ target: { name: 'entity_type', value: e.value } })}
                            optionLabel="label"
                            placeholder="Select entity type"
                            filter
                            className={`w-100 ${errors.entity_type ? 'p-invalid' : ''}`}
                            appendTo="self"
                        />
                        {errors.entity_type && <small className="p-error">{errors.entity_type}</small>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="industry_type" className="form-label">Industry Type</label>
                        <Dropdown
                            value={formData.industry_type}
                            options={industryTypes}
                            onChange={(e) => handleInputChange({ target: { name: 'industry_type', value: e.value } })}
                            optionLabel="label"
                            placeholder="Select industry type"
                            filter
                            className={`w-100 ${errors.industry_type ? 'p-invalid' : ''}`}
                            appendTo="self"
                        />
                        {errors.industry_type && <small className="p-error">{errors.industry_type}</small>}
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
                        <label htmlFor="ssn_last_4" className="form-label">SSN Last 4</label>
                        <input
                            type="text"
                            className={`form-control ${errors.ssn_last_4 ? 'is-invalid' : ''}`}
                            id="ssn_last_4"
                            name="ssn_last_4"
                            placeholder="Enter last 4 digits of SSN"
                            maxLength={4}
                            value={formData.ssn_last_4 || ''}
                            onChange={handleInputChange}
                        />
                        {errors.ssn_last_4 && <div className="invalid-feedback">{errors.ssn_last_4}</div>}
                    </div>
                </div>

                {isHost ? (
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label htmlFor="enrollment_type" className="form-label">Enrollment Amount <span className="text-danger">*</span></label>
                            <Dropdown
                                value={formData.enrollment_type}
                                options={ENROLLMENT_TYPE_OPTIONS}
                                onChange={(e) => {
                                    handleInputChange({ target: { name: 'enrollment_type', value: e.value } });
                                    const selectedOption = ENROLLMENT_TYPE_OPTIONS.find(opt => opt.value === e.value);
                                    if (selectedOption) {
                                        handleInputChange({ target: { name: 'payment_amount', value: selectedOption.price } });
                                    }
                                }}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Select enrollment amount"
                                className={`w-100 ${errors.enrollment_type ? 'p-invalid' : ''}`}
                                appendTo="self"
                            />
                            {errors.enrollment_type && <small className="p-error">{errors.enrollment_type}</small>}
                        </div>
                    </div>
                ) : (
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label className="form-label">Enrollment Fee (Applied)</label>
                            <div className="bg-success bg-opacity-10 p-4 rounded-4 border border-success border-opacity-10 d-flex align-items-center animate__animated animate__fadeInUp">
                                <input type="hidden" name="enrollment_type" value={nonHostPlan?.enrollment_type || 'Fixed enrollment'} />
                                <input type="hidden" name="is_partner_paying" value="true" />
                                
                                <div className="flex-shrink-0 me-3">
                                    <div className="bg-white p-3 rounded-3 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                                        <i className="ri-money-dollar-box-fill text-success" style={{ fontSize: '2rem' }}></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ps-2">
                                    <p className="mb-0 text-muted fs-15 lh-base">
                                        Fixed enrollment fee <span className="text-success fw-bold fs-18">${nonHostPlan?.payment_amount ? parseFloat(nonHostPlan.payment_amount).toFixed(2) : '800.00'}</span>
                                    </p>
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
