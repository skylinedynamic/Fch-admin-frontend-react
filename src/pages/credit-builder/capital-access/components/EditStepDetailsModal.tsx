import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { Dropdown } from 'primereact/dropdown';

export interface EditDetailsForm {
    why_this_card: string;
    est_limit_min: string;
    est_limit_max: string;
    hard_pull: string;
    what_you_need: string[];
}

interface EditStepDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editDetailsForm: EditDetailsForm;
    setEditDetailsForm: React.Dispatch<React.SetStateAction<EditDetailsForm>>;
    modalValidationErrors: Record<string, string>;
}

export default function EditStepDetailsModal({
    isOpen,
    onClose,
    onSave,
    editDetailsForm,
    setEditDetailsForm,
    modalValidationErrors
}: EditStepDetailsModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            toggle={onClose}
            modalClassName="flip"
            centered
            size="lg"
        >
            <ModalHeader toggle={onClose}>
                Edit Step Details
            </ModalHeader>
            <ModalBody>
                <div className="row g-3">
                    <div className="col-12">
                        <label className="form-label">Why This Card? <span className="text-danger">*</span></label>
                        <textarea
                            className={`form-control ${modalValidationErrors.why_this_card ? 'is-invalid' : ''}`}
                            rows={3}
                            placeholder="Great first step with high approval odds and strong limits."
                            value={editDetailsForm.why_this_card}
                            onChange={(e) => setEditDetailsForm(prev => ({ ...prev, why_this_card: e.target.value }))}
                        />
                        {modalValidationErrors.why_this_card && <div className="invalid-feedback">{modalValidationErrors.why_this_card}</div>}
                    </div>

                    <div className="col-md-6">
                        <label className="form-label">Est. Limit Range <span className="text-danger">*</span></label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input
                                type="number"
                                className={`form-control ${modalValidationErrors.est_limit_min ? 'is-invalid' : ''}`}
                                placeholder="Min (e.g. 5000)"
                                value={editDetailsForm.est_limit_min}
                                onChange={(e) => setEditDetailsForm(prev => ({ ...prev, est_limit_min: e.target.value }))}
                            />
                            <span className="input-group-text">to</span>
                            <input
                                type="number"
                                className={`form-control ${modalValidationErrors.est_limit_max ? 'is-invalid' : ''}`}
                                placeholder="Max (e.g. 25000)"
                                value={editDetailsForm.est_limit_max}
                                onChange={(e) => setEditDetailsForm(prev => ({ ...prev, est_limit_max: e.target.value }))}
                            />
                        </div>
                        {(modalValidationErrors.est_limit_min || modalValidationErrors.est_limit_max) && <div className="text-danger small mt-1">{modalValidationErrors.est_limit_min || modalValidationErrors.est_limit_max}</div>}
                    </div>

                    <div className="col-md-6">
                        <label className="form-label">Hard Pull</label>
                        <Dropdown
                            value={editDetailsForm.hard_pull}
                            options={[{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }]}
                            onChange={(e: any) => setEditDetailsForm(prev => ({ ...prev, hard_pull: e.value }))}
                            className="w-100"
                            appendTo="self"
                        />
                    </div>

                    <div className="col-12 mt-4">
                        <label className="form-label fw-medium mb-2">What You Need (Requirements) <span className="text-danger">*</span></label>
                        <div className="d-flex flex-column gap-2 mb-2">
                            {editDetailsForm.what_you_need.map((req, idx) => (
                                <div key={idx} className="d-flex align-items-center gap-2">
                                    <input
                                        type="text"
                                        className={`form-control form-control-sm ${modalValidationErrors.what_you_need && editDetailsForm.what_you_need.length === 1 && !req ? 'is-invalid' : ''}`}
                                        value={req}
                                        placeholder="e.g. Good personal credit"
                                        onChange={(e) => {
                                            const newReqs = [...editDetailsForm.what_you_need];
                                            newReqs[idx] = e.target.value;
                                            setEditDetailsForm(prev => ({ ...prev, what_you_need: newReqs }));
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-icon"
                                        onClick={() => {
                                            const newReqs = [...editDetailsForm.what_you_need];
                                            newReqs.splice(idx, 1);
                                            setEditDetailsForm(prev => ({ ...prev, what_you_need: newReqs }));
                                        }}
                                    >
                                        <i className="ri-delete-bin-line"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="btn btn-sm btn-soft-primary"
                            onClick={() => setEditDetailsForm(prev => ({ ...prev, what_you_need: [...prev.what_you_need, ''] }))}
                        >
                            <i className="ri-add-line align-bottom me-1"></i> Add Requirement
                        </button>
                        {modalValidationErrors.what_you_need && <div className="text-danger small mt-1">{modalValidationErrors.what_you_need}</div>}
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={onSave}>Save Details</button>
            </ModalFooter>
        </Modal>
    );
}
