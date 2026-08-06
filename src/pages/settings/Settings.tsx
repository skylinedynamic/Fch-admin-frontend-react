import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import SettingsForm from './components/SettingsForm';
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
            case 'credit_profile': return 'Credit Profile';
            case 'score_calculation': return 'Score Calculation';
            case 'test_mail': return 'Test Mail';
            default: return 'Settings';
        }
    }

    return (
        <div className="page-content settings-page-wrapper">
            <div className="container-fluid">
                {/* Header */}
                <PageHeader 
                    title="Settings" 
                    breadcrumbs={[
                        { label: 'Settings', onClick: () => setActiveSection('payment') },
                        { label: getBreadcrumbTitle() }
                    ]} 
                />

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
