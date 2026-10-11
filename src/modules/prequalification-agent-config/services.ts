import { apiClient } from '../../lib/http/apiClient';
import type { AssistantVectorStore } from '../assistant-config/types';
import type { PreQualificationAgentConfig, PreQualificationStep } from './types';

export const fetchPreQualificationAgentConfigs = async (): Promise<{
    status: boolean;
    data: PreQualificationAgentConfig[];
}> => {
    const { data } = await apiClient.get('/common/prequalification-agent-config');
    return data;
};

/**
 * Saves which OpenAI agent runs one Pre-Qualification step, the storage IDs it
 * searches and whether each one is switched on. The server checks the agent and
 * every storage ID against OpenAI before it saves — switched-off ones included —
 * and refuses an agent that does not return a structured result, so a
 * misconfiguration is caught here rather than mid-evaluation.
 */
export const savePreQualificationAgentSettings = async (
    step: PreQualificationStep,
    payload: { agent_id: string | null; enabled: boolean; vector_stores: AssistantVectorStore[] }
): Promise<{ status: boolean }> => {
    const { data } = await apiClient.put(`/common/prequalification-agent-config/${step}`, payload);
    return data;
};
