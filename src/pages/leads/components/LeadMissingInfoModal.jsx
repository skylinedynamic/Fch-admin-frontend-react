import React, { useEffect, useRef, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { Dropdown } from 'primereact/dropdown';
import { locationData } from '../../../config';
import { formatPhoneNumber } from '../../../utils/formatters';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_BORROWER } from '../../../config/appConfig';
import { leadCountryFor } from '../../../modules/leads/logic';

export default function LeadMissingInfoModal({ show, onHide, onConfirm, lead, targetType = ENTITY_TYPE_BORROWER, loading, backendErrors }) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);
    const [extraData, setExtraData] = useState({});
    const [errors, setErrors] = useState({});
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    const countries = locationData ? Object.keys(locationData).map((key) => ({
        label: locationData[key].name,
        value: locationData[key].name
    })) : [];

    useEffect(() => {
        if (show && lead) {
            setExtraData({
                contact_person: lead.contact_person || lead.contact_name || '',
                email: lead.email || '',
                phone_number: lead.phone_number || '',
                country: leadCountryFor(lead.country),
                state: lead.state || '',
                city: lead.city || '',
            });
            setErrors({});
        }
    }, [show, lead]);

    useEffect(() => {
        if (backendErrors && Object.keys(backendErrors).length > 0) {
            setErrors(backendErrors);
        }
    }, [backendErrors]);

    useEffect(() => {
        if (extraData.country) {
            const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === extraData.country);
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
    }, [extraData.country]);

    // Handle State -> City cascade
    useEffect(() => {
        if (extraData.state && extraData.country) {
            const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === extraData.country);
            const countryCode = countryEntry ? countryEntry[0] : null;

            if (countryCode && locationData[countryCode]) {
                const sEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === extraData.state);
                const stateCode = sEntry ? sEntry[0] : null;

                if (stateCode && locationData[countryCode].states[stateCode]) {
                    const cityList = locationData[countryCode].states[stateCode].cities || [];
                    const cityOptions = cityList.map((city) => ({ label: city, value: city }));
                    setCities([...cityOptions, { label: 'Others', value: 'Others' }]);

                    // Initialization Check: if current city is not in the list, move it to other_city
                    if (extraData.city && extraData.city !== 'Others' && !cityList.includes(extraData.city)) {
                        setExtraData(prev => ({
                            ...prev,
                            city: 'Others',
                            other_city: extraData.city
                        }));
                    }
                } else {
                    setCities([{ label: 'Others', value: 'Others' }]);
                }
            } else {
                setCities([{ label: 'Others', value: 'Others' }]);
            }
        }
    }, [extraData.state, extraData.country]);

    // Modal Instance setup
    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }

        // Prevent Bootstrap modal focus trap from stealing focus from PrimeReact overlay panels
        const handleFocusin = (e) => {
            const isInPrimeReactOverlay = e.target.closest(
                '.p-dropdown-panel, .p-overlay-open, .p-connected-overlay-enter-done'
            );
            if (isInPrimeReactOverlay) {
                e.stopImmediatePropagation();
            }
        };
        document.addEventListener('focusin', handleFocusin, true);

        return () => {
            document.removeEventListener('focusin', handleFocusin, true);
            if (modalInstanceRef.current) {
                modalInstanceRef.current.hide();
                modalInstanceRef.current.dispose();
                modalInstanceRef.current = null;
            }
        };
    }, [modalRef]);

    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            modal.show();
        } else {
            modal.hide();
        }
    }, [show]);

    // Accurate Input Handler with Real-time Validation and Cascading Reset
    const handleInputChange = (name, value) => {
        setExtraData(prev => {
            const newData = { ...prev, [name]: value };

            // Cascading Reset Logic
            if (name === 'country') {
                newData.state = '';
                newData.city = '';
                newData.other_city = '';
            } else if (name === 'state') {
                newData.city = '';
                newData.other_city = '';
            } else if (name === 'city' && value !== 'Others') {
                newData.other_city = '';
            }

            return newData;
        });

        // Instant Error Clearing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));

            // Also clear dependent errors if parent changes
            if (name === 'country') {
                setErrors(prev => ({ ...prev, state: '', city: '' }));
            } else if (name === 'state') {
                setErrors(prev => ({ ...prev, city: '' }));
            }
        }
    };

    const validate = () => {
        setErrors({});
        return true;
    };

    const handleConfirm = () => {
        if (validate()) {
            const payload = { ...extraData };
            if (payload.city !== 'Others') {
                delete payload.other_city;
            }
            onConfirm(payload);
        }
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    const headerClass = targetType == ENTITY_TYPE_PARTNER ? 'bg-soft-success' : 'bg-soft-primary';
    const title = `${targetType} Conversion: Missing Info`;
    const icon = targetType == ENTITY_TYPE_PARTNER ? 'ri-shake-hands-line' : 'ri-user-received-2-line';
    const textColor = targetType == ENTITY_TYPE_PARTNER ? 'text-success' : 'text-primary';

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow-lg">
                    <div className={`modal-header ${headerClass} p-3`}>
                        <h5 className="modal-title d-flex align-items-center">
                            <i className={`${icon} ${textColor} fs-22 me-2`}></i>
                            {title}
                        </h5>
                        <button type="button" className="btn-close" onClick={handleClose} disabled={loading}></button>
                    </div>
                    <div className="modal-body p-4">
                        <p className="text-muted mb-4">
                            Please provide the missing contact information for <strong>{lead?.company_name || 'this lead'}</strong> before completing the <strong>{targetType}</strong> conversion.
                        </p>

                        <div className="row g-3">
                            <div className="col-lg-6">
                                <label className="form-label">Contact Person Name <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control ${errors.contact_person ? 'is-invalid' : ''}`}
                                    value={extraData.contact_person}
                                    onChange={(e) => handleInputChange('contact_person', e.target.value)}
                                    placeholder="Full Name"
                                />
                                {errors.contact_person && <div className="invalid-feedback">{errors.contact_person}</div>}
                            </div>
                            <div className="col-lg-6">
                                <label className="form-label">Contact Email <span className="text-danger">*</span></label>
                                <input
                                    type="email"
                                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                    value={extraData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    placeholder="email@example.com"
                                />
                                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                            </div>
                            <div className="col-lg-6">
                                <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control ${errors.phone_number ? 'is-invalid' : ''}`}
                                    value={extraData.phone_number}
                                    onChange={(e) => handleInputChange('phone_number', formatPhoneNumber(e.target.value))}
                                    placeholder="(555) 555-5555"
                                />
                                {errors.phone_number && <div className="invalid-feedback">{errors.phone_number}</div>}
                            </div>
                            <div className="col-lg-6">
                                <label className="form-label">Country <span className="text-danger">*</span></label>
                                <Dropdown
                                    value={extraData.country}
                                    options={countries}
                                    onChange={(e) => handleInputChange('country', e.value)}
                                    placeholder="Select Country"
                                    filter
                                    optionLabel="label"
                                    optionValue="value"
                                    appendTo={document.body}
                                    className={`w-100 ${errors.country ? 'p-invalid' : ''}`}
                                />
                                {errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
                            </div>
                            <div className="col-lg-6">
                                <label className="form-label">State</label>
                                <Dropdown
                                    value={extraData.state}
                                    options={states}
                                    onChange={(e) => handleInputChange('state', e.value)}
                                    placeholder="Select State"
                                    filter
                                    optionLabel="label"
                                    optionValue="value"
                                    appendTo={document.body}
                                    className={`w-100 ${errors.state ? 'p-invalid' : ''}`}
                                    disabled={!extraData.country}
                                />
                                {errors.state && <div className="invalid-feedback d-block">{errors.state}</div>}
                            </div>
                            <div className="col-lg-6">
                                <label className="form-label">City</label>
                                <Dropdown
                                    value={extraData.city}
                                    options={cities}
                                    onChange={(e) => handleInputChange('city', e.value)}
                                    placeholder="Select City"
                                    filter
                                    optionLabel="label"
                                    optionValue="value"
                                    appendTo={document.body}
                                    className={`w-100 ${errors.city ? 'p-invalid' : ''}`}
                                    disabled={!extraData.state}
                                />
                                {errors.city && <div className="invalid-feedback d-block">{errors.city}</div>}
                            </div>
                            {extraData.city === 'Others' && (
                                <div className="col-lg-12">
                                    <label className="form-label">Other City <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.other_city ? 'is-invalid' : ''}`}
                                        value={extraData.other_city}
                                        onChange={(e) => handleInputChange('other_city', e.target.value)}
                                        placeholder="Enter city name"
                                    />
                                    {errors.other_city && <div className="invalid-feedback">{errors.other_city}</div>}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-light" onClick={handleClose} disabled={loading}>Cancel</button>
                        <button type="button" className={`btn ${targetType == ENTITY_TYPE_PARTNER ? 'btn-success' : 'btn-primary'}`} onClick={handleConfirm} disabled={loading}>
                            {loading ? <span className="spinner-border spinner-border-sm me-1"></span> : 'Save & Continue'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
