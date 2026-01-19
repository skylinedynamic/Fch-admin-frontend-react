import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSettings, updateSettings } from '../../modules/settings/services';
import SettingsForm from './components/SettingsForm';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './settings-redesign.css';

export default function Settings() {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [activeSection, setActiveSection] = useState('payment'); // 'payment', 'system', 'others'
    const [formData, setFormData] = useState({
        card_no: '',
        card_name: '',
        card_expiry: '',
        card_cvv: '',
        currency: 'USD',
        stripe_key_sandbox: '',
        stripe_secret_sandbox: '',
        stripe_key_production: '',
        stripe_secret_production: '',
        payment_mode: 'sandbox',
        configuration: {
            theme: 'light',
            notifications: true,
            business_name: '',
            contact_email: '',
            phone_number: '',
            address: ''
        }
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setFetching(true);
            const response = await fetchSettings();
            if (response && response.data) {
                const data = response.data.data || response.data;
                setFormData({
                    ...data,
                    payment_mode: data.payment_mode || 'sandbox',
                    configuration: data.configuration || { 
                        theme: 'light', 
                        notifications: true,
                        business_name: '',
                        contact_email: '',
                        phone_number: '',
                        address: ''
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            toast.error('Failed to load settings.');
        } finally {
            setFetching(false);
        }
    };

    const handleInputChange = (e) => {
        let { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleConfigChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            configuration: {
                ...prev.configuration,
                [key]: value
            }
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (activeSection === 'payment') {
            const mode = formData.payment_mode || 'sandbox';
            const suffix = `_${mode}`;
            
            if (!formData[`stripe_key${suffix}`]) {
                newErrors[`stripe_key${suffix}`] = 'Stripe Key is required.';
            }
            if (!formData[`stripe_secret${suffix}`]) {
                newErrors[`stripe_secret${suffix}`] = 'Stripe Secret is required.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        if (!validateForm()) {
            toast.warn('Please fill in all required fields.');
            return;
        }

        setLoading(true);
        try {
            const response = await updateSettings(formData);
            if (response) {
                toast.success('Settings updated successfully.');
                loadSettings();
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
            toast.error(error.response?.data?.message || 'Failed to update settings.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-content">
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="container-fluid">
                {/* Header */}
                <div className="row mb-4">
                    <div className="col-12 mt-2">
                        <div className="text-center mb-4">
                            <h2 className="fw-bold text-dark">System Administration</h2>
                            <p className="text-muted">Configure your platform settings and payment integrations.</p>
                        </div>
                    </div>
                </div>

                {fetching ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <SettingsForm
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleConfigChange={handleConfigChange}
                        onSubmit={handleSubmit}
                        loading={loading}
                        errors={errors}
                        activeSection={activeSection}
                        setActiveSection={setActiveSection}
                    />
                )}
            </div>
        </div>
    );
}
