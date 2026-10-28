import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import TableLoader from '../../components/Loader/TableLoader';
import { useCapitalAccounts, useDeleteCapitalAccount, useUpdateCapitalAccountStatus } from '../../modules/capital-access/queries';
import { CapitalAccount } from '../../modules/capital-access/services';
import { CreditAccount } from '../../modules/credit-accounts/services';
import { usePermissions } from '../../lib/auth/usePermissions';
import { STATUS_OPTIONS, STATUS_CLASS_MAP } from '../../config/creditBuilder';
import { buildStorageUrl } from '../../utils/imageHelpers';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';

export default function CapitalAccessList() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();


    // Checkbox selection state
    const [selectedPrograms, setSelectedPrograms] = useState<CapitalAccount[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // Pagination state
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);

    // Sorting state
    const [sortField, setSortField] = useState<string>('id');
    const [sortOrder, setSortOrder] = useState<string>('desc');

    // Filter states
    const [searchText, setSearchText] = useState<string>('');
    const [appliedSearchText, setAppliedSearchText] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [appliedStatus, setAppliedStatus] = useState<string | null>(null);

    const payload = {
        page: page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
        search: appliedSearchText,
        status: appliedStatus || undefined,
    };

    const { data: qData, isLoading } = useCapitalAccounts(payload);
    const updateStatusMutation = useUpdateCapitalAccountStatus();
    const deleteMutation = useDeleteCapitalAccount();

    const accounts = qData?.data || [];
    const totalRecords = qData?.meta?.total || 0;
    const loading = isLoading;

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
        setAppliedStatus(selectedStatus);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearchText('');
        setSelectedStatus(null);
        setAppliedStatus(null);
        setPage(1);
    };

    const nameBodyTemplate = (rowData: CapitalAccount) => {
        return (
            <div>
                <Link to={`/capital-access/${rowData.id}`} className="fw-medium link-primary d-block mb-1">
                    {rowData.name}
                </Link>
                {rowData.sub_title && <span className="text-muted fs-12">{rowData.sub_title}</span>}
            </div>
        );
    };



    const targetExposureBodyTemplate = (rowData: CapitalAccount) => {
        if (!rowData.target_exposure_min && !rowData.target_exposure_max) return <span className="text-muted">-</span>;
        return <span className="fw-medium">{rowData.target_exposure_min} - {rowData.target_exposure_max}</span>;
    };

    const estTimelineBodyTemplate = (rowData: CapitalAccount) => {
        if (rowData.est_timeline) {
            return <span>{rowData.est_timeline}</span>;
        }
        if (!rowData.est_timeline_min && !rowData.est_timeline_max) return <span className="text-muted">-</span>;
        return <span>{rowData.est_timeline_min} - {rowData.est_timeline_max} days</span>;
    };

    const cardsStackBodyTemplate = (rowData: CapitalAccount) => {
        const list = rowData.credit_accounts || rowData.accounts || [];
        if (list.length === 0) {
            return <span className="text-muted small italic">No cards added yet</span>;
        }
        return (
            <div className="d-flex align-items-center">
                <div className="d-flex align-items-center capital-card-stack-inner">
                    {list.slice(0, 4).map((acc: CreditAccount, index: number) => {
                        const img = acc.full_image_url || acc.image_url;
                        return (
                            <div
                                key={index}
                                className="avatar-group-item"
                            >
                                {img ? (
                                    <img
                                        src={buildStorageUrl(img)}
                                        alt={acc.card_name}
                                        className="rounded border shadow-sm bg-white capital-card-img"
                                        title={`${acc.issuer} - ${acc.card_name}`}
                                    />
                                ) : (
                                    <div
                                        className="rounded border bg-light text-muted d-flex align-items-center justify-content-center capital-card-fallback"
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
                title={canUpdate ? 'Click to change status' : ''}
            >
                {status}
            </span>
        );
    };



    const handleStatusChange = async (id: number | string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        updateStatusMutation.mutate(
            { id, status: newStatus },
            {
                onSuccess: () => {
                    toast.success(`Status updated to ${newStatus}`);
                },
                onError: (err) => {
                    console.error(err);
                    toast.error('Failed to update status');
                }
            }
        );
    };

    const handleDeleteConfirm = async () => {
        const ids = selectedPrograms.map(p => p.id);
        try {
            setIsDeleting(true);
            for (const id of ids) {
                if (id !== undefined) {
                    await deleteMutation.mutateAsync(id);
                }
            }
            toast.success("Capital programs deleted successfully");
            setShowDeleteModal(false);
            setSelectedPrograms([]);
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete capital programs');
        } finally {
            setIsDeleting(false);
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
                    title="Capital Access" 
                    breadcrumbs={[
                        { label: 'Credit Builder' },
                        { label: 'Capital Access' }
                    ]} 
                >
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
                </PageHeader>

                <div className="row row-table-fit credit-account-section">
                    <div className="col-12">
                        <div className="card shadow-sm">
                            <div className="card-body list-fluid-card">
                                <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}>
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
                                                <button
                                                    type="button"
                                                    className="btn btn-warning flex-grow-1"
                                                    onClick={handleApplyFilters}
                                                    disabled={loading}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                            Loading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                                        </>
                                                    )}
                                                </button>
                                                <button type="button" className="btn btn-default flex-grow-1" onClick={handleClearFilters}>
                                                    <i className="ri-close-line me-1 align-bottom"></i> Clear
                                                </button>
                                            </div>
                                        </div>
                                    </div>
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
                                            <Column field="target_exposure_min" header="Target Exposure" body={targetExposureBodyTemplate} sortable style={{ minWidth: '160px' }} />
                                            <Column field="est_timeline_min" header="Est. Time" body={estTimelineBodyTemplate} sortable style={{ minWidth: '130px' }} />
                                            <Column header="Included Cards" body={cardsStackBodyTemplate} style={{ minWidth: '220px' }} />
                                            <Column header="Total" body={(rowData: CapitalAccount) => (rowData.credit_accounts || rowData.accounts)?.length || 0} style={{ minWidth: '80px' }} />
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
                    loading={isDeleting}
                    text="The selected capital programs and all associated data will be deleted."
                />
            </div>
        </div>
    );
}
