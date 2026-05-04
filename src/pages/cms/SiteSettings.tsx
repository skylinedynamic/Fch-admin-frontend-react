import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { formatPhoneNumber } from '../../utils/formatters';
import { useSiteSettings, useUpdateSiteSettings } from '../../modules/cms/queries';
import { SiteSettingsData, SocialLink, SOCIAL_PLATFORMS } from '../../modules/cms/types';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import FormLoader from '../../components/Loader/FormLoader';
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';
import type { FileSystemItem } from '../../modules/filemanager/types';
import { Dropdown } from 'primereact/dropdown';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import { usePermissions } from '../../lib/auth/usePermissions';
const BASE_URL = import.meta.env.VITE_BASE_URL || '';

export default function SiteSettings() {
    const { hasPermission } = usePermissions();
    const { data: settingsData, isLoading } = useSiteSettings();
    const updateMutation = useUpdateSiteSettings();

    const [formData, setFormData] = useState<SiteSettingsData>({} as SiteSettingsData);
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    const [headerLogo, setHeaderLogo] = useState<File | string | null>(null);
    const [previewHeaderLogo, setPreviewHeaderLogo] = useState<string | null>(null);
    const [footerLogo, setFooterLogo] = useState<File | string | null>(null);
    const [previewFooterLogo, setPreviewFooterLogo] = useState<string | null>(null);
    const [partnerLogo, setPartnerLogo] = useState<File | string | null>(null);
    const [previewPartnerLogo, setPreviewPartnerLogo] = useState<string | null>(null);
    const [favicon, setFavicon] = useState<File | string | null>(null);
    const [previewFavicon, setPreviewFavicon] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, any>>({});
    const [showFileManager, setShowFileManager] = useState<'header' | 'footer' | 'partner' | 'favicon' | false>(false);

    useEffect(() => {
        if (settingsData?.data) {
            const s = settingsData.data;
            
            // Accurately merge all dynamic keys from the database into the form state
            setFormData(prev => ({
                ...prev,
                ...s
            }));

            if (s.social_links) {
                try {
                    setSocialLinks(Array.isArray(s.social_links) ? s.social_links : JSON.parse(s.social_links));
                } catch (e) {
                    setSocialLinks([]);
                }
            } else {
                setSocialLinks([]);
            }

            if (s.header_logo) {
                const logoPath = s.header_logo.replace(/^\//, '');
                const logoUrl = s.header_logo.startsWith('http') ? s.header_logo : `${BASE_URL}/storage/${logoPath}`;
                setPreviewHeaderLogo(logoUrl);
                setHeaderLogo(s.header_logo.replace(`${BASE_URL}/storage/`, ''));
            }

            if (s.footer_logo) {
                const logoPath = s.footer_logo.replace(/^\//, '');
                const logoUrl = s.footer_logo.startsWith('http') ? s.footer_logo : `${BASE_URL}/storage/${logoPath}`;
                setPreviewFooterLogo(logoUrl);
                setFooterLogo(s.footer_logo.replace(`${BASE_URL}/storage/`, ''));
            }

            if (s.partner_logo) {
                const logoPath = s.partner_logo.replace(/^\//, '');
                const logoUrl = s.partner_logo.startsWith('http') ? s.partner_logo : `${BASE_URL}/storage/${logoPath}`;
                setPreviewPartnerLogo(logoUrl);
                setPartnerLogo(s.partner_logo.replace(`${BASE_URL}/storage/`, ''));
            }

            if (s.favicon) {
                const favPath = s.favicon.replace(/^\//, '');
                const favUrl = s.favicon.startsWith('http') ? s.favicon : `${BASE_URL}/storage/${favPath}`;
                setPreviewFavicon(favUrl);
                setFavicon(s.favicon.replace(`${BASE_URL}/storage/`, ''));
            }
        }
    }, [settingsData]);

    const handleLogoSelect = (files: FileSystemItem[]) => {
        if (files.length > 0) {
            const file = files[0];

            // Validate if selected file is an image
            const allowedExtensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
            const extension = file.name.split('.').pop()?.toLowerCase();

            if (extension && !allowedExtensions.includes(extension) && !(showFileManager === 'favicon' && extension === 'ico')) {
                const message = showFileManager === 'favicon'
                    ? 'Please select a valid image file (PNG, JPG, SVG, WebP)'
                    : 'Please select a valid image file (PNG, JPG, SVG, or WebP)';

                if (showFileManager === 'header') {
                    setValidationErrors({ ...validationErrors, header_logo: message });
                } else if (showFileManager === 'footer') {
                    setValidationErrors({ ...validationErrors, footer_logo: message });
                } else if (showFileManager === 'partner') {
                    setValidationErrors({ ...validationErrors, partner_logo: message });
                } else if (showFileManager === 'favicon') {
                    setValidationErrors({ ...validationErrors, favicon: message });
                }
                return;
            }

            // File size validation (2MB for logos, 1MB for favicon)
            const maxSize = showFileManager === 'favicon' ? 1024 * 1024 : 2 * 1024 * 1024;
            if (file.size > maxSize) {
                const limit = showFileManager === 'favicon' ? '1MB' : '2MB';
                const message = `The selected file is too large. Maximum size allowed is ${limit}.`;

                if (showFileManager === 'header') {
                    setValidationErrors({ ...validationErrors, header_logo: message });
                } else if (showFileManager === 'footer') {
                    setValidationErrors({ ...validationErrors, footer_logo: message });
                } else if (showFileManager === 'partner') {
                    setValidationErrors({ ...validationErrors, partner_logo: message });
                } else if (showFileManager === 'favicon') {
                    setValidationErrors({ ...validationErrors, favicon: message });
                }
                return;
            }

            if (showFileManager === 'header') {
                setValidationErrors({ ...validationErrors, header_logo: undefined });
                setHeaderLogo(file.path);
                setPreviewHeaderLogo(file.url || `${BASE_URL}/storage/${file.path}`);
            } else if (showFileManager === 'footer') {
                setValidationErrors({ ...validationErrors, footer_logo: undefined });
                setFooterLogo(file.path);
                setPreviewFooterLogo(file.url || `${BASE_URL}/storage/${file.path}`);
            } else if (showFileManager === 'partner') {
                setValidationErrors({ ...validationErrors, partner_logo: undefined });
                setPartnerLogo(file.path);
                setPreviewPartnerLogo(file.url || `${BASE_URL}/storage/${file.path}`);
            } else if (showFileManager === 'favicon') {
                setValidationErrors({ ...validationErrors, favicon: undefined });
                setFavicon(file.path);
                setPreviewFavicon(file.url || `${BASE_URL}/storage/${file.path}`);
            }
        }
        setShowFileManager(false);
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        // Automatic YouTube to Iframe conversion for map_iframe field
        if (name === 'map_iframe' && !value.includes('<iframe')) {
            let src = value.trim();

            // YouTube: build embed URL from video ID
            const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (ytMatch) src = `https://www.youtube.com/embed/${ytMatch[1]}`;

            // Google Maps: build embed URL
            else if (src.includes('google.com/maps') || src.includes('maps.app.goo.gl'))
                src = `https://maps.google.com/maps?q=${encodeURIComponent(src)}&output=embed`;

            // Wrap any valid URL in an iframe
            if (/^https?:\/\/.+/i.test(src)) {
                setFormData({ ...formData, [name]: `<iframe src="${src}" width="100%" height="450" style="border:0;" allowfullscreen loading="lazy"></iframe>` });
                return;
            }
        }

        if (name === 'phone_number') {
            setFormData({ ...formData, [name]: formatPhoneNumber(value) });
            return;
        }

        setFormData({ ...formData, [name]: value });
    };

    const handleAddSocialLink = () => {
        setSocialLinks([...socialLinks, { platform: '', icon: '', url: '', isCustom: false }]);
    };

    const handleRemoveSocialLink = (index: number) => {
        const newLinks = [...socialLinks];
        newLinks.splice(index, 1);
        setSocialLinks(newLinks);
    };

    const handleSocialLinkChange = (index: number, field: keyof SocialLink, value: string) => {
        const newLinks = [...socialLinks];
        newLinks[index][field] = value;
        setSocialLinks(newLinks);
    };

    const handlePlatformSelect = (index: number, value: string) => {
        const newLinks = [...socialLinks];
        if (value === 'Custom') {
            newLinks[index].platform = '';
            newLinks[index].icon = '';
            newLinks[index].isCustom = true;
        } else {
            const selected = SOCIAL_PLATFORMS.find(p => p.value === value);
            newLinks[index].platform = value;
            newLinks[index].icon = selected ? selected.icon : '';
            newLinks[index].isCustom = false;
        }
        setSocialLinks(newLinks);
    };

    const handleCustomPlatformBack = (index: number) => {
        const newLinks = [...socialLinks];
        newLinks[index].platform = '';
        newLinks[index].icon = '';
        newLinks[index].isCustom = false;
        setSocialLinks(newLinks);
    };


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => data.append(key, value));
        const linksToSave = socialLinks.map(({ isCustom: _ic, ...rest }) => rest);
        data.append('social_links', JSON.stringify(linksToSave));

        if (headerLogo) {
            data.append('header_logo', headerLogo);
        }

        if (footerLogo) {
            data.append('footer_logo', footerLogo);
        }

        if (partnerLogo) {
            data.append('partner_logo', partnerLogo);
        }

        if (favicon) {
            data.append('favicon', favicon);
        }

        setValidationErrors({});
        try {
            const response = await updateMutation.mutateAsync(data);
            toast.success(response.message || 'Site settings updated successfully');
        } catch (error: any) {
            const errors = error?.response?.data?.errors;
            if (errors) {
                console.log('Validation Errors:', errors);
                setValidationErrors(errors);
            } else {
                toast.error(error?.response?.data?.message || 'Failed to update site settings');
            }
        }
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Site Settings</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active">CMS</li>
                                        <li className="breadcrumb-item active">Settings</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="d-flex gap-2">
                                {hasPermission('update site settings') && (
                                    <button
                                        type="submit"
                                        form="site-settings-form"
                                        className="btn btn-primary d-flex align-items-center"
                                        disabled={updateMutation.isPending || isLoading}
                                    >
                                        {updateMutation.isPending ? (
                                            <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Saving...</>
                                        ) : (
                                            <><i className="ri-save-line me-1"></i> Save Settings</>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="mt-n3">
                        <div className="row g-4">
                            <div className="col-lg-8">
                                <div className="card">
                                    <div className="card-header border-0 pb-0">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="avatar-sm flex-shrink-0">
                                                <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-20">
                                                    <i className="ri-settings-4-line"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h5 className="card-title mb-1">General Information</h5>
                                                <p className="text-muted mb-0">Manage your website's basic information and contact details</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-body p-4">
                                        <FormLoader count={6} colClass="col-md-6" />
                                    </div>
                                </div>
                                <div className="card mt-4">
                                    <div className="card-header placeholder-glow">
                                        <span className="placeholder col-5"></span>
                                    </div>
                                    <div className="card-body p-4">
                                        <FormLoader count={2} colClass="col-12" />
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-4">
                                <div className="card">
                                    <div className="card-header placeholder-glow">
                                        <span className="placeholder col-6"></span>
                                    </div>
                                    <div className="card-body p-3">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="card border shadow-none mb-3">
                                                <div className="card-body p-3">
                                                    <div className="d-flex align-items-center gap-3 placeholder-glow">
                                                        <span className="placeholder rounded-3 flex-shrink-0" style={{ width: '80px', height: '80px' }}></span>
                                                        <div className="flex-grow-1">
                                                            <span className="placeholder col-8 mb-2 d-block"></span>
                                                            <span className="placeholder col-12 mb-1 d-block" style={{ height: '10px' }}></span>
                                                            <span className="placeholder col-7 d-block" style={{ height: '10px' }}></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form id="site-settings-form" onSubmit={handleSubmit} className="mt-n3">
                        <div className="row">
                            <div className="col-lg-8">
                                <div className="card mb-4 shadow-sm border-0">
                                    <div className="card-header bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                                        <div className="d-flex align-items-center">
                                            <div className="avatar-sm me-3">
                                                <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-20">
                                                    <i className="ri-settings-3-line"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h5 className="card-title mb-1 fw-bold">General Information</h5>
                                                <p className="text-muted mb-0 fs-13">Manage your website's basic information and contact details</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <div className="mb-0">
                                                    <label className="form-label fw-semibold fs-13">Site Name <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light d-flex align-items-center justify-content-center ${validationErrors.site_name ? 'border-danger text-danger' : 'text-muted'}`} style={{ width: '42px' }}><i className="ri-building-line fs-16"></i></span>
                                                        <input type="text" className={`form-control ps-2 ${validationErrors.site_name ? 'is-invalid border-danger' : ''}`} name="site_name" value={formData.site_name || ''} onChange={handleChange} placeholder="Your Brand Name" />
                                                        {validationErrors.site_name && <div className="invalid-feedback d-block mt-1">{validationErrors.site_name}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-0">
                                                    <label className="form-label fw-semibold fs-13">Site Slogan</label>
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light d-flex align-items-center justify-content-center ${validationErrors.site_slogan ? 'border-danger text-danger' : 'text-muted'}`} style={{ width: '42px' }}><i className="ri-price-tag-3-line fs-16"></i></span>
                                                        <input type="text" className={`form-control ps-2 ${validationErrors.site_slogan ? 'is-invalid border-danger' : ''}`} name="site_slogan" value={formData.site_slogan || ''} onChange={handleChange} placeholder="Your Brand Slogan" />
                                                        {validationErrors.site_slogan && <div className="invalid-feedback d-block mt-1">{validationErrors.site_slogan}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-0">
                                                    <label className="form-label fw-semibold fs-13">Contact Email <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light d-flex align-items-center justify-content-center ${validationErrors.email ? 'border-danger text-danger' : 'text-muted'}`} style={{ width: '42px' }}><i className="ri-mail-line fs-16"></i></span>
                                                        <input type="text" className={`form-control ps-2 ${validationErrors.email ? 'is-invalid border-danger' : ''}`} name="email" value={formData.email || ''} onChange={handleChange} placeholder="contact@example.com" />
                                                        {validationErrors.email && <div className="invalid-feedback d-block mt-1">{validationErrors.email}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-0">
                                                    <label className="form-label fw-semibold fs-13">Phone Number <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light d-flex align-items-center justify-content-center ${validationErrors.phone_number ? 'border-danger text-danger' : 'text-muted'}`} style={{ width: '42px' }}><i className="ri-phone-line fs-16"></i></span>
                                                        <input type="text" className={`form-control ps-2 ${validationErrors.phone_number ? 'is-invalid border-danger' : ''}`} name="phone_number" value={formData.phone_number || ''} onChange={handleChange} placeholder="+1 234 567 890" />
                                                        {validationErrors.phone_number && <div className="invalid-feedback d-block mt-1">{validationErrors.phone_number}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-12">
                                                <div className="mb-0">
                                                    <label className="form-label fw-semibold fs-13">Office Address <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light d-flex align-items-center justify-content-center ${validationErrors.address ? 'border-danger text-danger' : 'text-muted'}`} style={{ width: '42px' }}><i className="ri-map-pin-line fs-16"></i></span>
                                                         <textarea className={`form-control ps-2 ${validationErrors.address ? 'is-invalid border-danger' : ''}`} name="address" rows={3} value={formData.address || ''} onChange={handleChange} placeholder="123 Business St, City" style={{ whiteSpace: 'pre-wrap' }}></textarea>
                                                        {validationErrors.address && <div className="invalid-feedback d-block mt-1">{validationErrors.address}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-12">
                                                <div className="mb-0">
                                                    <label className="form-label fw-semibold fs-13">Google Maps Iframe <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light d-flex align-items-start align-items-center pt-2 ${validationErrors.map_iframe ? 'border-danger text-danger' : 'text-muted'}`} style={{ width: '42px' }}><i className="ri-map-2-line fs-16"></i></span>
                                                        <textarea className={`form-control ps-2 ${validationErrors.map_iframe ? 'is-invalid border-danger' : ''}`} rows={5} name="map_iframe" value={formData.map_iframe || ''} onChange={handleChange} placeholder='<iframe src="..."></iframe>'></textarea>
                                                        {validationErrors.map_iframe && <div className="invalid-feedback d-block mt-1">{validationErrors.map_iframe}</div>}
                                                    </div>
                                                    <div className="form-text text-muted mt-2">Paste the embed code from Google Maps here.</div>
                                                </div>
                                            </div>

                                            <div className="col-md-12 mt-4">
                                                <div className="card-header bg-transparent border-bottom-0 pb-0 pt-2 px-0 d-flex align-items-center mb-3">
                                                    <div className="avatar-xs me-2">
                                                        <div className="avatar-title bg-info-subtle text-info rounded-circle fs-14">
                                                            <i className="ri-shield-keyhole-line"></i>
                                                        </div>
                                                    </div>
                                                    <h6 className="card-title mb-0 fw-bold">Marketing & Security</h6>
                                                </div>
                                            </div>

                                            <div className="col-md-12">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold fs-13">Google Analytics Measurement ID</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light d-flex align-items-center justify-content-center" style={{ width: '42px' }}><i className="ri-bar-chart-box-line fs-16"></i></span>
                                                        <input type="text" className="form-control ps-2" name="google_measurement_id" value={formData.google_measurement_id || ''} onChange={handleChange} placeholder="G-XXXXXXXXXX" />
                                                    </div>
                                                    <div className="form-text text-muted mt-1">Enter your Google Analytics 4 Measurement ID to enable tracking.</div>
                                                </div>
                                            </div>

                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold fs-13">reCAPTCHA Site Key</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light d-flex align-items-center justify-content-center" style={{ width: '42px' }}><i className="ri-google-line fs-16"></i></span>
                                                        <input type="text" className="form-control ps-2" name="recaptcha_site_key" value={formData.recaptcha_site_key || ''} onChange={handleChange} placeholder="Site Key" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold fs-13">reCAPTCHA Secret Key</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light d-flex align-items-center justify-content-center" style={{ width: '42px' }}><i className="ri-lock-password-line fs-16"></i></span>
                                                        <input type="text" className="form-control ps-2" name="recaptcha_secret_key" value={formData.recaptcha_secret_key || ''} onChange={handleChange} placeholder="Secret Key" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card mb-4 shadow-sm border-0">
                                    <div className="card-header bg-transparent border-bottom-0 pb-0 pt-4 px-4 d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center">
                                            <div className="avatar-sm me-3">
                                                <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-20">
                                                    <i className="ri-share-line"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h5 className="card-title mb-1 fw-bold">Social Media Links</h5>
                                                <p className="text-muted mb-0 fs-13">Add and manage your social media profiles</p>
                                            </div>
                                        </div>
                                        {hasPermission('add soical media') && (
                                            <button
                                                type="button"
                                                className="btn btn-primary fw-medium waves-effect waves-light"
                                                onClick={handleAddSocialLink}
                                            >
                                                <i className="ri-add-fill me-1 align-bottom"></i> Add New
                                            </button>
                                        )}
                                    </div>
                                    <div className="card-body p-3">
                                        {socialLinks.length === 0 ? (
                                            <div className="text-center py-4">
                                                <i className="ri-share-line fs-1 text-muted d-block mb-2"></i>
                                                <p className="text-muted mb-0">No social media links added yet.</p>
                                                <p className="text-muted fs-12">Click "Add New" to add your first social link.</p>
                                            </div>
                                        ) : (
                                            <div className="d-flex flex-column gap-2">
                                                {/* Table Headers for Desktop */}
                                                <div className="row g-2 px-2 d-none d-md-flex pb-2 border-bottom mb-2">
                                                    <div className="col-md-3">
                                                        <span className="fw-semibold fs-13 text-dark">Platform</span>
                                                    </div>
                                                    <div className="col-md-8">
                                                        <span className="fw-semibold fs-13 text-dark">Profile URL</span>
                                                    </div>
                                                    <div className="col-md-1 text-center">
                                                        <span className="fw-semibold fs-13 text-dark">Actions</span>
                                                    </div>
                                                </div>
                                                {socialLinks.map((link, index) => {
                                                    return (
                                                        <div key={index} className="border rounded p-2 position-relative bg-white shadow-sm">
                                                            <div className="row g-2 align-items-stretch">

                                                                {/* Platform */}
                                                                <div className="col-md-3">
                                                                    <Dropdown
                                                                        value={link.platform}
                                                                        options={SOCIAL_PLATFORMS.map(p => ({
                                                                            label: p.label,
                                                                            value: p.value,
                                                                            icon: p.icon
                                                                        }))}
                                                                        onChange={(e) => handlePlatformSelect(index, e.value)}
                                                                        optionLabel="label"
                                                                        placeholder="Select Platform"
                                                                        className={`w-100 ${validationErrors[`social_links.${index}.platform`] ? 'p-invalid' : ''}`}
                                                                        style={{ height: '42px', display: 'flex', alignItems: 'center' }}
                                                                        itemTemplate={(option) => (
                                                                            <div className="d-flex align-items-center gap-2">
                                                                                <i className={`${option.icon} text-primary fs-16`} style={{ width: '18px', textAlign: 'center' }}></i>
                                                                                <span className="fs-14">{option.label}</span>
                                                                            </div>
                                                                        )}
                                                                        valueTemplate={(option) => (
                                                                            option ? (
                                                                                <div className="d-flex align-items-center gap-2" style={{ height: '100%' }}>
                                                                                    <i className={`${option.icon} text-primary fs-16`} style={{ width: '18px', textAlign: 'center', lineHeight: 1 }}></i>
                                                                                    <span className="fs-14 fw-medium">{option.label}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="d-flex align-items-center" style={{ height: '100%' }}>
                                                                                    <span className="fs-14 text-muted">Select Platform</span>
                                                                                </div>
                                                                            )
                                                                        )}
                                                                    />
                                                                    {validationErrors[`social_links.${index}.platform`] && (
                                                                        <div className="text-danger fs-11 mt-1">
                                                                            {Array.isArray(validationErrors[`social_links.${index}.platform`])
                                                                                ? validationErrors[`social_links.${index}.platform`][0]
                                                                                : String(validationErrors[`social_links.${index}.platform`])}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* URL */}
                                                                <div className="col-md-8">
                                                                    <div className="input-group" style={{ height: '42px' }}>
                                                                        {link.icon && (
                                                                            <span className={`input-group-text bg-light d-flex align-items-center justify-content-center p-0 ${validationErrors[`social_links.${index}.url`] ? 'border-danger' : ''}`}
                                                                                style={{ width: '42px', minWidth: '42px' }}>
                                                                                <i className={`${link.icon} text-primary fs-16`} style={{ lineHeight: 1 }}></i>
                                                                            </span>
                                                                        )}
                                                                        <input
                                                                            type="text"
                                                                            className={`form-control shadow-none ${validationErrors[`social_links.${index}.url`] ? 'is-invalid border-danger' : ''}`}
                                                                            style={{ fontSize: '14px' }}
                                                                            placeholder="https://facebook.com/yourpage"
                                                                            value={link.url}
                                                                            onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    {validationErrors[`social_links.${index}.url`] && (
                                                                        <div className="text-danger fs-11 mt-1">
                                                                            {Array.isArray(validationErrors[`social_links.${index}.url`])
                                                                                ? validationErrors[`social_links.${index}.url`][0]
                                                                                : String(validationErrors[`social_links.${index}.url`])}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Delete */}
                                                                <div className="col-md-1">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-soft-danger w-100 d-flex align-items-center justify-content-center"
                                                                        style={{ height: '42px' }}
                                                                        onClick={() => handleRemoveSocialLink(index)}
                                                                    >
                                                                        <i className="ri-delete-bin-line fs-18"></i>
                                                                    </button>
                                                                </div>

                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-4">
                                <div className="card mb-4 shadow-sm border-0">
                                    <div className="card-header bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                                        <div className="d-flex align-items-center">
                                            <div className="avatar-sm me-3">
                                                <div className="avatar-title bg-success-subtle text-success rounded-circle fs-20">
                                                    <i className="ri-brush-line"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h5 className="card-title mb-1 fw-bold">Site Branding</h5>
                                                <p className="text-muted mb-0 fs-13">Customize your website's visual identity</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-body p-3">
                                        <div className="row g-3">

                                            {/* Header Logo */}
                                            <div className="col-12">
                                                <div className="card border shadow-none mb-3">
                                                    <div className="card-header border-bottom-dashed py-2">
                                                        <h6 className="card-title mb-0 fs-13">
                                                            <i className="ri-layout-top-2-line align-middle text-primary me-1"></i> Header Logo
                                                        </h6>
                                                    </div>
                                                    <div className="card-body p-2">
                                                        <div className="text-center">
                                                            <div
                                                                className="position-relative d-inline-block cursor-pointer w-100"
                                                                onClick={() => setShowFileManager('header')}
                                                                title="PNG, SVG, JPG • Max 2MB"
                                                            >
                                                                <div className="bg-light rounded d-flex flex-column align-items-center justify-content-center p-3" style={{ minHeight: '120px', border: validationErrors.header_logo ? '2px solid #dc3545' : '1px solid #e9ebec' }}>
                                                                    {previewHeaderLogo ? (
                                                                        <img src={previewHeaderLogo} alt="Header Logo" className="img-fluid rounded object-fit-contain" style={{ maxHeight: '75px' }} />
                                                                    ) : (
                                                                        <div className="text-center">
                                                                            <div className="avatar-sm mx-auto mb-2">
                                                                                <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-20">
                                                                                    <i className="ri-layout-top-2-line"></i>
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-muted fs-11 mb-0">PNG, SVG, JPG <i className="ri-information-line" title="Max 2MB"></i></p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {previewHeaderLogo && (
                                                                    <div className="position-absolute bottom-0 end-0 mb-2 me-2">
                                                                        <span className="btn btn-sm btn-primary rounded-circle shadow p-1 lh-1 text-white" style={{ width: '26px', height: '26px' }}>
                                                                            <i className="ri-pencil-fill fs-12"></i>
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {validationErrors.header_logo && <div className="text-danger fs-11 mt-1">{validationErrors.header_logo}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer Logo */}
                                            <div className="col-12">
                                                <div className="card border shadow-none mb-3">
                                                    <div className="card-header border-bottom-dashed py-2">
                                                        <h6 className="card-title mb-0 fs-13">
                                                            <i className="ri-layout-bottom-2-line align-middle text-success me-1"></i> Footer Logo
                                                        </h6>
                                                    </div>
                                                    <div className="card-body p-2">
                                                        <div className="text-center">
                                                            <div
                                                                className="position-relative d-inline-block cursor-pointer w-100"
                                                                onClick={() => setShowFileManager('footer')}
                                                                title="PNG, SVG, JPG • Max 2MB"
                                                            >
                                                                <div className="bg-light rounded d-flex flex-column align-items-center justify-content-center p-3" style={{ minHeight: '120px', border: validationErrors.footer_logo ? '2px solid #dc3545' : '1px solid #e9ebec' }}>
                                                                    {previewFooterLogo ? (
                                                                        <img src={previewFooterLogo} alt="Footer Logo" className="img-fluid rounded object-fit-contain" style={{ maxHeight: '75px' }} />
                                                                    ) : (
                                                                        <div className="text-center">
                                                                            <div className="avatar-sm mx-auto mb-2">
                                                                                <div className="avatar-title bg-success-subtle text-success rounded-circle fs-20">
                                                                                    <i className="ri-layout-bottom-2-line"></i>
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-muted fs-11 mb-0">PNG, SVG, JPG <i className="ri-information-line" title="Max 2MB"></i></p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {previewFooterLogo && (
                                                                    <div className="position-absolute bottom-0 end-0 mb-2 me-2">
                                                                        <span className="btn btn-sm btn-success rounded-circle shadow p-1 lh-1 text-white" style={{ width: '26px', height: '26px' }}>
                                                                            <i className="ri-pencil-fill fs-12"></i>
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {validationErrors.footer_logo && <div className="text-danger fs-11 mt-1">{validationErrors.footer_logo}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Partner Logo */}
                                            <div className="col-12">
                                                <div className="card border shadow-none mb-3">
                                                    <div className="card-header border-bottom-dashed py-2">
                                                        <h6 className="card-title mb-0 fs-13">
                                                            <i className="ri-medal-line align-middle text-warning me-1"></i> Partner Logo
                                                        </h6>
                                                    </div>
                                                    <div className="card-body p-2">
                                                        <div className="text-center">
                                                            <div
                                                                className="position-relative d-inline-block cursor-pointer w-100"
                                                                onClick={() => setShowFileManager('partner')}
                                                                title="PNG, SVG, JPG • Max 2MB"
                                                            >
                                                                <div className="bg-light rounded d-flex flex-column align-items-center justify-content-center p-3" style={{ minHeight: '120px', border: validationErrors.partner_logo ? '2px solid #dc3545' : '1px solid #e9ebec' }}>
                                                                    {previewPartnerLogo ? (
                                                                        <img src={previewPartnerLogo} alt="Partner Logo" className="img-fluid rounded object-fit-contain" style={{ maxHeight: '75px' }} />
                                                                    ) : (
                                                                        <div className="text-center">
                                                                            <div className="avatar-sm mx-auto mb-2">
                                                                                <div className="avatar-title bg-warning-subtle text-warning rounded-circle fs-20">
                                                                                    <i className="ri-medal-line"></i>
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-muted fs-11 mb-0">PNG, SVG, JPG <i className="ri-information-line" title="Max 2MB"></i></p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {previewPartnerLogo && (
                                                                    <div className="position-absolute bottom-0 end-0 mb-2 me-2">
                                                                        <span className="btn btn-sm btn-warning rounded-circle shadow p-1 lh-1 text-white" style={{ width: '26px', height: '26px' }}>
                                                                            <i className="ri-pencil-fill fs-12"></i>
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {validationErrors.partner_logo && <div className="text-danger fs-11 mt-1">{validationErrors.partner_logo}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Favicon */}
                                            <div className="col-12">
                                                <div className="card border shadow-none mb-3">
                                                    <div className="card-header border-bottom-dashed py-2">
                                                        <h6 className="card-title mb-0 fs-13">
                                                            <i className="ri-global-line align-middle text-info me-1"></i> Favicon
                                                        </h6>
                                                    </div>
                                                    <div className="card-body p-2">
                                                        <div className="text-center">
                                                            <div
                                                                className="position-relative d-inline-block cursor-pointer w-100"
                                                                onClick={() => setShowFileManager('favicon')}
                                                                title="ICO, PNG, SVG • Max 1MB"
                                                            >
                                                                <div className="bg-light rounded d-flex flex-column align-items-center justify-content-center p-3" style={{ minHeight: '120px', border: validationErrors.favicon ? '2px solid #dc3545' : '1px solid #e9ebec' }}>
                                                                    {previewFavicon ? (
                                                                        <img src={previewFavicon} alt="Favicon" className="img-fluid rounded object-fit-contain" style={{ maxHeight: '75px' }} />
                                                                    ) : (
                                                                        <div className="text-center">
                                                                            <div className="avatar-sm mx-auto mb-2">
                                                                                <div className="avatar-title bg-info-subtle text-info rounded-circle fs-20">
                                                                                    <i className="ri-global-line"></i>
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-muted fs-11 mb-0">ICO, PNG, SVG <i className="ri-information-line" title="Max 1MB"></i></p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {previewFavicon && (
                                                                    <div className="position-absolute bottom-0 end-0 mb-2 me-2">
                                                                        <span className="btn btn-sm btn-info rounded-circle shadow p-1 lh-1 text-white" style={{ width: '26px', height: '26px' }}>
                                                                            <i className="ri-pencil-fill fs-12"></i>
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {validationErrors.favicon && <div className="text-danger fs-11 mt-1">{validationErrors.favicon}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                        {/* Info Alert */}
                                        <div className="alert alert-primary bg-primary-subtle border-0 mb-0 mt-3 d-flex align-items-start">
                                            <div className="avatar-xs flex-shrink-0 me-3">
                                                <div className="avatar-title bg-primary rounded-circle fs-16 text-white">
                                                    <i className="ri-information-fill"></i>
                                                </div>
                                            </div>
                                            <div className="text-primary fs-13 mt-1">
                                                These settings affect the global header and footer of your website.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                )}

                <FileManagerModal
                    isOpen={!!showFileManager}
                    toggle={() => setShowFileManager(false)}
                    selectionMode={true}
                    onSelectFiles={handleLogoSelect}
                    section="logos"
                    entityType="site-settings"
                    entityId={0}
                    getAll={true}
                />
            </div>
        </div >
    );
}
