import React from 'react';
import { useSearchParams, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { DataTable } from 'primereact/datatable';
import TableLoader from '../../../components/Loader/TableLoader';
import { Column } from 'primereact/column';
import { TIB_OPTIONS } from '../../../config/funding';
import { updateFundingSequencingVisibility, fetchFundingSequencingVisibilities, deleteFundingSequencingVisibilities } from '../../../modules/funding/services';
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import { toast } from 'react-toastify';

interface LenderVisibilityGridProps {
    visibilities: any[];
    setVisibilities: (visibilities: any[]) => void;
    lenders: any[];
    errors: any;
    setErrors: (callback: (prev: any) => any) => void;
    stateOptions: any[];
    industryTypes: any[];
    productCategories?: any[];
    onSelectionChange?: (count: number) => void;
    onBulkDelete?: () => void;
    externalBulkDelete?: boolean;
    onExternalBulkDeleteHandled?: () => void;
}

const getCategoryBadgeClass = (category: string) => {
    if (!category) return 'bg-light text-muted border-light';

    const colors = ['primary', 'success', 'info', 'warning', 'danger', 'secondary'];

    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colorIndex = Math.abs(hash) % colors.length;
    const color = colors[colorIndex];

    return `bg-${color}-subtle text-${color} border-${color}`;
};

const isRuleEmpty = (v: any) => {
    return !v.min_fico && 
           !v.min_tib_months && 
           !v.min_monthly_revenue && 
           !v.min_monthly_deposits && 
           !v.min_deposit_count && 
           !v.min_average_daily_balance && 
           !v.max_nsf_count && 
           !v.max_negative_days && 
           !v.min_dscr && 
           (!v.allowed_states || v.allowed_states.length === 0) && 
           (!v.restricted_states || v.restricted_states.length === 0) && 
           (!v.allowed_industries || v.allowed_industries.length === 0) && 
           (!v.restricted_industries || v.restricted_industries.length === 0);
};

export const LenderVisibilityGrid: React.FC<LenderVisibilityGridProps> = ({
    visibilities,
    setVisibilities,
    lenders,
    errors,
    setErrors,
    stateOptions = [],
    industryTypes = [],
    productCategories = [],
    onSelectionChange,
    onBulkDelete,
    externalBulkDelete,
    onExternalBulkDeleteHandled,
}) => {

    const location = useLocation();
    const navigate = useNavigate();
    const { id } = useParams();
    
    const lenderMatch = location.pathname.match(/\/lender\/(\d+)/);
    const categoryMatch = location.pathname.match(/\/category\/(\w+)/);

    const urlLenderId = lenderMatch ? lenderMatch[1] : null;
    const activeLenderId = urlLenderId ? parseInt(urlLenderId, 10) : null;

    const urlCategoryId = categoryMatch ? categoryMatch[1] : null;
    const activeCategoryId = urlCategoryId === 'general' ? 'general' : (urlCategoryId ? parseInt(urlCategoryId, 10) : null);

    // Local states
    const [localActiveLenderId, setLocalActiveLenderId] = React.useState<number | null>(activeLenderId);
    const [localActiveCategoryId, setLocalActiveCategoryId] = React.useState<string | number | null>(activeCategoryId);

    const syncUrlQuietly = (lenderId: number | null, categoryId: string | number | null) => {
        const visibilityUrl = `/funding/visibility-rules/${id}`;
        let newUrl = visibilityUrl;
        if (lenderId !== null) {
            newUrl += `/lender/${lenderId}`;
            if (categoryId !== null) {
                newUrl += `/category/${categoryId}`;
            }
        }
        navigate(newUrl, { replace: true, preventScrollReset: true });
    };

    // Sync local state when URL changes (e.g. direct URL load or Back navigation)
    React.useEffect(() => {
        if (localActiveLenderId !== null && localActiveLenderId !== activeLenderId) {
            const currentLenderRules = visibilities.filter(v => String(v.lender_id) === String(localActiveLenderId));
            if (currentLenderRules.length > 0 && currentLenderRules.every(isRuleEmpty)) {
                setVisibilities(visibilities.filter(v => String(v.lender_id) !== String(localActiveLenderId)));
            }
        }
        setLocalActiveLenderId(activeLenderId);
        setLocalActiveCategoryId(activeCategoryId);
    }, [activeLenderId, activeCategoryId, visibilities]);
    const [detailsLoading, setDetailsLoading] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [lenderToDelete, setLenderToDelete] = React.useState<number | null>(null);
    const [selectedMasterLenders, setSelectedMasterLenders] = React.useState<any[]>([]);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = React.useState(false);

    // Notify parent of selection count changes
    React.useEffect(() => {
        onSelectionChange?.(selectedMasterLenders.length);
    }, [selectedMasterLenders.length]);

    // Open bulk delete modal when parent triggers it
    React.useEffect(() => {
        if (externalBulkDelete) {
            setShowBulkDeleteModal(true);
            onExternalBulkDeleteHandled?.();
        }
    }, [externalBulkDelete]);
    const [globalFilter, setGlobalFilter] = React.useState('');

    const isAddingUrl = location.pathname.includes('/configuration');
    const isFormView = activeLenderId !== null || isAddingUrl;

    // Clear selections when navigating between master list and details
    React.useEffect(() => {
        setSelectedMasterLenders([]);
    }, [urlLenderId, id]);


    const validVisibilities = visibilities.filter(v => v.lender_id != null);

    const [lazyState, setLazyState] = React.useState({
        first: 0,
        rows: 10,
        page: 1,
        sortField: 'id',
        sortOrder: -1,
    });
    const [totalRecords, setTotalRecords] = React.useState(0);
    const [loading, setLoading] = React.useState(false);
    const [apiVisibilities, setApiVisibilities] = React.useState<any[]>([]);

    const sequenceLenders = React.useMemo(() => {
        const lenderIds = Array.from(new Set(validVisibilities.map(v => String(v.lender_id))));
        return lenders.filter(l => lenderIds.includes(String(l.id)));
    }, [validVisibilities, lenders]);

    const sequenceCategories = React.useMemo(() => {
        const categoryIds = Array.from(new Set(validVisibilities.map(v => String(v.lender_product_category_id)).filter(id => id !== 'null' && id !== '')));
        return productCategories?.filter(c => categoryIds.includes(String(c.id))) || [];
    }, [validVisibilities, productCategories]);

    const visibilityUrl = `/funding/visibility-rules/${id}`;

    const setActiveLenderIdAndCategory = (lenderId: number | null, categoryId: string | number | null = null) => {
        if (lenderId === null) {
            navigate(visibilityUrl);
        } else {
            const catPath = categoryId !== null ? `/category/${categoryId}` : '';
            navigate(`${visibilityUrl}/lender/${lenderId}${catPath}`);
        }
    };

    // Show skeleton loader when lender changes in form view
    React.useEffect(() => {
        if (localActiveLenderId !== null) {
            setDetailsLoading(true);
            const timer = setTimeout(() => {
                setDetailsLoading(false);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [localActiveLenderId]);
    const blocks: { lenderId: number | null, nullId: number, rows: { item: any, index: number }[] }[] = [];
    let nullCounter = 0;

    visibilities.forEach((v, index) => {
        if (v.lender_id) {
            let block = blocks.find(b => b.lenderId === v.lender_id);
            if (!block) {
                block = { lenderId: v.lender_id, nullId: -1, rows: [] };
                blocks.push(block);
            }
            block.rows.push({ item: v, index });
        }
    });

    const selectedLenderIds = blocks.map(b => b.lenderId).filter(Boolean) as number[];

    const onAddLenderBlock = (newLenderId: number | string) => {
        if (!newLenderId) return;

        const lender = lenders.find(l => String(l.id) === String(newLenderId));
        const categories = lender?.product_categories || [];

        let newRows: any[] = [];
        if (categories.length > 0) {
            categories.forEach((catName: string) => {
                const catObj = productCategories.find((c: any) => c.name === catName);
                newRows.push({
                    lender_id: newLenderId,
                    lender_product_category_id: catObj ? catObj.id : catName,
                    product_category: catName,
                    min_fico: '',
                    min_tib_months: '',
                    min_monthly_revenue: '',
                    min_monthly_deposits: '',
                    min_deposit_count: '',
                    min_average_daily_balance: '',
                    max_nsf_count: '',
                    max_negative_days: '',
                    min_dscr: '',
                    allowed_states: [],
                    restricted_states: [],
                    allowed_industries: [],
                    restricted_industries: []
                });
            });
        } else {
            newRows.push({
                lender_id: newLenderId,
                lender_product_category_id: '',
                min_fico: '',
                min_tib_months: '',
                min_monthly_revenue: '',
                min_monthly_deposits: '',
                min_deposit_count: '',
                min_average_daily_balance: '',
                max_nsf_count: '',
                max_negative_days: '',
                min_dscr: '',
                allowed_states: [],
                restricted_states: [],
                allowed_industries: [],
                restricted_industries: []
            });
        }

        setVisibilities([...visibilities, ...newRows]);
    };

    React.useEffect(() => {
        if (localActiveLenderId !== null && id && lenders.length > 0) {
            const lender = lenders.find(l => String(l.id) === String(localActiveLenderId));
            if (!lender) return;

            if (localActiveCategoryId !== null) {
                // Single category edit mode: ensure only this specific category rule exists
                const targetCatId = localActiveCategoryId === 'general' ? null : localActiveCategoryId;
                const hasRule = visibilities.some(v => {
                    if (String(v.lender_id) !== String(localActiveLenderId)) return false;
                    const vCatId = v.lender_product_category_id;
                    if (targetCatId === null) {
                        return vCatId === null || vCatId === '';
                    } else {
                        return String(vCatId) === String(targetCatId);
                    }
                });

                if (!hasRule) {
                    let catName = '';
                    if (targetCatId !== null) {
                        const catObj = productCategories.find((c: any) => String(c.id) === String(targetCatId));
                        catName = catObj ? catObj.name : String(targetCatId);
                    }
                    const newRow = {
                        lender_id: localActiveLenderId,
                        lender_product_category_id: targetCatId || '',
                        product_category: catName,
                        min_fico: '',
                        min_tib_months: '',
                        min_monthly_revenue: '',
                        min_monthly_deposits: '',
                        min_deposit_count: '',
                        min_average_daily_balance: '',
                        max_nsf_count: '',
                        max_negative_days: '',
                        min_dscr: '',
                        allowed_states: [],
                        restricted_states: [],
                        allowed_industries: [],
                        restricted_industries: []
                    };
                    setVisibilities([...visibilities, newRow]);
                }
            } else {
                // Lender-wide edit mode (from dropdown): ensure rules for ALL categories of this lender exist
                const categories = lender.product_categories || [];
                const newRows: any[] = [];

                if (categories.length > 0) {
                    categories.forEach((catName: string) => {
                        const catObj = productCategories.find((c: any) => c.name === catName);
                        const catId = catObj ? catObj.id : catName;
                        
                        const hasRule = visibilities.some(v => {
                            if (String(v.lender_id) !== String(localActiveLenderId)) return false;
                            return String(v.lender_product_category_id) === String(catId);
                        });

                        if (!hasRule) {
                            newRows.push({
                                lender_id: localActiveLenderId,
                                lender_product_category_id: catId,
                                product_category: catName,
                                min_fico: '',
                                min_tib_months: '',
                                min_monthly_revenue: '',
                                min_monthly_deposits: '',
                                min_deposit_count: '',
                                min_average_daily_balance: '',
                                max_nsf_count: '',
                                max_negative_days: '',
                                min_dscr: '',
                                allowed_states: [],
                                restricted_states: [],
                                allowed_industries: [],
                                restricted_industries: []
                            });
                        }
                    });
                } else {
                    const hasGeneral = visibilities.some(v => {
                        if (String(v.lender_id) !== String(localActiveLenderId)) return false;
                        return v.lender_product_category_id === null || v.lender_product_category_id === '';
                    });

                    if (!hasGeneral) {
                        newRows.push({
                            lender_id: localActiveLenderId,
                            lender_product_category_id: '',
                            product_category: '',
                            min_fico: '',
                            min_tib_months: '',
                            min_monthly_revenue: '',
                            min_monthly_deposits: '',
                            min_deposit_count: '',
                            min_average_daily_balance: '',
                            max_nsf_count: '',
                            max_negative_days: '',
                            min_dscr: '',
                            allowed_states: [],
                            restricted_states: [],
                            allowed_industries: [],
                            restricted_industries: []
                        });
                    }
                }

                if (newRows.length > 0) {
                    setVisibilities([...visibilities, ...newRows]);
                }
            }
        }
    }, [localActiveLenderId, localActiveCategoryId, visibilities, lenders, productCategories, id]);


    const onRemoveBlock = (lenderId: number) => {
        setLenderToDelete(lenderId);
    };

    const confirmRemoveBlock = async () => {
        if (lenderToDelete === null && selectedMasterLenders.length === 0) return;

        let newVisibilities = [...visibilities];
        let deletedIds: string[] = [];

        if (lenderToDelete !== null) {
            deletedIds = [String(lenderToDelete)];
            newVisibilities = visibilities.filter(v => String(v.lender_id) !== String(lenderToDelete));
        } else {
            newVisibilities = visibilities.filter((v) => {
                const isSelected = selectedMasterLenders.some(selected => {
                    if (v.id && selected.id) return String(v.id) === String(selected.id);
                    return String(v.lender_id) === String(selected.lender_id) &&
                        String(v.lender_product_category_id) === String(selected.lender_product_category_id);
                });
                return !isSelected;
            });
            const remainingLenderIds = newVisibilities.map(v => String(v.lender_id));
            selectedMasterLenders.forEach(l => {
                if (!remainingLenderIds.includes(String(l.lender_id))) {
                    deletedIds.push(String(l.lender_id));
                }
            });
        }

        // Backend API delete (edit mode only)
        if (id && !isFormView) {
            let visibilityIdsToDelete: (string | number)[] = [];
            if (lenderToDelete !== null) {
                visibilityIdsToDelete = visibilities.filter(v => String(v.lender_id) === String(lenderToDelete) && v.id).map(v => v.id);
            } else {
                visibilityIdsToDelete = selectedMasterLenders.filter(l => l.id).map(l => l.id);
            }

            if (visibilityIdsToDelete.length > 0) {
                try {
                    setIsDeleting(true);
                    await deleteFundingSequencingVisibilities(id, { visibility_ids: visibilityIdsToDelete });
                    toast.success("Visibility rules removed successfully.");
                    setLenderToDelete(null);
                    setShowBulkDeleteModal(false);
                    setSelectedMasterLenders([]);
                    fetchBackendVisibilities();
                } catch (err: any) {
                    console.error("Failed to sync deletion with backend", err);
                    toast.error(err?.response?.data?.message || "Failed to delete.");
                } finally {
                    setIsDeleting(false);
                }
            }
            return;
        }

        setVisibilities(newVisibilities);

        if (setErrors) {
            setErrors((prev: any) => {
                if (!prev) return prev;
                const newErrors = { ...prev };
                // We'll clear errors based on lender IDs if possible, but exact mapping is complex
                // when removing specific categories, so we'll just clear the lender's errors if they were deleted entirely
                if (deletedIds.length > 0) {
                    visibilities.forEach((v, idx) => {
                        if (deletedIds.includes(String(v.lender_id))) {
                            Object.keys(newErrors).forEach(key => {
                                if (key.startsWith(`lender_visibilities.${idx}.`)) delete newErrors[key];
                            });
                        }
                    });
                }
                return newErrors;
            });
        }

        if (lenderToDelete !== null && activeLenderId === lenderToDelete) {
            setActiveLenderIdAndCategory(null);
        } else if (activeLenderId !== null && deletedIds.includes(String(activeLenderId))) {
            setActiveLenderIdAndCategory(null);
        }

        setLenderToDelete(null);
        setShowBulkDeleteModal(false);
        setSelectedMasterLenders([]);

        toast.success('Visibility logic removed successfully!');
    };

    const onRemoveRow = (index: number) => {
        const newVisibilities = [...visibilities];
        newVisibilities.splice(index, 1);
        setVisibilities(newVisibilities);

        if (setErrors) {
            setErrors((prev: any) => {
                if (!prev) return prev;
                const newErrors = { ...prev };
                Object.keys(newErrors).forEach(key => {
                    if (key.startsWith(`lender_visibilities.${index}.`)) {
                        delete newErrors[key];
                    }
                });
                return newErrors;
            });
        }
    };



    const onChange = (index: number, field: string, value: any) => {
        const newVisibilities = [...visibilities];
        newVisibilities[index] = { ...newVisibilities[index], [field]: value };
        setVisibilities(newVisibilities);

        if (setErrors && errors[`lender_visibilities.${index}.${field}`]) {
            setErrors((prev: any) => {
                const newErrors = { ...prev };
                delete newErrors[`lender_visibilities.${index}.${field}`];
                return newErrors;
            });
        }
    };

    const renderError = (field: string, i: number) => {
        const errorMsg = errors?.[`lender_visibilities.${i}.${field}`];
        if (errorMsg) {
            return <div className="text-danger mt-1 text-wrap" style={{ fontSize: '11px', lineHeight: '1.3' }}>{errorMsg}</div>;
        }
        return null;
    };


    const availableLenders = lenders.filter(l => !selectedLenderIds.some(id => String(id) === String(l.id)));

    const lenderOptionTemplate = (option: any) => {
        const isSelected = selectedLenderIds.some(id => String(id) === String(option.id));
        if (isSelected) {
            return (
                <div className="d-flex align-items-center justify-content-between w-100 pe-2">
                    <span className="text-success fw-bold">{option.name}</span>
                    <i className="ri-check-line text-success fw-bold" style={{ fontSize: '18px' }}></i>
                </div>
            );
        }
        return (
            <div className="d-flex align-items-center w-100">
                <span>{option.name}</span>
            </div>
        );
    };

    const handleLenderSelect = (e: any) => {
        const lenderId = e.value;
        if (!selectedLenderIds.some(id => String(id) === String(lenderId))) {
            onAddLenderBlock(lenderId);
        } else {
            setActiveLenderIdAndCategory(lenderId);
        }
    };
    const [search, setSearch] = React.useState('');

    const [filterLenderId, setFilterLenderId] = React.useState<string | null>(null);
    const [filterCategoryId, setFilterCategoryId] = React.useState<string | null>(null);
    const [appliedLenderId, setAppliedLenderId] = React.useState<string | null>(null);
    const [appliedCategoryId, setAppliedCategoryId] = React.useState<string | null>(null);

    const handleApplyFilters = () => {
        setGlobalFilter(search);
        setAppliedLenderId(filterLenderId);
        setAppliedCategoryId(filterCategoryId);
        setLazyState(prev => ({ ...prev, first: 0, page: 1 }));
    };

    const handleClearFilters = () => {
        setSearch('');
        setGlobalFilter('');
        setFilterLenderId(null);
        setFilterCategoryId(null);
        setAppliedLenderId(null);
        setAppliedCategoryId(null);
        setLazyState(prev => ({ ...prev, first: 0, page: 1 }));
    };

    const fetchBackendVisibilities = React.useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const payload = {
                ...lazyState,
                search: globalFilter,
                lender_id: appliedLenderId,
                lender_product_category_id: appliedCategoryId
            };
            const res = await fetchFundingSequencingVisibilities(id, payload);
            if (res?.data) {
                setApiVisibilities(res.data);
                setTotalRecords(res.meta?.total || res.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch visibilities', error);
        } finally {
            setLoading(false);
        }
    }, [id, lazyState, globalFilter, appliedLenderId, appliedCategoryId]);

    React.useEffect(() => {
        if (id && !isFormView) {
            fetchBackendVisibilities();
        }
    }, [fetchBackendVisibilities, id, isFormView]);

    const onPage = (event: any) => {
        setLazyState(prev => ({
            ...prev,
            first: event.first,
            rows: event.rows,
            page: event.page + 1
        }));
    };

    const onSort = (event: any) => {
        setLazyState(prev => ({
            ...prev,
            sortField: event.sortField,
            sortOrder: event.sortOrder
        }));
    };

    const displayVisibilities = id ? apiVisibilities : validVisibilities.filter(v => {
        if (appliedLenderId && String(v.lender_id) !== String(appliedLenderId)) return false;
        if (appliedCategoryId && String(v.lender_product_category_id) !== String(appliedCategoryId)) return false;
        return true;
    });

    // ...

    return (
        <div className="card shadow-sm border-0 rounded-3 mb-4 overflow-hidden" style={{ maxWidth: '100%' }}>
            {!isFormView ? null : (
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center gap-2">
                            <label className="mb-0 fw-bold fs-15 text-dark text-nowrap">
                                Lender:
                            </label>
                            <Dropdown
                                value={localActiveLenderId}
                                options={lenders}
                                onChange={(e) => {
                                    const nextLenderId = e.value;
                                    let cleanedVisibilities = visibilities;
                                    if (localActiveLenderId !== null) {
                                        const currentLenderRules = visibilities.filter(v => String(v.lender_id) === String(localActiveLenderId));
                                        if (currentLenderRules.length > 0 && currentLenderRules.every(isRuleEmpty)) {
                                            cleanedVisibilities = visibilities.filter(v => String(v.lender_id) !== String(localActiveLenderId));
                                        }
                                    }
                                    setVisibilities(cleanedVisibilities);
                                    setLocalActiveLenderId(nextLenderId);
                                    setLocalActiveCategoryId(null);
                                    syncUrlQuietly(nextLenderId, null);
                                }}
                                optionLabel="name"
                                optionValue="id"
                                placeholder="Please select a lender"
                                filter
                                filterBy="name"
                                className="w-100 employee-filter-dropdown"
                                style={{ minWidth: '200px' }}
                                itemTemplate={lenderOptionTemplate}
                            />
                        </div>
                    </div>

                </div>
            )}

            <div className="card-body">

                {!isFormView && validVisibilities.length === 0 && (
                    <div className="d-flex flex-column justify-content-center align-items-center py-5 my-3" style={{ minHeight: '300px' }}>
                        <div className="mb-4">
                            <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle shadow-sm" style={{ width: '80px', height: '80px' }}>
                                <i className="ri-file-list-3-line" style={{ fontSize: '32px' }}></i>
                            </div>
                        </div>
                        <h5 className="fs-18 fw-semibold text-dark mb-2">No Visibility Logic Configured</h5>
                        <p className="text-muted fs-14 text-center mb-0" style={{ maxWidth: '450px', lineHeight: '1.6' }}>
                            You haven't added any visibility logic yet. Click "Add Visibility Logic" above to configure rules for a lender.
                        </p>
                    </div>
                )}

                {!isFormView && validVisibilities.length > 0 && (
                    <div className="card-body px-0 pt-0">
                        <div className="row g-3 mb-3">
                            <div className="col-xxl-3 col-sm-12">
                                <div className="search-box">
                                    <input
                                        type="text"
                                        className="form-control search bg-light border-light"
                                        placeholder="Search visibility rules..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleApplyFilters();
                                            }
                                        }}
                                    />
                                    <i className="ri-search-line search-icon"></i>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-sm-4">
                                <Dropdown
                                    value={filterLenderId}
                                    options={[{ id: '', name: 'All Lenders' }, ...sequenceLenders]}
                                    onChange={(e) => setFilterLenderId(e.value)}
                                    optionLabel="name"
                                    optionValue="id"
                                    placeholder="Filter by Lender"
                                    className="w-100 employee-filter-dropdown"
                                    filter
                                    filterBy="name"
                                />
                            </div>
                            <div className="col-xxl-3 col-sm-4">
                                <Dropdown
                                    value={filterCategoryId}
                                    options={[{ id: '', name: 'All Categories' }, ...sequenceCategories]}
                                    onChange={(e) => setFilterCategoryId(e.value)}
                                    optionLabel="name"
                                    optionValue="id"
                                    placeholder="Filter by Category"
                                    className="w-100 employee-filter-dropdown"
                                    filter
                                    filterBy="name"
                                />
                            </div>
                            <div className="col-xxl-3 col-sm-4">
                                <div className="d-flex gap-2 h-100">
                                    <button type="button" className="btn btn-info flex-grow-1" onClick={handleApplyFilters}>
                                        <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                    </button>
                                    <button type="button" className="btn btn-light flex-grow-1" onClick={handleClearFilters}>
                                        <i className="ri-close-line me-1 align-bottom"></i> Clear
                                    </button>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <TableLoader rows={11} />
                        ) : (
                            <div className="table-responsive table-card custom-scrollbar-wrapper mt-1">
                                <DataTable
                                    scrollable
                                    lazy={!!id}
                                    value={displayVisibilities.map((v, i) => {
                                        const lender = lenders.find(l => String(l.id) === String(v.lender_id));
                                        const category = productCategories?.find(c => String(c.id) === String(v.lender_product_category_id));
                                        const lenderName = lender?.name || 'Unknown Lender';
                                        const catName = category?.name || 'Unknown Category';
                                        const _tibMonths = String(TIB_OPTIONS.find(t => String(t.value) === String(v.min_tib_months))?.label || v.min_tib_months || '');
                                        const _minRevenue = v.min_monthly_revenue ? `$${v.min_monthly_revenue}` : '';
                                        const _minDeposits = v.min_monthly_deposits ? `$${v.min_monthly_deposits}` : '';

                                        const _allowedStates = (v.allowed_states || []).map((s: string) => stateOptions.find(opt => opt.value === s)?.label || s).join(', ');
                                        const _restrictedStates = (v.restricted_states || []).map((s: string) => stateOptions.find(opt => opt.value === s)?.label || s).join(', ');
                                        const _allowedIndustries = (v.allowed_industries || []).map((s: string) => industryTypes.find(opt => opt.value === s)?.label || s).join(', ');
                                        const _restrictedIndustries = (v.restricted_industries || []).map((s: string) => industryTypes.find(opt => opt.value === s)?.label || s).join(', ');

                                        return {
                                            ...v,
                                            _tmpId: i,
                                            _lenderName: lenderName,
                                            _categoryName: catName,
                                            _tibMonths,
                                            _minRevenue,
                                            _minDeposits,
                                            _allowedStates,
                                            _restrictedStates,
                                            _allowedIndustries,
                                            _restrictedIndustries
                                        };
                                    }).filter(v => id ? true : (
                                        (!globalFilter || (
                                            (v._lenderName || '').toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v._categoryName || '').toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v.min_fico || '').toString().toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v._tibMonths || '').toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v._minRevenue || '').toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v._minDeposits || '').toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v.min_deposit_count || '').toString().toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v.min_average_daily_balance || '').toString().toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v.max_nsf_count || '').toString().toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v.max_negative_days || '').toString().toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v.min_dscr || '').toString().toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v._allowedStates || '').toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v._restrictedStates || '').toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v._allowedIndustries || '').toLowerCase().includes(globalFilter.toLowerCase()) ||
                                            (v._restrictedIndustries || '').toLowerCase().includes(globalFilter.toLowerCase())
                                        ))
                                    ))}
                                    first={lazyState.first}
                                    rows={lazyState.rows}
                                    totalRecords={id ? totalRecords : displayVisibilities.length}
                                    onPage={onPage}
                                    onSort={onSort}
                                    sortField={lazyState.sortField}
                                    sortOrder={lazyState.sortOrder as any}
                                    selection={selectedMasterLenders}
                                    onSelectionChange={(e: any) => setSelectedMasterLenders(e.value)}
                                    dataKey={id ? "id" : "_tmpId"}
                                    emptyMessage="No visibility logic found"
                                    onRowClick={(e: any) => {
                                        const target = e.originalEvent.target as HTMLElement;
                                        if (!target.closest('.p-checkbox') && !target.closest('.p-selection-column') && target.tagName !== 'INPUT') {
                                            const catId = e.data.lender_product_category_id || 'general';
                                            setActiveLenderIdAndCategory(e.data.lender_id, catId);
                                            if (setErrors) setErrors(() => ({}));
                                            setSelectedMasterLenders([]);
                                        }
                                    }}
                                    rowClassName={() => 'cursor-pointer'}
                                    globalFilter={!id ? globalFilter : undefined}
                                    paginator
                                >
                                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                                    <Column field="_lenderName" header="Lender Name" sortable style={{ minWidth: '180px' }} className="fw-medium text-dark" />
                                    <Column field="_categoryName" header="Category" sortable style={{ minWidth: '150px' }} body={(rowData: any) => {
                                        const catName = rowData._categoryName;
                                        const badgeClass = getCategoryBadgeClass(catName !== 'General' ? catName : '');
                                        return catName !== 'General' ? <span className={`badge ${badgeClass} px-2 py-1 fs-12 rounded-1 fw-semibold d-inline-flex align-items-center`}>{catName}</span> : <span className="text-muted fw-medium fs-13">General</span>;
                                    }} />
                                    <Column field="min_fico" header="Min FICO" sortable style={{ minWidth: '110px' }} />
                                    <Column field="min_tib_months" header="Min TIB" sortable style={{ minWidth: '120px' }} body={(rowData: any) => TIB_OPTIONS.find(t => t.value === rowData.min_tib_months)?.label || rowData.min_tib_months || ''} />
                                    <Column field="min_monthly_revenue" header="Min Revenue" sortable style={{ minWidth: '130px' }} body={(rowData: any) => rowData.min_monthly_revenue ? `$${rowData.min_monthly_revenue}` : ''} />
                                    <Column field="min_monthly_deposits" header="Min Deposits" sortable style={{ minWidth: '130px' }} body={(rowData: any) => rowData.min_monthly_deposits ? `$${rowData.min_monthly_deposits}` : ''} />
                                    <Column field="min_deposit_count" header="Min Dep Count" sortable style={{ minWidth: '140px' }} />
                                    <Column field="min_average_daily_balance" header="Min Avg Bal" sortable style={{ minWidth: '140px' }} body={(rowData: any) => rowData.min_average_daily_balance ? `$${rowData.min_average_daily_balance}` : ''} />
                                    <Column field="max_nsf_count" header="Max NSF" sortable style={{ minWidth: '110px' }} />
                                    <Column field="max_negative_days" header="Max Neg Days" sortable style={{ minWidth: '140px' }} />
                                </DataTable>
                            </div>
                        )}
                    </div>
                )}

                {isFormView && (
                    <div className="card border border-light-subtle rounded-3 mb-0 bg-white shadow-sm">
                        <div className="card-body p-4">
                            {localActiveLenderId === null ? (
                                <div className="text-center py-5">
                                    <div className="d-flex flex-column align-items-center justify-content-center">
                                        <i className="ri-error-warning-line text-muted mb-3" style={{ fontSize: '48px' }}></i>
                                        <h5 className="text-muted fw-semibold fs-16">No Visibility logic setup</h5>
                                        <p className="text-muted fs-14 mb-0">Please select a lender from the dropdown above to configure its visibility rules.</p>
                                    </div>
                                </div>
                            ) : detailsLoading ? (
                                <TableLoader rows={6} />
                            ) : (
                                <div className="table-responsive custom-scrollbar-wrapper pb-3">
                                    <table className="table table-borderless table-nowrap align-middle mb-0" style={{ minWidth: 'max-content' }}>
                                        <thead className="text-muted fs-12 fw-semibold" style={{ borderBottom: '2px solid #f3f6f9' }}>
                                            <tr>
                                                <th style={{ width: '220px', paddingLeft: 0 }}>Lender <span className="text-danger">*</span></th>
                                                <th style={{ width: '220px' }}>Product Category <span className="text-danger">*</span></th>
                                                <th style={{ width: '150px' }}>Min FICO <span className="text-danger">*</span></th>
                                                <th style={{ width: '180px' }}>Min Time In Business <span className="text-danger">*</span></th>
                                                <th style={{ width: '200px' }}>Min Monthly Revenue <span className="text-danger">*</span></th>
                                                <th style={{ width: '200px' }}>Min Monthly Deposits <span className="text-danger">*</span></th>
                                                <th style={{ width: '160px' }}>Min Deposit Count <span className="text-danger">*</span></th>
                                                <th style={{ width: '200px' }}>Min Avg Daily Bal <span className="text-danger">*</span></th>
                                                <th style={{ width: '150px' }}>Max NSF Count <span className="text-danger">*</span></th>
                                                <th style={{ width: '160px' }}>Max Negative Days <span className="text-danger">*</span></th>
                                                <th style={{ width: '120px' }}>Min DSCR</th>
                                                <th style={{ width: '250px' }}>Allowed States</th>
                                                <th style={{ width: '250px' }}>Restricted States</th>
                                                <th style={{ width: '250px' }}>Allowed Industries</th>
                                                <th style={{ width: '250px' }}>Restricted Industries</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibilities.map((v, i) => {
                                                if (v.lender_id == null) return null;
                                                if (localActiveLenderId !== null && String(v.lender_id) !== String(localActiveLenderId)) return null;

                                                if (localActiveCategoryId !== null) {
                                                    const vCatId = v.lender_product_category_id;
                                                    if (localActiveCategoryId === 'general') {
                                                        if (vCatId !== null && vCatId !== '') return null;
                                                    } else {
                                                        if (String(vCatId) !== String(localActiveCategoryId)) return null;
                                                    }
                                                }
                                                const lender = lenders.find(l => l.id === v.lender_id);
                                                const categoryName = v.product_category || productCategories.find((c: any) => String(c.id) === String(v.lender_product_category_id))?.name;
                                                const badgeClass = getCategoryBadgeClass(categoryName || '');

                                                return (
                                                    <tr key={i} style={{ borderBottom: '1px dashed #e9ebec' }}>
                                                        <td className="py-3" style={{ paddingLeft: 0 }}>
                                                            <div className="fw-semibold text-dark fs-13">{lender?.name || 'Unknown'}</div>
                                                        </td>
                                                        <td className="py-3">
                                                            {categoryName ? (
                                                                <div className={`badge ${badgeClass} px-3 py-2 fs-13 rounded-1 fw-semibold d-inline-flex align-items-center text-nowrap`}>
                                                                    <i className="ri-bank-card-line me-2 fs-14"></i> {categoryName}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted fw-medium fs-13">General</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3">
                                                            <input
                                                                type="number"
                                                                className={`form-control shadow-none rounded-2 ${(errors as any)[`lender_visibilities.${i}.min_fico`] ? 'is-invalid' : ''}`}
                                                                placeholder="640"
                                                                value={v.min_fico || ''}
                                                                onChange={(e) => onChange(i, 'min_fico', e.target.value)}
                                                            />
                                                            {renderError('min_fico', i)}
                                                        </td>
                                                        <td className="py-3">
                                                            <Dropdown
                                                                value={v.min_tib_months}
                                                                options={TIB_OPTIONS}
                                                                onChange={(e) => onChange(i, 'min_tib_months', e.value)}
                                                                optionLabel="label"
                                                                optionValue="value"
                                                                placeholder="12 months"
                                                                className={`w-100 slim-dropdown rounded-2 shadow-none ${(errors as any)[`lender_visibilities.${i}.min_tib_months`] ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                            {renderError('min_tib_months', i)}
                                                        </td>
                                                        <td className="py-3">
                                                            <div className="input-group">
                                                                <span
                                                                    className={`input-group-text bg-white border-end-0 ${(errors as any)[`lender_visibilities.${i}.min_monthly_revenue`] ? 'text-danger' : 'text-muted'}`}
                                                                    style={(errors as any)[`lender_visibilities.${i}.min_monthly_revenue`] ? { borderColor: '#f06548' } : undefined}
                                                                >$</span>
                                                                <input
                                                                    type="number"
                                                                    className={`form-control shadow-none rounded-end-2 ${(errors as any)[`lender_visibilities.${i}.min_monthly_revenue`] ? 'is-invalid' : 'border-start-0'}`}
                                                                    placeholder="12000.00"
                                                                    value={v.min_monthly_revenue || ''}
                                                                    onChange={(e) => onChange(i, 'min_monthly_revenue', e.target.value)}
                                                                />
                                                            </div>
                                                            {renderError('min_monthly_revenue', i)}
                                                        </td>
                                                        <td className="py-3">
                                                            <div className="input-group">
                                                                <span
                                                                    className={`input-group-text bg-white border-end-0 ${(errors as any)[`lender_visibilities.${i}.min_monthly_deposits`] ? 'text-danger' : 'text-muted'}`}
                                                                    style={(errors as any)[`lender_visibilities.${i}.min_monthly_deposits`] ? { borderColor: '#f06548' } : undefined}
                                                                >$</span>
                                                                <input
                                                                    type="number"
                                                                    className={`form-control shadow-none rounded-end-2 ${(errors as any)[`lender_visibilities.${i}.min_monthly_deposits`] ? 'is-invalid' : 'border-start-0'}`}
                                                                    placeholder="12000.00"
                                                                    value={v.min_monthly_deposits || ''}
                                                                    onChange={(e) => onChange(i, 'min_monthly_deposits', e.target.value)}
                                                                />
                                                            </div>
                                                            {renderError('min_monthly_deposits', i)}
                                                        </td>
                                                        <td className="py-3">
                                                            <input
                                                                type="number"
                                                                className={`form-control shadow-none rounded-2 ${(errors as any)[`lender_visibilities.${i}.min_deposit_count`] ? 'is-invalid' : ''}`}
                                                                placeholder="100"
                                                                value={v.min_deposit_count || ''}
                                                                onChange={(e) => onChange(i, 'min_deposit_count', e.target.value)}
                                                            />
                                                            {renderError('min_deposit_count', i)}
                                                        </td>
                                                        <td className="py-3">
                                                            <div className="input-group">
                                                                <span
                                                                    className={`input-group-text bg-white border-end-0 ${(errors as any)[`lender_visibilities.${i}.min_average_daily_balance`] ? 'text-danger' : 'text-muted'}`}
                                                                    style={(errors as any)[`lender_visibilities.${i}.min_average_daily_balance`] ? { borderColor: '#f06548' } : undefined}
                                                                >$</span>
                                                                <input
                                                                    type="number"
                                                                    className={`form-control shadow-none rounded-end-2 ${(errors as any)[`lender_visibilities.${i}.min_average_daily_balance`] ? 'is-invalid' : 'border-start-0'}`}
                                                                    placeholder="4000.00"
                                                                    value={v.min_average_daily_balance || ''}
                                                                    onChange={(e) => onChange(i, 'min_average_daily_balance', e.target.value)}
                                                                />
                                                            </div>
                                                            {renderError('min_average_daily_balance', i)}
                                                        </td>
                                                        <td className="py-3">
                                                            <input
                                                                type="number"
                                                                className={`form-control shadow-none rounded-2 ${(errors as any)[`lender_visibilities.${i}.max_nsf_count`] ? 'is-invalid' : ''}`}
                                                                placeholder="4"
                                                                value={v.max_nsf_count || ''}
                                                                onChange={(e) => onChange(i, 'max_nsf_count', e.target.value)}
                                                            />
                                                            {renderError('max_nsf_count', i)}
                                                        </td>
                                                        <td className="py-3">
                                                            <input
                                                                type="number"
                                                                className={`form-control shadow-none rounded-2 ${(errors as any)[`lender_visibilities.${i}.max_negative_days`] ? 'is-invalid' : ''}`}
                                                                placeholder="4"
                                                                value={v.max_negative_days || ''}
                                                                onChange={(e) => onChange(i, 'max_negative_days', e.target.value)}
                                                            />
                                                            {renderError('max_negative_days', i)}
                                                        </td>
                                                        <td className="py-3">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className={`form-control shadow-none rounded-2 ${(errors as any)[`lender_visibilities.${i}.min_dscr`] ? 'is-invalid' : ''}`}
                                                                placeholder="1.25"
                                                                value={v.min_dscr || ''}
                                                                onChange={(e) => onChange(i, 'min_dscr', e.target.value)}
                                                            />
                                                            {renderError('min_dscr', i)}
                                                        </td>
                                                        <td className="py-3">
                                                            <MultiSelect
                                                                value={v.allowed_states}
                                                                options={stateOptions}
                                                                onChange={(e) => onChange(i, 'allowed_states', e.value)}
                                                                optionLabel="label"
                                                                optionValue="value"
                                                                placeholder="Select states"
                                                                filter
                                                                display="chip"
                                                                panelStyle={{ maxWidth: '350px' }}
                                                                className={`w-100 slim-multiselect rounded-3 shadow-none ${(errors as any)[`lender_visibilities.${i}.allowed_states`] ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                            {renderError('allowed_states', i)}
                                                        </td>
                                                        <td className="py-3">
                                                            <MultiSelect
                                                                value={v.restricted_states}
                                                                options={stateOptions}
                                                                onChange={(e) => onChange(i, 'restricted_states', e.value)}
                                                                optionLabel="label"
                                                                optionValue="value"
                                                                placeholder="Blocked states"
                                                                filter
                                                                display="chip"
                                                                panelStyle={{ maxWidth: '350px' }}
                                                                className={`w-100 slim-multiselect rounded-3 shadow-none ${(errors as any)[`lender_visibilities.${i}.restricted_states`] ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                            {renderError('restricted_states', i)}
                                                        </td>
                                                        <td className="py-3">
                                                            <MultiSelect
                                                                value={v.allowed_industries}
                                                                options={industryTypes}
                                                                onChange={(e) => onChange(i, 'allowed_industries', e.value)}
                                                                optionLabel="label"
                                                                optionValue="value"
                                                                placeholder="Select industries"
                                                                filter
                                                                display="chip"
                                                                panelStyle={{ maxWidth: '350px' }}
                                                                className={`w-100 slim-multiselect rounded-3 shadow-none ${(errors as any)[`lender_visibilities.${i}.allowed_industries`] ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                            {renderError('allowed_industries', i)}
                                                        </td>
                                                        <td className="py-3">
                                                            <MultiSelect
                                                                value={v.restricted_industries}
                                                                options={industryTypes}
                                                                onChange={(e) => onChange(i, 'restricted_industries', e.value)}
                                                                optionLabel="label"
                                                                optionValue="value"
                                                                placeholder="Blocked industries"
                                                                filter
                                                                display="chip"
                                                                panelStyle={{ maxWidth: '350px' }}
                                                                className={`w-100 slim-multiselect rounded-3 shadow-none ${(errors as any)[`lender_visibilities.${i}.restricted_industries`] ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                            {renderError('restricted_industries', i)}
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            <button
                                                                type="button"
                                                                className="btn bg-danger-subtle text-danger rounded-circle d-inline-flex align-items-center justify-content-center border-0 p-0"
                                                                style={{ width: '32px', height: '32px' }}
                                                                onClick={() => onRemoveRow(i)}
                                                                title="Remove row"
                                                            >
                                                                <i className="ri-delete-bin-line fs-14"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            <style>{`
                .custom-scrollbar-wrapper::-webkit-scrollbar,
                    height: 8px;
                }
                .custom-scrollbar-wrapper::-webkit-scrollbar-track,
                .custom-scrollbar-wrapper *::-webkit-scrollbar-track {
                    background: #f8f9fa;
                    border-radius: 4px;
                }
                .custom-scrollbar-wrapper::-webkit-scrollbar-thumb,
                .custom-scrollbar-wrapper *::-webkit-scrollbar-thumb {
                    background: #d3d3d3;
                    border-radius: 4px;
                }
                .custom-scrollbar-wrapper::-webkit-scrollbar-thumb:hover,
                .custom-scrollbar-wrapper *::-webkit-scrollbar-thumb:hover {
                    background: #b0b0b0;
                }
                .p-dropdown.p-invalid .p-dropdown-trigger,
                .p-multiselect.p-invalid .p-multiselect-trigger {
                    border-left: 1px solid #f06548 !important;
                }
            `}</style>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                show={lenderToDelete !== null || showBulkDeleteModal}
                text={showBulkDeleteModal ? "The selected visibility rules will be removed." : "The selected lender and all associated visibility rules will be removed."}
                onClose={() => {
                    setLenderToDelete(null);
                    setShowBulkDeleteModal(false);
                }}
                onConfirm={confirmRemoveBlock}
                loading={isDeleting}
            />


        </div>
    );
};

export default LenderVisibilityGrid;
