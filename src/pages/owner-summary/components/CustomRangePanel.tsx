import { useState, type FormEvent } from 'react';
import { Calendar } from 'primereact/calendar';
import { toLocalYmd } from '../../../utils/dates';
import { lastYearRange } from './format';

export interface CustomRange {
    from: string;
    to: string;
}

export interface CustomRangeErrors {
    from?: string;
    to?: string;
}

interface CustomRangePanelProps {
    /** Why the API refused the last range applied, per field. */
    errors: CustomRangeErrors;
    busy: boolean;
    onApply: (range: CustomRange) => void;
}

/**
 * The From and To dates of a custom period. Nothing is asked for until Apply.
 * The calendars only stop obviously impossible picks; the API decides what is
 * allowed, and its reasons show under the field they are about.
 */
export default function CustomRangePanel({ errors, busy, onApply }: CustomRangePanelProps) {
    const [{ from: initialFrom, to: initialTo }] = useState(() => lastYearRange());
    const [from, setFrom] = useState<Date | null>(initialFrom);
    const [to, setTo] = useState<Date | null>(initialTo);
    // The reasons are about what was applied, not about a date changed since.
    const [edited, setEdited] = useState(false);
    const today = new Date();

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setEdited(false);
        onApply({ from: toLocalYmd(from) ?? '', to: toLocalYmd(to) ?? '' });
    };

    const fieldError = (field: keyof CustomRangeErrors) =>
        !edited && errors[field] ? <div className="text-danger mt-1 small">{errors[field]}</div> : null;

    return (
        <form className="os-card os-range" onSubmit={submit} noValidate>
            <div className="os-range__field" data-field="from">
                <label htmlFor="owner-range-from" className="os-range__label">From</label>
                <div className="custom-datepicker">
                    <Calendar
                        inputId="owner-range-from"
                        value={from}
                        onChange={(event) => { setFrom((event.value as Date | null) ?? null); setEdited(true); }}
                        maxDate={to ?? today}
                        dateFormat="dd M, yy"
                        placeholder="Select date"
                        showIcon
                        className="w-100"
                        appendTo="self"
                        readOnlyInput
                    />
                </div>
                {fieldError('from')}
            </div>
            <div className="os-range__field" data-field="to">
                <label htmlFor="owner-range-to" className="os-range__label">To</label>
                <div className="custom-datepicker">
                    <Calendar
                        inputId="owner-range-to"
                        value={to}
                        onChange={(event) => { setTo((event.value as Date | null) ?? null); setEdited(true); }}
                        minDate={from ?? undefined}
                        maxDate={today}
                        dateFormat="dd M, yy"
                        placeholder="Select date"
                        showIcon
                        className="w-100"
                        appendTo="self"
                        readOnlyInput
                    />
                </div>
                {fieldError('to')}
            </div>
            <button type="submit" className="os-btn os-btn--primary os-range__apply" disabled={busy}>Apply</button>
            <p className="os-range__note">
                Not in the future. Compared with the same number of days just before.
            </p>
        </form>
    );
}
