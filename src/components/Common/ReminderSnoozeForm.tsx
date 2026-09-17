import React, { useEffect, useRef, useState } from 'react';
import { SNOOZE_MAX_MINUTES, formatSnoozeMinutes } from '../../config/reminders';

export const SNOOZE_NOTE_MAX_LENGTH = 200;

export interface ReminderSnoozeErrors {
    minutes?: string;
    note?: string;
}

interface ReminderSnoozeFormProps {
    loading?: boolean;
    // Field errors returned by the API (422), shown under the matching input.
    serverErrors?: ReminderSnoozeErrors | null;
    onConfirm: (minutes: number, note: string) => void;
    onCancel: () => void;
}

const SNOOZE_PRESETS = [5, 10, 15, 30, 45, 60, 120, 240, 480, SNOOZE_MAX_MINUTES];
const CUSTOM = 'custom';

// Snooze a reminder for any length of time, with an optional note on why.
// Shared by the due-reminder popup and the Task & Reminder Details modal, and
// laid out like the Reschedule panel: the time on the first line, the note on
// its own line, then Cancel / Snooze.
export default function ReminderSnoozeForm({ loading, serverErrors, onConfirm, onCancel }: ReminderSnoozeFormProps) {
    const [preset, setPreset] = useState<string>('15');
    const [customMinutes, setCustomMinutes] = useState('45');
    const [note, setNote] = useState('');
    // Server errors belong to the values that were submitted — hide each one
    // as soon as the user changes that field.
    const [dirty, setDirty] = useState<ReminderSnoozeErrors>({});
    const panelRef = useRef<HTMLDivElement>(null);

    // The panel opens below the action buttons — in the popup's scrolling body
    // that can be off-screen, so bring it into view (never scrolling the page
    // itself, only the nearest scrollable ancestor).
    useEffect(() => {
        panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, []);

    const isCustom = preset === CUSTOM;
    const rawMinutes = isCustom ? customMinutes.trim() : preset;
    const minutes = Number(rawMinutes);
    const minutesError = rawMinutes === '' || !/^\d+$/.test(rawMinutes) || minutes < 1 || minutes > SNOOZE_MAX_MINUTES
        ? `Enter a whole number of minutes between 1 and ${SNOOZE_MAX_MINUTES}.`
        : (!dirty.minutes && serverErrors?.minutes) || null;

    const trimmedNote = note.trim();
    const noteError = trimmedNote.length > SNOOZE_NOTE_MAX_LENGTH
        ? `The note may not be longer than ${SNOOZE_NOTE_MAX_LENGTH} characters.`
        : (!dirty.note && serverErrors?.note) || null;

    // A server error also blocks resubmitting until that field is changed.
    const canSubmit = !minutesError && !noteError && !loading;

    const markMinutesDirty = () => setDirty((d) => ({ ...d, minutes: 'changed' }));

    const submit = () => {
        if (!canSubmit) return;
        setDirty({});
        onConfirm(minutes, trimmedNote);
    };

    return (
        <div ref={panelRef} className="reminder-snooze-panel rounded border p-3">
            <div className="row g-2">
                <div className={isCustom ? 'col-6' : 'col-12'}>
                    <label className="form-label fs-12 fw-semibold text-muted mb-1" htmlFor="reminder-snooze-for">
                        Snooze for
                    </label>
                    <select
                        id="reminder-snooze-for"
                        className={`form-select reminder-control ${!isCustom && minutesError ? 'is-invalid' : ''}`}
                        value={preset}
                        onChange={(e) => { setPreset(e.target.value); markMinutesDirty(); }}
                        disabled={loading}
                    >
                        {SNOOZE_PRESETS.map((value) => (
                            <option key={value} value={String(value)}>{formatSnoozeMinutes(value)}</option>
                        ))}
                        <option value={CUSTOM}>Custom…</option>
                    </select>
                    {!isCustom && minutesError && <div className="invalid-feedback d-block">{minutesError}</div>}
                </div>

                {isCustom && (
                    <div className="col-6">
                        <label className="form-label fs-12 fw-semibold text-muted mb-1" htmlFor="reminder-snooze-minutes">
                            Minutes
                        </label>
                        <div className="input-group has-validation">
                            <input
                                type="number"
                                id="reminder-snooze-minutes"
                                inputMode="numeric"
                                className={`form-control reminder-control reminder-lead-value ${minutesError ? 'is-invalid' : ''}`}
                                min={1}
                                max={SNOOZE_MAX_MINUTES}
                                step={1}
                                value={customMinutes}
                                onChange={(e) => { setCustomMinutes(e.target.value); markMinutesDirty(); }}
                                onKeyDown={(e) => {
                                    // Whole minutes only
                                    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
                                    if (e.key === 'Enter') submit();
                                }}
                                disabled={loading}
                                autoFocus
                            />
                            <span className="input-group-text">min</span>
                            {minutesError && <div className="invalid-feedback">{minutesError}</div>}
                        </div>
                    </div>
                )}

                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-baseline">
                        <label className="form-label fs-12 fw-semibold text-muted mb-1" htmlFor="reminder-snooze-note">
                            Note <span className="fw-normal">(optional)</span>
                        </label>
                        <span className={`fs-11 ${trimmedNote.length > SNOOZE_NOTE_MAX_LENGTH ? 'text-danger' : 'text-muted'}`}>
                            {trimmedNote.length}/{SNOOZE_NOTE_MAX_LENGTH}
                        </span>
                    </div>
                    <input
                        type="text"
                        id="reminder-snooze-note"
                        className={`form-control reminder-control ${noteError ? 'is-invalid' : ''}`}
                        maxLength={SNOOZE_NOTE_MAX_LENGTH}
                        placeholder="Why are you snoozing this?"
                        value={note}
                        onChange={(e) => {
                            setNote(e.target.value);
                            setDirty((d) => ({ ...d, note: 'changed' }));
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                        disabled={loading}
                    />
                    {noteError && <div className="invalid-feedback">{noteError}</div>}
                </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
                <button type="button" className="btn btn-sm btn-light" onClick={onCancel} disabled={loading}>
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-sm fw-semibold d-flex align-items-center btn-reminder-secondary"
                    onClick={submit}
                    disabled={!canSubmit}
                >
                    {loading
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Snoozing...</>
                        : <><i className="ri-timer-line me-1"></i>Snooze{minutesError ? '' : ` ${formatSnoozeMinutes(minutes)}`}</>}
                </button>
            </div>
        </div>
    );
}
