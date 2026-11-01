import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AGREEMENT_MERGE_FIELDS } from '../../../../config/agreementMergeFields';

interface MergeChipMenuProps {
    /** The clicked chip; the menu opens under it. */
    chip: HTMLElement;
    onPick: (key: string) => void;
    onRemove: () => void;
    onClose: () => void;
}

const MENU_WIDTH = 260;

/**
 * Click a blue field (merge chip) to choose what it is filled with - the
 * signer's or your company's details, or today's date - or to remove it.
 */
export const MergeChipMenu: React.FC<MergeChipMenuProps> = ({ chip, onPick, onRemove, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const current = chip.getAttribute('data-merge');
    const groups = Array.from(new Set(AGREEMENT_MERGE_FIELDS.map((f) => f.group)));

    useLayoutEffect(() => {
        const rect = chip.getBoundingClientRect();
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8));
        setPosition({ top: rect.bottom + 6, left });
    }, [chip]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        const onDown = (e: MouseEvent) => {
            if (!menuRef.current?.contains(e.target as Node) && e.target !== chip) onClose();
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onDown);
        };
    }, [chip, onClose]);

    return createPortal(
        <div ref={menuRef} role="menu" aria-label="Fill this field with" className="ab4-chip-menu"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            // Keep the cursor in the text being edited.
            onMouseDown={(e) => e.preventDefault()}>
            <div className="ab4-chip-menu__title">Fill this field with</div>
            {groups.map((group) => (
                <div key={group} className="ab4-chip-menu__group">
                    <div className="ab4-chip-menu__group-title">{group}</div>
                    {AGREEMENT_MERGE_FIELDS.filter((f) => f.group === group).map((f) => (
                        <button key={f.key} type="button" role="menuitemradio" aria-checked={f.key === current}
                            className={`ab4-chip-menu__item ${f.key === current ? 'is-current' : ''}`}
                            onClick={() => onPick(f.key)}>
                            <span>{f.label}</span>
                            <span className="ab4-chip-menu__sample">{f.sample}</span>
                            {f.key === current && <i className="ri-check-line ab4-chip-menu__check" aria-hidden="true" />}
                        </button>
                    ))}
                </div>
            ))}
            <button type="button" role="menuitem" className="ab4-chip-menu__remove" onClick={onRemove}>
                <i className="ri-delete-bin-line" aria-hidden="true" /> Remove field
            </button>
        </div>,
        document.body,
    );
};
