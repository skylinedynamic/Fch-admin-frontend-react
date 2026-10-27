import React, { useState } from 'react';
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import TaxonomyDeleteBlockedModal, { BlockedTaxonomy, blockedFromError } from './TaxonomyDeleteBlockedModal';

type Item = { id: number; name: string; blogs_count?: number };

interface TaxonomyChipsProps {
    items: Item[];
    /** "Category" or "Tag" - used in the edit/delete wording. */
    kind: string;
    onRename: (id: number, name: string) => Promise<void>;
    /** Rejects with the API error when the delete is refused, so a 422 "in use" opens the blocked modal. */
    onDelete: (id: number) => Promise<void>;
}

/** The API sends a field's errors as a string or a list of strings. */
export const firstFieldError = (errors: any, field: string): string | undefined => {
    const value = errors?.[field];
    return Array.isArray(value) ? value[0] : value;
};

/**
 * The Existing Categories / Tags chips of the blog editor: each can be renamed
 * in place (pencil, then check or Enter) and deleted through the app's confirm
 * dialog. A refused rename (e.g. a duplicate name) shows the API's message
 * under that chip. One used by a blog post is not offered for deletion: the
 * blocked modal says why instead (BUG-059).
 */
export default function TaxonomyChips({ items, kind, onRename, onDelete }: TaxonomyChipsProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editError, setEditError] = useState('');
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState<Item | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [blocked, setBlocked] = useState<BlockedTaxonomy | null>(null);

    const askDelete = (item: Item) => {
        if ((item.blogs_count ?? 0) > 0) setBlocked({ name: item.name, count: item.blogs_count });
        else setToDelete(item);
    };

    const startEdit = (item: Item) => {
        setEditingId(item.id);
        setEditName(item.name);
        setEditError('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditError('');
    };

    const saveEdit = async (id: number) => {
        setSaving(true);
        setEditError('');
        try {
            await onRename(id, editName.trim());
            cancelEdit();
        } catch (error: any) {
            const message = firstFieldError(error?.response?.data?.errors, 'name');
            if (message) setEditError(message);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        try {
            await onDelete(toDelete.id);
        } catch (error) {
            const refused = blockedFromError(error);
            if (refused) setBlocked({ name: refused.name });
        } finally {
            setDeleting(false);
            setToDelete(null);
        }
    };

    return (
        <>
            <div className="d-flex flex-wrap gap-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {items.map((item) => (
                    editingId === item.id ? (
                        <div key={item.id} className="w-100">
                            <div className="d-flex align-items-center gap-2">
                                <input
                                    type="text"
                                    className={`form-control form-control-sm ${editError ? 'is-invalid' : ''}`}
                                    value={editName}
                                    aria-label={`${kind} name`}
                                    onChange={(e) => { setEditName(e.target.value); if (editError) setEditError(''); }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); saveEdit(item.id); }
                                        if (e.key === 'Escape') cancelEdit();
                                    }}
                                    autoFocus
                                />
                                <button type="button" className="btn btn-sm btn-success" title="Save" onClick={() => saveEdit(item.id)} disabled={saving}>
                                    {saving ? <span className="spinner-border spinner-border-sm" role="status"></span> : <i className="ri-check-line"></i>}
                                </button>
                                <button type="button" className="btn btn-sm btn-secondary" title="Cancel" onClick={cancelEdit} disabled={saving}>
                                    <i className="ri-close-line"></i>
                                </button>
                            </div>
                            {editError && <div className="invalid-feedback d-block">{editError}</div>}
                        </div>
                    ) : (
                        <span
                            key={item.id}
                            className="badge bg-light text-dark border d-inline-flex align-items-center"
                            style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                        >
                            {item.name}
                            <button
                                type="button"
                                className="btn btn-link p-0 ms-2 text-muted"
                                onClick={() => startEdit(item)}
                                title="Edit"
                                aria-label={`Edit ${item.name}`}
                                style={{ fontSize: '0.8rem', lineHeight: 1 }}
                            >
                                <i className="ri-pencil-line"></i>
                            </button>
                            <button
                                type="button"
                                className="btn-close btn-close-sm ms-2"
                                onClick={() => askDelete(item)}
                                title="Delete"
                                aria-label={`Delete ${item.name}`}
                                style={{ fontSize: '0.65rem', opacity: 0.5 }}
                            ></button>
                        </span>
                    )
                ))}
            </div>

            <DeleteConfirmationModal
                show={toDelete !== null}
                onClose={() => setToDelete(null)}
                onConfirm={confirmDelete}
                loading={deleting}
                title={`Delete ${kind}?`}
                text={toDelete ? `This will permanently remove the ${kind.toLowerCase()} "${toDelete.name}".` : undefined}
            />

            <TaxonomyDeleteBlockedModal kind={kind} blocked={blocked} onClose={() => setBlocked(null)} />
        </>
    );
}
