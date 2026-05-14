import React, { useEffect } from 'react';
import FormLoader from '../../../components/Loader/FormLoader';
import AgreementBuilder from './AgreementBuilder';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { useAuthStore } from '../../../store/auth/authStore';
import TestMailForm from './TestMailForm';
import MicroBiltConfigForm from './MicroBiltConfigForm';
import StripeConfigForm from './StripeConfigForm';

interface SettingsFormProps {
    fetching: boolean;
    activeSection: string;
    setActiveSection: (section: string) => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({
    fetching,
    activeSection,
    setActiveSection
}) => {

    const { hasPermission } = usePermissions();
    const user = useAuthStore((state) => state.user);

    const sections: Array<{ id: string; label: string; icon: string }> = [];
    if (hasPermission('update payment settings')) {
        sections.push({ id: 'payment', label: 'Payment Integration', icon: 'ri-bank-card-2-line' });
    }

    // We only show Agreement Builder if they have partner OR borrower permissions
    const canSeePartnerAgreement = hasPermission('update partner agreement settings');
    const canSeeBorrowerAgreement = hasPermission('update borrower agreement settings');
    if (canSeePartnerAgreement || canSeeBorrowerAgreement) {
        sections.push({ id: 'agreement', label: 'Agreement Builder', icon: 'ri-file-text-line' });
    }

    if (user && (user.is_host == 1 || user.is_host == true)) {
        sections.push({ id: 'microbilt', label: 'MicroBilt Config', icon: 'ri-settings-4-line' });
        sections.push({ id: 'test_mail', label: 'Test Mail', icon: 'ri-mail-send-line' });

    }

    // Auto-select first available section if the active one isn't available
    useEffect(() => {
        if (!fetching && sections.length > 0) {
            const currentSectionAvailable = sections.find(s => s.id === activeSection);
            if (!currentSectionAvailable) {
                setActiveSection(sections[0].id);
            }
        }
    }, [fetching, activeSection, sections.length]);

    if (fetching) return (
        <div className="row g-4 animate__animated animate__fadeIn">
            <div className="col-lg-3">
                <div className="card">
                    <div className="card-header placeholder-glow">
                        <span className="placeholder col-7"></span>
                    </div>
                    <div className="list-group list-group-flush p-2">
                        {[1, 2].map(i => (
                            <div key={i} className="list-group-item border-0 py-2 mb-1">
                                <div className="d-flex align-items-center gap-2 placeholder-glow">
                                    <span className="placeholder rounded" style={{ width: 28, height: 28 }}></span>
                                    <span className="placeholder col-8"></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="col-lg-9">
                <div className="card">
                    <div className="card-header placeholder-glow">
                        <span className="placeholder col-4"></span>
                    </div>
                    <div className="card-body p-4">
                        <FormLoader count={4} colClass="col-12" />
                    </div>
                </div>
            </div>
        </div>
    );

    // Removed renderPaymentSettings as it is now in StripeConfigForm

    return (
        <div className="row g-4 align-items-start">
            {/* Sidebar */}
            <div className="col-lg-3">
                <div className="card">
                    <div className="card-header">
                        <h5 className="card-title mb-0 fs-14">
                            <i className="ri-list-settings-line me-2 align-middle text-muted"></i>
                            Settings Menu
                        </h5>
                    </div>
                    <div className="list-group list-group-flush p-2">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                type="button"
                                className={`list-group-item list-group-item-action d-flex align-items-center gap-2 rounded-2 border-0 py-2 px-3 mb-1 fs-14 ${activeSection === section.id ? 'active' : 'text-body'}`}
                                onClick={() => setActiveSection(section.id)}
                            >
                                <i className={`${section.icon} fs-15 ${activeSection === section.id ? '' : 'text-muted'}`}></i>
                                <span className="fw-medium">{section.label}</span>
                                {activeSection === section.id
                                    ? <i className="ri-checkbox-circle-fill ms-auto opacity-75 fs-14"></i>
                                    : <i className="ri-arrow-right-s-line ms-auto text-muted fs-14"></i>
                                }
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="col-lg-9">
                {activeSection === 'agreement' ? (
                    <div className="card p-0 overflow-hidden">
                        <AgreementBuilder />
                    </div>
                ) : activeSection === 'test_mail' ? (
                    <TestMailForm />
                ) : activeSection === 'microbilt' ? (
                    <MicroBiltConfigForm />
                ) : (
                    <StripeConfigForm />
                )}
            </div>
        </div>
    );
}

export default SettingsForm;
