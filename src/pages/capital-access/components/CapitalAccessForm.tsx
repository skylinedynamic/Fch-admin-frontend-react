import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import FormLoader from '../../../components/Loader/FormLoader';
import { CreditAccount } from '../../../modules/credit-accounts/services';
import {
    createCapitalAccount,
    updateCapitalAccount,
    getCapitalAccount,
    fetchAllCreditAccountsForBuilder,
    StoreCapitalAccessPayload,
} from '../../../modules/capital-access/services';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { STATUS_OPTIONS } from '../../../config/creditBuilder';
import { buildStorageUrl } from '../../../utils/imageHelpers';


export default function CapitalAccessForm() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;

    const [loading, setLoading] = useState<boolean>(false);
    const [initialLoading, setInitialLoading] = useState<boolean>(isEditMode);

    // Lists state
    const [availableAccounts, setAvailableAccounts] = useState<CreditAccount[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<CreditAccount[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [dragOverList, setDragOverList] = useState<boolean>(false);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    const [formData, setFormData] = useState<{ name: string; status: string }>({
        name: '',
        status: 'Active',
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Fetch all Credit Accounts for the builder panel
                const response = await fetchAllCreditAccountsForBuilder();
                const accounts = response?.data ?? [];
                setAvailableAccounts(accounts);
            } catch (err) {
                console.error('Failed to fetch credit accounts:', err);
                // Stay with empty list; user will see an empty builder panel
                setAvailableAccounts([]);
            }

            // 2. Fetch existing Program if in edit mode
            if (isEditMode && id) {
                try {
                    const programRes = await getCapitalAccount(id);
                    const programData = programRes.data;
                    setFormData({
                        name: programData.name || '',
                        status: programData.status || 'Active',
                    });
                    // API returns credit_accounts (sorted by sorting_order via resource)
                    setSelectedAccounts(programData.credit_accounts || []);
                } catch (err) {
                    toast.error('Failed to load capital program details');
                    navigate('/capital-access');
                }
            }
            setInitialLoading(false);
        };
        loadData();
    }, [id, isEditMode, navigate]);


    // Available cards filtered by search
    const filteredAvailable = availableAccounts.filter(acc => {
        const matchSearch = acc.card_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.issuer.toLowerCase().includes(searchTerm.toLowerCase());
        // Do not display if already in the selected accounts
        const notSelected = !selectedAccounts.some(sel => sel.id === acc.id);
        return matchSearch && notSelected;
    });

    // ----------------------------------------------------
    // HTML5 Drag and Drop Handlers
    // ----------------------------------------------------

    // Drag start for adding a card (from Left panel)
    const handleDragStartAvailable = (e: React.DragEvent<HTMLDivElement>, account: CreditAccount) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ source: 'available', account }));
    };

    // Drag start for reordering cards (in Right panel)
    const handleDragStartSelected = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggingIndex(index);
        e.dataTransfer.setData('application/json', JSON.stringify({ source: 'selected', index }));
    };

    const handleDragEndSelected = () => {
        setDraggingIndex(null);
    };

    const handleDragOverReorder = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (draggingIndex === null || draggingIndex === index) return;
    };

    // Reorder cards when dropped inside the list
    const handleDropReorder = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault();
        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;
            const data = JSON.parse(rawData);

            if (data.source === 'selected') {
                const sourceIndex = data.index;
                if (sourceIndex === targetIndex) return;

                const updated = [...selectedAccounts];
                const [moved] = updated.splice(sourceIndex, 1);
                updated.splice(targetIndex, 0, moved);
                setSelectedAccounts(updated);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Handle drag over the Right dropping container
    const handleDragOverZone = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOverList(true);
    };

    const handleDragLeaveZone = () => {
        setDragOverList(false);
    };

    // Handle dropping inside Right container (adding cards)
    const handleDropOnZone = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOverList(false);
        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;
            const data = JSON.parse(rawData);

            if (data.source === 'available') {
                const account = data.account;
                if (selectedAccounts.some(acc => acc.id === account.id)) {
                    toast.warning('This account is already selected.');
                    return;
                }
                setSelectedAccounts(prev => [...prev, account]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // ----------------------------------------------------
    // Simple Button Click Controls (Accessibility Fallback)
    // ----------------------------------------------------
    const addAccount = (account: CreditAccount) => {
        if (selectedAccounts.some(acc => acc.id === account.id)) {
            toast.warning('This account is already selected.');
            return;
        }
        setSelectedAccounts(prev => [...prev, account]);
    };

    const removeAccount = (idToRemove?: number) => {
        if (idToRemove === undefined) return;
        setSelectedAccounts(prev => prev.filter(acc => acc.id !== idToRemove));
    };

    // Form Submission
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Program Name is required.');
            return;
        }

        if (selectedAccounts.length === 0) {
            toast.error('Please add at least one Credit Account to this program.');
            return;
        }

        setLoading(true);
        try {
            // Build ordered array of credit_account_ids (position = sorting_order)
            const payload: StoreCapitalAccessPayload = {
                ...formData,
                credit_account_ids: selectedAccounts
                    .map(acc => acc.id)
                    .filter((id): id is number => id !== undefined),
            };

            if (isEditMode && id) {
                await updateCapitalAccount(id, payload);
                toast.success('Capital Program updated successfully');
            } else {
                await createCapitalAccount(payload);
                toast.success('Capital Program created successfully');
            }
            navigate('/capital-access');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save capital program');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Page Header */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-18 fw-semibold mb-1">{isEditMode ? 'Edit Capital Program' : 'Create Capital Program'}</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/capital-access" className="text-muted">Capital Access</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">{isEditMode ? 'Edit Builder' : 'Create Builder'}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/capital-access" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                {((isEditMode && hasPermission('update credit accounts')) || (!isEditMode && hasPermission('create credit accounts'))) && (
                                    <button
                                        type="submit"
                                        form="capital-account-form"
                                        className="btn btn-primary waves-effect w-lg"
                                        disabled={loading || initialLoading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                {isEditMode ? 'Updating...' : 'Saving...'}
                                            </>
                                        ) : (
                                            <>
                                                <i className="ri-save-line align-middle me-1"></i> {isEditMode ? 'Save Changes' : 'Save Program'}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {initialLoading ? (
                    <div className="row">
                        <div className="col-12"><FormLoader count={8} /></div>
                    </div>
                ) : (
                    <form id="capital-account-form" onSubmit={handleSubmit}>
                        {/* Header Inputs Section */}
                        <div className="row">
                            <div className="col-12">
                                <div className="card shadow-sm border border-light-subtle">
                                    <div className="card-body">
                                        <div className="row g-3">
                                            <div className="col-md-8">
                                                <label className="form-label" htmlFor="programName">Program Name <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    id="programName"
                                                    className="form-control"
                                                    placeholder="e.g. Executive Funding Package"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label" htmlFor="programStatus">Status</label>
                                                <Dropdown
                                                    id="programStatus"
                                                    value={formData.status}
                                                    options={STATUS_OPTIONS}
                                                    onChange={(e: any) => setFormData(prev => ({ ...prev, status: e.value }))}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    className="w-100"
                                                    appendTo="self"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Builder Drag-and-Drop Columns */}
                        <div className="row g-4">

                            {/* Left Panel: Selected Builder Drop-zone */}
                            <div className="col-lg-6">
                                <div className="card shadow-sm border border-light-subtle h-100" style={{ minHeight: '500px' }}>
                                    <div className="card-header border-bottom border-light-subtle bg-light bg-opacity-25 d-flex align-items-center justify-content-between py-3">
                                        <h5 className="card-title mb-0 fs-15"><i className="ri-hand-coin-line align-middle text-muted me-1 fs-18"></i> Selected Cards</h5>
                                        <span className="badge bg-success-subtle text-success rounded-pill font-size-12">{selectedAccounts.length} Cards Selected</span>
                                    </div>
                                    <div className="card-body p-3 d-flex flex-column">
                                        <div
                                            onDragOver={handleDragOverZone}
                                            onDragLeave={handleDragLeaveZone}
                                            onDrop={handleDropOnZone}
                                            className={`flex-grow-1 rounded border-2 border-dashed d-flex flex-column p-2 transition ${dragOverList ? 'border-primary bg-primary bg-opacity-10' : 'border-light-subtle'}`}
                                            style={{ minHeight: '380px' }}
                                        >
                                            {selectedAccounts.length === 0 ? (
                                                <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center py-5 text-muted">
                                                    <i className="ri-drag-drop-line fs-32 text-muted mb-2 opacity-50"></i>
                                                    <h6 className="fs-14 fw-medium text-muted">Drag Cards Here</h6>
                                                    <p className="mb-0 text-muted small max-w-sm px-4">Or click the plus button on available cards to add them to this program.</p>
                                                </div>
                                            ) : (
                                                <div className="d-flex flex-column gap-2 w-100">
                                                    {selectedAccounts.map((acc, index) => {
                                                        const img = acc.full_image_url || acc.image_url;
                                                        return (
                                                            <div
                                                                key={acc.id}
                                                                draggable="true"
                                                                onDragStart={(e) => handleDragStartSelected(e, index)}
                                                                onDragEnd={handleDragEndSelected}
                                                                onDragOver={(e) => handleDragOverReorder(e, index)}
                                                                onDrop={(e) => handleDropReorder(e, index)}
                                                                className={`card border mb-0 cursor-grab px-3 py-2 shadow-sm transition ${draggingIndex === index ? 'opacity-50 border-primary bg-light' : 'border-light-subtle bg-white'}`}
                                                            >
                                                                <div className="d-flex align-items-center justify-content-between">
                                                                    <div className="d-flex align-items-center gap-3">
                                                                        {/* Drag Handle Indicator */}
                                                                        <div className="text-muted cursor-grab d-none d-sm-block">
                                                                            <i className="ri-drag-move-2-line fs-16 opacity-50"></i>
                                                                        </div>

                                                                        <div className="d-flex align-items-center justify-content-center" style={{ width: '45px', height: '28px', overflow: 'hidden' }}>
                                                                            {img ? (
                                                                                <img src={buildStorageUrl(img)} alt={acc.card_name} className="img-fluid rounded border bg-white" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                                                            ) : (
                                                                                <div className="bg-light rounded border d-flex align-items-center justify-content-center w-100 h-100">
                                                                                    <i className="ri-image-line text-muted" style={{ fontSize: '12px' }}></i>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <h6 className="mb-0 fs-13 fw-semibold text-dark">
                                                                                <span className="badge bg-secondary-subtle text-secondary me-2 font-size-10">#{index + 1}</span>
                                                                                {acc.card_name}
                                                                            </h6>
                                                                            <p className="mb-0 text-muted small">{acc.issuer}</p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-subtle-danger p-1 lh-1 rounded-circle"
                                                                        onClick={() => removeAccount(acc.id)}
                                                                        title="Remove from program"
                                                                    >
                                                                        <i className="ri-close-line fs-14"></i>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Available Accounts */}
                            <div className="col-lg-6">
                                <div className="card shadow-sm border border-light-subtle h-100" style={{ minHeight: '500px' }}>
                                    <div className="card-header border-bottom border-light-subtle bg-light bg-opacity-25 d-flex align-items-center justify-content-between py-3">
                                        <h5 className="card-title mb-0 fs-15"><i className="ri-list-check align-middle text-muted me-1 fs-18"></i> Available Cards</h5>
                                        <span className="badge bg-primary-subtle text-primary rounded-pill font-size-12">{filteredAvailable.length} Cards</span>
                                    </div>
                                    <div className="card-body d-flex flex-column p-3">
                                        <div className="search-box mb-3">
                                            <input
                                                type="text"
                                                className="form-control search bg-light border-light-subtle"
                                                placeholder="Search by name or lender..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                            <i className="ri-search-line search-icon"></i>
                                        </div>

                                        <div className="flex-grow-1 overflow-auto pe-1" style={{ maxHeight: '420px' }}>
                                            {filteredAvailable.length === 0 ? (
                                                <div className="text-center py-5 text-muted">
                                                    <i className="ri-filter-off-line fs-24 mb-2 text-warning"></i>
                                                    <p className="mb-0 fs-13">No matching cards available</p>
                                                </div>
                                            ) : (
                                                <div className="d-flex flex-column gap-2">
                                                    {filteredAvailable.map((acc) => {
                                                        const img = acc.full_image_url || acc.image_url;
                                                        return (
                                                            <div
                                                                key={acc.id}
                                                                draggable="true"
                                                                onDragStart={(e) => handleDragStartAvailable(e, acc)}
                                                                className="card border border-light-subtle mb-0 cursor-grab px-3 py-2 bg-light-subtle hover-shadow transition"
                                                                style={{ userSelect: 'none' }}
                                                            >
                                                                <div className="d-flex align-items-center justify-content-between">
                                                                    <div className="d-flex align-items-center gap-3">
                                                                        <div className="d-flex align-items-center justify-content-center" style={{ width: '45px', height: '28px', overflow: 'hidden' }}>
                                                                            {img ? (
                                                                                <img src={buildStorageUrl(img)} alt={acc.card_name} className="img-fluid rounded border bg-white" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                                                            ) : (
                                                                                <div className="bg-light rounded border d-flex align-items-center justify-content-center w-100 h-100">
                                                                                    <i className="ri-image-line text-muted" style={{ fontSize: '12px' }}></i>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <h6 className="mb-0 fs-13 fw-semibold text-dark">{acc.card_name}</h6>
                                                                            <p className="mb-0 text-muted small">{acc.issuer}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <span className="badge bg-light text-secondary border font-size-11">FICO {acc.typical_personal_fico_min}+</span>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-subtle-primary p-1 lh-1 rounded-circle"
                                                                            onClick={() => addAccount(acc)}
                                                                            title="Add program"
                                                                        >
                                                                            <i className="ri-add-line fs-14"></i>
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
                            </div>


                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
