import React, { useState, useEffect, useRef } from 'react';

interface TimeInputsProps {
    value: Date | null | undefined;
    onChange: (date: Date) => void;
    disabled?: boolean;
}

// Directly typable HH:MM AM/PM control. PrimeReact's Calendar time-spinner renders
// plain <span> digits with no keyboard input at all, so setting a value like 00
// takes repeated arrow clicks. This replaces that spinner with real <input>s.
export const TimeInputs = ({ value, onChange, disabled }: TimeInputsProps) => {
    const minuteRef = useRef<HTMLInputElement>(null);

    const deriveParts = (date: Date | null | undefined) => {
        const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
        const pm = d.getHours() >= 12;
        let h12 = d.getHours() % 12;
        if (h12 === 0) h12 = 12;
        return { hour: String(h12).padStart(2, '0'), minute: String(d.getMinutes()).padStart(2, '0'), isPM: pm };
    };

    const initial = deriveParts(value);
    const [hour, setHour] = useState(initial.hour);
    const [minute, setMinute] = useState(initial.minute);
    const [isPM, setIsPM] = useState(initial.isPM);

    // Mirrors of hour/minute/isPM that update synchronously (state updates don't,
    // they're batched). Programmatically focusing the minute input from
    // handleHourChange fires the hour input's blur handler before React has
    // applied the pending setHour() — reading state there would commit a stale
    // value (e.g. typing "12" would blur-commit "1"). Blur handlers read these
    // refs instead so they always see what was actually just typed.
    const hourRef = useRef(initial.hour);
    const minuteValRef = useRef(initial.minute);
    const isPMRef = useRef(initial.isPM);

    useEffect(() => {
        const parts = deriveParts(value);
        setHour(parts.hour);
        setMinute(parts.minute);
        setIsPM(parts.isPM);
        hourRef.current = parts.hour;
        minuteValRef.current = parts.minute;
        isPMRef.current = parts.isPM;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value instanceof Date && !isNaN(value.getTime()) ? value.getTime() : null]);

    const commit = (hourStr: string, minuteStr: string, pm: boolean) => {
        const h12 = Math.min(12, Math.max(1, parseInt(hourStr, 10) || 12));
        const min = Math.min(59, Math.max(0, parseInt(minuteStr, 10) || 0));
        let h24 = h12 % 12;
        if (pm) h24 += 12;
        const base = value instanceof Date && !isNaN(value.getTime()) ? new Date(value) : new Date();
        base.setHours(h24, min, 0, 0);
        onChange(base);
    };

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let digits = e.target.value.replace(/\D/g, '').slice(0, 2);
        // Clamp as soon as a full 2-digit value is typed (e.g. "18" -> "12")
        // instead of only correcting it on blur, so an out-of-range value is
        // never left sitting on screen.
        if (digits.length === 2) {
            digits = String(Math.min(12, Math.max(1, parseInt(digits, 10) || 12))).padStart(2, '0');
        }
        setHour(digits);
        hourRef.current = digits;
        if (digits.length === 2) {
            minuteRef.current?.focus();
            minuteRef.current?.select();
        }
    };

    const handleHourBlur = () => {
        const padded = String(Math.min(12, Math.max(1, parseInt(hourRef.current, 10) || 12))).padStart(2, '0');
        setHour(padded);
        hourRef.current = padded;
        commit(padded, minuteValRef.current, isPMRef.current);
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let digits = e.target.value.replace(/\D/g, '').slice(0, 2);
        // Same real-time clamp as the hour input (e.g. "88" -> "59").
        if (digits.length === 2) {
            digits = String(Math.min(59, Math.max(0, parseInt(digits, 10) || 0))).padStart(2, '0');
        }
        setMinute(digits);
        minuteValRef.current = digits;
    };

    const handleMinuteBlur = () => {
        const padded = String(Math.min(59, Math.max(0, parseInt(minuteValRef.current, 10) || 0))).padStart(2, '0');
        setMinute(padded);
        minuteValRef.current = padded;
        commit(hourRef.current, padded, isPMRef.current);
    };

    const toggleAmPm = () => {
        const next = !isPM;
        setIsPM(next);
        isPMRef.current = next;
        commit(hourRef.current, minuteValRef.current, next);
    };

    const stepHour = (delta: number) => {
        let next = (parseInt(hourRef.current, 10) || 12) + delta;
        if (next > 12) next = 1;
        if (next < 1) next = 12;
        const padded = String(next).padStart(2, '0');
        setHour(padded);
        hourRef.current = padded;
        commit(padded, minuteValRef.current, isPMRef.current);
    };

    const stepMinute = (delta: number) => {
        let next = (parseInt(minuteValRef.current, 10) || 0) + delta;
        if (next > 59) next = 0;
        if (next < 0) next = 59;
        const padded = String(next).padStart(2, '0');
        setMinute(padded);
        minuteValRef.current = padded;
        commit(hourRef.current, padded, isPMRef.current);
    };

    const segmentStyle: React.CSSProperties = {
        width: '48px',
        height: '38px',
        padding: 0,
        fontWeight: 600,
        fontSize: '15px',
        color: '#343a40',
        border: '1px solid #ced4da',
        borderRight: 'none',
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0
    };

    const stepBtnStyle: React.CSSProperties = {
        width: '20px',
        height: '19px',
        padding: 0,
        lineHeight: 1,
        color: '#6c757d',
        backgroundColor: '#fff',
        border: '1px solid #ced4da',
        borderLeft: 'none',
        borderRadius: 0,
        boxShadow: 'none',
        outline: 'none'
    };

    // Mousedown on a button gives it focus before the click handler runs,
    // which triggers Bootstrap's default blue focus ring — these are pointer-
    // only controls (typing still goes through the text inputs), so suppress
    // that focus instead of letting it flash on every click.
    const preventFocus = (e: React.MouseEvent) => e.preventDefault();

    const renderStepper = (onUp: () => void, onDown: () => void, label: string) => (
        <div className="d-flex flex-column" style={{ height: segmentStyle.height as string }}>
            <button
                type="button"
                className="btn d-flex align-items-center justify-content-center"
                style={{ ...stepBtnStyle, borderBottom: 'none', borderTopRightRadius: '6px' }}
                onMouseDown={preventFocus}
                onClick={onUp}
                disabled={disabled}
                tabIndex={-1}
                aria-label={`Increase ${label}`}
            >
                <i className="ri-arrow-up-s-line"></i>
            </button>
            <button
                type="button"
                className="btn d-flex align-items-center justify-content-center"
                style={{ ...stepBtnStyle, borderBottomRightRadius: '6px' }}
                onMouseDown={preventFocus}
                onClick={onDown}
                disabled={disabled}
                tabIndex={-1}
                aria-label={`Decrease ${label}`}
            >
                <i className="ri-arrow-down-s-line"></i>
            </button>
        </div>
    );

    const amPmStyle: React.CSSProperties = {
        width: '54px',
        height: '38px',
        padding: 0,
        fontWeight: 600,
        fontSize: '15px',
        color: '#343a40',
        border: '1px solid #ced4da',
        borderRadius: '6px',
        backgroundColor: '#fff'
    };

    return (
        <div
            className="d-flex align-items-center justify-content-center gap-2"
            style={{ padding: '12px 16px', borderTop: '1px solid #e9ecef' }}
        >
            <div className="d-flex">
                <input
                    type="text"
                    inputMode="numeric"
                    className="form-control text-center"
                    style={segmentStyle}
                    value={hour}
                    onChange={handleHourChange}
                    onBlur={handleHourBlur}
                    onFocus={(e) => e.target.select()}
                    disabled={disabled}
                    maxLength={2}
                    aria-label="Hour"
                />
                {renderStepper(() => stepHour(1), () => stepHour(-1), 'hour')}
            </div>
            <span className="fw-semibold text-muted">:</span>
            <div className="d-flex">
                <input
                    ref={minuteRef}
                    type="text"
                    inputMode="numeric"
                    className="form-control text-center"
                    style={segmentStyle}
                    value={minute}
                    onChange={handleMinuteChange}
                    onBlur={handleMinuteBlur}
                    onFocus={(e) => e.target.select()}
                    disabled={disabled}
                    maxLength={2}
                    aria-label="Minute"
                />
                {renderStepper(() => stepMinute(1), () => stepMinute(-1), 'minute')}
            </div>
            <button
                type="button"
                className="btn btn-outline-secondary"
                style={amPmStyle}
                onClick={toggleAmPm}
                disabled={disabled}
            >
                {isPM ? 'PM' : 'AM'}
            </button>
        </div>
    );
};
