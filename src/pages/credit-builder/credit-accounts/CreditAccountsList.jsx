import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../common/PageHeader';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import TableLoader from '../../../components/Loader/TableLoader';
import FilterLoader from '../../../components/Loader/FilterLoader';
import { fetchCreditAccounts, deleteCreditAccounts } from '../../../modules/credit-accounts/services';
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import DeleteBlockedModal from '../../../components/Common/Modals/DeleteBlockedModal';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { STATUS_OPTIONS, STATUS_CLASS_MAP, CREDIT_CATEGORY_OPTIONS } from '../../../config/creditBuilder';

/** Why the cards cannot be deleted - on Delete Selected, or when the API refused. The cards are listed under it. */
const blockedMessage = ({ reason, items, selected }) => {
    const one = items.length === 1;
    if (reason === 'delete') {
        return one
            ? 'A borrower applied for this card after the list loaded, so nothing was deleted.'
            : 'Borrowers applied for these cards after the list loaded, so nothing was deleted.';
    }
    const others = selected > items.length;
    if (one) {
        return others
            ? "Borrowers have applied for this card, so it can't be deleted. Unselect it to delete the others."
            : "Borrowers have applied for this card, so it can't be deleted.";
    }
    return others
        ? "Borrowers have applied for these cards, so they can't be deleted. Unselect them to delete the others."
        : "Borrowers have applied for these cards, so they can't be deleted.";
};

export default function CreditAccountsList() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState([]);


    // Pagination state
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Sorting state
    const [sortField, setSortField] = useState('id');
    const [sortOrder, setSortOrder] = useState('desc');

    // Filter states
    const [searchText, setSearchText] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [filters, setFilters] = useState({});
    const [appliedFilters, setAppliedFilters] = useState({});
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Delete selected: only cards no borrower has applied for (can_delete).
    const canDelete = hasPermission('delete credit accounts');
    const [selectedAccounts, setSelectedAccounts] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    // Cards that cannot be deleted because borrowers applied for them: shown on
    // Delete Selected ('selection') or when the API refuses a delete ('delete').
    const [blocked, setBlocked] = useState({ reason: null, items: [], selected: 0 });
    const closeBlocked = () => setBlocked({ reason: null, items: [], selected: 0 });
    const blockedItem = (account) => ({ id: account.id, name: account.card_name || account.name });

    // Delete Selected: a card a borrower has applied for is kept - say which
    // instead of asking to confirm, as Leads does for converted leads.
    const openDeleteModal = () => {
        const kept = selectedAccounts.filter((account) => account.can_delete === false);
        if (kept.length > 0) {
            setBlocked({ reason: 'selection', items: kept.map(blockedItem), selected: selectedAccounts.length });
            return;
        }
        setShowDeleteModal(true);
    };

    // Initialize filters
    const initFilters = () => {
        const initial = {
            card_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            issuer: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            credit_category: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            typical_personal_fico_min: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            time_in_business_min_months: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    useEffect(() => {
        initFilters();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const payload = {
                page: page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder,
                search: appliedSearchText,
                filters: appliedFilters,
                status: selectedStatus || undefined,
                credit_category: selectedCategory || undefined,
            };
            const response = await fetchCreditAccounts(payload);
            if (response.status !== false) {
                setAccounts(response.data || []);
                setTotalRecords(response.meta?.total || response.total || 0);
            } else {
                toast.error(response.message || 'Failed to fetch credit accounts');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch credit accounts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, perPage, sortField, sortOrder, appliedSearchText, appliedFilters, selectedStatus, selectedCategory]);

    const onPage = (event) => {
        const nextPerPage = event.rows;
        const nextPage = Math.floor(event.first / event.rows) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    const onSort = (event) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
        setPage(1);
    };

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedFilters(filters);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearchText('');
        setSelectedStatus(null);
        setSelectedCategory(null);
        initFilters();
        setPage(1);
    };

    const imageBodyTemplate = (rowData) => {
        return (
            <div className="d-flex ">
                {rowData.full_image_url ? (
                    <img src={rowData.full_image_url} alt={rowData.card_name} className="rounded" style={{ width: '60px', height: 'auto', objectFit: 'contain' }} />
                ) : (
                    <div className="bg-light rounded  justify-content-center" style={{ width: '60px', height: 'auto' }}>
                        <i className="ri-image-line text-muted fs-20"></i>
                    </div>
                )}
            </div>
        );
    };

    const nameBodyTemplate = (rowData) => {
        return (
            <Link to={`/credit-accounts/${rowData.id}`} className="fw-medium link-primary">
                {rowData.card_name}
            </Link>
        );
    };

    const statusBodyTemplate = (rowData) => {
        const status = rowData.status || 'Active';
        const badgeClass = STATUS_CLASS_MAP[status] || 'bg-light text-muted';
        // Status is set on the card's details page.
        return <span className={`badge ${badgeClass} fs-12`}>{status}</span>;
    };

    const statusFilterTemplate = (options) => {
        return (
            <Dropdown
                value={options.value || null}
                options={[{ label: 'All Status', value: null }, ...STATUS_OPTIONS]}
                onChange={(e) => options.filterCallback(e.value)}
                optionLabel="label"
                optionValue="value"
                placeholder="All Status"
                className="w-100"
                appendTo="self"
            />
        );
    };

    const categoryFilterTemplate = (options) => {
        return (
            <Dropdown
                value={options.value || null}
                options={[{ label: 'All Categories', value: null }, ...CREDIT_CATEGORY_OPTIONS]}
                onChange={(e) => options.filterCallback(e.value)}
                optionLabel="label"
                optionValue="value"
                placeholder="All Categories"
                className="w-100"
                appendTo="self"
            />
        );
    };



    const handleDeleteConfirm = async () => {
        try {
            setDeleting(true);
            const response = await deleteCreditAccounts(selectedAccounts.map((account) => account.id));
            toast.success(response?.message || 'Credit accounts deleted successfully');
            setShowDeleteModal(false);
            setSelectedAccounts([]);
            loadData();
        } catch (err) {
            // A borrower applied for one meanwhile: nothing was deleted - say which.
            const applied = err.response?.data?.errors?.applied;
            setShowDeleteModal(false);
            if (err.response?.status === 422 && Array.isArray(applied) && applied.length > 0) {
                setBlocked({ reason: 'delete', items: applied.map(blockedItem), selected: selectedAccounts.length });
                return;
            }
            toast.error(err.response?.data?.message || 'Failed to delete credit accounts');
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        // Add class to body to prevent global scroll
        document.body.classList.add('table-page-fit-active');

        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                <PageHeader 
                    title="Credit Accounts" 
                    breadcrumbs={[
                        { label: 'Credit Builder', path: '#' },
                        { label: 'Credit Accounts' }
                    ]} 
                >
                    <div className="mt-0">
                        <div className="btn-group">
                            {canDelete && selectedAccounts.length > 0 ? (
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
                            ) : hasPermission('create credit accounts') ? (
                                <Link to="/credit-accounts/create" className="btn btn-primary fw-medium waves-effect waves-light">
                                    <i className="ri-add-fill me-1 align-bottom"></i> Add Account
                                </Link>
                            ) : null}
                        </div>
                    </div>
                </PageHeader>

                <div className="row row-table-fit credit-account-section">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body list-fluid-card">
                                <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}>
                                    {loading ? (
                                        <FilterLoader config={[
                                            { col: "col-xxl-4 col-sm-12" }, // Search
                                            { col: "col-xxl-3 col-sm-6" },  // Status
                                            { col: "col-xxl-2 col-sm-6" },  // Category
                                            { col: "col-xxl-3 col-sm-12", isButton: true } // Buttons
                                        ]} />
                                    ) : (
                                        <div className="row g-3 mb-3">
                                            <div className="col-xxl-4 col-sm-12">
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
                                            <div className="col-xxl-3 col-sm-6">
                                                <Dropdown
                                                    value={selectedStatus}
                                                    options={[{ label: 'All Status', value: null }, ...STATUS_OPTIONS]}
                                                    onChange={(e) => setSelectedStatus(e.value)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="All Status"
                                                    className="w-100 employee-filter-dropdown"
                                                    appendTo="self"
                                                />
                                            </div>
                                            <div className="col-xxl-2 col-sm-6">
                                                <Dropdown
                                                    value={selectedCategory}
                                                    options={[{ label: 'All Categories', value: null }, ...CREDIT_CATEGORY_OPTIONS]}
                                                    onChange={(e) => setSelectedCategory(e.value)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="All Categories"
                                                    className="w-100 employee-filter-dropdown"
                                                    appendTo="self"
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
                                    )}
                                </form>

                                {loading ? (
                                    <TableLoader rows={12} columns={new Array(7).fill({ style: { minWidth: '120px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            // BUG-007: without it PrimeReact shows its dropdown default, "No available options".
                                            emptyMessage="No credit accounts found"
                                            value={accounts}
                                            paginator
                                            lazy
                                            rows={perPage}
                                            rowsPerPageOptions={[10, 25, 50, 100]}
                                            first={(page - 1) * perPage}
                                            totalRecords={totalRecords}
                                            onPage={onPage}
                                            onSort={onSort}
                                            sortField={sortField}
                                            sortOrder={sortOrder === 'asc' ? 1 : -1}
                                            onFilter={(e) => {
                                                setFilters(e.filters);
                                                setAppliedFilters(e.filters);
                                                setPage(1);
                                            }}
                                            filters={filters}
                                            filterDisplay="menu"
                                            className="p-datatable-sm custom-datatable"
                                            tableStyle={{ minWidth: '100%' }}
                                            dataKey="id"
                                            scrollable
                                            scrollHeight="flex"
                                            selection={selectedAccounts}
                                            onSelectionChange={(e) => setSelectedAccounts(e.value)}
                                        >
                                            {canDelete && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}

                                            <Column header="Image" body={imageBodyTemplate} style={{ minWidth: '60px' }} />
                                            <Column field="card_name" header="Name" body={nameBodyTemplate} sortable filter filterPlaceholder="Search" style={{ minWidth: '200px' }} />
                                            <Column field="issuer" header="Issuer" sortable filter filterPlaceholder="Search" style={{ minWidth: '150px' }} />
                                            <Column field="credit_category" header="Category" sortable filter filterElement={categoryFilterTemplate} showFilterMenu={false} filterPlaceholder="Search" style={{ minWidth: '150px' }} />
                                            <Column field="typical_personal_fico_min" header="FICO Min" sortable filter filterPlaceholder="Search" style={{ minWidth: '120px' }} />

                                            <Column field="time_in_business_min_months" header="Minimum Months" sortable filter filterPlaceholder="Search" style={{ minWidth: '150px' }} />
                                            <Column field="status" header="Status" body={statusBodyTemplate} sortable filter filterElement={statusFilterTemplate} showFilterMenu={false} filterPlaceholder="Search" style={{ minWidth: '120px' }} />
                                        </DataTable>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DeleteConfirmationModal
                show={showDeleteModal}
                onConfirm={handleDeleteConfirm}
                onClose={() => setShowDeleteModal(false)}
                loading={deleting}
                text={selectedAccounts.length === 1 ? 'The selected credit account will be deleted.' : `The ${selectedAccounts.length} selected credit accounts will be deleted.`}
            />

            <DeleteBlockedModal
                show={blocked.items.length > 0}
                tone="danger"
                title={blocked.items.length === 1 ? 'Card Cannot Be Deleted' : 'Cards Cannot Be Deleted'}
                message={blockedMessage(blocked)}
                items={blocked.items}
                onItemClick={(cardId) => { closeBlocked(); navigate(`/credit-accounts/${cardId}`); }}
                note="To stop offering a card, switch it to Inactive on its page. Borrowers' applications are kept."
                primaryAction={blocked.items.length === 1 ? {
                    label: 'Open card',
                    icon: 'ri-external-link-line',
                    onClick: () => { const cardId = blocked.items[0].id; closeBlocked(); navigate(`/credit-accounts/${cardId}`); },
                } : undefined}
                onClose={closeBlocked}
            />
        </div>
    );
}
