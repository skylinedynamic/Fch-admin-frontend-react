import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchContacts, deleteContacts } from '../../modules/contact/services';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import TableLoader from '../../components/Loader/TableLoader';
import FilterLoader from '../../components/Loader/FilterLoader';
import { toast } from 'react-toastify';
import { usePermissions } from '../../lib/auth/usePermissions';

export default function Contacts() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    // State for contacts
    const [contacts, setContacts] = useState([]);
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
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({});

    // Checkbox selection state
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteRows, setDeleteRows] = useState([]);

    // Initialize filters
    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            mobile_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            company_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            address: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    // Initialize filters on mount
    useEffect(() => {
        initFilters();
    }, []);

    // Load contacts data with filters
    useEffect(() => {
        if (!appliedFilters || Object.keys(appliedFilters).length === 0) return;

        const load = async () => {
            setLoading(true);
            try {
                const payload = {
                    search: appliedSearchText || '',
                    filters: appliedFilters,
                    page,
                    per_page: perPage,
                    sort_field: sortField,
                    sort_order: sortOrder,
                };

                const result = await fetchContacts(payload);
                if (result.status) {
                    const data = result.data || [];
                    const meta = result.meta;

                    setContacts(data);
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
                    const errorMsg = result.message || 'Failed to fetch contacts';
                    setError(errorMsg);
                    toast.error(errorMsg);
                }
            } catch (err) {
                console.error('Fetch Error:', err);
                const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch contacts';
                setError(errorMessage);
                toast.error(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(() => {
            load();
        }, 300);

        return () => clearTimeout(timeout);
    }, [appliedSearchText, appliedFilters, page, perPage, sortField, sortOrder]);

    // Filter handlers
    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedFilters(filters);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearchText('');
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
        if (!selectedContacts || selectedContacts.length === 0) {
            toast.warn('Please select at least one contact to delete.');
            return;
        }
        setDeleteRows(selectedContacts);
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
            const response = await deleteContacts(ids);

            if (response && response.status) {
                toast.success(response.message || "Contact(s) deleted successfully.");
                setShowDeleteModal(false);
                setSelectedContacts([]);

                // Trigger reload
                setAppliedFilters({ ...appliedFilters });
            } else {
                toast.error(response?.message || "Failed to delete contacts.");
            }
        } catch (err) {
            console.error('Delete error:', err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to delete contacts.';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Column body templates
    const fullNameBody = (rowData) => {
        return (
            <div className="d-flex align-items-center">
                <span className="fw-medium">
                    {rowData.full_name}
                </span>
                {rowData.is_referral_partner && (
                    <span className="badge bg-success-subtle text-success ms-2 px-2 py-1 fs-11 border border-success-subtle rounded-pill">
                        <i className="ri-shake-hands-line me-1 align-bottom"></i> Referral Partner
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="page-content">
            <style>{`
                .p-datatable .p-datatable-emptymessage td {
                    text-align: center !important;
                    vertical-align: middle !important;
                    padding: 1rem 0 !important;
                    font-size: 1rem;
                    color: #6c757d;
                }
            `}</style>

            {/* Header */}
            <div className="container-fluid">
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Contacts</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Contacts</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <div className="d-flex gap-2">
                                    {hasPermission('delete contacts') && Array.isArray(selectedContacts) && selectedContacts.length > 0 ? (
                                        <div className="btn-group">
                                            <button type="button" className="btn bg-success text-white fw-medium">Actions</button>
                                            <button type="button" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                                <span className="visually-hidden">Toggle dropdown</span>
                                            </button>
                                            <ul className="dropdown-menu dropdown-menu-end">
                                                <li>
                                                    <button type="button" className="dropdown-item text-danger" onClick={openDeleteModal}>
                                                        <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    ) : hasPermission('create contacts') ? (
                                        <button
                                            type="button"
                                            className="btn btn-primary fw-medium waves-effect waves-light"
                                            onClick={() => navigate('/contacts/create')}
                                        >
                                            <i className="ri-add-fill me-1 align-bottom"></i> Add Contact
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
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
                                    {loading ? (
                                        <FilterLoader config={[
                                            { col: "col-xxl-9 col-sm-8" }, // Search
                                            { col: "col-xxl-3 col-sm-4", isButton: true } // Buttons
                                        ]} />
                                    ) : (
                                        <div className="d-flex align-items-center gap-2 mb-3">
                                            <div className="flex-grow-1 position-relative">
                                                <div className="search-box">
                                                    <input
                                                        type="text"
                                                        className="form-control search bg-light border-light"
                                                        placeholder="Search here..."
                                                        autoComplete="off"
                                                        value={searchText}
                                                        onChange={(e) => setSearchText(e.target.value)}
                                                    />
                                                    <i className="ri-search-line search-icon"></i>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <div className="d-flex gap-2">
                                                    <button type="button" className="btn btn-warning" onClick={handleApplyFilters}>
                                                        <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                                    </button>
                                                    <button type="button" className="btn btn-default" onClick={handleClearFilters}>
                                                        <i className="ri-close-line me-1 align-bottom"></i> Clear
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </form>

                                {/* DataTable */}
                                {loading ? (
                                    <TableLoader
                                        rows={10}
                                        columns={[
                                            { style: { width: '3rem' } },
                                            { style: { minWidth: '180px' } },
                                            { style: { minWidth: '180px' } },
                                            { style: { minWidth: '150px' } },
                                            { style: { minWidth: '220px' } }
                                        ]}
                                    />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="510px"
                                            value={contacts}
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
                                            selection={selectedContacts}
                                            onSelectionChange={(e) => setSelectedContacts(e.value)}
                                            dataKey="id"
                                            onRowClick={(e) => {
                                                const isCheckbox = e.originalEvent.target.closest('.p-checkbox') ||
                                                    e.originalEvent.target.closest('.p-selection-column') ||
                                                    e.originalEvent.target.tagName === 'INPUT';
                                                if (!isCheckbox) {
                                                    navigate(`/contacts/${e.data.id}`);
                                                }
                                            }}
                                            emptyMessage="No contacts found"
                                            className="p-datatable-sm"
                                        >
                                            {hasPermission('delete contacts') && (
                                                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false} />
                                            )}
                                            <Column field="full_name" header="Full Name" body={fullNameBody} sortable filter showFilterMatchModes filterPlaceholder="Search by name" style={{ minWidth: '180px' }} />
                                            <Column field="company_name" header="Company" sortable filter showFilterMatchModes filterPlaceholder="Search by company" style={{ minWidth: '180px' }} />
                                            <Column field="mobile_number" header="Mobile" sortable filter showFilterMatchModes filterPlaceholder="Search by mobile" style={{ minWidth: '150px' }} />
                                            <Column field="email" header="Email" sortable filter showFilterMatchModes filterPlaceholder="Search by email" style={{ minWidth: '220px' }} />
                                            <Column field="address" header="Address" sortable filter showFilterMatchModes filterPlaceholder="Search by address" style={{ minWidth: '200px' }} />

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
                    text="The selected contacts and all associated data will be deleted."
                />
            </div>
        </div>
    );
}
