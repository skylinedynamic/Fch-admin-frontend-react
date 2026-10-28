import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'primereact/calendar';
import { REMINDER_TYPES } from '../../../config/reminders';
import {
    FUTURE_ACTIVITY_REFERENCES,
    getReminderMsToSubtract,
    REMINDER_PRESETS
} from '../../../config/appConfig';
import { toast } from 'react-toastify';
import { useSummernote } from '../../../hooks/useSummernote';
import { updateActivityLog } from '../../../modules/activity-log/services';
import {
    ACTIVITY_SUMMARY_MAX_LENGTH,
    ACTIVITY_EDIT_ERROR_FIELDS,
    normalizeActivityFieldErrors,
    getActivityValidationToast,
    getVisibilityOptions,
    ACTIVITY_TASK_REFERENCE,
    DEFAULT_TASK_ASSIGNMENT,
    taskAssignmentFromActivity,
    buildTaskEditFields,
} from '../../../modules/activity-log/constants';
import { TimeInputs } from '../TimeInputs';
import ToggleCard from './activity-create/ToggleCard';
import TaskAssignmentFields from './activity-create/TaskAssignmentFields';
import { useTaskAssignmentSetup } from './activity-create/useTaskAssignmentSetup';
import './activity-create/activityCreateModal.css';

const REFERENCE_OPTIONS = REMINDER_TYPES.map(t => t.value);


export default function ActivityEditModal({ activity, show, onClose, onUpdated, isHost, entityType = null, partnerId = null, taskOwner = null }) {
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
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
        ...DEFAULT_TASK_ASSIGNMENT,
    });

    const isTask = formData.reference === ACTIVITY_TASK_REFERENCE;
    const { staff: staffMembers, isLoadingStaff, owner: taskOwnerDetails } = useTaskAssignmentSetup({
        entityType,
        partnerId,
        ownerRef: taskOwner,
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

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            // Uploading on edit replaces the saved attachments instead of adding to them
            setExistingAttachments([]);
            setNewAttachments(prev => [...prev, ...files]);
        }
        e.target.value = '';
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
            Object.entries(buildTaskEditFields(formData)).forEach(([field, value]) => {
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
                const normalizedErrors = normalizeActivityFieldErrors(backendErrors);
                setErrors(normalizedErrors);
                toast.error(getActivityValidationToast(normalizedErrors, ACTIVITY_EDIT_ERROR_FIELDS));
            } else if (err.response?.status !== 403) {
                // 404, 500 — the server's own message (403 is already toasted by the API client).
                toast.error(responseData?.message || 'Failed to update activity');
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (!show || !activity) return null;

    const modalContent = (
        <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1060 }}
            onClick={onClose}
        >
            <div
                className="modal-dialog modal-lg modal-dialog-scrollable"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-content border-0">
                    <div className="modal-header p-3 ps-4 bg-primary">
                        <h5 className="modal-title text-white">
                            <i className="ri-calendar-event-line align-middle me-2"></i>
                            {formData.remind_me ? 'Edit Reminder' : 'Edit Activity'}
                        </h5>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={onClose}
                            aria-label="Close"
                        ></button>
                    </div>

                    <div className="modal-body p-4">
                        <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">
                                        Reference <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className={`form-select ${errors.reference ? 'is-invalid' : ''}`}
                                        name="reference"
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
                                    <label className="form-label">
                                        Date <span className="text-danger">*</span>
                                    </label>
                                    <style>{`
                                        .custom-datepicker.is-invalid .p-calendar .p-inputtext,
                                        .custom-datepicker.is-invalid .p-calendar .p-button {
                                            border-color: #dc3545 !important;
                                        }
                                        .custom-datepicker .p-timepicker {
                                            display: none;
                                        }
                                    `}</style>
                                    <div className={`custom-datepicker ${errors.activity_date ? 'is-invalid' : ''}`}>
                                        <Calendar
                                            value={formData.activity_date ? new Date(formData.activity_date.replace(' ', 'T')) : null}
                                            onChange={(e) => {
                                                const pickedDate = e.value;
                                                if (pickedDate) {
                                                    const prev = formData.activity_date ? new Date(formData.activity_date.replace(' ', 'T')) : new Date();
                                                    const merged = new Date(pickedDate);
                                                    merged.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                                                    const tzOffset = merged.getTimezoneOffset() * 60000;
                                                    const localISOTime = (new Date(merged - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
                                                    setFormData(prev2 => ({ ...prev2, activity_date: localISOTime }));
                                                } else {
                                                    setFormData(prev2 => ({ ...prev2, activity_date: '' }));
                                                }
                                            }}
                                            dateFormat="dd M, yy"
                                            showTime
                                            hourFormat="12"
                                            placeholder="Select date & time"
                                            showIcon
                                            className={`w-100 ${errors.activity_date ? 'p-invalid' : ''}`}
                                            inputClassName={`form-control ${errors.activity_date ? 'is-invalid' : ''}`}
                                            appendTo="self"
                                            footerTemplate={() => (
                                                <TimeInputs
                                                    value={formData.activity_date ? new Date(formData.activity_date.replace(' ', 'T')) : null}
                                                    onChange={(newDateTime) => {
                                                        const tzOffset = newDateTime.getTimezoneOffset() * 60000;
                                                        const localISOTime = (new Date(newDateTime - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
                                                        setFormData(prev => ({ ...prev, activity_date: localISOTime }));
                                                    }}
                                                />
                                            )}
                                        />
                                    </div>
                                    {errors.activity_date && <div className="text-danger mt-1 small">{errors.activity_date[0]}</div>}
                                </div>

                                <div className="col-12">
                                    <div className="d-flex justify-content-between align-items-baseline">
                                        <label className={`form-label ${errors.subject ? 'text-danger' : ''}`}>
                                            Subject <span className="text-danger">*</span>
                                        </label>
                                        {/* The subject is the reminder's title too — capped at ACTIVITY_SUMMARY_MAX_LENGTH (the API enforces the same). */}
                                        <span className={`fs-11 ${(formData.summary || '').length >= ACTIVITY_SUMMARY_MAX_LENGTH ? 'text-danger' : 'text-muted'}`}>
                                            {(formData.summary || '').length}/{ACTIVITY_SUMMARY_MAX_LENGTH}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.subject || !(formData.summary || '').trim() ? 'is-invalid' : ''}`}
                                        name="summary"
                                        value={formData.summary}
                                        onChange={handleInputChange}
                                        maxLength={ACTIVITY_SUMMARY_MAX_LENGTH}
                                        required
                                    />
                                    {errors.subject
                                        ? <div className="invalid-feedback">{errors.subject[0]}</div>
                                        : !(formData.summary || '').trim() && <div className="invalid-feedback d-block">Summary is required.</div>}
                                </div>

                                <div className="col-12">
                                    <label className={`form-label ${errors.description ? 'text-danger' : ''}`}>
                                        Message
                                    </label>
                                    <textarea
                                        id="activityEditMessageEditor"
                                        ref={setEditorRef}
                                        className="d-none"
                                        name="edit_message_body"
                                    ></textarea>
                                    {errors.description && <div className="text-danger mt-1 small">{errors.description[0]}</div>}
                                </div>

                                <div className="col-12">
                                    <label className={`form-label ${errors.visibility ? 'text-danger' : ''}`}>
                                        Visibility <span className="text-danger">*</span>
                                    </label>
                                    <div className="d-flex flex-wrap gap-3">
                                        {getVisibilityOptions(isHost).map(opt => (
                                            <div className="form-check" key={opt.value}>
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="visibility"
                                                    id={`activityEditVisibility_${opt.value}`}
                                                    value={opt.value}
                                                    checked={formData.visibility === opt.value}
                                                    onChange={handleInputChange}
                                                />
                                                <label className="form-check-label" htmlFor={`activityEditVisibility_${opt.value}`}>
                                                    {opt.label}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.visibility && <div className="text-danger mt-1 small">{errors.visibility[0]}</div>}
                                </div>

                                {/* Reminder Section */}
                                <div className="col-12 mt-3">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="form-check form-switch mt-md-4 mb-3">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    role="switch"
                                                    id="editRemindMeSwitch"
                                                    checked={formData.remind_me}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, remind_me: e.target.checked }))}
                                                />
                                                <label className="form-check-label ms-2" htmlFor="editRemindMeSwitch">
                                                    Set Reminder
                                                </label>
                                            </div>
                                        </div>
                                        {formData.remind_me && (
                                            <div className="col-md-6">
                                                <label className="form-label text-muted small">
                                                    Reminder Time <span className="text-danger">*</span>
                                                </label>
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
                                                                    const pickedDate = e.value;
                                                                    if (pickedDate) {
                                                                        const prev = formData.remind_at ? new Date(formData.remind_at.replace(' ', 'T')) : new Date();
                                                                        const merged = new Date(pickedDate);
                                                                        merged.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                                                                        const tzOffset = merged.getTimezoneOffset() * 60000;
                                                                        const localISOTime = (new Date(merged - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
                                                                        setFormData(prev2 => ({ ...prev2, remind_at: localISOTime }));
                                                                    } else {
                                                                        setFormData(prev2 => ({ ...prev2, remind_at: '' }));
                                                                    }
                                                                }}
                                                                dateFormat="dd M, yy"
                                                                showTime
                                                                hourFormat="12"
                                                                placeholder="Select date & time"
                                                                showIcon
                                                                className="w-100"
                                                                appendTo="self"
                                                                footerTemplate={() => (
                                                                    <TimeInputs
                                                                        value={formData.remind_at ? new Date(formData.remind_at.replace(' ', 'T')) : null}
                                                                        onChange={(newDateTime) => {
                                                                            const tzOffset = newDateTime.getTimezoneOffset() * 60000;
                                                                            const localISOTime = (new Date(newDateTime - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
                                                                            setFormData(prev => ({ ...prev, remind_at: localISOTime }));
                                                                        }}
                                                                    />
                                                                )}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                {errors.remind_at && <div className="text-danger mt-1 small">{errors.remind_at[0]}</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Want to Assign: the task's assignee can be changed here */}
                                {isTask && (
                                    <div className="col-12 acm">
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
                                    </div>
                                )}

                                {/* Attachments Section */}
                                <div className="col-12 mt-3">
                                    <label className="form-label mb-2">Attachments</label>

                                    {/* Existing Attachments */}
                                    {existingAttachments.length > 0 && (
                                        <div className="mb-3">
                                            <div className="text-muted small fw-medium mb-1">Current Attachments:</div>
                                            <div className="d-flex flex-column gap-2">
                                                {existingAttachments.map((file, index) => (
                                                    <div
                                                        key={`existing-${index}`}
                                                        className="d-flex align-items-center justify-content-between border rounded p-2 bg-light"
                                                    >
                                                        <span className="text-secondary small text-truncate" title={file.name}>
                                                            <i className="ri-attachment-2 me-1 text-primary"></i>
                                                            {file.name}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-ghost-danger p-0 ms-2"
                                                            title="Remove attachment"
                                                            onClick={() => removeExistingAttachment(index)}
                                                        >
                                                            <i className="ri-close-line fs-16"></i>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add New Attachment Button */}
                                    <div className="d-flex align-items-center gap-2">
                                        <button
                                            type="button"
                                            id="activityEditAttachmentBtn"
                                            className="btn btn-light btn-sm"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <i className="ri-add-line me-1"></i> Add Attachment
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            id="activityEditAttachmentInput"
                                            className="d-none"
                                            multiple
                                            onChange={handleFileChange}
                                        />
                                    </div>

                                    {/* Newly Added Attachments */}
                                    {newAttachments.length > 0 && (
                                        <div className="mt-2 d-flex flex-column gap-2">
                                            <div className="text-muted small fw-medium">New Attachments to Upload:</div>
                                            {newAttachments.map((file, index) => {
                                                const fileError = errors[`attachments.${index}`];
                                                return (
                                                    <div key={`new-${index}`}>
                                                        <div className={`d-flex align-items-center justify-content-between border rounded p-2 ${fileError ? 'border-danger' : 'bg-white'}`}>
                                                            <span className={`${fileError ? 'text-danger fw-medium' : 'text-dark'} small text-truncate`}>
                                                                <i className="ri-file-upload-line me-1 text-success"></i>
                                                                {file.name}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-ghost-danger p-0 ms-2"
                                                                title="Remove file"
                                                                onClick={() => removeNewAttachment(index)}
                                                            >
                                                                <i className="ri-close-line fs-16"></i>
                                                            </button>
                                                        </div>
                                                        {fileError && <div className="text-danger mt-1 small ps-1">{fileError[0]}</div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-light" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleUpdate}
                            disabled={isSaving || !formData.summary.trim()}
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
