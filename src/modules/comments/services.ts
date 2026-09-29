import { apiClient } from '../../lib/http/apiClient';
import type { Comment, CommentEntityType, CommentListResponse } from './types';

export const fetchComments = async (entityType: CommentEntityType, entityId: number): Promise<CommentListResponse> => {
    const { data } = await apiClient.get('/common/comments', { params: { entity_type: entityType, entity_id: entityId } });
    return data;
};

export const createComment = async (payload: { entity_type: CommentEntityType; entity_id: number; body: string; visibility?: string }): Promise<{ status: boolean; data: Comment }> => {
    const { data } = await apiClient.post('/common/comments', payload);
    return data;
};

export const deleteComment = async (id: number): Promise<any> => {
    const { data } = await apiClient.delete(`/common/comments/${id}`);
    return data;
};
