import { apiClient } from '../../lib/http/apiClient';
import type {
    AssistantConfig,
    AssistantType,
    CreatePromptVersionPayload,
    NavigationRoute,
    PromptVersion,
    PromptVersionsResponse,
} from './types';

export const fetchAssistantConfigs = async (): Promise<{ status: boolean; data: AssistantConfig[] }> => {
    const { data } = await apiClient.get('/common/assistant-config');
    return data;
};

export const fetchPromptVersions = async (type: AssistantType): Promise<{ status: boolean; data: PromptVersionsResponse }> => {
    const { data } = await apiClient.get(`/common/assistant-config/${type}/prompts`);
    return data;
};

export const createPromptVersion = async (
    type: AssistantType,
    payload: CreatePromptVersionPayload
): Promise<{ status: boolean; data: PromptVersion }> => {
    const { data } = await apiClient.post(`/common/assistant-config/${type}/prompts`, payload);
    return data;
};

/** Releases a version. Activating an older version is a rollback. */
export const activatePromptVersion = async (type: AssistantType, id: number): Promise<{ status: boolean; data: PromptVersion }> => {
    const { data } = await apiClient.post(`/common/assistant-config/${type}/prompts/${id}/activate`);
    return data;
};

export const revertToBundledPrompt = async (type: AssistantType): Promise<{ status: boolean }> => {
    const { data } = await apiClient.post(`/common/assistant-config/${type}/prompts/revert-to-bundled`);
    return data;
};

export const fetchNavigationRoutes = async (type: AssistantType): Promise<{ status: boolean; data: NavigationRoute[] }> => {
    const { data } = await apiClient.get(`/common/assistant-config/${type}/routes`);
    return data;
};

export const saveNavigationRoute = async (
    type: AssistantType,
    key: string,
    payload: { label: string; path: string; is_active: boolean }
): Promise<{ status: boolean }> => {
    const { data } = await apiClient.put(`/common/assistant-config/${type}/routes/${key}`, payload);
    return data;
};

export const deleteNavigationRoute = async (type: AssistantType, key: string): Promise<{ status: boolean }> => {
    const { data } = await apiClient.delete(`/common/assistant-config/${type}/routes/${key}`);
    return data;
};
