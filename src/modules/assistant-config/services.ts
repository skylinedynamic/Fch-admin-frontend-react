import { apiClient } from '../../lib/http/apiClient';
import type { AssistantConfig, AssistantType, AssistantVectorStore } from './types';

export const fetchAssistantConfigs = async (): Promise<{ status: boolean; data: AssistantConfig[] }> => {
    const { data } = await apiClient.get('/common/assistant-config');
    return data;
};

/**
 * Saves which OpenAI agent an assistant runs, the vector stores it may search
 * and whether each one is switched on, plus its own on/off switch. The server
 * checks every store ID against OpenAI before it saves — switched-off ones
 * included — so a bad ID is rejected here rather than surfacing in chat.
 */
export const saveAssistantSettings = async (
    type: AssistantType,
    payload: { agent_id: string | null; enabled: boolean; vector_stores: AssistantVectorStore[] }
): Promise<{ status: boolean }> => {
    const { data } = await apiClient.put(`/common/assistant-config/${type}`, payload);
    return data;
};
