import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MergeFieldsContext } from './mergeFieldsContext';
import { GroupModal, groupIcon } from './DynamicValueGroups';

interface MergeChipMenuProps {
    /** The clicked chip; the menu opens under it. */
    chip: HTMLElement;
    onPick: (key: string) => void;
    onRemove: () => void;
    onClose: () => void;
}

const MENU_WIDTH = 280;

/**
 * Click a blue field (merge chip) to choose what it is filled with, or to
 * remove it. As Insert Dynamic Value, the groups come first (the field's own
 * group marked); a group opens in a modal with its values, the field's checked.
 * Escape closes an open group first, then the menu.
 */
export const MergeChipMenu: React.FC<MergeChipMenuProps> = ({ chip, onPick, onRemove, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [openGroup, setOpenGroup] = useState<string | null>(null);
    const current = chip.getAttribute('data-merge');
    const fields = useContext(MergeFieldsContext);
    const groups = Array.from(new Set(fields.map((f) => f.group)));
    const currentField = fields.find((f) => f.key === current);
    const inGroup = (group: string) => fields.filter((f) => f.group === group);

    useLayoutEffect(() => {
        const rect = chip.getBoundingClientRect();
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8));
        setPosition({ top: rect.bottom + 6, left });
    }, [chip]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (openGroup) setOpenGroup(null);
            else onClose();
        };
        const onDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (menuRef.current?.contains(target) || target === chip) return;
            // The group's modal sits over the menu: a click there is not outside.
            if (target instanceof Element && target.closest('.ab4-insert-group-backdrop')) return;
            onClose();
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onDown);
        };
    }, [chip, onClose, openGroup]);

    return createPortal(
        <>
            <div ref={menuRef} role="menu" aria-label="Fill this field with" className="ab4-chip-menu"
                style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
                // Keep the cursor in the text being edited.
                onMouseDown={(e) => e.preventDefault()}>
                <div className="ab4-chip-menu__title">Fill this field with</div>
                {currentField && (
                    <div className="ab4-chip-menu__current">
                        <i className="ri-braces-line" aria-hidden="true" />
                        <span>{currentField.label}</span>
                    </div>
                )}
                {groups.map((group) => {
                    const own = currentField?.group === group;
                    return (
                        <button key={group} type="button" role="menuitem" aria-haspopup="dialog" aria-label={group}
                            className={`ab4-insert-popover__group-btn ab4-chip-menu__group-btn ${own ? 'is-current' : ''}`}
                            onClick={() => setOpenGroup(group)}>
                            <span className="ab4-insert-popover__group-icon" aria-hidden="true"><i className={groupIcon(group)} /></span>
                            <span className="ab4-insert-popover__group-name">{group}</span>
                            <span className="ab4-insert-popover__group-count">{inGroup(group).length}</span>
                            <i className={`${own ? 'ri-check-line' : 'ri-arrow-right-s-line'} ab4-insert-popover__group-chevron`} aria-hidden="true" />
                        </button>
                    );
                })}
                <button type="button" role="menuitem" className="ab4-chip-menu__remove" onClick={onRemove}>
                    <i className="ri-delete-bin-line" aria-hidden="true" /> Remove field
                </button>
            </div>
            {openGroup && (
                <GroupModal
                    group={openGroup}
                    fields={inGroup(openGroup)}
                    current={current}
                    onPick={(key) => { setOpenGroup(null); onPick(key); }}
                    onClose={() => setOpenGroup(null)}
                />
            )}
        </>,
        document.body,
    );
};
