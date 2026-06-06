import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import TableLoader from '../../components/Loader/TableLoader';
import FilterLoader from '../../components/Loader/FilterLoader';
import { fetchCapitalAccounts, deleteCapitalAccount, updateCapitalAccountStatus, CapitalAccount } from '../../modules/capital-access/services';
import { CreditAccount } from '../../modules/credit-accounts/services';
import { usePermissions } from '../../lib/auth/usePermissions';
import { STATUS_OPTIONS, STATUS_CLASS_MAP } from '../../config/creditBuilder';
import { buildStorageUrl } from '../../utils/imageHelpers';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';

export default function CapitalAccessList() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(true);
    const [accounts, setAccounts] = useState<CapitalAccount[]>([]);

    // Checkbox selection state
    const [selectedPrograms, setSelectedPrograms] = useState<CapitalAccount[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

    // Pagination state
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);
    const [totalRecords, setTotalRecords] = useState<number>(0);

    // Sorting state
    const [sortField, setSortField] = useState<string>('id');
    const [sortOrder, setSortOrder] = useState<string>('asc');

    // Filter states
    const [searchText, setSearchText] = useState<string>('');
    const [appliedSearchText, setAppliedSearchText] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const payload = {
                page: page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder,
                search: appliedSearchText,
                status: selectedStatus || undefined,
            };
            const response = await fetchCapitalAccounts(payload);
            if (response.status !== false) {
                setAccounts(response.data || []);
                setTotalRecords(response.meta?.total || (response as any).total || 0);
            } else {
                toast.error((response as any).message || 'Failed to fetch capital programs');
            }
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to fetch capital programs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, perPage, sortField, sortOrder, appliedSearchText, selectedStatus]);

    const onPage = (event: any) => {
        const nextPerPage = event.rows;
        const nextPage = Math.floor(event.first / event.rows) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    const onSort = (event: any) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
        setPage(1);
    };

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearchText('');
        setSelectedStatus(null);
        setPage(1);
    };

    const nameBodyTemplate = (rowData: CapitalAccount) => {
        return (
            <Link to={`/capital-access/${rowData.id}`} className="fw-medium link-primary">
                {rowData.name}
            </Link>
        );
    };

    const cardsStackBodyTemplate = (rowData: CapitalAccount) => {
        const list = rowData.accounts || [];
        if (list.length === 0) {
            return <span className="text-muted small italic">No cards added yet</span>;
        }
        return (
            <div className="d-flex align-items-center">
                <div className="d-flex align-items-center" style={{ paddingLeft: '8px' }}>
                    {list.slice(0, 4).map((acc: CreditAccount, index: number) => {
                        const img = acc.full_image_url || acc.image_url;
                        return (
                            <div 
                                key={index} 
                                className="avatar-group-item" 
                                style={{ 
                                    marginLeft: index > 0 ? '-14px' : '0', 
                                    zIndex: 10 - index,
                                    position: 'relative'
                                }}
                            >
                                {img ? (
                                    <img 
                                        src={buildStorageUrl(img)} 
                                        alt={acc.card_name} 
                                        className="rounded border shadow-sm bg-white" 
                                        style={{ 
                                            width: '45px', 
                                            height: '28px', 
                                            objectFit: 'contain', 
                                            padding: '1px',
                                            display: 'block' 
                                        }} 
                                        title={`${acc.issuer} - ${acc.card_name}`}
                                    />
                                ) : (
                                    <div 
                                        className="rounded border bg-light text-muted d-flex align-items-center justify-content-center" 
                                        style={{ width: '45px', height: '28px', fontSize: '9px', fontWeight: 'bold' }}
                                        title={`${acc.issuer} - ${acc.card_name}`}
                                    >
                                        Card
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {list.length > 4 && (
                    <span className="badge bg-light text-muted border border-light-subtle ms-2 font-size-11">+{list.length - 4} more</span>
                )}
            </div>
        );
    };

    const statusBodyTemplate = (rowData: CapitalAccount) => {
        const status = rowData.status || 'Active';
        const badgeClass = STATUS_CLASS_MAP[status] || 'bg-light text-muted';
        const canUpdate = hasPermission('update credit accounts');
        return (
            <span
                className={`badge ${badgeClass} fs-12 ${canUpdate ? 'cursor-pointer' : ''}`}
                onClick={(e) => {
                    e.stopPropagation(); // Avoid triggering row selection/navigation
                    if (canUpdate && rowData.id !== undefined) handleStatusChange(rowData.id, status);
                }}
                style={{ cursor: canUpdate ? 'pointer' : 'default' }}
                title={canUpdate ? 'Click to change status' : ''}
            >
                {status}
            </span>
        );
    };



    const handleStatusChange = async (id: number | string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        try {
            await updateCapitalAccountStatus(id, newStatus);
            toast.success(`Status updated to ${newStatus}`);
            loadData();
        } catch (err) {
            console.error(err);
            toast.error('Failed to update status');
        }
    };

    const handleDeleteConfirm = async () => {
        const ids = selectedPrograms.map(p => p.id);
        try {
            setLoading(true);
            for (const id of ids) {
                if (id !== undefined) {
                    await deleteCapitalAccount(id);
                }
            }
            toast.success("Capital programs deleted successfully");
            setShowDeleteModal(false);
            setSelectedPrograms([]);
            loadData();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete capital programs');
        } finally {
            setLoading(false);
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
                <div className="row pb-1 mobile-sticky-header">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Capital Access</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item">Credit Builder</li>
                                        <li className="breadcrumb-item active">Capital Access</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <div className="btn-group">
                                    {hasPermission('delete credit accounts') && Array.isArray(selectedPrograms) && selectedPrograms.length > 0 ? (
                                        <>
                                            <button type="button" className="btn bg-success text-white fw-medium">Actions</button>
                                            <button type="button" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                                <span className="visually-hidden">Toggle Dropdown</span>
                                            </button>
                                            <ul className="dropdown-menu dropdown-menu-end">
                                                <li>
                                                    <button type="button" className="dropdown-item text-danger" onClick={() => setShowDeleteModal(true)}>
                                                        <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                                    </button>
                                                </li>
                                            </ul>
                                        </>
                                    ) : hasPermission('create credit accounts') ? (
                                        <Link to="/capital-access/create" className="btn btn-primary fw-medium waves-effect waves-light">
                                            <i className="ri-add-fill me-1 align-bottom"></i> Add Capital Program
                                        </Link>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row row-table-fit credit-account-section">
                    <div className="col-12">
                        <div className="card shadow-sm">
                            <div className="card-body list-fluid-card">
                                <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}>
                                    {loading ? (
                                        <FilterLoader config={[
                                            { col: "col-xxl-6 col-sm-12" }, // Search
                                            { col: "col-xxl-3 col-sm-6" },  // Status
                                            { col: "col-xxl-3 col-sm-12", isButton: true } // Buttons
                                        ]} />
                                    ) : (
                                        <div className="row g-3 mb-3">
                                            <div className="col-xxl-6 col-sm-12">
                                                <div className="search-box">
                                                    <input
                                                        type="text"
                                                        className="form-control search bg-light border-light"
                                                        placeholder="Search capital programs..."
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
                                                    onChange={(e: any) => setSelectedStatus(e.value)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="All Status"
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
                                    <TableLoader rows={12} columns={new Array(5).fill({ style: { minWidth: '120px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="flex"
                                            value={accounts}
                                            paginator
                                            lazy
                                            totalRecords={totalRecords}
                                            first={(page - 1) * perPage}
                                            rows={perPage}
                                            rowsPerPageOptions={[10, 25, 50, 100]}
                                            sortMode="single"
                                            sortField={sortField}
                                            sortOrder={sortOrder === 'asc' ? 1 : -1}
                                            onPage={onPage}
                                            onSort={onSort}
                                            selection={selectedPrograms}
                                            onSelectionChange={(e: any) => setSelectedPrograms(e.value)}
                                            dataKey="id"
                                            onRowClick={(e: any) => {
                                                const isCheckbox = e.originalEvent.target.closest('.p-checkbox') ||
                                                    e.originalEvent.target.closest('.p-selection-column');
                                                if (!isCheckbox) navigate(`/capital-access/${e.data.id}`);
                                            }}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No capital programs found"
                                        >
                                            {hasPermission('delete credit accounts') && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false} />}
                                            <Column field="name" header="Program Name" body={nameBodyTemplate} sortable style={{ minWidth: '240px' }} />
                                            <Column header="Included Credit Accounts" body={cardsStackBodyTemplate} style={{ minWidth: '260px' }} />
                                            <Column header="Total Cards" body={(rowData: CapitalAccount) => rowData.accounts?.length || 0} style={{ minWidth: '120px' }} />
                                            <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '120px' }} />
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
                    text="The selected capital programs and all associated data will be deleted."
                />
            </div>
        </div>
    );
}
