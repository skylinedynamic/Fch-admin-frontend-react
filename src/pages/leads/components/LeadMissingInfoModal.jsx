import React, { useEffect, useRef, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { Dropdown } from 'primereact/dropdown';
import { locationData } from '../../../config';
import { formatPhoneNumber } from '../../../utils/formatters';

export default function LeadMissingInfoModal({ show, onHide, onConfirm, lead, loading }) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);
    const [extraData, setExtraData] = useState({});
    const [errors, setErrors] = useState({});
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    const countries = Object.keys(locationData).map((key) => ({
        label: locationData[key].name,
        value: locationData[key].name
    }));

    useEffect(() => {
        if (show && lead) {
            setExtraData({
                contact_person: lead.contact_person || '',
                email: lead.email || '',
                phone_number: lead.phone_number || '',
                country: lead.country || 'USA',
                state: lead.state || '',
                city: lead.city || '',
            });
            setErrors({});
        }
    }, [show, lead]);

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

    useEffect(() => {
        if (extraData.state && extraData.country) {
            const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === extraData.country);
            const countryCode = countryEntry ? countryEntry[0] : null;

            if (countryCode && locationData[countryCode]) {
                const sEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === extraData.state);
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
    }, [extraData.state, extraData.country]);

    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }
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

    const handleInputChange = (name, value) => {
        setExtraData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!extraData.contact_person?.trim()) newErrors.contact_person = 'Name is required';
        if (!extraData.email?.trim()) newErrors.email = 'Email is required';
        if (!extraData.phone_number?.trim()) newErrors.phone_number = 'Phone is required';
        if (!extraData.country) newErrors.country = 'Country is required';
        if (!extraData.state) newErrors.state = 'State is required';
        if (!extraData.city) newErrors.city = 'City is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConfirm = () => {
        if (validate()) {
            onConfirm(extraData);
        }
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header bg-soft-primary p-3">
                        <h5 className="modal-title">Missing Contact Information</h5>
                        <button type="button" className="btn-close" onClick={handleClose} disabled={loading}></button>
                    </div>
                    <div className="modal-body p-4">
                        <p className="text-muted mb-4">Please provide the missing contact information for <strong>{lead?.company_name || 'this lead'}</strong> before converting.</p>
                        
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
                                    className={`w-100 ${errors.country ? 'p-invalid' : ''}`}
                                />
                                {errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
                            </div>
                            <div className="col-lg-6">
                                <label className="form-label">State <span className="text-danger">*</span></label>
                                <Dropdown
                                    value={extraData.state}
                                    options={states}
                                    onChange={(e) => handleInputChange('state', e.value)}
                                    placeholder="Select State"
                                    filter
                                    className={`w-100 ${errors.state ? 'p-invalid' : ''}`}
                                    disabled={!extraData.country}
                                />
                                {errors.state && <div className="invalid-feedback d-block">{errors.state}</div>}
                            </div>
                            <div className="col-lg-6">
                                <label className="form-label">City <span className="text-danger">*</span></label>
                                <Dropdown
                                    value={extraData.city}
                                    options={cities}
                                    onChange={(e) => handleInputChange('city', e.value)}
                                    placeholder="Select City"
                                    filter
                                    className={`w-100 ${errors.city ? 'p-invalid' : ''}`}
                                    disabled={!extraData.state}
                                />
                                {errors.city && <div className="invalid-feedback d-block">{errors.city}</div>}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-light" onClick={handleClose} disabled={loading}>Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={loading}>
                            {loading ? <span className="spinner-border spinner-border-sm me-1"></span> : 'Save & Continue'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
