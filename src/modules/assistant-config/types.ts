export type AssistantType = 'wlp_support' | 'borrower_support';

/** Identity of the prompt currently in force (what answers are generated with). */
export interface PromptInForce {
    version: string;
    sha256: string;
    /** 'database' = a released version; 'file' = the default bundled with the code. */
    source: 'database' | 'file';
}

export interface AssistantConfig {
    assistant_type: AssistantType;
    prompt: PromptInForce;
    model: string | null;
    reasoning_effort: string | null;
    max_output_tokens: number | null;
    vector_store_id: string | null;
    knowledge_manifest_version: string | null;
    is_enabled: boolean;
    is_ready: boolean;
}

export interface PromptVersion {
    id: number;
    assistant_type: AssistantType;
    version: string;
    content_sha256: string;
    notes: string | null;
    is_active: boolean;
    activated_at: string | null;
    created_at: string;
}

export interface PromptVersionsResponse {
    in_force: PromptInForce;
    versions: PromptVersion[];
}

export interface CreatePromptVersionPayload {
    version: string;
    content: string;
    notes?: string;
}

export interface NavigationRoute {
    route_key: string;
    label: string;
    path: string;
    is_active: boolean;
    /** default = from the application; customised = default changed here; custom = added here. */
    source: 'default' | 'customised' | 'custom';
}
