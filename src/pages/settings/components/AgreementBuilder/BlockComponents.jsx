import React, { useState, useRef, useEffect } from 'react';
import Flatpickr from 'react-flatpickr';
import { PALETTE, makeBlock } from './utils';

export function TextBlock({ block, onUpdate, onFocused, onBlurred }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  useEffect(() => { if (ref.current) ref.current.innerHTML = block.content || ''; }, []);
  const bVars = {
    '--fs': `${block.fontSize}px`,
    '--fw': block.fontWeight,
    '--fst': block.fontStyle,
    '--ff': block.fontFamily,
    '--ta': block.textAlign,
    '--color': block.color,
    '--lh': block.lineHeight,
    '--ls': `${block.letterSpacing}px`,
    '--mt': `${block.marginTop}px`,
    '--mb': `${block.marginBottom}px`,
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

export function BlockList({ blocks, onUpdate, onDelete, onMove, onInsert, selectedId, onSelect, onFocused, onBlurred, fileInputRef }) {
  return (
    <div className="ab4-block-list">
      <InsertZone onInsert={(t) => onInsert(0, t)} />
      {blocks.map((block, i) => {
        const blockVars = {
          '--bg': block.bgColor,
          '--radius': `${block.borderRadius}px`,
          '--pad': `${block.padding}px`,
          '--opacity': block.bgOpacity,
          '--fs': `${block.fontSize || 13}px`,
          '--fw': block.fontWeight || 400,
          '--color': block.color || '#374151',
          '--ff': block.fontFamily || 'Inter',
          '--ta': block.textAlign || 'left'
        };
        return (
          <React.Fragment key={block.id}>
            <div className={`ab4-block ${selectedId === block.id ? 'ab4-block--sel' : ''}`} style={blockVars} onClick={(e) => { e.stopPropagation(); onSelect(block.id); }}>
              <div className="ab4-ctrl">
                <span className="ab4-badge"><i className="ri-stack-line me-1" />{block.type}</span>
                <div className="ab4-acts">
                  <button className="ab4-act" onClick={() => onMove(block.id, -1)}><i className="ri-arrow-up-s-line" /></button>
                  <button className="ab4-act" onClick={() => onMove(block.id, 1)}><i className="ri-arrow-down-s-line" /></button>
                  <button className="ab4-act ab4-act--del" onClick={() => onDelete(block.id)}><i className="ri-delete-bin-line" /></button>
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
                            onInsert={(idx, type) => {
                              const arr = [...block[listKey]]; arr.splice(idx, 0, makeBlock(type));
                              onUpdate(block.id, { [listKey]: arr });
                            }}
                            selectedId={selectedId} onSelect={onSelect} onFocused={onFocused} onBlurred={onBlurred} fileInputRef={fileInputRef} />
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
                    <Flatpickr
                      className="form-control ab4-modern-fpick"
                      options={{ dateFormat: "d M, Y" }}
                      placeholder="Select Date"
                    />
                  </div>
                )}
                {block.type === 'checkbox' && <div className="ab4-field"><div className="ab4-cb-row"><input type="checkbox" readOnly className="ab4-cb" /><div className="ab4-cb-lbl">{block.fieldLabel}{block.fieldRequired ? ' *' : ''}</div></div></div>}
                {block.type === 'signature' && (
                  <div className="ab4-sig">
                    <div className="ab4-sig-col ab4-sig-col--drop" onClick={() => { fileInputRef.current.dataset.blockId = block.id; fileInputRef.current.click(); }}>
                      {block.logoSrc ? <img src={block.logoSrc} style={{ maxHeight: 45 }} /> : <i className="ri-quill-pen-line ab4-sig-icon" />}
                      <div className="ab4-sig-meta">{block.fieldLabel || 'SIGNATURE'}</div>
                    </div>
                    <div className="ab4-sig-col ab4-sig-col--date">
                      <Flatpickr
                        className="form-control ab4-sig-input"
                        options={{ dateFormat: "d M, Y" }}
                        placeholder="DATE SIGNED"
                      />
                      <div className="ab4-sig-meta ab4-sig-meta--date">DATE SIGNED</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <InsertZone onInsert={(t) => onInsert(i + 1, t)} />
          </React.Fragment>
        );
      })}
    </div>
  );
}
