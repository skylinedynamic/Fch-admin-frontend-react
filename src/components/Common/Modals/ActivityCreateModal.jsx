import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar } from 'primereact/calendar';
import { REMINDER_TYPES } from '../../../config/reminders';
import { parseDate } from '../../../utils/formatters';

import { toast } from 'react-toastify';
import { useSummernote } from '../../../hooks/useSummernote';
import { createActivityLog } from '../../../modules/activity-log/services';
import {
    ENTITY_TYPE_LEAD,
    ENTITY_TYPE_BORROWER,
    ENTITY_TYPE_PARTNER,
    ENTITY_TYPE_FUNDING_REQUEST,
    FUTURE_ACTIVITY_REFERENCES,
    getReminderMsToSubtract,
    REMINDER_PRESETS
} from '../../../config/appConfig';

const REFERENCE_OPTIONS = REMINDER_TYPES.map(t => t.value);

export default function ActivityCreateModal({ entityId, entityType, onActivityCreated }) {
    const referenceRef = useRef(null);
    const textareaRef = useRef(null); // Local ref to capture the DOM node

    const getDefaultDateTime = () => {
        const now = new Date();
        now.setHours(now.getHours() + 1);
        const tzOffset = now.getTimezoneOffset() * 60000;
        return (new Date(now - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
    };

    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        reference: 'Call',
        activity_date: getDefaultDateTime(),
        assigned_to: '',
        summary: '',
        message_body: '',
        attachments: [],
        target_visibility: 'borrower',
        remind_me: false,
        remind_at: '',
        reminder_preset: '30_minutes',
        reminder_time_value: '30',
        reminder_time_unit: 'Minutes'
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

            // Validate Future Date for Tasks and Meetings
            if (FUTURE_ACTIVITY_REFERENCES.includes(formData.reference) && formData.activity_date) {
                if (new Date(formData.activity_date.replace(' ', 'T')).getTime() < new Date().getTime()) {
                    setErrors({ activity_date: [`${FUTURE_ACTIVITY_REFERENCES.join(' and ')} dates must be in the future.`] });
                    setIsSaving(false);
                    return;
                }
            }

            // Validate that we cannot set a reminder for a past activity
            if (formData.remind_me && formData.activity_date) {
                if (new Date(formData.activity_date.replace(' ', 'T')).getTime() < new Date().getTime()) {
                    setErrors({ activity_date: ['Cannot set a reminder for a past activity date.'] });
                    setIsSaving(false);
                    return;
                }
            }

            // Ensure to_emails and assigned_to are sent (as empty strings which Laravel converts to null)
            data.append('to_emails', formData.to_emails || '');

            let finalRemindAt = formData.remind_at;

            if (formData.remind_me) {
                if (formData.reminder_preset && formData.activity_date) {
                    const actDate = new Date(formData.activity_date.replace(' ', 'T'));
                    if (formData.reminder_preset !== 'custom_date_time') {
                        const msToSubtract = getReminderMsToSubtract(
                            formData.reminder_preset,
                            formData.reminder_time_value,
                            formData.reminder_time_unit
                        );

                        const remindDate = new Date(actDate.getTime() - msToSubtract);

                        if (remindDate.getTime() <= new Date().getTime()) {
                            setErrors({ remind_at: ['Reminder time must be a future date.'] });
                            setIsSaving(false);
                            return;
                        }

                        const tzOffset = remindDate.getTimezoneOffset() * 60000;
                        finalRemindAt = (new Date(remindDate - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
                    } else {
                        if (!finalRemindAt) {
                            setErrors({ remind_at: ['Please select a reminder date and time.'] });
                            setIsSaving(false);
                            return;
                        }
                        if (new Date(finalRemindAt).getTime() <= new Date().getTime()) {
                            setErrors({ remind_at: ['Reminder time must be a future date.'] });
                            setIsSaving(false);
                            return;
                        }
                    }
                } else if (!formData.activity_date && formData.reminder_preset !== 'custom_date_time') {
                    setErrors({ remind_at: ['Activity date is required to calculate reminder time.'] });
                    setIsSaving(false);
                    return;
                }

                data.append('remind_me', '1');
                data.append('remind_at', finalRemindAt || '');
            }

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
                activity_date: getDefaultDateTime(),
                assigned_to: '',
                summary: '',
                message_body: '',
                attachments: [],
                target_visibility: 'borrower',
                remind_me: false,
                remind_at: '',
                reminder_preset: '30_minutes',
                reminder_time_value: '30',
                reminder_time_unit: 'Minutes'
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
                activity_date: getDefaultDateTime(),
                assigned_to: '',
                summary: '',
                message_body: '',
                attachments: [],
                target_visibility: 'borrower',
                remind_me: false,
                remind_at: '',
                reminder_preset: '30_minutes',
                reminder_time_value: '30',
                reminder_time_unit: 'Minutes'
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

    // Real-time validations
    let realTimeDateError = null;
    let realTimeReminderError = null;

    if (formData.activity_date) {
        const actDate = new Date(formData.activity_date.replace(' ', 'T'));
        if (actDate.getTime() < new Date().getTime()) {
            if (FUTURE_ACTIVITY_REFERENCES.includes(formData.reference)) {
                realTimeDateError = `${FUTURE_ACTIVITY_REFERENCES.join(' and ')} dates must be in the future.`;
            } else if (formData.remind_me) {
                realTimeDateError = 'Cannot set a reminder for a past activity date.';
            }
        }

        if (formData.remind_me && formData.reminder_preset !== 'custom_date_time' && !realTimeDateError) {
            const msToSubtract = getReminderMsToSubtract(
                formData.reminder_preset,
                formData.reminder_time_value,
                formData.reminder_time_unit
            );
            const remindDate = new Date(actDate.getTime() - msToSubtract);
            if (remindDate.getTime() < new Date().getTime()) {
                realTimeReminderError = 'This reminder time calculates to a past date/time.';
            }
        }
    }

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

                    <style>{`
                        /* Forcefully hide the native select that Bootstrap keeps making visible */
                        .choices select.form-select,
                        select#activityReference {
                            display: none !important;
                            opacity: 0 !important;
                            visibility: hidden !important;
                        }
                        
                        /* Fix dropdown overlapping the focus ring */
                        .choices.is-open .choices__list--dropdown {
                            margin-top: 5px !important;
                            border-radius: 0.375rem !important;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
                            z-index: 1060 !important;
                            /* Restoring your exact padding */
                            padding-left: 16px !important;
                            padding-bottom: 16px !important;
                        }
                    `}</style>

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
                                        style={{ display: 'none' }}
                                    >
                                        {REFERENCE_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    {errors.reference && <div className="invalid-feedback">{errors.reference[0]}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Date <span className="text-danger">*</span></label>
                                    <style>{`
                                        .custom-datepicker.is-invalid .p-calendar .p-inputtext,
                                        .custom-datepicker.is-invalid .p-calendar .p-button {
                                            border-color: #dc3545 !important;
                                        }
                                    `}</style>
                                    <div className={`custom-datepicker ${(errors.activity_date || realTimeDateError) ? 'is-invalid' : ''}`}>
                                        <Calendar
                                            value={formData.activity_date ? new Date(formData.activity_date.replace(' ', 'T')) : null}
                                            onChange={(e) => {
                                                const date = e.value;
                                                if (date) {
                                                    const tzOffset = date.getTimezoneOffset() * 60000;
                                                    const localISOTime = (new Date(date - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
                                                    setFormData(prev => ({ ...prev, activity_date: localISOTime }));
                                                } else {
                                                    setFormData(prev => ({ ...prev, activity_date: "" }));
                                                }
                                            }}
                                            minDate={(FUTURE_ACTIVITY_REFERENCES.includes(formData.reference) || formData.remind_me) ? new Date() : null}
                                            showTime
                                            hourFormat="12"
                                            dateFormat="dd M, yy"
                                            placeholder="Select date"
                                            showIcon
                                            className={`w-100 ${(errors.activity_date || realTimeDateError) ? 'p-invalid' : ''}`}
                                            inputClassName={`form-control ${(errors.activity_date || realTimeDateError) ? 'is-invalid' : ''}`}
                                            appendTo="self"
                                            readOnlyInput
                                        />
                                    </div>
                                    {errors.activity_date && <div className="text-danger mt-1 small">{errors.activity_date[0]}</div>}
                                    {!errors.activity_date && realTimeDateError && <div className="text-danger mt-1 small">{realTimeDateError}</div>}
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
                                <div className="col-12 mt-3">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="form-check form-switch mt-md-4 mb-3">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    role="switch"
                                                    id="remindMeSwitch"
                                                    checked={formData.remind_me}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, remind_me: e.target.checked }))}
                                                />
                                                <label className="form-check-label ms-2" htmlFor="remindMeSwitch">
                                                    Set Remainder
                                                </label>
                                            </div>
                                        </div>
                                        {formData.remind_me && (
                                            <div className="col-md-6">
                                            <label className="form-label text-muted small">Reminder Time <span className="text-danger">*</span></label>
                                            <div className={`d-flex gap-2 ${formData.reminder_preset === 'custom_time_before' ? 'flex-column flex-xl-row' : 'flex-column'}`}>
                                                <select
                                                    className={`form-select flex-grow-1 ${errors.remind_at ? 'is-invalid' : ''}`}
                                                    name="reminder_preset"
                                                    value={formData.reminder_preset}
                                                    onChange={handleInputChange}
                                                >
                                                    {REMINDER_PRESETS.map((preset) => (
                                                        <option key={preset.value} value={preset.value}>
                                                            {preset.label}
                                                        </option>
                                                    ))}
                                                </select>

                                                {formData.reminder_preset === 'custom_time_before' && (
                                                    <div className="d-flex gap-2" style={{ minWidth: 'fit-content' }}>
                                                        <input
                                                            type="number"
                                                            className={`form-control ${errors.remind_at ? 'is-invalid' : ''}`}
                                                            style={{ width: '70px' }}
                                                            name="reminder_time_value"
                                                            value={formData.reminder_time_value}
                                                            onChange={handleInputChange}
                                                            min="1"
                                                        />
                                                        <select
                                                            className={`form-select ${errors.remind_at ? 'is-invalid' : ''}`}
                                                            style={{ width: '120px' }}
                                                            name="reminder_time_unit"
                                                            value={formData.reminder_time_unit}
                                                            onChange={handleInputChange}
                                                        >
                                                            <option value="Minutes">Minutes</option>
                                                            <option value="Hours">Hours</option>
                                                            <option value="Days">Days</option>
                                                            <option value="Weeks">Weeks</option>
                                                            <option value="Months">Months</option>
                                                        </select>
                                                    </div>
                                                )}

                                                {formData.reminder_preset === 'custom_date_time' && (
                                                    <div className="custom-datepicker mt-1">
                                                        <Calendar
                                                            value={formData.remind_at ? new Date(formData.remind_at.replace(' ', 'T')) : null}
                                                            onChange={(e) => {
                                                                const date = e.value;
                                                                if (date) {
                                                                    const tzOffset = date.getTimezoneOffset() * 60000;
                                                                    const localISOTime = (new Date(date - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
                                                                    setFormData(prev => ({ ...prev, remind_at: localISOTime }));
                                                                } else {
                                                                    setFormData(prev => ({ ...prev, remind_at: '' }));
                                                                }
                                                            }}
                                                            showTime
                                                            hourFormat="12"
                                                            dateFormat="dd M, yy"
                                                            placeholder="Select date & time"
                                                            showIcon
                                                            className="w-100"
                                                            appendTo="self"
                                                            readOnlyInput
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            {errors.remind_at && <div className="text-danger mt-1 small">{errors.remind_at[0]}</div>}
                                            {!errors.remind_at && realTimeReminderError && <div className="text-danger mt-1 small">{realTimeReminderError}</div>}
                                        </div>
                                    )}
                                    </div>
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
                        <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={isSaving || realTimeDateError || realTimeReminderError}>
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
