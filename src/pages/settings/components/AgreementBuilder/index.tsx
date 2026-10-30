import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { useAgreement, useAgreementPreviewValues, useSaveAgreement } from '../../../../modules/agreement';
import { useConfigPartner } from '../../../../modules/settings/configPartner';
import { useAuthStore } from '../../../../store/auth/authStore';

import {
    PALETTE,
    makeBlock,
    moveBlock,
    getAgreementHtml,
    withMergeSamples
} from './utils';
import { AgreementBlock } from './types';
import "../../../../../assets/css/agreement-builder.css";

// @ts-ignore
import { AgreementDashboard } from './AgreementDashboard';
// @ts-ignore
import { BlockList, InsertZone, PALETTE_DRAG_TYPE, DropTargetContext, type DropTarget } from './BlockComponents';
// @ts-ignore
import { PropertyPanel } from './PropertyPanel';
import { AgreementBuilderLoader } from '../../../../components/Loader/AgreementLoader';
import { withAppCalendar } from '../../../../utils/agreementCalendar';
import { FileManagerModal } from '../../../../components/FileManagerModal/FileManagerModal';
import type { FileSystemItem } from '../../../../modules/filemanager/types';
import { useBuilderHistory } from './useBuilderHistory';
import { ConfirmDialog } from './ConfirmDialog';
import { StarterTemplatesDialog } from './StarterTemplatesDialog';
import { defaultTemplateFor } from './starterTemplates';
import { MergeFieldsHint } from './MergeFieldsHint';

const AgreementBuilder: React.FC = () => {
    const { user } = useAuthStore();
    const partnerId = user?.partner_id || user?.entity_id || 0;
    const [screen, setScreen] = useState<'dashboard' | 'builder'>('dashboard');
    const [editingType, setEditingType] = useState<'partner' | 'borrower' | null>(null);
    const [agreementId, setAgreementId] = useState<number | null>(null);

    const [partnerBlocks, setPartnerBlocks] = useState<AgreementBlock[]>(() => defaultTemplateFor('partner'));
    const [borrowerBlocks, setBorrowerBlocks] = useState<AgreementBlock[]>(() => defaultTemplateFor('borrower'));

    const [blocks, setBlocks] = useState<AgreementBlock[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [view, setView] = useState<'editor' | 'preview'>('editor');

    const [saved, setSaved] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [pagePad, setPagePad] = useState<number>(80);
    const [docBg, setDocBg] = useState<string>('#ffffff');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [fmOpen, setFmOpen] = useState<boolean>(false);
    const [fmTargetBlockId, setFmTargetBlockId] = useState<string | null>(null);

    const previewRef = useRef<HTMLIFrameElement>(null);

    // Settings and Partner profile › Configuration both leave the builder a narrow
    // column that cuts the A4 page off, so agreements are edited full screen.
    const configPartner = useConfigPartner();
    const configPartnerName = configPartner?.company_name || configPartner?.full_name || 'Partner';
    const fullScreen = screen === 'builder';
    const agreementName = `${editingType === 'partner' ? 'Partner' : 'Borrower'} agreement`;

    useEffect(() => {
        if (!fullScreen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [fullScreen]);

    // isPending, not isLoading: before the fetch starts isLoading is briefly false, which
    // flashed the builder with the wrong blocks before the loader.
    const { data: savedAgreement, isPending: loadingAgreement } = useAgreement(editingType as any, !!editingType);
    const saveMutation = useSaveAgreement();

    // Undo/redo, and whether there are changes since the agreement was loaded or saved.
    const snapshot = useMemo(() => ({ blocks, pagePad, docBg }), [blocks, pagePad, docBg]);
    const applySnapshot = useCallback((s: { blocks: AgreementBlock[]; pagePad: number; docBg: string }) => {
        setBlocks(s.blocks);
        setPagePad(s.pagePad);
        setDocBg(s.docBg);
    }, []);
    const history = useBuilderHistory(snapshot, applySnapshot);
    const [baseline, setBaseline] = useState<string | null>(null);
    const [savedThisSession, setSavedThisSession] = useState(false);
    const [confirming, setConfirming] = useState<'clear' | 'close' | null>(null);
    const [pickingTemplate, setPickingTemplate] = useState(false);
    const [dragging, setDragging] = useState(false);
    // A palette item held over the empty page: the whole page takes the drop.
    const [emptyDrop, setEmptyDrop] = useState(false);
    const [dropTarget, setDropTarget] = useState<DropTarget>(null);
    const dropTargetValue = useMemo(() => ({ target: dropTarget, setTarget: setDropTarget }), [dropTarget]);
    const endDrag = () => { setDragging(false); setDropTarget(null); };
    const dirty = baseline !== null && JSON.stringify(snapshot) !== baseline;
    const hasSavedCopy = agreementId !== null || savedThisSession;

    // An agreement loaded: history and "unsaved changes" start from here.
    const loadSnapshot = (loaded: { blocks: AgreementBlock[]; pagePad: number; docBg: string }) => {
        applySnapshot(loaded);
        history.reset(loaded);
        setBaseline(JSON.stringify(loaded));
    };

    // Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y - except while typing, where the browser's own undo applies.
    useEffect(() => {
        if (!fullScreen) return;
        const onKey = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            const target = e.target as HTMLElement | null;
            if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')) return;
            const key = e.key.toLowerCase();
            if (key === 'z' && !e.shiftKey) { e.preventDefault(); history.undo(); }
            else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); history.redo(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [fullScreen, history.undo, history.redo]);

    const requestClose = () => (dirty ? setConfirming('close') : setScreen('dashboard'));

    // Update blocks when saved version is loaded via React Query
    useEffect(() => {
        const data = savedAgreement?.data as any;
        if (data) {
            setAgreementId(data.id);
            if (data.template_json) {
                try {
                    const parsed = JSON.parse(data.template_json);
                    // Handle both legacy (array) and new (object) structures
                    if (Array.isArray(parsed)) {
                        loadSnapshot({ blocks: parsed as any, pagePad: 80, docBg: '#ffffff' }); // Reset to default for old formats
                    } else {
                        loadSnapshot({ blocks: parsed.blocks || [], pagePad: parsed.pagePad ?? 80, docBg: parsed.docBg ?? '#ffffff' });
                    }
                } catch (e) {
                    console.error("Failed to parse saved blocks JSON", e);
                    loadSnapshot({ blocks: defaultTemplateFor(editingType ?? 'partner'), pagePad, docBg });
                }
            } else {
                loadSnapshot({ blocks, pagePad, docBg });
            }
        } else if (editingType) {
            setAgreementId(null);
            // Nothing saved yet: start from the master agreement for this type.
            loadSnapshot({ blocks: defaultTemplateFor(editingType), pagePad: 80, docBg: '#ffffff' });
        }
    }, [savedAgreement, editingType]);

    const findBlock = (id: string | null, list: AgreementBlock[] = blocks): AgreementBlock | null => {
        if (!id) return null;
        for (const b of list) {
            if (b.id === id) return b;
            if (b.type === 'parties') {
                const found = findBlock(id, b.partyA) || findBlock(id, b.partyB);
                if (found) return found;
            }
        }
        return null;
    };

    const updateBlock = (id: string | null, val: Partial<AgreementBlock>, list: AgreementBlock[] = blocks): AgreementBlock[] => {
        if (!id) return list;
        return list.map(b => {
            if (b.id === id) return { ...b, ...val };
            if (b.type === 'parties') return { ...b, partyA: updateBlock(id, val, b.partyA || []), partyB: updateBlock(id, val, b.partyB || []) };
            return b;
        });
    };

    const onUpdate = (id: string | null, val: Partial<AgreementBlock>) => setBlocks(prev => updateBlock(id, val, prev));

    const onInsert = (idx: number, type: string) => {
        const arr = [...blocks];
        const newBlock = makeBlock(type);
        arr.splice(idx, 0, newBlock);
        setBlocks(arr);
        setSelectedId(newBlock.id);
    };

    // The palette adds below the selected top-level block, or at the end.
    const paletteInsertIndex = () => {
        const selectedIndex = blocks.findIndex(b => b.id === selectedId);
        return selectedIndex >= 0 ? selectedIndex + 1 : blocks.length;
    };

    const onMove = (id: string, dir: number) => {
        const arr = [...blocks];
        const idx = arr.findIndex(b => b.id === id);
        if ((dir === -1 && idx > 0) || (dir === 1 && idx < arr.length - 1)) {
            const [it] = arr.splice(idx, 1);
            arr.splice(idx + dir, 0, it);
            setBlocks(arr);
        }
    };

    const selected = findBlock(selectedId);
    const u = (val: Partial<AgreementBlock>) => onUpdate(selectedId, val);

    // Logo/image upload via FileManager modal
    const handleFmSelect = (files: FileSystemItem[]) => {
        if (fmTargetBlockId && files[0]?.url) {
            onUpdate(fmTargetBlockId, { logoSrc: files[0].url });
        }
        setFmOpen(false);
        setFmTargetBlockId(null);
    };

    const openFmForBlock = (blockId: string) => {
        setFmTargetBlockId(blockId);
        setFmOpen(true);
    };

    useEffect(() => {
        (window as any).__openFmForBlock = openFmForBlock;
        return () => {
            delete (window as any).__openFmForBlock;
        };
    }, [openFmForBlock]);


    const html = useMemo(() => {
        return getAgreementHtml(blocks, { pagePad, docBg });
    }, [blocks, pagePad, docBg]);

    // The preview opens the app's own calendar in the date fields; the
    // agreement is saved as it is (handleSave uses `html`).
    // The company fields show the owner's real details; signer fields show examples.
    const { data: previewValues } = useAgreementPreviewValues(view === 'preview');
    const previewHtml = useMemo(() => withAppCalendar(withMergeSamples(html, previewValues)), [html, previewValues]);

    const handleEdit = (type: 'partner' | 'borrower') => {
        setEditingType(type);
        setBlocks(type === 'partner' ? partnerBlocks : borrowerBlocks);
        setScreen('builder');
    };

    const handleSave = async () => {
        if (!editingType) return;
        try {
            const res = await saveMutation.mutateAsync({
                id: agreementId as any,
                slug: editingType,
                template_html: html,
                template_json: JSON.stringify({ blocks, pagePad, docBg })
            });

            if (res.status) {
                toast.success(res.message || 'Agreement saved successfully');
            }

            if (editingType === 'partner') setPartnerBlocks(blocks);
            else setBorrowerBlocks(blocks);
            setBaseline(JSON.stringify({ blocks, pagePad, docBg }));
            setSavedThisSession(true);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error: any) {
            console.error("Failed to save agreement template", error);
            toast.error(error.response?.data?.message || 'Failed to save agreement');
        }
    };

    if (screen === 'dashboard') {
        return <AgreementDashboard onEdit={handleEdit} />;
    }

    const editor = loadingAgreement ? <AgreementBuilderLoader /> : (
        <div
            className={`ab4-root fade-panel ${dragging ? 'ab4-root--dragging' : ''}`}
            // While a block or palette item is dragged, the gaps between blocks get a hit area.
            onDragStartCapture={() => setDragging(true)}
            onDragEndCapture={endDrag}
            onDropCapture={() => setDragging(false)}
        >
            <FileManagerModal
                isOpen={fmOpen}
                toggle={() => setFmOpen(!fmOpen)}
                selectionMode
                section="Agreements"
                initialPath="/"
                entityType="agreements"
                entityId={(partnerId || 1) as any}
                getAll={false}
                onSelectFiles={handleFmSelect}
            />
            <div className="ab4-toolbar">
                <div className="d-flex align-items-center gap-3">
                    <button className="ab4-mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle palette">
                        <i className="ri-menu-line" />
                    </button>
                    <button
                        className="ab4-back-btn"
                        onClick={requestClose}
                        title={fullScreen ? 'Close editor' : 'Back to Dashboard'}
                        aria-label={fullScreen ? 'Close editor' : 'Back to Dashboard'}
                    >
                        <i className="ri-arrow-left-line" />
                    </button>
                    <div>
                        <div className="d-flex align-items-center gap-2">
                            <div className="ab4-tbar-title">{editingType === 'partner' ? 'Partner' : 'Borrower'} Agreement</div>
                            {dirty ? (
                                <span className="ab4-save-state ab4-save-state--dirty"><span className="ab4-save-state__dot" />Unsaved changes</span>
                            ) : hasSavedCopy && (
                                <span className="ab4-save-state ab4-save-state--saved"><i className="ri-check-line" />All changes saved</span>
                            )}
                        </div>
                        <div className="ab4-tbar-sub">
                            {configPartner
                                ? `Editing ${configPartnerName}'s active template for ${editingType} onboarding`
                                : `Editing active template for ${editingType} onboarding`}
                        </div>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <div className="ab4-history" role="group" aria-label="History">
                        <button type="button" className="ab4-history__btn" onClick={history.undo} disabled={!history.canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
                            <i className="ri-arrow-go-back-line" />
                        </button>
                        <button type="button" className="ab4-history__btn" onClick={history.redo} disabled={!history.canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
                            <i className="ri-arrow-go-forward-line" />
                        </button>
                    </div>
                    <div className="ab4-view-toggle">
                        <button className={`ab4-vtb ${view === 'editor' ? 'ab4-vtb--on' : ''}`} onClick={() => setView('editor')}>Editor</button>
                        <button className={`ab4-vtb ${view === 'preview' ? 'ab4-vtb--on' : ''}`} onClick={() => setView('preview')}>Preview</button>
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-secondary ab4-templates-btn" onClick={() => setPickingTemplate(true)}>
                        <i className="ri-layout-masonry-line me-1" aria-hidden="true" />Templates
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirming('clear')} disabled={blocks.length === 0}>Clear All</button>
                    <button className={`btn btn-sm ${saved ? 'btn-success' : 'btn-primary'} ab4-save-btn`} onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" /> : <i className={`${saved ? 'ri-check-line' : 'ri-save-3-line'} me-1`} />}
                        Save Template
                    </button>
                </div>
            </div>

            {pickingTemplate && (
                <StarterTemplatesDialog
                    audience={editingType ?? 'partner'}
                    onClose={() => setPickingTemplate(false)}
                    onPick={(template) => { setBlocks(template.blocks()); setSelectedId(null); setPickingTemplate(false); }}
                />
            )}
            {confirming === 'clear' && (
                <ConfirmDialog
                    title="Clear the whole agreement?"
                    message="Every block on every page will be removed. You can undo this until you close the editor."
                    confirmLabel="Clear everything"
                    icon="ri-delete-bin-line"
                    onCancel={() => setConfirming(null)}
                    onConfirm={() => { setBlocks([]); setSelectedId(null); setConfirming(null); }}
                />
            )}
            {confirming === 'close' && (
                <ConfirmDialog
                    title="Discard unsaved changes?"
                    message="Your changes to this agreement have not been saved. Signers keep seeing the last saved version."
                    confirmLabel="Discard changes"
                    cancelLabel="Keep editing"
                    onCancel={() => setConfirming(null)}
                    onConfirm={() => { setConfirming(null); setScreen('dashboard'); }}
                />
            )}

            <div className={`ab4-layout ${sidebarOpen ? 'ab4-layout--drawer-open' : ''} ${selectedId ? 'ab4-layout--selected' : ''}`}>
                {sidebarOpen && <div className="ab4-drawer-backdrop" onClick={() => setSidebarOpen(false)} />}
                {view === 'editor' ? (
                    <>
                        <div className={`ab4-palette ${sidebarCollapsed ? 'ab4-palette--collapsed' : ''} ${sidebarOpen ? 'ab4-palette--open' : ''}`} onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}>
                            <div className="ab4-pal-hdr">
                                <span className="ab4-pal-hdr__text">
                                    <span className="ab4-pal-hdr__title">Blocks</span>
                                    <span className="ab4-pal-hdr__sub">Drag onto the page, or click to add</span>
                                </span>
                                <button type="button" className="ab4-sidebar-toggle" onClick={(e) => { e.stopPropagation(); setSidebarCollapsed(!sidebarCollapsed); }} title="Toggle sidebar">
                                    <i className={`ri-arrow-${sidebarCollapsed ? 'right' : 'left'}-line`} />
                                </button>
                            </div>
                            {PALETTE.map(g => (
                                <div key={g.group} className={`ab4-grp ab4-grp--${g.group.toLowerCase()}`}>
                                    <div className="ab4-grp-title">{g.group}</div>
                                    <div className="ab4-grp-items">
                                    {g.items.map(it => (
                                        <button
                                            key={it.type}
                                            className="ab4-pal-btn"
                                            draggable
                                            title="Click to add below the selected block, or drag onto the page"
                                            // Not up to the palette, which clears the selection: the new block stays selected.
                                            onClick={(e) => { e.stopPropagation(); onInsert(paletteInsertIndex(), it.type); }}
                                            onDragStart={(e) => { e.dataTransfer.setData(PALETTE_DRAG_TYPE, it.type); e.dataTransfer.effectAllowed = 'copy'; }}
                                        >
                                            <i className={`${it.icon} ab4-pal-icon`} aria-hidden="true" /><span>{it.label}</span>
                                        </button>
                                    ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="ab4-center" onClick={() => setSelectedId(null)}>
                            <div className="ab4-scroll">
                                <MergeFieldsHint hasMergeFields={blocks.some((b) => JSON.stringify(b).includes('{{'))} />
                                <div className="ab4-pages-container">
                                    {blocks.length === 0 ? (
                                        <div className={`ab4-doc ${emptyDrop ? 'ab4-doc--drop' : ''}`} style={{
                                            background: docBg,
                                            // @ts-ignore
                                            '--doc-pad-sides': `${pagePad}px`,
                                            '--doc-pad-top': `${Math.round(pagePad * 0.9)}px`,
                                            '--doc-pad-bot': `${pagePad}px`,
                                        }}
                                            onDragOver={(e) => {
                                                if (!Array.from(e.dataTransfer?.types || []).includes(PALETTE_DRAG_TYPE)) return;
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = 'copy';
                                                setEmptyDrop(true);
                                            }}
                                            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setEmptyDrop(false); }}
                                            onDrop={(e) => {
                                                const type = e.dataTransfer.getData(PALETTE_DRAG_TYPE);
                                                setEmptyDrop(false);
                                                if (!type) return;
                                                e.preventDefault();
                                                onInsert(0, type);
                                            }}>
                                            <div className="ab4-empty">
                                                <i className="ri-drag-drop-line" />
                                                <strong>Empty Agreement</strong><p>Drag a block from the left onto this page, or click one to add it</p>
                                                <DropTargetContext.Provider value={dropTargetValue}>
                                                    {/* No blocks to move yet; palette items can be dropped here. */}
                                                    <InsertZone onInsert={(t: string) => onInsert(0, t)} onMoveHere={() => undefined} />
                                                </DropTargetContext.Provider>
                                            </div>
                                        </div>
                                    ) : (
                                        <DropTargetContext.Provider value={dropTargetValue}>
                                            <BlockList blocks={blocks}
                                                onUpdate={onUpdate} onDelete={(id: string) => setBlocks(prev => prev.filter(b => b.id !== id))}
                                                onMove={onMove} onInsert={onInsert}
                                                onReorder={(id: string, to: number) => setBlocks(prev => moveBlock(prev, id, to))}
                                                selectedId={selectedId} onSelect={setSelectedId} onFocused={setFocusedId} onBlurred={() => setFocusedId(null)}
                                                openFmForBlock={openFmForBlock}
                                                pagePad={pagePad} docBg={docBg} />
                                        </DropTargetContext.Provider>
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
                                    <div className="ab4-tbar-icon ab4-tbar-icon--preview"><i className="ri-eye-line" /></div>
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
                        <iframe ref={previewRef} className="ab4-preview-frame" srcDoc={previewHtml} title="Preview" frameBorder="0" />
                    </div>
                )}
            </div>
        </div>
    );

    if (!fullScreen) {
        return editor;
    }

    // Portalled to <body> so no ancestor's width, padding or overflow can clip it;
    // React context (ConfigPartnerProvider, query client) still reaches it.
    return createPortal(
        <div
            className="ab4-fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label={configPartner ? `${configPartnerName}'s ${editingType} agreement` : agreementName}
        >
            {editor}
        </div>,
        document.body
    );
}

export default AgreementBuilder;
