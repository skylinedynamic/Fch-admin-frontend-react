export type AssistantType = 'wlp_support' | 'borrower_support';

/** The agent as it is saved on the OpenAI platform right now. */
export interface AssistantAgent {
    name: string | null;
    model: string | null;
    reasoning_effort: string | null;
}

export interface AssistantConfig {
    assistant_type: AssistantType;
    agent_id: string | null;
    is_enabled: boolean;
    is_ready: boolean;
    agent: AssistantAgent | null;
    /** Why the live agent could not be read from OpenAI, if it couldn't. */
    agent_error: string | null;
}
