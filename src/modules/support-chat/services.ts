import { apiClient } from '../../lib/http/apiClient';
import type { SendMessagePayload, SendMessageResponse, HistoryResponse, SessionsResponse } from './types';

// WLP support assistant — knowledge-only, see SupportAssistantService on the backend.
export const sendAssistantMessage = async (payload: SendMessagePayload): Promise<SendMessageResponse> => {
    const { data } = await apiClient.post('/common/assistant/wlp/messages', payload);
    return data;
};

export const fetchAssistantHistory = async (sessionId: string): Promise<HistoryResponse> => {
    const { data } = await apiClient.get(`/common/assistant/wlp/conversations/${sessionId}/messages`);
    return data;
};

// The authenticated user's own sessions only (server-enforced) — newest first.
export const listAssistantSessions = async (): Promise<SessionsResponse> => {
    const { data } = await apiClient.get('/common/assistant/wlp/sessions');
    return data;
};

// Explicitly closes the current open session and starts a fresh one —
// backs a "New conversation" control, as opposed to sendAssistantMessage's
// session_id-omitted call, which only ever resumes the existing thread.
export const startNewAssistantSession = async (): Promise<{ status: boolean; message: string; data: { session_id: string } }> => {
    const { data } = await apiClient.post('/common/assistant/wlp/sessions');
    return data;
};

// The safe, non-host-gated subset of the assistant's state: whether it's
// ready, and the welcome subtitle + quick-reply suggestion chips. Both are
// live-derived by the backend straight from the current system prompt on
// every call (see SupportAssistantService::deriveWidgetIntro()) — nothing
// here is stored, so editing the prompt changes what this returns on the
// very next fetch, with no separate save step.
export const fetchAssistantConfig = async (): Promise<{
    status: boolean;
    message: string;
    data: { is_ready: boolean; welcome_subtitle: string | null; quick_suggestions: string[]; navigation?: Record<string, string> };
}> => {
    const { data } = await apiClient.get('/common/assistant/wlp/config');
    return data;
};
