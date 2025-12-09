import React from 'react';
import ClientInfoSection from './ClientInfoSection';
import BusinessFinancialsSection from './BusinessFinancialsSection';
import DocumentChecklistSection from './DocumentChecklistSection';
import ClientDocumentsSection from './ClientDocumentsSection';
import type { Client } from '../../../modules/client/types';

interface ClientFormProps {
    activeTab: string;
    formData: Client;
    errors: Record<string, string>;
    handleInputChange: (e: any) => void;
    countries: { label: string; value: string }[];
    states: { label: string; value: string }[];
    cities: { label: string; value: string }[];
}

export default function ClientForm({
    activeTab,
    formData,
    errors,
    handleInputChange,
    countries,
    states,
    cities
}: ClientFormProps) {
    return (
        <div className="tab-content">
            {/* Client Information Tab */}
            {activeTab === 'personalDetails' && (
                <div className="tab-pane active show" role="tabpanel">
                    <ClientInfoSection
                        formData={formData}
                        errors={errors}
                        handleInputChange={handleInputChange}
                        countries={countries}
                        states={states}
                        cities={cities}
                    />
                </div>
            )}

            {/* Business Financials Tab */}
            {activeTab === 'businessFinancials' && (
                <div className="tab-pane active show" role="tabpanel">
                    <BusinessFinancialsSection
                        formData={formData}
                        handleInputChange={handleInputChange}
                    />
                </div>
            )}

            {/* Document Checklist Tab */}
            {activeTab === 'documentChecklist' && (
                <div className="tab-pane active show" role="tabpanel">
                    <DocumentChecklistSection />
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
