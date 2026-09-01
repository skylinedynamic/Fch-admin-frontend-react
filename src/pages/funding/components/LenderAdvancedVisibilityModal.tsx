import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { MultiSelect } from 'primereact/multiselect';
import { INDUSTRIES_OPTIONS } from '../../../config/funding';

interface LenderAdvancedVisibilityModalProps {
    visible: boolean;
    onHide: () => void;
    visibility: any;
    index: number | null;
    errors: any;
    stateOptions: any[];
    industryTypes: any[];
    allowedDocumentOptions: any[];
    onChange: (index: number, field: string, value: any) => void;
}

export const LenderAdvancedVisibilityModal: React.FC<LenderAdvancedVisibilityModalProps> = ({
    visible,
    onHide,
    visibility,
    index,
    errors,
    stateOptions,
    industryTypes,
    allowedDocumentOptions,
    onChange
}) => {
    if (index === null || !visibility) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            onChange(index, name, (e.target as HTMLInputElement).checked);
        } else {
            onChange(index, name, value);
        }
    };

    return (
        <Modal isOpen={visible} toggle={onHide} size="lg" centered>
            <ModalHeader toggle={onHide} className="bg-light border-bottom">
                <span className="fs-16 fw-bold text-dark mb-0">
                    Advanced Logic: Lender #{index + 1}
                </span>
            </ModalHeader>
            <ModalBody className="p-4 bg-light bg-opacity-50">
                <div className="row g-4">
                    {/* Geography Restrictions */}
                    <div className="col-lg-6">
                        <h6 className="fw-bold fs-14 mb-4 text-uppercase" style={{ letterSpacing: '0.05em', color: '#0f172a' }}>GEOGRAPHY</h6>
                        
                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-1">Allowed States</label>
                            <MultiSelect
                                value={visibility.allowed_states || []}
                                options={stateOptions}
                                onChange={(e) => onChange(index, 'allowed_states', e.value)}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Select states (leave empty for all)"
                                className="w-100 rounded-3 slim-multiselect"
                                display="chip"
                                maxSelectedLabels={100}
                                filter
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-1">Restricted States</label>
                            <MultiSelect
                                value={visibility.restricted_states || []}
                                options={stateOptions}
                                onChange={(e) => onChange(index, 'restricted_states', e.value)}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Hard stop - blocked states"
                                className="w-100 rounded-3 slim-multiselect"
                                display="chip"
                                maxSelectedLabels={100}
                                filter
                            />
                        </div>
                    </div>

                    {/* Industry Restrictions */}
                    <div className="col-lg-6">
                        <h6 className="fw-bold fs-14 mb-4 text-uppercase" style={{ letterSpacing: '0.05em', color: '#0f172a' }}>INDUSTRY</h6>
                        
                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-1">Allowed Industries</label>
                            <MultiSelect
                                value={visibility.allowed_industries || []}
                                options={industryTypes}
                                onChange={(e) => onChange(index, 'allowed_industries', e.value)}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Select industries (leave empty for all)"
                                className="w-100 rounded-3 slim-multiselect"
                                display="chip"
                                maxSelectedLabels={100}
                                filter
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-1">Restricted Industries</label>
                            <MultiSelect
                                value={visibility.restricted_industries || []}
                                options={INDUSTRIES_OPTIONS}
                                onChange={(e) => onChange(index, 'restricted_industries', e.value)}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Hard stop - blocked (e.g. Real Estate)"
                                className="w-100 rounded-3 slim-multiselect"
                                display="chip"
                                maxSelectedLabels={100}
                                filter
                            />
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter className="bg-light border-top">
                <button type="button" className="btn btn-primary" onClick={onHide}>Done</button>
            </ModalFooter>
        </Modal>
    );
};

export default LenderAdvancedVisibilityModal;
