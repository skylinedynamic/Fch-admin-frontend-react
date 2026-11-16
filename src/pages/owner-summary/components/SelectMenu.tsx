import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface SelectMenuOption<T extends string> {
    value: T;
    label: string;
}

interface SelectMenuProps<T extends string> {
    /** Shown before the button and used as the list's name. */
    label: string;
    value: T;
    options: SelectMenuOption<T>[];
    onChange: (value: T) => void;
    width?: number;
}

/**
 * The app's own dropdown in place of the browser's select: a field-sized
 * button that opens a list (listbox) of options. Arrow keys move through the
 * list, Enter picks, Escape or a click outside closes it.
 */
export default function SelectMenu<T extends string>({ label, value, options, onChange, width = 180 }: SelectMenuProps<T>) {
    const [open, setOpen] = useState(false);
    const wrapper = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const labelId = useId();
    const valueId = useId();
    const listId = useId();
    const current = options.find((option) => option.value === value) ?? options[0];

    useEffect(() => {
        if (!open) return undefined;
        wrapper.current?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"]')?.focus();
        const closeOnOutside = (event: MouseEvent) => {
            if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', closeOnOutside);
        return () => document.removeEventListener('mousedown', closeOnOutside);
    }, [open]);

    const close = () => {
        setOpen(false);
        trigger.current?.focus();
    };

    const choose = (next: T) => {
        onChange(next);
        close();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape' && open) {
            event.preventDefault();
            close();
            return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        if (!open) {
            setOpen(true);
            return;
        }
        const items = Array.from(wrapper.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
        const at = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
        items[next]?.focus();
    };

    return (
        <div className="os-select" onKeyDown={onKeyDown}>
            <span className="os-select__label" id={labelId}>{label}</span>
            <div className="os-menu-wrap" ref={wrapper} style={{ width }}>
                <button
                    ref={trigger}
                    type="button"
                    className="os-field os-select__trigger"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-controls={open ? listId : undefined}
                    aria-labelledby={`${labelId} ${valueId}`}
                    onClick={() => setOpen((was) => !was)}
                >
                    <span id={valueId} className="os-select__value">{current?.label}</span>
                    <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line os-select__caret`} aria-hidden="true"></i>
                </button>
                {open && (
                    <div className="os-menu os-select__list" role="listbox" id={listId} aria-labelledby={labelId}>
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={option.value === value}
                                className="os-select__option"
                                onClick={() => choose(option.value)}
                            >
                                <span>{option.label}</span>
                                {option.value === value && <i className="ri-check-line" aria-hidden="true"></i>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
