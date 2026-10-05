import { apiClient } from '../../lib/http/apiClient';
import type { AssistantConfig, AssistantType } from './types';

export const fetchAssistantConfigs = async (): Promise<{ status: boolean; data: AssistantConfig[] }> => {
    const { data } = await apiClient.get('/common/assistant-config');
    return data;
};

/** Saves which OpenAI agent an assistant runs and its on/off switch. */
export const saveAssistantSettings = async (
    type: AssistantType,
    payload: { agent_id: string | null; enabled: boolean }
): Promise<{ status: boolean }> => {
    const { data } = await apiClient.put(`/common/assistant-config/${type}`, payload);
    return data;
};
