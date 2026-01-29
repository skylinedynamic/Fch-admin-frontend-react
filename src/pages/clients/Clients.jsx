import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Skeleton } from 'primereact/skeleton';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { deleteClients, fetchBorrowerStats, fetchBorrowerTiers } from '../../modules/client/services';
import { fetchAllBorrowers, deleteBorrower, getAllUsers } from '../../modules/borrower/services';
import { fetchPartners } from '../../modules/partner/services';
import { getUser } from '../../lib/auth';
import { usePermissions } from '../../lib/auth/usePermissions';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import StatisticsCard from '../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../components/Common/StatisticsCardSkeleton';
import TableLoader from '../../components/Loader/TableLoader';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Clients() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    // State for clients
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Sorting state
    const [sortField, setSortField] = useState('id');
    const [sortOrder, setSortOrder] = useState('desc');

    // Filter states
    const [filters, setFilters] = useState({});
    const [searchText, setSearchText] = useState('');
    const [selectedPartner, setSelectedPartner] = useState('');
    const [selectedAssignedUser, setSelectedAssignedUser] = useState('');
    const [selectedTier, setSelectedTier] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [appliedPartner, setAppliedPartner] = useState('');
    const [appliedAssignedUser, setAppliedAssignedUser] = useState('');
    const [appliedTier, setAppliedTier] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({});

    // Checkbox selection state
    const [selectedClients, setSelectedClients] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteRows, setDeleteRows] = useState([]);

    // Dropdown data
    const [partnersList, setPartnersList] = useState([]);
    const [assignedUsersList, setAssignedUsersList] = useState([]);
    const [tiersList, setTiersList] = useState([]);

    // Statistics data
    const [stats, setStats] = useState({
        active_count: 0,
        new_this_month: 0,
        total_clients: 0,
        inactive_count: 0
    });
    const [statsLoading, setStatsLoading] = useState(true);

    // Get current user and check if is_host
    const [currentUser, setCurrentUser] = useState(null);
    const [isHost, setIsHost] = useState(false);

    // Get current user on mount
    useEffect(() => {
        const user = getUser();
        setCurrentUser(user);
        setIsHost(user?.is_host === 1);
    }, []);

    // Initialize filters
    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            phone_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            assign_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            partner_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            current_tier_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    // Initialize filters on mount
    useEffect(() => {
        initFilters();
    }, []);

    // Load dropdown data based on user role
    useEffect(() => {
        // Only load partners if user is host
        if (isHost) {
            const loadPartners = async () => {
                try {
                    const result = await fetchPartners();
                    if (result.status) {
                        const formattedPartners = (result.data || []).map(partner => ({
                            id: partner.id,
                            full_name: partner.full_name,
                            company_name: partner.company_name,
                            displayLabel: `${partner.full_name} (${partner.company_name})`
                        }));
                        setPartnersList(formattedPartners);
                    }
                } catch (err) {
                    console.error('Failed to load partners:', err);
                }
            };
            loadPartners();
        }

        // Load assigned users for all users
        const loadAssignedUsers = async () => {
            try {
                const result = await getAllUsers();
                if (result.status) {
                    const formattedUsers = (result.data || []).map(user => ({
                        id: user.id,
                        full_name: user.name,
                        displayLabel: `${user.name}`
                    }));
                    setAssignedUsersList(formattedUsers);
                }
            } catch (err) {
                console.error('Failed to load assigned users:', err);
            }
        };
        loadAssignedUsers();

        // Load tiers
        const loadTiers = async () => {
            try {
                const result = await fetchBorrowerTiers();
                if (result.status && result.data) {
                    const formattedTiers = (result.data || []).map(tier => ({
                        label: tier.name,
                        value: tier.name
                    }));
                    setTiersList(formattedTiers);
                }
            } catch (err) {
                console.error('Failed to load tiers:', err);
                // Set to empty array on error
                setTiersList([]);
            }
        };
        loadTiers();
    }, [isHost]); // Re-run when isHost changes

    // Load clients statistics
    useEffect(() => {
        const loadStats = async () => {
            try {
                setStatsLoading(true);
                // Fetch stats from API - pass partner ID if user is not host
                const partnerId = !isHost && currentUser?.partner_id ? currentUser.partner_id : undefined;
                const result = await fetchBorrowerStats(partnerId);

                if (result.status && result.data) {
                    setStats({
                        active_count: result.data.active_count || 0,
                        new_this_month: result.data.new_this_month || 0,
                        total_clients: result.data.total_borrowers || 0,
                        inactive_count: result.data.inactive_count || 0
                    });
                }
            } catch (err) {
                console.error('Failed to load client statistics:', err);
                // Set default values on error
                setStats({
                    active_count: 0,
                    new_this_month: 0,
                    total_clients: 0,
                    inactive_count: 0
                });
            } finally {
                setStatsLoading(false);
            }
        };

        // Only load stats when user data is available
        if (currentUser) {
            loadStats();
        }
    }, [currentUser, isHost]);

    // Statistics cards configuration
    const statisticsConfig = [
        {
            title: "Active Clients",
            dataKey: "active_count",
            icon: "ri-user-line",
            colorVariant: "primary"
        },
        {
            title: "New This Month",
            dataKey: "new_this_month",
            icon: "ri-user-add-line",
            colorVariant: "warning"
        },
        {
            title: "Total Clients",
            dataKey: "total_clients",
            icon: "ri-group-line",
            colorVariant: "info"
        },
        {
            title: "Inactive",
            dataKey: "inactive_count",
            icon: "ri-user-unfollow-line",
            colorVariant: "success"
        }
    ];

    // Load clients data with filters
    useEffect(() => {
        if (!appliedFilters || Object.keys(appliedFilters).length === 0) return;

        const load = async () => {
            setLoading(true);
            try {
                const payload = {
                    search: appliedSearchText || '',
                    partner_id: appliedPartner || '',
                    assign_id: appliedAssignedUser || '',
                    current_tier: appliedTier || '',
                    filters: appliedFilters,
                    page,
                    per_page: perPage,
                    sort_field: sortField,
                    sort_order: sortOrder,
                };

                const result = await fetchAllBorrowers(payload);
                if (result.status) {
                    const data = result.data || [];
                    const meta = result.meta;

                    setClients(data);
                    setError(null);

                    // Update pagination info from backend
                    if (meta) {
                        setTotalRecords(typeof meta.total === 'number' ? meta.total : data.length);
                        if (typeof meta.current_page === 'number') setPage(meta.current_page);
                        if (typeof meta.per_page === 'number') setPerPage(meta.per_page);
                    } else {
                        setTotalRecords(data.length);
                    }

                    // Update stats from total
                    setStats(prev => ({
                        ...prev,
                        total_clients: meta?.total || data.length
                    }));
                } else {
                    // API returned status: false
                    const errorMsg = result.message || 'Failed to fetch clients';
                    setError(errorMsg);
                    toast.error(errorMsg);
                    console.error('❌ API Error:', result);
                }
            } catch (err) {
                // Network or other errors
                console.error('❌ Fetch Error:', err);

                // Extract error message from API response
                let errorMessage = 'Failed to fetch clients';

                if (err.response?.data?.message) {
                    // Backend returned an error message
                    errorMessage = err.response.data.message;
                } else if (err.message) {
                    errorMessage = err.message;
                }

                setError(errorMessage);
                toast.error(errorMessage);

                // Log detailed error for debugging
                console.error('Error Details:', {
                    message: errorMessage,
                    response: err.response?.data,
                    status: err.response?.status,
                    fullError: err
                });
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(() => {
            load();
        }, 300);

        return () => clearTimeout(timeout);
    }, [appliedSearchText, appliedPartner, appliedAssignedUser, appliedTier, appliedFilters, page, perPage, sortField, sortOrder]);

    // Filter handlers
    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedPartner(selectedPartner);
        setAppliedAssignedUser(selectedAssignedUser);
        setAppliedTier(selectedTier);
        setAppliedFilters(filters);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedPartner('');
        setSelectedAssignedUser('');
        setSelectedTier('');
        setAppliedSearchText('');
        setAppliedPartner('');
        setAppliedAssignedUser('');
        setAppliedTier('');
        initFilters();
        setPage(1);
    };

    // Pagination handler
    const onPage = (event) => {
        const nextPerPage = event.rows;
        const nextPage = Math.floor(event.first / event.rows) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    // Sort handler
    const onSort = (event) => {
        const field = event.sortField;
        const order = event.sortOrder === 1 ? 'asc' : 'desc';
        setSortField(field || sortField);
        setSortOrder(order);
    };

    // Filter handler
    const onFilter = (e) => {
        setFilters(e.filters);
        setAppliedFilters(e.filters);
        setPage(1);
    };

    // Delete handlers
    const openDeleteModal = () => {
        if (!selectedClients || selectedClients.length === 0) {
            toast.warn('Please select at least one client to delete.');
            return;
        }
        setDeleteRows(selectedClients);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteRows || deleteRows.length === 0) return;

        const ids = deleteRows.map(c => c.id);
        try {
            setLoading(true);
            const response = await deleteClients(ids);

            if (response && response.status) {
                toast.success(response.message || "Borrower(s) deleted successfully.");
                setShowDeleteModal(false);
                setSelectedClients([]);

                // Trigger reload
                setAppliedFilters({ ...appliedFilters });
            } else {
                toast.error(response?.message || "Failed to delete clients.");
            }
        } catch (err) {
            console.error('Delete error:', err);
            // Handle error response from axios if available
            const errorMsg = err.response?.data?.message || err.message || 'Failed to delete clients. Please try again.';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Column body templates
    const fullNameBody = (rowData) => {
        return (
            <span className="fw-medium">
                {rowData.full_name}
            </span>
        );
    };

    const tierBody = (rowData) => {
        // Create dynamic color mapping from tiersList
        const colorOptions = ['secondary', 'info', 'primary', 'warning', 'success', 'danger'];
        const tierColors = {};

        tiersList.forEach((tier, index) => {
            tierColors[tier.label] = colorOptions[index % colorOptions.length];
        });

        const color = tierColors[rowData.current_tier_name] || 'secondary';
        return (
            <span className={`badge bg-${color}-subtle text-${color}`}>
                {rowData.current_tier_name}
            </span>
        );
    };

    const statusBody = (rowData) => {
        const statusColors = {
            'OnBoarding': 'info',
            'Active': 'success',
            'Suspended': 'warning',
            'Closed': 'danger'
        };
        const color = statusColors[rowData.status] || 'secondary';
        return (
            <span className={`badge bg-${color}-subtle text-${color}`}>
                {rowData.status}
            </span>
        );
    };

    const statusFilterElement = (options) => {
        const statuses = [
            { label: 'OnBoarding', value: 'OnBoarding' },
            { label: 'Active', value: 'Active' },
            { label: 'Suspended', value: 'Suspended' },
            { label: 'Closed', value: 'Closed' }
        ];
        return (
            <Dropdown
                value={options.value}
                options={statuses}
                onChange={(e) => options.filterApplyCallback(e.value)}
                optionLabel="label"
                optionValue="value"
                placeholder="Select Status"
                className="p-column-filter"
                showClear
                style={{ minWidth: '10rem' }}
            />
        );
    };

    const tierFilterElement = (options) => {
        return (
            <Dropdown
                value={options.value}
                options={tiersList}
                onChange={(e) => options.filterApplyCallback(e.value)}
                optionLabel="label"
                optionValue="value"
                placeholder="Select Tier"
                className="p-column-filter"
                showClear
                style={{ minWidth: '12rem' }}
            />
        );
    };

    return (
        <div className="page-content">
            <ToastContainer position="top-right" autoClose={3000} />
            {/* Header */}
            <div className="container-fluid">
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Clients</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Clients</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <form onSubmit={(e) => e.preventDefault()}>
                                    <div className="row g-3 mb-0 align-items-center">
                                        <div className="col-sm-auto">
                                            <div className="btn-group">
                                                {hasPermission('delete clients') && Array.isArray(selectedClients) && selectedClients.length > 0 ? (
                                                    <>
                                                        <button type="button" id="primaryActionBtn" className="btn bg-success text-white fw-medium">
                                                            Actions
                                                        </button>
                                                        <button type="button" id="primaryActionToggleBtn" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                                            <span className="visually-hidden">Toggle dropdown</span>
                                                        </button>
                                                        <ul className="dropdown-menu dropdown-menu-end" id="primaryActionMenu">
                                                            <li>
                                                                <button
                                                                    type="button"
                                                                    className="dropdown-item text-danger"
                                                                    onClick={openDeleteModal}
                                                                >
                                                                    <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                                                </button>
                                                            </li>
                                                        </ul>
                                                    </>
                                                ) : hasPermission('create clients') ? (
                                                    <button
                                                        type="button"
                                                        id="primaryActionBtn"
                                                        className="btn btn-primary fw-medium waves-effect waves-light"
                                                        onClick={() => navigate('/clients/create')}
                                                    >
                                                        <i className="ri-add-fill me-1 align-bottom"></i> Add Client
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="row">
                    {statsLoading ? (
                        <>
                            {statisticsConfig.map((_, index) => (
                                <StatisticsCardSkeleton key={`skeleton-${index}`} />
                            ))}
                        </>
                    ) : (
                        <>
                            {statisticsConfig.map((config, index) => (
                                <StatisticsCard
                                    key={`stat-${index}`}
                                    title={config.title}
                                    count={stats[config.dataKey] || 0}
                                    icon={config.icon}
                                    colorVariant={config.colorVariant}
                                />
                            ))}
                        </>
                    )}
                </div>

                {/* Filters and Table */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    handleApplyFilters();
                                }}>
                                    <div className="row g-3 mb-3">
                                        <div className={isHost ? "col-xxl-3 col-sm-12" : "col-xxl-4 col-sm-12"}>
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    id="searchClient"
                                                    placeholder="Search here..."
                                                    autoComplete="off"
                                                    value={searchText}
                                                    onChange={(e) => setSearchText(e.target.value)}
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

                                        {/* Show All Partners dropdown only for host users */}
                                        {isHost && (
                                            <div className="col-xxl-2 col-sm-4">
                                                <Dropdown
                                                    value={selectedPartner}
                                                    onChange={(e) => setSelectedPartner(e.value)}
                                                    options={[
                                                        { label: 'All Partners', value: '' },
                                                        ...partnersList.map(partner => ({
                                                            label: partner.displayLabel,
                                                            value: partner.id
                                                        }))
                                                    ]}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="All Partners"
                                                    className="w-100 employee-filter-dropdown"
                                                />
                                            </div>
                                        )}

                                        <div className={isHost ? "col-xxl-2 col-sm-4" : "col-xxl-3 col-sm-4"}>
                                            <Dropdown
                                                value={selectedAssignedUser}
                                                onChange={(e) => setSelectedAssignedUser(e.value)}
                                                options={[
                                                    { label: 'All Sales Person', value: '' },
                                                    ...assignedUsersList.map(user => ({
                                                        label: user.displayLabel,
                                                        value: user.id
                                                    }))
                                                ]}
                                                optionLabel="label"
                                                optionValue="value"
                                                placeholder="All Sales Person"
                                                className="w-100 employee-filter-dropdown"
                                            />
                                        </div>

                                        <div className={isHost ? "col-xxl-2 col-sm-4" : "col-xxl-3 col-sm-4"}>
                                            <Dropdown
                                                value={selectedTier}
                                                onChange={(e) => setSelectedTier(e.value)}
                                                options={[
                                                    { label: 'All Tiers', value: '' },
                                                    ...tiersList
                                                ]}
                                                optionLabel="label"
                                                optionValue="value"
                                                placeholder="All Tiers"
                                                className="w-100 employee-filter-dropdown"
                                            />
                                        </div>

                                        <div className={isHost ? "col-xxl-3 col-sm-12" : "col-xxl-2 col-sm-12"}>
                                            <div className="d-flex gap-2">
                                                <button type="button" className="btn btn-warning flex-grow-1" onClick={handleApplyFilters}>
                                                    <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                                </button>
                                                <button type="button" className="btn btn-default flex-grow-1" onClick={handleClearFilters}>
                                                    <i className="ri-close-line me-1 align-bottom"></i> Clear
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>

                                {/* DataTable */}
                                {loading ? (
                                    <TableLoader
                                        rows={10}
                                        columns={[
                                            { style: { width: '3rem' } }, // Selection
                                            { style: { minWidth: '180px' } }, // Full Name
                                            { style: { minWidth: '220px' } }, // Email
                                            { style: { minWidth: '150px' } }, // Phone
                                            { style: { minWidth: '150px' } }, // Assigned To
                                            { style: { minWidth: '150px' } }, // Partner Name
                                            { style: { minWidth: '130px' } }, // Current Tier
                                            { style: { minWidth: '120px' } }  // Status
                                        ]}
                                    />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="510px"
                                            value={clients}
                                            paginator
                                            lazy
                                            totalRecords={totalRecords}
                                            first={(page - 1) * perPage}
                                            rows={perPage}
                                            rowsPerPageOptions={[10, 25, 50, 100]}
                                            sortMode="single"
                                            sortField={sortField}
                                            sortOrder={sortOrder === 'asc' ? 1 : -1}
                                            filterDisplay="menu"
                                            filters={filters}
                                            onFilter={onFilter}
                                            onPage={onPage}
                                            onSort={onSort}
                                            globalFilterFields={[
                                                'full_name',
                                                'email',
                                                'phone_number',
                                                'assign_name',
                                                'partner_name',
                                                'current_tier_name',
                                                'status'
                                            ]}
                                            selection={selectedClients}
                                            onSelectionChange={(e) => setSelectedClients(e.value)}
                                            dataKey="id"
                                            onRowClick={(e) => {
                                                // Prevent navigation if clicking on checkbox or selection column
                                                const isCheckbox = e.originalEvent.target.closest('.p-checkbox') ||
                                                    e.originalEvent.target.closest('.p-selection-column') ||
                                                    e.originalEvent.target.tagName === 'INPUT'; // Fallback for raw inputs
                                                if (!isCheckbox) {
                                                    navigate(`/clients/${e.data.id}`);
                                                }
                                            }}
                                            // metaKeySelection={false} // Disabled to prevent row click selection
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No clients found"
                                        >
                                            {hasPermission('delete clients') && (
                                                <Column
                                                    selectionMode="multiple"
                                                    headerStyle={{ width: '3rem' }}
                                                    exportable={false}
                                                />
                                            )}
                                            <Column
                                                field="full_name"
                                                header="Full Name"
                                                body={fullNameBody}
                                                sortable
                                                filter
                                                showFilterMatchModes
                                                filterPlaceholder="Search by name"
                                                style={{ minWidth: '180px' }}
                                            />
                                            <Column
                                                field="email"
                                                header="Email"
                                                sortable
                                                filter
                                                showFilterMatchModes
                                                filterPlaceholder="Search by email"
                                                style={{ minWidth: '220px' }}
                                            />
                                            <Column
                                                field="phone_number"
                                                header="Phone Number"
                                                sortable
                                                filter
                                                showFilterMatchModes
                                                filterPlaceholder="Search by phone"
                                                style={{ minWidth: '150px' }}
                                            />
                                            <Column
                                                field="assign_name"
                                                header="Assigned To"
                                                sortable
                                                filter
                                                showFilterMatchModes
                                                filterPlaceholder="Search by assigned"
                                                style={{ minWidth: '150px' }}
                                            />
                                            <Column
                                                field="partner_name"
                                                header="Partner Name"
                                                sortable
                                                filter
                                                showFilterMatchModes
                                                filterPlaceholder="Search by partner"
                                                style={{ minWidth: '150px' }}
                                            />
                                            <Column
                                                field="current_tier_name"
                                                header="Current Tier"
                                                body={tierBody}
                                                sortable
                                                filter
                                                filterElement={tierFilterElement}
                                                showFilterMatchModes={false}
                                                filterPlaceholder="Search by tier"
                                                style={{ minWidth: '130px' }}
                                            />
                                            <Column
                                                field="status"
                                                header="Status"
                                                body={statusBody}
                                                sortable
                                                filter
                                                filterElement={statusFilterElement}
                                                showFilterMatchModes={false}
                                                filterPlaceholder="Search by status"
                                                style={{ minWidth: '120px' }}
                                            />
                                        </DataTable>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>

                <DeleteConfirmationModal
                    show={showDeleteModal}
                    onConfirm={handleDeleteConfirm}
                    onClose={closeDeleteModal}
                    loading={loading}
                    text="The selected clients and all associated data will be deleted."
                />

            </div>
        </div>
    );
}
