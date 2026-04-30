import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategories } from '../../modules/cms/queries';
import { Dialog } from 'primereact/dialog';
import { toast } from 'react-toastify';
import TableLoader from "../../components/Loader/TableLoader";
import { Category } from '../../modules/cms/types';
import { Link } from 'react-router-dom';

interface CategoryFormData {
    name: string;
    slug: string;
}

export default function BlogCategories() {
    const { data: categoriesData, isLoading } = useCategories();
    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();
    const deleteMutation = useDeleteCategories();

    const [showModal, setShowModal] = useState<boolean>(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState<CategoryFormData>({ name: '', slug: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleOpenModal = (cat: Category | null = null) => {
        if (cat) {
            setEditingCategory(cat);
            setFormData({ name: cat.name, slug: cat.slug || '' });
        } else {
            setEditingCategory(null);
            setFormData({ name: '', slug: '' });
        }
        setErrors({});
        setShowModal(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await updateMutation.mutateAsync({ id: editingCategory.id, data: formData });
                toast.success("Category updated successfully");
            } else {
                await createMutation.mutateAsync(formData);
                toast.success("Category created successfully");
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
        if (window.confirm("Are you sure you want to delete this category?")) {
            try {
                await deleteMutation.mutateAsync([id]);
                toast.success("Category deleted successfully");
            } catch (error) {
                toast.error("Failed to delete category");
            }
        }
    };

    if (isLoading) return <TableLoader />;

    const categories = categoriesData?.data || [];

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Sticky Header */}
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Blog Categories</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/cms/blogs">Blogs</Link></li>
                                        <li className="breadcrumb-item active">Categories</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                                    <i className="ri-add-line me-1 align-bottom"></i> Add Category
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

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
                                    {categories.map((cat: Category & { blogs_count?: number }) => (
                                        <tr key={cat.id}>
                                            <td><span className="fw-medium">#{cat.id}</span></td>
                                            <td>{cat.name}</td>
                                            <td><span className="badge badge-soft-info">{cat.slug}</span></td>
                                            <td>{cat.blogs_count || 0}</td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <button type="button" className="btn btn-sm btn-soft-info" onClick={() => handleOpenModal(cat)}>
                                                        <i className="ri-edit-line"></i>
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-soft-danger" onClick={() => handleDelete(cat.id)}>
                                                        <i className="ri-delete-bin-line"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {categories.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center p-4 text-muted">
                                                <i className="ri-price-tag-3-line fs-1 d-block mb-2 text-muted"></i>
                                                No categories found
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
                header={editingCategory ? 'Edit Category' : 'Add Category'} 
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
                            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
}
