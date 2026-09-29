// Matches the `data` payload of FCH_WLP_Assistant_OpenAPI_v1_1.yaml's
// POST /wlp-assistant/messages response.

export interface ChatAction {
    type: 'navigate';
    id: string;
    label: string;
    path: string;
}

export interface ChatSource {
    title: string;
    file_id?: string | null;
}

export interface ChatEscalation {
    required: boolean;
    reason: string | null;
    route: string | null;
}

export interface ChatPolicy {
    live_data_used: boolean;
    restricted_content_blocked: boolean;
    sensitive_input_detected: boolean;
}

export interface SendMessagePayload {
    session_id?: string | null;
    message: string;
}

export interface SendMessageResult {
    session_id: string;
    message_id: string;
    answer: string;
    // Pre-formatted server-side via toTimezone() against the caller's own
    // X-Timezone header — already correct for the viewer, render as-is.
    created_at: string;
    actions: ChatAction[];
    sources: ChatSource[];
    escalation: ChatEscalation;
    policy: ChatPolicy;
}

export interface SendMessageResponse {
    status: boolean;
    message: string;
    data: SendMessageResult;
}

// A rendered chat bubble in the widget's own local history (not the wire format).
export interface ChatBubble {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    actions: ChatAction[];
    createdAt?: string;
}

// Matches ChatMessageResource, used by GET .../conversations/{sessionId}/messages.
export interface HistoryMessage {
    message_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    actions: ChatAction[];
    sources: ChatSource[];
    created_at: string;
}

export interface HistoryResponse {
    status: boolean;
    message: string;
    data: HistoryMessage[];
}

// Matches GET .../assistant/wlp/sessions — ordered newest-first by the backend.
export interface SessionSummary {
    session_id: string;
    status: string;
    last_message_at: string | null;
    created_at: string;
}

export interface SessionsResponse {
    status: boolean;
    message: string;
    data: SessionSummary[];
}
