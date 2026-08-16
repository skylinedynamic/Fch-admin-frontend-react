import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useTags, useCreateTag, useUpdateTag, useDeleteTags } from '../../modules/cms/queries';
import PageHeader from '../common/PageHeader';
import { Dialog } from 'primereact/dialog';
import { toast } from 'react-toastify';
import TableLoader from "../../components/Loader/TableLoader";
import { Tag } from '../../modules/cms/types';
import { Link } from 'react-router-dom';

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

    const handleDelete = async (id: number) => {
        if (window.confirm("Are you sure you want to delete this tag?")) {
            try {
                await deleteMutation.mutateAsync([id]);
                toast.success("Tag deleted successfully");
            } catch (error) {
                toast.error("Failed to delete tag");
            }
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
                                                    <button type="button" className="btn btn-sm btn-soft-danger" onClick={() => handleDelete(tag.id)}>
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
        </div>
    );
}
