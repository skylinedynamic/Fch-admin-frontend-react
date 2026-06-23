import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import TableLoader from '../../components/Loader/TableLoader';
import FilterLoader from '../../components/Loader/FilterLoader';
import { fetchFundingSequencings, deleteFundingSequencing, updateFundingSequencingStatus, getFundingGroups, getFundingTypes } from '../../modules/funding/services';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { usePermissions } from '../../lib/auth/usePermissions';
import { FUNDING_STATUS_OPTIONS, FUNDING_ICON_MAP, FUNDING_COLOR_MAP } from '../../config/funding';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';

export default function FundingList() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(true);
    const [fundings, setFundings] = useState<any[]>([]);

    // Options for filters
    const [groups, setGroups] = useState<any[]>([]);
    const [types, setTypes] = useState<any[]>([]);

    // Pagination state
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);
    const [totalRecords, setTotalRecords] = useState<number>(0);

    // Sorting state
    const [sortField, setSortField] = useState<string>('id');
    const [sortOrder, setSortOrder] = useState<string>('desc');

    // Filter states
    const [searchText, setSearchText] = useState<string>('');
    const [appliedSearchText, setAppliedSearchText] = useState<string>('');
    const [filters, setFilters] = useState<any>({});
    const [appliedFilters, setAppliedFilters] = useState<any>({});
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string | null>(null);

    // Checkbox selection state
    const [selectedFundings, setSelectedFundings] = useState<any[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [deleteRows, setDeleteRows] = useState<any[]>([]);

    // Initialize filters
    const initFilters = () => {
        const initial = {
            name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            'group.name': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            'type.name': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            amount_range: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            terms: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    useEffect(() => {
        initFilters();

        // Fetch groups and types for filters
        const fetchFilters = async () => {
            try {
                const [groupsRes, typesRes] = await Promise.all([
                    getFundingGroups(),
                    getFundingTypes()
                ]);
                setGroups(groupsRes.data || []);
                setTypes(typesRes.data || []);
            } catch (err) {
                console.error("Failed to fetch filter options", err);
            }
        };
        fetchFilters();
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
                funding_group_id: selectedGroup || undefined,
                funding_type_id: selectedType || undefined,
            };
            const response = await fetchFundingSequencings(payload);
            if (response.status !== false) {
                const listData = response.data?.data || response.data || [];
                const total = response.data?.meta?.total || response.meta?.total || response.total || 0;

                setFundings(Array.isArray(listData) ? listData : []);
                setTotalRecords(total);
            } else {
                toast.error(response.message || 'Failed to fetch funding data');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch funding data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, perPage, sortField, sortOrder, appliedSearchText, appliedFilters, selectedStatus, selectedGroup, selectedType]);

    const onPage = (event) => {
        const nextPerPage = event.rows;
        const nextPage = Math.floor(event.first / event.rows) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    const onSort = (event) => {
        console.log('Sort Event:', event);

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
        setSelectedGroup(null);
        setSelectedType(null);
        initFilters();
        setPage(1);
    };

    const iconBodyTemplate = (rowData) => {
        const iconClass = rowData.icon?.startsWith('ri-')
            ? rowData.icon
            : (FUNDING_ICON_MAP[rowData.icon] ? `ri-${FUNDING_ICON_MAP[rowData.icon]}-line` : (rowData.icon || 'ri-file-list-3-line'));
        const colorName = FUNDING_COLOR_MAP[rowData.icon_color] || rowData.icon_color || 'primary';

        return (
            <div className="d-flex justify-content-center align-items-center">
                <div className={`bg-soft-${colorName} text-${colorName} rounded d-flex align-items-center justify-content-center`} style={{ width: '40px', height: '40px' }}>
                    <i className={`${iconClass} fs-20`}></i>
                </div>
            </div>
        );
    };

    const nameBodyTemplate = (rowData) => {
        return (
            <div>
                <span className="fw-bold text-primary" style={{ cursor: 'pointer' }} onClick={() => navigate(`/funding/${rowData.id}`)}>
                    {rowData.name}
                </span>
                {rowData.subtitle && (
                    <div className="text-muted fs-12 mt-1">{rowData.subtitle}</div>
                )}
            </div>
        );
    };

    const groupBodyTemplate = (rowData) => {
        return <span>{rowData.group?.name || '-'}</span>;
    };

    const typeBodyTemplate = (rowData) => {
        return <span>{rowData.type?.name || '-'}</span>;
    };

    const statusBodyTemplate = (rowData) => {
        const status = rowData.status || FUNDING_STATUS_OPTIONS[0].value;
        const badgeClass = status === FUNDING_STATUS_OPTIONS[0].value ? 'bg-success' : 'bg-danger';
        const canUpdate = true;

        return (
            <span
                className={`badge ${badgeClass} fs-12 ${canUpdate ? 'cursor-pointer' : ''}`}
                onClick={(e) => { e.stopPropagation(); canUpdate && handleStatusChange(rowData.id, status); }}
                style={{ cursor: canUpdate ? 'pointer' : 'default' }}
                title={canUpdate ? 'Click to change status' : ''}
            >
                {status}
            </span>
        );
    };

    const handleStatusChange = async (id, currentStatus) => {
        const newStatus = currentStatus === FUNDING_STATUS_OPTIONS[0].value
            ? FUNDING_STATUS_OPTIONS[1].value
            : FUNDING_STATUS_OPTIONS[0].value;
        try {
            await updateFundingSequencingStatus(id, newStatus);
            toast.success(`Status updated to ${newStatus}`);
            loadData();
        } catch (err) {
            console.error(err);
            toast.error('Failed to update status');
        }
    };

    // Delete handlers
    const openDeleteModal = () => {
        if (!selectedFundings || selectedFundings.length === 0) {
            toast.warn('Please select at least one funding to delete.');
            return;
        }
        setDeleteRows(selectedFundings);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        const ids = deleteRows.map(f => f.id);
        try {
            setLoading(true);
            await Promise.all(ids.map(id => deleteFundingSequencing(id)));
            toast.success('Funding options deleted successfully');
            setShowDeleteModal(false);
            setSelectedFundings([]);
            loadData();
        } catch (err) {
            toast.error('Failed to delete funding options');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.body.classList.add('table-page-fit-active');
        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);

    const groupOptions = groups.map(g => ({ label: g.name, value: g.id }));
    const typeOptions = types.map(t => ({ label: t.name, value: t.id }));

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                <div className="row pb-1 mobile-sticky-header">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Funding</h4>
                                <nav aria-label="breadcrumb" className="d-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Funding</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <div className="btn-group">
                                    {Array.isArray(selectedFundings) && selectedFundings.length > 0 ? (
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
                                    ) : (
                                        <Link to="/funding/create" className="btn btn-primary fw-medium waves-effect waves-light">
                                            <i className="ri-add-fill me-1 align-bottom"></i> Add Funding
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row row-table-fit credit-account-section">
                    <div className="col-12">
                        <div className="card shadow-sm border-0">
                            <div className="card-body">
                                <form className="table-filter mb-1" onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}>
                                    {loading ? (
                                        <FilterLoader config={[
                                            { col: "col-xxl-3 col-sm-12" },
                                            { col: "col-xxl-2 col-sm-6" },
                                            { col: "col-xxl-2 col-sm-6" },
                                            { col: "col-xxl-2 col-sm-6" },
                                            { col: "col-xxl-3 col-sm-12", isButton: true }
                                        ]} />
                                    ) : (
                                        <div className="row g-3 mb-2">
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
                                            <div className="col-xxl-2 col-sm-6">
                                                <Dropdown
                                                    value={selectedStatus}
                                                    options={[{ label: 'All Status', value: null }, ...FUNDING_STATUS_OPTIONS]}
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
                                                    value={selectedGroup}
                                                    options={[{ label: 'All Groups', value: null }, ...groupOptions]}
                                                    onChange={(e) => setSelectedGroup(e.value)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="All Groups"
                                                    className="w-100 employee-filter-dropdown"
                                                    appendTo="self"
                                                />
                                            </div>
                                            <div className="col-xxl-2 col-sm-6">
                                                <Dropdown
                                                    value={selectedType}
                                                    options={[{ label: 'All Types', value: null }, ...typeOptions]}
                                                    onChange={(e) => setSelectedType(e.value)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="All Types"
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
                                    <TableLoader rows={12} columns={new Array(8).fill({ style: { minWidth: '120px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            value={fundings}
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
                                            sortMode="single"
                                            className="p-datatable-sm custom-datatable"
                                            tableStyle={{ minWidth: '100%' }}
                                            dataKey="id"
                                            scrollable
                                            scrollHeight="flex"
                                            selectionMode="multiple"
                                            selection={selectedFundings}
                                            onSelectionChange={(e) => setSelectedFundings(e.value)}
                                            onRowClick={(e) => {
                                                const isCheckbox = e.originalEvent.target.closest('.p-checkbox') ||
                                                    e.originalEvent.target.closest('.p-selection-column');
                                                if (!isCheckbox) navigate(`/funding/${e.data.id}`);
                                            }}
                                            responsiveLayout="scroll"
                                            emptyMessage="No funding found"
                                        >
                                            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                                            <Column header="Icon" body={iconBodyTemplate} style={{ minWidth: '80px' }} />
                                            <Column field="name" header="Name" body={nameBodyTemplate} sortable filter filterPlaceholder="Search" style={{ minWidth: '200px' }} />
                                            <Column field="group.name" header="Group" body={groupBodyTemplate} sortable filter filterPlaceholder="Search" style={{ minWidth: '150px' }} />
                                            <Column field="type.name" header="Type" body={typeBodyTemplate} sortable filter filterPlaceholder="Search" style={{ minWidth: '150px' }} />
                                            <Column field="amount_range" header="Amount" sortable filter filterPlaceholder="Search" style={{ minWidth: '120px' }} />
                                            <Column field="terms" header="Terms" sortable filter filterPlaceholder="Search" style={{ minWidth: '120px' }} />
                                            <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '100px' }} />
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
                loading={loading}
                text="The selected funding options and all associated data will be deleted."
            />
        </div>
    );
}
