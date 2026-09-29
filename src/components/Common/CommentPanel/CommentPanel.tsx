import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { fetchComments, createComment, deleteComment } from '../../../modules/comments/services';
import type { Comment, CommentEntityType } from '../../../modules/comments/types';
import { useAuthStore } from '../../../store/auth/authStore';

interface CommentPanelProps {
    entityType: CommentEntityType;
    entityId: number | string | undefined;
}

export default function CommentPanel({ entityType, entityId }: CommentPanelProps) {
    const currentUser = useAuthStore((state: any) => state.user);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [body, setBody] = useState('');
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        if (!entityId) return;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityType, entityId]);

    const load = async () => {
        try {
            setLoading(true);
            const response = await fetchComments(entityType, Number(entityId));
            setComments(response.data || []);
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = body.trim();
        if (!text || posting || !entityId) return;

        setPosting(true);
        try {
            await createComment({ entity_type: entityType, entity_id: Number(entityId), body: text });
            setBody('');
            await load();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to post comment.');
        } finally {
            setPosting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteComment(id);
            setComments((prev) => prev.filter((c) => c.id !== id));
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete comment.');
        }
    };

    return (
        <div className="card mt-3">
            <div className="card-header bg-white py-2">
                <span className="fw-medium fs-14">Comments</span>
            </div>
            <div className="card-body p-3">
                {loading ? (
                    <p className="text-muted fs-13 mb-0">Loading comments…</p>
                ) : comments.length === 0 ? (
                    <p className="text-muted fs-13 mb-3">No comments yet.</p>
                ) : (
                    <div className="mb-3">
                        {comments.map((c) => (
                            <div key={c.id} className="d-flex justify-content-between align-items-start border-bottom py-2">
                                <div>
                                    <div className="fw-medium fs-13">{c.user?.name || 'Unknown user'}</div>
                                    <div className="fs-13 text-dark" style={{ whiteSpace: 'pre-wrap' }}>{c.body}</div>
                                    <div className="text-muted fs-11">{new Date(c.created_at).toLocaleString()}</div>
                                </div>
                                {currentUser?.id === c.user?.id && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-link text-danger p-0"
                                        onClick={() => handleDelete(c.id)}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={handlePost} className="d-flex gap-2">
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Add a comment…"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        disabled={posting}
                    />
                    <button type="submit" className="btn btn-sm btn-primary" disabled={posting || !body.trim()}>
                        Post
                    </button>
                </form>
            </div>
        </div>
    );
}
