import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
    activatePromptVersion,
    createPromptVersion,
    deleteNavigationRoute,
    fetchAssistantConfigs,
    fetchNavigationRoutes,
    fetchPromptVersions,
    revertToBundledPrompt,
    saveNavigationRoute,
} from '../../../modules/assistant-config/services';
import type { AssistantConfig, AssistantType, NavigationRoute, PromptVersionsResponse } from '../../../modules/assistant-config/types';

const TABS: Array<{ type: AssistantType; label: string }> = [
    { type: 'wlp_support', label: 'WLP Assistant' },
    { type: 'borrower_support', label: 'Borrower Assistant' },
];

/** "... SYSTEM PROMPT v1.3.2" / "... INSTRUCTIONS v1.5" in the first lines of an approved prompt. */
const detectVersion = (content: string): string => {
    const m = content.slice(0, 400).match(/\bv(\d+(?:\.\d+)+)\b/i);
    return m ? m[1] : '';
};

const errorMessage = (error: any, fallback: string): string =>
    error?.response?.data?.errors?.version || error?.response?.data?.message || fallback;

/**
 * Prompt management for the two support assistants. Pasting the approved
 * instructions here and activating them takes effect on the very next chat
 * message — no code deployment. Versions are immutable; activating an older
 * one is the rollback. Every assistant reply records the version that
 * produced it.
 */
const AssistantConfigForm: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AssistantType>('wlp_support');
    const [configs, setConfigs] = useState<AssistantConfig[]>([]);
    const [prompts, setPrompts] = useState<PromptVersionsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [routes, setRoutes] = useState<NavigationRoute[]>([]);
    const [newKey, setNewKey] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [newPath, setNewPath] = useState('');

    const [version, setVersion] = useState('');
    const [content, setContent] = useState('');
    const [notes, setNotes] = useState('');

    const load = useCallback(async (type: AssistantType) => {
        try {
            setLoading(true);
            const [cfg, pv, rt] = await Promise.all([fetchAssistantConfigs(), fetchPromptVersions(type), fetchNavigationRoutes(type)]);
            setConfigs(cfg.data || []);
            setPrompts(pv.data);
            setRoutes(rt.data || []);
        } catch (error) {
            toast.error('Failed to load assistant prompt information.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setVersion('');
        setContent('');
        setNotes('');
        load(activeTab);
    }, [activeTab, load]);

    const config = configs.find((c) => c.assistant_type === activeTab);

    const onContentChange = (value: string) => {
        setContent(value);
        // Suggest the version label from the pasted prompt's own header unless the user typed one.
        if (!version || version === detectVersion(content)) setVersion(detectVersion(value));
    };

    const save = async (activate: boolean) => {
        if (!version.trim() || content.trim().length < 200) {
            toast.error('Enter a version label and paste the complete approved prompt.');
            return;
        }
        if (
            activate &&
            !window.confirm(
                `Activate v${version.trim()} for the ${TABS.find((t) => t.type === activeTab)?.label} now?\n\n` +
                    'It is used from the very next message. Make sure it has been tested on staging.'
            )
        ) {
            return;
        }

        setBusy(true);
        try {
            const created = await createPromptVersion(activeTab, { version: version.trim(), content, notes: notes.trim() || undefined });
            if (activate) await activatePromptVersion(activeTab, created.data.id);
            toast.success(activate ? `v${version.trim()} is now live.` : `v${version.trim()} saved (not active yet).`);
            setVersion('');
            setContent('');
            setNotes('');
            await load(activeTab);
        } catch (error: any) {
            toast.error(errorMessage(error, 'Failed to save the prompt version.'));
        } finally {
            setBusy(false);
        }
    };

    const activate = async (id: number, label: string, isRollback: boolean) => {
        if (!window.confirm(`${isRollback ? 'Roll back to' : 'Activate'} v${label}? It is used from the very next message.`)) return;
        setBusy(true);
        try {
            await activatePromptVersion(activeTab, id);
            toast.success(`v${label} is now live.`);
            await load(activeTab);
        } catch (error: any) {
            toast.error(errorMessage(error, 'Failed to activate this version.'));
        } finally {
            setBusy(false);
        }
    };

    const revertToBundled = async () => {
        if (!window.confirm('Switch back to the default prompt that ships with the application?')) return;
        setBusy(true);
        try {
            await revertToBundledPrompt(activeTab);
            toast.success('Now using the default prompt.');
            await load(activeTab);
        } catch (error: any) {
            toast.error(errorMessage(error, 'Failed to revert.'));
        } finally {
            setBusy(false);
        }
    };


    const saveRoute = async (route: { route_key: string; label: string; path: string; is_active: boolean }) => {
        setBusy(true);
        try {
            await saveNavigationRoute(activeTab, route.route_key, { label: route.label, path: route.path, is_active: route.is_active });
            toast.success(`Route "${route.route_key}" saved. Widgets pick it up on next open.`);
            await load(activeTab);
        } catch (error: any) {
            const errs = error?.response?.data?.errors;
            toast.error((errs && Object.values(errs)[0]) || error?.response?.data?.message || 'Failed to save the route.');
        } finally {
            setBusy(false);
        }
    };

    const addRoute = async () => {
        if (!newKey.trim() || !newLabel.trim() || !newPath.trim()) {
            toast.error('Enter a route key, a visible name and an in-app path (e.g. /resources).');
            return;
        }
        await saveRoute({ route_key: newKey.trim(), label: newLabel.trim(), path: newPath.trim(), is_active: true });
        setNewKey('');
        setNewLabel('');
        setNewPath('');
    };

    const removeRoute = async (route: NavigationRoute) => {
        if (!window.confirm(route.source === 'custom' ? `Delete route "${route.route_key}"?` : `Reset "${route.route_key}" to its default?`)) return;
        setBusy(true);
        try {
            await deleteNavigationRoute(activeTab, route.route_key);
            await load(activeTab);
        } catch {
            toast.error('Failed to update the route.');
        } finally {
            setBusy(false);
        }
    };

    const updateRouteField = (key: string, patch: Partial<NavigationRoute>) =>
        setRoutes((prev) => prev.map((r) => (r.route_key === key ? { ...r, ...patch } : r)));

    const inForce = prompts?.in_force;
    const activeId = prompts?.versions.find((v) => v.is_active)?.id;

    return (
        <div className="card">
            <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                <div className="avatar-sm flex-shrink-0">
                    <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
                        <i className="ri-question-answer-line"></i>
                    </div>
                </div>
                <div>
                    <h5 className="card-title mb-0 fs-15">Support Assistant Instructions</h5>
                    <p className="text-muted mb-0 fs-13">
                        Paste the approved instructions for the WLP and Borrower assistants. No code deployment needed — a released version is used from the next message.
                    </p>
                </div>
            </div>

            <div className="card-body p-4">
                <ul className="nav nav-tabs mb-4">
                    {TABS.map((tab) => (
                        <li className="nav-item" key={tab.type}>
                            <button
                                type="button"
                                className={`nav-link ${activeTab === tab.type ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.type)}
                                disabled={busy}
                            >
                                {tab.label}
                            </button>
                        </li>
                    ))}
                </ul>

                {loading ? (
                    <p className="text-muted">Loading…</p>
                ) : (
                    <>
                        <div className="alert alert-info py-2 fs-13">
                            <strong>Live now:</strong> v{inForce?.version}{' '}
                            <span className="badge bg-secondary">{inForce?.source === 'database' ? 'released version' : 'application default'}</span>{' '}
                            <small className="text-muted">fingerprint {inForce?.sha256.slice(0, 12)}</small>
                            <br />
                            <small>
                                {config?.is_ready ? 'Ready' : 'Not ready'} · Knowledge: {config?.vector_store_id || 'bundled files (no vector store)'}
                                {config?.knowledge_manifest_version ? ` (manifest v${config.knowledge_manifest_version})` : ''}
                            </small>
                        </div>

                        <h6 className="fw-semibold mb-2">Release a new version</h6>
                        <div className="mb-3">
                            <textarea
                                id="assistant-prompt-content"
                                className="form-control"
                                rows={12}
                                value={content}
                                onChange={(e) => onContentChange(e.target.value)}
                                placeholder="Paste the complete approved instructions here (exactly as approved in the reference Agent)…"
                                disabled={busy}
                            />
                        </div>
                        <div className="row">
                            <div className="mb-3 col-md-3">
                                <label htmlFor="assistant-prompt-version" className="form-label fw-medium">Version</label>
                                <input
                                    id="assistant-prompt-version"
                                    type="text"
                                    className="form-control"
                                    value={version}
                                    onChange={(e) => setVersion(e.target.value)}
                                    placeholder="e.g. 1.3.3"
                                    disabled={busy}
                                />
                            </div>
                            <div className="mb-3 col-md-9">
                                <label htmlFor="assistant-prompt-notes" className="form-label fw-medium">Release note (optional)</label>
                                <input
                                    id="assistant-prompt-notes"
                                    type="text"
                                    className="form-control"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="What changed"
                                    disabled={busy}
                                />
                            </div>
                        </div>
                        <div className="d-flex justify-content-end gap-2 mb-4">
                            <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => save(false)}>
                                Save (don&apos;t activate)
                            </button>
                            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(true)}>
                                Save &amp; Activate
                            </button>
                        </div>

                        <h6 className="fw-semibold mb-2">Version history</h6>
                        <div className="table-responsive">
                            <table className="table table-sm align-middle">
                                <thead>
                                    <tr>
                                        <th>Version</th>
                                        <th>Note</th>
                                        <th>Created</th>
                                        <th>Status</th>
                                        <th className="text-end">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(prompts?.versions || []).length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-muted">
                                                No released versions yet — the application default (v{inForce?.version}) is in use.
                                            </td>
                                        </tr>
                                    )}
                                    {(prompts?.versions || []).map((v) => (
                                        <tr key={v.id}>
                                            <td>v{v.version}</td>
                                            <td>{v.notes || '—'}</td>
                                            <td>{new Date(v.created_at).toLocaleString()}</td>
                                            <td>{v.is_active ? <span className="badge bg-success">Live</span> : <span className="text-muted">Inactive</span>}</td>
                                            <td className="text-end">
                                                {!v.is_active && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary"
                                                        disabled={busy}
                                                        onClick={() => activate(v.id, v.version, activeId !== undefined && v.id < activeId)}
                                                    >
                                                        {activeId !== undefined && v.id < activeId ? 'Roll back to this' : 'Activate'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h6 className="fw-semibold mt-4 mb-1">"Take Me There" destinations</h6>
                        <p className="text-muted fs-13 mb-2">
                            The assistant can only send users to the destinations listed here. Add a page, change a path, or switch one off — no deployment needed.
                            The instructions above must also mention any new destination by name.
                        </p>
                        <div className="table-responsive">
                            <table className="table table-sm align-middle">
                                <thead>
                                    <tr>
                                        <th>Key</th>
                                        <th>Visible name</th>
                                        <th>In-app path</th>
                                        <th>On</th>
                                        <th className="text-end">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {routes.map((r) => (
                                        <tr key={r.route_key} className={r.is_active ? '' : 'text-muted'}>
                                            <td>
                                                <code>{r.route_key}</code>{' '}
                                                {r.source !== 'default' && <span className="badge bg-info-subtle text-info">{r.source}</span>}
                                            </td>
                                            <td>
                                                <input className="form-control form-control-sm" value={r.label} disabled={busy}
                                                    onChange={(e) => updateRouteField(r.route_key, { label: e.target.value })} />
                                            </td>
                                            <td>
                                                <input className="form-control form-control-sm" value={r.path} disabled={busy}
                                                    onChange={(e) => updateRouteField(r.route_key, { path: e.target.value })} />
                                            </td>
                                            <td>
                                                <input type="checkbox" className="form-check-input" checked={r.is_active} disabled={busy}
                                                    onChange={(e) => updateRouteField(r.route_key, { is_active: e.target.checked })} />
                                            </td>
                                            <td className="text-end text-nowrap">
                                                <button type="button" className="btn btn-sm btn-outline-primary me-1" disabled={busy} onClick={() => saveRoute(r)}>Save</button>
                                                {r.source !== 'default' && (
                                                    <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => removeRoute(r)}>
                                                        {r.source === 'custom' ? 'Delete' : 'Reset'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td><input className="form-control form-control-sm" placeholder="new_key" value={newKey} disabled={busy} onChange={(e) => setNewKey(e.target.value)} /></td>
                                        <td><input className="form-control form-control-sm" placeholder="Visible name" value={newLabel} disabled={busy} onChange={(e) => setNewLabel(e.target.value)} /></td>
                                        <td><input className="form-control form-control-sm" placeholder="/path" value={newPath} disabled={busy} onChange={(e) => setNewPath(e.target.value)} /></td>
                                        <td></td>
                                        <td className="text-end"><button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={addRoute}>Add</button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {inForce?.source === 'database' && (
                            <button type="button" className="btn btn-sm btn-link text-muted p-0" disabled={busy} onClick={revertToBundled}>
                                Switch back to the application default prompt
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AssistantConfigForm;
