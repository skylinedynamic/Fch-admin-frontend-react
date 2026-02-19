import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Dropdown } from 'primereact/dropdown';
import { Column } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { toast } from 'react-toastify';

import { fetchTiers, deleteTier, deleteTiers } from '../../modules/tiers/services';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import TableLoader from '../../components/Loader/TableLoader';
import { useAuthStore } from '../../store/auth/authStore';

export default function TiersList() {
    const { user } = useAuthStore();
    const isDeveloper = user?.role_name === 'Developer';

    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination & Sort
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    // PrimeReact DataTable Filters (for column-specific filters if used)
    const [filters, setFilters] = useState({
        name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        title: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        subtitle: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        order: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
    });

    // UI Filter State (Input values)
    const [searchText, setSearchText] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');

    // Selection
    const [selectedTiers, setSelectedTiers] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [deleteRows, setDeleteRows] = useState([]);

    // Removed initFilters as filter states are now managed differently

    const loadTiers = async () => {
        setLoading(true);
        try {
            const payload = {
                page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder,
                search: appliedSearchText, // Use applied state
                filters: filters // Include column filters
            };

            const result = await fetchTiers(payload);

            if (result.status) {
                setTiers(Array.isArray(result.data) ? result.data : []);
                const meta = result.meta;
                if (meta) {
                    setTotalRecords(typeof meta.total === 'number' ? meta.total : (result.data || []).length);
                } else {
                    setTotalRecords(Array.isArray(result.data) ? result.data.length : 0);
                }
            } else {
                setError(result.message);
                setTiers([]);
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch tiers');
            setTiers([]);
            toast.error(err.message || 'Failed to load tiers'); // Added toast for load error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTiers();
    }, [page, perPage, sortField, sortOrder, appliedSearchText, filters]);

    const onPage = (event) => {
        setPage(event.first / event.rows + 1); // Corrected page calculation
        setPerPage(event.rows);
    };

    const onSort = (event) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    const onFilter = (event) => {
        setFilters(event.filters);
    };

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setPage(1); // Reset to first page when filters are applied
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearchText('');
        setPage(1); // Reset to first page when filters are cleared
        // Optionally reset DataTable's internal filters if they were used
        setFilters({
            name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            title: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            subtitle: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            order: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
        });
    };

    const openDeleteModal = () => {
        if (!selectedTiers || selectedTiers.length === 0) {
            toast.warn('Please select at least one tier to delete.');
            return;
        }
        setDeleteRows(selectedTiers);
        setDeleteId(null); // Ensure we are not in single delete mode
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setDeleteId(null);
        setDeleteRows([]);
    };

    const handleDeleteConfirm = async () => {
        // If deleteId is present, we are deleting a single item via the trash icon
        // If deleteRows is present, we are deleting multiple items via checkbox
        // However, the current logic in 'openDeleteModal' uses 'deleteRows' (from selection)
        // And 'handleDeleteClick' uses 'deleteId'.
        // We need to unify this or handle both.

        // Fix: logic to handle both single and multiple delete
        let idsToDelete = [];

        if (deleteId) {
            idsToDelete = [deleteId];
        } else if (deleteRows && deleteRows.length > 0) {
            idsToDelete = deleteRows.map(t => t.id);
        }

        if (idsToDelete.length === 0) return;

        try {
            setLoading(true);
            await deleteTiers(idsToDelete);

            toast.success("Tier(s) deleted successfully");
            setShowDeleteModal(false);
            setDeleteId(null);
            setDeleteRows([]);
            setSelectedTiers([]);
            loadTiers();
        } catch (err) {
            console.error('Delete error:', err);
            toast.error(err.message || 'Failed to delete tiers. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const nameBodyTemplate = (rowData) => {
        return (
            <Link to={`/tiers/${rowData.id}`} className="fw-medium link-primary">
                {rowData.name}
            </Link>
        );
    };

    const titleBodyTemplate = (rowData) => {
        return (
            <Link to={`/tiers/${rowData.id}`} className="fw-medium link-primary">
                {rowData.title}
            </Link>
        );
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Manage Tier</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active"><Link to="/tiers">Manage Tier</Link></li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <form onSubmit={(e) => e.preventDefault()}>
                                    <div className="row g-3 mb-0 align-items-center">
                                        <div className="col-sm-auto">
                                            {isDeveloper && (
                                                <div className="btn-group">
                                                    {Array.isArray(selectedTiers) && selectedTiers.length > 0 ? (
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
                                                        <Link to="/tiers/create" className="btn btn-primary fw-medium waves-effect waves-light">
                                                            <i className="ri-add-fill me-1 align-bottom"></i> Add Tier
                                                        </Link>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    handleApplyFilters();
                                }}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-xxl-9 col-sm-8">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    autoComplete="off"
                                                    placeholder="Search here..."
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
                                    <TableLoader
                                        rows={5}
                                        columns={[
                                            ...(isDeveloper ? [{ style: { width: '3rem' } }] : []),
                                            { style: { width: '25%' } },       // Name
                                            { style: { width: '30%' } },       // Title
                                            { style: { width: '30%' } },       // Subtitle
                                            { style: { width: '15%' } }        // Order
                                        ]}
                                    />
                                ) : (
                                    <DataTable
                                        value={tiers || []}
                                        paginator
                                        rows={perPage}
                                        totalRecords={totalRecords}
                                        lazy
                                        first={(page - 1) * perPage}
                                        onPage={onPage}
                                        onSort={onSort}
                                        sortField={sortField}
                                        sortOrder={sortOrder === 'asc' ? 1 : -1}
                                        filters={filters}
                                        filterDisplay="menu"
                                        onFilter={onFilter}
                                        className="p-datatable-sm"
                                        tableStyle={{ minWidth: '50rem' }}
                                        selection={selectedTiers}
                                        onSelectionChange={(e) => setSelectedTiers(e.value)}
                                        selectionMode={isDeveloper ? "multiple" : null}
                                        dataKey="id"
                                    >
                                        {isDeveloper && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false} />}
                                        <Column field="name" header="Name" body={nameBodyTemplate} sortable filter filterPlaceholder="Search Name" style={{ width: '25%' }} />
                                        <Column field="title" header="Title" body={titleBodyTemplate} sortable filter filterPlaceholder="Search Title" style={{ width: '30%' }} />
                                        <Column field="subtitle" header="Subtitle" sortable filter filterPlaceholder="Search Subtitle" className="text-truncate" style={{ width: '30%', maxWidth: '300px' }} />
                                        <Column field="order" header="Order" sortable filter filterPlaceholder="Search Order" headerStyle={{ width: '15%', textAlign: 'center' }} bodyClassName="text-center" style={{ width: '15%' }} />
                                    </DataTable>
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
                    text="The selected tiers will be deleted."
                />
            </div>
        </div>
    );
}
