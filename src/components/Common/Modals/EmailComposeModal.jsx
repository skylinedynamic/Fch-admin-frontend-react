import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useSummernote } from '../../../hooks/useSummernote';
import { createEmailLog } from '../../../modules/activity-log/services';

export default function EmailComposeModal({ entityId, entityType, lead }) {
    const choicesRef = useRef(null);
    const choicesInstanceRef = useRef(null);
    const textareaRef = useRef(null); // Local ref to capture the DOM node
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        to_emails: '',
        subject: '',
        message_body: '',
        attachments: []
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
    };

    const removeAttachment = (index) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const handleSend = async () => {
        setIsSaving(true);
        setErrors({});

        // GET EMAILS DIRECTLY AND SYNCHRONOUSLY
        let finalEmails = "";
        if (choicesInstanceRef.current) {
            // 1. Get all confirmed tags
            const items = choicesInstanceRef.current.getValue();
            const emailArray = Array.isArray(items) ? items.map(i => i.value) : (items ? [items.value] : []);

            // 2. Capture any text still sitting in the input box (user clicked send before hitting enter)
            try {
                const inputEl = choicesInstanceRef.current.input.element;
                if (inputEl && inputEl.value && inputEl.value.includes('@')) {
                    const typedValue = inputEl.value.trim();
                    if (!emailArray.includes(typedValue)) {
                        emailArray.push(typedValue);
                        // Visually add it too
                        choicesInstanceRef.current.setValue([typedValue]);
                    }
                    inputEl.value = '';
                }
            } catch (e) { }

            // 3. Join into a final comma-separated string
            finalEmails = emailArray.join(', ');
        }

        console.log('Final to_emails string:', finalEmails);

        try {
            const hasAttachments = formData.attachments.length > 0;
            let payload;

            // Map Lead or Borrower to borrower_id
            const borrowerId = (entityType === 'Borrower' || entityType === 'Lead') ? entityId : null;
            const partnerId = (entityType === 'Partner') ? entityId : null;

            if (hasAttachments) {
                payload = new FormData();
                payload.append('to_emails', finalEmails || '');
                payload.append('subject', formData.subject || '');
                payload.append('description', formData.message_body || '');
                payload.append('borrower_id', borrowerId || '');
                payload.append('partner_id', partnerId || '');
                formData.attachments.forEach(file => payload.append('attachments[]', file));
            } else {
                payload = {
                    to_emails: finalEmails || '',
                    subject: formData.subject || '',
                    description: formData.message_body || '',
                    borrower_id: borrowerId,
                    partner_id: partnerId,
                    attachments: []
                };
            }

            console.log('Final Payload:', payload);

            await createEmailLog(payload);
            toast.success(`Email sent successfully`);

            // Refresh activity list
            window.dispatchEvent(new CustomEvent('refreshActivities'));

            // Reset UI and State
            setFormData({ to_emails: '', subject: '', message_body: '', attachments: [] });
            if (choicesInstanceRef.current) {
                choicesInstanceRef.current.removeActiveItems();
            }

            // Close Modal
            if (window.jQuery && window.jQuery('#emailComposeModal').modal) {
                window.jQuery('#emailComposeModal').modal('hide');
            } else if (window.hideGlobalModal) {
                window.hideGlobalModal('emailComposeModal');
            }
        } catch (err) {
            console.error('Failed to send email:', err);
            if (err.response?.status === 422) {
                const backendErrors = err.response.data.errors || {};
                const normalizedErrors = {};
                Object.keys(backendErrors).forEach(key => {
                    const error = backendErrors[key];
                    normalizedErrors[key] = Array.isArray(error) ? error : [error];
                });
                setErrors(normalizedErrors);
            } else {
                toast.error(err.response?.data?.message || 'Failed to send email');
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Use global Summernote hook
    const { editorRef: summernoteRef } = useSummernote('message_body', formData.message_body, (e) => {
        setFormData(prev => ({ ...prev, message_body: e.target.value }));
    }, {
        height: 200,
        placeholder: 'Write your message...'
    });

    // Combine hook ref with local ref
    const setEditorRef = useCallback((node) => {
        textareaRef.current = node;
        summernoteRef(node);
    }, [summernoteRef]);

    // Apply red border to Summernote .note-editor (it renders as a sibling of the textarea)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (textareaRef.current) {
                // Summernote inserts .note-editor as the next sibling or it can be found within the parent
                const noteEditor = textareaRef.current.nextElementSibling ||
                    textareaRef.current.parentElement?.querySelector('.note-editor');

                if (noteEditor && noteEditor.classList.contains('note-editor')) {
                    if (errors.description) {
                        noteEditor.style.setProperty('border-color', '#dc3545', 'important');
                        noteEditor.style.setProperty('box-shadow', '0 0 0 0.1rem rgba(220,53,69,.25)', 'important');
                    } else {
                        noteEditor.style.borderColor = '';
                        noteEditor.style.boxShadow = '';
                    }
                }
            }
        }, 200); // 200ms delay to ensure Summernote has rendered
        return () => clearTimeout(timer);
    }, [errors.description]);

    // Initialize Choices.js
    useEffect(() => {
        if (window.Choices && choicesRef.current && !choicesInstanceRef.current) {
            const instance = new window.Choices(choicesRef.current, {
                removeItemButton: true,
                searchEnabled: true,
                addItems: true,
                removeItems: true,
                editItems: true,
                duplicateItemsAllowed: false,
                delimiter: ',',
                paste: true,
                placeholderValue: 'Enter emails...',
                addItemText: (value) => `Press Enter to add <b>"${value}"</b>`,
            });

            choicesInstanceRef.current = instance;

            // Handle prefilled lead email
            if (lead?.email) {
                instance.setValue([lead.email]);
                setFormData(prev => ({ ...prev, to_emails: lead.email }));
            }

            // Sync changes to React state
            choicesRef.current.addEventListener('change', () => {
                const selected = instance.getValue(true);
                const emailStr = Array.isArray(selected) ? selected.join(', ') : (selected || '');
                setFormData(prev => ({
                    ...prev,
                    to_emails: emailStr
                }));
            });

            // IMPORTANT: Force input value into an item on blur so if they type but don't hit enter, it's captured
            const inputElement = choicesRef.current.closest('.choices').querySelector('input.choices__input');
            if (inputElement) {
                inputElement.addEventListener('blur', () => {
                    const typedValue = inputElement.value;
                    if (typedValue && typedValue.includes('@')) {
                        const trimmed = typedValue.trim();
                        const current = instance.getValue(true);
                        const currentArray = Array.isArray(current) ? [...current] : (current ? [current] : []);

                        if (!currentArray.includes(trimmed)) {
                            instance.setValue([...currentArray, trimmed]);
                        }
                        inputElement.value = '';
                    }
                });
            }
        }

        return () => {
            if (choicesInstanceRef.current) {
                choicesInstanceRef.current.destroy();
                choicesInstanceRef.current = null;
            }
        };
    }, []);

    // Also sync if lead object changes after mount
    useEffect(() => {
        if (lead?.email && choicesInstanceRef.current) {
            const current = choicesInstanceRef.current.getValue(true);
            const currentArray = Array.isArray(current) ? current : (current ? [current] : []);
            if (!currentArray.includes(lead.email)) {
                choicesInstanceRef.current.setValue([...currentArray, lead.email]);
                // Trigger state sync from instance directly
                const all = choicesInstanceRef.current.getValue(true);
                setFormData(prev => ({ ...prev, to_emails: Array.isArray(all) ? all.join(', ') : (all || '') }));
            }
        }
    }, [lead?.email]);

    // Reset validation and form on modal close
    useEffect(() => {
        const modalEl = document.getElementById('emailComposeModal');
        const handleHidden = () => {
            setErrors({});
            setFormData({
                to_emails: '',
                subject: '',
                message_body: '',
                attachments: []
            });
            if (choicesInstanceRef.current) {
                choicesInstanceRef.current.removeActiveItems();
                if (lead?.email) {
                    choicesInstanceRef.current.setValue([lead.email]);
                }
            }
            // Clear summernote if needed (though the hook handles it usually, 
            // explicit reset of formData above triggers the hook's sync)
        };

        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', handleHidden);
        }
        return () => {
            if (modalEl) {
                modalEl.removeEventListener('hidden.bs.modal', handleHidden);
            }
        };
    }, [lead?.email]);

    return (
        <div className="modal fade" id="emailComposeModal" tabIndex="-1" aria-labelledby="emailComposeLabel" aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content border-0">
                    <div className="modal-header bg-primary">
                        <h5 className="modal-title text-white d-flex align-items-center gap-2">
                            <i className="ri-mail-send-line fs-18"></i> New Email
                        </h5>
                        <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body p-4">
                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="mb-3">
                                <label className="form-label">To <span className="text-danger">*</span></label>
                                <div className={errors.to_emails ? 'is-invalid' : ''}>
                                    <input
                                        type="text"
                                        ref={choicesRef}
                                        name="to_emails"
                                        className={`form-control ${errors.to_emails ? 'is-invalid' : ''}`}
                                        placeholder="Enter emails..."
                                    />
                                </div>
                                {errors.to_emails && <div className="invalid-feedback d-block">{errors.to_emails[0]}</div>}
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Subject <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control ${errors.subject ? 'is-invalid' : ''}`}
                                    name="subject"
                                    placeholder="Enter subject"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                />
                                {errors.subject && <div className="invalid-feedback">{errors.subject[0]}</div>}
                            </div>
                            <div className="mb-3">
                                <label className="form-label">
                                    Message <span className="text-danger">*</span>
                                </label>
                                <textarea
                                    ref={setEditorRef}
                                    className="d-none"
                                    name="message_body"
                                ></textarea>
                                {errors.description && <div className="text-danger mt-1 small">{errors.description[0]}</div>}
                            </div>
                            <div className="row g-3">
                                <div className="col-12">
                                    <label className="form-label">Attachments</label>
                                    <div className="d-flex align-items-center gap-2">
                                        <button type="button" className="btn btn-light btn-sm" onClick={() => document.getElementById('emailFile').click()}>
                                            <i className="ri-add-line me-1"></i> Add Attactment
                                        </button>
                                        <input type="file" id="emailFile" className="d-none" multiple onChange={handleFileChange} />
                                    </div>
                                    <div className="mt-2 d-flex flex-wrap gap-2">
                                        {formData.attachments.map((file, idx) => (
                                            <div key={idx} className="badge bg-light text-body border d-flex align-items-center gap-2 p-2">
                                                <i className="ri-file-line"></i> {file.name}
                                                <i className="ri-close-line cursor-pointer text-danger" onClick={() => removeAttachment(idx)}></i>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-soft-secondary" data-bs-dismiss="modal">Discard</button>
                        <button type="button" className="btn btn-primary" onClick={handleSend} disabled={isSaving}>
                            {isSaving ? (
                                <><span className="spinner-border spinner-border-sm me-1"></span> Sending...</>
                            ) : (
                                <><i className="ri-send-plane-line me-1"></i> Send Email</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
