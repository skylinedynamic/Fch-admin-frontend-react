import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useAgreement, useSaveAgreement } from '../../../../modules/agreement';
import {
  PALETTE,
  makeBlock,
  getDemoTemplate,
  getAgreementHtml
} from './utils';
import '../../../../../assets/css/agreement-builder.css';

import { AgreementDashboard } from './AgreementDashboard';
import { BlockList, InsertZone } from './BlockComponents';
import { PropertyPanel } from './PropertyPanel';
import { AgreementBuilderLoader } from '../../../../components/Loader/AgreementLoader.jsx';

export default function AgreementBuilder() {
  const [screen, setScreen] = useState('dashboard');
  const [editingType, setEditingType] = useState(null);
  const [agreementId, setAgreementId] = useState(null);

  const [partnerBlocks, setPartnerBlocks] = useState(getDemoTemplate());
  const [borrowerBlocks, setBorrowerBlocks] = useState(getDemoTemplate());

  const [blocks, setBlocks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState('editor');

  const [saved, setSaved] = useState(false);
  const [focusedId, setFocusedId] = useState(null);
  const [pagePad, setPagePad] = useState(80);
  const [docBg, setDocBg] = useState('#ffffff');

  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  const { data: savedAgreement, isLoading: loadingAgreement } = useAgreement(editingType, !!editingType);
  const saveMutation = useSaveAgreement();

  // Update blocks when saved version is loaded via React Query
  useEffect(() => {
    const data = savedAgreement?.data;
    if (data) {
      setAgreementId(data.id);
      if (data.template_json) {
        try {
          const parsed = JSON.parse(data.template_json);
          // Handle both legacy (array) and new (object) structures
          if (Array.isArray(parsed)) {
            setBlocks(parsed);
            setPagePad(80); // Reset to default for old formats
            setDocBg('#ffffff');
          } else {
            setBlocks(parsed.blocks || []);
            setPagePad(parsed.pagePad ?? 80);
            setDocBg(parsed.docBg ?? '#ffffff');
          }
        } catch (e) {
          console.error("Failed to parse saved blocks JSON", e);
          setBlocks(getDemoTemplate());
        }
      }
    } else if (editingType) {
      setAgreementId(null);
      // Fallback to demo template if no saved version
      setBlocks(getDemoTemplate());
      setPagePad(80);
      setDocBg('#ffffff');
    }
  }, [savedAgreement, editingType]);

  const findBlock = (id, list = blocks) => {
    for (const b of list) {
      if (b.id === id) return b;
      if (b.type === 'parties') {
        const found = findBlock(id, b.partyA) || findBlock(id, b.partyB);
        if (found) return found;
      }
    }
    return null;
  };
  const updateBlock = (id, val, list = blocks) => {
    return list.map(b => {
      if (b.id === id) return { ...b, ...val };
      if (b.type === 'parties') return { ...b, partyA: updateBlock(id, val, b.partyA), partyB: updateBlock(id, val, b.partyB) };
      return b;
    });
  };

  const onUpdate = (id, val) => setBlocks(prev => updateBlock(id, val, prev));
  const onInsert = (idx, type) => {
    const arr = [...blocks]; arr.splice(idx, 0, makeBlock(type));
    setBlocks(arr); setSelectedId(arr[idx].id);
  };
  const onMove = (id, dir) => {
    const arr = [...blocks], idx = arr.findIndex(b => b.id === id);
    if ((dir === -1 && idx > 0) || (dir === 1 && idx < arr.length - 1)) {
      const [it] = arr.splice(idx, 1); arr.splice(idx + dir, 0, it); setBlocks(arr);
    }
  };

  const selected = findBlock(selectedId);
  const u = (val) => onUpdate(selectedId, val);

  // Logo upload handler
  const onFileChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => onUpdate(fileInputRef.current.dataset.blockId, { logoSrc: ev.target.result });
    r.readAsDataURL(file); e.target.value = '';
  };

  const html = useMemo(() => {
    return getAgreementHtml(blocks, { pagePad, docBg });
  }, [blocks, pagePad, docBg]);

  const handleEdit = (type) => {
    setEditingType(type);
    setBlocks(type === 'partner' ? partnerBlocks : borrowerBlocks);
    setScreen('builder');
  };

  const handleSave = async () => {
    try {
      const res = await saveMutation.mutateAsync({
        id: agreementId,
        slug: editingType,
        template_html: html,
        template_json: JSON.stringify({ blocks, pagePad, docBg })
      });

      if (res.status) {
        toast.success(res.message || 'Agreement saved successfully');
      }

      if (editingType === 'partner') setPartnerBlocks(blocks);
      else setBorrowerBlocks(blocks);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save agreement template", error);
      toast.error(error.response?.data?.message || 'Failed to save agreement');
    }
  };

  if (screen === 'dashboard') {
    return <AgreementDashboard onEdit={handleEdit} />;
  }

  if (loadingAgreement) {
    return <AgreementBuilderLoader />;
  }

  return (
    <div className="ab4-root fade-panel">
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
      <div className="ab4-toolbar">
        <div className="d-flex align-items-center gap-3">
          <button className="ab4-back-btn" onClick={() => setScreen('dashboard')} title="Back to Dashboard">
            <i className="ri-arrow-left-line" />
          </button>
          <div>
            <div className="ab4-tbar-title">{editingType === 'partner' ? 'Partner' : 'Borrower'} Agreement</div>
            <div className="ab4-tbar-sub">Editing active template for {editingType} onboarding</div>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="ab4-view-toggle">
            <button className={`ab4-vtb ${view === 'editor' ? 'ab4-vtb--on' : ''}`} onClick={() => setView('editor')}>Editor</button>
            <button className={`ab4-vtb ${view === 'preview' ? 'ab4-vtb--on' : ''}`} onClick={() => setView('preview')}>Preview</button>
          </div>
          <button className="btn btn-sm btn-outline-danger" onClick={() => setBlocks([])}>Clear All</button>
          <button className={`btn btn-sm ${saved ? 'btn-success' : 'btn-primary'}`} onClick={handleSave}>{saved ? 'Saving Template!' : 'Save Template'}</button>
        </div>
      </div>

      <div className="ab4-layout">
        {view === 'editor' ? (
          <>
            <div className="ab4-palette" onClick={() => setSelectedId(null)}>
              <div className="ab4-pal-hdr">Palette</div>
              {PALETTE.map(g => (
                <div key={g.group} className="ab4-grp">
                  <div className="ab4-grp-title">{g.group}</div>
                  {g.items.map(it => (
                    <button key={it.type} className="ab4-pal-btn" onClick={() => onInsert(blocks.length, it.type)}>
                      <i className={`${it.icon} ab4-pal-icon`} /><span>{it.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="ab4-center" onClick={() => setSelectedId(null)}>
              <div className="ab4-scroll">
                <div className="ab4-doc" style={{ '--page-padding': `${pagePad}px`, background: docBg }}>
                  {blocks.length === 0 ? (
                    <div className="ab4-empty">
                      <i className="ri-drag-drop-line" />
                      <strong>Empty Agreement</strong><p>Choose a block from the left or click <strong>+</strong> below</p>
                      <InsertZone onInsert={t => onInsert(0, t)} />
                    </div>
                  ) : (
                    <BlockList blocks={blocks}
                      onUpdate={onUpdate} onDelete={id => setBlocks(prev => prev.filter(b => b.id !== id))}
                      onMove={onMove} onInsert={onInsert}
                      selectedId={selectedId} onSelect={setSelectedId} onFocused={setFocusedId} onBlurred={() => setFocusedId(null)} fileInputRef={fileInputRef} />
                  )}
                </div>
              </div>
            </div>

            <PropertyPanel
              selected={selected}
              u={u}
              onUpdate={onUpdate}
              setBlocks={setBlocks}
              selectedId={selectedId}
              pagePad={pagePad}
              setPagePad={setPagePad}
              docBg={docBg}
              setDocBg={setDocBg}
            />
          </>
        ) : (
          <div className="ab4-preview">
            <div className="ab4-preview-bar px-3">
              <div className="d-flex align-items-center justify-content-between w-100">
                <div className="d-flex align-items-center gap-2">
                  <div className="ab4-tbar-icon" style={{ '--size': '28px', '--bg': 'rgba(16, 185, 129, 0.1)', '--clr': '#10b981' }}><i className="ri-eye-line" /></div>
                  <div className="fw-semibold">Agreement Preview</div>
                  <div className="ab4-live-indicator">
                    <span className="ab4-live-dot"></span>
                    Live rendered output
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="text-muted fs-12">
                    {blocks.length} {blocks.length === 1 ? 'Block' : 'Blocks'}
                  </div>
                  <button
                    className="btn btn-sm btn-primary d-flex align-items-center gap-1 waves-effect"
                    onClick={() => previewRef.current?.contentWindow?.print()}
                    title="Download as PDF"
                  >
                    <i className="ri-download-2-line fs-14"></i>
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
            <iframe ref={previewRef} className="ab4-preview-frame" srcDoc={html} title="Preview" frameBorder="0" style={{ height: 'calc(100% - 50px)' }} />
          </div>
        )}
      </div>
    </div>
  );
}
