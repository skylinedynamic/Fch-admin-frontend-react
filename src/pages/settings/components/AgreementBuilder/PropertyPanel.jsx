import React from 'react';
import { CustomSelect } from './CommonUI';
import { COLOR_SWATCHES } from './utils';

export function PropertyPanel({ selected, u, onUpdate, setBlocks, selectedId, pagePad, setPagePad, docBg, setDocBg }) {
  return (
    <div className="ab4-props">
      <div className="ab4-props-title">{selected ? 'Block Properties' : 'Document Settings'}</div>
      {selected ? (
        <div className="ab4-props-content">
          <div className="ab4-props-hdr text-slate-800"><i className="ri-settings-4-line" />{selected.type.toUpperCase()}</div>

          {/* Typography - For relevant blocks */}
          {['text', 'input', 'textarea', 'date', 'checkbox', 'signature'].includes(selected.type) && (
            <div className="ab4-ps">
              <CustomSelect label="Font Family" value={selected.fontFamily} onChange={v => u({ fontFamily: v })}
                options={[
                  { label: 'Inter', value: 'Inter, sans-serif' },
                  { label: 'Playfair Display', value: "'Playfair Display', serif" },
                  { label: 'Roboto', value: "'Roboto', sans-serif" },
                  { label: 'Lora (Classic)', value: "'Lora', serif" },
                  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
                  { label: 'Monospace', value: "'Fira Code', monospace" },
                ]} />

              <div className="row g-2 mt-2 mb-2">
                <div className="col-4">
                  <label className="ab4-pl fs-9">Size</label>
                  <input type="number" className="form-control form-control-sm" value={selected.fontSize} onChange={e => u({ fontSize: +e.target.value })} />
                </div>
                <div className="col-8">
                  <label className="ab4-pl fs-9">Weight</label>
                  <div className="ab4-btn-grid">
                    {['400', '600', '800'].map(w => (
                      <button key={w} className={`ab4-bg-btn ${selected.fontWeight === w ? 'ab4-bg-btn--on' : ''}`} onClick={() => u({ fontWeight: w })}>
                        {w === '400' ? 'Reg' : w === '600' ? 'Med' : 'Bold'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ab4-btn-grid mb-3">
                {['left', 'center', 'right', 'justify'].map(a => (
                  <button key={a} className={`ab4-bg-btn ${selected.textAlign === a ? 'ab4-bg-btn--on' : ''}`} onClick={() => u({ textAlign: a })} title={a}>
                    <i className={`ri-align-${a}`} />
                  </button>
                ))}
              </div>

              <div className="row g-2 mb-2">
                <div className="col-6"><label className="ab4-pl fs-9">Line H</label><input type="number" step="0.1" className="form-control form-control-sm" value={selected.lineHeight} onChange={e => u({ lineHeight: +e.target.value })} /></div>
                <div className="col-6"><label className="ab4-pl fs-9">Tracking</label><input type="number" step="0.5" className="form-control form-control-sm" value={selected.letterSpacing} onChange={e => u({ letterSpacing: +e.target.value })} /></div>
              </div>

              <label className="ab4-pl">Formatting & Lists</label>
              <div className="ab4-btn-grid">
                <button className="ab4-bg-btn" onClick={() => document.execCommand('bold')} title="Bold"><i className="ri-bold" /></button>
                <button className="ab4-bg-btn" onClick={() => document.execCommand('italic')} title="Italic"><i className="ri-italic" /></button>
                <button className="ab4-bg-btn" onClick={() => document.execCommand('underline')} title="Underline"><i className="ri-underline" /></button>
                <button className="ab4-bg-btn" onClick={() => document.execCommand('insertUnorderedList')} title="Bulleted List"><i className="ri-list-unordered" /></button>
                <button className="ab4-bg-btn" onClick={() => document.execCommand('insertOrderedList')} title="Numbered List"><i className="ri-list-ordered" /></button>
              </div>
            </div>
          )}

          {/* Parties Labels Customization */}
          {selected.type === 'parties' && (
            <div className="ab4-ps">
              <CustomSelect label="Party Label Font" value={selected.partyLabelFamily} onChange={v => u({ partyLabelFamily: v })}
                options={[
                  { label: 'Inter', value: 'Inter, sans-serif' },
                  { label: 'Playfair Display', value: "'Playfair Display', serif" },
                  { label: 'Roboto', value: "'Roboto', sans-serif" },
                  { label: 'Lora', value: "'Lora', serif" },
                ]} />
              <div className="row g-2 mt-2">
                <div className="col-4">
                  <label className="ab4-pl fs-9">Size</label>
                  <input type="number" className="form-control form-control-sm" value={selected.partyLabelSize} onChange={e => u({ partyLabelSize: +e.target.value })} />
                </div>
                <div className="col-8">
                  <label className="ab4-pl fs-9">Weight</label>
                  <div className="ab4-btn-grid">
                    {['400', '700', '800'].map(w => (
                      <button key={w} className={`ab4-bg-btn ${selected.partyLabelWeight === w ? 'ab4-bg-btn--on' : ''}`} onClick={() => u({ partyLabelWeight: w })}>
                        {w === '400' ? 'Reg' : w === '700' ? 'Bold' : 'Extra'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ab4-btn-grid mt-2 mb-2">
                {['left', 'center', 'right'].map(a => (
                  <button key={a} className={`ab4-bg-btn ${selected.partyLabelAlign === a ? 'ab4-bg-btn--on' : ''}`} onClick={() => u({ partyLabelAlign: a })} title={a}>
                    <i className={`ri-align-${a}`} />
                  </button>
                ))}
              </div>

              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fs-10 fw-bold w-25">COLOR</span>
                <div className="ab4-color-grid flex-1 m-0">
                  {['#1e293b', '#6366f1', '#ef4444', '#22c55e', '#f59e0b'].map(c => <div key={c} className={`ab4-swatch ab4-swatch--sm ${selected.partyLabelColor === c ? 'ab4-swatch--on' : ''}`} style={{ background: c }} onClick={() => u({ partyLabelColor: c })} />)}
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6"><label className="ab4-pl fs-9">Line H</label><input type="number" step="0.1" className="form-control form-control-sm" value={selected.partyLabelLineHeight} onChange={e => u({ partyLabelLineHeight: +e.target.value })} /></div>
                <div className="col-6"><label className="ab4-pl fs-9">Track</label><input type="number" step="0.1" className="form-control form-control-sm" value={selected.partyLabelSpacing} onChange={e => u({ partyLabelSpacing: +e.target.value })} /></div>
              </div>

              <label className="ab4-pl">Titles</label>
              <input className="form-control form-control-sm mb-2" value={selected.partyALabel} onChange={e => u({ partyALabel: e.target.value })} placeholder="Party A Title" />
              <input className="form-control form-control-sm mb-2" value={selected.partyBLabel} onChange={e => u({ partyBLabel: e.target.value })} placeholder="Party B Title" />
            </div>
          )}

          {/* Colors & Background */}
          <div className="ab4-ps">
            <label className="ab4-pl">Colors</label>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="fs-10 fw-bold w-25">TEXT</span>
              <div className="ab4-color-grid flex-1 m-0">
                {COLOR_SWATCHES.slice(0, 10).map(c => <div key={c} className={`ab4-swatch ${selected.color === c ? 'ab4-swatch--on' : ''}`} style={{ background: c }} onClick={() => u({ color: c })} />)}
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="fs-10 fw-bold w-25">BG</span>
              <div className="ab4-color-grid flex-1 m-0">
                {['transparent', '#f8fafc', '#fef2f2', '#f0f9ff', '#f0fdf4', '#fffef2', '#6366f1'].map(c => <div key={c} className={`ab4-swatch ${selected.bgColor === c ? 'ab4-swatch--on' : ''}`} style={{ background: c, border: c === 'transparent' ? '1px dashed #ccc' : 'none' }} onClick={() => u({ bgColor: c })} />)}
              </div>
            </div>
          </div>

          {/* Layout & Spacing */}
          <div className="ab4-ps">
            <label className="ab4-pl">Spacing & Radius</label>
            <div className="row g-2 mb-2">
              <div className="col-4"><label className="ab4-pl fs-9">Top M</label><input type="number" className="form-control form-control-sm" value={selected.marginTop} onChange={e => u({ marginTop: +e.target.value })} /></div>
              <div className="col-4"><label className="ab4-pl fs-9">Bot M</label><input type="number" className="form-control form-control-sm" value={selected.marginBottom} onChange={e => u({ marginBottom: +e.target.value })} /></div>
              <div className="col-4"><label className="ab4-pl fs-9">Pad</label><input type="number" className="form-control form-control-sm" value={selected.padding} onChange={e => u({ padding: +e.target.value })} /></div>
            </div>
            <div className="row g-2">
              <div className="col-6"><label className="ab4-pl fs-9">Radius</label><input type="number" className="form-control form-control-sm" value={selected.borderRadius} onChange={e => u({ borderRadius: +e.target.value })} /></div>
              <div className="col-6"><label className="ab4-pl fs-9">Opacity</label><input type="number" step="0.1" max="1" min="0" className="form-control form-control-sm" value={selected.bgOpacity} onChange={e => u({ bgOpacity: +e.target.value })} /></div>
            </div>
          </div>

          {/* Logo Config */}
          {selected.type === 'logo' && (
            <div className="ab4-ps">
              <label className="ab4-pl"><i className="ri-image-2-line me-1" /> Logo Alignment</label>
              <div className="ab4-btn-grid mb-3">
                {['left', 'center', 'right'].map(a => (
                  <button key={a} className={`ab4-bg-btn ${selected.logoAlign === a ? 'ab4-bg-btn--on' : ''}`} onClick={() => u({ logoAlign: a })}><i className={`ri-align-${a}`} /></button>
                ))}
              </div>
              <label className="ab4-pl"><i className="ri-aspect-ratio-line me-1" /> Size Control</label>
              <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" checked={selected.logoFullWidth} onChange={e => u({ logoFullWidth: e.target.checked })} id="lfw" />
                <label className="form-check-label fs-12 ms-1" htmlFor="lfw">Full Width</label>
              </div>
              {!selected.logoFullWidth && (
                <div className="mb-3 px-1">
                  <div className="d-flex justify-content-between mb-1"><span className="fs-10 text-muted">WIDTH</span><span className="fs-10 fw-bold">{selected.logoWidth}px</span></div>
                  <input type="range" className="form-range" min={40} max={600} value={selected.logoWidth} onChange={e => u({ logoWidth: +e.target.value })} />
                </div>
              )}
            </div>
          )}

          {['input', 'textarea', 'date', 'checkbox', 'signature'].includes(selected.type) && (
            <div className="ab4-ps">
              <label className="ab4-pl"><i className="ri-list-settings-line me-1" /> Field Setup</label>
              <div className="mb-2">
                <label className="ab4-pl fs-9">Field Label</label>
                <input className="form-control form-control-sm" value={selected.fieldLabel} onChange={e => u({ fieldLabel: e.target.value })} placeholder="Label" />
              </div>
              {['input', 'textarea'].includes(selected.type) && (
                <div className="mb-2">
                  <label className="ab4-pl fs-9">Placeholder</label>
                  <input className="form-control form-control-sm" value={selected.fieldPlaceholder} onChange={e => u({ fieldPlaceholder: e.target.value })} placeholder="Placeholder" />
                </div>
              )}
              <div className="form-check form-switch mt-2">
                <input className="form-check-input" type="checkbox" checked={selected.fieldRequired} onChange={e => u({ fieldRequired: e.target.checked })} id="req-switch" />
                <label className="form-check-label fs-12 ms-1" htmlFor="req-switch">Required Field</label>
              </div>
            </div>
          )}

          <div className="ab4-ps border-0 mt-auto">
            <button className="btn btn-sm btn-outline-danger w-100" onClick={() => setBlocks(prev => prev.filter(b => b.id !== selectedId))}><i className="ri-delete-bin-line me-1" />Delete Block</button>
          </div>
        </div>
      ) : (
        <div className="ab4-props-content">
          <div className="ab4-props-hdr text-secondary"><i className="ri-file-text-line" />Global Settings</div>
          <div className="ab4-ps">
            <label className="ab4-pl text-uppercase">Page Layout</label>
            <label className="ab4-pl fs-9">Page Padding: <strong>{pagePad}px</strong></label>
            <input type="range" className="form-range mb-2" min={20} max={150} value={pagePad} onChange={e => setPagePad(+e.target.value)} />

            <label className="ab4-pl fs-9 mt-3">Document Color</label>
            <div className="ab4-color-grid">
              {['#ffffff', '#fafafa', '#f8fafc', '#fcfcfc', '#fffef5'].map(c => (
                <div key={c}
                  className={`ab4-swatch ${docBg === c ? 'ab4-swatch--on' : ''}`}
                  style={{ background: c, border: '1px solid #eee' }}
                  onClick={() => setDocBg(c)}
                />
              ))}
            </div>
          </div>
          <div className="ab4-ps p-4 text-center opacity-50">
            <i className="ri-mouse-line fs-3 mb-2 d-inline-block" />
            <p className="fs-12">Click any block to edit its individual properties</p>
          </div>
        </div>
      )}
    </div>
  );
}
