import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar } from 'primereact/calendar';

import { PALETTE, makeBlock } from './utils';

// ── A4 at 96 dpi ─────────────────────────────────────────────────────────────
const A4_W = 794;   // px  (210mm)
const A4_H = 1123;  // px  (297mm)
const PAGE_PAD_TOP    = 72;
const PAGE_PAD_BOTTOM = 96;
const PAGE_PAD_SIDES  = 80;
const PAGE_GAP        = 15; // gap between pages (matches Preview)
const USABLE_H = A4_H - PAGE_PAD_TOP - PAGE_PAD_BOTTOM; // 955px

// ── TextBlock ─────────────────────────────────────────────────────────────────
export function TextBlock({ block, onUpdate, onFocused, onBlurred }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  useEffect(() => { if (ref.current) ref.current.innerHTML = block.content || ''; }, []);
  const bVars = {
    '--fs': `${block.fontSize}px`, '--fw': block.fontWeight, '--fst': block.fontStyle,
    '--ff': block.fontFamily, '--ta': block.textAlign, '--color': block.color,
    '--lh': block.lineHeight, '--ls': `${block.letterSpacing}px`,
    '--mt': `${block.marginTop}px`, '--mb': `${block.marginBottom}px`,
  };
  const exec = (cmd) => { document.execCommand(cmd, false, null); if (ref.current) onUpdate({ content: ref.current.innerHTML }); };
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

// ── InsertZone ────────────────────────────────────────────────────────────────
export function InsertZone({ onInsert }) {
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setHover(false); } };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="ab4-iz" onMouseEnter={() => setHover(true)} onMouseLeave={() => !open && setHover(false)}>
      {(hover || open) && (
        <div className="ab4-iz-line">
          <button type="button" className="ab4-iz-btn" onClick={() => setOpen(!open)}><i className={open ? 'ri-close-line' : 'ri-add-line'} /></button>
          {open && (
            <div className="ab4-iz-picker">
              {PALETTE.map(g => (
                <div key={g.group} className="ab4-iz-grp">
                  <div className="ab4-iz-grp-title">{g.group}</div>
                  <div className="ab4-iz-items">
                    {g.items.map(it => (
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

// ── Single block's inner content ──────────────────────────────────────────────
function BlockBody({ block, helpers }) {
  const { onUpdate, onDelete, onMove, onInsert, onSelect, onFocused, onBlurred, fileInputRef, selectedId, blockIdx } = helpers;
  const blockVars = {
    '--bg': block.bgColor, '--radius': `${block.borderRadius}px`, '--pad': `${block.padding}px`,
    '--opacity': block.bgOpacity, '--fs': `${block.fontSize || 13}px`, '--fw': block.fontWeight || 400,
    '--color': block.color || '#374151', '--ff': block.fontFamily || 'Inter', '--ta': block.textAlign || 'left',
    '--mt': `${block.marginTop ?? 0}px`, '--mb': `${block.marginBottom ?? 0}px`,
  };
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
          <div className="ab4-logo-wrap" style={{ '--align': block.logoAlign, '--mt': `${block.marginTop}px`, '--mb': `${block.marginBottom}px` }}>
            <div className="ab4-logo-ph" onClick={() => { fileInputRef.current.dataset.blockId = block.id; fileInputRef.current.click(); }}>
              {block.logoSrc ? <img src={block.logoSrc} alt="Logo" className="ab4-logo-img" style={{ '--w': block.logoFullWidth ? '100%' : `${block.logoWidth}px` }} />
                : <><i className="ri-image-add-line" /><span>Click to upload</span></>}
            </div>
          </div>
        )}
        {block.type === 'divider' && <hr className="ab4-hr" />}
        {block.type === 'spacer' && <div className="ab4-spacer-vis" style={{ height: block.spacerHeight }} />}
        {block.type === 'parties' && (
          <div className="ab4-parties">
            {[0, 1].map(x => {
              const side = x === 0 ? 'A' : 'B';
              const listKey = `party${side}`;
              return (
                <div key={side} className="ab4-party">
                  <div className="ab4-party-lbl" style={{ '--color': block.partyLabelColor, '--fs': `${block.partyLabelSize}px`, '--fw': block.partyLabelWeight, '--ff': block.partyLabelFamily }}>{block[`party${side}Label`]}</div>
                  <BlockList blocks={block[listKey]}
                    onUpdate={(sid, val) => onUpdate(block.id, { [listKey]: block[listKey].map(b => b.id === sid ? { ...b, ...val } : b) })}
                    onDelete={(sid) => onUpdate(block.id, { [listKey]: block[listKey].filter(b => b.id !== sid) })}
                    onMove={(sid, dir) => {
                      const arr = [...block[listKey]], idx = arr.findIndex(b => b.id === sid);
                      if ((dir === -1 && idx > 0) || (dir === 1 && idx < arr.length - 1)) {
                        const [it] = arr.splice(idx, 1); arr.splice(idx + dir, 0, it);
                        onUpdate(block.id, { [listKey]: arr });
                      }
                    }}
                    onInsert={(idx, type) => { const arr = [...block[listKey]]; arr.splice(idx, 0, makeBlock(type)); onUpdate(block.id, { [listKey]: arr }); }}
                    selectedId={selectedId} onSelect={onSelect} onFocused={onFocused} onBlurred={onBlurred} fileInputRef={fileInputRef} isNested />
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
            <div className="custom-datepicker">
                <Calendar className="w-100" dateFormat="dd M, yy" placeholder="Select Date" showIcon appendTo="self" readOnlyInput />
            </div>
          </div>
        )}

        {block.type === 'checkbox' && <div className="ab4-field"><div className="ab4-cb-row"><input type="checkbox" readOnly className="ab4-cb" /><div className="ab4-cb-lbl">{block.fieldLabel}{block.fieldRequired ? ' *' : ''}</div></div></div>}
        {block.type === 'signature' && (
          <div className="ab4-sig">
            <div className="ab4-sig-col ab4-sig-col--drop" onClick={() => { fileInputRef.current.dataset.blockId = block.id; fileInputRef.current.click(); }}>
              {block.logoSrc ? <img src={block.logoSrc} style={{ maxHeight: 45 }} alt="" /> : <i className="ri-quill-pen-line ab4-sig-icon" />}
              <div className="ab4-sig-meta">{block.fieldLabel || 'SIGNATURE'}</div>
            </div>
            <div className="ab4-sig-col ab4-sig-col--date">
              <div className="custom-datepicker">
                <Calendar className="w-100" dateFormat="dd M, yy" placeholder="Click here" showIcon appendTo="self" readOnlyInput />
              </div>
              <div className="ab4-sig-meta ab4-sig-meta--date">Signature Date</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BlockList — the paginated A4 editor ───────────────────────────────────────
export function BlockList({
  blocks, onUpdate, onDelete, onMove, onInsert,
  selectedId, onSelect, onFocused, onBlurred,
  fileInputRef, pagePad, docBg, isNested = false,
}) {
  // pages[i] = array of block indices that belong on page i
  const [pages, setPages] = useState(() => [blocks.map((_, i) => i)]);
  const blockRefs = useRef({});   // block.id → DOM element
  const rafRef    = useRef(null);

  const distribute = useCallback(() => {
    const usable = USABLE_H; // 955px
    const newPages = [[]];
    let h = 0;

    blocks.forEach((block, i) => {
      const el = blockRefs.current[block.id];
      const blockH = el ? el.getBoundingClientRect().height : 0;
      // if adding this block would overflow and we already have something on this page
      if (h + blockH > usable && newPages[newPages.length - 1].length > 0) {
        newPages.push([]);
        h = 0;
      }
      newPages[newPages.length - 1].push(i);
      h += blockH;
    });

    setPages(prev => {
      const sig = p => p.map(pg => pg.join(',')).join('|');
      return sig(prev) === sig(newPages) ? prev : newPages;
    });
  }, [blocks]);

  // Re-run pagination 150ms after blocks change (DOM needs to paint first)
  useEffect(() => {
    if (isNested) return;
    if (rafRef.current) clearTimeout(rafRef.current);
    rafRef.current = setTimeout(distribute, 150);
    return () => clearTimeout(rafRef.current);
  }, [blocks, distribute, isNested]);

  const helpers = { onUpdate, onDelete, onMove, onInsert, onSelect, onFocused, onBlurred, fileInputRef, selectedId };

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
              '--doc-pad-sides': `${pagePad}px`,
              '--doc-pad-top': `${Math.round(pagePad * 0.9)}px`,
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
