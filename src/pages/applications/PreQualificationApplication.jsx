import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { usePreQualificationApplications } from '../../modules/application';
import { usePermissions } from '../../lib/auth/usePermissions';
import { useAuthStore } from '../../store/auth/authStore';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import StatisticsCard from '../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../components/Common/StatisticsCardSkeleton';
import TableLoader from '../../components/Loader/TableLoader';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { APPLICATION_STATUS_OPTIONS, FUNDING_TYPE_OPTIONS } from '../../config/borrower';


const DEMO_STATS = {
    total_leads: 5,
    new_leads: 1,
    qualified_rate: '20%',
    declined_rate: '20%'
};

export default function PreQualificationApplication() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const currentUser = useAuthStore((state) => state.user);
    const isHost = currentUser?.is_host === 1;

    // State for leads
    // const [leads, setLeads] = useState([]);
    // const [loading, setLoading] = useState(true);
    // const [error, setError] = useState(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    // const [totalRecords, setTotalRecords] = useState(0);

    // Sorting state
    const [sortField, setSortField] = useState('id');
    const [sortOrder, setSortOrder] = useState('desc');

    // Filter states (Inputs)
    const [searchText, setSearchText] = useState('');
    const [selectedLeadType, setSelectedLeadType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const [filters, setFilters] = useState({});

    // Applied Filters (For API Query)
    const [appliedFilters, setAppliedFilters] = useState({
        search: '',
        status: '',
        funding_type: '',
        date_range: null,
        filters: {}
    });

    // API Query
    const queryParams = {
        page,
        per_page: perPage,
        search: appliedFilters.search,
        status: appliedFilters.status,
        funding_type: appliedFilters.funding_type,
        start_date: appliedFilters.date_range?.[0] ? new Date(appliedFilters.date_range[0]).toISOString().split('T')[0] : null,
        end_date: appliedFilters.date_range?.[1] ? new Date(appliedFilters.date_range[1]).toISOString().split('T')[0] : null,
        filters: appliedFilters.filters,
        sort_field: sortField,
        sort_order: sortOrder,
    };

    const { data: apiResponse, isLoading, isFetching } = usePreQualificationApplications(queryParams);
    const leads = apiResponse?.data || [];
    const totalRecords = apiResponse?.meta?.total || 0;
    const loading = isLoading || isFetching;

    // Checkbox selection state
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteRows, setDeleteRows] = useState([]);


    const [showConvertModal, setShowConvertModal] = useState(false);
    const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
    const [targetLead, setTargetLead] = useState(null);
    const [conversionLoading, setConversionLoading] = useState(false);

    // Statistics data
    const [stats, setStats] = useState(DEMO_STATS);
    const [statsLoading, setStatsLoading] = useState(true);

    // Initialize filters
    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            business_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
            funding_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
        };
        setFilters(initial);
        setAppliedFilters(prev => ({ ...prev, filters: initial }));
    };

    // Initialize
    useEffect(() => {
        initFilters();

        // Simulate stats loading
        setTimeout(() => {
            setStats(DEMO_STATS);
            setStatsLoading(false);
        }, 500);

    }, []);

    const statisticsConfig = [
        { title: "Total Applications", dataKey: "total_applications", icon: "ri-coupon-line", colorVariant: "secondary" },
        { title: "Approved", dataKey: "approved", icon: "ri-folder-open-line", colorVariant: "warning" },
        { title: "Pending", dataKey: "pending", icon: "ri-time-line", colorVariant: "info" },
        { title: "Approved Amount", dataKey: "approved_amount", icon: "ri-star-line", colorVariant: "success" }
    ];



    const handleApplyFilters = () => {
        setAppliedFilters(prev => ({
            ...prev,
            search: searchText,
            status: selectedStatus,
            funding_type: selectedLeadType,
            date_range: dateRange,
            filters: filters
        }));
        setPage(1);
    };

    const handleClearFilters = () => {
        // Reset Inputs
        setSearchText('');
        setSelectedLeadType('');
        setSelectedStatus('');
        setDateRange(null);
        initFilters();

        // Reset Applied Filters
        setAppliedFilters(prev => ({
            ...prev,
            search: '',
            status: '',
            funding_type: '',
            date_range: null,
            filters: {} // initFilters will reset this via useEffect or manual call if needed, but here we clear specific fields
        }));

        // Re-call initFilters to reset state properly
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            business_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
            funding_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
        };
        setFilters(initial);
        setAppliedFilters({
            search: '',
            status: '',
            funding_type: '',
            date_range: null,
            filters: initial
        });

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
        setAppliedFilters(prev => ({
            ...prev,
            filters: e.filters
        }));
        setPage(1);
    };

    // Template body
    const statusBodyTemplate = (rowData) => {
        const statusMap = {
            'pending': 'bg-warning-subtle text-warning',
            'intake received': 'bg-info-subtle text-info',
            'in review': 'bg-primary-subtle text-primary',
            'approved': 'bg-success-subtle text-success',
            'declined': 'bg-danger-subtle text-danger'
        };
        const className = statusMap[rowData.status?.toLowerCase()] || 'bg-light text-body';
        return <span className={`badge ${className} text-uppercase`}>{rowData.status}</span>;
    };

    // Delete handlers
    const openDeleteModal = () => {
        if (!selectedLeads || selectedLeads.length === 0) {
            toast.warn('Please select at least one item to delete.');
            return;
        }
        setDeleteRows(selectedLeads);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            setLoading(true);
            // Demo delete behavior
            const idsToDelete = deleteRows.map(r => r.id);
            setLeads(prev => prev.filter(l => !idsToDelete.includes(l.id)));

            toast.success('Applications deleted successfully (Demo)');
            setShowDeleteModal(false);
            setSelectedLeads([]);
        } catch (err) {
            toast.error('Failed to delete items');
        } finally {
            setLoading(false);
        }
    };

    const openConvertModal = (rowData) => {
        setTargetLead(rowData);
        // For demo, assume info is present
        setShowConvertModal(true);
    };

    const handleMissingInfoConfirm = async (updatedData) => {
        // Demo logic
        setTargetLead({ ...targetLead, ...updatedData });
        setShowMissingInfoModal(false);
        setShowConvertModal(true);
    };

    const handleConvertLeadConfirm = async () => {
        if (!targetLead) return;
        setConversionLoading(true);
        setTimeout(() => {
            toast.success(`Application converted successfully (Demo)`);
            setShowConvertModal(false);
            setConversionLoading(false);
        }, 1000);
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header Section */}
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Pre-Qualification Applications</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Pre-Qualification Applications</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="btn-group">
                                        {Array.isArray(selectedLeads) && selectedLeads.length > 0 ? (
                                            <>
                                                <button type="button" className="btn bg-success text-white fw-medium">Actions</button>
                                                <button type="button" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                                    <span className="visually-hidden">Toggle Dropdown</span>
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-end">
                                                    <li>
                                                        <button type="button" className="dropdown-item text-danger" onClick={openDeleteModal}>
                                                            <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                                        </button>
                                                    </li>
                                                </ul>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="row">
                    {statsLoading ? (
                        [1, 2, 3, 4].map(i => <StatisticsCardSkeleton key={i} />)
                    ) : (
                        statisticsConfig.map((config, index) => (
                            <StatisticsCard
                                key={index}
                                title={config.title}
                                count={config.dataKey.includes('rate') ? `${stats[config.dataKey]}` : stats[config.dataKey]}
                                icon={config.icon}
                                colorVariant={config.colorVariant}
                            />
                        ))
                    )}
                </div>

                {/* Filters and Table */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <form className="table-filter" onSubmit={(e) => {
                                    e.preventDefault();
                                    handleApplyFilters();
                                }}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-xxl-3 col-sm-12">
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
                                        {isHost && (
                                            <div className="col-xxl-2 col-sm-4">
                                                <Dropdown
                                                    value={selectedLeadType}
                                                    options={[{ label: 'All Types', value: '' }, ...FUNDING_TYPE_OPTIONS]}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    onChange={(e) => setSelectedLeadType(e.value)}
                                                    placeholder="All Types"
                                                    className="w-100 employee-filter-dropdown"
                                                />
                                            </div>
                                        )}
                                        <div className={`col-xxl-${isHost ? '2' : '3'} col-sm-4`}>
                                            <Dropdown
                                                value={selectedStatus}
                                                options={[{ label: 'All Status', value: '' }, ...APPLICATION_STATUS_OPTIONS]}
                                                optionLabel="label"
                                                optionValue="value"
                                                onChange={(e) => setSelectedStatus(e.value)}
                                                placeholder="All Status"
                                                className="w-100 employee-filter-dropdown"
                                            />
                                        </div>
                                        <div className={`col-xxl-${isHost ? '2' : '3'} col-sm-4`}>
                                            <Calendar
                                                value={dateRange}
                                                onChange={(e) => setDateRange(e.value)}
                                                selectionMode="range"
                                                readOnlyInput
                                                placeholder="Select Date Range"
                                                className="w-100 employee-filter-dropdown"
                                                showIcon
                                            />
                                        </div>
                                        <div className="col-xxl-3 col-sm-12">
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

                                {loading ? (
                                    <TableLoader rows={10} columns={new Array(9).fill({ style: { minWidth: '100px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="510px"
                                            value={leads}
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
                                            selection={selectedLeads}
                                            onSelectionChange={(e) => setSelectedLeads(e.value)}
                                            dataKey="id"
                                            onRowClick={(e) => {
                                                const isCheckbox = e.originalEvent.target.closest('.p-checkbox') ||
                                                    e.originalEvent.target.closest('.p-selection-column') ||
                                                    e.originalEvent.target.closest('.btn');
                                                if (!isCheckbox) navigate(`/leads/${e.data.id}`);
                                            }}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No applications found"
                                        >
                                            {hasPermission('delete leads') && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}
                                            <Column header="Name" field="full_name" sortable filter filterPlaceholder="Search name" style={{ minWidth: '160px' }} />
                                            <Column field="business_name" header="Business Name" sortable filter filterPlaceholder="Search business" style={{ minWidth: '180px' }} />
                                            <Column field="funding_type" header="Funding Type" sortable filter filterPlaceholder="Search type" style={{ minWidth: '150px' }} />
                                            <Column header="Requested Amount" field="requested_amount" body={(rowData) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rowData.requested_amount || 0)} sortable style={{ minWidth: '160px' }} />
                                            <Column field="date" header="Date" body={(rowData) => rowData.date || '-'} sortable style={{ minWidth: '120px' }} />
                                            <Column field="status" header="Status" body={statusBodyTemplate} sortable filter filterPlaceholder="Search status" style={{ minWidth: '140px' }} />
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
                    onClose={() => setShowDeleteModal(false)}
                    loading={loading}
                    text="The selected items will be deleted (Demo)."
                />
            </div>
        </div>
    );
}
