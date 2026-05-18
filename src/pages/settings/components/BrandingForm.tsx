import React, { useState, useEffect } from 'react';
import {
    fetchGeneralInformation,
    updateGeneralInformation
} from '../../../modules/settings/services';
import { toast } from 'react-toastify';
import FormLoader from '../../../components/Loader/FormLoader';
import { useAuthStore } from '../../../store/auth/authStore';
import { FileManagerModal } from '../../../components/FileManagerModal/FileManagerModal';
import { useQueryClient } from '@tanstack/react-query';

const BASE_URL = (import.meta as any).env.VITE_BASE_API_URL || '';

function resolveLogoUrl(path: string | null | undefined) {
    if (!path || path === 'null' || path === 'undefined') return null;
    if (typeof path !== 'string') return null;
    if (path.startsWith('http')) return path;

    // Remove leading slash
    let clean = path.replace(/^\//, '');

    // If it already starts with storage/, remove it to prevent double-prefixing
    if (clean.startsWith('storage/')) {
        clean = clean.replace(/^storage\//, '');
    }

    return `${BASE_URL}/storage/${clean}`;
}

interface BrandingItemProps {
    title: string;
    icon: string;
    value: string;
    onSelect: () => void;
    loading?: boolean;
    error?: string;
    description?: string;
    required?: boolean;
    primaryColor?: string;
    dimensions?: string;
    allowedFormats?: string;
}

const BrandingItem: React.FC<BrandingItemProps> = ({ title, icon, value, onSelect, loading, error, description, required, primaryColor, dimensions, allowedFormats }) => {
    const [imgError, setImgError] = useState(false);
    const preview = resolveLogoUrl(value);

    useEffect(() => {
        setImgError(false);
    }, [value]);

    return (
        <div className="card border shadow-none mb-3 h-100">
            <div className="card-header border-bottom-dashed py-2">
                <h6 className="card-title mb-0 fs-13">
                    <i className={`${icon} align-middle me-1 text-primary`}></i> {title} {required && <span className="text-danger">*</span>}
                </h6>
            </div>
            <div className="card-body p-2 d-flex flex-column justify-content-between">
                <div className="text-center">
                    <div
                        className="position-relative d-inline-block cursor-pointer w-100"
                        onClick={onSelect}
                        title={`Professional transparent background recommended. ${allowedFormats || 'PNG, SVG, JPG, WEBP'} • Max 2MB`}
                    >
                        <div
                            className="bg-light rounded d-flex flex-column align-items-center justify-content-center p-3"
                            style={{
                                minHeight: '120px',
                                border: error ? '2px solid #dc3545' : '1px solid #e9ebec',
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            {loading ? (
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            ) : preview && !imgError ? (
                                <img
                                    src={preview}
                                    alt={title}
                                    className="img-fluid rounded object-fit-contain"
                                    style={{ maxHeight: '75px' }}
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="text-center py-2">
                                    <div className="avatar-sm mx-auto mb-2">
                                        <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-20">
                                            <i className="ri-image-add-line"></i>
                                        </div>
                                    </div>
                                    <p className="text-muted fs-11 mb-0 fw-medium">Upload {title}</p>
                                    {dimensions && <p className="text-muted fs-10 mb-0">({dimensions})</p>}
                                    <p className="text-muted fs-10 mb-0 opacity-75">{allowedFormats || 'PNG, SVG, JPG, WEBP'} • 2MB</p>
                                </div>
                            )}
                        </div>
                        {preview && !imgError && (
                            <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                                <span className="btn btn-primary btn-sm rounded-circle shadow p-0 d-flex align-items-center justify-content-center text-white" style={{ width: '28px', height: '28px' }}>
                                    <i className="ri-pencil-fill fs-12"></i>
                                </span>
                            </div>
                        )}
                    </div>
                    {error && <div className="text-danger fs-11 mt-1 text-start ps-1">{error}</div>}
                    {description && !error && <p className="text-muted fs-11 mt-1 mb-0 text-start ps-1">{description}</p>}
                </div>
            </div>
        </div>
    );
};

interface BrandingState {
    primary_logo: string;
    secondary_logo: string;
    favicon: string;
    site_name: string;
    site_slogan: string;
    primary_color: string;
    secondary_color: string;
    copyright_text: string;
}

const BrandingForm: React.FC = () => {
    const user = useAuthStore((s) => s.user);
    const partnerId = user?.partner_id || user?.entity_id;
    const queryClient = useQueryClient();

    const [fetching, setFetching] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [showFileManager, setShowFileManager] = useState<boolean>(false);
    const [activeField, setActiveField] = useState<keyof BrandingState | null>(null);
    const [errors, setErrors] = useState<any>({});

    const [branding, setBranding] = useState<BrandingState>({
        primary_logo: '',
        secondary_logo: '',
        favicon: '',
        site_name: '',
        site_slogan: '',
        primary_color: '#001F3F',
        secondary_color: '#D4AF37',
        copyright_text: `Copyright © ${new Date().getFullYear()} Four Corner Funding. All rights reserved.`
    });

    useEffect(() => {
        loadBranding();
    }, []);

    const loadBranding = async () => {
        try {
            setFetching(true);
            const res: any = await fetchGeneralInformation();
            if (res?.data) {
                const cleanedData = { ...res.data };

                // Explicitly handle defaults if values are missing or the string 'null'
                cleanedData.primary_color = (cleanedData.primary_color && cleanedData.primary_color !== 'null') ? cleanedData.primary_color : '#001F3F';
                cleanedData.secondary_color = (cleanedData.secondary_color && cleanedData.secondary_color !== 'null') ? cleanedData.secondary_color : '#D4AF37';

                if (!cleanedData.copyright_text || cleanedData.copyright_text === 'null') {
                    cleanedData.copyright_text = `Copyright © ${new Date().getFullYear()} Four Corner Funding. All rights reserved.`;
                }

                setBranding(prev => ({
                    ...prev,
                    ...cleanedData
                }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setFetching(false);
        }
    };

    const handleFileSelection = (selectedFiles: any[]) => {
        if (!selectedFiles?.length || !activeField) return;
        const file = selectedFiles[0];

        const allowedExtensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
        const isFavicon = activeField.includes('favicon');
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension && !allowedExtensions.includes(extension) && !(isFavicon && extension === 'ico')) {
            const message = isFavicon
                ? 'Please select a valid image file (PNG, JPG, SVG, ICO, or WebP)'
                : 'Please select a valid image file (PNG, JPG, SVG, or WebP)';

            setErrors((prev: any) => ({ ...prev, [activeField]: message }));
            setShowFileManager(false);
            return;
        }

        if (file.size && file.size > 2 * 1024 * 1024) {
            setErrors((prev: any) => ({ ...prev, [activeField]: 'File size must not exceed 2MB' }));
            setShowFileManager(false);
            return;
        }

        const cleanPath = file.path.trim().replace(/^\/+/, '');

        // Build the prefix based on entity type and ID
        const eType = user?.entity_type || 'site-settings';
        const isPartner = eType.includes('Partner') || eType === 'partners';
        const prefix = isPartner ? `partners/${partnerId}` : 'site-settings';

        // Prepend prefix if it's not already there
        let finalPath = cleanPath;
        if (!cleanPath.startsWith(prefix) && !cleanPath.startsWith('http')) {
            finalPath = `${prefix}/${cleanPath}`;
        }

        // Clean up double slashes and 'storage/' if it exists
        finalPath = finalPath.replace(/\/+/g, '/').replace(/^storage\//, '');

        setBranding(prev => ({ ...prev, [activeField]: finalPath }));
        setErrors((prev: any) => ({ ...prev, [activeField]: null }));
        setShowFileManager(false);
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            setSaving(true);
            const payload = {
                ...branding
            };

            const response: any = await updateGeneralInformation(payload);
            queryClient.invalidateQueries({ queryKey: ['globalConfigurations'] });
            queryClient.invalidateQueries({ queryKey: ['public-site-settings'] });
            toast.success(response.message || 'Site settings updated successfully');
            setErrors({});
        } catch (err: any) {
            if (err?.response?.status === 422) {
                const backendErrors = err.response.data.errors || {};
                setErrors(backendErrors);
                const firstError = Object.values(backendErrors)[0];
                // toast.error(Array.isArray(firstError) ? firstError[0] : 'Please fix the validation errors.');
            } else {
                toast.error('Failed to update branding settings.');
            }
        } finally {
            setSaving(false);
        }
    };

    if (fetching) return <FormLoader count={3} colClass="col-12" />;

    return (
        <div className="animate__animated animate__fadeIn">
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center gap-3">
                    <div className="avatar-sm flex-shrink-0">
                        <div className="avatar-title bg-info-subtle text-info rounded fs-20">
                            <i className="ri-brush-line"></i>
                        </div>
                    </div>
                    <div>
                        <h5 className="card-title mb-0 fs-15">White Label Branding</h5>
                        <p className="text-muted mb-0 fs-13">Customize logos, favicons, and theme colors</p>
                    </div>
                </div>

                <div className="card-body p-4">
                    <form onSubmit={handleSave}>
                        <div className="row g-4">
                            <div className="col-12">
                                <label className="form-label fw-semibold fs-13">Site Name <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control ${errors.site_name ? 'is-invalid' : ''}`}
                                    placeholder="Enter your company name"
                                    value={branding.site_name}
                                    onChange={e => setBranding(prev => ({ ...prev, site_name: e.target.value }))}
                                />
                                {errors.site_name && <div className="invalid-feedback fs-11">{errors.site_name}</div>}
                            </div>

                            <div className="col-12">
                                <label className="form-label fw-semibold fs-13">Site Slogan</label>
                                <input
                                    type="text"
                                    className={`form-control ${errors.site_slogan ? 'is-invalid' : ''}`}
                                    placeholder="Enter your company slogan"
                                    value={branding.site_slogan}
                                    onChange={e => setBranding(prev => ({ ...prev, site_slogan: e.target.value }))}
                                />
                                {errors.site_slogan && <div className="invalid-feedback fs-11">{errors.site_slogan}</div>}
                            </div>

                            <div className="col-md-4">
                                <BrandingItem
                                    title="Primary Logo"
                                    dimensions="6493x1969px"
                                    icon="ri-image-2-line"
                                    value={branding.primary_logo}
                                    onSelect={() => { setActiveField('primary_logo'); setShowFileManager(true); }}
                                    error={errors.primary_logo}
                                    description="Professional transparent background recommended."
                                    required={true}
                                    primaryColor={branding.primary_color}
                                />
                            </div>
                            <div className="col-md-4">
                                <BrandingItem
                                    title="Secondary Logo"
                                    dimensions="6500x2500px"
                                    icon="ri-image-line"
                                    value={branding.secondary_logo}
                                    onSelect={() => { setActiveField('secondary_logo'); setShowFileManager(true); }}
                                    error={errors.secondary_logo}
                                    description="Professional transparent background recommended."
                                    required={false}
                                    primaryColor={branding.primary_color}
                                />
                            </div>
                            <div className="col-md-4">
                                <BrandingItem
                                    title="Site Favicon"
                                    dimensions="200x200px"
                                    allowedFormats="ICO, PNG, SVG, JPG, WEBP"
                                    icon="ri-global-line"
                                    value={branding.favicon}
                                    onSelect={() => { setActiveField('favicon'); setShowFileManager(true); }}
                                    error={errors.favicon}
                                    description="Square ICO or PNG with transparent background recommended."
                                    required={true}
                                    primaryColor={branding.primary_color}
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-semibold fs-13">Primary Theme Color <span className="text-danger">*</span></label>
                                <div className="d-flex gap-2 align-items-center">
                                    <input
                                        type="color"
                                        className="form-control form-control-color"
                                        value={branding.primary_color || '#001F3F'}
                                        onChange={e => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                                        style={{ width: '60px' }}
                                    />
                                    <input
                                        type="text"
                                        className={`form-control ${errors.primary_color ? 'is-invalid' : ''}`}
                                        placeholder="#001F3F"
                                        value={branding.primary_color || '#001F3F'}
                                        onChange={e => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                                    />
                                </div>
                                {errors.primary_color && <div className="text-danger fs-11 mt-1">{errors.primary_color}</div>}
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-semibold fs-13">Secondary Theme Color <span className="text-danger">*</span></label>
                                <div className="d-flex gap-2 align-items-center">
                                    <input
                                        type="color"
                                        className="form-control form-control-color"
                                        value={branding.secondary_color || '#D4AF37'}
                                        onChange={e => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                                        style={{ width: '60px' }}
                                    />
                                    <input
                                        type="text"
                                        className={`form-control ${errors.secondary_color ? 'is-invalid' : ''}`}
                                        placeholder="#D4AF37"
                                        value={branding.secondary_color || '#D4AF37'}
                                        onChange={e => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                                    />
                                </div>
                                {errors.secondary_color && <div className="text-danger fs-11 mt-1">{errors.secondary_color}</div>}
                            </div>
                        </div>

                        <div className="text-end mt-5 pt-3 border-top">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn btn-primary waves-effect waves-light px-5"
                            >
                                {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="ri-save-line me-1"></i>Save Branding</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <FileManagerModal
                isOpen={showFileManager}
                toggle={() => setShowFileManager(!showFileManager)}
                selectionMode={true}
                onSelectFiles={handleFileSelection}
                entityType="partners"
                entityId={partnerId || 0}
                getAll={false}
            />
        </div>
    );
}

export default BrandingForm;
