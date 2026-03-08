import React, { useState, useEffect, useRef, useCallback } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { toast } from 'react-toastify';
import { useSummernote } from '../../../hooks/useSummernote';
import { createActivityLog } from '../../../modules/activity-log/services';

export default function ActivityCreateModal({ entityId, entityType, onActivityCreated }) {
    const referenceRef = useRef(null);
    const categoryRef = useRef(null);
    const dateInputRef = useRef(null);
    const textareaRef = useRef(null); // Local ref to capture the DOM node
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        reference: 'Call',
        activity_date: new Date().toISOString().split('T')[0],
        category: 'Call',
        assigned_to: '',
        summary: '',
        message_body: '',
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

    const handleCreate = async () => {
        setIsSaving(true);
        setErrors({});
        try {
            const data = new FormData();
            data.append('log_type', 'activity');
            data.append('reference', formData.reference || '');
            data.append('activity_date', formData.activity_date || '');
            data.append('category', formData.category || '');
            data.append('subject', formData.summary || '');         // maps to subject column
            data.append('description', formData.message_body || ''); // maps to description column

            // Entity IDs (no lead_id)
            if (entityType === 'Borrower' || entityType === 'Lead' || entityType === 'Client') {
                data.append('borrower_id', entityId ? entityId.toString() : '');
            } else if (entityType === 'Partner') {
                data.append('partner_id', entityId ? entityId.toString() : '');
            }

            if (formData.attachments && formData.attachments.length > 0) {
                formData.attachments.forEach((file) => {
                    data.append('attachments[]', file);
                });
            }

            await createActivityLog(data);
            toast.success(`Activity created successfully`);

            if (onActivityCreated) {
                onActivityCreated();
            }

            // Trigger custom event for refreshing activities if needed
            window.dispatchEvent(new CustomEvent('refreshActivities'));

            // Reset form
            setFormData({
                reference: 'Call',
                activity_date: new Date().toISOString().split('T')[0],
                category: 'Call',
                assigned_to: '',
                summary: '',
                message_body: '',
                attachments: []
            });

            // Close modal — also clean up backdrop to prevent page blur
            const closeModal = () => {
                if (window.jQuery && window.jQuery('#activityCreateModal').modal) {
                    window.jQuery('#activityCreateModal').modal('hide');
                } else if (window.hideGlobalModal) {
                    window.hideGlobalModal('activityCreateModal');
                } else {
                    // Manually close if jQuery modal not available
                    const modalEl = document.getElementById('activityCreateModal');
                    if (modalEl) {
                        modalEl.classList.remove('show');
                        modalEl.style.display = 'none';
                        modalEl.setAttribute('aria-hidden', 'true');
                        modalEl.removeAttribute('aria-modal');
                    }
                }

                // Always clean up leftover backdrop and body classes (fixes blur)
                setTimeout(() => {
                    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                }, 300);
            };

            closeModal();
        } catch (err) {
            console.error('Failed to create activity:', err);
            if (err.response?.status === 422) {
                const backendErrors = err.response.data.errors || {};
                const normalizedErrors = {};
                Object.keys(backendErrors).forEach(key => {
                    const error = backendErrors[key];
                    normalizedErrors[key] = Array.isArray(error) ? error : [error];
                });
                setErrors(normalizedErrors);
            } else {
                toast.error(err.response?.data?.message || 'Failed to create activity');
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
            [referenceRef, categoryRef].forEach(ref => {
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

    // Initialize Flatpickr for date field
    useEffect(() => {
        if (dateInputRef.current) {
            const fp = flatpickr(dateInputRef.current, {
                enableTime: false,
                dateFormat: "Y-m-d",
                defaultDate: formData.activity_date || new Date(),
                onChange: (selectedDates, dateStr) => {
                    setFormData(prev => ({ ...prev, activity_date: dateStr }));
                }
            });
            return () => fp.destroy();
        }
    }, [formData.activity_date]);

    // Reset validation and form on modal close
    useEffect(() => {
        const modalEl = document.getElementById('activityCreateModal');
        const handleHidden = () => {
            setErrors({});
            setFormData({
                reference: 'Call',
                activity_date: new Date().toISOString().split('T')[0],
                category: 'Call',
                assigned_to: '',
                summary: '',
                message_body: '',
                attachments: []
            });
            // Select2/Choices.js instances are handled via their own refs if needed,
            // but many are tied to formData which we just reset.
        };

        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', handleHidden);
        }
        return () => {
            if (modalEl) {
                modalEl.removeEventListener('hidden.bs.modal', handleHidden);
            }
        };
    }, []);

    return (
        <div className="modal fade" id="activityCreateModal" tabIndex="-1" aria-labelledby="activityCreateLabel" aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content border-0">
                    <div className="modal-header p-3 ps-4 bg-primary">
                        <h5 className="modal-title text-white" id="activityCreateLabel">
                            <i className="ri-calendar-event-line align-middle me-2"></i>New Activity
                        </h5>
                        <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body p-4">
                        {errors.log_name && <div className="alert alert-danger py-2 mb-3">{errors.log_name[0]}</div>}
                        <form>
                            <div className="row g-3">
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
                                        <option value="Event">Event</option>
                                        <option value="Meeting">Meeting</option>
                                        <option value="Call">Call</option>
                                        <option value="Email">Email</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {errors.reference && <div className="invalid-feedback">{errors.reference[0]}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Date <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.activity_date ? 'is-invalid' : ''}`}
                                        id="activityDate"
                                        name="activity_date"
                                        ref={dateInputRef}
                                        placeholder="Select date and time"
                                        required
                                    />
                                    {errors.activity_date && <div className="invalid-feedback">{errors.activity_date[0]}</div>}
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Category</label>
                                    <select
                                        className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                                        id="activityCategory"
                                        name="category"
                                        ref={categoryRef}
                                        value={formData.category}
                                        onChange={handleInputChange}
                                    >
                                        <option value="Event">Event</option>
                                        <option value="Meeting">Meeting</option>
                                        <option value="Call">Call</option>
                                        <option value="Sent/Received Email">Sent/Received Email</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {errors.category && <div className="invalid-feedback">{errors.category[0]}</div>}
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
                                <div className="col-md-6">
                                    <label className="form-label">Select Attachments</label>
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
