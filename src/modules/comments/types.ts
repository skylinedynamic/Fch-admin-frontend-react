export type CommentEntityType = 'funding_request' | 'funding_application' | 'borrower';

export interface Comment {
    id: number;
    body: string;
    visibility: 'private' | 'internal' | 'partner' | 'everyone';
    user: { id: number; name: string } | null;
    created_at: string;
    updated_at: string;
}

export interface CommentListResponse {
    status: boolean;
    message: string;
    data: Comment[];
    meta?: { total: number };
}
