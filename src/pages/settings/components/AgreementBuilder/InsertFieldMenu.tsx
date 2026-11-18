import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { mergeFieldSnippet, mergeFieldToken } from '../../../../config/agreementMergeFields';
import { createMergeChip, decorateMergeFields } from './mergeChips';
import { MergeFieldsContext } from './mergeFieldsContext';
import { GroupModal, ValueRows, groupIcon } from './DynamicValueGroups';

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

/**
 * "Insert Dynamic Value": merge fields such as {{signer.name}} that the server
 * fills when the agreement is signed (see config/agreementMergeFields, and the
 * Plan & Fee and signer values from the API). It opens a drawer over the page
 * listing the groups (Signer, Your company, each Plan & Fee group ...); a group
 * opens in a modal with its values. Typing a search lists the matching values
 * straight away. Arrow keys and Enter work in both, Escape closes the modal
 * first, and a click outside closes the drawer. A value goes at the cursor in
 * the text being edited, else at the end of the selected text block, else in a
 * new text block.
 */
export const InsertFieldMenu: React.FC<InsertFieldMenuProps> = ({ content, onAppend, onAddNew }) => {
    const fields = useContext(MergeFieldsContext);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [openGroup, setOpenGroup] = useState<string | null>(null);
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
    const searching = needle !== '';
    const matching = useMemo(
        () => (searching ? fields.filter((f) => `${f.label} ${f.group} ${f.key}`.toLowerCase().includes(needle)) : fields),
        [fields, needle, searching],
    );
    const allGroups = useMemo(() => Array.from(new Set(fields.map((f) => f.group))), [fields]);
    const groups = Array.from(new Set(matching.map((f) => f.group)));
    // In the order shown, so the arrow keys follow the list on screen.
    const ordered = groups.flatMap((group) => matching.filter((f) => f.group === group));
    const inGroup = (group: string) => fields.filter((f) => f.group === group);

    const close = () => { setOpenGroup(null); setOpen(false); };

    const toggle = () => {
        if (!open) {
            const selection = window.getSelection();
            const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            const node = range?.startContainer;
            const inEditor = (node instanceof Element ? node : node?.parentElement)?.closest('.ab4-editor');
            editorRange.current = range && inEditor ? range.cloneRange() : null;
        }
        if (open) close();
        else setOpen(true);
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

    // Back from a group to the list of groups, with the cursor in the search box.
    const closeGroup = () => {
        setOpenGroup(null);
        searchRef.current?.focus();
    };

    // A fresh search each time it opens, with the cursor in the box.
    useEffect(() => {
        if (open) {
            setQuery('');
            setActive(0);
            setOpenGroup(null);
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

    // A click outside the button, the drawer and an open group closes it all;
    // Escape closes an open group first, then the drawer.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (popoverRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
            if (target instanceof Element && target.closest('.ab4-insert-group-backdrop')) return;
            close();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (openGroup) closeGroup();
            else close();
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, openGroup]);

    // The active row stays in view as the arrow keys move.
    useEffect(() => {
        listRef.current?.querySelector('.is-active')?.scrollIntoView?.({ block: 'nearest' });
    }, [active]);

    // From the search box: the arrow keys walk the groups (or, while searching,
    // the matching values) and Enter opens the group (or inserts the value).
    const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const count = searching ? ordered.length : allGroups.length;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, count - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (searching) {
                if (ordered[active]) insert(ordered[active].key);
            } else if (allGroups[active]) {
                setOpenGroup(allGroups[active]);
            }
        }
    };

    return (
        <div className="ab4-insert-field">
            <button
                ref={toggleRef}
                type="button"
                className={`ab4-insert-field__toggle ${open ? 'is-open' : ''}`}
                aria-haspopup="dialog"
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
                    {searching ? (
                        <div ref={listRef} role="menu" aria-label="Dynamic values" className="ab4-insert-popover__list">
                            {groups.length === 0 && (
                                <div className="ab4-insert-popover__empty">
                                    <i className="ri-search-eye-line" aria-hidden="true" />
                                    <span>No dynamic values match "{query.trim()}".</span>
                                </div>
                            )}
                            {groups.map((group) => {
                                const rows = matching.filter((f) => f.group === group);
                                const offset = ordered.indexOf(rows[0]);
                                return (
                                    <div key={group} className="ab4-insert-popover__group">
                                        <div className="ab4-insert-popover__group-title">
                                            <i className={groupIcon(group)} aria-hidden="true" />
                                            <span>{group}</span>
                                            <span className="ab4-insert-popover__group-count">{rows.length}</span>
                                        </div>
                                        <ValueRows
                                            fields={rows}
                                            needle={needle}
                                            active={active - offset}
                                            onActive={(index) => setActive(offset + index)}
                                            onPick={insert}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div ref={listRef} role="list" aria-label="Dynamic value groups" className="ab4-insert-popover__list ab4-insert-popover__groups">
                            {allGroups.map((group, index) => (
                                <div role="listitem" key={group}>
                                    <button
                                        type="button"
                                        aria-label={group}
                                        aria-haspopup="dialog"
                                        className={`ab4-insert-popover__group-btn ${index === active ? 'is-active' : ''}`}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onMouseEnter={() => setActive(index)}
                                        onClick={() => setOpenGroup(group)}
                                    >
                                        <span className="ab4-insert-popover__group-icon" aria-hidden="true"><i className={groupIcon(group)} /></span>
                                        <span className="ab4-insert-popover__group-name">{group}</span>
                                        <span className="ab4-insert-popover__group-count">{inGroup(group).length}</span>
                                        <i className="ri-arrow-right-s-line ab4-insert-popover__group-chevron" aria-hidden="true" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="ab4-insert-popover__footer" aria-hidden="true">
                        <span><kbd>↑</kbd><kbd>↓</kbd> to move</span>
                        <span><kbd>Enter</kbd> to {searching ? 'insert' : 'open'}</span>
                        <span><kbd>Esc</kbd> to close</span>
                    </div>
                </div>,
                document.body,
            )}
            {open && openGroup && (
                <GroupModal group={openGroup} fields={inGroup(openGroup)} onPick={insert} onClose={closeGroup} />
            )}
        </div>
    );
};
