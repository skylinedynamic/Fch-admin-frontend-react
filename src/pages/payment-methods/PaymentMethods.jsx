import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchAdminProviders, updateAdminProvider } from '../../modules/payment';
import ListSkeletonLoader from '../../components/Loader/ListSkeletonLoader';
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';
import { useAuthStore } from '../../store/auth/authStore';

// Helper to resolve URLs
const resolveLogoUrl = (path) => {
    if (!path || path === 'null' || path === 'undefined') return null;
    if (typeof path !== 'string') return null;
    if (path.startsWith('http')) return path;

    // Remove leading slash
    let clean = path.replace(/^\//, '');

    // If it already starts with storage/, remove it to prevent double-prefixing
    if (clean.startsWith('storage/')) {
        clean = clean.replace(/^storage\//, '');
    }

    const BASE_URL = import.meta.env.VITE_BASE_API_URL || import.meta.env.VITE_API_URL || '';
    const host = BASE_URL ? BASE_URL : window.location.origin;

    return `${host}/storage/${clean}`;
};

export default function PaymentMethods() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);

    // File Manager modal state
    const [showFileManager, setShowFileManager] = useState(false);
    const [selectedProviderForLogo, setSelectedProviderForLogo] = useState(null);

    const currentUser = useAuthStore((state) => state.user);
    const partnerId = currentUser?.partner_id || currentUser?.entity_id;

    const loadProviders = async () => {
        setLoading(true);
        try {
            const response = await fetchAdminProviders();
            if (response.status) {
                setProviders(response.data || []);
            } else {
                toast.error(response.message || 'Failed to fetch payment providers');
            }
        } catch (error) {
            console.error('Error fetching payment providers:', error);
            toast.error('Failed to load payment providers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProviders();
    }, []);

    const handleStatusToggle = async (provider) => {
        const newStatus = !provider.status;
        setUpdatingId(provider.id);

        try {
            const formData = new FormData();
            formData.append('status', newStatus ? '1' : '0');

            const response = await updateAdminProvider(provider.id, formData);
            if (response.status) {
                setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, status: newStatus } : p));
                toast.success(`${provider.name} status updated successfully.`);
            } else {
                toast.error(response.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating provider status:', error);
            toast.error('Error updating provider status');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleFileSelection = async (selectedFiles) => {
        if (!selectedFiles?.length || !selectedProviderForLogo) return;
        const file = selectedFiles[0];

        // Validate image file type
        const extension = file.path.split('.').pop()?.toLowerCase();
        const allowed = ['jpg', 'jpeg', 'png', 'svg', 'gif', 'webp'];
        if (!extension || !allowed.includes(extension)) {
            toast.error(`File type ".${extension}" not allowed. Please select an image file.`);
            return;
        }

        // Just pass the base logo name
        const baseLogoName = file.name || file.path.split('/').pop() || '';

        const providerId = selectedProviderForLogo.id;
        setUpdatingId(providerId);
        setShowFileManager(false);

        try {
            const formData = new FormData();
            formData.append('logo', baseLogoName);
            formData.append('status', selectedProviderForLogo.status ? '1' : '0');

            const response = await updateAdminProvider(providerId, formData);
            if (response.status) {
                const updatedProvider = response.data;
                setProviders(prev => prev.map(p => p.id === providerId ? { ...p, logo: updatedProvider.logo } : p));
                toast.success(`${selectedProviderForLogo.name} logo updated successfully.`);
            } else {
                toast.error(response.message || 'Failed to update logo');
            }
        } catch (error) {
            console.error('Error updating logo path:', error);
            toast.error('Error updating logo');
        } finally {
            setUpdatingId(null);
            setSelectedProviderForLogo(null);
        }
    };

    const triggerFileManager = (provider) => {
        setSelectedProviderForLogo(provider);
        setShowFileManager(true);
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header with Breadcrumbs */}
                <div className="row pb-3">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Payment Method</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Payment Method</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="row">
                        <div className="col-12">
                            <ListSkeletonLoader count={3} />
                        </div>
                    </div>
                ) : (
                    <div className="row">
                        <div className="col-12">
                            {providers.map((provider) => (
                                <div className="card shadow-sm border-light mb-3 position-relative" key={provider.id}>
                                    {updatingId === provider.id && (
                                        <div className="position-absolute w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75 rounded" style={{ zIndex: 10 }}>
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="card-body p-4">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                                            {/* Left side: Logo & Name */}
                                            <div className="d-flex align-items-center gap-4 flex-wrap">
                                                <div
                                                    className="d-flex align-items-center justify-content-center rounded bg-light position-relative"
                                                    style={{ width: '100px', height: '100px', border: '1px solid #e9ebec', overflow: 'hidden' }}
                                                >
                                                    {provider.logo ? (
                                                        <img
                                                            src={resolveLogoUrl(provider.logo)}
                                                            alt={`${provider.name} Logo`}
                                                            style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }}
                                                        />
                                                    ) : (
                                                        <div className="text-muted d-flex flex-column align-items-center justify-content-center">
                                                            <i className="ri-image-2-line fs-24 mb-1"></i>
                                                            <span style={{ fontSize: '10px' }}>No Logo</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h5 className="fs-16 fw-semibold mb-1">{provider.name}</h5>
                                                    <p className="text-muted mb-0 fs-13">Configure logo branding and toggle status for checkout.</p>
                                                </div>
                                            </div>

                                            {/* Right side: Status Switch & Edit Button */}
                                            <div className="d-flex align-items-center gap-4 flex-wrap">
                                                {/* Status Badge */}
                                                <span className={`badge px-3 py-2 ${provider.status ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                                    {provider.status ? 'Active' : 'Inactive'}
                                                </span>

                                                {/* Status Switch */}
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="text-muted fs-13">Active Status</span>
                                                    <div className="form-check form-switch form-switch-lg custom-switch-primary m-0">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            role="switch"
                                                            id={`provider-status-${provider.id}`}
                                                            checked={!!provider.status}
                                                            onChange={() => handleStatusToggle(provider)}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Edit Button */}
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                                                    onClick={() => triggerFileManager(provider)}
                                                >
                                                    <i className="ri-pencil-line"></i> Change Logo
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* File Manager Modal integration */}
            <FileManagerModal
                isOpen={showFileManager}
                toggle={() => {
                    setShowFileManager(!showFileManager);
                    setSelectedProviderForLogo(null);
                }}
                selectionMode={true}
                onSelectFiles={handleFileSelection}
                entityType={'payment-method'}
                entityId={partnerId}
                getAll={true}
            />
        </div>
    );
}
