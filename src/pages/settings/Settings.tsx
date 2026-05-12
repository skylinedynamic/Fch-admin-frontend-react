import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSettings, updateSettings } from '../../modules/settings/services';
import SettingsForm from './components/SettingsForm';
import { toast } from 'react-toastify';
import "../../../public/assets/css/settings-redesign.css";

// interface FormData and Errors removed as they are now handled by sub-components

const Settings: React.FC = () => {
    const [fetching, setFetching] = useState<boolean>(false); // No longer fetching top-level, sub-components fetch their own config
    const [activeSection, setActiveSection] = useState<string>('payment');

    const getBreadcrumbTitle = () => {
        switch (activeSection) {
            case 'payment': return 'Payment Method';
            case 'agreement': return 'Agreement Management';
            case 'test_mail': return 'Test Mail';
            case 'microbilt': return 'MicroBilt Config';
            default: return 'Settings';
        }
    }

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Settings</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
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
