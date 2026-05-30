import React, { useState, useRef, useEffect, useCallback } from 'react';
import Flatpickr from 'react-flatpickr';
// @ts-ignore
import { PALETTE, makeBlock } from './utils';
import { AgreementBlock } from './types';

// ── A4 at 96 dpi ─────────────────────────────────────────────────────────────
const A4_H = 1123;  // px  (297mm)

interface TextBlockProps {
    block: AgreementBlock;
    onUpdate: (val: Partial<AgreementBlock>) => void;
    onFocused: (id: string) => void;
    onBlurred: () => void;
}

// ── TextBlock ─────────────────────────────────────────────────────────────────
export function TextBlock({ block, onUpdate, onFocused, onBlurred }: TextBlockProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [hover, setHover] = useState(false);
    useEffect(() => { if (ref.current) ref.current.innerHTML = block.content || ''; }, []);

    // When the block's fontSize changes via the sidebar, strip any inline font-size
    // styles (or legacy <font> tags) that browsers add inside contentEditable so the
    // container-level CSS variable applies to the ENTIRE text block, not just the
    // cursor / newly-typed text.
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

        // Remove legacy <font> tags (old execCommand fontSize)
        ref.current!.querySelectorAll('font').forEach((el) => {
            const parent = el.parentNode!;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
            changed = true;
        });

        if (changed) {
            const newHtml = ref.current.innerHTML;
            if (newHtml !== originalHtml) {
                onUpdate({ content: newHtml });
            }
        }
    }, [block.fontSize]);

    const bVars = {
        '--fs': `${block.fontSize}px`,
        fontSize: `${block.fontSize}px`,
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
        '--ls': `${block.letterSpacing}px`,
        letterSpacing: `${block.letterSpacing}px`,
        '--mt': `${block.marginTop}px`,
        marginTop: `${block.marginTop}px`,
        '--mb': `${block.marginBottom}px`,
        marginBottom: `${block.marginBottom}px`,
    } as React.CSSProperties;

    const exec = (cmd: string) => {
        document.execCommand(cmd, false, undefined);
        if (ref.current) onUpdate({ content: ref.current.innerHTML });
    };

    return (
        <div className="ab4-text-wrap" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            {hover && (
                <div className="ab4-text-mini-tbar">
                    <button type="button" onClick={() => exec('insertUnorderedList')}><i className="ri-list-unordered" /></button>
                    <button type="button" onClick={() => exec('insertOrderedList')}><i className="ri-list-ordered" /></button>
                    <button type="button" onClick={() => exec('bold')}><i className="ri-bold" /></button>
                </div>
            )}
            <div ref={ref} contentEditable suppressContentEditableWarning className="ab4-editor"
                style={bVars} data-placeholder="Click to type…" spellCheck
                onFocus={() => onFocused(block.id)}
                onBlur={() => { onBlurred(); if (ref.current) onUpdate({ content: ref.current.innerHTML }); }}
                onInput={() => { if (ref.current) onUpdate({ content: ref.current.innerHTML }); }} />
        </div>
    );
}

interface InsertZoneProps {
    onInsert: (type: string) => void;
}

// ── InsertZone ────────────────────────────────────────────────────────────────
export function InsertZone({ onInsert }: InsertZoneProps) {
    const [hover, setHover] = useState(false);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setHover(false); } };
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
    }, []);
    return (
        <div ref={ref} className="ab4-iz" onMouseEnter={() => setHover(true)} onMouseLeave={() => !open && setHover(false)}>
            {(hover || open) && (
                <div className="ab4-iz-line">
                    <button type="button" className="ab4-iz-btn" onClick={() => setOpen(!open)}><i className={open ? 'ri-close-line' : 'ri-add-line'} /></button>
                    {open && (
                        <div className="ab4-iz-picker">
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
}

// ── Single block's inner content ──────────────────────────────────────────────
function BlockBody({ block, helpers }: BlockBodyProps) {
    const { onUpdate, onDelete, onMove, onInsert, onSelect, onFocused, onBlurred, selectedId, openFmForBlock } = helpers;
    const blockVars = {
        '--bg': block.bgColor,
        '--radius': `${block.borderRadius}px`,
        '--pad': `${block.padding}px`,
        '--opacity': block.bgOpacity,
        '--fs': `${block.fontSize || 13}px`,
        '--fw': block.fontWeight || 400,
        '--color': block.color || '#374151',
        '--ff': block.fontFamily || 'Inter',
        '--ta': block.textAlign || 'left',
        '--mt': `${block.marginTop ?? 0}px`,
        '--mb': `${block.marginBottom ?? 0}px`,
    } as React.CSSProperties;

    return (
        <div className={`ab4-block ${selectedId === block.id ? 'ab4-block--sel' : ''}`}
            style={blockVars} onClick={(e) => { e.stopPropagation(); onSelect(block.id); }}>
            <div className="ab4-ctrl">
                <span className="ab4-badge"><i className="ri-stack-line me-1" />{block.type}</span>
                <div className="ab4-acts">
                    <button className="ab4-act" onClick={(e) => { e.stopPropagation(); onMove(block.id, -1); }}><i className="ri-arrow-up-s-line" /></button>
                    <button className="ab4-act" onClick={(e) => { e.stopPropagation(); onMove(block.id, 1); }}><i className="ri-arrow-down-s-line" /></button>
                    <button className="ab4-act ab4-act--del" onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}><i className="ri-delete-bin-line" /></button>
                </div>
            </div>
            <div className="ab4-block-body">
                {block.type === 'text' && <TextBlock block={block} onUpdate={(val) => onUpdate(block.id, val)} onFocused={onFocused} onBlurred={onBlurred} />}
                {block.type === 'logo' && (
                    <div className="ab4-logo-wrap" style={{
                        // @ts-ignore
                        '--align': block.logoAlign, '--mt': `${block.marginTop}px`, '--mb': `${block.marginBottom}px`
                    }}>
                        <div className="ab4-logo-ph" onClick={() => openFmForBlock && openFmForBlock(block.id)}>
                            {block.logoSrc ? <img src={block.logoSrc} alt="Logo" className="ab4-logo-img" style={{
                                // @ts-ignore
                                '--w': block.logoFullWidth ? '100%' : `${block.logoWidth}px`
                            }} />
                                : <><i className="ri-image-add-line" /><span>Click to browse</span></>}
                        </div>
                    </div>
                )}
                {block.type === 'divider' && <hr className="ab4-hr" />}
                {block.type === 'spacer' && <div className="ab4-spacer-vis" style={{ height: block.spacerHeight }} />}
                {block.type === 'parties' && (
                    <div className="ab4-parties">
                        {[0, 1].map(x => {
                            const side = x === 0 ? 'A' : 'B';
                            const listKey = side === 'A' ? 'partyA' : 'partyB';
                            return (
                                <div key={side} className="ab4-party">
                                    <div className="ab4-party-lbl" style={{
                                        // @ts-ignore
                                        '--color': block.partyLabelColor, '--fs': `${block.partyLabelSize}px`, '--fw': block.partyLabelWeight, '--ff': block.partyLabelFamily
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
                                            arr.splice(idx, 0, makeBlock(type));
                                            onUpdate(block.id, { [listKey]: arr });
                                        }}
                                        selectedId={selectedId} onSelect={onSelect} onFocused={onFocused} onBlurred={onBlurred} isNested />
                                </div>
                            );
                        })}
                    </div>
                )}
                {block.type === 'input' && <div className="ab4-field"><div className="ab4-field-lbl">{block.fieldLabel}{block.fieldRequired ? ' *' : ''}:</div><input type="text" readOnly className="ab4-finp" placeholder={block.fieldPlaceholder || `Enter ${block.fieldLabel}`} /></div>}
                {block.type === 'textarea' && <div className="ab4-field"><div className="ab4-field-lbl">{block.fieldLabel}{block.fieldRequired ? ' *' : ''}:</div><textarea readOnly rows={3} className="ab4-fta" placeholder={block.fieldPlaceholder || `Enter ${block.fieldLabel}`} /></div>}
                {block.type === 'date' && (
                    <div className="ab4-field">
                        <div className="ab4-field-lbl">{block.fieldLabel}{block.fieldRequired ? ' *' : ''}:</div>
                        <Flatpickr className="form-control ab4-modern-fpick" options={{ dateFormat: 'd M, Y' }} placeholder="Select Date" />
                    </div>
                )}
                {block.type === 'checkbox' && <div className="ab4-field"><div className="ab4-cb-row"><input type="checkbox" readOnly className="ab4-cb" /><div className="ab4-cb-lbl">{block.fieldLabel}{block.fieldRequired ? ' *' : ''}</div></div></div>}
                {block.type === 'signature' && (
                    <div className="ab4-sig">
                        <div className="ab4-sig-col ab4-sig-col--drop" onClick={() => openFmForBlock && openFmForBlock(block.id)}>
                            {block.logoSrc ? <img src={block.logoSrc} style={{ maxHeight: 45 }} alt="" /> : <i className="ri-quill-pen-line ab4-sig-icon" />}
                            <div className="ab4-sig-meta">{block.fieldLabel || 'SIGNATURE'}</div>
                        </div>
                        <div className="ab4-sig-col ab4-sig-col--date">
                            <Flatpickr className="form-control ab4-sig-input" options={{ dateFormat: 'd M, Y' }} placeholder="Click here" />
                            <div className="ab4-sig-meta ab4-sig-meta--date">Signature Date</div>
                        </div>
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
}

// ── BlockList — the paginated A4 editor ───────────────────────────────────────
export function BlockList({
    blocks, onUpdate, onDelete, onMove, onInsert,
    selectedId, onSelect, onFocused, onBlurred,
    openFmForBlock, pagePad, docBg, isNested = false,
}: BlockListProps) {
    // pages[i] = array of block indices that belong on page i
    const [pages, setPages] = useState<number[][]>(() => [blocks.map((_, i) => i)]);
    const blockRefs = useRef<Record<string, HTMLElement>>({});   // block.id → DOM element
    const rafRef = useRef<any>(null);

    const distribute = useCallback(() => {
        const padTop = Math.round((pagePad || 80) * 0.9);
        const padBot = pagePad || 80;
        const usable = A4_H - padTop - padBot;
        const newPages: number[][] = [[]];
        let h = 0;

        blocks.forEach((block, i) => {
            const el = blockRefs.current[block.id];
            if (!el) {
                newPages[newPages.length - 1].push(i);
                return;
            }
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            const mt = parseFloat(style.marginTop) || 0;
            const mb = parseFloat(style.marginBottom) || 0;
            const blockH = rect.height + mt + mb;
            if (h + blockH > usable && newPages[newPages.length - 1].length > 0) {
                newPages.push([]);
                h = 0;
            }
            newPages[newPages.length - 1].push(i);
            h += blockH;
        });

        setPages(prev => {
            const sig = (p: number[][]) => p.map(pg => pg.join(',')).join('|');
            return sig(prev) === sig(newPages) ? prev : newPages;
        });
    }, [blocks, pagePad]);

    // Re-run pagination after blocks or pagePad change
    useEffect(() => {
        if (isNested) return;
        if (rafRef.current) clearTimeout(rafRef.current);
        rafRef.current = setTimeout(distribute, 150);
        return () => clearTimeout(rafRef.current);
    }, [blocks, distribute, isNested, pagePad]);

    const helpers = { onUpdate, onDelete, onMove, onInsert, onSelect, onFocused, onBlurred, selectedId, openFmForBlock };

    // ── Nested (inside Parties block) — no pagination ──────────────────────────
    if (isNested) {
        return (
            <div className="ab4-block-list">
                <InsertZone onInsert={(t) => onInsert(0, t)} />
                {blocks.map((block, i) => (
                    <React.Fragment key={block.id}>
                        <div ref={el => { if (el) blockRefs.current[block.id] = el; else delete blockRefs.current[block.id]; }}>
                            <BlockBody block={block} helpers={{ ...helpers, blockIdx: i }} />
                        </div>
                        <InsertZone onInsert={(t) => onInsert(i + 1, t)} />
                    </React.Fragment>
                ))}
            </div>
        );
    }

    // ── Top-level — paginated across A4 sheets ─────────────────────────────────
    return (
        <div className="ab4-pages-wrapper">
            {pages.map((pageIndices, pIdx) => (
                <React.Fragment key={pIdx}>
                    {pIdx > 0 && <div className="ab4-page-sep" />}
                    <div className="ab4-doc" style={{
                        background: docBg || '#fff',
                        // @ts-ignore
                        '--doc-pad-sides': `${pagePad}px`,
                        '--doc-pad-top': `${Math.round((pagePad || 80) * 0.9)}px`,
                        '--doc-pad-bot': `${pagePad}px`,
                    }}>
                        {/* First insert zone at start of page */}
                        <InsertZone onInsert={(t) => onInsert(pageIndices[0] ?? blocks.length, t)} />
                        {pageIndices.map((blockIdx) => {
                            const block = blocks[blockIdx];
                            if (!block) return null;
                            return (
                                <React.Fragment key={block.id}>
                                    <div ref={el => { if (el) blockRefs.current[block.id] = el; else delete blockRefs.current[block.id]; }}>
                                        <BlockBody block={block} helpers={{ ...helpers, blockIdx }} />
                                    </div>
                                    <InsertZone onInsert={(t) => onInsert(blockIdx + 1, t)} />
                                </React.Fragment>
                            );
                        })}
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}
