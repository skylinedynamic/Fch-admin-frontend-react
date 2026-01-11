import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useSummernote } from '../../../hooks/useSummernote';

export default function EmailComposeModal({ entityId, entityType }) {
    const choicesRef = useRef(null);
    const [formData, setFormData] = useState({
        to: ['in@mail.com'],
        subject: '',
        message: '',
        attachments: []
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...files]
        }));
    };

    const removeAttachment = (index) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const handleSend = () => {
        if (!formData.subject) {
            toast.error('Subject is required');
            return;
        }
        // TODO: Implement actual send email logic with API
        console.log('Sending email:', { ...formData, entityId, entityType });
        toast.success(`Email sent to ${formData.to.join(', ')}`);

        // Close modal
        if (window.hideGlobalModal) {
            window.hideGlobalModal('emailComposeModal');
        }
    };

    // Use global Summernote hook
    const { editorRef } = useSummernote('message', formData.message, handleInputChange, {
        height: 200,
        placeholder: 'Write your message...'
    });

    // Initialize Choices.js
    useEffect(() => {
        let choicesInstance = null;
        if (window.Choices && choicesRef.current) {
            try {
                choicesInstance = new window.Choices(choicesRef.current, {
                    removeItemButton: true,
                    searchEnabled: true,
                    addItems: true,
                    removeItems: true,
                    editItems: true,
                    duplicateItemsAllowed: false,
                    delimiter: ',',
                    paste: true
                });

                // Listen for changes
                choicesRef.current.addEventListener('change', (event) => {
                    const selectedValues = choicesInstance.getValue(true);
                    setFormData(prev => ({ ...prev, to: selectedValues }));
                });
            } catch (e) {
                console.warn('Choices.js initialization failed:', e);
            }
        }
        return () => {
            if (choicesInstance) {
                choicesInstance.destroy();
            }
        };
    }, []);

    return (
        <div className="modal fade" id="emailComposeModal" tabIndex="-1" aria-labelledby="emailComposeLabel" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content border-0">
                    <div className="modal-header bg-primary">
                        <h5 className="modal-title text-white d-flex align-items-center gap-2" >
                            <i className="ri-mail-send-line fs-18"></i> New Email
                        </h5>
                        <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body p-4">
                        <form>
                            <div className="mb-3">
                                <label className="form-label">To</label>
                                <input
                                    type="text"
                                    id="emailTo"
                                    ref={choicesRef}
                                    className="form-control"
                                    name="to"
                                    defaultValue="in@mail.com"
                                    placeholder="Enter emails..."
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Subject <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="subject"
                                    placeholder="Subject"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Message</label>
                                <textarea
                                    id="emailMessageEditor"
                                    ref={editorRef}
                                    className="d-none"
                                    name="message"
                                ></textarea>
                            </div>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Select Attachments</label>
                                    <div className="d-flex align-items-center gap-2">
                                        <button
                                            type="button"
                                            id="emailAttachmentBtn"
                                            className="btn btn-light btn-sm"
                                            onClick={() => document.getElementById('emailAttachmentInput').click()}
                                        >
                                            + Add Attachment
                                        </button>
                                        <input
                                            type="file"
                                            id="emailAttachmentInput"
                                            className="d-none"
                                            multiple
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                    <div id="emailAttachmentList" className="mt-2">
                                        {formData.attachments.map((file, index) => (
                                            <div key={index} className="d-flex align-items-center justify-content-between border rounded p-2 mb-2">
                                                <span className="text-muted small">
                                                    <i className="ri-attachment-2 me-1"></i>
                                                    {file.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-ghost-danger"
                                                    onClick={() => removeAttachment(index)}
                                                >
                                                    <i className="ri-close-line"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-soft-secondary" data-bs-dismiss="modal">
                            <i className="ri-close-line align-middle me-1"></i> Discard
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleSend}>
                            <i className="ri-send-plane-line align-middle me-1"></i> Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
