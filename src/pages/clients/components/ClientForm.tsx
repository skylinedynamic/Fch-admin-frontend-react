import React from 'react';
import ClientInfoSection, { ClientInfoSectionRef } from './ClientInfoSection';
import BusinessFinancialsSection, { BusinessFinancialsSectionRef } from './BusinessFinancialsSection';
import DocumentChecklistSection, { DocumentChecklistSectionRef } from './DocumentChecklistSection';
import ClientDocumentsSection from './ClientDocumentsSection';
import TaskListSection from './TaskListSection';
import CreditProfileSection from './CreditProfileSection';
import CapitalAccessSection from './CapitalAccessSection';
// @ts-ignore
import AgreementSection from '../../partners/components/AgreementSection';
import { ENROLLMENT_TABS } from '../../../modules/client';
import type { Client } from '../../../modules/client/types';
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
    onRefresh?: () => void;
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
    nonHostPlan,
    onRefresh
}: ClientFormProps) {
    return (
        <div className="tab-content">
            {/* Client Information Tab */}
            {activeTab === ENROLLMENT_TABS.PERSONAL && (
                <div className="tab-pane active show" role="tabpanel">
                    {/* Render Loader only if parent says loading AND we don't have our own handling? 
                        Actually ClientInfoSection handles its own fetching loader. 
                        Parent isLoading might be for "Create" submission or initial mount. 
                    */}
                    {isLoading ? (
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
                            isLoading={isLoading}
                        />
                    )}
                </div>
            )}

            {/* Business Financials Tab */}
            {activeTab === ENROLLMENT_TABS.FINANCIALS && (
                <div className="tab-pane active show" role="tabpanel">
                    {isLoading ? (
                        <FormLoader count={12} />
                    ) : (
                        <BusinessFinancialsSection
                            ref={financialRef}
                            clientId={clientId}
                            initialData={initialData || formData}
                            errors={errors}
                            setErrors={setErrors}
                            isLoading={isLoading}
                        />
                    )}
                </div>
            )}

            {/* Document Checklist Tab */}
            {activeTab === ENROLLMENT_TABS.CHECKLIST && (
                <div className="tab-pane active show" role="tabpanel">
                    {isLoading ? (
                        <FormLoader count={8} />
                    ) : (
                        clientId ? (
                            <DocumentChecklistSection
                                ref={checklistRef}
                                clientId={clientId}
                                isLoading={isLoading}
                            />
                        ) : (
                            <div>Please create the client first to view checklist.</div>
                        )
                    )}
                </div>
            )}

            {/* Documents Tab */}
            {activeTab === ENROLLMENT_TABS.DOCUMENTS && (
                <div className="tab-pane active show" role="tabpanel">
                    <ClientDocumentsSection isLoading={isLoading} />
                </div>
            )}

            {/* Credit Profile Tab */}
            {activeTab === ENROLLMENT_TABS.CREDIT_PROFILE && (
                <div className="tab-pane active show" role="tabpanel">
                    {clientId ? (
                        <CreditProfileSection
                            clientId={clientId}
                            initialCreditProfile={formData?.credit_profile}
                            onRefresh={onRefresh}
                        />
                    ) : (
                        <div>Please create the client first to view Credit Profile.</div>
                    )}
                </div>
            )}

            {/* Task List Tab */}
            {isHost && activeTab === ENROLLMENT_TABS.TASK_LIST && (
                <div className="tab-pane active show" role="tabpanel">
                    <TaskListSection clientId={clientId} />
                </div>
            )}

            {/* Agreement Tab */}
            {activeTab === ENROLLMENT_TABS.AGREEMENT && (
                <div className="tab-pane active show" role="tabpanel">
                    <AgreementSection clientId={clientId} formData={formData} onRefresh={onRefresh} />
                </div>
            )}

            {/* Capital Access Tab */}
            {activeTab === ENROLLMENT_TABS.CAPITAL_ACCESS && (
                <div className="tab-pane active show" role="tabpanel">
                    {clientId ? (
                        <CapitalAccessSection clientId={clientId} />
                    ) : (
                        <div>Please create the client first to view Capital Access.</div>
                    )}
                </div>
            )}
        </div>
    );
}
