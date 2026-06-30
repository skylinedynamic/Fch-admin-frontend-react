import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useSummernote } from '../../../hooks/useSummernote';
import { createActivityLog } from '../../../modules/activity-log/services';
import { ENTITY_TYPE_LEAD, ENTITY_TYPE_BORROWER, ENTITY_TYPE_PARTNER, ENTITY_TYPE_FUNDING_REQUEST } from '../../../config/appConfig';

export default function EmailComposeModal({ entityId, entityType, lead }) {
    const choicesRef = useRef(null);
    const choicesInstanceRef = useRef(null);
    const textareaRef = useRef(null); // Local ref to capture the DOM node
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const pendingEmailRef = useRef('');
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
        if (isSaving) return;

        console.log('--- Email Send Start ---');
        setIsSaving(true);
        setErrors({});

        try {
            // Capture emails from Choices.js tags
            let uniqueEmails = new Set();

            // 1. Capture from Choices.js tags
            if (choicesInstanceRef.current) {
                const tags = choicesInstanceRef.current.getValue(true);
                const tagList = Array.isArray(tags) ? tags : (tags ? [tags] : []);
                tagList.forEach(email => {
                    if (email && email.includes('@')) uniqueEmails.add(email.trim());
                });
            }

            // 2. Capture any typed-but-not-tagged email from the pending ref
            if (pendingEmailRef.current && pendingEmailRef.current.includes('@')) {
                uniqueEmails.add(pendingEmailRef.current.trim());
            }

            // 3. Scan inputs inside the modal as a final safety net
            const modalEl = document.getElementById('emailComposeModal');
            if (modalEl) {
                const allInputs = modalEl.querySelectorAll('input');
                allInputs.forEach(input => {
                    const val = input.value?.trim();
                    if (val && val.includes('@')) {
                        uniqueEmails.add(val);
                    }
                });
            }

            const finalEmailsString = Array.from(uniqueEmails).join(', ');

            // Payload Construction
            const payload = new FormData();
            payload.append('log_type', 'email');

            // Set default empty strings so Laravel receives them as null
            payload.append('reference', 'Email');
            payload.append('assigned_to', '');

            // Append emails as a single string to match the input form
            payload.append('to_emails', finalEmailsString);
            payload.append('subject', formData.subject || '');
            payload.append('description', formData.message_body || '');

            // Resolve entity context: prefer props, fall back to global context set by ActivitySidebar buttons
            const ctx = window._activityEntityContext || {};
            const resolvedEntityId = entityId ?? ctx.entityId;
            const resolvedEntityType = entityType ?? ctx.entityType;

            // Entity IDs - separate Lead, Client, Borrower, Partner, and Funding Request
            if (resolvedEntityType === ENTITY_TYPE_LEAD) {
                payload.append('lead_id', resolvedEntityId ? resolvedEntityId.toString() : '');
            } else if (resolvedEntityType === ENTITY_TYPE_BORROWER || resolvedEntityType === 'Client') {
                payload.append('borrower_id', resolvedEntityId ? resolvedEntityId.toString() : '');
            } else if (resolvedEntityType === ENTITY_TYPE_PARTNER) {
                payload.append('partner_id', resolvedEntityId ? resolvedEntityId.toString() : '');
            } else if (resolvedEntityType === ENTITY_TYPE_FUNDING_REQUEST) {
                payload.append('funding_request_id', resolvedEntityId ? resolvedEntityId.toString() : '');
            }

            if (formData.attachments && formData.attachments.length > 0) {
                // Must use attachments[] for Laravel to parse multiple files as an array
                formData.attachments.forEach((file) => {
                    if (file instanceof File) {
                        payload.append('attachments[]', file);
                    }
                });
            }

            const response = await createActivityLog(payload);

            // Handle backend returning HTTP 200 with status:false (validation error format)
            if (response && response.status === false) {
                const backendErrors = response.errors;
                if (backendErrors && typeof backendErrors === 'object') {
                    const normalizedErrors = {};
                    Object.keys(backendErrors).forEach(key => {
                        const error = backendErrors[key];
                        normalizedErrors[key] = Array.isArray(error) ? error : [error];
                    });
                    setErrors(normalizedErrors);
                } else {
                    toast.error(response.message || 'Validation failed.');
                }
                return; // Stop here, do not close modal
            }

            toast.success(`Email sent successfully`);

            // Refresh activity list
            window.dispatchEvent(new CustomEvent('refreshActivities'));

            // Robust Close Modal
            const closeModal = () => {
                if (window.hideGlobalModal) {
                    window.hideGlobalModal('emailComposeModal');
                } else {
                    const modalEl = document.getElementById('emailComposeModal');
                    if (window.bootstrap && modalEl) {
                        const modal = window.bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();
                    }
                    // Final fallback
                    setTimeout(() => {
                        document.body.classList.remove('modal-open');
                        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                    }, 300);
                }
            };

            closeModal();
        } catch (err) {
            console.error('Failed to send email:', err);

            // Handle both 422 HTTP status AND 200 with status:false JSON format
            const responseData = err.response?.data;
            const backendErrors = responseData?.errors;

            if (backendErrors && typeof backendErrors === 'object') {
                // Normalize: backend may send strings OR arrays for error values
                const normalizedErrors = {};
                Object.keys(backendErrors).forEach(key => {
                    const error = backendErrors[key];
                    normalizedErrors[key] = Array.isArray(error) ? error : [error];
                });
                setErrors(normalizedErrors);
            } else {
                toast.error(responseData?.message || err.response?.data?.message || 'Failed to send email. Check your connection.');
            }
        } finally {
            setTimeout(() => setIsSaving(false), 300);
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

            // Track any typed text that hasn't been "tagged" yet and force item creation on blur
            const choicesInput = choicesRef.current.closest('.choices')?.querySelector('input.choices__input');
            if (choicesInput) {
                choicesInput.addEventListener('input', (e) => {
                    pendingEmailRef.current = e.target.value || '';
                });

                choicesInput.addEventListener('blur', () => {
                    const typedValue = choicesInput.value;
                    if (typedValue && typedValue.includes('@')) {
                        const trimmed = typedValue.trim();
                        const current = instance.getValue(true);
                        const currentArray = Array.isArray(current) ? [...current] : (current ? [current] : []);

                        if (!currentArray.includes(trimmed)) {
                            instance.setValue([...currentArray, trimmed]);
                        }
                        choicesInput.value = '';
                    }
                    setTimeout(() => { pendingEmailRef.current = ''; }, 100);
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

    // Reset validation and form on modal close/open
    useEffect(() => {
        const modalEl = document.getElementById('emailComposeModal');
        const resetForm = (e) => {
            // Prevent nested elements from triggering the reset
            if (e && e.target !== modalEl) return;

            setErrors({});
            pendingEmailRef.current = '';
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
            
            // Force Summernote HTML clear via jQuery, as a safety fallback
            const $ = window.jQuery || window.$;
            if ($) {
                const note = document.querySelector('#emailComposeModal textarea[name="message_body"]');
                if (note && $(note).summernote) {
                    try { 
                        $(note).summernote('code', ''); 
                        
                        const $noteEditor = $(note).next('.note-editor');
                        if ($noteEditor.length) {
                            $noteEditor.find('.note-editable').html('<p><br></p>');
                            $noteEditor.find('.note-editing-area').children().not('.note-editable, .note-codable, .note-placeholder').remove();
                            $noteEditor.children('a, p, span').remove();
                        }
                        
                        $('.note-popover').hide();
                        $('.note-modal .note-link-text').val('');
                        $('.note-modal .note-link-url').val('http://');
                        $('.note-modal .note-image-url').val('');
                    } catch(err) {
                        console.error('Summernote email reset error:', err);
                    }
                }
            }
        };

        if (modalEl) {
            modalEl.addEventListener('hide.bs.modal', resetForm);
            modalEl.addEventListener('show.bs.modal', resetForm);
        }
        return () => {
            if (modalEl) {
                modalEl.removeEventListener('hide.bs.modal', resetForm);
                modalEl.removeEventListener('show.bs.modal', resetForm);
            }
        };
    }, [lead?.email]);

    return (
        <div className="modal fade" id="emailComposeModal" tabIndex="-1" aria-labelledby="emailComposeLabel" aria-hidden="true" data-bs-focus="false">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content border-0">
                    <div className="modal-header bg-primary">
                        <h5 className="modal-title text-white d-flex align-items-center gap-2">
                            <i className="ri-mail-send-line fs-18"></i> New Email
                        </h5>
                        <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body p-4">
                        {errors.log_type && (
                            <div className="alert alert-danger py-2 mb-3">
                                {errors.log_type[0]}
                            </div>
                        )}
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
                                            <i className="ri-add-line me-1"></i> Add Attachment
                                        </button>
                                        <input type="file" id="emailFile" className="d-none" multiple onChange={handleFileChange} />
                                    </div>
                                    <div className="mt-2 d-flex flex-wrap gap-2">
                                        {formData.attachments.map((file, idx) => {
                                            const fileError = errors[`attachments.${idx}`];
                                            return (
                                                <div key={idx} className="d-flex flex-column">
                                                    <div className={`badge text-body border d-flex align-items-center gap-2 p-2 ${fileError ? 'bg-soft-danger border-danger text-danger' : 'bg-light'}`}>
                                                        <i className="ri-file-line"></i> {file.name}
                                                        <i className="ri-close-line cursor-pointer text-danger" onClick={() => removeAttachment(idx)}></i>
                                                    </div>
                                                    {fileError && <div className="text-danger mt-1 extra-small" style={{ fontSize: '11px' }}>{fileError[0]}</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Show general attachment group errors if any */}
                                    {errors.attachments && (
                                        <div className="text-danger mt-1 small">
                                            {errors.attachments[0]}
                                        </div>
                                    )}
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
