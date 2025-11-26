import React from 'react';
import PartnerInformationSection from './PartnerInformationSection';
import StatusAgentSection from './StatusAgentSection';
import DocumentsSection from './DocumentsSection';
import ClientListSection from './ClientListSection';
import SubscriptionSection from './SubscriptionSection';

export default function PartnerForm({
    activeTab,
    formData,
    errors,
    profileImage,
    handleInputChange,
    handleAgentChange,
    countries,
    states,
    cities,
    users
}) {
    return (
        <div className="tab-content">
            {/* Partner Information Tab */}
            {activeTab === 'personalDetails' && (
                <div className="tab-pane active show">
                    <form>
                        <div className="row">
                            <PartnerInformationSection
                                formData={formData}
                                errors={errors}
                                profileImage={profileImage}
                                handleInputChange={handleInputChange}
                                countries={countries}
                                states={states}
                                cities={cities}
                            />
                        </div>
                    </form>
                </div>
            )}

            {/* Status & Agent Tab */}
            {activeTab === 'statusAgent' && (
                <div className="tab-pane active show">
                    <form>
                        <div className="row g-3">
                            <StatusAgentSection
                                formData={formData}
                                handleInputChange={handleInputChange}
                                handleAgentChange={handleAgentChange}
                                users={users}
                            />
                        </div>
                    </form>
                </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
                <div className="tab-pane active show">
                    <DocumentsSection />
                </div>
            )}

            {/* Client List Tab */}
            {activeTab === 'clientList' && (
                <div className="tab-pane active show">
                    <ClientListSection />
                </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
                <div className="tab-pane active show">
                    <form>
                        <div className="row g-3">
                            <SubscriptionSection
                                formData={formData}
                                handleInputChange={handleInputChange}
                            />
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
