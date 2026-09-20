import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Calendar } from 'primereact/calendar';
import { TimeInputs } from './TimeInputs';
import { REMINDER_PRESETS, getReminderMsToSubtract } from '../../config/appConfig';

export interface ReminderRescheduleFormHandle {
    confirm: () => void;
}

interface ReminderRescheduleFormProps {
    loading?: boolean;
    // rescheduleAt is the naive 'Y-m-d H:i:s' string the backend expects
    // (interpreted server-side using the X-Timezone header); leadMinutes is
    // how long before rescheduleAt to fire the alert.
    onConfirm: (rescheduleAt: string, leadMinutes: number) => void;
    // When the lead time is the simple preset dropdown (not "Custom Time
    // Before"), the due-reminder popup wants Confirm to sit in its own row
    // next to the unrelated "All Reminders" link rather than beside Date &
    // Time/Remind Me — something only the caller can lay out. Set this to
    // suppress the built-in Confirm button in that case; drive it instead via
    // the forwarded ref's confirm() and the onValidityChange/onModeChange
    // callbacks. Custom mode is unaffected — Confirm always stays grouped
    // with Value/Unit there regardless of this prop.
    externalConfirm?: boolean;
    onValidityChange?: (canConfirm: boolean) => void;
    onModeChange?: (isCustomLead: boolean) => void;
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
// drifting apart as separate copies.
export const ReminderRescheduleForm = forwardRef<ReminderRescheduleFormHandle, ReminderRescheduleFormProps>(({
    loading,
    onConfirm,
    externalConfirm,
    onValidityChange,
    onModeChange,
}, ref) => {
    // Default the picker to a sensible starting point instead of blank, so
    // there's less to fill in.
    const [customRescheduleDate, setCustomRescheduleDate] = useState<Date | null>(
        () => new Date(Date.now() + 60 * 60 * 1000)
    );
    const [rescheduleLeadPreset, setRescheduleLeadPreset] = useState('15_minutes');
    const [rescheduleLeadValue, setRescheduleLeadValue] = useState('1');
    const [rescheduleLeadUnit, setRescheduleLeadUnit] = useState('Hours');

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
    const rescheduleLeadError = isLeadValueInvalid
        ? `Enter a value between 1 and ${MAX_CUSTOM_LEAD_VALUE}.`
        : (rescheduleAlertTime && rescheduleAlertTime.getTime() < Date.now()
            ? 'This reminder time calculates to a past date/time.'
            : null);
    const canConfirm = !!customRescheduleDate && !rescheduleLeadError && !loading;

    const doConfirm = () => {
        if (!customRescheduleDate || rescheduleLeadError) return;
        onConfirm(toLocalDbString(customRescheduleDate), Math.round(rescheduleLeadMs / 60000));
    };

    useImperativeHandle(ref, () => ({ confirm: doConfirm }), [customRescheduleDate, rescheduleLeadError, rescheduleLeadMs]);

    useEffect(() => {
        onValidityChange?.(canConfirm);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canConfirm]);

    useEffect(() => {
        onModeChange?.(isCustomLead);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCustomLead]);

    // Date & Time always gets more room than Remind Me on the first row — the
    // date/time text (e.g. "03 Sep, 2026 12:39 PM") needs it to avoid
    // clipping the AM/PM portion. Custom mode needs a second row for Value/
    // Unit/Confirm below, split evenly (col-4/col-4/col-4).
    //
    // Without those extra fields: when externalConfirm is set, the caller
    // renders Confirm itself (e.g. next to "All Reminders" in the due-
    // reminder popup) and this component renders no Confirm button, so Date &
    // Time/Remind Me split the row alone (col-7/col-5) — same split as custom
    // mode's row 1. Otherwise (the Task & Reminder Details modal) Confirm
    // renders inline here too, sharing the row (col-6/col-4/col-2).
    //
    // Plain col-* (not col-md-*) throughout — col-md-* only applies at/above
    // a 768px browser viewport, which has nothing to do with this modal's
    // actual pixel width, so below that breakpoint those columns had no
    // width class at all and could overflow.
    const dateTimeColClass = (isCustomLead || externalConfirm) ? 'col-7' : 'col-6';
    const remindMeColClass = (isCustomLead || externalConfirm) ? 'col-5' : 'col-4';
    const valueColClass = 'col-4';
    const unitColClass = 'col-4';
    const confirmColClass = isCustomLead ? 'col-4' : 'col-2';

    const confirmButton = (
        <button
            type="button"
            className="btn fw-semibold d-flex align-items-center justify-content-center btn-reminder-secondary w-100"
            style={{ height: '38px' }}
            disabled={!canConfirm}
            onClick={doConfirm}
        >
            {loading ? (
                <span className="spinner-border spinner-border-sm"></span>
            ) : (
                <><i className="ri-check-line me-1 fs-16"></i> Confirm</>
            )}
        </button>
    );

    return (
        <div className="mb-3">
            <style>{`
                .reminder-reschedule-picker .p-timepicker {
                    display: none;
                }
                .reminder-lead-value::-webkit-outer-spin-button,
                .reminder-lead-value::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .reminder-lead-value {
                    -moz-appearance: textfield;
                }
            `}</style>
            <div className="row g-2">
                <div className={dateTimeColClass}>
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
                            inputStyle={{ height: '38px' }}
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
                </div>

                <div className={remindMeColClass}>
                    <label className="form-label fs-12 fw-semibold text-muted mb-1">Remind Me</label>
                    <select
                        className="form-select w-100"
                        style={{ height: '38px' }}
                        value={rescheduleLeadPreset}
                        onChange={(e) => setRescheduleLeadPreset(e.target.value)}
                    >
                        {REMINDER_PRESETS.map((preset: any) => (
                            <option key={preset.value} value={preset.value}>{preset.label}</option>
                        ))}
                    </select>
                </div>

                {isCustomLead && (
                    <>
                        <div className={valueColClass}>
                            <label className="form-label fs-12 fw-semibold text-muted mb-1">Value</label>
                            <input
                                type="number"
                                className={`form-control w-100 reminder-lead-value ${isLeadValueInvalid ? 'is-invalid' : ''}`}
                                style={{ height: '38px' }}
                                min="1"
                                max={MAX_CUSTOM_LEAD_VALUE}
                                value={rescheduleLeadValue}
                                onChange={(e) => setRescheduleLeadValue(e.target.value)}
                            />
                        </div>
                        <div className={unitColClass}>
                            <label className="form-label fs-12 fw-semibold text-muted mb-1">Unit</label>
                            <select
                                className="form-select w-100"
                                style={{ height: '38px' }}
                                value={rescheduleLeadUnit}
                                onChange={(e) => setRescheduleLeadUnit(e.target.value)}
                            >
                                <option value="Minutes">Minutes</option>
                                <option value="Hours">Hours</option>
                                <option value="Days">Days</option>
                                <option value="Weeks">Weeks</option>
                                <option value="Months">Months</option>
                            </select>
                        </div>
                        <div className={confirmColClass}>
                            {/* Confirm sits beside the labeled Value/Unit fields here,
                                so it needs the same blank spacer label to stay
                                aligned with their inputs. */}
                            <label className="form-label fs-12 fw-semibold text-muted mb-1">&nbsp;</label>
                            {confirmButton}
                        </div>
                    </>
                )}

                {!isCustomLead && !externalConfirm && (
                    <div className={confirmColClass}>
                        <label className="form-label fs-12 fw-semibold text-muted mb-1">&nbsp;</label>
                        {confirmButton}
                    </div>
                )}
            </div>
            {rescheduleLeadError && (
                <div className="text-danger mt-2 small">{rescheduleLeadError}</div>
            )}
        </div>
    );
});

ReminderRescheduleForm.displayName = 'ReminderRescheduleForm';
