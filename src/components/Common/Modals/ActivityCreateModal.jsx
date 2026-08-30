import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar } from 'primereact/calendar';
import { parseDate } from '../../../utils/formatters';

import { toast } from 'react-toastify';
import { useSummernote } from '../../../hooks/useSummernote';
import { createActivityLog } from '../../../modules/activity-log/services';
import { ENTITY_TYPE_LEAD, ENTITY_TYPE_BORROWER, ENTITY_TYPE_PARTNER, ENTITY_TYPE_FUNDING_REQUEST } from '../../../config/appConfig';

const REFERENCE_OPTIONS = ['Event', 'Meeting', 'Call', 'Email', 'Other'];

export default function ActivityCreateModal({ entityId, entityType, onActivityCreated }) {
    const referenceRef = useRef(null);
    const textareaRef = useRef(null); // Local ref to capture the DOM node

    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        reference: 'Call',
        activity_date: new Date().toISOString().split('T')[0],
        assigned_to: '',
        summary: '',
        message_body: '',
        attachments: [],
        target_visibility: 'borrower'
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

    const handleCreate = async () => {
        setIsSaving(true);
        try {
            const data = new FormData();
            data.append('log_type', 'activity');
            data.append('reference', formData.reference || '');
            data.append('activity_date', formData.activity_date || '');
            data.append('subject', formData.summary || '');         // maps to subject column
            data.append('description', formData.message_body || ''); // maps to description column

            // Ensure to_emails and assigned_to are sent (as empty strings which Laravel converts to null)
            data.append('to_emails', formData.to_emails || '');

            const ctx = window._activityEntityContext || {};
            const resolvedEntityId = entityId ?? ctx.entityId;
            const resolvedEntityType = entityType ?? ctx.entityType;
            const resolvedPartnerId = ctx.partnerId;

            if (resolvedEntityType === ENTITY_TYPE_FUNDING_REQUEST && resolvedPartnerId && resolvedPartnerId != 1) {
                if (!formData.target_visibility) {
                    setErrors({ target_visibility: ['Please select Send to FCH or Send to Borrower'] });
                    setIsSaving(false);
                    return;
                }
            }

            // Entity IDs - separate Lead, Client, Borrower, Partner, and Funding Request
            if (resolvedEntityType === ENTITY_TYPE_LEAD) {
                data.append('lead_id', resolvedEntityId ? resolvedEntityId.toString() : '');
            } else if (resolvedEntityType === ENTITY_TYPE_BORROWER || resolvedEntityType === 'Client') {
                data.append('borrower_id', resolvedEntityId ? resolvedEntityId.toString() : '');
            } else if (resolvedEntityType === ENTITY_TYPE_PARTNER) {
                data.append('partner_id', resolvedEntityId ? resolvedEntityId.toString() : '');
            } else if (resolvedEntityType === ENTITY_TYPE_FUNDING_REQUEST) {
                data.append('funding_request_id', resolvedEntityId ? resolvedEntityId.toString() : '');
                if (formData.target_visibility === 'host') data.append('visible_to_host', '1');
                if (formData.target_visibility === 'borrower') data.append('visible_to_borrower', '1');
            }

            if (formData.attachments && formData.attachments.length > 0) {
                // Must use attachments[] for Laravel to parse multiple files as an array
                formData.attachments.forEach((file) => {
                    data.append('attachments[]', file);
                });
            }

            const response = await createActivityLog(data);

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

            toast.success(`Activity created successfully`);

            if (onActivityCreated) {
                onActivityCreated();
            }

            // Custom event first
            window.dispatchEvent(new CustomEvent('refreshActivities'));

            // Reset form explicitly right away to clear Summernote
            setErrors({});
            setFormData({
                reference: 'Call',
                activity_date: new Date().toISOString().split('T')[0],
                assigned_to: '',
                summary: '',
                message_body: '',
                attachments: [],
                target_visibility: 'borrower'
            });

            // Robust Close Modal
            const closeModal = () => {
                if (window.hideGlobalModal) {
                    window.hideGlobalModal('activityCreateModal');
                } else {
                    const modalEl = document.getElementById('activityCreateModal');
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
            console.error('Failed to create activity:', err);

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
            } else if (err.response?.status !== 403) {
                toast.error(responseData?.message || 'Failed to create activity');
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
                // Find the .note-editor within the same parent container
                const parent = textareaRef.current.parentElement;
                const noteEditor = parent?.querySelector('.note-editor');

                if (noteEditor) {
                    if (errors.description) {
                        noteEditor.style.setProperty('border-color', '#dc3545', 'important');
                        noteEditor.style.setProperty('box-shadow', '0 0 0 0.1rem rgba(220,53,69,.25)', 'important');
                    } else {
                        noteEditor.style.borderColor = '';
                        noteEditor.style.boxShadow = '';
                    }
                }
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [errors.description]);

    // Initialize Choices.js
    useEffect(() => {
        const instances = [];
        if (window.Choices) {
            [referenceRef].forEach(ref => {
                if (ref.current) {
                    try {
                        const instance = new window.Choices(ref.current, {
                            searchEnabled: false,
                            removeItemButton: false,
                            itemSelectText: '',
                        });
                        instances.push(instance);

                        ref.current.addEventListener('change', (e) => {
                            const { name, value } = e.target;
                            setFormData(prev => ({ ...prev, [name]: value }));
                        });
                    } catch (e) {
                        console.warn('Choices.js init failed', e);
                    }
                }
            });
        }
        return () => {
            instances.forEach(instance => instance.destroy());
        };
    }, []);



    // Reset validation and form on modal close/open
    useEffect(() => {
        const modalEl = document.getElementById('activityCreateModal');

        const resetForm = (e) => {
            // Prevent nested elements (like Summernote dialogs if appended inside) from triggering the reset
            if (e && e.target !== modalEl) return;

            setErrors({});
            setFormData({
                reference: 'Call',
                activity_date: new Date().toISOString().split('T')[0],
                assigned_to: '',
                summary: '',
                message_body: '',
                attachments: [],
                target_visibility: 'borrower'
            });

            // Force Summernote HTML clear via jQuery, as a safety fallback
            const $ = window.jQuery || window.$;
            if ($ && $('#activityMessageEditor').summernote) {
                try {
                    $('#activityMessageEditor').summernote('code', '');

                    const $noteEditor = $('#activityMessageEditor').next('.note-editor');
                    if ($noteEditor.length) {
                        // Force clear DOM directly just in case API fails
                        $noteEditor.find('.note-editable').html('<p><br></p>');

                        // Remove any orphaned tags (like links) inserted outside the editable area due to Summernote bug
                        $noteEditor.find('.note-editing-area').children().not('.note-editable, .note-codable, .note-placeholder').remove();
                        $noteEditor.children('a, p, span').remove();
                    }

                    // Hide any floating popovers (like the link popover) that might be stuck open
                    $('.note-popover').hide();

                    // Clear retained link/dialog values in Summernote
                    $('.note-modal .note-link-text').val('');
                    $('.note-modal .note-link-url').val('http://');
                    $('.note-modal .note-image-url').val('');
                } catch (err) {
                    console.error('Summernote reset error:', err);
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
    }, []);
    const ctx = window._activityEntityContext || {};
    const resolvedEntityType = entityType ?? ctx.entityType;
    const resolvedPartnerId = ctx.partnerId;

    return (
        <div className="modal fade" id="activityCreateModal" tabIndex="-1" aria-labelledby="activityCreateLabel" aria-hidden="true" data-bs-focus="false">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content border-0">
                    <div className="modal-header p-3 ps-4 bg-primary">
                        <h5 className="modal-title text-white" id="activityCreateLabel">
                            <i className="ri-calendar-event-line align-middle me-2"></i>New Activity
                        </h5>
                        <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body p-4">
                        {errors.log_type && (
                            <div className="alert alert-danger py-2 mb-3">
                                {errors.log_type[0]}
                            </div>
                        )}
                        <form>
                            <div className="row g-3">
                                {/* Send to Partner / Borrower Radio Buttons - Moved to top as requested */}
                                {resolvedEntityType === ENTITY_TYPE_FUNDING_REQUEST && resolvedPartnerId && resolvedPartnerId != 1 && (
                                    <div className="col-12 border-bottom pb-3 mb-1 mt-0">
                                        <div className="d-flex gap-4">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="activity_target_visibility"
                                                    id="activityVisibleToHost"
                                                    value="host"
                                                    checked={formData.target_visibility === 'host'}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, target_visibility: e.target.value }))}
                                                />
                                                <label className="form-check-label" htmlFor="activityVisibleToHost">
                                                    {ctx.isHost ? 'Send to Partner' : 'Send to FCH'}
                                                </label>
                                            </div>
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="activity_target_visibility"
                                                    id="activityVisibleToBorrower"
                                                    value="borrower"
                                                    checked={formData.target_visibility === 'borrower'}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, target_visibility: e.target.value }))}
                                                />
                                                <label className="form-check-label" htmlFor="activityVisibleToBorrower">
                                                    Send to Borrower
                                                </label>
                                            </div>
                                        </div>
                                        {errors.target_visibility && <div className="text-danger mt-1 small">{errors.target_visibility[0]}</div>}
                                    </div>
                                )}

                                <div className="col-md-6">
                                    <label className="form-label">Reference <span className="text-danger">*</span></label>
                                    <select
                                        className={`form-select ${errors.reference ? 'is-invalid' : ''}`}
                                        id="activityReference"
                                        name="reference"
                                        ref={referenceRef}
                                        value={formData.reference}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        {REFERENCE_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    {errors.reference && <div className="invalid-feedback">{errors.reference[0]}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Date <span className="text-danger">*</span></label>
                                    <div className="custom-datepicker">
                                        <Calendar
                                            value={parseDate(formData.activity_date)}
                                            onChange={(e) => {
                                                const date = e.value;
                                                const dateString = date
                                                    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                                    : "";
                                                setFormData(prev => ({ ...prev, activity_date: dateString }));
                                            }}
                                            dateFormat="dd M, yy"
                                            placeholder="Select date"
                                            showIcon
                                            className="w-100"
                                            appendTo="self"
                                            readOnlyInput
                                        />
                                    </div>
                                    {errors.activity_date && <div className="text-danger mt-1 small">{errors.activity_date[0]}</div>}
                                </div>
                                <div className="col-12">
                                    <label className={`form-label ${errors.subject ? 'text-danger' : ''}`}>
                                        Summary <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.subject ? 'is-invalid' : ''}`}
                                        id="activitySummary"
                                        name="summary"
                                        value={formData.summary}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    {errors.subject && <div className="text-danger mt-1 small">{errors.subject[0]}</div>}
                                </div>
                                <div className="col-12">
                                    <label className={`form-label ${errors.description ? 'text-danger' : ''}`}>Message</label>
                                    <textarea
                                        id="activityMessageEditor"
                                        ref={setEditorRef}
                                        className="d-none"
                                        name="message_body"
                                    ></textarea>
                                    {errors.description && <div className="text-danger mt-1 small">{errors.description[0]}</div>}
                                </div>
                            </div>
                            <div className="row mt-3">
                                <div className="col-12 mt-3">
                                    <label className="form-label mb-2">Select Attachments</label>
                                    <div className="d-flex align-items-center gap-2">
                                        <button
                                            type="button"
                                            id="activityAttachmentBtn"
                                            className="btn btn-light btn-sm"
                                            onClick={() => document.getElementById('activityAttachmentInput').click()}
                                        >
                                            + Add Attachment
                                        </button>
                                        <input
                                            type="file"
                                            id="activityAttachmentInput"
                                            className="d-none"
                                            multiple
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                    <div id="activityAttachmentList" className="mt-2">
                                        {formData.attachments.map((file, index) => {
                                            const fileError = errors[`attachments.${index}`];
                                            return (
                                                <div key={index} className="mb-2">
                                                    <div className={`d-flex align-items-center justify-content-between border rounded p-2 ${fileError ? 'border-danger' : ''}`}>
                                                        <span className={`${fileError ? 'text-danger fw-medium' : 'text-muted'} small`}>
                                                            <i className="ri-attachment-2 me-1"></i>
                                                            {file.name}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-ghost-danger p-0"
                                                            onClick={() => removeAttachment(index)}
                                                        >
                                                            <i className="ri-close-line fs-16"></i>
                                                        </button>
                                                    </div>
                                                    {fileError && <div className="text-danger mt-1 small ps-1">{fileError[0]}</div>}
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
                        <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <i className="ri-check-line align-middle me-1"></i> Create
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
