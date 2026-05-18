import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSettings, updateSettings } from '../../modules/settings/services';
import SettingsForm from './components/SettingsForm';
import { toast } from 'react-toastify';
import "../../../assets/css/settings-redesign.css";

// interface FormData and Errors removed as they are now handled by sub-components

const Settings: React.FC = () => {
    const [fetching, setFetching] = useState<boolean>(false); // No longer fetching top-level, sub-components fetch their own config
    const [activeSection, setActiveSection] = useState<string>('payment');

    const getBreadcrumbTitle = () => {
        switch (activeSection) {
            case 'payment': return 'Payment Method';
            case 'agreement': return 'Agreement Builder';
            case 'general_settings': return 'Email Configuration';
            case 'branding': return 'Site Branding';
            case 'domain_configuration': return 'Custom Domain';
            case 'microbilt': return 'MicroBilt Config';
            case 'test_mail': return 'Test Mail';
            default: return 'Settings';
        }
    }

    return (
        <div className="page-content settings-page-wrapper">
            <div className="container-fluid">
                {/* Header */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-18 mb-1">Settings</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0 fs-12">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item">
                                            <span
                                                className="text-muted"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setActiveSection('payment')}
                                            >
                                                Settings
                                            </span>
                                        </li>
                                        <li className="breadcrumb-item active" aria-current="page">
                                            {getBreadcrumbTitle()}
                                        </li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <SettingsForm
                            fetching={fetching}
                            activeSection={activeSection}
                            setActiveSection={setActiveSection}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Settings;
