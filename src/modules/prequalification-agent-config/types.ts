import type { AssistantVectorStore } from '../assistant-config/types';

/**
 * The one Agent that underwrites a pre-qualification.
 *
 * Its instructions, its output schema, its model and its reasoning effort live
 * on the OpenAI platform and are read on every evaluation, so nothing about how
 * a borrower is assessed lives in the application code. It produces the
 * internal evaluation; the borrower's and the WL partner's result is the
 * borrower-safe part of that same evaluation, and whether the submitted answers
 * are usable is its own data_status.
 */
export type PreQualificationStep = 'prequalification_agent';

/** The agent as it is saved on the OpenAI platform right now. */
export interface PreQualificationAgent {
    name: string | null;
    model: string | null;
    reasoning_effort: string | null;
    /**
     * Whether the agent's Text format is JSON Schema. An underwriting step has
     * to return a structured result, so an agent left on plain text would fail
     * every evaluation — the screen says so rather than letting it be saved.
     */
    has_structured_output: boolean;
    /** Vector stores attached to the saved agent's own file_search tool. */
    agent_vector_store_ids: string[];
}

export interface PreQualificationAgentConfig {
    step: PreQualificationStep;
    agent_id: string | null;
    is_enabled: boolean;
    /** Switched on and with an agent to run, so this step can actually evaluate. */
    is_ready: boolean;
    /**
     * The knowledge bases this step searches, in the order the host arranged
     * them. The switched-on ones are sent with every evaluation as the
     * file_search tool, so the result is grounded in those files whether or not
     * the saved agent has the tool configured.
     */
    vector_stores: AssistantVectorStore[];
    agent: PreQualificationAgent | null;
    /** Why the live agent could not be read from OpenAI, if it couldn't. */
    agent_error: string | null;
}

export type { AssistantVectorStore };
