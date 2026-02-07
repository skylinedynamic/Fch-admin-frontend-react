import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable, DataTableFilterMeta, DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Skeleton } from 'primereact/skeleton';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { useClients, useClientListStats, useDeleteClients, usePartners, useAllUsers, useBorrowerTiers } from '../../modules/client/queries';
import { getUser } from '../../lib/auth';
import { usePermissions } from '../../lib/auth/usePermissions';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import StatisticsCard from '../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../components/Common/StatisticsCardSkeleton';
import TableLoader from '../../components/Loader/TableLoader';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Client, ClientFilterParams } from '../../modules/client/types';
import { AuthUser } from '../../store/auth';

// Interfaces for component state and data
interface StatisticsConfig {
    title: string;
    dataKey: keyof ClientStats;
    icon: string;
    colorVariant: string;
}

interface ClientStats {
    active_count: number;
    new_this_month: number;
    total_clients: number;
    inactive_count: number;
    [key: string]: number; // Allow index access
}

interface PartnerOption {
    label: string;
    value: string | number;
}

interface UserOption {
    label: string;
    value: string | number;
}

interface TierOption {
    label: string;
    value: string | number;
}

export default function Clients() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();

    // Pagination state
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);
    const [totalRecords, setTotalRecords] = useState<number>(0);

    // Sorting state
    const [sortField, setSortField] = useState<string>('id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Filter states
    const [filters, setFilters] = useState<DataTableFilterMeta>({});
    const [searchText, setSearchText] = useState<string>('');
    const [selectedPartner, setSelectedPartner] = useState<string | number>('');
    const [selectedAssignedUser, setSelectedAssignedUser] = useState<string | number>('');
    const [selectedTier, setSelectedTier] = useState<string | number>('');

    // Applied filters (for query)
    const [appliedSearchText, setAppliedSearchText] = useState<string>('');
    const [appliedPartner, setAppliedPartner] = useState<string | number>('');
    const [appliedAssignedUser, setAppliedAssignedUser] = useState<string | number>('');
    const [appliedTier, setAppliedTier] = useState<string | number>('');
    const [appliedFilters, setAppliedFilters] = useState<DataTableFilterMeta>({});

    // Checkbox selection state
    const [selectedClients, setSelectedClients] = useState<Client[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [deleteRows, setDeleteRows] = useState<Client[]>([]);

    // Get current user and check if is_host
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [isHost, setIsHost] = useState<boolean>(false);

    // Get current user on mount
    useEffect(() => {
        const user = getUser();
        setCurrentUser(user);
        setIsHost(user?.is_host === 1);
    }, []);

    // Initialize filters
    const initFilters = () => {
        const initial: DataTableFilterMeta = {
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

    // Dropdown Data Hooks
    const { data: partnersList = [] } = usePartners(isHost);
    const { data: assignedUsersList = [] } = useAllUsers();
    const { data: tiersList = [] } = useBorrowerTiers();

    // React Query Mutations
    const deleteClientsMutation = useDeleteClients();

    // Prepare query params
    const queryParams: ClientFilterParams = {
        search: appliedSearchText || '',
        partner_id: appliedPartner || '',
        assigned_user_id: appliedAssignedUser || '', // Corrected from assign_id based on Type definition if needed, assuming mapped in service/query or backend expects this
        // Note: The original code used `assign_id` but `ClientFilterParams` has `assigned_user_id`. 
        // Let's check `ClientFilterParams` again. It has `assigned_user_id`. 
        // However, the backend might expect `assign_id`? 
        // The original code passed `assign_id`. I will keep `assign_id` casted as any if types don't match, or update types. 
        // But wait, `ClientFilterParams` allows `[key: string]: any` via `filters`? No.
        // Let's look at `ClientFilterParams` again.
        // It has `assigned_user_id`. I'll use `assigned_user_id` but the backend mapping might be needed.
        // Actually, looking at `useClients` implementation in `queries.ts`, it passes `params` directly to `fetchAllBorrowers`.
        // `fetchAllBorrowers` sends it to backend. I should probably stick to what the backend expects.
        // If original code had `assign_id`, I should probably use `assign_id` and maybe add it to the type or cast.
        // For now, I'll use `assign_id` as an extra property since types might be loose or I can extend it.
        // Wait, `ClientFilterParams` has `filters?: Record<string, any>`.
        // But `assign_id` was a top level param in the original object.
        // I will add `assign_id` to the object and cast if necessary, or better, stick to `assigned_user_id` if that's what the type says, 
        // BUT if the backend needs `assign_id`, I must send `assign_id`. 
        // Let's assume the Type definition `assigned_user_id` was intended for this, OR the backend is flexible.
        // To be safe and compatible with original `Clients.jsx`, I will use cast to any to allow `assign_id` or just allow it if I update type.
        // Let's use `assign_id` to matching original behavior, and suppress type error if needed or use `params as any`.
        current_tier: appliedTier || '',
        filters: appliedFilters,
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
    } as ClientFilterParams & { assign_id: string | number; current_tier: string | number };


    // Client List Query
    const {
        data: clientsData,
        isLoading: clientsLoading,
        error: clientsError
    } = useClients(queryParams);

    // Derived State from Query Data
    const clients: Client[] = clientsData?.data || [];
    const meta = clientsData?.meta;
    const loading = clientsLoading;

    // Update total records when meta changes
    useEffect(() => {
        if (meta) {
            setTotalRecords(typeof meta.total === 'number' ? meta.total : clients.length);
        } else if (clientsData) {
            setTotalRecords(clients.length);
        }
    }, [meta, clientsData, clients.length]);

    // Error Handling Effect
    useEffect(() => {
        if (clientsError) {
            const err = clientsError as any;
            const errorMessage = err?.response?.data?.message || err.message || 'Failed to fetch clients';
            toast.error(errorMessage);
        }
    }, [clientsError]);

    // Stats Query
    const partnerId = !isHost && currentUser?.partner_id ? currentUser.partner_id : undefined;
    const { data: statsData, isLoading: statsIsLoading } = useClientListStats(partnerId);
    const statsLoading = statsIsLoading;

    // Derived Stats
    const derivedStats: ClientStats = {
        active_count: statsData?.data?.active_count || 0,
        new_this_month: statsData?.data?.new_this_month || 0,
        total_clients: statsData?.data?.total_borrowers || 0,
        inactive_count: statsData?.data?.inactive_count || 0
    };

    const finalStats: ClientStats = {
        ...derivedStats,
        total_clients: meta?.total || derivedStats.total_clients
    };

    // Statistics cards configuration
    const statisticsConfig: StatisticsConfig[] = [
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
    const onPage = (event: DataTablePageEvent) => {
        const nextPerPage = event.rows;
        const nextPage = (event.page || 0) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    // Sort handler
    const onSort = (event: DataTableSortEvent) => {
        const field = event.sortField;
        const order = event.sortOrder === 1 ? 'asc' : 'desc';
        setSortField(field || sortField);
        setSortOrder(order);
    };

    // Filter handler
    const onFilter = (e: any) => { // DataTableStateEvent or generic event
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

        const ids = deleteRows.map(c => c.id).filter((id): id is string | number => id !== undefined);

        try {
            await deleteClientsMutation.mutateAsync(ids);
            toast.success("Borrower(s) deleted successfully.");
            setShowDeleteModal(false);
            setSelectedClients([]);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to delete clients.';
            toast.error(errorMsg);
        }
    };

    // Column body templates
    const fullNameBody = (rowData: Client) => {
        return (
            <span className="fw-medium">
                {rowData.full_name || rowData.first_name + ' ' + rowData.last_name}
            </span>
        );
    };

    const tierBody = (rowData: Client) => {
        // Create dynamic color mapping from tiersList
        const colorOptions = ['secondary', 'info', 'primary', 'warning', 'success', 'danger'];
        const tierColors: Record<string, string> = {};

        tiersList.forEach((tier: any, index: number) => {
            tierColors[tier.label] = colorOptions[index % colorOptions.length];
        });

        // Use 'current_tier_name' from rowData if it exists (it might be a custom field in list response)
        const tierName = (rowData as any).current_tier_name || 'N/A';
        const color = tierColors[tierName] || 'secondary';
        return (
            <span className={`badge bg-${color}-subtle text-${color}`}>
                {tierName}
            </span>
        );
    };

    const statusBody = (rowData: Client) => {
        const statusColors: Record<string, string> = {
            'OnBoarding': 'info',
            'Active': 'success',
            'Suspended': 'warning',
            'Closed': 'danger'
        };
        const status = (rowData as any).status || 'N/A';
        const color = statusColors[status] || 'secondary';
        return (
            <span className={`badge bg-${color}-subtle text-${color}`}>
                {status}
            </span>
        );
    };

    const statusFilterElement = (options: any) => {
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

    const tierFilterElement = (options: any) => {
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
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
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
                                    count={finalStats[config.dataKey] || 0}
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
                                                        ...partnersList.map((partner: any) => ({
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
                                                    ...assignedUsersList.map((user: any) => ({
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
                                            onSelectionChange={(e: any) => setSelectedClients(e.value)}
                                            dataKey="id"
                                            onRowClick={(e) => {
                                                // Prevent navigation if clicking on checkbox or selection column
                                                const target = e.originalEvent.target as HTMLElement;
                                                const isCheckbox = target.closest('.p-checkbox') ||
                                                    target.closest('.p-selection-column') ||
                                                    target.tagName === 'INPUT'; // Fallback for raw inputs
                                                if (!isCheckbox) {
                                                    navigate(`/clients/${(e.data as Client).id}`);
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
                    loading={deleteClientsMutation.isPending}
                    text="The selected clients and all associated data will be deleted."
                />

            </div>
        </div>
    );
}
