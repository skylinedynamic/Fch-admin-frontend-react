import React from 'react';
import PartnerInformationSection from './PartnerInformationSection';
import StatusAgentSection from './StatusAgentSection';
import DocumentsSection from './DocumentsSection';
import ClientListSection from './ClientListSection';
import SubscriptionSection from './SubscriptionSection';
import FormLoader from '../../../components/Loader/FormLoader';

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
    users,
    partnerId,
    loading
    , onSelectedFilesChange
    , documentsReloadKey
    , documentsClearKey
}) {
    return (
        <div className="tab-content">
            {/* Partner Information Tab */}
            {activeTab === 'personalDetails' && (
                <div className="tab-pane active show">
                    {loading ? (
                        <FormLoader count={12} />
                    ) : (
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
                                    partnerId={partnerId}
                                />
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Status & Agent Tab */}
            {activeTab === 'statusAgent' && (
                <div className="tab-pane active show">
                    {loading ? (
                        <FormLoader count={4} />
                    ) : (
                        <form>
                            <div className="row g-3">
                                <StatusAgentSection
                                    formData={formData}
                                    handleInputChange={handleInputChange}
                                    handleAgentChange={handleAgentChange}
                                    users={users}
                                    errors={errors}
                                />
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
                <div className="tab-pane active show">
                    <DocumentsSection partnerId={partnerId} onSelectedFilesChange={onSelectedFilesChange} reloadKey={documentsReloadKey} clearKey={documentsClearKey} />
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
                    {loading ? (
                        <FormLoader count={8} />
                    ) : (
                        <form>
                            <div className="row g-3">
                                <SubscriptionSection
                                    formData={formData}
                                    handleInputChange={handleInputChange}
                                    errors={errors}
                                />
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
