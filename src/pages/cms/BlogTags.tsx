import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useTags, useCreateTag, useUpdateTag, useDeleteTags } from '../../modules/cms/queries';
import PageHeader from '../common/PageHeader';
import { Dialog } from 'primereact/dialog';
import { toast } from 'react-toastify';
import TableLoader from "../../components/Loader/TableLoader";
import { Tag } from '../../modules/cms/types';
import { Link } from 'react-router-dom';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import TaxonomyDeleteBlockedModal, { BlockedTaxonomy, blockedFromError } from './components/TaxonomyDeleteBlockedModal';

interface TagFormData {
    name: string;
    slug: string;
}

export default function BlogTags() {
    const { data: tagsData, isLoading } = useTags();
    const createMutation = useCreateTag();
    const updateMutation = useUpdateTag();
    const deleteMutation = useDeleteTags();

    const [showModal, setShowModal] = useState<boolean>(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [formData, setFormData] = useState<TagFormData>({ name: '', slug: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toDelete, setToDelete] = useState<Tag | null>(null);
    const [blocked, setBlocked] = useState<BlockedTaxonomy | null>(null);

    // One used by a blog post is kept: say why instead of asking to confirm (BUG-059).
    const askDelete = (row: Tag & { blogs_count?: number }) => {
        if ((row.blogs_count ?? 0) > 0) setBlocked({ name: row.name, count: row.blogs_count });
        else setToDelete(row);
    };

    const handleOpenModal = (tag: Tag | null = null) => {
        if (tag) {
            setEditingTag(tag);
            setFormData({ name: tag.name, slug: tag.slug || '' });
        } else {
            setEditingTag(null);
            setFormData({ name: '', slug: '' });
        }
        setErrors({});
        setShowModal(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            if (editingTag) {
                await updateMutation.mutateAsync({ id: editingTag.id, data: formData });
                toast.success("Tag updated successfully");
            } else {
                await createMutation.mutateAsync(formData);
                toast.success("Tag created successfully");
            }
            setShowModal(false);
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const backendErrors = error.response.data.errors;
                const mappedErrors: Record<string, string> = {};
                Object.keys(backendErrors).forEach(key => {
                    mappedErrors[key] = backendErrors[key][0];
                });
                setErrors(mappedErrors);
            } else {
                toast.error(error.response?.data?.message || "An error occurred");
            }
        }
    };

    // Delete is confirmed in the app's dialog, not the browser's pop-up (BUG-059).
    const confirmDelete = async () => {
        if (!toDelete) return;
        try {
            await deleteMutation.mutateAsync([toDelete.id]);
            toast.success("Tag deleted successfully");
        } catch (error) {
            const refused = blockedFromError(error);
            if (refused) setBlocked({ name: refused.name });
            else toast.error("Failed to delete tag");
        } finally {
            setToDelete(null);
        }
    };

    if (isLoading) return <TableLoader />;

    const tags = tagsData?.data || [];

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Sticky Header */}
                {/* Sticky Header */}
                <PageHeader 
                    title="Blog Tags" 
                    breadcrumbs={[
                        { label: 'Blogs', path: '/cms/blogs' },
                        { label: 'Tags' }
                    ]} 
                >
                    <div className="d-flex gap-2">
                        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                            <i className="ri-add-line me-1 align-bottom"></i> Add Tag
                        </button>
                    </div>
                </PageHeader>

                <div className="card mt-4">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th scope="col">ID</th>
                                        <th scope="col">Name</th>
                                        <th scope="col">Slug</th>
                                        <th scope="col">Posts Count</th>
                                        <th scope="col" style={{ width: '150px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tags.map((tag: Tag & { blogs_count?: number }) => (
                                        <tr key={tag.id}>
                                            <td><span className="fw-medium">#{tag.id}</span></td>
                                            <td>{tag.name}</td>
                                            <td><span className="badge badge-soft-info">{tag.slug}</span></td>
                                            <td>{tag.blogs_count || 0}</td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <button type="button" className="btn btn-sm btn-soft-info" onClick={() => handleOpenModal(tag)}>
                                                        <i className="ri-edit-line"></i>
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-soft-danger" onClick={() => askDelete(tag)}>
                                                        <i className="ri-delete-bin-line"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {tags.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center p-4 text-muted">
                                                <i className="ri-price-tag-3-line fs-1 d-block mb-2 text-muted"></i>
                                                No tags found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog 
                header={editingTag ? 'Edit Tag' : 'Add Tag'} 
                visible={showModal} 
                style={{ width: '30vw' }} 
                onHide={() => setShowModal(false)}
            >
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Name <span className="text-danger">*</span></label>
                        <input 
                            type="text" 
                            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                            value={formData.name} 
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setFormData({ ...formData, name: e.target.value });
                                if (errors.name) setErrors({ ...errors, name: '' });
                            }}
                        />
                        {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                    </div>
                    <div className="mb-4">
                        <label className="form-label">Slug</label>
                        <input 
                            type="text" 
                            className={`form-control ${errors.slug ? 'is-invalid' : ''}`}
                            value={formData.slug} 
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setFormData({ ...formData, slug: e.target.value });
                                if (errors.slug) setErrors({ ...errors, slug: '' });
                            }}
                            placeholder="auto-generated if empty"
                        />
                        {errors.slug && <div className="invalid-feedback">{errors.slug}</div>}
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingTag ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </Dialog>

            <DeleteConfirmationModal
                show={toDelete !== null}
                onClose={() => setToDelete(null)}
                onConfirm={confirmDelete}
                loading={deleteMutation.isPending}
                title="Delete Tag?"
                text={toDelete ? `This will permanently remove the tag "${toDelete.name}".` : undefined}
            />

            <TaxonomyDeleteBlockedModal kind="Tag" blocked={blocked} onClose={() => setBlocked(null)} />
        </div>
    );
}
