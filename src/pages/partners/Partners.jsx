import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchPartners, allUsers, deletePartners, fetchPartnerStats } from '../../modules/partner/services';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import StatisticsCard from '../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../components/Common/StatisticsCardSkeleton';
import TableLoader from '../../components/Loader/TableLoader';
import FilterLoader from '../../components/Loader/FilterLoader';
import { toast } from 'react-toastify';
import { usePermissions } from '../../lib/auth/usePermissions';
import { BORROWER_STATUS_CLASS_MAP } from '../../config/statusOptions';
import { PARTNER_STATUS } from '../../config';
import { getTrialBadgeConfig } from '../../utils/badgeHelper';



export default function Partners() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();

    // State for partners
    const [partners, setPartners] = useState([]);
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
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedFreeTrial, setSelectedFreeTrial] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [appliedPartner, setAppliedPartner] = useState('');
    const [appliedAssignedUser, setAppliedAssignedUser] = useState('');
    const [appliedStatus, setAppliedStatus] = useState('');
    const [appliedFreeTrial, setAppliedFreeTrial] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({});


    // Checkbox selection state
    const [selectedPartners, setSelectedPartners] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteRows, setDeleteRows] = useState([]);

    // Dropdown data
    const [partnersList, setPartnersList] = useState([]);
    const [assignedUsersList, setAssignedUsersList] = useState([]);

    // Statistics data
    const [stats, setStats] = useState({
        active_partners: 0,
        new_this_month: 0,
        total_partners: 0,
        inactive_partners: 0
    });

    // Initialize filters
    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            company_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            contact_person: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            phone_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            assigned_user_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            partner_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
        };

        setFilters(initial);
        setAppliedFilters(initial);
    };

    // Initialize on mount
    useEffect(() => {
        initFilters();

        // Add class to body to prevent global scroll
        document.body.classList.add('table-page-fit-active');

        // Load partners for dropdown
        const loadPartnersList = async () => {
            try {
                const result = await fetchPartners();
                if (result.status) {
                    setPartnersList((result.data || []).map(p => ({
                        label: p.full_name,
                        value: p.id
                    })));
                }
            } catch (err) {
                console.error('Failed to load partners list:', err);
            }
        };
        loadPartnersList();

        // Load assigned users
        const loadAssignedUsers = async () => {
            try {
                const result = await allUsers();
                if (result.status) {
                    setAssignedUsersList((result.data || []).map(u => ({
                        label: u.name,
                        value: u.id
                    })));
                }
            } catch (err) {
                console.error('Failed to load assigned users:', err);
            }
        };
        loadAssignedUsers();

        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);

    const statisticsConfig = [
        { title: "Active Partners", dataKey: "active_partners", icon: "ri-ticket-line", colorVariant: "primary" },
        { title: "New This Month", dataKey: "new_this_month", icon: "ri-folder-open-line", colorVariant: "warning" },
        { title: "Total Partners", dataKey: "total_partners", icon: "ri-group-line", colorVariant: "info" },
        { title: "Inactive", dataKey: "inactive_partners", icon: "ri-star-line", colorVariant: "success" }
    ];


    // Load partners data with filters
    useEffect(() => {
        if (!appliedFilters || Object.keys(appliedFilters).length === 0) return;

        const load = async () => {
            setLoading(true);
            try {
                const payload = {
                    search: appliedSearchText || '',
                    partner_id: appliedPartner || '',
                    assigned_user_id: appliedAssignedUser || '',
                    status: appliedStatus || '',
                    is_free_trail: appliedFreeTrial || '',
                    filters: appliedFilters,

                    page,
                    per_page: perPage,
                    sort_field: sortField,
                    sort_order: sortOrder,
                };

                const result = await fetchPartners(payload);
                if (result.status) {
                    const data = result.data || [];
                    const meta = result.meta;
                    setPartners(data);
                    setTotalRecords(meta?.total || data.length);
                    // Update stats from the main API response
                    if (result.statistics) {
                        setStats(result.statistics);
                    }
                    setError(null);
                } else {

                    setError(result.message || 'Failed to fetch partners');
                    toast.error(result.message || 'Failed to fetch partners');
                }
            } catch (err) {
                setError(err.message || 'Failed to fetch partners');
                toast.error(err.message || 'Failed to fetch partners');
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(() => {
            load();
        }, 300);

        return () => clearTimeout(timeout);
    }, [appliedSearchText, appliedPartner, appliedAssignedUser, appliedFreeTrial, appliedFilters, page, perPage, sortField, sortOrder]);

    // Filter handlers
    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedPartner(selectedPartner);
        setAppliedAssignedUser(selectedAssignedUser);
        setAppliedStatus(selectedStatus);
        setAppliedFreeTrial(selectedFreeTrial);
        setAppliedFilters(filters);
        setPage(1);
    };


    const handleClearFilters = () => {
        setSearchText('');
        setSelectedPartner('');
        setSelectedAssignedUser('');
        setSelectedStatus('');
        setSelectedFreeTrial('');
        setAppliedSearchText('');
        setAppliedPartner('');
        setAppliedAssignedUser('');
        setAppliedStatus('');
        setAppliedFreeTrial('');
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

    // Body templates
    const companyNameBody = (rowData) => {
        const trialBadge = rowData.is_free_trail ? getTrialBadgeConfig(rowData.free_trail_end_date) : null;
        return (
            <div className="d-flex align-items-center gap-2">
                <span className="fw-medium">
                    {rowData.company_name}
                </span>
                {trialBadge && (
                    <span className={`badge ${trialBadge.badgeClass} fs-10 px-2 py-1`}>
                        <i className="ri-vip-crown-line me-1"></i>{trialBadge.label}
                    </span>
                )}
            </div>
        );
    };

    const statusBody = (rowData) => {
        const status = rowData.status || 'N/A';
        const colorClass = BORROWER_STATUS_CLASS_MAP[status] || 'bg-secondary-subtle text-secondary';
        return <span className={`badge ${colorClass}`}>{status}</span>;
    };


    // Delete handlers
    const openDeleteModal = () => {
        if (!selectedPartners || selectedPartners.length === 0) {
            toast.warn('Please select at least one partner to delete.');
            return;
        }
        setDeleteRows(selectedPartners);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        const ids = deleteRows.map(p => p.id);
        try {
            setLoading(true);
            await deletePartners(ids);
            toast.success("Partners deleted successfully");
            setShowDeleteModal(false);
            setSelectedPartners([]);
            setAppliedFilters({ ...appliedFilters });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete partners');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Header mirrored from Clients.jsx */}
                <PageHeader
                    title="Partners"
                    breadcrumbs={[{ label: 'Partners' }]}
                >
                    <div className="btn-group">
                        {hasPermission('delete partners') && Array.isArray(selectedPartners) && selectedPartners.length > 0 ? (
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
                        ) : hasPermission('create partners') ? (
                            <button
                                type="button"
                                className="btn btn-primary fw-medium waves-effect waves-light"
                                onClick={() => navigate('/partners/create')}
                            >
                                <i className="ri-add-fill me-1 align-bottom"></i> Add Partner
                            </button>
                        ) : null}
                    </div>
                </PageHeader>

                {/* Statistics Cards */}
                <div className="row partner-section">
                    {loading ? (
                        [1, 2, 3, 4].map(i => <StatisticsCardSkeleton key={i} />)
                    ) : (
                        statisticsConfig.map((config, index) => (
                            <StatisticsCard
                                key={index}
                                title={config.title}
                                count={stats[config.dataKey]}
                                icon={config.icon}
                                colorVariant={config.colorVariant}
                            />
                        ))
                    )}
                </div>

                {/* Filters and Table mirrored from Clients.jsx */}
                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card list-page-card">
                            <div className="card-body">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    handleApplyFilters();
                                }}>
                                    {loading ? (
                                        <FilterLoader config={[
                                            { col: "col-xxl-3 col-sm-6" }, // Search
                                            { col: "col-xxl-2 col-sm-6" }, // Partners
                                            { col: "col-xxl-2 col-sm-4" }, // Assigned Users
                                            { col: "col-xxl-2 col-sm-4" }, // Free Trial
                                            { col: "col-xxl-3 col-sm-4", isButton: true } // Buttons
                                        ]} />
                                    ) : (
                                        <div className="row g-3 mb-3">
                                            <div className="col-xxl-3 col-sm-6">
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
                                            <div className="col-xxl-2 col-sm-6">
                                                <Dropdown
                                                    value={selectedPartner}
                                                    options={[{ label: 'All Partners', value: '' }, ...partnersList]}
                                                    onChange={(e) => setSelectedPartner(e.value)}
                                                    placeholder="All Partners"
                                                    className="w-100 employee-filter-dropdown"
                                                />
                                            </div>
                                            <div className="col-xxl-2 col-sm-4">
                                                <Dropdown
                                                    value={selectedAssignedUser}
                                                    options={[{ label: 'Assigned Users', value: '' }, ...assignedUsersList]}
                                                    onChange={(e) => setSelectedAssignedUser(e.value)}
                                                    placeholder="Assigned Users"
                                                    className="w-100 employee-filter-dropdown"
                                                />
                                            </div>
                                            <div className="col-xxl-2 col-sm-4">
                                                <Dropdown
                                                    value={selectedFreeTrial}
                                                    options={[
                                                        { label: 'All Trial Status', value: '' },
                                                        { label: 'Free Trial Only', value: '1' },
                                                        { label: 'Regular Only', value: '0' }
                                                    ]}
                                                    onChange={(e) => setSelectedFreeTrial(e.value)}
                                                    placeholder="All Trial Status"
                                                    className="w-100 employee-filter-dropdown"
                                                />
                                            </div>
                                            <div className="col-xxl-3 col-sm-4">
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
                                    )}
                                </form>

                                {loading ? (
                                    <TableLoader rows={10} columns={new Array(8).fill({ style: { minWidth: '150px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="flex"
                                            value={partners}
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
                                            selection={selectedPartners}
                                            onSelectionChange={(e) => setSelectedPartners(e.value)}
                                            dataKey="id"
                                            onRowClick={(e) => {
                                                const isCheckbox = e.originalEvent.target.closest('.p-checkbox') ||
                                                    e.originalEvent.target.closest('.p-selection-column');
                                                if (!isCheckbox) navigate(`/partners/${e.data.id}`, { state: { activeTab: 'personalDetails' } });
                                            }}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No partners found"
                                        >
                                            {hasPermission('delete partners') && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}
                                            <Column field="company_name" header="Company Name" body={companyNameBody} sortable filter filterPlaceholder="Search by company" style={{ minWidth: '200px' }} />
                                            <Column field="full_name" header="Partner Name" sortable filter filterPlaceholder="Search by name" style={{ minWidth: '160px' }} />
                                            <Column field="email" header="Email" sortable filter filterPlaceholder="Search by email" style={{ minWidth: '200px' }} />
                                            <Column field="phone_number" header="Phone Number" sortable filter filterPlaceholder="Search by phone" style={{ minWidth: '150px' }} />
                                            <Column field="contact_person" header="Contact Person" sortable filter filterPlaceholder="Search by contact" style={{ minWidth: '160px' }} />
                                            <Column field="assigned_user_name" header="Assigned User" sortable filter filterPlaceholder="Search by user" style={{ minWidth: '160px' }} />
                                            <Column field="partner_type" header="Partner Type" sortable filter filterPlaceholder="Search by type" style={{ minWidth: '130px' }} />
                                            <Column field="status" header="Status" body={statusBody} sortable filter filterPlaceholder="Search by status" style={{ minWidth: '120px' }} />
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
                    text="The selected partners and all associated data will be deleted."
                />
            </div>
        </div>
    );
}
