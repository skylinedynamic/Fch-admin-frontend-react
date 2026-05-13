import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { useBlogs, useDeleteBlogs, useCategories, useTags } from '../../modules/cms/queries';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import StatisticsCard from '../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../components/Common/StatisticsCardSkeleton';
import TableLoader from '../../components/Loader/TableLoader';
import FilterLoader from '../../components/Loader/FilterLoader';
import { toast } from 'react-toastify';
import { Blog, Category } from '../../modules/cms/types';
import { usePermissions } from '../../lib/auth/usePermissions';
const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL?.replace(/\/$/, '') || '';

export default function BlogList() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    
    // Add class to body to prevent global scroll
    React.useEffect(() => {
        document.body.classList.add('table-page-fit-active');
        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);
    
    // Pagination state
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);
    
    // Filter states
    const [searchText, setSearchText] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string | number>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    
    const [appliedSearch, setAppliedSearch] = useState<string>('');
    const [appliedCategory, setAppliedCategory] = useState<string | number>('');
    const [appliedStatus, setAppliedStatus] = useState<string>('');
    
    // Sorting state
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortOrder, setSortOrder] = useState<number>(-1);

    // Selection state
    const [selectedBlogs, setSelectedBlogs] = useState<Blog[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

    // Fetch data
    const { data: blogsData, isLoading, isFetching } = useBlogs({
        page,
        per_page: perPage,
        search: appliedSearch,
        category_id: appliedCategory,
        status: appliedStatus,
        sort_field: sortField,
        sort_order: sortOrder === 1 ? 'asc' : 'desc'
    });

    const { data: categoriesData, isLoading: isLoadingCategories } = useCategories();
    const { data: tagsData, isLoading: isLoadingTags } = useTags();
    const deleteBlogsMutation = useDeleteBlogs();

    // Stats calculation
    const stats = {
        total: blogsData?.statistics?.total || 0,
        published: blogsData?.statistics?.published || 0,
        featured: blogsData?.statistics?.featured || 0,
        categories: blogsData?.statistics?.categories || categoriesData?.data?.length || 0
    };

    const handleApplyFilters = () => {
        setAppliedSearch(searchText);
        setAppliedCategory(selectedCategory);
        setAppliedStatus(selectedStatus);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedCategory('');
        setSelectedStatus('');
        setAppliedSearch('');
        setAppliedCategory('');
        setAppliedStatus('');
        setPage(1);
    };

    const handleDelete = async () => {
        if (!selectedBlogs.length) return;
        try {
            await deleteBlogsMutation.mutateAsync(selectedBlogs.map(b => b.id as number));
            toast.success("Blogs deleted successfully");
            setSelectedBlogs([]);
            setShowDeleteModal(false);
        } catch (error) {
            toast.error("Failed to delete blogs");
        }
    };

    // Body templates
    const titleBody = (rowData: Blog) => (
        <div className="d-flex align-items-center py-1">
            <div className="avatar-lg bg-light rounded p-1 me-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '75px', height: '75px', minWidth: '75px', overflow: 'hidden' }}>
                {rowData.featured_image ? (
                    <img 
                        src={rowData.featured_image} 
                        alt="" 
                        className="img-fluid rounded" 
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }} 
                        onError={(e: any) => { 
                            e.target.onerror = null;
                            e.target.src = '/images/blog/placeholder.png';
                        }}
                    />
                ) : (
                    <div className="text-center text-muted">
                        <i className="ri-image-2-line fs-24"></i>
                    </div>
                )}
            </div>
            <div className="overflow-hidden flex-grow-1" style={{ maxWidth: '100%', minWidth: 0 }}>
                <h6 className="fs-15 mb-1 text-dark fw-bold text-wrap" style={{ wordBreak: 'break-word' }} title={rowData.title}>
                    {rowData.title}
                </h6>
                <p className="text-muted mb-0 fs-12 text-truncate" style={{ maxWidth: '200px' }}>{rowData.slug}</p>
            </div>
        </div>
    );

    const actionBody = (rowData: Blog) => (
        <div className="d-flex align-items-center gap-1 justify-content-center">
            <a href={`${WEBSITE_URL}/blog/${rowData.slug}`} target="_blank" rel="noreferrer" className="btn btn-soft-success btn-sm btn-icon waves-effect waves-light" title="View">
                <i className="ri-eye-line"></i>
            </a>
        </div>
    );

    const statusBody = (rowData: Blog) => (
        <span className={`badge ${rowData.is_published ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} text-uppercase`}>
            {rowData.is_published ? 'Published' : 'Draft'}
        </span>
    );

    const categoryBody = (rowData: Blog) => (
        <span className="badge bg-info-subtle text-info">{rowData.category?.name || 'Uncategorized'}</span>
    );

    const dateBody = (rowData: Blog) => (
        <div className="text-muted fs-13">
            <i className="ri-calendar-line align-bottom me-1"></i>
            {rowData.created_at ? new Date(rowData.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'}
        </div>
    );

    const statisticsConfig = [
        { title: "Total Posts", value: stats.total, icon: "ri-article-line", color: "primary" },
        { title: "Published", value: stats.published, icon: "ri-checkbox-circle-line", color: "success" },
        { title: "Featured", value: stats.featured, icon: "ri-star-line", color: "warning" },
        { title: "Categories", value: stats.categories, icon: "ri-folders-line", color: "info" }
    ];

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Header with Breadcrumbs */}
                <div className="row pb-1 mobile-sticky-header">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Blogs</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Blogs</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <div className="btn-group">
                                    {selectedBlogs.length > 0 ? (
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
                                        hasPermission('create blogs') && (
                                            <button className="btn btn-primary fw-medium waves-effect waves-light" onClick={() => navigate('/cms/blogs/create')}>
                                                <i className="ri-add-fill me-1 align-bottom"></i> Add Post
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards with Skeleton */}
                <div className="row">
                    {isLoading ? (
                        [1, 2, 3, 4].map(i => <StatisticsCardSkeleton key={i} />)
                    ) : (
                        statisticsConfig.map((s, idx) => (
                            <StatisticsCard key={idx} title={s.title} count={s.value} icon={s.icon} colorVariant={s.color} />
                        ))
                    )}
                </div>

                {/* Filters and Table Section */}
                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                {/* Filters with Skeleton */}
                                <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}>
                                    {isLoading || isLoadingCategories || isLoadingTags ? (
                                        <FilterLoader config={[
                                            { col: "col-xxl-4 col-sm-12" }, // Search
                                            { col: "col-xxl-2 col-sm-4" },  // Category
                                            { col: "col-xxl-2 col-sm-4" },  // Status
                                            { col: "col-xxl-4 col-sm-4", isButton: true } // Buttons
                                        ]} />
                                    ) : (
                                        <div className="row g-3 mb-3">
                                            <div className="col-xxl-4 col-sm-12">
                                                <div className="search-box">
                                                    <input
                                                        type="text"
                                                        className="form-control search bg-light border-light"
                                                        placeholder="Search blogs, tags, categories, or dates..."
                                                        value={searchText}
                                                        onChange={(e) => setSearchText(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                                    />
                                                    <i className="ri-search-line search-icon"></i>
                                                </div>
                                            </div>
                                            <div className="col-xxl-2 col-sm-4">
                                                <Dropdown
                                                    value={selectedCategory}
                                                    options={[{ label: 'All Categories', value: '' }, ...(categoriesData?.data?.map((c: Category) => ({ label: c.name, value: c.id })) || [])]}
                                                    onChange={(e: DropdownChangeEvent) => setSelectedCategory(e.value)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="All Categories"
                                                    className="w-100 employee-filter-dropdown"
                                                />
                                            </div>
                                            <div className="col-xxl-2 col-sm-4">
                                                <Dropdown
                                                    value={selectedStatus}
                                                    options={[
                                                        { label: 'All Status', value: '' },
                                                        { label: 'Published', value: '1' },
                                                        { label: 'Draft', value: '0' }
                                                    ]}
                                                    onChange={(e: DropdownChangeEvent) => setSelectedStatus(e.value)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="All Status"
                                                    className="w-100 employee-filter-dropdown"
                                                />
                                            </div>
                                            <div className="col-xxl-4 col-sm-4">
                                                <div className="d-flex gap-2">
                                                    <button type="button" className="btn btn-warning flex-grow-1 fw-medium" onClick={handleApplyFilters}>
                                                        <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                                    </button>
                                                    <button type="button" className="btn btn-soft-secondary flex-grow-1 fw-medium" onClick={handleClearFilters}>
                                                        <i className="ri-refresh-line me-1 align-bottom"></i> Clear
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </form>

                                {/* DataTable with Loader */}
                                {isLoading || isFetching ? (
                                    <TableLoader rows={perPage} columns={new Array(5).fill({ style: { minWidth: '150px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1 blog-list-table">
                                        <DataTable
                                            value={blogsData?.data || []}
                                            paginator
                                            lazy
                                            totalRecords={blogsData?.meta?.total || 0}
                                            rows={perPage}
                                            first={(page - 1) * perPage}
                                            onPage={(e: any) => {
                                                setPage((e.page ?? 0) + 1);
                                                setPerPage(e.rows);
                                            }}
                                            selection={selectedBlogs}
                                            onSelectionChange={(e: any) => setSelectedBlogs(e.value)}
                                            sortField={sortField}
                                            sortOrder={sortOrder}
                                            onSort={(e: any) => {
                                                setSortField(e.sortField);
                                                setSortOrder(e.sortOrder);
                                            }}
                                            dataKey="id"
                                            onRowClick={(e: any) => {
                                                const target = e.originalEvent.target as HTMLElement;
                                                const isAction = target.closest('.btn') || target.closest('a') || target.closest('.p-checkbox') || target.closest('.p-selection-column');
                                                if (!isAction && hasPermission('update blogs')) navigate(`/cms/blogs/edit/${e.data.id}`);
                                            }}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm table-wrap-content"
                                            filterDisplay="menu"
                                            emptyMessage="No blog posts found matching your criteria."
                                            loading={isFetching && !isLoading}
                                        >
                                            <Column selectionMode="multiple" headerStyle={{ width: '3rem', textAlign: 'center' }} bodyStyle={{ textAlign: 'center' }} exportable={false} />
                                            <Column field="title" header="TITLE & SLUG" body={titleBody} sortable filter showFilterMatchModes filterPlaceholder="Search title" style={{ minWidth: '250px' }} />
                                            <Column field="category.name" header="CATEGORY" body={categoryBody} sortable filter showFilterMatchModes filterPlaceholder="Search category" style={{ minWidth: '150px' }} />
                                            <Column field="created_at" header="CREATED AT" body={dateBody} sortable filter showFilterMatchModes filterPlaceholder="Search date" style={{ minWidth: '180px' }} />
                                            <Column field="is_published" header="STATUS" body={statusBody} sortable filter showFilterMatchModes filterPlaceholder="Search status" style={{ minWidth: '120px' }} />
                                            <Column header="ACTION" body={actionBody} style={{ minWidth: '100px', textAlign: 'center' }} />
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
                    loading={deleteBlogsMutation.isPending}
                    text="The selected blog posts will be permanently removed."
                />
            </div>
            <style>{`
                .blog-row-info {
                    transition: all 0.2s;
                }
                .blog-list-table .p-datatable-tbody > tr {
                    cursor: pointer;
                }
                .blog-list-table .p-selection-column .p-checkbox {
                    margin: 0 auto;
                }
                .table-wrap-content .p-datatable-tbody > tr > td {
                    white-space: normal !important;
                }
            `}</style>
        </div>
    );
}
