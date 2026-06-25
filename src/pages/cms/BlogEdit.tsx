import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { cmsService } from '../../modules/cms/services';
import { useBlog, useSaveBlog, useCategories, useTags, useCreateCategory, useCreateTag } from '../../modules/cms/queries';
import { toast } from 'react-toastify';
import { BlogFormData, Blog } from '../../modules/cms/types';
import CmsFormLoader from '../../components/Loader/CmsFormLoader';
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';
import type { FileSystemItem } from '../../modules/filemanager/types';

import { CKEditor } from '@ckeditor/ckeditor5-react';
import { ClassicEditor } from 'ckeditor5';
import { editorConfig } from '../../config/ckeditorConfig';

import 'ckeditor5/ckeditor5.css';

const BASE_URL = import.meta.env.VITE_BASE_API_URL || '';
const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL?.replace(/\/$/, '') || '';

export default function BlogEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: blogData, isLoading: blogLoading } = useBlog(id);
    const saveBlogMutation = useSaveBlog();
    const { data: categoriesData, refetch: refetchCategories } = useCategories();
    const { data: tagsData, refetch: refetchTags } = useTags();
    const createCategoryMutation = useCreateCategory();
    const createTagMutation = useCreateTag();

    const [showCatModal, setShowCatModal] = useState<boolean>(false);
    const [showTagModal, setShowTagModal] = useState<boolean>(false);
    const [newCatName, setNewCatName] = useState<string>('');
    const [newTagName, setNewTagName] = useState<string>('');
    const [showSeoInputs, setShowSeoInputs] = useState<boolean>(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showFileManager, setShowFileManager] = useState<boolean>(false);
    const [featuredImage, setFeaturedImage] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [ogImage, setOgImage] = useState<string | null>(null);
    const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);
    const [activeFileTarget, setActiveFileTarget] = useState<'featured' | 'og'>('featured');

    const [formData, setFormData] = useState<BlogFormData>({
        title: '',
        slug: '',
        category_id: '',
        summary: '',
        content: '',
        is_published: true,
        is_featured: false,
        meta_title: '',
        meta_description: '',
        keywords: '',
        blog_tag_id: [],
    });

    useEffect(() => {
        if (blogData?.data) {
            const blog = blogData.data as Blog;
            setFormData({
                title: blog.title || '',
                slug: blog.slug || '',
                category_id: blog.category_id ? blog.category_id.toString() : '',
                summary: blog.summary || '',
                content: blog.content || '',
                is_published: !!blog.is_published,
                is_featured: !!blog.is_featured,
                meta_title: blog.meta_title || '',
                meta_description: blog.meta_description || '',
                keywords: blog.keywords || '',
                blog_tag_id: Array.isArray(blog.blog_tag_id) ? blog.blog_tag_id.map(id => id.toString()) : []
            });
            if (blog.featured_image) {
                setPreviewImage(blog.featured_image);
                // Extract relative path for file manager
                const relativePath = blog.featured_image.split('/storage/').pop() || '';
                setFeaturedImage(relativePath);
            }
            if (blog.og_image) {
                setOgImagePreview(blog.og_image);
                const relativePath = blog.og_image.split('/storage/').pop() || '';
                setOgImage(relativePath);
            }
        }
    }, [blogData]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            };

            if (name === 'title' && !id) {
                const slugValue = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                newData.slug = slugValue;
            }

            return newData;
        });
    };

    const handleFileSelect = (item: FileSystemItem) => {
        if (!item.isDirectory) {
            const url = item.url || `${BASE_URL}/storage/${item.path}`;
            if (activeFileTarget === 'featured') {
                setFeaturedImage(item.path);
                setPreviewImage(url);
            } else {
                setOgImage(item.path);
                setOgImagePreview(url);
            }
        }
        setShowFileManager(false);
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFeaturedImage(file);
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const handleCreateCategory = async (e: FormEvent) => {
        e.preventDefault();
        setErrors(prev => ({ ...prev, new_category: '' }));
        try {
            const res = await createCategoryMutation.mutateAsync({ name: newCatName });
            setFormData(prev => ({ ...prev, category_id: res.data.id }));
            setShowCatModal(false);
            setNewCatName('');
            refetchCategories();
            toast.success("Category added");
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(prev => ({ ...prev, new_category: error.response.data.errors.name?.[0] }));
            } else {
                toast.error("Failed to add category");
            }
        }
    };

    const handleCreateTag = async (e: FormEvent) => {
        e.preventDefault();
        setErrors(prev => ({ ...prev, new_tag: '' }));
        try {
            const res = await createTagMutation.mutateAsync({ name: newTagName });
            setFormData(prev => ({ ...prev, blog_tag_id: [...(prev.blog_tag_id || []), res.data.id] }));
            setShowTagModal(false);
            setNewTagName('');
            refetchTags();
            toast.success("Tag added");
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(prev => ({ ...prev, new_tag: error.response.data.errors.name?.[0] }));
            } else {
                toast.error("Failed to add tag");
            }
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrors({});
        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (key === 'blog_tag_id') {
                if (Array.isArray(value)) {
                    value.forEach(id => data.append('blog_tag_id[]', id.toString()));
                }
            } else {
                data.append(key, value.toString());
            }
        });

        if (featuredImage) {
            data.append('featured_image', featuredImage);
        }
        if (ogImage) {
            data.append('og_image', ogImage);
        }

        try {
            await saveBlogMutation.mutateAsync({ id, data });
            toast.success(id ? "Blog updated successfully" : "Blog created successfully");
            navigate('/cms/blogs');
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const backendErrors = error.response.data.errors;
                const mappedErrors: Record<string, string> = {};
                Object.keys(backendErrors).forEach(key => {
                    mappedErrors[key] = backendErrors[key][0];
                });
                setErrors(mappedErrors);
            } else {
                toast.error(error.response?.data?.message || "Failed to save blog");
            }
        }
    };

    return (
        <div className="page-content blog-edit-section">
            <div className="container-fluid">
                {/* Page Header - Sticky Subheader Pattern */}
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">{id ? (blogLoading ? 'Loading Blog...' : 'Edit Blog') : 'Create Blog'}</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item">CMS</li>
                                        <li className="breadcrumb-item"><Link to="/cms/blogs">Blogs</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">{id ? 'Edit' : 'Create'}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/cms/blogs" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                <button
                                    type="submit"
                                    form="blog-form"
                                    className="btn btn-primary w-lg waves-effect"
                                    disabled={saveBlogMutation.isPending || blogLoading}
                                >
                                    {saveBlogMutation.isPending ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>{id ? 'Update' : 'Publish'}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {id && blogLoading ? (
                    <CmsFormLoader showHeader={false} rowClassName="row mt-n3" />
                ) : (
                    <div className="row mt-n3">
                        {/* Left Column: Main Content & SEO */}
                        <div className="col-lg-8">
                            <form id="blog-form" onSubmit={handleSubmit}>
                                <div className="card mb-4 shadow-sm border-0">
                                    <div className="card-header bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                                        <div className="d-flex align-items-center">
                                            <div className="avatar-sm me-3">
                                                <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-20">
                                                    <i className="ri-file-text-line"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h5 className="card-title mb-1 fw-bold">Post Content</h5>
                                                <p className="text-muted mb-0 fs-13">Manage your blog post title, summary and main content</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="row">
                                            <div className="col-12 mb-3">
                                                <h5 className="text-primary fs-16 mb-1">General Information</h5>
                                                <hr className="mt-1" />
                                            </div>

                                            <div className="col-lg-12">
                                                <div className="mb-3">
                                                    <label className="form-label">Post Title <span className="text-danger">*</span></label>
                                                    <input
                                                        type="text"
                                                        name="title"
                                                        className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                                                        value={formData.title}
                                                        onChange={handleChange}
                                                        placeholder="Enter post title"
                                                    />
                                                    {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                                                </div>
                                            </div>



                                            <div className="col-lg-12">
                                                <div className="mb-4">
                                                    <label className="form-label">Summary / Excerpt</label>
                                                    <textarea
                                                        name="summary"
                                                        className={`form-control ${errors.summary ? 'is-invalid' : ''}`}
                                                        rows={3}
                                                        value={formData.summary}
                                                        onChange={handleChange}
                                                        placeholder="Write a brief summary for the blog listing page..."
                                                    ></textarea>
                                                    {errors.summary && <div className="invalid-feedback">{errors.summary}</div>}
                                                </div>
                                            </div>

                                            <div className="col-lg-12">
                                                <div className="mb-3">
                                                    <label className="form-label">Main Content <span className="text-danger">*</span></label>
                                                    {errors.content && (
                                                        <style>{`
                                                        .ckeditor-error-wrapper .ck.ck-toolbar,
                                                        .ckeditor-error-wrapper .ck.ck-editor__main > .ck-editor__editable {
                                                            border-color: #f06548 !important;
                                                        }
                                                    `}</style>
                                                    )}
                                                    <style>{`
                                                        .ck-powered-by-balloon, .ck-powered-by {
                                                            display: none !important;
                                                        }
                                                    `}</style>
                                                    <div className={errors.content ? 'ckeditor-error-wrapper' : ''}>
                                                        <CKEditor
                                                            editor={ClassicEditor}
                                                            data={formData.content || ''}
                                                            onChange={(event, editor) => {
                                                                const data = editor.getData();
                                                                setFormData(prev => ({ ...prev, content: data }));
                                                            }}
                                                            config={editorConfig}
                                                        />
                                                    </div>
                                                    {errors.content && <div className="invalid-feedback d-block">{errors.content}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card mb-4 shadow-sm border-0">
                                    <div className="card-header bg-transparent border-bottom-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center">
                                            <div className="avatar-sm me-3">
                                                <div className="avatar-title bg-info-subtle text-info rounded-circle fs-20">
                                                    <i className="ri-search-eye-line"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h5 className="card-title mb-1 fw-bold">Search Engine Optimize</h5>
                                                <p className="text-muted mb-0 fs-13">Improve your post visibility on search engines</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-soft-info btn-sm"
                                            onClick={() => setShowSeoInputs(!showSeoInputs)}
                                        >
                                            {showSeoInputs ? 'Close SEO meta' : 'Edit SEO meta'}
                                        </button>
                                    </div>
                                    <div className="card-body p-4">
                                        {/* SEO Preview */}
                                        <div className="seo-preview mb-4">
                                            <h4 className="mb-1" style={{ color: '#1a0dab', fontSize: '18px', fontWeight: 400 }}>
                                                {formData.meta_title || formData.title || 'SEO Title Preview'}
                                            </h4>
                                            <div className="mb-1" style={{ color: '#006621', fontSize: '14px' }}>
                                                {WEBSITE_URL}/blog/{formData.slug || 'post-url-slug'}
                                            </div>
                                            <div style={{ color: '#545454', fontSize: '14px' }}>
                                                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {formData.meta_description || formData.summary || 'Short description for search engines...'}
                                            </div>
                                        </div>

                                        {/* SEO Inputs */}
                                        {showSeoInputs && (
                                            <div className="row border-top pt-4">
                                                <div className="col-lg-12">
                                                    <div className="mb-4">
                                                        <label className="form-label d-flex justify-content-between align-items-center">
                                                            <span>SEO Title</span>
                                                            <span className="text-muted fs-12">({(formData.meta_title || '').length}/70)</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="meta_title"
                                                            className={`form-control ${errors.meta_title ? 'is-invalid' : ''}`}
                                                            value={formData.meta_title}
                                                            onChange={handleChange}
                                                            placeholder="SEO optimized title"
                                                            maxLength={70}
                                                        />
                                                        <div className="text-muted fs-12 mt-1">Optimal length: 50-60 characters. This appears as the clickable headline in search results.</div>
                                                        {errors.meta_title && <div className="invalid-feedback d-block">{errors.meta_title}</div>}
                                                    </div>
                                                </div>

                                                <div className="col-lg-12">
                                                    <div className="mb-4">
                                                        <label className="form-label d-flex justify-content-between align-items-center">
                                                            <span>SEO description</span>
                                                            <span className="text-muted fs-12">({(formData.meta_description || '').length}/160)</span>
                                                        </label>
                                                        <textarea
                                                            name="meta_description"
                                                            className={`form-control ${errors.meta_description ? 'is-invalid' : ''}`}
                                                            rows={3}
                                                            value={formData.meta_description}
                                                            onChange={handleChange}
                                                            placeholder="Short description for search engines..."
                                                            maxLength={160}
                                                        ></textarea>
                                                        <div className="text-muted fs-12 mt-1">Optimal length: 150-160 characters. This is the summary that appears under the title in search results.</div>
                                                        {errors.meta_description && <div className="invalid-feedback d-block">{errors.meta_description}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Right Column: Settings & Sidebars */}
                        <div className="col-lg-4">
                            {/* Publish Status Card */}
                            <div className="card mb-4 shadow-sm border-0">
                                <div className="card-header bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-sm me-3">
                                            <div className="avatar-title bg-success-subtle text-success rounded-circle fs-18">
                                                <i className="ri-rocket-line"></i>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="card-title mb-0 fw-bold">Publishing</h5>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body p-4">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label">Publish Status</label>
                                            <div className="form-check form-switch form-switch-md d-flex align-items-center justify-content-between p-3 bg-light rounded">
                                                <label className="form-check-label mb-0">
                                                    {formData.is_published ? <span className="text-success fw-medium">Published</span> : <span className="text-muted fw-medium">Draft</span>}
                                                </label>
                                                <input
                                                    className="form-check-input ms-0"
                                                    type="checkbox"
                                                    name="is_published"
                                                    id="isPublishedSwitch"
                                                    checked={formData.is_published}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label">Featured Post</label>
                                            <div className="form-check form-switch form-switch-md d-flex align-items-center justify-content-between p-3 bg-light rounded">
                                                <label className="form-check-label mb-0">
                                                    {formData.is_featured ? <span className="text-warning fw-medium">Featured</span> : <span className="text-muted fw-medium">Regular</span>}
                                                </label>
                                                <input
                                                    className="form-check-input ms-0"
                                                    type="checkbox"
                                                    name="is_featured"
                                                    id="isFeaturedSwitch"
                                                    checked={formData.is_featured}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Classification Card */}
                            <div className="card mb-4 shadow-sm border-0">
                                <div className="card-header bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-sm me-3">
                                            <div className="avatar-title bg-warning-subtle text-warning rounded-circle fs-18">
                                                <i className="ri-folders-line"></i>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="card-title mb-0 fw-bold">Classification</h5>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body p-4">
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <label className="form-label mb-0">Category</label>
                                            <button type="button" className="btn btn-link btn-sm p-0 text-primary" onClick={() => setShowCatModal(true)}>
                                                <i className="ri-add-line"></i> Add New
                                            </button>
                                        </div>
                                        <Dropdown
                                            value={formData.category_id}
                                            options={categoriesData?.data?.map((c: any) => ({ label: c.name, value: c.id.toString() })) || []}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.value })}
                                            placeholder="Select Category"
                                            className={`w-100 ${errors.category_id ? 'p-invalid' : ''}`}
                                            filter
                                            showClear
                                        />
                                        {errors.category_id && <div className="text-danger fs-12 mt-1">{errors.category_id}</div>}
                                    </div>

                                    <div className="mb-0">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <label className="form-label mb-0">Tags</label>
                                            <button type="button" className="btn btn-link btn-sm p-0 text-primary" onClick={() => setShowTagModal(true)}>
                                                <i className="ri-add-line"></i> Add New
                                            </button>
                                        </div>
                                        <MultiSelect
                                            value={formData.blog_tag_id}
                                            options={tagsData?.data?.map((t: any) => ({ label: t.name, value: t.id.toString() })) || []}
                                            onChange={(e) => setFormData({ ...formData, blog_tag_id: e.value })}
                                            placeholder="Select Tags"
                                            className={`w-100 ${errors.blog_tag_id ? 'p-invalid' : ''}`}
                                            filter
                                            display="chip"
                                            maxSelectedLabels={20}
                                        />
                                        {errors.blog_tag_id && <div className="text-danger fs-12 mt-1">{errors.blog_tag_id}</div>}
                                    </div>
                                </div>
                            </div>

                            {/* Featured Image Card */}
                            <div className="card shadow-none mb-4">
                                <div className="card-header border-bottom-dashed py-2">
                                    <h6 className="card-title mb-0 fs-13">
                                        <i className="ri-image-line align-middle text-primary me-1"></i> Featured Image
                                    </h6>
                                </div>
                                <div className="card-body p-2">
                                    <div className="text-center">
                                        <div
                                            className="position-relative d-inline-block cursor-pointer w-100"
                                            onClick={() => {
                                                setActiveFileTarget('featured');
                                                setShowFileManager(true);
                                            }}
                                            title="Recommended: 1200x630px • Max 2MB"
                                        >
                                            <div className="bg-light rounded d-flex flex-column align-items-center justify-content-center p-3" style={{ minHeight: '150px', border: errors.featured_image ? '2px solid #dc3545' : '1px solid #e9ebec' }}>
                                                {previewImage ? (
                                                    <img
                                                        src={previewImage}
                                                        alt="Featured Preview"
                                                        className="img-fluid rounded object-fit-contain"
                                                        style={{ maxHeight: '130px' }}
                                                        onError={(e: any) => { e.target.src = '/images/blog/placeholder.png'; }}
                                                    />
                                                ) : (
                                                    <div className="text-center">
                                                        <div className="avatar-sm mx-auto mb-2">
                                                            <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-20">
                                                                <i className="ri-image-add-line"></i>
                                                            </div>
                                                        </div>
                                                        <p className="text-muted fs-11 mb-0">Select Featured Image</p>
                                                    </div>
                                                )}
                                            </div>
                                            {previewImage && (
                                                <div className="position-absolute bottom-0 end-0 mb-2 me-2">
                                                    <span className="btn btn-sm btn-primary rounded-circle shadow p-1 lh-1 text-white" style={{ width: '26px', height: '26px' }}>
                                                        <i className="ri-pencil-fill fs-12"></i>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {errors.featured_image && <div className="text-danger fs-11 mt-1">{errors.featured_image}</div>}
                                        <p className="text-muted mt-2 fs-11 mb-0">Recommended: 1200x630px. Max: 2MB.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Add Category Modal */}
            <Dialog
                header="Add New Category"
                visible={showCatModal}
                style={{ width: '30vw' }}
                onHide={() => setShowCatModal(false)}
            >
                <div className="p-fluid">
                    <div className="field">
                        <label htmlFor="catName">Category Name</label>
                        <input
                            type="text"
                            id="catName"
                            className={`form-control ${errors.new_category ? 'is-invalid' : ''}`}
                            value={newCatName}
                            onChange={(e) => {
                                setNewCatName(e.target.value);
                                if (errors.new_category) setErrors(prev => ({ ...prev, new_category: '' }));
                            }}
                            placeholder="Enter category name"
                            autoFocus
                        />
                        {errors.new_category && <div className="invalid-feedback">{errors.new_category}</div>}
                    </div>
                    <div className="d-flex justify-content-end mt-3 gap-2">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowCatModal(false)}
                            disabled={createCategoryMutation.isPending}
                        >
                            <i className="ri-close-line me-1 align-bottom"></i> Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleCreateCategory}
                            disabled={createCategoryMutation.isPending}
                        >
                            {createCategoryMutation.isPending ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <i className="ri-save-3-fill me-1 align-bottom"></i> Submit
                                </>
                            )}
                        </button>
                    </div>

                    {/* Category List */}
                    {categoriesData?.data?.length > 0 && (
                        <>
                            <hr className="my-4" />
                            <div className="field">
                                <label className="mb-3">Existing Categories</label>
                                <div className="d-flex flex-wrap gap-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {categoriesData.data.map((cat: any) => (
                                        <span
                                            key={cat.id}
                                            className="badge bg-light text-dark border d-inline-flex align-items-center"
                                            style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                                        >
                                            {cat.name}
                                            <button
                                                type="button"
                                                className="btn-close btn-close-sm ms-2"
                                                onClick={async () => {
                                                    if (window.confirm(`Delete category "${cat.name}"?`)) {
                                                        try {
                                                            await cmsService.deleteCategories([cat.id]);
                                                            refetchCategories();
                                                            toast.success("Category deleted");
                                                        } catch (e) { toast.error("Failed to delete category"); }
                                                    }
                                                }}
                                                aria-label="Delete"
                                                style={{ fontSize: '0.65rem', opacity: 0.5 }}
                                            ></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Dialog>

            {/* Quick Add Tag Modal */}
            <Dialog
                header="Add New Tag"
                visible={showTagModal}
                style={{ width: '30vw' }}
                onHide={() => setShowTagModal(false)}
            >
                <div className="p-fluid">
                    <div className="field">
                        <label htmlFor="tagName">Tag Name</label>
                        <input
                            type="text"
                            id="tagName"
                            className={`form-control ${errors.new_tag ? 'is-invalid' : ''}`}
                            value={newTagName}
                            onChange={(e) => {
                                setNewTagName(e.target.value);
                                if (errors.new_tag) setErrors(prev => ({ ...prev, new_tag: '' }));
                            }}
                            placeholder="Enter tag name"
                            autoFocus
                        />
                        {errors.new_tag && <div className="invalid-feedback">{errors.new_tag}</div>}
                    </div>
                    <div className="d-flex justify-content-end mt-3 gap-2">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowTagModal(false)}
                            disabled={createTagMutation.isPending}
                        >
                            <i className="ri-close-line me-1 align-bottom"></i> Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleCreateTag}
                            disabled={createTagMutation.isPending}
                        >
                            {createTagMutation.isPending ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <i className="ri-save-3-fill me-1 align-bottom"></i> Submit
                                </>
                            )}
                        </button>
                    </div>

                    {/* Tag List */}
                    {tagsData?.data?.length > 0 && (
                        <>
                            <hr className="my-4" />
                            <div className="field">
                                <label className="mb-3">Existing Tags</label>
                                <div className="d-flex flex-wrap gap-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {tagsData.data.map((tag: any) => (
                                        <span
                                            key={tag.id}
                                            className="badge bg-light text-dark border d-inline-flex align-items-center"
                                            style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                                        >
                                            {tag.name}
                                            <button
                                                type="button"
                                                className="btn-close btn-close-sm ms-2"
                                                onClick={async () => {
                                                    if (window.confirm(`Delete tag "${tag.name}"?`)) {
                                                        try {
                                                            await cmsService.deleteTags([tag.id]);
                                                            refetchTags();
                                                            toast.success("Tag deleted");
                                                        } catch (e) { toast.error("Failed to delete tag"); }
                                                    }
                                                }}
                                                aria-label="Delete"
                                                style={{ fontSize: '0.65rem', opacity: 0.5 }}
                                            ></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Dialog>
            <FileManagerModal
                isOpen={showFileManager}
                toggle={() => setShowFileManager(false)}
                onSelectFiles={(files) => handleFileSelect(files[0])}
                selectionMode={true}
                entityType="blogs"
                entityId={id ? Number(id) : 0}
                getAll={true}
            />
            <style>{`
                /* MultiSelect Chip wrapping styles */
                .p-multiselect.p-multiselect-chip .p-multiselect-token {
                    margin-right: 0.25rem;
                    margin-bottom: 0.25rem;
                }
                .p-multiselect.p-multiselect-chip .p-multiselect-label {
                    display: flex;
                    flex-wrap: wrap;
                    padding: 0.25rem 0.5rem;
                }
                .p-multiselect {
                    height: auto !important;
                    min-height: 40px;
                }
                .p-multiselect-label-container {
                    overflow: visible;
                }
            `}</style>
        </div>
    );
}
