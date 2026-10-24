import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SettingsForm from './components/SettingsForm';
import { SETTINGS_BASE_PATH, sectionFromSlug, settingsPath, settingsSectionTitle } from '../../config/settingsSections';
import "../../../assets/css/settings-redesign.css";

/**
 * Settings. Each menu section is a route of its own (/settings/branding,
 * /settings/email-configuration, ...): the path picks the section, and choosing
 * one from the menu changes the path. /settings itself, or a path it does not
 * know, opens the first section the user may see.
 */
const Settings: React.FC = () => {
    const [fetching] = useState<boolean>(false); // Sub-components fetch their own config
    const { section } = useParams();
    const navigate = useNavigate();
    const activeSection = sectionFromSlug(section) ?? '';

    // Picking the first section for a path with none replaces that history
    // entry, so the back button does not land on it again.
    const setActiveSection = (id: string) =>
        navigate(settingsPath(id), { replace: activeSection === '' });

    return (
        <div className="page-content settings-page-wrapper">
            <div className="container-fluid">
                {/* Header — Breadcrumb row */}
                <div className="row page-subheader-sticky bg-body settings-breadcrumb-row">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-18 mb-1 settings-page-title">Settings</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0 fs-12 settings-breadcrumb">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item">
                                            <Link to={SETTINGS_BASE_PATH} className="text-muted">Settings</Link>
                                        </li>
                                        <li className="breadcrumb-item active" aria-current="page">
                                            {settingsSectionTitle(activeSection)}
                                        </li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body section */}
                <div className="row settings-body-section">
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
