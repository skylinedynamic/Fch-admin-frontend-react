import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useAgreement, useSaveAgreement } from '../../../../modules/agreement';
import { useAuthStore } from '../../../../store/auth/authStore';

import {
    PALETTE,
    makeBlock,
    getDemoTemplate,
    getAgreementHtml
} from './utils';
import { AgreementBlock } from './types';
import "../../../../../assets/css/agreement-builder.css";

// @ts-ignore
import { AgreementDashboard } from './AgreementDashboard';
// @ts-ignore
import { BlockList, InsertZone } from './BlockComponents';
// @ts-ignore
import { PropertyPanel } from './PropertyPanel';
import { AgreementBuilderLoader } from '../../../../components/Loader/AgreementLoader';
import { withAppCalendar } from '../../../../utils/agreementCalendar';
import { FileManagerModal } from '../../../../components/FileManagerModal/FileManagerModal';
import type { FileSystemItem } from '../../../../modules/filemanager/types';

const AgreementBuilder: React.FC = () => {
    const { user } = useAuthStore();
    const partnerId = user?.partner_id || user?.entity_id || 0;
    const [screen, setScreen] = useState<'dashboard' | 'builder'>('dashboard');
    const [editingType, setEditingType] = useState<'partner' | 'borrower' | null>(null);
    const [agreementId, setAgreementId] = useState<number | null>(null);

    const [partnerBlocks, setPartnerBlocks] = useState<AgreementBlock[]>(getDemoTemplate());
    const [borrowerBlocks, setBorrowerBlocks] = useState<AgreementBlock[]>(getDemoTemplate());

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

    const { data: savedAgreement, isLoading: loadingAgreement } = useAgreement(editingType as any, !!editingType);
    const saveMutation = useSaveAgreement();

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
                        setBlocks(parsed as any);
                        setPagePad(80); // Reset to default for old formats
                        setDocBg('#ffffff');
                    } else {
                        setBlocks(parsed.blocks || []);
                        setPagePad(parsed.pagePad ?? 80);
                        setDocBg(parsed.docBg ?? '#ffffff');
                    }
                } catch (e) {
                    console.error("Failed to parse saved blocks JSON", e);
                    setBlocks(getDemoTemplate() as any);
                }
            }
        } else if (editingType) {
            setAgreementId(null);
            // Fallback to demo template if no saved version
            setBlocks(getDemoTemplate() as any);
            setPagePad(80);
            setDocBg('#ffffff');
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
    const previewHtml = useMemo(() => withAppCalendar(html), [html]);

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

    if (loadingAgreement) {
        return <AgreementBuilderLoader />;
    }

    return (
        <div className="ab4-root fade-panel">
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

            <div className={`ab4-layout ${sidebarOpen ? 'ab4-layout--drawer-open' : ''}`}>
                {sidebarOpen && <div className="ab4-drawer-backdrop" onClick={() => setSidebarOpen(false)} />}
                {view === 'editor' ? (
                    <>
                        <div className={`ab4-palette ${sidebarCollapsed ? 'ab4-palette--collapsed' : ''} ${sidebarOpen ? 'ab4-palette--open' : ''}`} onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}>
                            <div className="ab4-pal-hdr">
                                <span>Palette</span>
                                <button type="button" className="ab4-sidebar-toggle" onClick={(e) => { e.stopPropagation(); setSidebarCollapsed(!sidebarCollapsed); }} title="Toggle sidebar">
                                    <i className={`ri-arrow-${sidebarCollapsed ? 'right' : 'left'}-line`} />
                                </button>
                            </div>
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
                                <div className="ab4-pages-container">
                                    {blocks.length === 0 ? (
                                        <div className="ab4-doc" style={{
                                            background: docBg,
                                            // @ts-ignore
                                            '--doc-pad-sides': `${pagePad}px`,
                                            '--doc-pad-top': `${Math.round(pagePad * 0.9)}px`,
                                            '--doc-pad-bot': `${pagePad}px`,
                                        }}>
                                            <div className="ab4-empty">
                                                <i className="ri-drag-drop-line" />
                                                <strong>Empty Agreement</strong><p>Choose a block from the left or click <strong>+</strong> below</p>
                                                <InsertZone onInsert={(t: string) => onInsert(0, t)} />
                                            </div>
                                        </div>
                                    ) : (
                                        <BlockList blocks={blocks}
                                            onUpdate={onUpdate} onDelete={(id: string) => setBlocks(prev => prev.filter(b => b.id !== id))}
                                            onMove={onMove} onInsert={onInsert}
                                            selectedId={selectedId} onSelect={setSelectedId} onFocused={setFocusedId} onBlurred={() => setFocusedId(null)}
                                            openFmForBlock={openFmForBlock}
                                            pagePad={pagePad} docBg={docBg} />
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
}

export default AgreementBuilder;
