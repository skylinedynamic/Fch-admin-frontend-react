import React from 'react';
import ClientInfoSection from './ClientInfoSection';
import BusinessFinancialsSection from './BusinessFinancialsSection';
import DocumentChecklistSection from './DocumentChecklistSection';
import ClientDocumentsSection from './ClientDocumentsSection';
import type { Client, ChecklistItem } from '../../../modules/client/types';
// @ts-ignore
import FormLoader from '../../../components/Loader/FormLoader';

interface ClientFormProps {
    activeTab: string;
    formData: Client;
    errors: Record<string, string>;
    handleInputChange: (e: any) => void;
    countries: { label: string; value: string }[];
    states: { label: string; value: string }[];
    cities: { label: string; value: string }[];
    checklist?: ChecklistItem[];
    handleChecklistChange?: (itemId: number) => void;
    isLoading?: boolean;
    isHost?: boolean;
    settings?: any;
}

export default function ClientForm({
    activeTab,
    formData,
    errors,
    handleInputChange,
    countries,
    states,
    cities,
    checklist,
    handleChecklistChange,
    isLoading,
    isHost,
    settings
}: ClientFormProps) {
    return (
        <div className="tab-content">
            {/* Client Information Tab */}
            {activeTab === 'personalDetails' && (
                <div className="tab-pane active show" role="tabpanel">
                    {isLoading ? (
                        <FormLoader count={12} />
                    ) : (
                        <ClientInfoSection
                            formData={formData}
                            errors={errors}
                            handleInputChange={handleInputChange}
                            countries={countries}
                            states={states}
                            cities={cities}
                            isLoading={isLoading}
                            isHost={isHost}
                            settings={settings}
                        />
                    )}
                </div>
            )}

            {/* Business Financials Tab */}
            {activeTab === 'businessFinancials' && (
                <div className="tab-pane active show" role="tabpanel">
                    {isLoading ? (
                        <FormLoader count={12} />
                    ) : (
                        <BusinessFinancialsSection
                            formData={formData}
                            errors={errors}
                            handleInputChange={handleInputChange}
                            isLoading={isLoading}
                        />
                    )}
                </div>
            )}

            {/* Document Checklist Tab */}
            {activeTab === 'documentChecklist' && (
                <div className="tab-pane active show" role="tabpanel">
                    {isLoading ? (
                        <FormLoader count={8} />
                    ) : (
                        <DocumentChecklistSection
                            checklist={checklist || []}
                            handleChecklistChange={handleChecklistChange || (() => { })}
                            isLoading={isLoading}
                        />
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
