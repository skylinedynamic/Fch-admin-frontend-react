import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchPartners, allUsers, deletePartners, fetchPartnerStats } from '../../modules/partner/services';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import StatisticsCard from '../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../components/Common/StatisticsCardSkeleton';
import TableLoader from '../../components/Loader/TableLoader';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Partners() {
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
    const [sortOrder, setSortOrder] = useState('asc');

    // Filter states
    const [filters, setFilters] = useState({});
    const [searchText, setSearchText] = useState('');
    const [selectedPartner, setSelectedPartner] = useState('');
    const [selectedAssignedUser, setSelectedAssignedUser] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [appliedPartner, setAppliedPartner] = useState('');
    const [appliedAssignedUser, setAppliedAssignedUser] = useState('');
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
        active_count: 0,
        new_this_month: 0,
        total_partners: 0,
        inactive_count: 0
    });
    const [statsLoading, setStatsLoading] = useState(true);

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
            partner_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    // Initialize filters on mount
    useEffect(() => {
        initFilters();
    }, []);

    // Load all partners for dropdown
    useEffect(() => {
        const loadPartners = async () => {
            try {
                const result = await fetchPartners();
                if (result.status) {

                    // Map partners to include id and full_name for display
                    const formattedPartners = (result.data || []).map(partner => ({
                        id: partner.id,
                        full_name: partner.full_name,
                        displayLabel: `${partner.full_name}`
                    }));
                    setPartnersList(formattedPartners);
                }
            } catch (err) {
                console.error('Failed to load partners:', err);
            }
        };
        loadPartners();
    }, []);

    // Load all assigned users for dropdown
    useEffect(() => {
        const loadAssignedUsers = async () => {
            try {
                const result = await allUsers();
                if (result.status) {
                    // Map users to include id and full_name for display
                    const formattedUsers = (result.data || []).map(user => ({
                        id: user.id,
                        full_name: user.name,
                        displayLabel: ` ${user.name}`
                    }));
                    setAssignedUsersList(formattedUsers);
                }
            } catch (err) {
                console.error('Failed to load assigned users:', err);
            }
        };
        loadAssignedUsers();
    }, []);

    // Load partner statistics
    useEffect(() => {
        const loadStats = async () => {
            try {
                setStatsLoading(true);
                const result = await fetchPartnerStats();
                if (result.status && result.data) {
                    setStats({
                        active_count: result.data.active_count || 0,
                        new_this_month: result.data.new_this_month || 0,
                        total_partners: result.data.total_partners || 0,
                        inactive_count: result.data.inactive_count || 0
                    });
                }
            } catch (err) {
                console.error('Failed to load partner statistics:', err);
            } finally {
                setStatsLoading(false);
            }
        };
        loadStats();
    }, []);

    // Statistics cards configuration
    const statisticsConfig = [
        {
            title: "Active Partners",
            dataKey: "active_count",
            icon: "ri-ticket-line",
            colorVariant: "primary"
        },
        {
            title: "New This Month",
            dataKey: "new_this_month",
            icon: "ri-folder-open-line",
            colorVariant: "warning"
        },
        {
            title: "Total Partners",
            dataKey: "total_partners",
            icon: "ri-group-line",
            colorVariant: "info"
        },
        {
            title: "Inactive",
            dataKey: "inactive_count",
            icon: "ri-star-line",
            colorVariant: "success"
        }
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
                    setError(null);

                    // Update pagination info from backend
                    if (meta) {
                        setTotalRecords(typeof meta.total === 'number' ? meta.total : data.length);
                        if (typeof meta.current_page === 'number') setPage(meta.current_page);
                        if (typeof meta.per_page === 'number') setPerPage(meta.per_page);
                    } else {
                        setTotalRecords(data.length);
                    }
                } else {
                    setError(result.message || 'Failed to fetch partners');
                }
            } catch (err) {
                setError(err.message || 'Failed to fetch partners');
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(() => {
            load();
        }, 300);

        return () => clearTimeout(timeout);
    }, [appliedSearchText, appliedPartner, appliedAssignedUser, appliedFilters, page, perPage, sortField, sortOrder]);

    // Filter handlers
    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedPartner(selectedPartner);
        setAppliedAssignedUser(selectedAssignedUser);
        setAppliedFilters(filters);
        setPage(1); // Reset to first page when applying filters
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedPartner('');
        setSelectedAssignedUser('');
        setAppliedSearchText('');
        setAppliedPartner('');
        setAppliedAssignedUser('');
        initFilters();
        setPage(1); // Reset to first page when clearing filters
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
        setAppliedFilters(e.filters); // Apply filters immediately
        setPage(1); // Reset to first page when filtering
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

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteRows || deleteRows.length === 0) return;

        const ids = deleteRows.map(p => p.id);
        try {
            setLoading(true);
            await deletePartners(ids);
            toast.success("Partners deleted successfully");
            setShowDeleteModal(false);
            setSelectedPartners([]);

            // Trigger reload
            setAppliedFilters({ ...appliedFilters });
        } catch (err) {
            console.error('Delete error:', err);
            toast.error(err.response?.data?.message || 'Failed to delete partners. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Column body templates
    const companyNameBody = (rowData) => {
        const handleClick = (e) => {
            // Prevent row selection when clicking the company name link
            e.stopPropagation();
        };

        return (
            <Link
                to={`/partners/${rowData.id}`}
                state={{ activeTab: 'personalDetails' }}
                className="fw-medium link-primary"
                onClick={handleClick}
            >
                {rowData.company_name}
            </Link>
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
                                <h4 className="fs-20 mb-1">Partners</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Partners</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <form onSubmit={(e) => e.preventDefault()}>
                                    <div className="row g-3 mb-0 align-items-center">
                                        <div className="col-sm-auto">
                                            <div className="btn-group">
                                                {Array.isArray(selectedPartners) && selectedPartners.length > 0 ? (
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
                                                ) : (
                                                    <Link to="/partners/create" id="primaryActionBtn" className="btn btn-primary fw-medium waves-effect waves-light">
                                                        <i className="ri-add-fill me-1 align-bottom"></i> Add Partner
                                                    </Link>
                                                )}
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
                                        <div className="col-xxl-4 col-sm-12">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    id="searchJob"
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

                                        <div className="col-xxl-3 col-sm-4">
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

                                        <div className="col-xxl-3 col-sm-4">
                                            <Dropdown
                                                value={selectedAssignedUser}
                                                onChange={(e) => setSelectedAssignedUser(e.value)}
                                                options={[
                                                    { label: 'Assigned Users', value: '' },
                                                    ...assignedUsersList.map(user => ({
                                                        label: user.displayLabel,
                                                        value: user.id
                                                    }))
                                                ]}
                                                optionLabel="label"
                                                optionValue="value"
                                                placeholder="Assigned Users"
                                                className="w-100 employee-filter-dropdown"
                                            />
                                        </div>

                                        <div className="col-xxl-2 col-sm-4">
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

                                {/* DataTable with Skeleton Loader */}
                                {loading ? (
                                    <TableLoader
                                        rows={10}
                                        columns={[
                                            { style: { width: '3rem' } }, // Selection
                                            { style: { minWidth: '200px' } }, // Company Name
                                            { style: { minWidth: '150px' } }, // Partner Name
                                            { style: { minWidth: '200px' } }, // Email
                                            { style: { minWidth: '150px' } }, // Phone Number
                                            { style: { minWidth: '150px' } }, // Contact Person
                                            { style: { minWidth: '150px' } }, // Assigned User
                                            { style: { minWidth: '120px' } }  // Partner Type
                                        ]}
                                    />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="510px"
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
                                            globalFilterFields={[
                                                'company_name',
                                                'full_name',
                                                'contact_person',
                                                'email',
                                                'phone_number',
                                                'assigned_user_name',
                                                'partner_type'
                                            ]}
                                            selection={selectedPartners}
                                            onSelectionChange={(e) => setSelectedPartners(e.value)}
                                            dataKey="id"
                                            metaKeySelection={false}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            loading={false}
                                            emptyMessage="No partners found"
                                        >
                                            <Column
                                                selectionMode="multiple"
                                                headerStyle={{ width: '3rem' }}
                                                exportable={false}
                                            />
                                            <Column
                                                field="company_name"
                                                header="Company Name"
                                                body={companyNameBody}
                                                sortable
                                                filter
                                                showFilterMatchModes
                                                filterPlaceholder="Search by company"
                                                style={{ minWidth: '200px' }}
                                            />
                                            <Column
                                                field="full_name"
                                                header="Partner Name"
                                                sortable
                                                filter
                                                showFilterMatchModes
                                                filterPlaceholder="Search by Name"
                                                style={{ minWidth: '150px' }}
                                            />

                                            <Column
                                                field="email"
                                                header="Email"
                                                sortable
                                                filter
                                                showFilterMatchModes
                                                filterPlaceholder="Search by email"
                                                style={{ minWidth: '200px' }}
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
                                                field="contact_person"
                                                header="Contact Person"
                                                sortable
                                                filter
                                                showFilterMatchModes
                                                filterPlaceholder="Search by contact"
                                                style={{ minWidth: '150px' }}
                                            />
                                            <Column
                                                field="assigned_user_name"
                                                header="Assigned User"
                                                sortable
                                                filter
                                                showFilterMatchModes
                                                filterPlaceholder="Search by user"
                                                style={{ minWidth: '150px' }}
                                            />
                                            <Column
                                                field="partner_type"
                                                header="Partner Type"
                                                sortable
                                                filter
                                                showFilterMatchModes
                                                filterPlaceholder="Search by type"
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
                    text="The selected partners and all associated data will be deleted."
                />

            </div>
        </div>
    );
}
