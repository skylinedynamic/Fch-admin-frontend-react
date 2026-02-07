import React from 'react';
import ClientInfoSection, { ClientInfoSectionRef } from './ClientInfoSection';
import BusinessFinancialsSection, { BusinessFinancialsSectionRef } from './BusinessFinancialsSection';
import DocumentChecklistSection, { DocumentChecklistSectionRef } from './DocumentChecklistSection';
import ClientDocumentsSection from './ClientDocumentsSection';
import type { Client, ChecklistItem } from '../../../modules/client/types';
// @ts-ignore
import FormLoader from '../../../components/Loader/FormLoader';

interface ClientFormProps {
    clientId?: string | null;
    activeTab: string;
    // Refs
    personalRef?: React.Ref<ClientInfoSectionRef>;
    financialRef?: React.Ref<BusinessFinancialsSectionRef>;
    checklistRef?: React.Ref<DocumentChecklistSectionRef>;

    // Logic / Data Props
    formData?: Client;
    initialData?: Client;
    errors: Record<string, string>;
    setErrors?: (errors: Record<string, string>) => void;
    handleInputChange: (e: any) => void;

    // UI Options
    countries: { label: string; value: string }[];
    states: { label: string; value: string }[];
    cities: { label: string; value: string }[];

    // Checklist removed -> handled internally

    isLoading?: boolean;
    isHost?: boolean;
    settings?: any;
    nonHostPlan?: any;
}

export default function ClientForm({
    clientId,
    activeTab,
    personalRef,
    financialRef,
    checklistRef,
    formData,
    initialData,
    errors,
    setErrors,
    handleInputChange,
    countries,
    states,
    cities,
    isLoading,
    isHost,
    settings,
    nonHostPlan
}: ClientFormProps) {
    return (
        <div className="tab-content">
            {/* Client Information Tab */}
            {activeTab === 'personalDetails' && (
                <div className="tab-pane active show" role="tabpanel">
                    {/* Render Loader only if parent says loading AND we don't have our own handling? 
                        Actually ClientInfoSection handles its own fetching loader. 
                        Parent isLoading might be for "Create" submission or initial mount. 
                    */}
                    {isLoading && !clientId ? (
                        <FormLoader count={12} />
                    ) : (
                        <ClientInfoSection
                            ref={personalRef}
                            clientId={clientId}
                            initialData={initialData || formData} // Fallback to formData for Create
                            errors={errors}
                            setErrors={setErrors}
                            // Pass handleInputChange as handleLocationChange to allow parent to track location updates
                            handleLocationChange={(name, value) => handleInputChange({ target: { name, value } })}

                            countries={countries}
                            states={states}
                            cities={cities}
                            isHost={isHost}
                            settings={settings}
                            nonHostPlan={nonHostPlan}
                        />
                    )}
                </div>
            )}

            {/* Business Financials Tab */}
            {activeTab === 'businessFinancials' && (
                <div className="tab-pane active show" role="tabpanel">
                    {isLoading && !clientId ? (
                        <FormLoader count={12} />
                    ) : (
                        <BusinessFinancialsSection
                            ref={financialRef}
                            clientId={clientId}
                            initialData={initialData || formData}
                            errors={errors}
                            setErrors={setErrors}
                            isLoading={isLoading && !clientId}
                        />
                    )}
                </div>
            )}

            {/* Document Checklist Tab */}
            {activeTab === 'documentChecklist' && (
                <div className="tab-pane active show" role="tabpanel">
                    {isLoading && !clientId ? (
                        <FormLoader count={8} />
                    ) : (
                        clientId ? (
                            <DocumentChecklistSection
                                ref={checklistRef}
                                clientId={clientId}
                            />
                        ) : (
                            <div>Please create the client first to view checklist.</div>
                        )
                    )}
                </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
                <div className="tab-pane active show" role="tabpanel">
                    <ClientDocumentsSection />
                </div>
            )}
        </div>
    );
}