import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { getLenders, deleteLender, getLenderProductCategories } from '../../modules/lender/services';
import { Lender } from '../../modules/lender/types';
import { DataTable, DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import TableLoader from '../../components/Loader/TableLoader';
import { usePermissions } from '../../lib/auth/usePermissions';

export default function LendersList() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const [lenders, setLenders] = useState<Lender[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');

    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [sortField, setSortField] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<string>('');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [lenderToDelete, setLenderToDelete] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [selectedLenders, setSelectedLenders] = useState<Lender[]>([]);

    const fetchLenders = async () => {
        setLoading(true);
        try {
            const res = await getLenders({
                search: appliedSearch,
                page,
                per_page: perPage,
                ...(sortField ? { sort_field: sortField } : {}),
                ...(sortOrder ? { sort_order: sortOrder } : {})
            });
            setLenders(res.data || []);
            if (res.meta) {
                setTotalRecords(res.meta.total);
            } else {
                setTotalRecords((res.data || []).length);
            }
        } catch (error: any) {
            toast.error('Failed to load lenders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await getLenderProductCategories();
                setCategoriesList(res.data || []);
            } catch (error) {
                console.error('Failed to fetch categories', error);
            } finally {
                setCategoriesLoading(false);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchLenders();

        // Add class to body to prevent global scroll and setup layout
        document.body.classList.add('table-page-fit-active');

        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, [appliedSearch, page, perPage, sortField, sortOrder]);

    const confirmDelete = async () => {
        if (selectedLenders.length === 0 && !lenderToDelete) return;
        setDeleting(true);
        try {
            if (selectedLenders.length > 0) {
                await Promise.all(selectedLenders.map(lender => deleteLender(lender.id!)));
                toast.success('Selected lenders deleted successfully');
                setSelectedLenders([]);
            } else if (lenderToDelete) {
                await deleteLender(lenderToDelete);
                toast.success('Lender deleted successfully');
            }
            setShowDeleteModal(false);
            fetchLenders();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete lender(s)');
        } finally {
            setDeleting(false);
            setLenderToDelete(null);
        }
    };



    const onPage = (event: DataTablePageEvent) => {
        setPerPage(event.rows);
        setPage((event.page || 0) + 1);
    };

    const onSort = (event: DataTableSortEvent) => {
        setSortField(event.sortField || 'id');
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    const handleApplyFilters = () => {
        setAppliedSearch(search);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearch('');
        setAppliedSearch('');
        setPage(1);
        setSortField('');
        setSortOrder('');
        // Needs to call fetchLenders implicitly by effect, or we can just let effect handle it
    };

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Page Header */}
                <PageHeader 
                    title="Lenders" 
                    breadcrumbs={[{ label: 'Lenders' }]} 
                >
                    <div className="btn-group">
                        {hasPermission('delete lenders') && Array.isArray(selectedLenders) && selectedLenders.length > 0 ? (
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
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary fw-medium waves-effect waves-light"
                                onClick={() => navigate('/lenders/create')}
                            >
                                <i className="ri-add-fill me-1 align-bottom"></i> Add Lender
                            </button>
                        )}
                    </div>
                </PageHeader>

                {/* Filters and Table */}
                <div className="row row-table-fit lenders-account-section">
                    <div className="col-lg-12">
                        <div className="card shadow-sm border-0">
                            <div className="card-body">
                                <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-xxl-8 col-sm-12">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    placeholder="Search lenders..."
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                                />
                                                <i className="ri-search-line search-icon"></i>
                                            </div>
                                        </div>
                                        <div className="col-xxl-4 col-sm-12">
                                            <div className="d-flex gap-2 h-100">
                                                <button type="submit" className="btn btn-warning flex-grow-1" onClick={handleApplyFilters}>
                                                    <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                                </button>
                                                <button type="button" className="btn btn-default flex-grow-1" onClick={handleClearFilters}>
                                                    <i className="ri-close-line me-1 align-bottom"></i> Clear
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>

                                {loading || categoriesLoading ? (
                                    <TableLoader rows={10} columns={new Array(5).fill({ style: { minWidth: '100px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable<Lender[]>
                                            scrollable scrollHeight="flex" value={lenders as Lender[]} paginator lazy totalRecords={totalRecords}
                                            first={(page - 1) * perPage} rows={perPage} rowsPerPageOptions={[10, 25, 50, 100]}
                                            sortMode="single" sortField={sortField} sortOrder={sortOrder === 'asc' ? 1 : -1}
                                            onPage={onPage} onSort={onSort}
                                            selectionMode="multiple" selection={selectedLenders} onSelectionChange={(e: any) => setSelectedLenders(e.value)}
                                            dataKey="id" onRowClick={(e) => {
                                                const target = e.originalEvent.target as HTMLElement;
                                                if (!target.closest('.p-checkbox') && !target.closest('.p-selection-column') && target.tagName !== 'INPUT') {
                                                    navigate(`/lenders/${(e.data as Lender).id}`);
                                                }
                                            }}
                                            className="p-datatable-sm" emptyMessage="No lenders found"
                                            rowClassName={() => 'cursor-pointer'}
                                            responsiveLayout="scroll"
                                        >
                                            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                                            <Column field="name" header="Lender Name" sortable style={{ minWidth: '180px' }} className="fw-medium text-dark" />
                                            <Column field="legal_name" header="Legal Name" sortable style={{ minWidth: '150px' }} />
                                            <Column field="product_categories" header="Product Categories" style={{ minWidth: '150px' }} body={(rowData) => {
                                                let catIds = rowData.product_categories || [];
                                                if (typeof catIds === 'string') {
                                                    try { catIds = JSON.parse(catIds); } catch (e) { catIds = []; }
                                                }
                                                if (!Array.isArray(catIds)) catIds = [];

                                                const displayCats = catIds.map((idOrName: any) => {
                                                    if (typeof idOrName === 'number' || !isNaN(Number(idOrName))) {
                                                        const cat = categoriesList.find(c => c.id == idOrName);
                                                        return cat ? cat.name : idOrName;
                                                    }
                                                    return idOrName;
                                                });
                                                return (
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {displayCats.map((cat: string, i: number) => (
                                                            <span key={i} className="badge bg-light text-dark border">{cat}</span>
                                                        ))}
                                                    </div>
                                                );
                                            }} />
                                            <Column field="contact_name" header="Contact Name" sortable style={{ minWidth: '150px' }} />
                                            <Column field="contact_phone" header="Contact Phone" sortable style={{ minWidth: '150px' }} />
                                            <Column field="iso_status" header="ISO Status" sortable style={{ minWidth: '120px' }} />
                                            <Column field="status" header="Status" sortable style={{ minWidth: '120px' }} body={(rowData) => (
                                                <span className={`badge ${rowData.status === 'Active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                                    {rowData.status}
                                                </span>
                                            )} />
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
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                loading={deleting}
                text="Are you sure you want to delete this lender?"
            />
        </div>
    );
}
