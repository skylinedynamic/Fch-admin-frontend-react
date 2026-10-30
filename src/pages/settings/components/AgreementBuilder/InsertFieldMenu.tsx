import React, { useState } from 'react';
import { AGREEMENT_MERGE_FIELDS, mergeFieldToken } from '../../../../config/agreementMergeFields';
import { createMergeChip } from './mergeChips';

interface InsertFieldMenuProps {
    /** The selected text block's content, for when no text is being edited. */
    content: string;
    onAppend: (content: string) => void;
}

/**
 * Puts the field, as a chip, at the cursor of the text being edited, firing
 * `input` so the block saves it as if typed. Returns false when no text is being edited.
 */
const insertAtCursor = (key: string): boolean => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    const editor = (range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement)
        ?.closest('.ab4-editor');
    if (!editor) return false;

    range.deleteContents();
    const node = createMergeChip(key);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
};

/**
 * "Insert field": merge fields such as {{signer.name}} that the server fills
 * with the signer's details (see config/agreementMergeFields).
 */
export const InsertFieldMenu: React.FC<InsertFieldMenuProps> = ({ content, onAppend }) => {
    const [open, setOpen] = useState(false);
    const groups = Array.from(new Set(AGREEMENT_MERGE_FIELDS.map((f) => f.group)));

    const insert = (key: string) => {
        if (!insertAtCursor(key)) onAppend(content + mergeFieldToken(key));
        setOpen(false);
    };

    return (
        <div className="ab4-insert-field">
            <button
                type="button"
                className={`ab4-insert-field__toggle ${open ? 'is-open' : ''}`}
                aria-haspopup="menu"
                aria-expanded={open}
                // Keep the cursor in the text being edited.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen(!open)}
            >
                <i className="ri-braces-line" />
                <span>Insert field</span>
                <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line ms-auto`} />
            </button>
            {open && (
                <div role="menu" className="ab4-insert-field__menu">
                    {groups.map((group) => (
                        <div key={group} className="ab4-insert-field__group">
                            <div className="ab4-insert-field__group-title">{group}</div>
                            {AGREEMENT_MERGE_FIELDS.filter((f) => f.group === group).map((f) => (
                                <button
                                    key={f.key}
                                    type="button"
                                    role="menuitem"
                                    className="ab4-insert-field__item"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => insert(f.key)}
                                >
                                    <span className="ab4-insert-field__label">{f.label}</span>
                                    <code className="ab4-insert-field__token" aria-hidden="true">{f.key}</code>
                                </button>
                            ))}
                        </div>
                    ))}
                    <div className="ab4-insert-field__hint">
                        <i className="ri-information-line" /> Filled with the signer's details when they sign.
                    </div>
                </div>
            )}
        </div>
    );
};
