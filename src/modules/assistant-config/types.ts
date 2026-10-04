export type AssistantType = 'wlp_support' | 'borrower_support';

/** The agent as it is saved on the OpenAI platform right now. */
export interface AssistantAgent {
    name: string | null;
    model: string | null;
    reasoning_effort: string | null;
    /** Vector stores attached to the saved agent's own file_search tool. */
    agent_vector_store_ids: string[];
}

/**
 * One knowledge base this assistant can search, with its own switch. A store
 * switched off keeps its ID in settings but is never handed to the agent, so
 * it cannot reach an answer — which is how a store is parked while it is
 * rebuilt, then put back without re-typing its ID.
 */
export interface AssistantVectorStore {
    id: string;
    enabled: boolean;
}

export interface AssistantConfig {
    assistant_type: AssistantType;
    agent_id: string | null;
    is_enabled: boolean;
    is_ready: boolean;
    /**
     * The vector stores this assistant may search, in the order the host
     * arranged them. The switched-on ones are sent with every chat message as
     * the file_search tool, so an answer is grounded in those files whether or
     * not the saved agent has the tool configured.
     */
    vector_stores: AssistantVectorStore[];
    agent: AssistantAgent | null;
    /** Why the live agent could not be read from OpenAI, if it couldn't. */
    agent_error: string | null;
}
