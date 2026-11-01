import React, { useState, useRef, useEffect, useCallback, useContext, useId } from 'react';
import Flatpickr from 'react-flatpickr';
import { yearDropdownPlugin } from '../../../../utils/flatpickrPlugins';
import { toast } from 'react-toastify';
// @ts-ignore
import { PALETTE, makeBlock, keepsWithNext, LAYOUT_CSS, HEADER_CONTENT } from './utils';
import { measureLineBoxes, planPages, type PageItem } from './pagination';
import { AgreementBlock } from './types';
import { createMergeChip, decorateMergeFields, undecorateMergeFields } from './mergeChips';
import { MergeChipMenu } from './MergeChipMenu';
import { pastedToHtml } from './pastedText';

/** Drag data types: a block being moved, and a palette item being added. */
export const BLOCK_DRAG_TYPE = 'application/x-agreement-block';
export const PALETTE_DRAG_TYPE = 'application/x-agreement-palette';

/**
 * Where a drag would drop: one marker for the whole editor, moved by dragover
 * and cleared when the drag ends. Not cleared on dragleave - Chrome gives it no
 * relatedTarget, so leaving a block can't be told from entering its text.
 */
export type DropTarget = { key: string; side?: 'before' | 'after' } | null;
export const DropTargetContext = React.createContext<{ target: DropTarget; setTarget: (t: DropTarget) => void } | null>(null);

const isAgreementDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer?.types || []).some((t) => t === BLOCK_DRAG_TYPE || t === PALETTE_DRAG_TYPE);

// ── A4 at 96 dpi ─────────────────────────────────────────────────────────────
const A4_H = 1122.5;  // px  (297mm)

// Agreement and signature dates can fall either side of today.
const AGREEMENT_DATE_OPTIONS = {
    dateFormat: 'd M, Y',
    monthSelectorType: 'dropdown' as const,
    plugins: [yearDropdownPlugin(1900, new Date().getFullYear() + 10)],
};

interface TextBlockProps {
    block: AgreementBlock;
    onUpdate: (val: Partial<AgreementBlock>) => void;
    onFocused: (id: string) => void;
    onBlurred: () => void;
    readOnly?: boolean;
    isOverflowing?: boolean;
}

// ── TextBlock ─────────────────────────────────────────────────────────────────
export function TextBlock({ block, onUpdate, onFocused, onBlurred, readOnly, isOverflowing }: TextBlockProps) {
    const ref = useRef<HTMLDivElement>(null);
    const lastValidHtml = useRef<string>(block.content || '');
    const [menuChip, setMenuChip] = useState<HTMLElement | null>(null);
    
    // Merge fields show as chips here and are saved bare ({{signer.name}}) - see mergeChips.
    useEffect(() => {
        if (ref.current) {
            ref.current.innerHTML = decorateMergeFields(block.content || '');
            lastValidHtml.current = ref.current.innerHTML;
        }
    }, []);

    // Content changed from outside the editor (e.g. a field added from the Insert field menu).
    useEffect(() => {
        if (!ref.current || document.activeElement === ref.current) return;
        if (undecorateMergeFields(ref.current.innerHTML) !== (block.content || '')) {
            ref.current.innerHTML = decorateMergeFields(block.content || '');
            lastValidHtml.current = ref.current.innerHTML;
        }
    }, [block.content]);

    useEffect(() => {
        if (!ref.current) return;
        const originalHtml = ref.current.innerHTML;
        let changed = false;

        const stripInlineProp = (prop: string) => {
            const regex = new RegExp(`${prop}\\s*:\\s*[^;]+;?`, 'gi');
            ref.current!.querySelectorAll('[style]').forEach((el) => {
                if (el === ref.current) return;
                const style = (el as HTMLElement).getAttribute('style') || '';
                if (style.toLowerCase().includes(prop)) {
                    const cleaned = style.replace(regex, '').trim();
                    if (cleaned) (el as HTMLElement).setAttribute('style', cleaned);
                    else (el as HTMLElement).removeAttribute('style');
                    changed = true;
                }
            });
        };

        stripInlineProp('font-size');

        ref.current!.querySelectorAll('font').forEach((el) => {
            const parent = el.parentNode!;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
            changed = true;
        });

        if (changed) {
            const newHtml = ref.current.innerHTML;
            if (newHtml !== originalHtml) {
                lastValidHtml.current = newHtml;
                onUpdate({ content: undecorateMergeFields(newHtml) });
            }
        }
    }, [block.fontSize]);

    const bVars = {
        '--fs': block.fontSize ? `${block.fontSize}px` : undefined,
        fontSize: block.fontSize ? `${block.fontSize}px` : undefined,
        '--fw': block.fontWeight,
        fontWeight: block.fontWeight,
        '--fst': block.fontStyle,
        fontStyle: block.fontStyle,
        '--ff': block.fontFamily,
        fontFamily: block.fontFamily,
        '--ta': block.textAlign,
        textAlign: block.textAlign,
        '--color': block.color,
        color: block.color,
        '--lh': block.lineHeight,
        lineHeight: block.lineHeight,
        '--ls': block.letterSpacing !== undefined ? `${block.letterSpacing}px` : undefined,
        letterSpacing: block.letterSpacing !== undefined ? `${block.letterSpacing}px` : undefined,
    } as React.CSSProperties;

    // No page limit: text that does not fit its page flows on to the next (pagination.ts).
    const handleInput = () => {
        if (!ref.current) return;
        const currentHtml = ref.current.innerHTML;
        lastValidHtml.current = currentHtml;
        onUpdate({ content: undecorateMergeFields(currentHtml) });
    };

    // Text pasted from ChatGPT, Claude, Word or a web page keeps its bold, lists,
    // tables and paragraphs, but not the source's fonts, colours and markup (pastedText.ts).
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        const editor = ref.current;
        const data = e.clipboardData;
        if (!editor || !data) return;
        e.preventDefault();
        const html = pastedToHtml({ html: data.getData('text/html'), text: data.getData('text/plain') });
        if (!html) return;

        const selection = window.getSelection();
        let range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
        if (!range || !editor.contains(range.commonAncestorContainer)) {
            range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
        }
        range.deleteContents();
        const fragment = range.createContextualFragment(html);
        const last = fragment.lastChild;
        range.insertNode(fragment);
        if (last && selection) {
            range.setStartAfter(last);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        handleInput();
    };

    // A click on a blue field opens MergeChipMenu, to choose what fills it.
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const chip = (e.target as Element).closest?.('.ab4-merge-chip') as HTMLElement | null;
        if (chip && ref.current?.contains(chip)) setMenuChip(chip);
    };

    const remapChip = (key: string | null) => {
        if (!menuChip) return;
        if (key) menuChip.replaceWith(createMergeChip(key));
        else menuChip.remove();
        setMenuChip(null);
        handleInput();
    };

    const handleBlur = () => {
        onBlurred();
        if (!ref.current) return;
        const content = undecorateMergeFields(ref.current.innerHTML);
        onUpdate({ content });
        // A merge field typed by hand becomes a chip once the text is left.
        const decorated = decorateMergeFields(content);
        if (decorated !== ref.current.innerHTML) ref.current.innerHTML = decorated;
    };

    return (
        <div className="ab4-text-wrap">
            {readOnly ? (
                // Read-only snapshot: static div, same styles, no contentEditable
                <div
                    className="ab4-editor ab4-editor--readonly"
                    style={bVars}
                    dangerouslySetInnerHTML={{ __html: block.content || '' }}
                />
            ) : (
                <div ref={ref} contentEditable suppressContentEditableWarning className="ab4-editor"
                    style={bVars} data-placeholder="Click to type…" spellCheck
                    onFocus={() => onFocused(block.id)}
                    onBlur={handleBlur}
                    onInput={handleInput}
                    onPaste={handlePaste}
                    onClick={handleClick} />
            )}
            {menuChip && (
                <MergeChipMenu chip={menuChip} onPick={(key) => remapChip(key)} onRemove={() => remapChip(null)}
                    onClose={() => setMenuChip(null)} />
            )}
        </div>
    );
}

interface InsertZoneProps {
    onInsert: (type: string) => void;
    /** Top-level list only: a block dragged onto this gap moves here (palette items are inserted). */
    onMoveHere?: (id: string) => void;
}

// ── InsertZone ────────────────────────────────────────────────────────────────
export function InsertZone({ onInsert, onMoveHere }: InsertZoneProps) {
    const [hover, setHover] = useState(false);
    const dropTarget = useContext(DropTargetContext);
    const gapKey = `gap:${useId()}`;
    const dragOver = dropTarget?.target?.key === gapKey;
    const accepts = (e: React.DragEvent) => !!onMoveHere && isAgreementDrag(e);
    const dropHandlers = onMoveHere ? {
        onDragOver: (e: React.DragEvent) => {
            if (!accepts(e)) return;
            e.preventDefault();
            e.stopPropagation();
            if (!dragOver) dropTarget?.setTarget({ key: gapKey });
        },
        onDrop: (e: React.DragEvent) => {
            if (!accepts(e)) return;
            e.preventDefault();
            e.stopPropagation();
            dropTarget?.setTarget(null);
            const movedId = e.dataTransfer.getData(BLOCK_DRAG_TYPE);
            const paletteType = e.dataTransfer.getData(PALETTE_DRAG_TYPE);
            if (movedId) onMoveHere(movedId);
            else if (paletteType) onInsert(paletteType);
        },
    } : {};
    const [open, setOpen] = useState(false);
    const [openUp, setOpenUp] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setHover(false); } };
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
    }, []);

    const toggleOpen = () => {
        if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setOpenUp(spaceBelow < 300);
        }
        setOpen(!open);
    };

    const isActive = hover || open;
    return (
        <div ref={ref} className={`ab4-iz ${isActive ? 'ab4-iz--active' : ''} ${dragOver ? 'ab4-iz--drop' : ''}`}
            onMouseEnter={() => setHover(true)} onMouseLeave={() => !open && setHover(false)} {...dropHandlers}>
            {isActive && (
                <div className="ab4-iz-line">
                    <button type="button" className="ab4-iz-btn" onClick={toggleOpen}><i className={open ? 'ri-close-line' : 'ri-add-line'} /></button>
                    {open && (
                        <div 
                            className="ab4-iz-picker"
                            style={openUp ? {
                                top: 'auto',
                                bottom: 'calc(100% + 8px)',
                            } : undefined}
                        >
                            {PALETTE.map((g: any) => (
                                <div key={g.group} className="ab4-iz-grp">
                                    <div className="ab4-iz-grp-title">{g.group}</div>
                                    <div className="ab4-iz-items">
                                        {g.items.map((it: any) => (
                                            <button key={it.type} className="ab4-iz-item" onClick={() => { onInsert(it.type); setOpen(false); }}>
                                                <i className={it.icon} /><span>{it.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface BlockBodyProps {
    block: AgreementBlock;
    helpers: any;
    readOnly?: boolean;
}

// ── Single block's inner content ──────────────────────────────────────────────
export function BlockBody({ block, helpers, readOnly }: BlockBodyProps) {
    const { onUpdate, onDelete, onMove, onInsert, onSelect, onFocused, onBlurred, selectedId, openFmForBlock, onReorder, blockIdx } = helpers;
    // Drag and drop between top-level blocks (a nested list has no onReorder).
    const draggable = !readOnly && typeof onReorder === 'function';
    const dropTarget = useContext(DropTargetContext);
    const blockKey = `block:${block.id}`;
    const dropAt = dropTarget?.target?.key === blockKey ? dropTarget.target.side ?? null : null;
    const dropSide = (e: React.DragEvent): 'before' | 'after' => {
        const rect = e.currentTarget.getBoundingClientRect();
        return e.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
    };
    const dropHandlers = draggable ? {
        onDragOver: (e: React.DragEvent) => {
            if (!isAgreementDrag(e)) return;
            e.preventDefault();
            e.stopPropagation();
            const side = dropSide(e);
            if (dropAt !== side) dropTarget?.setTarget({ key: blockKey, side });
        },
        onDrop: (e: React.DragEvent) => {
            if (!isAgreementDrag(e)) return;
            e.preventDefault();
            e.stopPropagation();
            const index = blockIdx + (dropSide(e) === 'after' ? 1 : 0);
            const movedId = e.dataTransfer.getData(BLOCK_DRAG_TYPE);
            const paletteType = e.dataTransfer.getData(PALETTE_DRAG_TYPE);
            if (movedId) onReorder(movedId, index);
            else if (paletteType) onInsert(index, paletteType);
            dropTarget?.setTarget(null);
        },
    } : {};

    const blockVars = {
        '--bg': block.type === 'parties' ? 'transparent' : (block.bgColor || 'transparent'),
        '--radius': block.type === 'parties' ? undefined : (block.borderRadius !== undefined ? `${block.borderRadius}px` : undefined),
        '--pad': block.type === 'parties' ? undefined : (block.padding !== undefined ? `${block.padding}px` : undefined),
        '--opacity': block.bgOpacity !== undefined ? block.bgOpacity : undefined,
        '--fs': block.fontSize ? `${block.fontSize}px` : undefined,
        '--fw': block.fontWeight || undefined,
        '--color': block.color || undefined,
        '--ff': block.fontFamily || undefined,
        '--ta': block.textAlign || undefined,
        '--mt': block.marginTop !== undefined ? `${block.marginTop}px` : undefined,
        '--mb': block.marginBottom !== undefined ? `${block.marginBottom}px` : undefined,
    } as React.CSSProperties;

    const fieldVars = {
        '--fs': block.fontSize ? `${block.fontSize}px` : undefined,
        '--fw': block.fontWeight || undefined,
        '--ta': block.textAlign || undefined,
        '--color': block.color || undefined,
        '--ff': block.fontFamily || undefined,
    } as React.CSSProperties;

    return (
        <div className={`ab4-block ${selectedId === block.id ? 'ab4-block--sel' : ''} ${dropAt ? `ab4-block--drop-${dropAt}` : ''}`}
            style={blockVars} onClick={(e) => { e.stopPropagation(); onSelect(block.id); }} {...dropHandlers}>
            <div className="ab4-ctrl">
                <span className="ab4-badge"><i className="ri-stack-line me-1" />{block.type}</span>
                <div className="ab4-acts">
                    {draggable && (
                        <button
                            type="button"
                            className="ab4-act ab4-act--drag"
                            draggable
                            aria-label="Drag to move"
                            title="Drag to move"
                            onClick={(e) => e.stopPropagation()}
                            onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.setData(BLOCK_DRAG_TYPE, block.id);
                                e.dataTransfer.effectAllowed = 'move';
                            }}
                        >
                            <i className="ri-draggable" />
                        </button>
                    )}
                    <button className="ab4-act" aria-label="Move up" onClick={(e) => { e.stopPropagation(); onMove(block.id, -1); }}><i className="ri-arrow-up-s-line" /></button>
                    <button className="ab4-act" aria-label="Move down" onClick={(e) => { e.stopPropagation(); onMove(block.id, 1); }}><i className="ri-arrow-down-s-line" /></button>
                    <button className="ab4-act ab4-act--del" aria-label="Delete block" onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}><i className="ri-delete-bin-line" /></button>
                </div>
            </div>
            <div className="ab4-block-body">
                {block.type === 'text' && (
                    <TextBlock
                        block={block}
                        onUpdate={(val) => onUpdate(block.id, val)}
                        onFocused={onFocused}
                        onBlurred={onBlurred}
                        readOnly={readOnly}
                        isOverflowing={helpers.isOverflowing}
                    />
                )}
                {(block.type === 'header' || (block.type === 'logo' && block.logoLayout === 'letterhead')) && (
                    // Header: the logo on the left, its own text on the right (edited in place).
                    <div className="p-letterhead">
                        <div className="p-letterhead-logo">
                            <button type="button" className={`ab4-logo-ph ${block.logoSrc ? 'ab4-logo-ph--has-logo' : ''}`}
                                aria-label={block.logoSrc ? 'Change logo' : 'Add your logo'}
                                onClick={() => openFmForBlock && openFmForBlock(block.id)}>
                                {block.logoSrc
                                    ? <img src={block.logoSrc} alt="" className="p-letterhead-img" style={{ width: `${block.logoWidth || 140}px` }} />
                                    : <><i className="ri-image-add-line" aria-hidden="true" /><span className="ab4-logo-ph__title">Add your logo</span><span className="ab4-logo-ph__hint">PNG or SVG, transparent works best</span></>}
                            </button>
                        </div>
                        <div className="p-letterhead-info">
                            <TextBlock
                                block={block.type === 'header' ? block : { ...block, content: HEADER_CONTENT, fontSize: 11, textAlign: 'right', color: '#64748b', lineHeight: 1.65 }}
                                // An older letterhead logo becomes a Header once its text is edited.
                                onUpdate={(val) => onUpdate(block.id, block.type === 'header' ? val : { ...val, type: 'header', paletteType: 'header', fontSize: 11, textAlign: 'right', color: '#64748b', lineHeight: 1.65, logoWidth: block.logoWidth || 140 })}
                                onFocused={onFocused}
                                onBlurred={onBlurred}
                                readOnly={readOnly}
                            />
                        </div>
                    </div>
                )}
                {block.type === 'logo' && block.logoLayout !== 'letterhead' && (
                    <div className="ab4-logo-wrap" style={{
                        // @ts-ignore
                        '--align': block.logoAlign, margin: 0
                    }}>
                        <div className={`ab4-logo-ph ${block.logoSrc ? 'ab4-logo-ph--has-logo' : ''}`} onClick={() => openFmForBlock && openFmForBlock(block.id)}>
                            {block.logoSrc ? <img src={block.logoSrc} alt="Logo" className="ab4-logo-img" style={{
                                // @ts-ignore
                                '--w': block.logoFullWidth ? '100%' : `${block.logoWidth}px`
                            }} />
                                : <><i className="ri-image-add-line" /><span>Click to browse</span></>}
                        </div>
                    </div>
                )}
                {block.type === 'divider' && <div className="ab4-hr" style={{ margin: 0 }}></div>}
                {block.type === 'page-break' && (
                    <div className="ab4-page-break-vis">
                        <div className="ab4-page-break-line" />
                        <div className="ab4-page-break-label">
                            <i className="ri-scissors-cut-line" /> Page Break
                        </div>
                    </div>
                )}
                {block.type === 'spacer' && <div className="ab4-spacer-vis" style={{ height: block.spacerHeight, margin: 0 }} />}
                {block.type === 'parties' && (
                    <div className="ab4-parties" style={{ gap: '30px', margin: 0 }}>
                        {[0, 1].map(x => {
                            const side = x === 0 ? 'A' : 'B';
                            const listKey = side === 'A' ? 'partyA' : 'partyB';
                            return (
                                <div key={side} className="ab4-party" style={{
                                    backgroundColor: (block.bgColor && block.bgColor !== 'transparent') ? block.bgColor : '#f8fafc',
                                    borderRadius: block.borderRadius ? `${block.borderRadius}px` : '4px',
                                    padding: block.padding ? `${block.padding}px` : '14px',
                                    opacity: block.bgOpacity !== undefined ? block.bgOpacity : undefined,
                                }}>
                                    <div className="ab4-party-lbl" style={{
                                        // @ts-ignore
                                        '--color': block.partyLabelColor || undefined,
                                        '--fs': block.partyLabelSize ? `${block.partyLabelSize}px` : undefined,
                                        '--fw': block.partyLabelWeight || undefined,
                                        '--ff': block.partyLabelFamily || undefined,
                                        '--ta': block.partyLabelAlign || undefined,
                                        lineHeight: block.partyLabelLineHeight,
                                        letterSpacing: block.partyLabelSpacing ? `${block.partyLabelSpacing}px` : undefined,
                                    }}>{side === 'A' ? block.partyALabel : block.partyBLabel}</div>
                                    <BlockList blocks={block[listKey] || []}
                                        onUpdate={(sid: string, val: Partial<AgreementBlock>) => onUpdate(block.id, { [listKey]: (block[listKey] || []).map(b => b.id === sid ? { ...b, ...val } : b) })}
                                        onDelete={(sid: string) => onUpdate(block.id, { [listKey]: (block[listKey] || []).filter(b => b.id !== sid) })}
                                        onMove={(sid: string, dir: number) => {
                                            const arr = [...(block[listKey] || [])], idx = arr.findIndex(b => b.id === sid);
                                            if ((dir === -1 && idx > 0) || (dir === 1 && idx < arr.length - 1)) {
                                                const [it] = arr.splice(idx, 1); arr.splice(idx + dir, 0, it);
                                                onUpdate(block.id, { [listKey]: arr });
                                            }
                                        }}
                                        onInsert={(idx: number, type: string) => {
                                             const arr = [...(block[listKey] || [])];
                                             const newBlock = makeBlock(type);
                                             arr.splice(idx, 0, newBlock);
                                             onUpdate(block.id, { [listKey]: arr });
                                             onSelect(newBlock.id);
                                         }}
                                        openFmForBlock={openFmForBlock}
                                        selectedId={selectedId} onSelect={onSelect} onFocused={onFocused} onBlurred={onBlurred} isNested />
                                </div>
                            );
                        })}
                    </div>
                )}
                {block.type === 'input' && (
                    <div className="ab4-field" style={fieldVars}>
                        <div className="ab4-field-lbl">{block.fieldLabel}{block.fieldRequired ? ' *' : ''}:</div>
                        <input type="text" readOnly className="ab4-finp" placeholder={block.fieldPlaceholder || `Enter ${block.fieldLabel}`} />
                    </div>
                )}
                {block.type === 'textarea' && (
                    <div className="ab4-field-textarea-wrap" style={fieldVars}>
                        <div className="ab4-field-lbl">{block.fieldLabel}{block.fieldRequired ? ' *' : ''}:</div>
                        <textarea readOnly rows={1} className="ab4-fta" placeholder={block.fieldPlaceholder || `Enter ${block.fieldLabel}`} style={{ minHeight: 40 }} />
                    </div>
                )}
                {block.type === 'date' && (
                    <div className="ab4-field" style={fieldVars}>
                        <div className="ab4-field-lbl">{block.fieldLabel}{block.fieldRequired ? ' *' : ''}:</div>
                        <Flatpickr className="form-control ab4-modern-fpick" options={AGREEMENT_DATE_OPTIONS} placeholder="Select Date" />
                    </div>
                )}
                {block.type === 'checkbox' && (
                    <div className="ab4-field" style={fieldVars}>
                        <div className="ab4-cb-row" style={{ justifyContent: block.textAlign === 'center' ? 'center' : block.textAlign === 'right' ? 'flex-end' : 'flex-start', width: '100%' }}>
                            <input type="checkbox" readOnly className="ab4-cb" />
                            <div className="ab4-cb-lbl">{block.fieldLabel}{block.fieldRequired ? ' *' : ''}</div>
                        </div>
                    </div>
                )}
                {block.type === 'signature' && (
                    // Same signing line as the saved agreement (gen, LAYOUT_CSS); the signer fills it.
                    <div className="p-sign-card" style={{
                        margin: 0,
                        // @ts-ignore
                        '--ff': block.fontFamily,
                    }}>
                        <div className="p-sign-head"><i className="ri-quill-pen-line" aria-hidden="true" />{block.fieldLabel || 'Signature'}{block.fieldRequired ? ' *' : ''}</div>
                        <div className="p-sign">
                            <div className="p-field p-sign-col">
                                <div className="p-sign-pad">
                                    <span className="p-sign-x" aria-hidden="true">&times;</span>
                                    {block.logoSrc ? <img src={block.logoSrc} className="p-sign-img" alt="Signature" /> : <span className="p-sign-tag"><i className="ri-quill-pen-line" aria-hidden="true" />Sign here</span>}
                                </div>
                                <div className="p-sign-rule" />
                                {block.showSignerName === true && (
                                    <div className="p-sign-name" dangerouslySetInnerHTML={{ __html: decorateMergeFields('{{signer.name}}') }} />
                                )}
                                <div className="p-sign-caption">Signature</div>
                            </div>
                            <div className="p-sign-gap" />
                            <div className="p-field p-sign-col p-sign-col--date">
                                <div className="p-sign-pad"><span className="ab4-sign-date-ph">Filled in when signed</span></div>
                                <div className="p-sign-rule" />
                                <div className="p-sign-caption">Date signed</div>
                            </div>
                        </div>
                        <div className="p-sign-foot"><i className="ri-shield-check-line" aria-hidden="true" />Recorded in the signature certificate at the end of this agreement</div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface BlockListProps {
    blocks: AgreementBlock[];
    onUpdate: (id: string, val: Partial<AgreementBlock>) => void;
    onDelete: (id: string) => void;
    onMove: (id: string, dir: number) => void;
    onInsert: (idx: number, type: string) => void;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onFocused: (id: string) => void;
    onBlurred: () => void;
    openFmForBlock?: (blockId: string) => void;
    pagePad?: number;
    docBg?: string;
    isNested?: boolean;
    /** Top-level list only: blocks can be dragged here, and palette items dropped. */
    onReorder?: (id: string, toIndex: number) => void;
}

// ── PageEntry — one block's slot on one page ──────────────────────────────────
interface PageEntry {
    blockIdx: number;
    clipTop: number;    // px from top of block where this page's window starts
    clipHeight: number; // px of visible block content on this page
    isSplit: boolean;   // true when this block overflows and is split across pages
}

/** How many characters of `root`'s text come before the start of `range`. */
function textOffsetOf(root: HTMLElement, range: Range): number {
    const before = document.createRange();
    before.selectNodeContents(root);
    before.setEnd(range.startContainer, range.startOffset);
    return before.toString().length;
}

/** A collapsed range `offset` characters into `root`'s text, or null if the text is shorter. */
function rangeAtTextOffset(root: HTMLElement, offset: number): Range | null {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let left = offset;
    let node = walker.nextNode();
    while (node) {
        const length = node.nodeValue?.length || 0;
        if (left <= length) {
            const range = document.createRange();
            range.setStart(node, left);
            range.collapse(true);
            return range;
        }
        left -= length;
        node = walker.nextNode();
    }
    return null;
}

// ── BlockList — paginated A4 editor ───────────────────────────────────────────
export function BlockList({
    blocks, onUpdate, onDelete, onMove, onInsert,
    selectedId, onSelect, onFocused, onBlurred,
    openFmForBlock, pagePad, docBg, isNested = false, onReorder,
}: BlockListProps) {
    const [pages, setPages] = useState<PageEntry[][]>(() => [
        blocks.map((_, i) => ({ blockIdx: i, clipTop: 0, clipHeight: A4_H, isSplit: false }))
    ]);
    // blockRefs stores the wrapper div for each block (used to measure offsetHeight)
    const blockRefs = useRef<Record<string, HTMLElement>>({});
    // blockHeights caches measured heights so we don't re-measure unnecessarily
    const blockHeights = useRef<Record<string, number>>({});
    const rafRef = useRef<any>(null);

    const [scale, setScale] = useState(1);
    const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isNested) return;
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                const newScale = width < 794 ? (width / 794) : 1;
                setScale(newScale);
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [isNested]);

    useEffect(() => {
        if (isNested || !wrapperRef.current) return;
        const updateHeight = () => {
            if (wrapperRef.current) {
                const rect = wrapperRef.current.getBoundingClientRect();
                setContainerHeight(rect.height);
            }
        };
        const handle = requestAnimationFrame(updateHeight);
        return () => cancelAnimationFrame(handle);
    }, [blocks, scale, pagePad, isNested, pages]);

    const distribute = useCallback(() => {
        const padTop = Math.round((pagePad || 80) * 0.9);
        const padBot = pagePad || 80;
        const usable = A4_H - padTop - padBot;

        // Collect block heights — prefer measured DOM value, fall back to cached
        const heights: Record<string, number> = {};
        blocks.forEach((block) => {
            const el = blockRefs.current[block.id];
            if (el) {
                const blockEl = (el.querySelector('.ab4-block') || el.firstElementChild || el) as HTMLElement;
                const h = blockEl.offsetHeight;
                if (h > 0) {
                    heights[block.id] = h;
                    blockHeights.current[block.id] = h;
                } else if (blockHeights.current[block.id]) {
                    heights[block.id] = blockHeights.current[block.id];
                }
            } else if (blockHeights.current[block.id]) {
                heights[block.id] = blockHeights.current[block.id];
            }
        });

        // Same page layout as the preview and the signing page (pagination.ts).
        const items: PageItem[] = blocks.map((block) => {
            if (block.type === 'page-break') return { height: 0, marginTop: 0, marginBottom: 0, boxes: null, pageBreak: true };
            const el = blockRefs.current[block.id];
            const blockH = heights[block.id];
            // Not measured yet: take no room until it is.
            if (!el || blockH === undefined) return { height: 0, marginTop: 0, marginBottom: 0, boxes: null };
            const blockEl = (el.querySelector('.ab4-block') || el.firstElementChild || el) as HTMLElement;
            const cs = window.getComputedStyle(blockEl);
            // Lines are measured on screen, where the canvas may be scaled down.
            const rectH = blockEl.getBoundingClientRect().height;
            const unscale = rectH > 0 ? blockH / rectH : 1;
            const boxes = measureLineBoxes(blockEl);
            return {
                height: blockH,
                marginTop: parseFloat(cs.marginTop) || 0,
                marginBottom: parseFloat(cs.marginBottom) || 0,
                boxes: boxes && boxes.map((b) => ({ top: b.top * unscale, bottom: b.bottom * unscale })),
                keepWithNext: keepsWithNext(block),
            };
        });
        const newPages: PageEntry[][] = planPages(items, usable).map((page) =>
            page.map((slot) => ({ blockIdx: slot.index, clipTop: slot.clipTop, clipHeight: slot.clipHeight, isSplit: slot.isSplit })));

        setPages(prev => {
            const sig = (p: PageEntry[][]) =>
                p.map(pg => pg.map(e => `${e.blockIdx}:${e.clipTop}:${e.clipHeight}:${e.isSplit}`).join(',')).join('|');
            return sig(prev) === sig(newPages) ? prev : newPages;
        });
    }, [blocks, pagePad]);

    // Re-run pagination after blocks or pagePad change
    useEffect(() => {
        if (isNested) return;
        if (rafRef.current) clearTimeout(rafRef.current);
        rafRef.current = setTimeout(distribute, 150);

        const t1 = setTimeout(distribute, 500);
        const t2 = setTimeout(distribute, 1200);

        return () => {
            clearTimeout(rafRef.current);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [blocks, distribute, isNested, pagePad]);

    // Typing at the end of a page pushes the caret into the clipped-off part of
    // its slice: move it on to the slice on the next page, at the same place in the text.
    useEffect(() => {
        if (isNested) return;
        const selection = window.getSelection();
        const editor = document.activeElement as HTMLElement | null;
        if (!selection?.rangeCount || !editor?.classList.contains('ab4-editor')) return;
        const slice = editor.closest('.ab4-block-clip-window') as HTMLElement | null;
        if (!slice) return;
        const caret = selection.getRangeAt(0).getBoundingClientRect();
        const box = slice.getBoundingClientRect();
        if (caret.height === 0 || (caret.top >= box.top - 1 && caret.bottom <= box.bottom + 1)) return;

        const offset = textOffsetOf(editor, selection.getRangeAt(0));
        const slices = Array.from(document.querySelectorAll(`.ab4-block-clip-window[data-slice-of="${slice.dataset.sliceOf}"]`)) as HTMLElement[];
        for (const other of slices) {
            const otherEditor = other.querySelector('.ab4-editor') as HTMLElement | null;
            if (!otherEditor || other === slice) continue;
            const range = rangeAtTextOffset(otherEditor, offset);
            if (!range) continue;
            const rect = range.getBoundingClientRect();
            const otherBox = other.getBoundingClientRect();
            if (rect.top >= otherBox.top - 1 && rect.bottom <= otherBox.bottom + 1) {
                otherEditor.focus({ preventScroll: true });
                selection.removeAllRanges();
                selection.addRange(range);
                other.scrollIntoView({ block: 'nearest' });
                return;
            }
        }
    }, [pages, isNested]);

    const helpers = { onUpdate, onDelete, onMove, onInsert, onSelect, onFocused, onBlurred, selectedId, openFmForBlock, onReorder };
    // A block dropped on the gap at `index` moves there (top-level list only).
    const moveHere = (index: number) => (onReorder ? (id: string) => onReorder(id, index) : undefined);

    // ── Nested (inside Parties block) — no pagination ──────────────────────────
    if (isNested) {
        return (
            <div className="ab4-block-list">
                <InsertZone onInsert={(t) => onInsert(0, t)} onMoveHere={moveHere(0)} />
                {blocks.map((block, i) => (
                    <React.Fragment key={block.id}>
                        <div ref={el => { if (el) blockRefs.current[block.id] = el; else delete blockRefs.current[block.id]; }}>
                            <BlockBody block={block} helpers={{ ...helpers, blockIdx: i }} />
                        </div>
                        <InsertZone onInsert={(t) => onInsert(i + 1, t)} onMoveHere={moveHere(i + 1)} />
                    </React.Fragment>
                ))}
            </div>
        );
    }

    // ── Top-level — paginated across A4 sheets ─────────────────────────────────
    //
    // Key design decision: each block's DOM node exists ONCE in the render tree
    // (on its first page). For split blocks, the first slice renders the block
    // inside an ab4-block-clip-window container. Subsequent slices on later pages
    // are NEW React instances that receive the same block data (state-driven)
    // but are visually offset via CSS to show the continuation of the content.
    // The height measurement ref always points to the first rendered instance.
    //
    // This works because:
    //  • TextBlock uses useEffect to set innerHTML on mount (state-driven content)
    //  • onInput/onBlur from any replica will update the shared block state
    //  • We must NOT have two contentEditable elements editing the same data
    //    simultaneously — so split-block continuations are rendered read-only-ish
    //    (they render the same BlockBody but the user can only focus one at a time)
    //
    // Track which block indices have already been rendered (for first-instance ref)
    const renderedBlocks = new Set<number>();

    const isManualPageBreak = (pIdx: number): boolean => {
        if (pIdx <= 0) return false;
        const prevPageEntries = pages[pIdx - 1];
        if (!prevPageEntries || prevPageEntries.length === 0) return false;
        const lastEntry = prevPageEntries[prevPageEntries.length - 1];
        const lastBlock = blocks[lastEntry.blockIdx];
        return lastBlock?.type === 'page-break';
    };

    return (
        <div className="ab4-scale-container" ref={containerRef} style={{
            width: '100%',
            height: containerHeight !== undefined ? `${containerHeight}px` : 'auto',
            overflow: 'hidden',
        }}>
            <style>{LAYOUT_CSS}</style>
            <div className="ab4-pages-wrapper" ref={wrapperRef} style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                width: '794px',
                margin: '0 auto',
            }}>
                {pages.map((pageEntries, pIdx) => {
                    const firstBlockIdx = pageEntries[0]?.blockIdx ?? blocks.length;
                    const isManual = isManualPageBreak(pIdx);
                    const pbBlock = isManual ? blocks[pages[pIdx - 1][pages[pIdx - 1].length - 1].blockIdx] : null;

                    return (
                        <React.Fragment key={pIdx}>
                            {pIdx > 0 && (
                                isManual && pbBlock ? (
                                    <div className="ab4-page-sep-manual" title="Delete manual page break">
                                        <button 
                                            type="button" 
                                            className="ab4-page-sep-del-btn" 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                onDelete(pbBlock.id); 
                                            }}
                                        >
                                            <i className="ri-delete-bin-line" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="ab4-page-sep" />
                                )
                            )}
                            <div
                                className="ab4-doc"
                                style={{
                                    background: docBg || '#fff',
                                    // @ts-ignore
                                    '--doc-pad-sides': `${pagePad}px`,
                                    '--doc-pad-top': `${Math.round((pagePad || 80) * 0.9)}px`,
                                    '--doc-pad-bot': `${pagePad}px`,
                                }}
                            >
                                <InsertZone onInsert={(t) => onInsert(firstBlockIdx, t)} onMoveHere={moveHere(firstBlockIdx)} />

                                {pageEntries.map((entry, eIdx) => {
                                    const block = blocks[entry.blockIdx];
                                    if (!block) return null;

                                    // Is this the last slice of this block on this page?
                                    const isLastSliceOnThisPage = !pageEntries
                                        .slice(eIdx + 1)
                                        .some(e => e.blockIdx === entry.blockIdx);

                                    if (block.type === 'page-break') {
                                        return (
                                            <React.Fragment key={`${block.id}-p${pIdx}-e${eIdx}`}>
                                                {isLastSliceOnThisPage && (
                                                    <InsertZone onInsert={(t) => onInsert(entry.blockIdx + 1, t)} onMoveHere={moveHere(entry.blockIdx + 1)} />
                                                )}
                                            </React.Fragment>
                                        );
                                    }

                                    const isFirstRender = !renderedBlocks.has(entry.blockIdx);
                                    renderedBlocks.add(entry.blockIdx);

                                    const isContinuation = entry.clipTop > 0;
                                    const attachRef = (!isContinuation && isFirstRender);

                                    return (
                                        <React.Fragment key={`${block.id}-p${pIdx}-e${eIdx}`}>
                                            <div
                                                className={entry.isSplit ? "ab4-block-clip-window" : "ab4-block-normal-window"}
                                                data-slice-of={entry.isSplit ? block.id : undefined}
                                                style={entry.isSplit ? {
                                                    height: `${entry.clipHeight}px`,
                                                    overflow: 'hidden',
                                                    position: 'relative',
                                                    width: '100%',
                                                } : {
                                                    position: 'relative',
                                                    width: '100%',
                                                }}
                                            >
                                                <div
                                                    ref={attachRef ? (el: HTMLElement | null) => {
                                                        if (el) blockRefs.current[block.id] = el;
                                                        else delete blockRefs.current[block.id];
                                                    } : undefined}
                                                    style={entry.isSplit ? {
                                                        position: 'absolute',
                                                        top: `-${entry.clipTop}px`,
                                                        left: 0,
                                                        right: 0,
                                                    } : {
                                                        position: 'relative',
                                                    }}
                                                >
                                                    <BlockBody
                                                        block={block}
                                                        helpers={{ ...helpers, blockIdx: entry.blockIdx }}
                                                    />
                                                </div>
                                            </div>
                                            {/* Insert zone only after the last slice on a page */}
                                            {isLastSliceOnThisPage && (
                                                <InsertZone onInsert={(t) => onInsert(entry.blockIdx + 1, t)} onMoveHere={moveHere(entry.blockIdx + 1)} />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </React.Fragment>
                    );
                })}
                
                {/* Add New Page Button at the bottom */}
                <div className="ab4-add-page-container">
                    <button
                        type="button"
                        className="ab4-add-page-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onInsert(blocks.length, 'page-break');
                        }}
                    >
                        <i className="ri-add-circle-line" />
                        <span>Add New Page</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
