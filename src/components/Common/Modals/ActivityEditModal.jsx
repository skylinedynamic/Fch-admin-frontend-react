import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    FUTURE_ACTIVITY_REFERENCES,
    getReminderMsToSubtract,
} from '../../../config/appConfig';
import { toast } from 'react-toastify';
import { useSummernote } from '../../../hooks/useSummernote';
import { updateActivityLog } from '../../../modules/activity-log/services';
import {
    ACTIVITY_SUMMARY_MAX_LENGTH,
    ACTIVITY_EDIT_ERROR_FIELDS,
    normalizeActivityFieldErrors,
    withFormLevelError,
    getVisibilityOptions,
    ACTIVITY_TASK_REFERENCE,
    DEFAULT_TASK_ASSIGNMENT,
    taskAssignmentFromActivity,
    buildTaskEditFields,
    asksReminderRecipient,
    buildReminderRecipientField,
} from '../../../modules/activity-log/constants';
import ActivitySelect from './activity-create/ActivitySelect';
import DateTimeField from './activity-create/DateTimeField';
import VisibilityPicker from './activity-create/VisibilityPicker';
import ReminderFields from './activity-create/ReminderFields';
import AttachmentPicker from './activity-create/AttachmentPicker';
import { REFERENCE_SELECT_OPTIONS } from './activity-create/options';
import ToggleCard from './activity-create/ToggleCard';
import TaskAssignmentFields from './activity-create/TaskAssignmentFields';
import ReminderRecipientPicker from './activity-create/ReminderRecipientPicker';
import { DEFAULT_REMINDER_RECIPIENT } from '../../../config/activityTask';
import { useTaskAssignmentSetup } from './activity-create/useTaskAssignmentSetup';
import './activity-create/activityCreateModal.css';

// The same look as New Activity (ActivityCreateModal): its pickers, cards and
// "acm" styles, with ids prefixed "activityEdit" so the two never clash.
export default function ActivityEditModal({ activity, show, onClose, onUpdated, isHost, entityType = null, partnerId = null, taskOwner = null }) {
    const textareaRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const [existingAttachments, setExistingAttachments] = useState([]);
    const [newAttachments, setNewAttachments] = useState([]);

    const [formData, setFormData] = useState({
        reference: 'Call',
        activity_date: '',
        summary: '',
        message_body: '',
        visibility: 'internal',
        remind_me: false,
        remind_at: '',
        reminder_preset: '30_minutes',
        reminder_time_value: '30',
        reminder_time_unit: 'Minutes',
        reminder_recipient: DEFAULT_REMINDER_RECIPIENT,
        ...DEFAULT_TASK_ASSIGNMENT,
    });

    const isTask = formData.reference === ACTIVITY_TASK_REFERENCE;
    const { staff: staffMembers, isLoadingStaff, owner: taskOwnerDetails } = useTaskAssignmentSetup({
        entityType,
        partnerId,
        ownerRef: taskOwner,
        assignedTo: activity?.task?.assigned_to,
        enabled: !!show && isTask && formData.assign_task,
    });

    // Populate data when activity changes or modal opens
    useEffect(() => {
        if (activity && show) {
            const rawFiles = activity.attachments || activity.properties?.attachments?.files || [];
            setExistingAttachments(Array.isArray(rawFiles) ? [...rawFiles] : []);
            setNewAttachments([]);

            setFormData({
                reference: activity.reference || activity.properties?.reference || 'Call',
                activity_date: activity.activity_date || activity.properties?.activity_date || activity.created_at || '',
                summary: activity.properties?.subject || activity.subject || activity.event || '',
                message_body: activity.description || activity.properties?.description || '',
                visibility: activity.visibility || 'internal',
                remind_me: Boolean(activity.remind_me ?? activity.properties?.remind_me ?? false),
                remind_at: activity.remind_at || activity.properties?.remind_at || '',
                reminder_preset: activity.reminder_preset || activity.properties?.reminder_preset || '30_minutes',
                reminder_time_value: activity.reminder_time_value || activity.properties?.reminder_time_value || '30',
                reminder_time_unit: activity.reminder_time_unit || activity.properties?.reminder_time_unit || 'Minutes',
                // An unassigned activity reports "creator"; assigning it here starts at the default
                reminder_recipient: (activity.task && activity.reminder_recipient) || DEFAULT_REMINDER_RECIPIENT,
                ...taskAssignmentFromActivity(activity.task),
            });
            setErrors({});
        }
    }, [activity, show]);

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
        if (files.length > 0) {
            // Uploading on edit replaces the saved attachments instead of adding to them
            setExistingAttachments([]);
            setNewAttachments(prev => [...prev, ...files]);
        }
    };

    const removeExistingAttachment = (index) => {
        setExistingAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const removeNewAttachment = (index) => {
        setNewAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Use Summernote rich-text editor, matching ActivityCreateModal
    const { editorRef: summernoteRef } = useSummernote(
        'edit_message_body',
        formData.message_body,
        (e) => {
            setFormData(prev => ({ ...prev, message_body: e.target.value }));
        },
        {
            height: 200,
            placeholder: 'Write your message...'
        },
        !!show
    );

    const setEditorRef = useCallback((node) => {
        textareaRef.current = node;
        summernoteRef(node);
    }, [summernoteRef]);

    const handleUpdate = async () => {
        if (!activity || !formData.summary.trim()) return;
        setIsSaving(true);
        setErrors({});

        try {
            // Validate Future Date for Tasks and Meetings
            if (FUTURE_ACTIVITY_REFERENCES.includes(formData.reference) && formData.activity_date) {
                if (new Date(formData.activity_date.replace(' ', 'T')).getTime() < new Date().getTime()) {
                    setErrors({ activity_date: [`${FUTURE_ACTIVITY_REFERENCES.join(' and ')} dates must be in the future.`] });
                    setIsSaving(false);
                    return;
                }
            }

            let finalRemindAt = formData.remind_at;

            // Validate Reminder
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
                        if (new Date(finalRemindAt.replace(' ', 'T')).getTime() <= new Date().getTime()) {
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
            }

            const data = new FormData();
            data.append('reference', formData.reference || '');
            data.append('activity_date', formData.activity_date || '');
            data.append('subject', formData.summary || '');
            data.append('description', formData.message_body || '');
            data.append('visibility', formData.visibility || '');
            data.append('remind_me', formData.remind_me ? '1' : '0');
            data.append('remind_at', formData.remind_me ? (finalRemindAt || '') : '');
            data.append('reminder_preset', formData.reminder_preset || '30_minutes');
            data.append('reminder_time_value', formData.reminder_time_value || '30');
            data.append('reminder_time_unit', formData.reminder_time_unit || 'Minutes');
            Object.entries({ ...buildTaskEditFields(formData), ...buildReminderRecipientField(formData) }).forEach(([field, value]) => {
                data.append(field, value);
            });

            // Retained existing attachments
            data.append('existing_attachments', JSON.stringify(existingAttachments));

            // Newly uploaded attachments
            if (newAttachments && newAttachments.length > 0) {
                newAttachments.forEach((file) => {
                    data.append('attachments[]', file);
                });
            }

            await updateActivityLog(activity.id, data);
            toast.success('Activity updated successfully');
            if (onUpdated) {
                onUpdated();
            }
            onClose();
        } catch (err) {
            console.error('Failed to update activity:', err);
            const responseData = err.response?.data;
            const backendErrors = responseData?.errors;

            if (backendErrors && typeof backendErrors === 'object') {
                setErrors(withFormLevelError(normalizeActivityFieldErrors(backendErrors), ACTIVITY_EDIT_ERROR_FIELDS));
            } else if (err.response?.status !== 403) {
                // 404, 500 — the server's own message (403 is already toasted by the API client).
                toast.error(responseData?.message || 'Failed to update activity');
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (!show || !activity) return null;

    const summaryLength = (formData.summary || '').length;
    const summaryMissing = !(formData.summary || '').trim();

    const modalContent = (
        <div
            className="modal fade show d-block acm"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activityEditLabel"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1060 }}
            onClick={onClose}
        >
            <div
                className="modal-dialog modal-lg modal-dialog-scrollable"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-content">
                    <div className="modal-header acm-header">
                        <div className="acm-header__title">
                            <span className="acm-header__icon" aria-hidden="true">
                                <i className={formData.remind_me ? 'ri-alarm-line' : 'ri-calendar-event-line'}></i>
                            </span>
                            <h5 className="modal-title" id="activityEditLabel">
                                {formData.remind_me ? 'Edit Reminder' : 'Edit Activity'}
                            </h5>
                        </div>
                        <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
                    </div>

                    <div className="modal-body acm-body">
                        {errors.form && (
                            <div className="alert alert-danger py-2 mb-3">
                                {errors.form[0]}
                            </div>
                        )}
                        <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
                            <section className="acm-section">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="activityEditReference">
                                            Reference <span className="text-danger">*</span>
                                        </label>
                                        <ActivitySelect
                                            id="activityEditReference"
                                            value={formData.reference}
                                            options={REFERENCE_SELECT_OPTIONS}
                                            onChange={(value) => setField('reference', value)}
                                            invalid={!!errors.reference}
                                        />
                                        {errors.reference && <div className="text-danger mt-1 small">{errors.reference[0]}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="activityEditDate">
                                            Date <span className="text-danger">*</span>
                                        </label>
                                        <DateTimeField
                                            inputId="activityEditDate"
                                            value={formData.activity_date}
                                            onChange={(value) => setField('activity_date', value)}
                                            invalid={!!errors.activity_date}
                                        />
                                        {errors.activity_date && <div className="text-danger mt-1 small">{errors.activity_date[0]}</div>}
                                    </div>
                                    <div className="col-12">
                                        <div className="d-flex justify-content-between align-items-baseline">
                                            <label className={`form-label ${errors.subject ? 'text-danger' : ''}`} htmlFor="activityEditSummary">
                                                Summary <span className="text-danger">*</span>
                                            </label>
                                            {/* The summary is the reminder's title too — capped at ACTIVITY_SUMMARY_MAX_LENGTH (the API enforces the same). */}
                                            <span className={`acm-counter ${summaryLength >= ACTIVITY_SUMMARY_MAX_LENGTH ? 'is-full' : ''}`}>
                                                {summaryLength}/{ACTIVITY_SUMMARY_MAX_LENGTH}
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.subject || summaryMissing ? 'is-invalid' : ''}`}
                                            id="activityEditSummary"
                                            name="summary"
                                            value={formData.summary}
                                            onChange={handleInputChange}
                                            maxLength={ACTIVITY_SUMMARY_MAX_LENGTH}
                                            placeholder="What is this activity about?"
                                            required
                                        />
                                        {errors.subject
                                            ? <div className="invalid-feedback">{errors.subject[0]}</div>
                                            : summaryMissing && <div className="invalid-feedback d-block">Summary is required.</div>}
                                    </div>
                                    <div className="col-12">
                                        <label className={`form-label ${errors.description ? 'text-danger' : ''}`}>Message</label>
                                        <div className="acm-editor">
                                            <textarea
                                                id="activityEditMessageEditor"
                                                ref={setEditorRef}
                                                className="d-none"
                                                name="edit_message_body"
                                            ></textarea>
                                        </div>
                                        {errors.description && <div className="text-danger mt-1 small">{errors.description[0]}</div>}
                                    </div>
                                </div>
                            </section>

                            <section className="acm-section">
                                <VisibilityPicker
                                    idPrefix="activityEdit"
                                    options={getVisibilityOptions(isHost)}
                                    value={formData.visibility}
                                    onChange={(value) => setField('visibility', value)}
                                    error={errors.visibility?.[0]}
                                />
                            </section>

                            <section className="acm-section acm-section--stack">
                                {/* On a Task, who does it and by when comes before the reminder. */}
                                {isTask && (
                                    <ToggleCard
                                        id="editAssignTaskSwitch"
                                        title="Want to Assign"
                                        icon="ri-user-shared-line"
                                        checked={formData.assign_task}
                                        onChange={(checked) => setField('assign_task', checked)}
                                        error={errors.assign_task?.[0]}
                                    >
                                        <TaskAssignmentFields
                                            idPrefix="activityEdit"
                                            values={formData}
                                            onChange={setField}
                                            staff={staffMembers}
                                            isLoadingStaff={isLoadingStaff}
                                            errors={errors}
                                            owner={taskOwnerDetails}
                                        />
                                    </ToggleCard>
                                )}

                                <ToggleCard
                                    id="editRemindMeSwitch"
                                    title="Set Reminder"
                                    icon="ri-alarm-line"
                                    checked={formData.remind_me}
                                    onChange={(checked) => setField('remind_me', checked)}
                                >
                                    <ReminderFields
                                        idPrefix="activityEdit"
                                        values={formData}
                                        onChange={setField}
                                        error={errors.remind_at?.[0]}
                                    />
                                    {asksReminderRecipient(formData) && (
                                        <ReminderRecipientPicker
                                            idPrefix="activityEdit"
                                            value={formData.reminder_recipient}
                                            onChange={(value) => setField('reminder_recipient', value)}
                                            error={errors.reminder_recipient?.[0]}
                                        />
                                    )}
                                </ToggleCard>
                            </section>

                            <section className="acm-section">
                                <AttachmentPicker
                                    savedFiles={existingAttachments}
                                    onRemoveSaved={removeExistingAttachment}
                                    files={newAttachments}
                                    onAdd={addAttachments}
                                    onRemove={removeNewAttachment}
                                    errors={errors}
                                    inputId="activityEditAttachmentInput"
                                    buttonId="activityEditAttachmentBtn"
                                    listId="activityEditAttachmentList"
                                />
                            </section>
                        </form>
                    </div>

                    <div className="modal-footer acm-footer">
                        <button type="button" className="btn btn-light" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary acm-submit"
                            onClick={handleUpdate}
                            disabled={isSaving || summaryMissing}
                        >
                            {isSaving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <i className="ri-check-line align-middle me-1"></i> Update
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(modalContent, document.body);
}
