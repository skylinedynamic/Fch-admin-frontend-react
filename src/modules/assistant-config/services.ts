import { apiClient } from '../../lib/http/apiClient';
import type { AssistantConfig, SaveAssistantConfigPayload } from './types';

export const fetchAssistantConfigs = async (): Promise<{ status: boolean; data: AssistantConfig[] }> => {
    const { data } = await apiClient.get('/common/assistant-config');
    return data;
};

export const saveAssistantConfig = async (payload: SaveAssistantConfigPayload): Promise<any> => {
    const { data } = await apiClient.post('/common/assistant-config', payload);
    return data;
};
