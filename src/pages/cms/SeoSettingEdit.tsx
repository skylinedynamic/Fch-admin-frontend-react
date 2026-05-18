import React, { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBlogs, useSaveSeoSetting, useSeoSettings } from '../../modules/cms/queries';
import { toast } from 'react-toastify';
import CmsFormLoader from '../../components/Loader/CmsFormLoader';
import { Dropdown } from 'primereact/dropdown';
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';
import type { FileSystemItem } from '../../modules/filemanager/types';
import { WEBSITE_PAGES } from '../../config/websitePages';

const BASE_URL = import.meta.env.VITE_BASE_API_URL || '';
const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL?.replace(/\/$/, '') || '';

interface SeoFormData {
    page_name: string;
    path: string;
    meta_title: string;
    meta_description: string;
    keywords: string;
}

export default function SeoSettingEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const saveMutation = useSaveSeoSetting();
    const { data: seoData, isLoading, isFetching } = useSeoSettings();
    const { data: blogsData } = useBlogs({ per_page: 100 }); // Fetch blogs for the dropdown

    const [formData, setFormData] = useState<SeoFormData>({
        page_name: '',
        path: '',
        meta_title: '',
        meta_description: '',
        keywords: '',
    });

    // Combine static pages with dynamic blog posts
    const pageOptions = useMemo(() => {
        const blogOptions = (blogsData?.data?.data || []).map((blog: any) => ({
            label: `Blog: ${blog.title} — /blog/${blog.slug}`,
            value: `Blog: ${blog.title}`,
            path: `/blog/${blog.slug}`
        }));
        return [...WEBSITE_PAGES, ...blogOptions];
    }, [blogsData]);
    const [ogImage, setOgImage] = useState<string | null>(null);
    const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showFileManager, setShowFileManager] = useState<boolean>(false);
    const [showSeoInputs, setShowSeoInputs] = useState<boolean>(true);

    // Populate form when editing or when page selection changes in create mode
    useEffect(() => {
        if (id && seoData?.data) {
            const setting = seoData.data.find((s: any) => String(s.id) === id);
            if (setting) {
                setFormData({
                    page_name: setting.page_name || '',
                    path: setting.path || '',
                    meta_title: setting.meta_title || '',
                    meta_description: setting.meta_description || '',
                    keywords: setting.keywords || '',
                    entity_type: setting.entity_type || 'page',
                    entity_id: setting.entity_id || 0
                });
                if (setting.og_image) {
                    setOgImagePreview(setting.og_image);
                    const relativePath = setting.og_image.split('/storage/').pop() || '';
                    setOgImage(relativePath);
                }
            }
        }
    }, [id, seoData]);

    const handlePageChange = (value: string) => {
        const selected = pageOptions.find(p => p.value === value);

        // Check if this page already has SEO settings in our data
        const existing = seoData?.data?.find((s: any) => s.page_name === value);

        if (existing && String(existing.id) !== id) {
            // If exists and it's not the current record we are editing
            toast.info(`Switching to existing SEO settings for ${value}`);
            setFormData({
                page_name: existing.page_name || '',
                path: existing.path || '',
                meta_title: existing.meta_title || '',
                meta_description: existing.meta_description || '',
                keywords: existing.keywords || '',
            });
            if (existing.og_image) {
                setOgImagePreview(existing.og_image);
                const relativePath = existing.og_image.split('/storage/').pop() || '';
                setOgImage(relativePath);
            } else {
                setOgImage(null);
                setOgImagePreview(null);
            }
            // Navigate to edit mode for this record
            navigate(`/cms/seo-settings/edit/${existing.id}`, { replace: true });
            return;
        }

        // If it's a fresh selection (no existing record or it's the current one)
        setFormData(prev => ({
            ...prev,
            page_name: value,
            path: selected?.path || '',
            // Suggest default SEO title and description
            meta_title: `${value} | Four Corner Funding`,
            meta_description: `Learn more about ${value} at Four Corner Funding. We provide expert business funding and credit building solutions.`
        }));

        // Reset image for fresh selection
        setOgImage(null);
        setOgImagePreview(null);

        if (errors.page_name) setErrors(prev => ({ ...prev, page_name: '' }));
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleFileSelect = (item: FileSystemItem) => {
        if (!item.isDirectory) {
            setOgImage(item.path);
            setOgImagePreview(item.url || `${BASE_URL}/storage/${item.path}`);
            if (errors.og_image) setErrors(prev => ({ ...prev, og_image: '' }));
        }
        setShowFileManager(false);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrors({});

        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            data.append(key, String(value));
        });

        if (ogImage) {
            data.append('og_image', ogImage);
        }

        try {
            await saveMutation.mutateAsync({ id: id ? Number(id) : undefined, data });
            toast.success(id ? 'SEO settings updated successfully' : 'SEO settings created successfully');
            navigate('/cms/seo-settings');
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const backendErrors = error.response.data.errors;
                const mappedErrors: Record<string, string> = {};
                Object.keys(backendErrors).forEach(key => {
                    mappedErrors[key] = backendErrors[key][0];
                });
                setErrors(mappedErrors);
            } else {
                toast.error(error.response?.data?.message || 'Failed to save SEO settings');
            }
        }
    };

    // Remove early return to keep breadcrumb visible during loading
    // if (id && isLoading) return <ResourceFormLoader />;

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Page Header */}
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">{id ? (isLoading || isFetching ? 'Loading SEO...' : 'Edit SEO Settings') : 'Add SEO Settings'}</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item">CMS</li>
                                        <li className="breadcrumb-item"><Link to="/cms/seo-settings">SEO Settings</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">{id ? 'Edit' : 'Create'}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/cms/seo-settings" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                <button
                                    type="submit"
                                    form="seo-form"
                                    className="btn btn-primary w-lg waves-effect"
                                    disabled={saveMutation.isPending || isLoading || isFetching}
                                >
                                    {saveMutation.isPending ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-save-3-line align-middle me-1"></i> Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {id && (isLoading || isFetching) ? (
                    <CmsFormLoader showHeader={false} />
                ) : (
                    <div className="row mt-4">
                        {/* Left Column: Main Configuration */}
                        <div className="col-lg-8">
                            <form id="seo-form" onSubmit={handleSubmit}>
                                {/* Page Selection */}
                                <div className="card">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0">Page Configuration</h5>
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="mb-3">
                                            <label className="form-label">Page <span className="text-danger">*</span></label>
                                            <Dropdown
                                                value={formData.page_name}
                                                options={pageOptions}
                                                onChange={(e) => handlePageChange(e.value)}
                                                placeholder="Select a page..."
                                                className={`w-100 ${errors.page_name ? 'p-invalid' : ''}`}
                                                filter
                                            />
                                            {/* {id && <div className="form-text text-muted">Page cannot be changed when editing.</div>} */}
                                            {errors.page_name && <div className="text-danger fs-12 mt-1">{errors.page_name}</div>}
                                            {formData.path && (
                                                <div className="mt-2">
                                                    <span className="badge bg-light text-dark border fs-12">
                                                        <i className="ri-link me-1"></i>{formData.path}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* SEO Metadata Card - Mirroring Blogs SEO */}
                                <div className="card">
                                    <div className="card-header d-flex justify-content-between align-items-center">
                                        <h5 className="card-title mb-0">Search Engine Optimize</h5>
                                        <button
                                            type="button"
                                            className="btn btn-link btn-sm p-0 text-decoration-none"
                                            onClick={() => setShowSeoInputs(!showSeoInputs)}
                                        >
                                            Edit SEO meta
                                        </button>
                                    </div>
                                    <div className="card-body p-4">
                                        {/* SEO Preview */}
                                        <div className="seo-preview mb-4 d-flex gap-3 align-items-start">
                                            <div className="flex-grow-1">
                                                <h4 className="mb-1" style={{ color: '#1a0dab', fontSize: '18px', fontWeight: 400 }}>
                                                    {formData.meta_title || formData.page_name || 'SEO Title Preview'}
                                                </h4>
                                                <div className="mb-1" style={{ color: '#006621', fontSize: '14px' }}>
                                                    {WEBSITE_URL}{formData.path || '/page-path'}
                                                </div>
                                                <div style={{ color: '#545454', fontSize: '14px' }}>
                                                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {formData.meta_description || 'Short description for search engines will appear here...'}
                                                </div>
                                            </div>
                                            {/* {ogImagePreview && (
                                            <div className="seo-preview-image" style={{ width: '104px', height: '104px', flexShrink: 0 }}>
                                                <img 
                                                    src={ogImagePreview} 
                                                    alt="OG Preview" 
                                                    className="img-thumbnail w-100 h-100 object-fit-cover" 
                                                    onError={(e: any) => { e.target.style.display = 'none'; }}
                                                />
                                            </div>
                                        )} */}
                                        </div>

                                        {/* SEO Inputs - Toggleable */}
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
                                                        <div className="text-muted fs-12 mt-1">Optimal length: 120-160 characters. This appears below the title in search results and should entice users to click.</div>
                                                        {errors.meta_description && <div className="invalid-feedback d-block">{errors.meta_description}</div>}
                                                    </div>
                                                </div>

                                                <div className="col-lg-12">
                                                    <div className="mb-0">
                                                        <label className="form-label">Keywords</label>
                                                        <input
                                                            type="text"
                                                            name="keywords"
                                                            className="form-control"
                                                            value={formData.keywords}
                                                            onChange={handleChange}
                                                            placeholder="keyword1, keyword2, keyword3"
                                                        />
                                                        <div className="text-muted fs-12 mt-1">Separate keywords with commas.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Right Column */}
                        <div className="col-lg-4">
                            {/* Social Sharing Image (OG Image) */}
                            <div className="card border shadow-none mb-4">
                                <div className="card-header border-bottom-dashed py-2">
                                    <h6 className="card-title mb-0 fs-13">
                                        <i className="ri-image-line align-middle text-info me-1"></i> Social Sharing Image (OG)
                                    </h6>
                                </div>
                                <div className="card-body p-2">
                                    <div className="text-center">
                                        <div
                                            className="position-relative d-inline-block cursor-pointer w-100"
                                            onClick={() => setShowFileManager(true)}
                                            title="Recommended: 1200x630px • Max 2MB"
                                        >
                                            <div className="bg-light rounded d-flex flex-column align-items-center justify-content-center p-3" style={{ minHeight: '150px', border: errors.og_image ? '2px solid #dc3545' : '1px solid #e9ebec' }}>
                                                {ogImagePreview ? (
                                                    <img
                                                        src={ogImagePreview}
                                                        alt="OG Preview"
                                                        className="img-fluid rounded object-fit-contain"
                                                        style={{ maxHeight: '130px' }}
                                                        onError={(e: any) => { e.target.src = '/images/blog/placeholder.png'; }}
                                                    />
                                                ) : (
                                                    <div className="text-center">
                                                        <div className="avatar-sm mx-auto mb-2">
                                                            <div className="avatar-title bg-info-subtle text-info rounded-circle fs-20">
                                                                <i className="ri-image-add-line"></i>
                                                            </div>
                                                        </div>
                                                        <p className="text-muted fs-11 mb-0">Select OG Image</p>
                                                    </div>
                                                )}
                                            </div>
                                            {ogImagePreview && (
                                                <div className="position-absolute bottom-0 end-0 mb-2 me-2">
                                                    <span className="btn btn-sm btn-info rounded-circle shadow p-1 lh-1 text-white" style={{ width: '26px', height: '26px' }}>
                                                        <i className="ri-pencil-fill fs-12"></i>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {errors.og_image && <div className="text-danger fs-11 mt-1">{errors.og_image}</div>}
                                        <p className="text-muted mt-2 fs-11 mb-0">Recommended: 1200x630px. Appears on social media.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <FileManagerModal
                isOpen={showFileManager}
                toggle={() => setShowFileManager(false)}
                onSelectFiles={(files) => handleFileSelect(files[0])}
                selectionMode={true}
                entityType="seo-settings"
                entityId={id ? Number(id) : 0}
                getAll={true}
            />
        </div>
    );
}

