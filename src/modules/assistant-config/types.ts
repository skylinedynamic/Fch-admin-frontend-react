export type AssistantType = 'wlp_support' | 'borrower_support';

export interface AssistantConfig {
    assistant_type: AssistantType;
    system_prompt: string | null;
    model: string | null;
    reasoning_effort: string | null;
    max_output_tokens: number | null;
    vector_store_id: string | null;
    knowledge_manifest_version: string | null;
    is_enabled: boolean;
    is_ready: boolean;
}

export interface SaveAssistantConfigPayload {
    assistant_type: AssistantType;
    system_prompt?: string;
    model?: string;
    reasoning_effort?: string;
    max_output_tokens?: number;
    is_enabled?: boolean;
}
