import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toLocalDateTimeString } from '../../../utils/dates';

import { toast } from 'react-toastify';
import { useSummernote } from '../../../hooks/useSummernote';
import { createActivityLog } from '../../../modules/activity-log/services';
import {
    ACTIVITY_SUMMARY_MAX_LENGTH,
    ACTIVITY_CREATE_ERROR_FIELDS,
    normalizeActivityFieldErrors,
    withFormLevelError,
    getVisibilityOptions,
    ACTIVITY_TASK_REFERENCE,
    DEFAULT_TASK_ASSIGNMENT,
    buildTaskAssignmentFields,
} from '../../../modules/activity-log/constants';
import { clearStrayModalBackdrops } from '../../../utils/modalBackdrop';
import {
    ENTITY_TYPE_LEAD,
    ENTITY_TYPE_BORROWER,
    ENTITY_TYPE_PARTNER,
    ENTITY_TYPE_FUNDING_REQUEST,
    ENTITY_TYPE_FUNDING_APPLICATION,
    FUTURE_ACTIVITY_REFERENCES,
    getReminderMsToSubtract,
} from '../../../config/appConfig';
import ActivitySelect from './activity-create/ActivitySelect';
import DateTimeField from './activity-create/DateTimeField';
import VisibilityPicker from './activity-create/VisibilityPicker';
import ToggleCard from './activity-create/ToggleCard';
import ReminderFields from './activity-create/ReminderFields';
import TaskAssignmentFields from './activity-create/TaskAssignmentFields';
import AttachmentPicker from './activity-create/AttachmentPicker';
import { REFERENCE_SELECT_OPTIONS } from './activity-create/options';
import { useTaskAssignmentSetup } from './activity-create/useTaskAssignmentSetup';
import './activity-create/activityCreateModal.css';


export default function ActivityCreateModal({ entityId, entityType, onActivityCreated }) {
    const textareaRef = useRef(null); // Local ref to capture the DOM node
    // This instance's own modal element. Some pages mount a second copy with the
    // same id, so getElementById could hand back the other copy.
    const modalRef = useRef(null);

    // Defaults to the current time (BUG-057), read on each open, not page load.
    const getDefaultDateTime = () => toLocalDateTimeString(new Date());

    const getEmptyForm = () => ({
        reference: 'Call',
        activity_date: getDefaultDateTime(),
        summary: '',
        message_body: '',
        attachments: [],
        visibility: 'private',
        remind_me: false,
        remind_at: '',
        reminder_preset: '30_minutes',
        reminder_time_value: '30',
        reminder_time_unit: 'Minutes',
        ...DEFAULT_TASK_ASSIGNMENT,
    });

    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [isHostUser, setIsHostUser] = useState(false);
    const [formData, setFormData] = useState(getEmptyForm);

    // The record the modal was opened on: its owning partner, its responsible
    // staff member ({ id, name }) and which kind of record it is.
    const [taskPartnerId, setTaskPartnerId] = useState(null);
    const [taskOwnerRef, setTaskOwnerRef] = useState(null);
    const [taskEntityType, setTaskEntityType] = useState(null);

    const isTask = formData.reference === ACTIVITY_TASK_REFERENCE;
    const isAssigningTask = isTask && formData.assign_task;
    const { staff: staffMembers, isLoadingStaff, owner: taskOwner } = useTaskAssignmentSetup({
        entityType: taskEntityType,
        partnerId: taskPartnerId,
        ownerRef: taskOwnerRef,
        enabled: isAssigningTask,
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const setField = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addAttachments = (files) => {
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
            data.append('visibility', formData.visibility || '');

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
                // Saved so the Edit modal re-opens with the reminder option actually chosen
                data.append('reminder_preset', formData.reminder_preset || '30_minutes');
                data.append('reminder_time_value', formData.reminder_time_value || '30');
                data.append('reminder_time_unit', formData.reminder_time_unit || 'Minutes');
            }

            Object.entries(buildTaskAssignmentFields(formData)).forEach(([field, value]) => {
                data.append(field, value);
            });

            const ctx = window._activityEntityContext || {};
            const resolvedEntityId = entityId ?? ctx.entityId;
            const resolvedEntityType = entityType ?? ctx.entityType;

            // Entity IDs - separate Lead, Client, Borrower, Partner, Funding Request, and Funding Application
            if (resolvedEntityType === ENTITY_TYPE_LEAD) {
                data.append('lead_id', resolvedEntityId ? resolvedEntityId.toString() : '');
            } else if (resolvedEntityType === ENTITY_TYPE_BORROWER || resolvedEntityType === 'Client') {
                data.append('borrower_id', resolvedEntityId ? resolvedEntityId.toString() : '');
            } else if (resolvedEntityType === ENTITY_TYPE_PARTNER) {
                data.append('partner_id', resolvedEntityId ? resolvedEntityId.toString() : '');
            } else if (resolvedEntityType === ENTITY_TYPE_FUNDING_REQUEST) {
                data.append('funding_request_id', resolvedEntityId ? resolvedEntityId.toString() : '');
            } else if (resolvedEntityType === ENTITY_TYPE_FUNDING_APPLICATION) {
                data.append('funding_application_id', resolvedEntityId ? resolvedEntityId.toString() : '');
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
                    setErrors(withFormLevelError(normalizeActivityFieldErrors(backendErrors), ACTIVITY_CREATE_ERROR_FIELDS));
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
            setFormData(getEmptyForm());

            // Robust Close Modal
            const closeModal = () => {
                if (window.hideGlobalModal) {
                    window.hideGlobalModal('activityCreateModal');
                } else {
                    const modalEl = modalRef.current;
                    if (window.bootstrap && modalEl) {
                        const modal = window.bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();
                    }
                    // Final fallback
                    setTimeout(() => {
                        // Stray backdrops only - never one belonging to a modal
                        // that is still open behind this one.
                        clearStrayModalBackdrops();
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
                setErrors(withFormLevelError(normalizeActivityFieldErrors(backendErrors), ACTIVITY_CREATE_ERROR_FIELDS));
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

    // Reset validation and form on modal close/open
    useEffect(() => {
        const modalEl = modalRef.current;

        const resetForm = (e) => {
            // Prevent nested elements (like Summernote dialogs if appended inside) from triggering the reset
            if (e && e.target !== modalEl) return;

            const ctx = window._activityEntityContext || {};
            const hostUser = !!ctx.isHost;
            setIsHostUser(hostUser);
            const ctxEntityType = entityType ?? ctx.entityType;
            setTaskPartnerId(ctx.partnerId ?? null);
            setTaskEntityType(ctxEntityType ?? null);
            setTaskOwnerRef(ctx.taskOwner ?? null);

            setErrors({});
            setFormData(getEmptyForm());

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

    const activityDateInvalid = !!(errors.activity_date || realTimeDateError);
    const summaryLength = (formData.summary || '').length;

    return (
        <div ref={modalRef} className="modal fade acm" id="activityCreateModal" tabIndex="-1" aria-labelledby="activityCreateLabel" aria-hidden="true" data-bs-focus="false">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header acm-header">
                        <div className="acm-header__title">
                            <span className="acm-header__icon" aria-hidden="true">
                                <i className="ri-calendar-event-line"></i>
                            </span>
                            <h5 className="modal-title" id="activityCreateLabel">New Activity</h5>
                        </div>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>

                    <div className="modal-body acm-body">
                        {errors.log_type && (
                            <div className="alert alert-danger py-2 mb-3">
                                {errors.log_type[0]}
                            </div>
                        )}
                        {errors.form && (
                            <div className="alert alert-danger py-2 mb-3">
                                {errors.form[0]}
                            </div>
                        )}
                        <form onSubmit={(e) => e.preventDefault()}>
                            <section className="acm-section">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="activityReference">
                                            Reference <span className="text-danger">*</span>
                                        </label>
                                        <ActivitySelect
                                            id="activityReference"
                                            value={formData.reference}
                                            options={REFERENCE_SELECT_OPTIONS}
                                            onChange={(value) => setField('reference', value)}
                                            invalid={!!errors.reference}
                                        />
                                        {errors.reference && <div className="text-danger mt-1 small">{errors.reference[0]}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="activityDate">
                                            Date <span className="text-danger">*</span>
                                        </label>
                                        <DateTimeField
                                            inputId="activityDate"
                                            value={formData.activity_date}
                                            onChange={(value) => setField('activity_date', value)}
                                            minDate={(FUTURE_ACTIVITY_REFERENCES.includes(formData.reference) || formData.remind_me) ? new Date() : null}
                                            invalid={activityDateInvalid}
                                        />
                                        {errors.activity_date && <div className="text-danger mt-1 small">{errors.activity_date[0]}</div>}
                                        {!errors.activity_date && realTimeDateError && <div className="text-danger mt-1 small">{realTimeDateError}</div>}
                                    </div>
                                    <div className="col-12">
                                        <div className="d-flex justify-content-between align-items-baseline">
                                            <label className={`form-label ${errors.subject ? 'text-danger' : ''}`} htmlFor="activitySummary">
                                                Summary <span className="text-danger">*</span>
                                            </label>
                                            {/* The summary is the reminder's title too — capped at ACTIVITY_SUMMARY_MAX_LENGTH (the API enforces the same). */}
                                            <span className={`acm-counter ${summaryLength >= ACTIVITY_SUMMARY_MAX_LENGTH ? 'is-full' : ''}`}>
                                                {summaryLength}/{ACTIVITY_SUMMARY_MAX_LENGTH}
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.subject ? 'is-invalid' : ''}`}
                                            id="activitySummary"
                                            name="summary"
                                            value={formData.summary}
                                            onChange={handleInputChange}
                                            maxLength={ACTIVITY_SUMMARY_MAX_LENGTH}
                                            placeholder="What is this activity about?"
                                            required
                                        />
                                        {errors.subject && <div className="invalid-feedback">{errors.subject[0]}</div>}
                                    </div>
                                    <div className="col-12">
                                        <label className={`form-label ${errors.description ? 'text-danger' : ''}`}>Message</label>
                                        <div className="acm-editor">
                                            <textarea
                                                id="activityMessageEditor"
                                                ref={setEditorRef}
                                                className="d-none"
                                                name="message_body"
                                            ></textarea>
                                        </div>
                                        {errors.description && <div className="text-danger mt-1 small">{errors.description[0]}</div>}
                                    </div>
                                </div>
                            </section>

                            <section className="acm-section">
                                <VisibilityPicker
                                    options={getVisibilityOptions(isHostUser)}
                                    value={formData.visibility}
                                    onChange={(value) => setField('visibility', value)}
                                    error={errors.visibility?.[0]}
                                />
                            </section>

                            <section className="acm-section acm-section--stack">
                                <ToggleCard
                                    id="remindMeSwitch"
                                    title="Set Reminder"
                                    icon="ri-alarm-line"
                                    checked={formData.remind_me}
                                    onChange={(checked) => setField('remind_me', checked)}
                                >
                                    <ReminderFields
                                        values={formData}
                                        onChange={setField}
                                        error={errors.remind_at?.[0]}
                                        warning={realTimeReminderError}
                                    />
                                </ToggleCard>

                                {isTask && (
                                    <ToggleCard
                                        id="assignTaskSwitch"
                                        title="Want to Assign"
                                        icon="ri-user-shared-line"
                                        checked={formData.assign_task}
                                        onChange={(checked) => setField('assign_task', checked)}
                                        error={errors.assign_task?.[0]}
                                    >
                                        <TaskAssignmentFields
                                            values={formData}
                                            onChange={setField}
                                            staff={staffMembers}
                                            isLoadingStaff={isLoadingStaff}
                                            errors={errors}
                                            owner={taskOwner}
                                        />
                                    </ToggleCard>
                                )}
                            </section>

                            <section className="acm-section">
                                <AttachmentPicker
                                    files={formData.attachments}
                                    onAdd={addAttachments}
                                    onRemove={removeAttachment}
                                    errors={errors}
                                />
                            </section>
                        </form>
                    </div>
                    <div className="modal-footer acm-footer">
                        <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" className="btn btn-primary acm-submit" onClick={handleCreate} disabled={isSaving || realTimeDateError || realTimeReminderError}>
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
