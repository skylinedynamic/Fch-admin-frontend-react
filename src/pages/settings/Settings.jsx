import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSettings, updateSettings } from '../../modules/settings/services';
import SettingsForm from './components/SettingsForm';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Settings() {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState({
        card_no: '',
        card_name: '',
        card_expiry: '',
        card_cvv: '',
        currency: '',
        stripe_key: '',
        stripe_secret: '',
        configuration: {
            theme: 'light',
            notifications: true
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
                // Determine if response.data is nested or direct
                const data = response.data.data || response.data;
                setFormData({
                    ...data,
                    configuration: data.configuration || { theme: 'light', notifications: true }
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

        // Auto-format Card Number
        if (name.includes('card_no')) {
            // Remove all non-digits and spaces
            const raw = value.replace(/\D/g, '');
            // Add space every 4 digits, limit to 19 chars (16 digits + 3 spaces)
            value = raw.replace(/(\d{4})(?=\d)/g, '$1 ').substring(0, 19);
        }

        // Auto-format Expiry Date (MM / YY)
        if (name.includes('card_expiry')) {
            let clean = value.replace(/\D/g, '');
            if (clean.length > 4) clean = clean.substring(0, 4);
            
            if (clean.length >= 2) {
                value = `${clean.substring(0, 2)} / ${clean.substring(2)}`;
            } else {
                value = clean;
            }
        }

        // Limit CVV to 3 digits
        if (name.includes('card_cvv')) {
            value = value.replace(/\D/g, '').substring(0, 3);
        }

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
        const mode = formData.payment_mode || 'sandbox';
        const suffix = `_${mode}`;

        const requiredFields = [
            `stripe_key${suffix}`,
            `stripe_secret${suffix}`,
            `card_no${suffix}`,
            `card_name${suffix}`,
            `card_expiry${suffix}`,
            `card_cvv${suffix}`
        ];

        const fieldLabels = {
            stripe_key: 'Stripe Public Key',
            stripe_secret: 'Stripe Secret Key',
            card_no: 'Card Number',
            card_name: 'Card Holder Name',
            card_expiry: 'Expiry Date',
            card_cvv: 'CVV'
        };

        // Check required fields
        requiredFields.forEach(field => {
            if (!formData[field]) {
                const baseField = field.replace(suffix, '');
                newErrors[field] = `${fieldLabels[baseField]} is required for ${mode} mode.`;
            }
        });

        // Advanced Validation (only if field exists)
        const cardNo = formData[`card_no${suffix}`];
        if (cardNo) {
            const cleanCardNo = cardNo.replace(/\s/g, '');
            if (!/^\d{16}$/.test(cleanCardNo)) {
                newErrors[`card_no${suffix}`] = 'Card number must be exactly 16 digits.';
            }
        }

        const cardCvv = formData[`card_cvv${suffix}`];
        if (cardCvv) {
             if (!/^\d{3}$/.test(cardCvv)) {
                newErrors[`card_cvv${suffix}`] = 'CVV must be exactly 3 digits.';
            }
        }

        const cardExpiry = formData[`card_expiry${suffix}`];
        if (cardExpiry) {
            // Parse MM / YY
            const parts = cardExpiry.split('/');
            
            if (parts.length !== 2) {
                 newErrors[`card_expiry${suffix}`] = 'Format must be MM / YY.';
            } else {
                const monthStr = parts[0].trim();
                const yearStr = parts[1].trim();

                if (monthStr.length !== 2 || yearStr.length !== 2) {
                    newErrors[`card_expiry${suffix}`] = 'Format must be MM / YY.';
                } else {
                    const month = parseInt(monthStr, 10);
                    const year = parseInt(yearStr, 10);

                    if (isNaN(month) || month < 1 || month > 12) {
                        newErrors[`card_expiry${suffix}`] = 'Invalid month (01-12).';
                    }
                    
                    if (isNaN(year)) {
                         newErrors[`card_expiry${suffix}`] = 'Invalid year.';
                    } else {
                        // Start of next month logic for expiry check
                        const expiry = new Date(2000 + year, month, 0); // Last day of expiry month
                        const now = new Date();
                        // Reset time to ignore hours/minutes
                        now.setHours(0,0,0,0);
                        
                        if (expiry < now) {
                            newErrors[`card_expiry${suffix}`] = 'Card has expired.';
                        }
                    }
                }
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.warn('Please fill in all required fields.');
            return;
        }

        setLoading(true);
        try {
            // Create payload with cleaned card numbers (remove spaces)
            const payload = { ...formData };
            if (payload.card_no_sandbox) {
                payload.card_no_sandbox = payload.card_no_sandbox.replace(/\s/g, '');
            }
            if (payload.card_no_production) {
                payload.card_no_production = payload.card_no_production.replace(/\s/g, '');
            }

            const response = await updateSettings(payload);
            if (response) {
                toast.success('Settings updated successfully.');
                // Refresh data to ensure sync
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
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">System Settings</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Settings</li>
                                    </ol>
                                </nav>
                            </div>
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
                    />
                )}
            </div>
        </div>
    );
}
