import React, { useState } from 'react';
import { SNOOZE_MAX_MINUTES, formatSnoozeMinutes } from '../../config/reminders';

export const SNOOZE_NOTE_MAX_LENGTH = 1000;

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

const SNOOZE_PRESETS = [5, 10, 15, 30, 60, 1440];

// Snooze a reminder for any number of minutes, with an optional note on why.
// Shared by the due-reminder popup and the Task & Reminder Details modal.
export default function ReminderSnoozeForm({ loading, serverErrors, onConfirm, onCancel }: ReminderSnoozeFormProps) {
    const [minutesInput, setMinutesInput] = useState('15');
    const [note, setNote] = useState('');
    // Server errors belong to the values that were submitted — hide each one
    // as soon as the user changes that field.
    const [dirty, setDirty] = useState<ReminderSnoozeErrors>({});

    const trimmedMinutes = minutesInput.trim();
    const minutes = Number(trimmedMinutes);
    const minutesError = trimmedMinutes === '' || !/^\d+$/.test(trimmedMinutes) || minutes < 1 || minutes > SNOOZE_MAX_MINUTES
        ? `Enter a whole number of minutes between 1 and ${SNOOZE_MAX_MINUTES}.`
        : (!dirty.minutes && serverErrors?.minutes) || null;

    const trimmedNote = note.trim();
    const noteError = trimmedNote.length > SNOOZE_NOTE_MAX_LENGTH
        ? `The note may not be longer than ${SNOOZE_NOTE_MAX_LENGTH} characters.`
        : (!dirty.note && serverErrors?.note) || null;

    // A server error also blocks resubmitting until that field is changed.
    const canSubmit = !minutesError && !noteError && !loading;

    const setMinutes = (value: string) => {
        setMinutesInput(value);
        setDirty((d) => ({ ...d, minutes: 'changed' }));
    };

    const submit = () => {
        if (!canSubmit) return;
        setDirty({});
        onConfirm(minutes, trimmedNote);
    };

    return (
        <div className="reminder-snooze-panel rounded border p-3 mb-3">
            <label className="form-label fs-12 fw-semibold text-muted mb-2">Snooze for</label>
            <div className="d-flex flex-wrap gap-2 mb-3">
                {SNOOZE_PRESETS.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        className={`btn btn-sm ${trimmedMinutes !== '' && minutes === preset ? 'btn-primary' : 'btn-light'}`}
                        onClick={() => setMinutes(String(preset))}
                        disabled={loading}
                    >
                        {formatSnoozeMinutes(preset)}
                    </button>
                ))}
            </div>

            <div className="row g-2 mb-2">
                <div className="col-5">
                    <label className="form-label fs-12 fw-semibold text-muted mb-1">Custom minutes</label>
                    <div className="input-group has-validation">
                        <input
                            type="number"
                            inputMode="numeric"
                            className={`form-control reminder-lead-value ${minutesError ? 'is-invalid' : ''}`}
                            min={1}
                            max={SNOOZE_MAX_MINUTES}
                            step={1}
                            value={minutesInput}
                            onChange={(e) => setMinutes(e.target.value)}
                            onKeyDown={(e) => {
                                // Whole minutes only
                                if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
                                if (e.key === 'Enter') submit();
                            }}
                            disabled={loading}
                        />
                        <span className="input-group-text">min</span>
                    </div>
                </div>
                <div className="col-7">
                    <div className="d-flex justify-content-between align-items-baseline">
                        <label className="form-label fs-12 fw-semibold text-muted mb-1">
                            Note <span className="fw-normal">(optional)</span>
                        </label>
                        <span className={`fs-11 ${trimmedNote.length > SNOOZE_NOTE_MAX_LENGTH ? 'text-danger' : 'text-muted'}`}>
                            {trimmedNote.length}/{SNOOZE_NOTE_MAX_LENGTH}
                        </span>
                    </div>
                    <textarea
                        className={`form-control ${noteError ? 'is-invalid' : ''}`}
                        rows={2}
                        maxLength={SNOOZE_NOTE_MAX_LENGTH}
                        placeholder="Why are you snoozing this?"
                        value={note}
                        onChange={(e) => {
                            setNote(e.target.value);
                            setDirty((d) => ({ ...d, note: 'changed' }));
                        }}
                        disabled={loading}
                    />
                </div>
            </div>
            {minutesError && <div className="text-danger small mb-1">{minutesError}</div>}
            {noteError && <div className="text-danger small mb-1">{noteError}</div>}

            <div className="d-flex justify-content-end gap-2 mt-2">
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
