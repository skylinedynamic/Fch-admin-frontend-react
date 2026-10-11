import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, DataTableFilterMeta, DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { useClients, DEFAULT_CLIENT_FILTERS } from '../../../modules/client';
import TableLoader from '../../../components/Loader/TableLoader';
import type { Client, ClientFilterParams, ClientListStatistics } from '../../../modules/client/types';
import { toast } from 'react-toastify';
import { BORROWER_STATUS, BORROWER_STATUS_CLASS_MAP } from '../../../config/statusOptions';
import { ARCHIVE_FILTER_OPTIONS, ALL_STATUS_OPTION } from '../../../config/partnerStatus';
import { FREE_PLAN_FILTER_OPTIONS } from '../../../config/borrower';
import { getBorrowerFreeEditionBadgeConfig } from '../../../utils/badgeHelper';


import FilterLoader from '../../../components/Loader/FilterLoader';

interface ClientListTableProps {
    isHost: boolean;
    partnersList: any[];
    assignedUsersList: any[];
    tiersList: any[];
    deletePermission: boolean;
    selectedClients: Client[];
    onSelectionChange: (selected: Client[]) => void;
    onTotalRecordsChange?: (total: number) => void;
    onStatsChange?: (stats: ClientListStatistics) => void;
    onLoadingChange?: (loading: boolean) => void;
    partnerId?: string | number;
}

const ClientListTable: React.FC<ClientListTableProps> = ({
    isHost,
    partnersList,
    assignedUsersList,
    tiersList,
    deletePermission,
    selectedClients,
    onSelectionChange,
    onTotalRecordsChange,
    onStatsChange,
    onLoadingChange,
    partnerId
}) => {
    const navigate = useNavigate();

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
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [selectedFreePlan, setSelectedFreePlan] = useState<string>('');
    const [selectedArchived, setSelectedArchived] = useState<string>('');

    // Applied filters (for query)
    const [appliedSearchText, setAppliedSearchText] = useState<string>('');
    const [appliedPartner, setAppliedPartner] = useState<string | number>('');
    const [appliedAssignedUser, setAppliedAssignedUser] = useState<string | number>('');
    const [appliedTier, setAppliedTier] = useState<string | number>('');
    const [appliedStatus, setAppliedStatus] = useState<string>('');
    const [appliedFreePlan, setAppliedFreePlan] = useState<string>('');
    const [appliedArchived, setAppliedArchived] = useState<string>('');
    const [appliedFilters, setAppliedFilters] = useState<DataTableFilterMeta>({});

    // Initialize filters
    const initFilters = () => {
        setFilters({ ...DEFAULT_CLIENT_FILTERS });
        setAppliedFilters({ ...DEFAULT_CLIENT_FILTERS });
    };

    useEffect(() => {
        initFilters();
    }, []);

    // Prepare query params
    const queryParams: ClientFilterParams = {
        search: appliedSearchText || '',
        partner_id: partnerId || appliedPartner || '',
        assigned_user_id: appliedAssignedUser || '',
        current_tier: appliedTier || '',
        status: appliedStatus || '',
        is_free_trail: appliedFreePlan || '',
        // '' is the working list (archived hidden), '1' archived only, 'all' both.
        // A search overrides this server-side so an archived client is always
        // findable by name, company or email.
        archived: appliedArchived || '',
        filters: appliedFilters,
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
    } as any; // Using any for extended params if needed

    // Client List Query
    const {
        data: clientsData,
        isLoading: clientsLoading,
        isFetching: clientsFetching,
        error: clientsError
    } = useClients(queryParams);

    const clients: Client[] = clientsData?.data || [];
    const meta = clientsData?.meta;
    const statistics = clientsData?.statistics;

    // Update total records and statistics
    useEffect(() => {
        if (meta) {
            const total = typeof meta.total === 'number' ? meta.total : clients.length;
            setTotalRecords(total);
            if (onTotalRecordsChange) onTotalRecordsChange(total);
        } else if (clientsData) {
            const total = clients.length;
            setTotalRecords(total);
            if (onTotalRecordsChange) onTotalRecordsChange(total);
        }

        if (statistics && onStatsChange) {
            onStatsChange(statistics);
        }
    }, [meta, clientsData, clients.length, onTotalRecordsChange, statistics, onStatsChange]);

    useEffect(() => {
        if (onLoadingChange) {
            onLoadingChange(clientsLoading);
        }
    }, [clientsLoading, onLoadingChange]);

    // Error Handling
    useEffect(() => {
        if (clientsError) {
            const err = clientsError as any;
            const errorMessage = err?.response?.data?.message || err.message || 'Failed to fetch clients';
            toast.error(errorMessage);
        }
    }, [clientsError]);

    // Handlers
    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedPartner(selectedPartner);
        setAppliedAssignedUser(selectedAssignedUser);
        setAppliedTier(selectedTier);
        setAppliedStatus(selectedStatus);
        setAppliedFreePlan(selectedFreePlan);
        setAppliedArchived(selectedArchived);
        setAppliedFilters(filters);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedPartner('');
        setSelectedAssignedUser('');
        setSelectedTier('');
        setSelectedStatus('');
        setSelectedFreePlan('');
        setSelectedArchived('');
        setAppliedSearchText('');
        setAppliedPartner('');
        setAppliedAssignedUser('');
        setAppliedTier('');
        setAppliedStatus('');
        setAppliedFreePlan('');
        setAppliedArchived('');
        initFilters();
        setPage(1);
        setSortField('id');
        setSortOrder('desc');
    };

    const onPage = (event: DataTablePageEvent) => {
        setPerPage(event.rows);
        setPage((event.page || 0) + 1);
    };

    const onSort = (event: DataTableSortEvent) => {
        setSortField(event.sortField || 'id');
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    const onFilter = (e: any) => {
        setFilters(e.filters);
        setAppliedFilters(e.filters);
        setPage(1);
    };

    // Templates
    const fullNameBody = (rowData: Client) => {
        const trialBadge = rowData.is_free_trail ? getBorrowerFreeEditionBadgeConfig(rowData.free_trail_end_date) : null;
        return (
            <div className="d-flex align-items-center gap-2">
                <span className="fw-medium">{rowData.full_name || `${rowData.first_name} ${rowData.last_name}`}</span>
                {trialBadge && (
                    <span className={`badge ${trialBadge.badgeClass} fs-10 px-2 py-1`}>
                        <i className="ri-vip-crown-line me-1"></i>{trialBadge.label}
                    </span>
                )}
                {/* Archived records surface in search results, so they have to say
                    so - otherwise staff act on a record they think is active. */}
                {rowData.is_archived && (
                    <span className="badge bg-secondary-subtle text-secondary fs-10 px-2 py-1">
                        <i className="ri-archive-line me-1"></i>Archived
                    </span>
                )}
            </div>
        );
    };

    const businessNameBody = (rowData: Client) => (
        <span className="fw-medium">{rowData.business_name}</span>
    );

    const tierBody = (rowData: Client) => {
        const colorOptions = ['secondary', 'info', 'primary', 'warning', 'success', 'danger'];
        const tierColors: Record<string, string> = {};
        tiersList.forEach((tier: any, index: number) => {
            tierColors[tier.label] = colorOptions[index % colorOptions.length];
        });
        const tierName = (rowData as any).current_tier_name || 'N/A';
        const color = tierColors[tierName] || 'secondary';
        return <span className={`badge bg-${color}-subtle text-${color}`}>{tierName}</span>;
    };

    const statusBody = (rowData: Client) => {
        const status = rowData.status || 'N/A';
        const colorClass = BORROWER_STATUS_CLASS_MAP[status] || 'bg-secondary-subtle text-secondary';
        return <span className={`badge ${colorClass}`}>{status}</span>;
    };

    const statusFilterElement = (options: any) => {
        return (
            <Dropdown
                value={options.value}
                options={BORROWER_STATUS}
                onChange={(e) => options.filterApplyCallback(e.value)}
                optionLabel="label"
                optionValue="value"
                filter
                filterBy="label"
                placeholder="Select Status"
                className="p-column-filter"
                showClear
                style={{ minWidth: '10rem' }}
            />
        );
    };

    const tierFilterElement = (options: any) => (
        <Dropdown
            value={options.value}
            options={tiersList}
            onChange={(e) => options.filterApplyCallback(e.value)}
            optionLabel="label"
            optionValue="value"
            filter
            filterBy="label"
            placeholder="Select Tier"
            className="p-column-filter"
            showClear
            style={{ minWidth: '12rem' }}
        />
    );

    // Dynamic loader config for Clients
    // "col-xxl" (no number) is Bootstrap's equal-width auto column — every field
    // (and the buttons group) ends up the same width and shares the row evenly,
    // however many filters are visible, so the bar always renders as one line.
    const loaderConfig = isHost
        ? [
            { col: "col-xxl col-sm-12" }, // Search
            ...(!partnerId ? [{ col: "col-xxl col-sm-4" }] : []), // Partner filter
            { col: "col-xxl col-sm-4" }, // Sales Person
            { col: "col-xxl col-sm-4" }, // Tiers
            { col: "col-xxl col-sm-4" }, // Status
            { col: "col-xxl col-sm-4" }, // Free Plan / Regular Plan
            { col: "col-xxl col-sm-12", isButton: true } // Buttons
        ]
        : [
            { col: "col-xxl col-sm-12" }, // Search
            { col: "col-xxl col-sm-4" }, // Sales Person
            { col: "col-xxl col-sm-4" }, // Tiers
            { col: "col-xxl col-sm-4" }, // Status
            { col: "col-xxl col-sm-4" }, // Free Plan / Regular Plan
            { col: "col-xxl col-sm-12", isButton: true } // Buttons
        ];

    return (
        <>
            <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}>
                {clientsLoading ? (
                    <FilterLoader config={loaderConfig} />
                ) : (
                    <div className="row g-3 mb-3">
                        <div className="col-xxl col-sm-12">
                            <div className="search-box">
                                <input
                                    type="text"
                                    className="form-control search bg-light border-light"
                                    placeholder="Search here..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                />
                                <i className="ri-search-line search-icon"></i>
                            </div>
                        </div>

                        {!partnerId && isHost && (
                            <div className="col-xxl col-sm-4">
                                <Dropdown
                                    value={selectedPartner}
                                    onChange={(e) => setSelectedPartner(e.value)}
                                    options={[{ label: 'All Partners', value: '' }, ...partnersList.map((p: any) => ({ label: p.displayLabel, value: p.id }))]}
                                    optionLabel="label"
                                    optionValue="value"
                                    filter
                                    filterBy="label"
                                    placeholder="All Partners"
                                    className="w-100 bg-light border-light"
                                />
                            </div>
                        )}

                        <div className="col-xxl col-sm-4">
                            <Dropdown
                                value={selectedAssignedUser}
                                onChange={(e) => setSelectedAssignedUser(e.value)}
                                options={[{ label: 'All Sales Person', value: '' }, ...assignedUsersList.map((u: any) => ({ label: u.displayLabel, value: u.id }))]}
                                optionLabel="label"
                                optionValue="value"
                                filter
                                filterBy="label"
                                placeholder="All Sales Person"
                                className="w-100 bg-light border-light"
                            />
                        </div>

                        <div className="col-xxl col-sm-4">
                            <Dropdown
                                value={selectedTier}
                                onChange={(e) => setSelectedTier(e.value)}
                                options={[{ label: 'All Tiers', value: '' }, ...tiersList]}
                                optionLabel="label"
                                optionValue="value"
                                filter
                                filterBy="label"
                                placeholder="All Tiers"
                                className="w-100 bg-light border-light"
                            />
                        </div>

                        <div className="col-xxl col-sm-4">
                            <Dropdown
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.value)}
                                options={[ALL_STATUS_OPTION, ...BORROWER_STATUS]}
                                optionLabel="label"
                                optionValue="value"
                                filter
                                filterBy="label"
                                placeholder="All Status"
                                className="w-100 bg-light border-light"
                            />
                        </div>

                        <div className="col-xxl col-sm-4">
                            <Dropdown
                                value={selectedFreePlan}
                                onChange={(e) => setSelectedFreePlan(e.value)}
                                options={FREE_PLAN_FILTER_OPTIONS}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="All Plans"
                                className="w-100 bg-light border-light"
                            />
                        </div>

                        <div className="col-xxl col-sm-4">
                            <Dropdown
                                value={selectedArchived}
                                onChange={(e) => setSelectedArchived(e.value)}
                                options={ARCHIVE_FILTER_OPTIONS}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Active Only"
                                className="w-100 bg-light border-light"
                            />
                        </div>

                        <div className="col-xxl col-sm-12">
                            <div className="d-flex gap-2">
                                <button type="submit" className="btn btn-warning flex-grow-1"><i className="ri-equalizer-fill me-1 align-bottom"></i> Filters</button>
                                <button type="button" className="btn btn-default flex-grow-1" onClick={handleClearFilters}><i className="ri-close-line me-1 align-bottom"></i> Clear</button>
                            </div>
                        </div>
                    </div>
                )}
            </form>

            {clientsLoading || clientsFetching ? (
                <TableLoader rows={11} />
            ) : (
                <div className="table-responsive table-card mt-1">
                    <DataTable<Client[]>
                        loading={false}
                        value={clients as Client[]} paginator lazy totalRecords={totalRecords}
                        first={(page - 1) * perPage} rows={perPage} rowsPerPageOptions={[10, 25, 50, 100]}
                        sortMode="single" sortField={sortField} sortOrder={sortOrder === 'asc' ? 1 : -1}
                        filterDisplay="menu" filters={filters} onFilter={onFilter} onPage={onPage} onSort={onSort}
                        selection={selectedClients as any} onSelectionChange={(e: any) => onSelectionChange(e.value)}
                        dataKey="id" onRowClick={(e) => {
                            const target = e.originalEvent.target as HTMLElement;
                            if (!target.closest('.p-checkbox') && !target.closest('.p-selection-column') && target.tagName !== 'INPUT') {
                                navigate(`/clients/${(e.data as Client).id}`);
                            }
                        }}
                        className="p-datatable-sm" emptyMessage="No clients found"
                        rowClassName={() => 'cursor-pointer'}
                    >
                        {deletePermission && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}
                        <Column field="full_name" header="Full Name" body={fullNameBody} sortable filter showFilterMatchModes filterPlaceholder="Search by name" style={{ minWidth: '180px' }} />
                        <Column field="business_name" header="Company Name" body={businessNameBody} sortable filter showFilterMatchModes filterPlaceholder="Search by business" style={{ minWidth: '180px' }} />
                        <Column field="email" header="Email" sortable filter showFilterMatchModes filterPlaceholder="Search by email" style={{ minWidth: '220px' }} />
                        <Column field="phone_number" header="Phone Number" sortable filter showFilterMatchModes filterPlaceholder="Search by phone" style={{ minWidth: '150px' }} />
                        <Column field="assign_name" header="Assigned To" sortable filter showFilterMatchModes filterPlaceholder="Search by assigned" style={{ minWidth: '150px' }} />
                        {!partnerId && <Column field="partner_name" header="Partner Name" sortable filter showFilterMatchModes filterPlaceholder="Search by partner" style={{ minWidth: '150px' }} />}
                        <Column field="current_tier_name" header="Current Tier" body={tierBody} sortable filter filterElement={tierFilterElement} showFilterMatchModes={false} style={{ minWidth: '130px' }} />
                        <Column field="status" header="Status" body={statusBody} sortable filter filterElement={statusFilterElement} showFilterMatchModes={false} style={{ minWidth: '120px' }} />
                    </DataTable>
                </div>
            )}
        </>
    );
};

export default ClientListTable;
