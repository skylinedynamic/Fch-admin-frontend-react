import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSettings, updateSettings } from '../../modules/settings/services';
import SettingsForm from './components/SettingsForm';
import { toast } from 'react-toastify';

export default function Settings() {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [activeSection, setActiveSection] = useState('payment'); // 'payment', 'system', 'others'
    const [formData, setFormData] = useState({
        stripe_key_sandbox: '',
        stripe_secret_sandbox: '',
        stripe_key_production: '',
        stripe_secret_production: '',
        payment_mode: 'sandbox'
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
                    stripe_key_sandbox: data.stripe_key_sandbox || '',
                    stripe_secret_sandbox: data.stripe_secret_sandbox || '',
                    stripe_key_production: data.stripe_key_production || '',
                    stripe_secret_production: data.stripe_secret_production || '',
                    payment_mode: data.payment_mode || 'sandbox'
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

        // Reset all errors if environment mode changes
        if (name === 'payment_mode') {
            setErrors({});
            return;
        }

        // Clear specific error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
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
            return;
        }

        setLoading(true);
        try {
            // Send only required fields
            const payload = {
                stripe_key_sandbox: formData.stripe_key_sandbox,
                stripe_secret_sandbox: formData.stripe_secret_sandbox,
                stripe_key_production: formData.stripe_key_production,
                stripe_secret_production: formData.stripe_secret_production,
                payment_mode: formData.payment_mode
            };

            const response = await updateSettings(payload);
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
            <div className="container-fluid">
                {/* Header Section */}
                <div className="row page-subheader-sticky bg-body border-bottom border-light shadow-sm-bottom">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">System Administration</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item active text-primary" aria-current="page">Settings</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <SettingsForm
                            formData={formData}
                            handleInputChange={handleInputChange}
                            onSubmit={handleSubmit}
                            loading={loading}
                            fetching={fetching}
                            errors={errors}
                            activeSection={activeSection}
                            setActiveSection={setActiveSection}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
