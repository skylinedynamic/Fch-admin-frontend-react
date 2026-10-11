import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Dropdown } from 'primereact/dropdown';
import { fetchOpenAiConfig, fetchOpenAiModels, saveOpenAiConfig } from '../../../modules/settings/services';
import { fetchAssistantConfigs, saveAssistantSettings } from '../../../modules/assistant-config/services';
import type { AssistantConfig, AssistantType, AssistantVectorStore } from '../../../modules/assistant-config/types';
import {
    fetchPreQualificationAgentConfigs,
    savePreQualificationAgentSettings,
} from '../../../modules/prequalification-agent-config/services';
import type {
    PreQualificationAgentConfig,
    PreQualificationStep,
} from '../../../modules/prequalification-agent-config/types';
import DynamicActionModal from '../../../components/Common/Modals/DynamicActionModal';
import { OpenAiConfigSkeleton } from '../../../components/Loader/SpecificSkeletons';
import { DEFAULT_FALLBACK_MODELS, DEFAULT_EFFORT_OPTIONS } from '../../../config';

interface FormData {
    api_key: string;
    aue_model: string;
    reasoning_effort: string;
}

interface FormErrors {
    [key: string]: string | null;
}

/**
 * Stand-in shown in the key field when the server already holds a key.
 *
 * The key itself never leaves the server, so there is nothing real to display —
 * this fills the field so it reads as configured rather than empty. It is cleared
 * the moment the field is focused, and is sent as a blank key (meaning "keep the
 * stored one") if it is left untouched.
 *
 * Its length is that of a typical OpenAI project key, so a stored key renders the
 * same full row of dots a freshly pasted one does. The characters themselves are
 * never seen — the field is a password input — and never submitted.
 */
const STORED_KEY_MASK_CHAR = '•';
const STORED_KEY_MASK = STORED_KEY_MASK_CHAR.repeat(164);

/**
 * The two support assistants. Each one is an Agent saved on the OpenAI
 * platform: its instructions, model and knowledge are edited there and are
 * used from the very next chat message. Only which agent each assistant runs,
 * and whether it is switched on, is stored here.
 */
const ASSISTANTS: Array<{ type: AssistantType; label: string; audience: string; portal: string }> = [
    { type: 'borrower_support', label: 'Borrower Assistant', audience: 'Borrowers', portal: 'borrower portal' },
    { type: 'wlp_support', label: 'WL Partner Assistant', audience: 'WL Partners', portal: 'partner portal' },
];

/**
 * The one Agent that underwrites a pre-qualification.
 *
 * The instructions it underwrites by, the schema of the result, its model and
 * its reasoning effort all live on the OpenAI platform and are read on every
 * evaluation. Nothing about how a borrower is assessed is written in the
 * application, so a change is made on the platform and applies to the very
 * next run.
 */
const PREQUALIFICATION_STEPS: Array<{ step: PreQualificationStep; label: string; purpose: string }> = [
    {
        step: 'prequalification_agent',
        label: 'Pre-Qualification',
        purpose: 'Underwrites every submission, graded against the live lender matrix.',
    },
];

const AGENT_ID_PATTERN = /^agent_[A-Za-z0-9]+$/;
const VECTOR_STORE_ID_PATTERN = /^vs_[A-Za-z0-9]+$/;

/** Mirrors the server's own limit on vector stores per assistant. */
const MAX_VECTOR_STORES = 8;

/** A repeater row. Blank rows are dropped on save rather than refused. */
const filledStores = (stores: AssistantVectorStore[]): AssistantVectorStore[] =>
    stores.map(s => ({ ...s, id: s.id.trim() })).filter(s => s.id !== '');

interface AssistantField {
    agent_id: string;
    enabled: boolean;
    /**
     * The master switch for this assistant's knowledge base. Off hides the
     * repeater and sends no store at all, so the assistant falls back to
     * whatever the agent itself is configured with — without discarding the
     * IDs already entered, which is what makes it safe to flip back on.
     */
    stores_enabled: boolean;
    /** The repeater rows, in the order the host arranged them. */
    vector_stores: AssistantVectorStore[];
    /** Masked by default, like the API key; the eye button reveals it. */
    visible: boolean;
}

const emptyAssistants = (): Record<AssistantType, AssistantField> => ({
    borrower_support: { agent_id: '', enabled: true, stores_enabled: false, vector_stores: [], visible: false },
    wlp_support: { agent_id: '', enabled: true, stores_enabled: false, vector_stores: [], visible: false },
});

/**
 * One Pre-Qualification step's fields. The same shape an assistant uses — the
 * two settings are the same thing (an agent, and the storage it searches) for
 * two different jobs.
 */
type PreQualificationField = AssistantField;

const emptyPreQualificationSteps = (): Record<PreQualificationStep, PreQualificationField> => ({
    prequalification_agent: { agent_id: '', enabled: false, stores_enabled: false, vector_stores: [], visible: false },
});

/** Error key for an assistant's Agent ID field, e.g. "agent_id.borrower_support". */
const agentErrorKey = (type: AssistantType): string => `agent_id.${type}`;

/** Error key for an assistant's Vector Store IDs field. */
const storeErrorKey = (type: AssistantType): string => `vector_store_ids.${type}`;

/**
 * Error key for one repeater row, so a single bad ID marks only its own field
 * instead of reddening every row in the list.
 */
const storeRowErrorKey = (type: AssistantType, index: number): string => `vector_store_ids.${type}.${index}`;

/** The same three keys for a Pre-Qualification step, kept in their own namespace. */
const stepAgentErrorKey = (step: PreQualificationStep): string => `prequal_agent_id.${step}`;
const stepStoreErrorKey = (step: PreQualificationStep): string => `prequal_vector_store_ids.${step}`;
const stepStoreRowErrorKey = (step: PreQualificationStep, index: number): string =>
    `prequal_vector_store_ids.${step}.${index}`;

const OpenAiConfigForm: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [fetching, setFetching] = useState<boolean>(true);
    const [modelOptions, setModelOptions] = useState<Array<{ label: string; value: string }>>(
        DEFAULT_FALLBACK_MODELS.map(m => ({ label: m, value: m }))
    );
    const [effortOptions, setEffortOptions] = useState<Array<{ label: string; value: string }>>(
        DEFAULT_EFFORT_OPTIONS
    );
    const [modelsError, setModelsError] = useState<string | null>(null);
    // Whether the server already holds a key. The key itself is never sent to the
    // browser, so this is the only way to know — and it decides whether the field
    // may be left blank to keep the stored key.
    const [hasApiKey, setHasApiKey] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormData>({
        api_key: '',
        aue_model: 'gpt-5.6-luna',
        reasoning_effort: 'medium'
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [assistants, setAssistants] = useState<Record<AssistantType, AssistantField>>(emptyAssistants());
    // What the server last reported for each assistant: its saved state and the
    // live agent (name/model) read from OpenAI, or why that read failed.
    const [assistantConfigs, setAssistantConfigs] = useState<AssistantConfig[]>([]);
    // The Pre-Qualification pipeline's own agents and storage, and what the
    // server last reported for each step (its saved state plus the live agent).
    const [steps, setSteps] = useState<Record<PreQualificationStep, PreQualificationField>>(emptyPreQualificationSteps());
    const [stepConfigs, setStepConfigs] = useState<PreQualificationAgentConfig[]>([]);
    // The assistant a host has just switched off, waiting for them to confirm
    // in the dialog: it removes the chat for everyone that assistant serves.
    // Switching one on needs no confirmation.
    const [pendingDisable, setPendingDisable] = useState<AssistantType | null>(null);
    // The same confirmation for a Pre-Qualification step: switching one off
    // stops it producing a result at all, so every application it would have
    // evaluated goes to manual review instead.
    const [pendingStepDisable, setPendingStepDisable] = useState<PreQualificationStep | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setFetching(true);
            const response = await fetchOpenAiConfig();
            const configData = response?.data || response || {};

            const savedModel = configData.aue_model || 'gpt-5.6-luna';

            setHasApiKey(!!configData.has_api_key);

            // The API key is deliberately never returned by the server, so when one
            // is stored the field shows a stand-in instead of the real value.
            setFormData({
                api_key: configData.has_api_key ? STORED_KEY_MASK : '',
                aue_model: savedModel,
                reasoning_effort: configData.reasoning_effort || 'medium'
            });

            await Promise.all([loadModels(savedModel), loadAssistants(), loadPreQualificationSteps()]);
        } catch (error: any) {
            console.error('Failed to load OpenAI configuration:', error);
            setHasApiKey(false);
            await loadModels('gpt-5.6-luna');
        } finally {
            setFetching(false);
        }
    };

    const loadAssistants = async () => {
        try {
            const response = await fetchAssistantConfigs();
            const list = response?.data || [];
            const next = emptyAssistants();

            list.forEach((c) => {
                if (next[c.assistant_type]) {
                    const stores = (c.vector_stores || []).map(s => ({ ...s }));

                    next[c.assistant_type] = {
                        agent_id: c.agent_id || '',
                        enabled: c.is_enabled ?? true,
                        // Open when something is actually being searched. Stores
                        // that are all switched off read as "knowledge base off",
                        // which is what the host left behind.
                        stores_enabled: stores.some(s => s.enabled),
                        vector_stores: stores,
                        visible: false,
                    };
                }
            });

            setAssistantConfigs(list);
            setAssistants(next);
        } catch (error) {
            console.error('Failed to load support assistant settings:', error);
            toast.error('Failed to load the support assistant settings.');
        }
    };

    const loadPreQualificationSteps = async () => {
        try {
            const response = await fetchPreQualificationAgentConfigs();
            const list = response?.data || [];
            const next = emptyPreQualificationSteps();

            list.forEach((c) => {
                if (next[c.step]) {
                    const stores = (c.vector_stores || []).map(s => ({ ...s }));

                    next[c.step] = {
                        agent_id: c.agent_id || '',
                        enabled: c.is_enabled ?? false,
                        // Open when something is actually being searched. Stores
                        // that are all switched off read as "knowledge base off",
                        // which is what the host left behind.
                        stores_enabled: stores.some(s => s.enabled),
                        vector_stores: stores,
                        visible: false,
                    };
                }
            });

            setStepConfigs(list);
            setSteps(next);
        } catch (error) {
            console.error('Failed to load pre-qualification agent settings:', error);
            toast.error('Failed to load the pre-qualification agent settings.');
        }
    };

    const updateStep = (step: PreQualificationStep, patch: Partial<PreQualificationField>) => {
        setSteps(prev => {
            const current = prev[step];
            const next = { ...current, ...patch };

            // A step is off until it has an agent, so the first ID typed into
            // an off step switches it on. Otherwise a host pastes the ID the
            // field asked for, saves, and the step quietly keeps not running —
            // with the screen showing a configured agent next to it.
            if (patch.agent_id !== undefined && !current.enabled && current.agent_id.trim() === '' && patch.agent_id.trim() !== '') {
                next.enabled = true;
            }

            return { ...prev, [step]: next };
        });

        if (!('visible' in patch) && errors[stepAgentErrorKey(step)]) {
            setErrors(prev => ({ ...prev, [stepAgentErrorKey(step)]: null }));
        }
    };

    const clearStepStoreErrors = (step: PreQualificationStep) => {
        setErrors(prev => {
            const next = { ...prev };
            Object.keys(next)
                .filter(key => key === stepStoreErrorKey(step) || key.startsWith(`${stepStoreErrorKey(step)}.`))
                .forEach(key => { next[key] = null; });

            return next;
        });
    };

    /**
     * Replaces a step's repeater rows and clears every error standing against
     * the list, per-row ones included — the rows have shifted, so an error
     * pinned to row 2 no longer describes whatever now sits at row 2.
     */
    const updateStepStores = (step: PreQualificationStep, stores: AssistantVectorStore[]) => {
        setSteps(prev => ({ ...prev, [step]: { ...prev[step], vector_stores: stores } }));
        clearStepStoreErrors(step);
    };

    const addStepStore = (step: PreQualificationStep) =>
        updateStepStores(step, [...steps[step].vector_stores, { id: '', enabled: true }]);

    const patchStepStore = (step: PreQualificationStep, index: number, patch: Partial<AssistantVectorStore>) =>
        updateStepStores(step, steps[step].vector_stores.map((s, i) => (i === index ? { ...s, ...patch } : s)));

    /**
     * What this step actually searches, once saved.
     *
     * The master switch and the per-row switch are both honoured: the master
     * stops the searching outright, and below it each storage ID keeps its own
     * switch, so one knowledge base can be parked while it is rebuilt without
     * losing its ID or disturbing the others. Blank rows are dropped rather
     * than refused.
     */
    const stepStoresToSave = (field: PreQualificationField): AssistantVectorStore[] =>
        filledStores(field.vector_stores).map(s => ({ ...s, enabled: field.stores_enabled && s.enabled }));

    /** How many of this step's storage IDs will actually be searched. */
    const searchedStoreCount = (field: PreQualificationField): number =>
        stepStoresToSave(field).filter(s => s.enabled).length;

    const removeStepStore = (step: PreQualificationStep, index: number) =>
        updateStepStores(step, steps[step].vector_stores.filter((_, i) => i !== index));

    /**
     * The master switch for a step's knowledge base. Turning it on opens the
     * form with a row ready to type into; turning it off keeps every ID and
     * only stops the searching.
     */
    const toggleStepStores = (step: PreQualificationStep, on: boolean) => {
        const current = steps[step].vector_stores;

        setSteps(prev => ({
            ...prev,
            [step]: {
                ...prev[step],
                stores_enabled: on,
                vector_stores: on && current.length === 0 ? [{ id: '', enabled: true }] : current,
            },
        }));

        clearStepStoreErrors(step);
    };

    const updateAssistant = (type: AssistantType, patch: Partial<AssistantField>) => {
        setAssistants(prev => ({ ...prev, [type]: { ...prev[type], ...patch } }));
        if (!('visible' in patch) && errors[agentErrorKey(type)]) {
            setErrors(prev => ({ ...prev, [agentErrorKey(type)]: null }));
        }
    };

    /**
     * Replaces the repeater rows and clears every error standing against the
     * list, including the per-row ones — the rows have shifted, so an error
     * pinned to row 2 no longer describes whatever now sits at row 2.
     */
    const updateStores = (type: AssistantType, stores: AssistantVectorStore[]) => {
        setAssistants(prev => ({ ...prev, [type]: { ...prev[type], vector_stores: stores } }));
        clearStoreErrors(type);
    };

    const clearStoreErrors = (type: AssistantType) => {
        setErrors(prev => {
            const next = { ...prev };
            Object.keys(next)
                .filter(key => key === storeErrorKey(type) || key.startsWith(`${storeErrorKey(type)}.`))
                .forEach(key => { next[key] = null; });

            return next;
        });
    };

    const addStore = (type: AssistantType) =>
        updateStores(type, [...assistants[type].vector_stores, { id: '', enabled: true }]);

    /**
     * The master switch. Turning it on opens the form with a row ready to type
     * into. Turning it off keeps every ID — only the searching stops.
     */
    const toggleStores = (type: AssistantType, on: boolean) => {
        const current = assistants[type].vector_stores;

        setAssistants(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                stores_enabled: on,
                vector_stores: on && current.length === 0 ? [{ id: '', enabled: true }] : current,
            },
        }));

        clearStoreErrors(type);
    };

    /**
     * What this assistant actually searches. Every ID is searched while the
     * master switch is on, so the switch alone decides it — there is no
     * second, per-row state to keep in step with it.
     */
    const storesToSave = (field: AssistantField): AssistantVectorStore[] =>
        filledStores(field.vector_stores).map(s => ({ ...s, enabled: field.stores_enabled }));

    const patchStore = (type: AssistantType, index: number, patch: Partial<AssistantVectorStore>) =>
        updateStores(type, assistants[type].vector_stores.map((s, i) => (i === index ? { ...s, ...patch } : s)));

    const removeStore = (type: AssistantType, index: number) =>
        updateStores(type, assistants[type].vector_stores.filter((_, i) => i !== index));

    const pendingAssistant = ASSISTANTS.find(a => a.type === pendingDisable);

    const confirmDisable = () => {
        if (pendingDisable) {
            updateAssistant(pendingDisable, { enabled: false });
        }
        setPendingDisable(null);
    };

    const pendingStep = PREQUALIFICATION_STEPS.find(s => s.step === pendingStepDisable);

    const confirmStepDisable = () => {
        if (pendingStepDisable) {
            updateStep(pendingStepDisable, { enabled: false });
        }
        setPendingStepDisable(null);
    };

    const buildOptions = (models: string[], savedModel: string) => {
        const sourceList = (models && models.length > 0) ? models : DEFAULT_FALLBACK_MODELS;
        const options = sourceList.map(id => ({ label: id, value: id }));

        if (savedModel && !sourceList.includes(savedModel)) {
            options.unshift({ label: `${savedModel} (currently saved)`, value: savedModel });
        }

        return options;
    };

    const loadModels = async (savedModel: string) => {
        try {
            const response = await fetchOpenAiModels();
            const rawModels = response?.data?.models || response?.models || [];
            const modelsList = rawModels.length > 0 ? rawModels : DEFAULT_FALLBACK_MODELS;
            setModelOptions(buildOptions(modelsList, savedModel));

            const rawEfforts = response?.data?.reasoning_efforts || response?.reasoning_efforts || [];
            setEffortOptions(rawEfforts.length > 0 ? rawEfforts : DEFAULT_EFFORT_OPTIONS);
            setModelsError(response?.data?.error || response?.error || null);
        } catch (error) {
            console.error('Failed to load OpenAI models:', error);
            setModelOptions(buildOptions(DEFAULT_FALLBACK_MODELS, savedModel));
            setEffortOptions(DEFAULT_EFFORT_OPTIONS);
            setModelsError('Could not load the model list from OpenAI. Check the API key.');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        // The key field starts out holding the stand-in. Clicking it leaves that
        // alone — only an actual edit replaces it, and then the stand-in has to go
        // rather than be typed onto. A real key never contains this character, so
        // dropping every one of them leaves exactly what was typed or pasted; if
        // the edit was a deletion, nothing is left and the field simply clears.
        const next = name === 'api_key' && isKeyUntouched() && value !== STORED_KEY_MASK
            ? value.split(STORED_KEY_MASK_CHAR).join('')
            : value;

        setFormData(prev => ({ ...prev, [name]: next }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    /** True while the field still holds the stand-in, i.e. the key was not edited. */
    const isKeyUntouched = (): boolean => formData.api_key === STORED_KEY_MASK;

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        const key = isKeyUntouched() ? '' : (formData.api_key ? formData.api_key.trim() : '');

        // Mirrors the server rule: required only until a key has been stored.
        // Once one is stored, blank means "keep the existing key".
        if (!key && !hasApiKey) {
            newErrors.api_key = 'The API key is required.';
        } else if (key && !key.startsWith('sk-')) {
            newErrors.api_key = 'The API key must start with "sk-".';
        } else if (!isKeyUntouched() && formData.api_key.trim() !== formData.api_key) {
            newErrors.api_key = 'Remove leading or trailing spaces from the key.';
        }

        if (!formData.aue_model || !formData.aue_model.trim()) {
            newErrors.aue_model = 'The underwriting model is required.';
        }

        if (!formData.reasoning_effort || !formData.reasoning_effort.trim()) {
            newErrors.reasoning_effort = 'The reasoning effort is required.';
        }

        // Mirrors the server rules; the server additionally checks with OpenAI
        // that each agent exists and that the key can use it.
        ASSISTANTS.forEach(({ type }) => {
            const { agent_id, enabled } = assistants[type];
            const id = agent_id.trim();

            if (!id && enabled) {
                newErrors[agentErrorKey(type)] = 'The Agent ID is required while the assistant is enabled.';
            } else if (id !== agent_id) {
                newErrors[agentErrorKey(type)] = 'Remove leading or trailing spaces from the Agent ID.';
            } else if (id && !AGENT_ID_PATTERN.test(id)) {
                newErrors[agentErrorKey(type)] = 'The Agent ID must start with "agent_" and contain only letters and numbers.';
            }

            // Each row is judged on its own, so one bad ID does not condemn the
            // rest. A blank row is ignored rather than refused: a repeater row
            // added and never filled in is not a mistake worth blocking, and it
            // is simply dropped on save.
            const rows = assistants[type].vector_stores;
            const seen = new Map<string, number>();

            rows.forEach((store, index) => {
                const storeId = store.id.trim();

                if (storeId === '') {
                    return;
                }

                if (!VECTOR_STORE_ID_PATTERN.test(storeId)) {
                    newErrors[storeRowErrorKey(type, index)] = 'A Storage ID starts with "vs_" and contains only letters and numbers.';
                    return;
                }

                // The duplicate is flagged where it was repeated, not where it
                // was first entered — that is the row the host meant to change.
                const firstSeenAt = seen.get(storeId);
                if (firstSeenAt !== undefined) {
                    newErrors[storeRowErrorKey(type, index)] = `Already added in row ${firstSeenAt + 1}.`;
                    return;
                }

                seen.set(storeId, index);
            });

            if (seen.size > MAX_VECTOR_STORES) {
                newErrors[storeErrorKey(type)] = `Up to ${MAX_VECTOR_STORES} Storage IDs can be given to one assistant.`;
            }
        });

        // The same rules for the Pre-Qualification steps. The server checks
        // each one against OpenAI as well, and additionally refuses an agent
        // that does not return a structured result.
        PREQUALIFICATION_STEPS.forEach(({ step, label }) => {
            const { agent_id, enabled } = steps[step];
            const id = agent_id.trim();

            if (!id && enabled) {
                newErrors[stepAgentErrorKey(step)] = `The Agent ID is required while ${label} is set to run on an agent.`;
            } else if (id !== agent_id) {
                newErrors[stepAgentErrorKey(step)] = 'Remove leading or trailing spaces from the Agent ID.';
            } else if (id && !AGENT_ID_PATTERN.test(id)) {
                newErrors[stepAgentErrorKey(step)] = 'The Agent ID must start with "agent_" and contain only letters and numbers.';
            }

            const seen = new Map<string, number>();

            steps[step].vector_stores.forEach((store, index) => {
                const storeId = store.id.trim();

                if (storeId === '') {
                    return;
                }

                if (!VECTOR_STORE_ID_PATTERN.test(storeId)) {
                    newErrors[stepStoreRowErrorKey(step, index)] = 'A Storage ID starts with "vs_" and contains only letters and numbers.';
                    return;
                }

                // The duplicate is flagged where it was repeated, not where it
                // was first entered — that is the row the host meant to change.
                const firstSeenAt = seen.get(storeId);
                if (firstSeenAt !== undefined) {
                    newErrors[stepStoreRowErrorKey(step, index)] = `Already added in row ${firstSeenAt + 1}.`;
                    return;
                }

                seen.set(storeId, index);
            });

            if (seen.size > MAX_VECTOR_STORES) {
                newErrors[stepStoreErrorKey(step)] = `Up to ${MAX_VECTOR_STORES} Storage IDs can be given to one step.`;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        let savingAssistant: AssistantType | null = null;
        // Which Pre-Qualification step is in flight, so a server error lands on
        // that step's fields rather than on whichever assistant went last.
        let savingStep: PreQualificationStep | null = null;
        let savedRowIndexes: number[] = [];
        try {
            await saveOpenAiConfig({
                // An untouched field sends a blank key, which the server reads as
                // "keep the stored one" — the stand-in is never submitted.
                api_key: isKeyUntouched() ? '' : formData.api_key.trim(),
                aue_model: formData.aue_model,
                reasoning_effort: formData.reasoning_effort
            });

            // The key is saved first: the server checks each agent against
            // OpenAI with the key that is stored at that moment.
            for (const { type } of ASSISTANTS) {
                savingAssistant = type;
                // Blank rows are dropped before sending, so the server's row
                // indexes no longer line up with the rows on screen. Keep the
                // mapping to put a server error back on the row that caused it.
                savedRowIndexes = assistants[type].vector_stores
                    .map((store, index) => ({ store, index }))
                    .filter(({ store }) => store.id.trim() !== '')
                    .map(({ index }) => index);

                await saveAssistantSettings(type, {
                    agent_id: assistants[type].agent_id.trim() || null,
                    enabled: assistants[type].enabled,
                    vector_stores: storesToSave(assistants[type])
                });
            }

            savingAssistant = null;

            for (const { step } of PREQUALIFICATION_STEPS) {
                savingStep = step;
                savedRowIndexes = steps[step].vector_stores
                    .map((store, index) => ({ store, index }))
                    .filter(({ store }) => store.id.trim() !== '')
                    .map(({ index }) => index);

                await savePreQualificationAgentSettings(step, {
                    agent_id: steps[step].agent_id.trim() || null,
                    enabled: steps[step].enabled,
                    vector_stores: stepStoresToSave(steps[step])
                });
            }

            toast.success('OpenAI configuration saved successfully!');
            await loadConfig();
        } catch (error: any) {
            console.error('Failed to save OpenAI config:', error);

            const apiErrors = error?.response?.data?.errors;
            if (apiErrors) {
                const mapped: FormErrors = {};
                Object.keys(apiErrors).forEach(key => {
                    const message = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
                    // An assistant's own errors belong under that assistant's
                    // fields, and a row error under the row it names: the
                    // server reports these as "vector_stores.<index>.id".
                    let mappedKey = key;
                    if (savingAssistant && key === 'agent_id') {
                        mappedKey = agentErrorKey(savingAssistant);
                    } else if (savingAssistant && key.startsWith('vector_stores')) {
                        const row = key.match(/^vector_stores\.(\d+)\b/);
                        mappedKey = row
                            // The server validates the rows it was sent — blank
                            // ones dropped — so its index is mapped back onto
                            // the row on screen that produced it.
                            ? storeRowErrorKey(savingAssistant, savedRowIndexes[Number(row[1])] ?? Number(row[1]))
                            : storeErrorKey(savingAssistant);
                    } else if (savingStep && key === 'agent_id') {
                        mappedKey = stepAgentErrorKey(savingStep);
                    } else if (savingStep && key.startsWith('vector_stores')) {
                        const row = key.match(/^vector_stores\.(\d+)\b/);
                        mappedKey = row
                            ? stepStoreRowErrorKey(savingStep, savedRowIndexes[Number(row[1])] ?? Number(row[1]))
                            : stepStoreErrorKey(savingStep);
                    }
                    mapped[mappedKey] = message;
                });
                setErrors(mapped);
            }
            toast.error(error?.response?.data?.message || 'Failed to save configuration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                <div className="avatar-sm flex-shrink-0">
                    <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
                        <i className="ri-sparkling-2-line"></i>
                    </div>
                </div>
                <div>
                    <h5 className="card-title mb-0 fs-15">OpenAI Configuration</h5>
                    <p className="text-muted mb-0 fs-13">
                        Credentials and Model Used for Validation and AI Underwriting
                    </p>
                </div>
            </div>

            <div className="card-body p-4">
                {fetching ? (
                    <OpenAiConfigSkeleton />
                ) : (
                    <>
                        <div className="d-flex align-items-center bg-primary-subtle rounded-3 p-3 mb-4">
                            <div className="avatar-sm flex-shrink-0 me-3">
                                <div className="avatar-title bg-primary text-white rounded fs-20">
                                    <i className="ri-sparkling-2-line"></i>
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <h6 className="mb-1 text-dark fw-semibold fs-14">AI Underwriting & Data Validation</h6>
                                <p className="text-muted mb-0 fs-13">
                                    Configure your OpenAI API credentials and AI models for Pre-Qualification underwriting calculations and borrower application integrity verification.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-12">
                                    <label htmlFor="openai-api-key" className="form-label fw-medium">
                                        API Key {!hasApiKey && <span className="text-danger">*</span>}
                                    </label>
                                    <div className="input-group input-group-inline">
                                        <span className={`input-group-text ${errors.api_key ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                                            <i className="ri-key-2-line"></i>
                                        </span>
                                        <input
                                            id="openai-api-key"
                                            type="password"
                                            name="api_key"
                                            className={`form-control ${errors.api_key ? 'is-invalid border-danger' : ''}`}
                                            placeholder="sk-..."
                                            value={formData.api_key}
                                            onChange={handleInputChange}
                                            autoComplete="new-password"
                                            disabled={loading}
                                        />
                                    </div>
                                    {errors.api_key && (
                                        <div className="text-danger fs-12 mt-1">
                                            <i className="ri-error-warning-line me-1"></i>
                                            {errors.api_key}
                                        </div>
                                    )}
                                    <small className="text-muted d-block mt-1">
                                        {hasApiKey
                                            ? 'A key is already stored, encrypted, on the server — it is never sent back to the browser, so this shows a placeholder rather than the key itself. Leave it as is to keep it, or type over it to replace it.'
                                            : 'Stored encrypted on the server and used for AI Underwriting and Validation.'}
                                    </small>
                                </div>

                                <div className="col-12 col-md-6">
                                    <label htmlFor="openai-aue-model" className="form-label fw-medium">
                                        Underwriting Model <span className="text-danger">*</span>
                                    </label>
                                    <Dropdown
                                        inputId="openai-aue-model"
                                        value={formData.aue_model}
                                        options={modelOptions}
                                        optionLabel="label"
                                        optionValue="value"
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, aue_model: e.value }));
                                            if (errors.aue_model) {
                                                setErrors(prev => ({ ...prev, aue_model: null }));
                                            }
                                        }}
                                        placeholder="Select a model"
                                        className={`w-100 ${errors.aue_model ? 'p-invalid border-danger' : ''}`}
                                        filter
                                        filterPlaceholder="Search models"
                                        disabled={loading}
                                    />
                                    {errors.aue_model && (
                                        <div className="text-danger fs-12 mt-1">
                                            <i className="ri-error-warning-line me-1"></i>
                                            {errors.aue_model}
                                        </div>
                                    )}
                                    <small className="text-muted d-block mt-1">
                                        {modelsError ? (
                                            <>
                                                Showing the server&apos;s default models —{' '}
                                                {modelsError.includes('api.model.read')
                                                    ? 'the live list needs the api.model.read scope on this key.'
                                                    : 'the live list could not be loaded.'}
                                            </>
                                        ) : (
                                            'Live list from your OpenAI account. Used for the validator and both AUE generations.'
                                        )}
                                    </small>
                                </div>

                                <div className="col-12 col-md-6">
                                    <label htmlFor="openai-reasoning-effort" className="form-label fw-medium">
                                        Reasoning Effort <span className="text-danger">*</span>
                                    </label>
                                    <Dropdown
                                        inputId="openai-reasoning-effort"
                                        value={formData.reasoning_effort}
                                        options={effortOptions}
                                        optionLabel="label"
                                        optionValue="value"
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, reasoning_effort: e.value }));
                                            if (errors.reasoning_effort) {
                                                setErrors(prev => ({ ...prev, reasoning_effort: null }));
                                            }
                                        }}
                                        className={`w-100 ${errors.reasoning_effort ? 'p-invalid border-danger' : ''}`}
                                        disabled={loading}
                                    />
                                    {errors.reasoning_effort && (
                                        <div className="text-danger fs-12 mt-1">
                                            <i className="ri-error-warning-line me-1"></i>
                                            {errors.reasoning_effort}
                                        </div>
                                    )}
                                    <small className="text-muted d-block mt-1">
                                        Applied to the internal underwriting generation. Only the o-series and GPT-5 model
                                        families support this; it is omitted automatically for any other model.
                                    </small>
                                </div>

                                <div className="col-12">
                                    <hr className="my-1" />
                                    <h6 className="fw-semibold fs-14 mt-3 mb-1">Support Assistants</h6>
                                    <p className="text-muted fs-13 mb-0">
                                        The OpenAI Agent each support chat runs, and the vector stores it searches for its answers. Edits saved on the OpenAI platform are used from the next chat message.
                                    </p>
                                </div>

                                {ASSISTANTS.map(({ type, label }) => {
                                    const field = assistants[type];
                                    const saved = assistantConfigs.find(c => c.assistant_type === type);
                                    const error = errors[agentErrorKey(type)];
                                    const storeError = errors[storeErrorKey(type)];
                                    const inputId = `assistant-agent-id-${type}`;
                                    const stores = field.vector_stores;
                                    // A row the host added but has not typed an ID into yet is
                                    // neither configured nor switched off — it is simply not
                                    // filled in, and has to read that way rather than as either.
                                    const filled = filledStores(stores);
                                    // What this assistant will actually search once saved.
                                    const liveIds = field.stores_enabled ? filled.map(s => s.id) : [];
                                    // Stores the saved agent carries that this list will not
                                    // search — knowledge the assistant would never read.
                                    const unlistedOnAgent = (saved?.agent?.agent_vector_store_ids || [])
                                        .filter(id => !liveIds.includes(id));

                                    return (
                                        <div className="col-12 col-md-6" key={type}>
                                            <label htmlFor={inputId} className="form-label fw-medium">
                                                {label} Agent ID {field.enabled && <span className="text-danger">*</span>}
                                            </label>
                                            <div className="input-group input-group-inline">
                                                <span className={`input-group-text ${error ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                                                    <i className="ri-robot-2-line"></i>
                                                </span>
                                                <input
                                                    id={inputId}
                                                    type={field.visible ? 'text' : 'password'}
                                                    className={`form-control ${error ? 'is-invalid border-danger' : ''}`}
                                                    style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, backgroundImage: 'none' }}
                                                    placeholder="agent_..."
                                                    value={field.agent_id}
                                                    onChange={(e) => updateAssistant(type, { agent_id: e.target.value })}
                                                    autoComplete="new-password"
                                                    disabled={loading}
                                                />
                                                <button
                                                    type="button"
                                                    className={`input-group-text text-muted ${loading ? 'bg-light' : 'bg-white'} ${error ? 'border-danger' : ''}`}
                                                    onClick={() => updateAssistant(type, { visible: !field.visible })}
                                                    aria-label={`${field.visible ? 'Hide' : 'Show'} ${label} Agent ID`}
                                                    title={field.visible ? 'Hide Agent ID' : 'Show Agent ID'}
                                                >
                                                    <i className={field.visible ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                                                </button>
                                            </div>
                                            {error && (
                                                <div className="text-danger fs-12 mt-1">
                                                    <i className="ri-error-warning-line me-1"></i>
                                                    {error}
                                                </div>
                                            )}
                                            <small className="text-muted d-block mt-1">
                                                {saved?.agent_error
                                                    ? `Could not read the agent from OpenAI: ${saved.agent_error}`
                                                    : saved?.agent
                                                        ? `${saved.agent.name || 'Agent'} · ${saved.agent.model || ''}`
                                                        : 'Use "Copy agent ID" on the agent page on the OpenAI platform.'}
                                            </small>
                                            {/* The master switch comes first and names the thing it
                                                controls, so the form only appears once the host has
                                                said this assistant should search a knowledge base. */}
                                            <div className="form-check form-switch mt-3">
                                                <input
                                                    id={`assistant-stores-enabled-${type}`}
                                                    type="checkbox"
                                                    role="switch"
                                                    className="form-check-input"
                                                    checked={field.stores_enabled}
                                                    onChange={(e) => toggleStores(type, e.target.checked)}
                                                    disabled={loading}
                                                />
                                                <label htmlFor={`assistant-stores-enabled-${type}`} className="form-check-label fw-medium">
                                                    Storage ID
                                                    <span className="text-muted fw-normal fs-12 ms-1">
                                                        — search the knowledge base on every message
                                                    </span>
                                                </label>
                                            </div>

                                            {field.stores_enabled && (
                                            <div className="border rounded p-2 mt-2">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span className="fw-medium fs-13">
                                                    {label} Storage IDs
                                                </span>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => addStore(type)}
                                                    disabled={loading || stores.length >= MAX_VECTOR_STORES}
                                                    title={stores.length >= MAX_VECTOR_STORES ? `At most ${MAX_VECTOR_STORES} storage IDs` : 'Add another storage ID'}
                                                >
                                                    <i className="ri-add-line me-1"></i>
                                                    Add Storage ID
                                                </button>
                                            </div>

                                            {stores.map((store, index) => {
                                                const rowId = `assistant-store-${type}-${index}`;
                                                const rowError = errors[storeRowErrorKey(type, index)];

                                                return (
                                                    <div className="mb-2" key={index}>
                                                        <div className="input-group input-group-inline">
                                                            <span className={`input-group-text ${rowError ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                                                                {index + 1}
                                                            </span>
                                                            <input
                                                                id={rowId}
                                                                type="text"
                                                                className={`form-control ${rowError ? 'is-invalid border-danger' : ''}`}
                                                                placeholder="vs_..."
                                                                value={store.id}
                                                                onChange={(e) => patchStore(type, index, { id: e.target.value })}
                                                                disabled={loading}
                                                                autoComplete="off"
                                                                aria-label={`Storage ID ${index + 1} for the ${label}`}
                                                            />
                                                            <button
                                                                type="button"
                                                                className={`input-group-text text-danger bg-white ${rowError ? 'border-danger' : ''}`}
                                                                onClick={() => removeStore(type, index)}
                                                                disabled={loading}
                                                                aria-label={`Remove Storage ID ${index + 1}`}
                                                                title="Remove this Storage ID"
                                                            >
                                                                <i className="ri-delete-bin-line"></i>
                                                            </button>
                                                        </div>
                                                        {rowError && (
                                                            <div className="text-danger fs-12 mt-1">
                                                                <i className="ri-error-warning-line me-1"></i>
                                                                {rowError}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {storeError && (
                                                <div className="text-danger fs-12 mt-1">
                                                    <i className="ri-error-warning-line me-1"></i>
                                                    {storeError}
                                                </div>
                                            )}
                                            <small className="text-muted d-block mt-1">
                                                {filled.length === 0
                                                    ? 'Paste a Storage ID above, then save. Copy it from Storage › Vector stores on the OpenAI platform — it starts with "vs_".'
                                                    : `Searched on every message: ${filled.length} Storage ID${filled.length === 1 ? '' : 's'}. Empty rows are discarded on save.`}
                                            </small>
                                            {unlistedOnAgent.length > 0 && (
                                                <small className="text-warning-emphasis d-block mt-1">
                                                    <i className="ri-alert-line me-1"></i>
                                                    The agent on OpenAI also has {unlistedOnAgent.join(', ')}, which this assistant will not search. Add and tick it above if it should.
                                                </small>
                                            )}
                                            </div>
                                            )}
                                            {!field.stores_enabled && (
                                                <small className="text-muted d-block mt-1">
                                                    {filled.length > 0
                                                        ? `${filled.length} Storage ID${filled.length === 1 ? ' is' : 's are'} saved but not searched. Switch Storage ID on to use ${filled.length === 1 ? 'it' : 'them'} again.`
                                                        : 'No knowledge base — the assistant answers from whatever the agent itself is set up with. Switch Storage ID on to ground every answer in your approved files.'}
                                                </small>
                                            )}
                                            <div className="form-check form-switch mt-2">
                                                <input
                                                    id={`assistant-enabled-${type}`}
                                                    type="checkbox"
                                                    role="switch"
                                                    className="form-check-input"
                                                    checked={field.enabled}
                                                    onChange={(e) => (e.target.checked ? updateAssistant(type, { enabled: true }) : setPendingDisable(type))}
                                                    disabled={loading}
                                                />
                                                <label htmlFor={`assistant-enabled-${type}`} className="form-check-label fw-medium">
                                                    {label} {field.enabled ? 'enabled' : 'disabled'}
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="col-12">
                                    <hr className="my-1" />
                                    <h6 className="fw-semibold fs-14 mt-3 mb-1">Pre-Qualification Agent</h6>
                                    <p className="text-muted fs-13 mb-0">
                                        The one OpenAI Agent that underwrites every pre-qualification, and the storage it searches. Its instructions, result format, model and reasoning effort all live on the agent — edit it on the OpenAI platform and the next evaluation uses it. It produces the internal evaluation; the borrower and WL partner see the borrower-safe part of that same result. Without an agent, nothing is evaluated and applications go to manual review.
                                    </p>
                                </div>

                                {PREQUALIFICATION_STEPS.map(({ step, label, purpose }) => {
                                    const field = steps[step];
                                    const saved = stepConfigs.find(c => c.step === step);
                                    const error = errors[stepAgentErrorKey(step)];
                                    const storeError = errors[stepStoreErrorKey(step)];
                                    const inputId = `prequal-agent-id-${step}`;
                                    const stores = field.vector_stores;
                                    // A row the host added but has not typed an ID into yet is
                                    // neither configured nor switched off — it is simply not
                                    // filled in, and has to read that way rather than as either.
                                    const filled = filledStores(stores);
                                    // What this step will actually search once saved: the master
                                    // switch on, and the row's own switch on.
                                    const liveIds = stepStoresToSave(field).filter(s => s.enabled).map(s => s.id);
                                    const searched = liveIds.length;
                                    const parked = filled.length - searched;
                                    // Stores the saved agent carries that this list will not
                                    // search — knowledge the evaluation would never read.
                                    const unlistedOnAgent = (saved?.agent?.agent_vector_store_ids || [])
                                        .filter(id => !liveIds.includes(id));

                                    return (
                                        <div className="col-12 col-md-6" key={step}>
                                            <label htmlFor={inputId} className="form-label fw-medium">
                                                {label} Agent ID {field.enabled && <span className="text-danger">*</span>}
                                            </label>
                                            <div className="input-group input-group-inline">
                                                <span className={`input-group-text ${error ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                                                    <i className="ri-robot-2-line"></i>
                                                </span>
                                                <input
                                                    id={inputId}
                                                    type={field.visible ? 'text' : 'password'}
                                                    className={`form-control ${error ? 'is-invalid border-danger' : ''}`}
                                                    style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, backgroundImage: 'none' }}
                                                    placeholder="agent_..."
                                                    value={field.agent_id}
                                                    onChange={(e) => updateStep(step, { agent_id: e.target.value })}
                                                    autoComplete="new-password"
                                                    disabled={loading}
                                                />
                                                <button
                                                    type="button"
                                                    className={`input-group-text text-muted ${loading ? 'bg-light' : 'bg-white'} ${error ? 'border-danger' : ''}`}
                                                    onClick={() => updateStep(step, { visible: !field.visible })}
                                                    aria-label={`${field.visible ? 'Hide' : 'Show'} ${label} Agent ID`}
                                                    title={field.visible ? 'Hide Agent ID' : 'Show Agent ID'}
                                                >
                                                    <i className={field.visible ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                                                </button>
                                            </div>
                                            {error && (
                                                <div className="text-danger fs-12 mt-1">
                                                    <i className="ri-error-warning-line me-1"></i>
                                                    {error}
                                                </div>
                                            )}
                                            <small className="text-muted d-block mt-1">
                                                {saved?.agent_error
                                                    ? `Could not read the agent from OpenAI: ${saved.agent_error}`
                                                    : saved?.agent
                                                        ? `${saved.agent.name || 'Agent'} · ${saved.agent.model || ''}${saved.agent.reasoning_effort ? ` · ${saved.agent.reasoning_effort} reasoning` : ''}`
                                                        : purpose}
                                            </small>
                                            {/* An underwriting step has to return a structured result.
                                                An agent left on plain text fails every evaluation, so it
                                                is named here rather than discovered after a submission. */}
                                            {saved?.agent && !saved.agent.has_structured_output && (
                                                <small className="text-danger d-block mt-1">
                                                    <i className="ri-error-warning-line me-1"></i>
                                                    This agent&apos;s Text format is not JSON Schema, so it cannot return an underwriting result. Set it on the OpenAI platform.
                                                </small>
                                            )}

                                            {/* The master switch comes first and names the thing it
                                                controls, so the form only appears once the host has
                                                said this step should search a knowledge base. */}
                                            <div className="form-check form-switch mt-3">
                                                <input
                                                    id={`prequal-stores-enabled-${step}`}
                                                    type="checkbox"
                                                    role="switch"
                                                    className="form-check-input"
                                                    checked={field.stores_enabled}
                                                    onChange={(e) => toggleStepStores(step, e.target.checked)}
                                                    disabled={loading}
                                                />
                                                <label htmlFor={`prequal-stores-enabled-${step}`} className="form-check-label fw-medium">
                                                    Storage ID
                                                    <span className="text-muted fw-normal fs-12 ms-1">
                                                        — search the knowledge base on every evaluation
                                                    </span>
                                                </label>
                                            </div>

                                            {field.stores_enabled && (
                                                <div className="border rounded p-2 mt-2">
                                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                                        <span className="fw-medium fs-13">
                                                            {label} Storage IDs
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => addStepStore(step)}
                                                            disabled={loading || stores.length >= MAX_VECTOR_STORES}
                                                            title={stores.length >= MAX_VECTOR_STORES ? `At most ${MAX_VECTOR_STORES} storage IDs` : 'Add another storage ID'}
                                                        >
                                                            <i className="ri-add-line me-1"></i>
                                                            Add Storage ID
                                                        </button>
                                                    </div>

                                                    {stores.map((store, index) => {
                                                        const rowId = `prequal-store-${step}-${index}`;
                                                        const rowError = errors[stepStoreRowErrorKey(step, index)];

                                                        return (
                                                            <div className="mb-2" key={index}>
                                                                <div className="input-group input-group-inline">
                                                                    <span className={`input-group-text ${rowError ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                                                                        {index + 1}
                                                                    </span>
                                                                    <input
                                                                        id={rowId}
                                                                        type="text"
                                                                        className={`form-control ${rowError ? 'is-invalid border-danger' : ''} ${store.enabled ? '' : 'text-muted'}`}
                                                                        placeholder="vs_..."
                                                                        value={store.id}
                                                                        onChange={(e) => patchStepStore(step, index, { id: e.target.value })}
                                                                        disabled={loading}
                                                                        autoComplete="off"
                                                                        aria-label={`Storage ID ${index + 1} for ${label}`}
                                                                    />
                                                                    {/* Each storage ID has its own switch, so one knowledge
                                                                        base can be parked while it is rebuilt without losing
                                                                        its ID or disturbing the others. */}
                                                                    <span className={`input-group-text bg-white ${rowError ? 'border-danger' : ''}`}>
                                                                        <span className="form-check form-switch m-0">
                                                                            <input
                                                                                id={`${rowId}-enabled`}
                                                                                type="checkbox"
                                                                                role="switch"
                                                                                className="form-check-input m-0"
                                                                                checked={store.enabled}
                                                                                onChange={(e) => patchStepStore(step, index, { enabled: e.target.checked })}
                                                                                disabled={loading}
                                                                                aria-label={`${store.enabled ? 'Stop searching' : 'Search'} Storage ID ${index + 1}`}
                                                                                title={store.enabled ? 'Searched — switch off to park this knowledge base' : 'Parked — switch on to search it again'}
                                                                            />
                                                                        </span>
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className={`input-group-text text-danger bg-white ${rowError ? 'border-danger' : ''}`}
                                                                        onClick={() => removeStepStore(step, index)}
                                                                        disabled={loading}
                                                                        aria-label={`Remove Storage ID ${index + 1}`}
                                                                        title="Remove this Storage ID"
                                                                    >
                                                                        <i className="ri-delete-bin-line"></i>
                                                                    </button>
                                                                </div>
                                                                {rowError && (
                                                                    <div className="text-danger fs-12 mt-1">
                                                                        <i className="ri-error-warning-line me-1"></i>
                                                                        {rowError}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}

                                                    {storeError && (
                                                        <div className="text-danger fs-12 mt-1">
                                                            <i className="ri-error-warning-line me-1"></i>
                                                            {storeError}
                                                        </div>
                                                    )}
                                                    <small className="text-muted d-block mt-1">
                                                        {filled.length === 0
                                                            ? 'Paste a Storage ID above, then save. Copy it from Storage › Vector stores on the OpenAI platform — it starts with "vs_".'
                                                            : `Searched on every evaluation: ${searched} of ${filled.length} Storage ID${filled.length === 1 ? '' : 's'}${parked > 0 ? `, ${parked} parked` : ''}. Switch a row off to park it without losing the ID. Empty rows are discarded on save.`}
                                                    </small>
                                                    {unlistedOnAgent.length > 0 && (
                                                        <small className="text-warning-emphasis d-block mt-1">
                                                            <i className="ri-alert-line me-1"></i>
                                                            The agent on OpenAI also has {unlistedOnAgent.join(', ')}, which this step will not search. Add it above if it should.
                                                        </small>
                                                    )}
                                                </div>
                                            )}
                                            {!field.stores_enabled && (
                                                <small className="text-muted d-block mt-1">
                                                    {filled.length > 0
                                                        ? `${filled.length} Storage ID${filled.length === 1 ? ' is' : 's are'} saved but not searched. Switch Storage ID on to use ${filled.length === 1 ? 'it' : 'them'} again.`
                                                        : 'No knowledge base — the step runs on whatever the agent itself is set up with. Switch Storage ID on to ground every evaluation in your approved files.'}
                                                </small>
                                            )}
                                            {field.stores_enabled && filled.length > 0 && searched === 0 && (
                                                <small className="text-warning-emphasis d-block mt-1">
                                                    <i className="ri-alert-line me-1"></i>
                                                    Every Storage ID here is parked, so this step searches nothing and runs on the agent alone.
                                                </small>
                                            )}

                                            <div className="form-check form-switch mt-2">
                                                <input
                                                    id={`prequal-enabled-${step}`}
                                                    type="checkbox"
                                                    role="switch"
                                                    className="form-check-input"
                                                    checked={field.enabled}
                                                    onChange={(e) => (e.target.checked ? updateStep(step, { enabled: true }) : setPendingStepDisable(step))}
                                                    disabled={loading}
                                                />
                                                <label htmlFor={`prequal-enabled-${step}`} className="form-check-label fw-medium">
                                                    {label} {field.enabled ? 'runs on this agent' : 'not running'}
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="d-flex justify-content-end mt-4">
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Configuration'
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>

            <DynamicActionModal
                show={!!pendingDisable}
                title={`Disable the ${pendingAssistant?.label ?? 'Assistant'}?`}
                description={
                    <>
                        <strong>{pendingAssistant?.audience}</strong> will no longer see the support chat in the {pendingAssistant?.portal}. The chat button is hidden for all of them.
                    </>
                }
                warningText="The Agent ID is kept, so you can enable it again at any time. This takes effect after you click Save Configuration."
                warningBgClass="bg-warning-subtle border-start border-3 border-warning"
                confirmText="Yes, Disable"
                confirmBtnClass="btn-danger"
                onClose={() => setPendingDisable(null)}
                onConfirm={confirmDisable}
            />

            <DynamicActionModal
                show={!!pendingStepDisable}
                title={`Stop running ${pendingStep?.label ?? 'this step'}?`}
                description={
                    <>
                        This step produces no result while it is switched off. {pendingStep?.purpose} Applications that
                        reach it go to <strong>manual review</strong> instead.
                    </>
                }
                warningText="The Agent ID and Storage IDs are kept, so you can switch it back on at any time. This takes effect after you click Save Configuration."
                warningBgClass="bg-warning-subtle border-start border-3 border-warning"
                confirmText="Yes, Stop It"
                confirmBtnClass="btn-danger"
                onClose={() => setPendingStepDisable(null)}
                onConfirm={confirmStepDisable}
            />
        </div>
    );
};

export default OpenAiConfigForm;
