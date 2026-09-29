import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { fetchAssistantConfigs, saveAssistantConfig } from '../../../modules/assistant-config/services';
import type { AssistantConfig, AssistantType } from '../../../modules/assistant-config/types';

const TABS: Array<{ type: AssistantType; label: string }> = [
    { type: 'wlp_support', label: 'WLP Assistant' },
    { type: 'borrower_support', label: 'Borrower Assistant' },
];

const EMPTY: Record<AssistantType, AssistantConfig> = {
    wlp_support: {
        assistant_type: 'wlp_support',
        system_prompt: '',
        model: '',
        reasoning_effort: 'low',
        max_output_tokens: 1200,
        vector_store_id: null,
        knowledge_manifest_version: null,
        is_enabled: false,
        is_ready: false,
    },
    borrower_support: {
        assistant_type: 'borrower_support',
        system_prompt: '',
        model: '',
        reasoning_effort: 'low',
        max_output_tokens: 1200,
        vector_store_id: null,
        knowledge_manifest_version: null,
        is_enabled: false,
        is_ready: false,
    },
};

const AssistantConfigForm: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AssistantType>('wlp_support');
    const [configs, setConfigs] = useState<Record<AssistantType, AssistantConfig>>(EMPTY);
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            setFetching(true);
            const response = await fetchAssistantConfigs();
            const next = { ...EMPTY };
            (response.data || []).forEach((c) => {
                next[c.assistant_type] = c;
            });
            setConfigs(next);
        } catch (error) {
            console.error('Failed to load assistant configs:', error);
            toast.error('Failed to load assistant configuration.');
        } finally {
            setFetching(false);
        }
    };

    const current = configs[activeTab];

    const updateCurrent = (patch: Partial<AssistantConfig>) => {
        setConfigs((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], ...patch } }));
    };

    const handleSave = async (enable: boolean) => {
        if (enable && !current.is_ready && !current.vector_store_id) {
            toast.error('This assistant has no knowledge base yet — run assistant:sync-knowledge on the backend first.');
            return;
        }

        setSaving(true);
        try {
            await saveAssistantConfig({
                assistant_type: activeTab,
                system_prompt: current.system_prompt || '',
                model: current.model || '',
                reasoning_effort: current.reasoning_effort || 'low',
                max_output_tokens: current.max_output_tokens || 1200,
                is_enabled: enable,
            });
            toast.success('Assistant configuration saved.');
            await load();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to save assistant configuration.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                <div className="avatar-sm flex-shrink-0">
                    <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
                        <i className="ri-question-answer-line"></i>
                    </div>
                </div>
                <div>
                    <h5 className="card-title mb-0 fs-15">Support Assistant Configuration</h5>
                    <p className="text-muted mb-0 fs-13">
                        System prompt and activation for the WLP and Borrower AI support assistants.
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
                            >
                                {tab.label}
                            </button>
                        </li>
                    ))}
                </ul>

                {fetching ? (
                    <p className="text-muted">Loading…</p>
                ) : (
                    <>
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <span className={`badge ${current.is_ready ? 'bg-success' : 'bg-warning text-dark'}`}>
                                {current.is_ready ? 'Ready' : 'Not ready'}
                            </span>
                            <small className="text-muted">
                                Vector store: {current.vector_store_id || 'none yet — run assistant:sync-knowledge'}
                                {current.knowledge_manifest_version ? ` (manifest v${current.knowledge_manifest_version})` : ''}
                            </small>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="assistant-system-prompt" className="form-label fw-medium">System Prompt</label>
                            <textarea
                                id="assistant-system-prompt"
                                className="form-control"
                                rows={12}
                                value={current.system_prompt || ''}
                                onChange={(e) => updateCurrent({ system_prompt: e.target.value })}
                                placeholder="Paste the approved system prompt here…"
                                disabled={saving}
                            />
                        </div>

                        <div className="row">
                            <div className="mb-3 col-md-4">
                                <label htmlFor="assistant-model" className="form-label fw-medium">Model override (optional)</label>
                                <input
                                    id="assistant-model"
                                    type="text"
                                    className="form-control"
                                    value={current.model || ''}
                                    onChange={(e) => updateCurrent({ model: e.target.value })}
                                    placeholder="Falls back to the global OpenAI default"
                                    disabled={saving}
                                />
                            </div>
                            <div className="mb-3 col-md-4">
                                <label htmlFor="assistant-reasoning-effort" className="form-label fw-medium">Reasoning effort</label>
                                <input
                                    id="assistant-reasoning-effort"
                                    type="text"
                                    className="form-control"
                                    value={current.reasoning_effort || ''}
                                    onChange={(e) => updateCurrent({ reasoning_effort: e.target.value })}
                                    placeholder="low"
                                    disabled={saving}
                                />
                            </div>
                            <div className="mb-3 col-md-4">
                                <label htmlFor="assistant-max-output-tokens" className="form-label fw-medium">Max output tokens</label>
                                <input
                                    id="assistant-max-output-tokens"
                                    type="number"
                                    className="form-control"
                                    value={current.max_output_tokens ?? ''}
                                    onChange={(e) => updateCurrent({ max_output_tokens: e.target.value ? Number(e.target.value) : null })}
                                    placeholder="1200"
                                    disabled={saving}
                                />
                            </div>
                        </div>

                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                disabled={saving}
                                onClick={() => handleSave(false)}
                            >
                                Save as Draft
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={saving}
                                onClick={() => handleSave(true)}
                            >
                                Save &amp; Enable
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AssistantConfigForm;
