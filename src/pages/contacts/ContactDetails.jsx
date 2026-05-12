import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
    createContact,
    updateContact,
    fetchContactById
} from '../../modules/contact/services';
import { usePermissions } from '../../lib/auth/usePermissions';
import { locationData } from '../../config';
import ContactForm from './components/ContactForm';
import ActivitySidebar from '../../components/Common/Activity/ActivitySidebar';
import EmailComposeModal from '../../components/Common/Modals/EmailComposeModal';
import ActivityCreateModal from '../../components/Common/Modals/ActivityCreateModal';
import FormLoader from '../../components/Loader/FormLoader';
import avatarDefault from "../../../public/assets/images/users/avatar-1.jpg";

export default function ContactDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();

    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Location states
    const [countries] = useState(
        Object.keys(locationData).map((key) => ({
            label: locationData[key].name,
            value: locationData[key].name
        }))
    );
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    const [contact, setContact] = useState({
        full_name: '',
        first_name: '', // Derived usually, or input separately. User JSON has both. Form uses Full Name.
        last_name: '',
        company_name: '',
        mobile_number: '',
        email: '',
        address: '',
        state: '',
        country: '', // Default empty
        city: '',
        other_city: '',
        zip_code: '',
        website: '',
        notes: '',
        image: null,
        is_referral_partner: false
    });

    // Initialize states for default country on new contact creation
    useEffect(() => {
        if (!id && contact.country) {
            const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === contact.country);
            const countryCode = countryEntry ? countryEntry[0] : null;

            if (countryCode && locationData[countryCode]) {
                const stateOptions = Object.keys(locationData[countryCode].states).map((key) => ({
                    label: locationData[countryCode].states[key].name,
                    value: locationData[countryCode].states[key].name
                }));
                setStates(stateOptions);
            }
        }
    }, [id, contact.country]);

    // Fetch contact data if editing
    useEffect(() => {
        if (id) {
            setLoading(true);
            fetchContactById(id)
                .then((data) => {
                    // Location logic to populate states based on fetched country
                    let finalCountry = data.country || '';

                    // Find country code based on Name
                    const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === finalCountry);
                    const countryCode = countryEntry ? countryEntry[0] : null;

                    if (countryCode && locationData[countryCode]) {
                        const stateOptions = Object.keys(locationData[countryCode].states).map((key) => ({
                            label: locationData[countryCode].states[key].name,
                            value: locationData[countryCode].states[key].name
                        }));
                        setStates(stateOptions);

                        // Handle State and City population
                        let finalState = data.state;
                        // Determine state code if possible or match by name
                        const sEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === finalState);
                        const stateCode = sEntry ? sEntry[0] : finalState; // fallback to name if code not found but name matches (unlikely if strictly code used but safety)

                        let cityOptions = [];
                        if (stateCode && locationData[countryCode].states[stateCode]) {
                            const cityList = locationData[countryCode].states[stateCode].cities;
                            cityOptions = cityList.map((city) => ({ label: city, value: city }));
                            setCities(cityOptions);
                        }

                        // Check if city is in dropdown
                        const cityExists = cityOptions.some(cityOption => cityOption.value === data.city);
                        let cityValue = data.city || '';
                        let otherCityValue = '';

                        if (data.city && !cityExists && cityOptions.length > 0) {
                            // City not in list, so it's "Others"
                            otherCityValue = data.city;
                            cityValue = 'Others';
                        }

                        setContact((prev) => ({
                            ...prev,
                            ...data,
                            country: finalCountry,
                            state: finalState,
                            city: cityValue,
                            other_city: otherCityValue
                        }));
                    } else {
                        setContact((prev) => ({
                            ...prev,
                            ...data,
                            country: finalCountry
                        }));
                    }
                })
                .catch((err) => {
                    console.error('Failed to fetch contact', err);
                    toast.error('Failed to load contact details');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [id]);

    // Handle form changes
    const handleChange = (e) => {
        const { name, value } = e.target;

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }

        // Handle country change cascading
        if (name === 'country') {
            // Find code based on Name
            const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === value);
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
            setContact((prev) => ({ ...prev, country: value, state: '', city: '', other_city: '' })); // Reset state
        } else if (name === 'state') {
            setContact((prev) => ({ ...prev, state: value, city: '', other_city: '' }));

            const countryName = contact.country;
            const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === countryName);
            const countryCode = countryEntry ? countryEntry[0] : null;

            if (countryCode && locationData[countryCode]) {
                const sEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === value);
                const stateCode = sEntry ? sEntry[0] : null;

                if (stateCode) {
                    const cityList = locationData[countryCode].states[stateCode].cities;
                    const cityOptions = cityList.map((city) => ({ label: city, value: city }));
                    setCities(cityOptions);
                } else {
                    setCities([]);
                }
            }
        } else if (name === 'city') {
            if (value !== 'Others') {
                setContact((prev) => ({ ...prev, city: value, other_city: '' }));
            } else {
                setContact((prev) => ({ ...prev, city: value }));
            }
        } else {
            setContact((prev) => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;

        if (!contact.full_name?.trim()) {
            newErrors.full_name = 'Full name is required';
        }

        if (!contact.email?.trim()) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(contact.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!contact.mobile_number?.trim()) {
            newErrors.mobile_number = 'Mobile number is required';
        } else if (!phoneRegex.test(contact.mobile_number)) {
            newErrors.mobile_number = 'Please enter a valid mobile number (e.g., (555) 555-5555)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }
        setErrors({});
        setSaving(true);

        try {
            const names = contact.full_name ? contact.full_name.trim().split(' ') : [''];
            const firstName = names[0];
            const lastName = names.slice(1).join(' ') || '';

            const payload = {
                ...contact,
                first_name: firstName,
                last_name: lastName
            };

            if (contact.city === 'Others' && contact.other_city) {
                payload.city = contact.other_city;
            } else if (contact.city !== 'Others') {
                payload.city = contact.city;
            }
            delete payload.other_city;
            const dataToSend = payload;
            if (id) {
                await updateContact(id, dataToSend);
                toast.success('Contact updated successfully');
            } else {
                await createContact(dataToSend);
                toast.success('Contact created successfully');
            }

            setTimeout(() => navigate('/contacts'), 800);

        } catch (error) {
            console.error('Save error:', error);
            if (error.response?.data?.errors) {
                const backendErrors = error.response.data.errors;
                if (backendErrors.first_name && !backendErrors.full_name) {
                    backendErrors.full_name = backendErrors.first_name;
                }
                setErrors(backendErrors);
            } else {
                toast.error(error.response?.data?.message || 'Failed to save contact');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Contact Details</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/contacts">Contacts</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Contact Details</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-0">
                                <Link to="/contacts" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                {((id && hasPermission('update contacts')) || (!id && hasPermission('create contacts'))) && (
                                    <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary w-lg waves-effect">
                                        {saving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <i className="ri-save-3-line align-middle me-1"></i> {id ? 'Update' : 'Save'}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    {/* Left Side: Contact Form */}
                    <div className="col-xxl-12">
                        <div className="card">
                            <div className="card-header">
                                <h5 className="card-title mb-0">Contact Information</h5>
                            </div>

                            <div className="card-body p-4">
                                {loading ? (
                                    <FormLoader count={6} />
                                ) : (
                                    <ContactForm
                                        contact={contact}
                                        errors={errors}
                                        onChange={handleChange}
                                        countries={countries}
                                        states={states}
                                        cities={cities}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Activity Sidebar */}
                    {/* <div className="col-xxl-4">
                        <ActivitySidebar entityId={id} entityType="Contact" />
                    </div> */}
                </div>

                {/* Modals */}
                <EmailComposeModal entityType="contact" entityId={id} />
                <ActivityCreateModal entityType="contact" entityId={id} />
            </div>
        </div>
    );
}
