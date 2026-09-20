import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'primereact/calendar';
import { TimeInputs } from './TimeInputs';
import { REMINDER_PRESETS, getReminderMsToSubtract } from '../../config/appConfig';
import { SNOOZE_NOTE_MAX_LENGTH } from './ReminderSnoozeForm';

interface ReminderRescheduleFormProps {
    loading?: boolean;
    // rescheduleAt is the naive 'Y-m-d H:i:s' string the backend expects
    // (interpreted server-side using the X-Timezone header); leadMinutes is
    // how long before rescheduleAt to fire the alert; note is the optional
    // reason, saved in the reminder's snooze history like a snooze note.
    onConfirm: (rescheduleAt: string, leadMinutes: number, note: string) => void;
    onCancel?: () => void;
}

// Convert a local Date into the naive 'Y-m-d H:i:s' string the backend
// expects, matching the same conversion ActivityCreateModal uses for remind_at.
const toLocalDbString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ');
};

// Shared custom date/time + "remind me X before" picker used both by the
// due-reminder popup (ReminderModal) and the reminder details page
// (ReminderViewModal) so the two Reschedule flows stay identical instead of
// drifting apart as separate copies. Laid out like the snooze panel, with its
// own Cancel / Confirm row at the bottom.
export const ReminderRescheduleForm = ({ loading, onConfirm, onCancel }: ReminderRescheduleFormProps) => {
    // Default the picker to a sensible starting point instead of blank, so
    // there's less to fill in.
    const [customRescheduleDate, setCustomRescheduleDate] = useState<Date | null>(
        () => new Date(Date.now() + 60 * 60 * 1000)
    );
    const [rescheduleLeadPreset, setRescheduleLeadPreset] = useState('15_minutes');
    const [rescheduleLeadValue, setRescheduleLeadValue] = useState('1');
    const [rescheduleLeadUnit, setRescheduleLeadUnit] = useState('Hours');
    const [note, setNote] = useState('');

    const isCustomLead = rescheduleLeadPreset === 'custom_time_before';

    // A blank/zero custom value would otherwise silently fall back to a 0ms
    // lead time (see getReminderMsToSubtract) instead of blocking Confirm —
    // the same real-time check ActivityCreateModal does for remind_at, plus a
    // sane upper bound so an absurd value (e.g. 999999 hours) can't be entered.
    const MAX_CUSTOM_LEAD_VALUE = 999;
    const parsedLeadValue = parseInt(rescheduleLeadValue, 10);
    const isLeadValueInvalid = isCustomLead && (
        rescheduleLeadValue.trim() === '' ||
        isNaN(parsedLeadValue) ||
        parsedLeadValue < 1 ||
        parsedLeadValue > MAX_CUSTOM_LEAD_VALUE
    );

    const rescheduleLeadMs = getReminderMsToSubtract(rescheduleLeadPreset, rescheduleLeadValue, rescheduleLeadUnit);
    const rescheduleAlertTime = customRescheduleDate ? new Date(customRescheduleDate.getTime() - rescheduleLeadMs) : null;

    // Each error is tied to the field that causes it and shown right under
    // that field, so it is always clear what to fix. The backend rejects a
    // past reschedule date too — this just says so before the request.
    const dateError = !customRescheduleDate
        ? 'Select a date and time.'
        : (customRescheduleDate.getTime() <= Date.now() ? 'Choose a date and time in the future.' : null);
    const leadValueError = isLeadValueInvalid ? `Enter a value between 1 and ${MAX_CUSTOM_LEAD_VALUE}.` : null;
    const leadTimeError = !dateError && !leadValueError && rescheduleAlertTime && rescheduleAlertTime.getTime() < Date.now()
        ? 'The reminder would be in the past — choose a shorter time before.'
        : null;
    const rescheduleLeadError = leadValueError || leadTimeError;
    const trimmedNote = note.trim();
    const noteError = trimmedNote.length > SNOOZE_NOTE_MAX_LENGTH
        ? `The note may not be longer than ${SNOOZE_NOTE_MAX_LENGTH} characters.`
        : null;
    const canConfirm = !dateError && !rescheduleLeadError && !noteError && !loading;

    const doConfirm = () => {
        if (!customRescheduleDate || !canConfirm) return;
        onConfirm(toLocalDbString(customRescheduleDate), Math.round(rescheduleLeadMs / 60000), trimmedNote);
    };

    // The panel opens below the action buttons — bring it into view within the
    // popup's scrolling body (never scrolling the page itself).
    const panelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, []);

    // Date & Time gets more room than Remind Me: "03 Sep, 2026 12:39 PM" needs
    // it to avoid clipping the AM/PM. Plain col-* (not col-md-*) because the
    // breakpoints follow the browser viewport, not this panel's width.
    return (
        <div ref={panelRef} className="reminder-snooze-panel rounded border p-3">
            <div className="row g-2">
                <div className="col-7">
                    <label className="form-label fs-12 fw-semibold text-muted mb-1">Date &amp; Time</label>
                    <div className="custom-datepicker reminder-reschedule-picker">
                        <Calendar
                            value={customRescheduleDate}
                            onChange={(e) => {
                                const pickedDate = e.value as Date | null;
                                if (pickedDate) {
                                    const prev = customRescheduleDate || new Date();
                                    const merged = new Date(pickedDate);
                                    merged.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                                    setCustomRescheduleDate(merged);
                                } else {
                                    setCustomRescheduleDate(null);
                                }
                            }}
                            dateFormat="dd M, yy"
                            showTime
                            hourFormat="12"
                            placeholder="Select date & time"
                            showIcon
                            className="w-100"
                            inputClassName="reminder-control"
                            invalid={!!dateError}
                            appendTo="self"
                            minDate={new Date()}
                            footerTemplate={() => (
                                <TimeInputs
                                    value={customRescheduleDate}
                                    onChange={(newDateTime: Date) => setCustomRescheduleDate(newDateTime)}
                                />
                            )}
                        />
                    </div>
                    {dateError && <div className="invalid-feedback d-block">{dateError}</div>}
                </div>

                <div className="col-5">
                    <label className="form-label fs-12 fw-semibold text-muted mb-1">Remind Me</label>
                    <select
                        className={`form-select w-100 reminder-control ${!isCustomLead && leadTimeError ? 'is-invalid' : ''}`}
                        value={rescheduleLeadPreset}
                        onChange={(e) => setRescheduleLeadPreset(e.target.value)}
                        disabled={loading}
                    >
                        {REMINDER_PRESETS.map((preset: any) => (
                            <option key={preset.value} value={preset.value}>{preset.label}</option>
                        ))}
                    </select>
                    {!isCustomLead && leadTimeError && <div className="invalid-feedback d-block">{leadTimeError}</div>}
                </div>

                {isCustomLead && (
                    <>
                        <div className="col-6">
                            <label className="form-label fs-12 fw-semibold text-muted mb-1">Value</label>
                            <input
                                type="number"
                                className={`form-control w-100 reminder-control reminder-lead-value ${rescheduleLeadError ? 'is-invalid' : ''}`}
                                min="1"
                                max={MAX_CUSTOM_LEAD_VALUE}
                                value={rescheduleLeadValue}
                                onChange={(e) => setRescheduleLeadValue(e.target.value)}
                                disabled={loading}
                            />
                            {rescheduleLeadError && <div className="invalid-feedback">{rescheduleLeadError}</div>}
                        </div>
                        <div className="col-6">
                            <label className="form-label fs-12 fw-semibold text-muted mb-1">Unit</label>
                            <select
                                className="form-select w-100 reminder-control"
                                value={rescheduleLeadUnit}
                                onChange={(e) => setRescheduleLeadUnit(e.target.value)}
                                disabled={loading}
                            >
                                <option value="Minutes">Minutes</option>
                                <option value="Hours">Hours</option>
                                <option value="Days">Days</option>
                                <option value="Weeks">Weeks</option>
                                <option value="Months">Months</option>
                            </select>
                        </div>
                    </>
                )}

                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-baseline">
                        <label className="form-label fs-12 fw-semibold text-muted mb-1" htmlFor="reminder-reschedule-note">
                            Note <span className="fw-normal">(optional)</span>
                        </label>
                        <span className={`fs-11 ${noteError ? 'text-danger' : 'text-muted'}`}>
                            {trimmedNote.length}/{SNOOZE_NOTE_MAX_LENGTH}
                        </span>
                    </div>
                    <input
                        type="text"
                        id="reminder-reschedule-note"
                        className={`form-control reminder-control ${noteError ? 'is-invalid' : ''}`}
                        maxLength={SNOOZE_NOTE_MAX_LENGTH}
                        placeholder="Why are you rescheduling this?"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') doConfirm(); }}
                        disabled={loading}
                    />
                    {noteError && <div className="invalid-feedback">{noteError}</div>}
                </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
                {onCancel && (
                    <button type="button" className="btn btn-sm btn-light" onClick={onCancel} disabled={loading}>
                        Cancel
                    </button>
                )}
                <button
                    type="button"
                    className="btn btn-sm fw-semibold d-flex align-items-center btn-reminder-secondary"
                    disabled={!canConfirm}
                    onClick={doConfirm}
                >
                    {loading
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Rescheduling...</>
                        : <><i className="ri-check-line me-1"></i>Confirm</>}
                </button>
            </div>
        </div>
    );
};
