import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Dropdown } from 'primereact/dropdown';
import { Column } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { toast } from 'react-toastify';

import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import TableLoader from '../../../components/Loader/TableLoader';
import TierVendorModal from './TierVendorModal';
import { usePermissions } from '../../../lib/auth/usePermissions';

import { CATEGORY_OPTIONS } from '../../../config';
import { useTierVendors, useCreateTierVendor, useUpdateTierVendor, useDeleteTierVendor, useDeleteTierVendors } from '../../../modules/tiers/queries';

const TierVendors = forwardRef(({ tierId }, ref) => {
    const [serverErrors, setServerErrors] = useState({});

    // Pagination & Sort
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const { hasPermission } = usePermissions();

    // Filters
    const [searchText, setSearchText] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [appliedCategory, setAppliedCategory] = useState('');
    const [filters, setFilters] = useState({
        name: { constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        category: { constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        status: { constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
    });

    // Selection
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [deleteRows, setDeleteRows] = useState([]);

    // Add/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [editVendor, setEditVendor] = useState(null);
    const [loadingSave, setLoadingSave] = useState(false);

    useImperativeHandle(ref, () => ({
        openAddModal: () => {
            setEditVendor(null);
            setServerErrors({});
            setShowModal(true);
        },
        getSelectedVendors: () => selectedVendors,
        openDeleteModal: openDeleteModal
    }));

    // React Query Hooks
    const {
        data: vendorsData,
        isLoading: loading,
        isFetching
    } = useTierVendors({
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
        search: appliedSearchText,
        tier_id: tierId,
        category: appliedCategory,
        filters: filters
    });

    const createMutation = useCreateTierVendor();
    const updateMutation = useUpdateTierVendor();
    const deleteMutation = useDeleteTierVendor();
    const deleteMutations = useDeleteTierVendors();

    useEffect(() => {
        if (vendorsData?.meta) {
            setTotalRecords(vendorsData.meta.total);
        }
    }, [vendorsData]);

    const onFilter = (event) => {
        setFilters(event.filters);
    };

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedCategory(selectedCategory);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedCategory('');
        setAppliedSearchText('');
        setAppliedCategory('');
        setPage(1);
    };

    const onPage = (event) => {
        setPage(event.first / event.rows + 1);
        setPerPage(event.rows);
    };

    const onSort = (event) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    // Modal Handlers
    const openAddModal = () => {
        setEditVendor(null);
        setServerErrors({});
        setShowModal(true);
    };

    const openEditModal = (vendor) => {
        setEditVendor(vendor);
        setServerErrors({});
        setShowModal(true);
    };

    const handleModalSubmit = async (formData) => {
        setServerErrors({});
        try {
            let payload = formData;

            // Check if logo is a file or if we need to send multipart/form-data
            // Since we added a file input, we should check if 'logo' is a File object
            // or always send as FormData to be safe if logo is present
            const isMultipart = formData.logo instanceof File;

            if (isMultipart) {
                const data = new FormData();
                Object.keys(formData).forEach(key => {
                    const value = formData[key];
                    if (Array.isArray(value)) {
                        value.forEach((item, index) => {
                            data.append(`${key}[${index}]`, item);
                        });
                    } else if (value !== null && value !== undefined) {
                        if (value instanceof File) {
                            // Sanitize filename: replace spaces with underscores
                            const sanitizedName = value.name.replace(/\s+/g, '_');
                            const sanitizedFile = new File([value], sanitizedName, { type: value.type });
                            data.append(key, sanitizedFile);
                        } else {
                            data.append(key, value);
                        }
                    }
                });
                // For update, we might need to handle _method field if using PUT with FormData (Laravel quirk)
                // But react-query mutation usually handles it? No, axios needs it.
                // Assuming POST for create, PUT for update.
                // If update and file, typically we need POST with _method=PUT for Laravel
                if (editVendor) {
                    data.append('_method', 'PUT');
                }
                payload = data;
            }

            if (editVendor) {
                // If multipart, we usually use POST with _method=PUT for Laravel file uploads on update
                if (isMultipart) {
                    await updateMutation.mutateAsync({ id: editVendor.id, data: payload }); // Ensure query uses POST if payload is FormData
                } else {
                    await updateMutation.mutateAsync({ id: editVendor.id, data: payload });
                }
                toast.success('Vendor updated successfully');
            } else {
                await createMutation.mutateAsync(payload);
                toast.success('Vendor created successfully');
            }
            setShowModal(false);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 422) {
                setServerErrors(err.response.data.errors);
            } else {
                const msg = err.response?.data?.message || 'Failed to save vendor';
                toast.error(msg);
            }
        }
    };

    // Delete Handlers
    const openDeleteModal = () => {
        if (!selectedVendors || selectedVendors.length === 0) {
            toast.warn('Please select at least one vendor to delete.');
            return;
        }
        setDeleteRows(selectedVendors);
        setDeleteId(null);
        setShowDeleteModal(true);
    };

    const handleDeleteClick = (vendor) => {
        setDeleteId(vendor.id);
        setDeleteRows([]);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        let idsToDelete = [];
        if (deleteId) {
            idsToDelete = [deleteId];
        } else if (deleteRows && deleteRows.length > 0) {
            idsToDelete = deleteRows.map(v => v.id);
        }

        if (idsToDelete.length === 0) return;

        try {
            if (idsToDelete.length === 1) {
                if (deleteId) {
                    await deleteMutation.mutateAsync(deleteId);
                } else {
                    await deleteMutations.mutateAsync(idsToDelete);
                }
            } else {
                await deleteMutations.mutateAsync(idsToDelete);
            }

            toast.success("Vendor(s) deleted successfully");
            setShowDeleteModal(false);
            setDeleteId(null);
            setDeleteRows([]);
            setSelectedVendors([]);
        } catch (err) {
            console.error('Delete error:', err);
            toast.error(err.message || 'Failed to delete vendors');
        }
    };


    const nameBodyTemplate = (rowData) => {
        return (
            <span className="fw-medium text-primary">
                {rowData.name}
            </span>
        );
    };

    const arrayBadgeBodyTemplate = (rowData, field, badgeClass = 'text-bg-secondary') => {
        const values = rowData[field];
        if (!values || !Array.isArray(values) || values.length === 0) return '-';
        return (
            <div className="d-flex flex-wrap gap-1">
                {values.map((item, index) => (
                    <span key={index} className={`badge ${badgeClass}`}>
                        {item}
                    </span>
                ))}
            </div>
        );
    };

    const statusBodyTemplate = (rowData) => {
        const status = rowData.status ? rowData.status.charAt(0).toUpperCase() + rowData.status.slice(1) : '-';
        const badgeClass = status === 'Active' ? 'bg-success' : 'bg-danger';
        return (
            <span className={`badge ${badgeClass}`}>
                {status}
            </span>
        );
    };

    const statusFilterTemplate = (options) => {
        return (
            <Dropdown
                value={options.value}
                onChange={(e) => options.filterCallback(e.value, options.index)}
                options={[
                    { label: 'All Status', value: '' },
                    { label: 'Active', value: 'Active' },
                    { label: 'Inactive', value: 'Inactive' }
                ]}
                optionLabel="label"
                optionValue="value"
                placeholder="All Status"
                className="w-100"
                showClear
            />
        );
    };



    return (
        <React.Fragment>


            <form onSubmit={(e) => {
                e.preventDefault();
                handleApplyFilters();
            }}>
                <div className="row g-3 mb-3">
                    <div className="col-xxl-6 col-sm-6">
                        <div className="search-box">
                            <input
                                type="text"
                                className="form-control search bg-light border-light"
                                autoComplete="off"
                                placeholder="Search vendors..."
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

                    <div className="col-xxl-3 col-sm-2">
                        <Dropdown
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.value)}
                            options={[
                                { label: 'All Categories', value: '' },
                                ...CATEGORY_OPTIONS
                            ]}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="All Categories"
                            className="w-100 employee-filter-dropdown"
                        />
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
                <TableLoader rows={5} columns={[
                    { style: { width: '3rem' } },
                    { style: { width: '50%' } },       // Name
                    { style: { width: '40%' } },       // Category
                    { style: { width: '10%' } }        // Actions
                ]} />
            ) : (
                <DataTable
                    // BUG-007: without it PrimeReact shows its dropdown default, "No available options".
                    emptyMessage="No vendors found"
                    value={vendorsData?.data || []}
                    paginator
                    rows={perPage}
                    totalRecords={totalRecords}
                    lazy
                    first={(page - 1) * perPage}
                    onPage={onPage}
                    onSort={onSort}
                    sortField={sortField}
                    sortOrder={sortOrder === 'asc' ? 1 : -1}
                    className="p-datatable-sm"
                    tableStyle={{ minWidth: '50rem' }}
                    selection={selectedVendors}
                    onSelectionChange={(e) => {
                        if (e.type === 'checkbox' || e.type === 'all' || !e.type) {
                            setSelectedVendors(e.value);
                        }
                    }}
                    dataKey="id"
                    filters={filters}
                    filterDisplay="menu"
                    onFilter={onFilter}
                    onRowClick={(e) => {
                        const target = e.originalEvent.target;
                        // Prevent opening modal if clicking on selection checkbox or buttons
                        if (
                            !target.closest('.p-checkbox') &&
                            !target.closest('.p-selection-column') &&
                            target.tagName !== 'INPUT' &&
                            !target.closest('button')
                        ) {
                            if (hasPermission('update tier')) {
                                openEditModal(e.data);
                            }
                        }
                    }}
                    rowClassName={() => (hasPermission('update tier') ? 'cursor-pointer' : '')}
                >
                    {hasPermission('update tier') && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false} />}
                    <Column field="name" header="Name" body={nameBodyTemplate} sortable filter filterPlaceholder="Search Name" style={{ width: '20%' }} />
                    <Column field="category" header="Category" sortable filter filterPlaceholder="Search Category" style={{ width: '15%' }} />
                    <Column field="requirements" header="Requirements" body={(rowData) => arrayBadgeBodyTemplate(rowData, 'requirements', 'bg-info')} style={{ width: '20%' }} />
                    <Column field="benefits" header="Benefits" body={(rowData) => arrayBadgeBodyTemplate(rowData, 'benefits', 'bg-success')} style={{ width: '20%' }} />
                    <Column field="report_to" header="Report To" body={(rowData) => arrayBadgeBodyTemplate(rowData, 'report_to', 'bg-primary')} style={{ width: '15%' }} />
                    <Column
                        field="status"
                        header="Status"
                        body={statusBodyTemplate}
                        sortable
                        style={{ width: '10%' }}
                        className="text-center"
                        headerClassName="text-center justify-content-center"
                        filter
                        filterElement={statusFilterTemplate}
                        filterPlaceholder="Select Status"
                        showFilterMatchModes={false}
                    />
                </DataTable>
            )}

            {hasPermission('update tier') && (
                <TierVendorModal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    onSubmit={handleModalSubmit}
                    vendor={editVendor}
                    tierId={tierId}
                    loadingSave={createMutation.isPending || updateMutation.isPending}
                    serverErrors={serverErrors}
                />
            )}

            {hasPermission('update tier') && (
                <DeleteConfirmationModal
                    show={showDeleteModal}
                    onConfirm={handleDeleteConfirm}
                    onClose={() => setShowDeleteModal(false)}
                    loading={deleteMutation.isPending || deleteMutations.isPending}
                    text="The selected vendors will be deleted."
                />
            )}
        </React.Fragment>
    );

});

export default TierVendors;
