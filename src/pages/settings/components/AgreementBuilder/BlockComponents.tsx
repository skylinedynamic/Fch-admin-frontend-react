import React, { useState, useRef, useEffect, useCallback } from 'react';
import Flatpickr from 'react-flatpickr';
import { yearDropdownPlugin } from '../../../../utils/flatpickrPlugins';
import { toast } from 'react-toastify';
// @ts-ignore
import { PALETTE, makeBlock } from './utils';
import { AgreementBlock } from './types';

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
    
    useEffect(() => { 
        if (ref.current) {
            ref.current.innerHTML = block.content || ''; 
            lastValidHtml.current = block.content || '';
        } 
    }, []);

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
                onUpdate({ content: newHtml });
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

    const handleInput = () => {
        if (!ref.current) return;
        const currentHtml = ref.current.innerHTML;

        const blockEl = ref.current.closest('.ab4-block') as HTMLElement;
        const pageEl = ref.current.closest('.ab4-doc') as HTMLElement;
        if (blockEl && pageEl) {
            // Find the top-level block on the page
            let topBlockEl = blockEl;
            while (topBlockEl.parentElement) {
                const parentBlock = topBlockEl.parentElement.closest('.ab4-block') as HTMLElement;
                if (!parentBlock || !pageEl.contains(parentBlock)) break;
                topBlockEl = parentBlock;
            }

            const padTop = parseFloat(window.getComputedStyle(pageEl).getPropertyValue('--doc-pad-top')) || 72;
            const padBot = parseFloat(window.getComputedStyle(pageEl).getPropertyValue('--doc-pad-bot')) || 80;
            const usable = A4_H - padTop - padBot;

            let otherBlocksHeight = 0;
            const pageBlocks = Array.from(pageEl.querySelectorAll('.ab4-block')) as HTMLElement[];
            // Filter to only top-level blocks on this page
            const topLevelBlocks = pageBlocks.filter(b => {
                return !b.parentElement?.closest('.ab4-parties');
            });

            topLevelBlocks.forEach(otherBlock => {
                if (otherBlock !== topBlockEl) {
                    otherBlocksHeight += otherBlock.offsetHeight;
                    const cs = window.getComputedStyle(otherBlock);
                    otherBlocksHeight += (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
                }
            });

            // Include margin of the top-level block in its height
            const topBlockCs = window.getComputedStyle(topBlockEl);
            const topBlockMargin = (parseFloat(topBlockCs.marginTop) || 0) + (parseFloat(topBlockCs.marginBottom) || 0);
            
            const maxAllowedHeight = usable - otherBlocksHeight;
            const topBlockSpaceNeeded = topBlockEl.offsetHeight + topBlockMargin;

            if (topBlockSpaceNeeded > maxAllowedHeight) {
                // Revert natively using undo
                document.execCommand('undo');
                
                // Fallback to manual HTML restore if native undo did not lower the height below the limit
                if (topBlockEl.offsetHeight + topBlockMargin > maxAllowedHeight) {
                    ref.current.innerHTML = lastValidHtml.current;
                }

                onUpdate({ content: ref.current.innerHTML });

                toast.warn("Page limit reached! Content exceeds the page capacity.", {
                    toastId: "page-overflow-warning",
                    autoClose: 2000,
                });
                return;
            }
        }

        lastValidHtml.current = currentHtml;
        onUpdate({ content: currentHtml });
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
                    onBlur={() => { onBlurred(); if (ref.current) onUpdate({ content: ref.current.innerHTML }); }}
                    onInput={handleInput} />
            )}
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
        <div ref={ref} className={`ab4-iz ${isActive ? 'ab4-iz--active' : ''}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => !open && setHover(false)}>
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
    const { onUpdate, onDelete, onMove, onInsert, onSelect, onFocused, onBlurred, selectedId, openFmForBlock } = helpers;

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
                {block.type === 'logo' && (
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
                    <div className="ab4-sig" style={{ margin: 0 }}>
                        <div className="ab4-sig-col ab4-sig-col--drop" onClick={() => openFmForBlock && openFmForBlock(block.id)}>
                            {block.logoSrc ? <img src={block.logoSrc} style={{ maxHeight: 45 }} alt="" /> : <i className="ri-quill-pen-line ab4-sig-icon" />}
                            <div className="ab4-sig-meta" style={{
                                fontSize: block.fontSize ? `${block.fontSize * 0.7}px` : undefined,
                                fontFamily: block.fontFamily,
                            }}>{block.fieldLabel || 'SIGNATURE'}</div>
                        </div>
                        <div className="ab4-sig-col ab4-sig-col--date">
                            <Flatpickr className="form-control ab4-sig-input"
                                style={{
                                    fontSize: block.fontSize ? `${block.fontSize}px` : undefined,
                                    fontWeight: block.fontWeight as any,
                                    color: block.color,
                                    fontFamily: block.fontFamily,
                                    textAlign: 'center',
                                }}
                                options={AGREEMENT_DATE_OPTIONS} placeholder="Click here" />
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

// ── PageEntry — one block's slot on one page ──────────────────────────────────
interface PageEntry {
    blockIdx: number;
    clipTop: number;    // px from top of block where this page's window starts
    clipHeight: number; // px of visible block content on this page
    isSplit: boolean;   // true when this block overflows and is split across pages
}

// ── Smart Split Helper ────────────────────────────────────────────────────────
function getSmartSplitHeight(el: HTMLElement, maxHeight: number, clipTop: number): number {
    const editor = el.querySelector('.ab4-editor');
    if (!editor) return maxHeight;

    const children = Array.from(editor.children) as HTMLElement[];
    if (children.length === 0) {
        return maxHeight;
    }

    const parentRect = editor.getBoundingClientRect();
    let bestSplit = 0;
    let foundAny = false;

    for (const child of children) {
        const childRect = child.getBoundingClientRect();
        const top = childRect.top - parentRect.top;
        const bottom = childRect.bottom - parentRect.top;

        const relTop = top - clipTop;
        const relBottom = bottom - clipTop;

        if (relBottom <= maxHeight) {
            bestSplit = Math.max(bestSplit, relBottom);
            foundAny = true;
        } else {
            if (relTop > 0 && relTop < maxHeight) {
                bestSplit = Math.max(bestSplit, relTop);
                foundAny = true;
            }
            break;
        }
    }

    if (foundAny && bestSplit >= 40) {
        return bestSplit;
    }
    return maxHeight;
}

// ── BlockList — paginated A4 editor ───────────────────────────────────────────
export function BlockList({
    blocks, onUpdate, onDelete, onMove, onInsert,
    selectedId, onSelect, onFocused, onBlurred,
    openFmForBlock, pagePad, docBg, isNested = false,
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

        const newPages: PageEntry[][] = [[]];
        let h = 0;       // height used on the current page
        let lastMb = 0;

        blocks.forEach((block, i) => {
            const el = blockRefs.current[block.id];
            const blockH = heights[block.id];

            if (block.type === 'page-break') {
                newPages[newPages.length - 1].push({ blockIdx: i, clipTop: 0, clipHeight: 0, isSplit: false });
                newPages.push([]);
                h = 0;
                lastMb = 0;
                return;
            }

            if (!el || blockH === undefined) {
                // Not yet measured — place on current page as best-effort
                newPages[newPages.length - 1].push({ blockIdx: i, clipTop: 0, clipHeight: usable, isSplit: false });
                return;
            }

            const blockEl = (el.querySelector('.ab4-block') || el.firstElementChild || el) as HTMLElement;
            const cs = window.getComputedStyle(blockEl);
            const mt = parseFloat(cs.marginTop) || 0;
            const mb = parseFloat(cs.marginBottom) || 0;

            // Effective top margin (simulate CSS margin-collapse)
            const effectiveMt = newPages[newPages.length - 1].length === 0 ? mt : Math.max(lastMb, mt);
            const totalNeeded = effectiveMt + blockH;

            if (h + totalNeeded <= usable) {
                // ── Fits entirely on the current page ────────────────────────
                h += totalNeeded;
                newPages[newPages.length - 1].push({ blockIdx: i, clipTop: 0, clipHeight: blockH, isSplit: false });
                lastMb = mb;
                return;
            }

            // ── Doesn't fit on current page ───────────────────────────────────
            const spaceLeft = usable - h - effectiveMt;

            if (blockH > usable) {
                // Block is TALLER than one full A4 page — must slice it
                if (spaceLeft >= 40) {
                    // Use remaining space on current page for the first slice
                    const firstSliceH = getSmartSplitHeight(blockEl, spaceLeft, 0);
                    newPages[newPages.length - 1].push({
                        blockIdx: i, clipTop: 0, clipHeight: firstSliceH, isSplit: true
                    });
                    let consumed = firstSliceH;
                    let lastSliceH = firstSliceH;
                    while (consumed < blockH) {
                        newPages.push([]);
                        const maxSliceH = Math.min(usable, blockH - consumed);
                        const sliceH = (consumed + maxSliceH < blockH)
                            ? getSmartSplitHeight(blockEl, maxSliceH, consumed)
                            : maxSliceH;
                        newPages[newPages.length - 1].push({
                            blockIdx: i, clipTop: consumed, clipHeight: sliceH, isSplit: true
                        });
                        consumed += sliceH;
                        lastSliceH = sliceH;
                    }
                    h = lastSliceH;
                } else {
                    // Skip remaining space on current page, start fresh
                    newPages.push([]);
                    let consumed = 0;
                    let lastSliceH = 0;
                    while (consumed < blockH) {
                        if (consumed > 0) newPages.push([]);
                        const maxSliceH = Math.min(usable, blockH - consumed);
                        const sliceH = (consumed + maxSliceH < blockH)
                            ? getSmartSplitHeight(blockEl, maxSliceH, consumed)
                            : maxSliceH;
                        newPages[newPages.length - 1].push({
                            blockIdx: i, clipTop: consumed, clipHeight: sliceH, isSplit: true
                        });
                        consumed += sliceH;
                        lastSliceH = sliceH;
                    }
                    h = lastSliceH;
                }
            } else {
                // Block fits on one page — push it to the next page
                newPages.push([]);
                h = mt + blockH;
                newPages[newPages.length - 1].push({
                    blockIdx: i, clipTop: 0, clipHeight: blockH, isSplit: false
                });
            }

            lastMb = mb;
        });

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
                                <InsertZone onInsert={(t) => onInsert(firstBlockIdx, t)} />

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
                                                    <InsertZone onInsert={(t) => onInsert(entry.blockIdx + 1, t)} />
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
                                                        readOnly={isContinuation}
                                                    />
                                                </div>
                                            </div>
                                            {/* Insert zone only after the last slice on a page */}
                                            {isLastSliceOnThisPage && (
                                                <InsertZone onInsert={(t) => onInsert(entry.blockIdx + 1, t)} />
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
