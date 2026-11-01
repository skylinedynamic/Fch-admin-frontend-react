import React, { useState, useRef, useEffect } from 'react';

interface CustomSelectProps {
    value: string;
    onChange: (val: string) => void;
    options: Array<{ value: string; label: string }>;
    label?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, label }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
    }, []);
    const active = options.find(o => o.value === value) || options[0];

    return (
        <div className="ab4-cs-root" ref={ref}>
            {label && <label className="ab4-pl">{label}</label>}
            <div className={`ab4-cs-trigger ${open ? 'ab4-cs--open' : ''}`} onClick={() => setOpen(!open)}>
                <span style={{ fontFamily: active.value }}>{active.label}</span>
                <i className="ri-arrow-down-s-line" />
            </div>
            {open && (
                <div className="ab4-cs-menu">
                    {options.map(o => (
                        <div key={o.value} className={`ab4-cs-opt ${o.value === value ? 'ab4-cs-opt--sel' : ''}`}
                            onClick={() => { onChange(o.value); setOpen(false); }} style={{ fontFamily: o.value }}>
                            {o.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface SwitchProps {
    checked: boolean;
    onChange: (val: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled }) => (
    <div
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        className={`ab4-switch ${checked ? 'ab4-switch--on' : ''} ${disabled ? 'opacity-50' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        style={{ pointerEvents: disabled ? 'none' : 'auto' }}
    >
        <div className="ab4-switch-track"><div className="ab4-switch-thumb" /></div>
        {label && <span className="ms-2">{label}</span>}
    </div>
);
