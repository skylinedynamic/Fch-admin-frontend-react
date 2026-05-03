import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeoSettings, useDeleteSeoSettings } from '../../modules/cms/queries';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { toast } from 'react-toastify';
import TableLoader from '../../components/Loader/TableLoader';
import FilterLoader from '../../components/Loader/FilterLoader';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import { usePermissions } from '../../lib/auth/usePermissions';

interface SeoSetting {
    id?: number;
    page_name: string;
    path: string;
    meta_title?: string;
    meta_description?: string;
    keywords?: string;
    og_image?: string;
}

export default function SeoSettings() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);
    const [searchText, setSearchText] = useState<string>('');
    const [appliedSearch, setAppliedSearch] = useState<string>('');
    const [sortField, setSortField] = useState<string>('id');
    const [sortOrder, setSortOrder] = useState<number>(-1);

    const { data: seoData, isLoading, isFetching } = useSeoSettings({
        page,
        per_page: perPage,
        search: appliedSearch,
        sort_field: sortField,
        sort_order: sortOrder === 1 ? 'asc' : 'desc'
    });
    const deleteMutation = useDeleteSeoSettings();

    // Add class to body to prevent global scroll
    React.useEffect(() => {
        document.body.classList.add('table-page-fit-active');
        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);

    const handleApplyFilters = () => {
        setAppliedSearch(searchText);
        setPage(1);
    };
    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearch('');
        setPage(1);
    };

    const handleDelete = async () => {
        if (!selectedRows.length) return;
        try {
            await deleteMutation.mutateAsync(selectedRows.map(r => r.id as number));
            toast.success('SEO settings deleted successfully');
            setSelectedRows([]);
            setShowDeleteModal(false);
        } catch {
            toast.error('Failed to delete SEO settings');
        }
    };

    const [selectedRows, setSelectedRows] = useState<SeoSetting[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

    const pageNameBody = (rowData: SeoSetting) => (
        <div className="overflow-hidden flex-grow-1 position-relative blog-row-info">
            <h6 className="fs-14 mb-1 text-dark fw-semibold text-truncate" title={rowData.page_name}>
                {rowData.page_name}
            </h6>
            <div className="d-flex align-items-center gap-2">
                <p className="text-muted mb-0 fs-12 text-truncate" style={{ maxWidth: '200px' }}>{rowData.path}</p>
                <div className="blog-row-actions ms-2 opacity-0">
                    {hasPermission('update seo settings') && (
                        <>
                            <Link to={`/cms/seo-settings/edit/${rowData.id}`} className="text-primary fs-12 fw-medium me-2">Edit</Link>
                            <span className="text-muted fs-11 me-2">|</span>
                        </>
                    )}
                    <a href={rowData.path} target="_blank" rel="noreferrer" className="text-success fs-12 fw-medium">View</a>
                </div>
            </div>
        </div>
    );

    const ogImageBody = (rowData: SeoSetting) => (
        <div className="avatar-xs bg-light rounded p-1 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
            {rowData.og_image ? (
                <img src={rowData.og_image} className="img-fluid rounded" alt="" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            ) : (
                <i className="ri-image-line text-muted fs-16"></i>
            )}
        </div>
    );

    const pathBody = (rowData: SeoSetting) => (
        <span className="badge bg-light text-dark border fs-12">
            <i className="ri-link me-1"></i>{rowData.path}
        </span>
    );

    const metaTitleBody = (rowData: SeoSetting) => (
        <span className="text-truncate d-block" style={{ maxWidth: '250px' }} title={rowData.meta_title}>
            {rowData.meta_title || <span className="text-muted">—</span>}
        </span>
    );

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Header with Breadcrumbs */}
                <div className="row pb-1">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">SEO Settings</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active">CMS</li>
                                        <li className="breadcrumb-item active" aria-current="page">SEO Settings</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <div className="btn-group">
                                    {selectedRows.length > 0 && hasPermission('delete seo settings') ? (
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
                                    ) : hasPermission('update seo settings') ? (
                                        <button
                                            className="btn btn-primary fw-medium waves-effect waves-light"
                                            onClick={() => navigate('/cms/seo-settings/create')}
                                        >
                                            <i className="ri-add-fill me-1 align-bottom"></i> Add Page SEO
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Table Section */}
                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                {/* Filters */}
                                <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}>
                                    {isLoading ? (
                                        <FilterLoader config={[
                                            { col: 'col-xxl-9 col-sm-12' },
                                            { col: 'col-xxl-3 col-sm-4', isButton: true }
                                        ]} />
                                    ) : (
                                        <div className="row g-3 mb-3">
                                            <div className="col-xxl-9 col-sm-12">
                                                <div className="search-box">
                                                    <input
                                                        type="text"
                                                        className="form-control search bg-light border-light"
                                                        placeholder="Search by page name, path, or meta title..."
                                                        value={searchText}
                                                        onChange={(e) => setSearchText(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                                    />
                                                    <i className="ri-search-line search-icon"></i>
                                                </div>
                                            </div>
                                            <div className="col-xxl-3 col-sm-4">
                                                <div className="d-flex gap-2">
                                                    <button type="button" className="btn btn-warning flex-grow-1 fw-medium" onClick={handleApplyFilters}>
                                                        <i className="ri-equalizer-fill me-1 align-bottom"></i> Filter
                                                    </button>
                                                    <button type="button" className="btn btn-soft-secondary flex-grow-1 fw-medium" onClick={handleClearFilters}>
                                                        <i className="ri-refresh-line me-1 align-bottom"></i> Clear
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </form>

                                {/* Table Section */}
                                {isLoading ? (
                                    <TableLoader rows={8} columns={new Array(5).fill({ style: { minWidth: '150px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1 seo-settings-table">
                                        <DataTable
                                            value={seoData?.data || []}
                                            paginator
                                            lazy
                                            totalRecords={seoData?.meta?.total || 0}
                                            rows={perPage}
                                            first={(page - 1) * perPage}
                                            onPage={(e: any) => {
                                                setPage((e.page ?? 0) + 1);
                                                setPerPage(e.rows);
                                            }}
                                            sortField={sortField}
                                            sortOrder={sortOrder}
                                            onSort={(e: any) => {
                                                setSortField(e.sortField);
                                                setSortOrder(e.sortOrder);
                                                setPage(1);
                                            }}
                                            selection={selectedRows}
                                            onSelectionChange={(e: any) => setSelectedRows(e.value)}
                                            dataKey="id"
                                            onRowClick={(e: any) => {
                                                const target = e.originalEvent.target as HTMLElement;
                                                const isAction = target.closest('.btn') || target.closest('a') || target.closest('.p-checkbox') || target.closest('.p-selection-column');
                                                if (!isAction && hasPermission('update seo settings')) {
                                                    navigate(`/cms/seo-settings/edit/${e.data.id}`);
                                                }
                                            }}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No SEO settings found."
                                            loading={isFetching && !isLoading}
                                        >
                                            {hasPermission('delete seo settings') && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}
                                            <Column field="page_name" header="PAGE NAME" body={pageNameBody} sortable style={{ minWidth: '250px' }} />
                                            <Column field="path" header="PATH" body={pathBody} sortable style={{ minWidth: '180px' }} />
                                            <Column field="meta_title" header="META TITLE" body={metaTitleBody} sortable style={{ minWidth: '280px' }} />
                                            <Column field="og_image" header="SOCIAL IMAGE" body={ogImageBody} style={{ minWidth: '120px' }} />
                                        </DataTable>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DeleteConfirmationModal
                    show={showDeleteModal}
                    onConfirm={handleDelete}
                    onClose={() => setShowDeleteModal(false)}
                    loading={deleteMutation.isPending}
                    text="The selected SEO settings will be permanently removed."
                />
            </div>
            <style>{`
                .seo-settings-table .p-datatable-tbody > tr {
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .seo-settings-table .p-datatable-tbody > tr:hover {
                    background-color: rgba(64, 81, 137, 0.02);
                }
                .blog-row-info .blog-row-actions {
                    transition: all 0.2s;
                    visibility: hidden;
                    opacity: 0;
                }
                .seo-settings-table .p-datatable-tbody > tr:hover .blog-row-actions {
                    visibility: visible;
                    opacity: 1;
                }
            `}</style>
        </div>
    );
}
