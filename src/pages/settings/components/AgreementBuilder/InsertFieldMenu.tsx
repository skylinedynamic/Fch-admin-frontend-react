import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { mergeFieldSnippet, mergeFieldToken, type AgreementMergeField } from '../../../../config/agreementMergeFields';
import { createMergeChip, decorateMergeFields } from './mergeChips';
import { MergeFieldsContext } from './mergeFieldsContext';

interface InsertFieldMenuProps {
    /** The selected text block's content, for when no text is being edited. */
    content: string;
    /** Adds to the selected text block; absent when no text block is selected. */
    onAppend?: (content: string) => void;
    /** No text to put it in (an empty page, or a block without text): adds it in a new text block. */
    onAddNew: (token: string) => void;
}

const POPOVER_WIDTH = 360;
const VIEWPORT_MARGIN = 12;

/** An icon for each group; every Plan & Fee group shares the price tag. */
const groupIcon = (group: string): string => {
    if (group === 'Signer') return 'ri-user-3-line';
    if (group === 'Your company') return 'ri-building-2-line';
    if (group.startsWith('Plan & Fee')) return 'ri-price-tag-3-line';
    return 'ri-calendar-event-line';
};

/** Plan & Fee values carry a real price; the rest are only examples while a template is built. */
const showsValue = (field: AgreementMergeField) => field.key.startsWith('plan.');

/**
 * A Plan & Fee label is "<plan>: <field>" ("Certified Partner · One Time Payment:
 * Total amount"). Shown as the plan's name heading short rows, it never wraps
 * into the price; other labels stay whole.
 */
const splitLabel = (field: AgreementMergeField): { plan: string | null; name: string } => {
    const at = showsValue(field) ? field.label.lastIndexOf(': ') : -1;
    return at > 0 ? { plan: field.label.slice(0, at), name: field.label.slice(at + 2) } : { plan: null, name: field.label };
};

/** A group's rows in order, with a heading wherever the plan changes. */
const withPlanHeadings = (fields: AgreementMergeField[]) =>
    fields.map((field, i) => {
        const { plan, name } = splitLabel(field);
        const previous = i > 0 ? splitLabel(fields[i - 1]).plan : null;
        return { field, name, heading: plan && plan !== previous ? plan : null };
    });

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
    const snippet = mergeFieldSnippet(key);
    let node: Node = createMergeChip(key);
    if (snippet) {
        // The field's title and description as text, then its chip.
        const holder = document.createElement('div');
        holder.innerHTML = decorateMergeFields(snippet);
        const fragment = document.createDocumentFragment();
        while (holder.firstChild) fragment.appendChild(holder.firstChild);
        node = fragment.lastChild ?? node;
        range.insertNode(fragment);
    } else {
        range.insertNode(node);
    }
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
};

/** The label with the searched text marked. */
const Highlighted: React.FC<{ text: string; needle: string }> = ({ text, needle }) => {
    const at = needle ? text.toLowerCase().indexOf(needle) : -1;
    if (at < 0) return <>{text}</>;
    return (
        <>
            {text.slice(0, at)}
            <mark>{text.slice(at, at + needle.length)}</mark>
            {text.slice(at + needle.length)}
        </>
    );
};

/**
 * "Insert Dynamic Value": merge fields such as {{signer.name}} that the server
 * fills when the agreement is signed (see config/agreementMergeFields, and the
 * Plan & Fee values from the API). The list opens in a popover over the page,
 * with a search box, arrow-key and Enter picking, and closes on a click
 * outside or Escape. A value goes at the cursor in the text being edited, else
 * at the end of the selected text block, else in a new text block.
 */
export const InsertFieldMenu: React.FC<InsertFieldMenuProps> = ({ content, onAppend, onAddNew }) => {
    const fields = useContext(MergeFieldsContext);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [position, setPosition] = useState({ top: 0, left: 0, height: 480 });
    const toggleRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    // Where the cursor was in the text being edited: the search box takes the
    // cursor, and the value still goes there.
    const editorRange = useRef<Range | null>(null);

    // Matches the value's name, its group or its key, ignoring case.
    const needle = query.trim().toLowerCase();
    const matching = useMemo(
        () => (needle ? fields.filter((f) => `${f.label} ${f.group} ${f.key}`.toLowerCase().includes(needle)) : fields),
        [fields, needle],
    );
    const groups = Array.from(new Set(matching.map((f) => f.group)));
    // In the order shown, so the arrow keys follow the list on screen.
    const ordered = groups.flatMap((group) => matching.filter((f) => f.group === group));

    const close = () => setOpen(false);

    const toggle = () => {
        if (!open) {
            const selection = window.getSelection();
            const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            const node = range?.startContainer;
            const inEditor = (node instanceof Element ? node : node?.parentElement)?.closest('.ab4-editor');
            editorRange.current = range && inEditor ? range.cloneRange() : null;
        }
        setOpen(!open);
    };

    const insert = (key: string) => {
        if (editorRange.current) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(editorRange.current);
            editorRange.current = null;
        }
        if (!insertAtCursor(key)) {
            const text = mergeFieldSnippet(key) ?? mergeFieldToken(key);
            if (onAppend) onAppend(content + text);
            else onAddNew(text);
        }
        close();
    };

    // A fresh search each time it opens, with the cursor in the box.
    useEffect(() => {
        if (open) {
            setQuery('');
            setActive(0);
            searchRef.current?.focus();
        }
    }, [open]);

    useEffect(() => setActive(0), [needle]);

    // A drawer the full height of the right panel (toolbar to the bottom of the
    // screen), its right edge on the panel's, over the page; kept on screen.
    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const panel = toggleRef.current?.closest('.ab4-props')?.getBoundingClientRect();
            const anchor = panel ?? toggleRef.current?.getBoundingClientRect();
            if (!anchor) return;
            // Flush with the panel's right edge; on its own, kept a margin inside the screen.
            const edge = panel ? 0 : VIEWPORT_MARGIN;
            const left = Math.max(edge, Math.min(anchor.right - POPOVER_WIDTH, window.innerWidth - POPOVER_WIDTH - edge));
            const top = panel ? panel.top : anchor.bottom;
            const bottom = panel ? panel.bottom : window.innerHeight - VIEWPORT_MARGIN;
            setPosition({ top, left, height: Math.max(0, bottom - top) });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open]);

    // A click anywhere outside the button and the popover closes it.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (popoverRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
            close();
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    // The active row stays in view as the arrow keys move.
    useEffect(() => {
        listRef.current?.querySelector('.is-active')?.scrollIntoView?.({ block: 'nearest' });
    }, [active]);

    const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, ordered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (ordered[active]) insert(ordered[active].key);
        }
    };

    return (
        <div className="ab4-insert-field">
            <button
                ref={toggleRef}
                type="button"
                className={`ab4-insert-field__toggle ${open ? 'is-open' : ''}`}
                aria-haspopup="menu"
                aria-expanded={open}
                // Keep the cursor in the text being edited.
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggle}
            >
                <i className="ri-braces-line" />
                <span>Insert Dynamic Value</span>
                <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line ms-auto`} />
            </button>
            {open && createPortal(
                <div
                    ref={popoverRef}
                    role="dialog"
                    aria-label="Insert dynamic value"
                    className="ab4-insert-popover"
                    style={{ top: position.top, left: position.left, width: POPOVER_WIDTH, height: position.height }}
                >
                    <div className="ab4-insert-popover__header">
                        <span className="ab4-insert-popover__icon" aria-hidden="true"><i className="ri-braces-line" /></span>
                        <div className="ab4-insert-popover__heading">
                            <div className="ab4-insert-popover__title">Insert dynamic value</div>
                            <div className="ab4-insert-popover__subtitle">Filled in automatically when the agreement is signed.</div>
                        </div>
                        <button type="button" className="ab4-insert-popover__close" aria-label="Close" onClick={close}>
                            <i className="ri-close-line" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="ab4-insert-popover__search">
                        <i className="ri-search-line" aria-hidden="true" />
                        <input
                            ref={searchRef}
                            type="search"
                            aria-label="Search dynamic values"
                            placeholder="Search dynamic values"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={onSearchKey}
                        />
                        <span className="ab4-insert-popover__count" aria-hidden="true">{matching.length}</span>
                    </div>
                    <div ref={listRef} role="menu" aria-label="Dynamic values" className="ab4-insert-popover__list">
                        {groups.length === 0 && (
                            <div className="ab4-insert-popover__empty">
                                <i className="ri-search-eye-line" aria-hidden="true" />
                                <span>No dynamic values match "{query.trim()}".</span>
                            </div>
                        )}
                        {groups.map((group) => (
                            <div key={group} className="ab4-insert-popover__group">
                                <div className="ab4-insert-popover__group-title">
                                    <i className={groupIcon(group)} aria-hidden="true" />
                                    <span>{group}</span>
                                    <span className="ab4-insert-popover__group-count">{matching.filter((f) => f.group === group).length}</span>
                                </div>
                                {withPlanHeadings(matching.filter((f) => f.group === group)).map(({ field: f, name, heading }) => {
                                    const index = ordered.indexOf(f);
                                    return (
                                        <React.Fragment key={f.key}>
                                            {heading && (
                                                <div className="ab4-insert-popover__plan" role="presentation">
                                                    <i className="ri-stack-line" aria-hidden="true" />
                                                    <span><Highlighted text={heading} needle={needle} /></span>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                role="menuitem"
                                                aria-label={f.label}
                                                title={mergeFieldToken(f.key)}
                                                className={`ab4-insert-popover__item ${splitLabel(f).plan ? 'ab4-insert-popover__item--plan' : ''} ${index === active ? 'is-active' : ''}`}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onMouseEnter={() => setActive(index)}
                                                onClick={() => insert(f.key)}
                                            >
                                                <span className="ab4-insert-popover__label"><Highlighted text={name} needle={needle} /></span>
                                                {showsValue(f) && <span className="ab4-insert-popover__value">{f.sample}</span>}
                                                <i className="ri-corner-down-left-line ab4-insert-popover__enter" aria-hidden="true" />
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                    <div className="ab4-insert-popover__footer" aria-hidden="true">
                        <span><kbd>↑</kbd><kbd>↓</kbd> to move</span>
                        <span><kbd>Enter</kbd> to insert</span>
                        <span><kbd>Esc</kbd> to close</span>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
};
