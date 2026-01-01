import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { toast } from 'react-toastify';

import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import TableLoader from '../../../components/Loader/TableLoader';
import TierVendorModal from './TierVendorModal';
import { useAuthStore } from '../../../store/auth/authStore';

// Mock Services - TODO: Implement actual API services
const fetchTierVendors = async (payload) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    const mockData = [
        {
            id: 1,
            name: 'Vendor A',
            category: 'Financial',
            requirements: ['Tax ID', 'Business License'],
            benefits: ['Net-30 Terms', 'Credit Reporting'],
            report_to: ['Dun & Bradstreet', 'Experian']
        },
        {
            id: 2,
            name: 'Vendor B',
            category: 'Supplies',
            requirements: ['EIN', 'D-U-N-S Number'],
            benefits: ['Discounts', 'Fast Shipping'],
            report_to: ['Equifax']
        },
        {
            id: 3,
            name: 'Vendor C',
            category: 'Services',
            requirements: ['Valid Address', 'Phone Verification'],
            benefits: ['24/7 Support'],
            report_to: ['Dun & Bradstreet']
        }
    ];
    return { status: true, data: mockData, meta: { total: 3 } };
};

const createTierVendor = async (payload) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { status: true, data: { ...payload, id: Date.now() } };
};

const updateTierVendor = async (id, payload) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { status: true, data: { ...payload, id } };
};

const deleteTierVendor = async (id) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { status: true };
};

const deleteTierVendors = async (ids) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { status: true };
};

const TierVendors = forwardRef(({ tierId }, ref) => {
    const { user } = useAuthStore();
    const isDeveloper = user?.role_name === 'Developer';

    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination & Sort
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    // Filters
    const [searchText, setSearchText] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [filters, setFilters] = useState({
        name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        category: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
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
            setShowModal(true);
        }
    }));

    const loadVendors = async () => {
        if (!tierId) return;

        setLoading(true);
        try {
            const payload = {
                page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder,
                search: appliedSearchText,
                tier_id: tierId,
                filters: filters
            };

            const result = await fetchTierVendors(payload);

            if (result.status) {
                setVendors(Array.isArray(result.data) ? result.data : []);
                const meta = result.meta;
                if (meta) {
                    setTotalRecords(meta.total);
                } else {
                    setTotalRecords((result.data || []).length);
                }
            } else {
                setVendors([]);
                setError(result.message);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load vendors');
            setVendors([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVendors();
    }, [tierId, page, perPage, sortField, sortOrder, appliedSearchText, filters]);

    const onFilter = (event) => {
        setFilters(event.filters);
    };

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearchText('');
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
        setShowModal(true);
    };

    const openEditModal = (vendor) => {
        setEditVendor(vendor);
        setShowModal(true);
    };

    const handleModalSubmit = async (formData) => {
        setLoadingSave(true);
        try {
            if (editVendor) {
                await updateTierVendor(editVendor.id, formData);
                toast.success('Vendor updated successfully');
            } else {
                await createTierVendor(formData);
                toast.success('Vendor created successfully');
            }
            setShowModal(false);
            loadVendors();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || 'Failed to save vendor';
            toast.error(msg);
        } finally {
            setLoadingSave(false);
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
            setLoading(true);

            if (idsToDelete.length === 1) {
                if (deleteId) {
                    await deleteTierVendor(deleteId);
                } else {
                    await deleteTierVendors(idsToDelete);
                }
            } else {
                await deleteTierVendors(idsToDelete);
            }

            toast.success("Vendor(s) deleted successfully");
            setShowDeleteModal(false);
            setDeleteId(null);
            setDeleteRows([]);
            setSelectedVendors([]);
            loadVendors();
        } catch (err) {
            console.error('Delete error:', err);
            toast.error(err.message || 'Failed to delete vendors');
        } finally {
            setLoading(false);
        }
    };


    const nameBodyTemplate = (rowData) => {
        return (
            <span
                className="fw-medium cursor-pointer"
                style={{ cursor: 'pointer' }}
                onClick={() => openEditModal(rowData)}
            >
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

    const actionBodyTemplate = (rowData) => {
        return (
            <div className="d-flex gap-2">
                <button className="btn btn-sm btn-soft-primary" onClick={() => openEditModal(rowData)}>
                    <i className="ri-pencil-fill align-bottom" />
                </button>
                <button className="btn btn-sm btn-soft-danger" onClick={() => handleDeleteClick(rowData)}>
                    <i className="ri-delete-bin-fill align-bottom" />
                </button>
            </div>
        );
    };

    return (
        <React.Fragment>
            <div className="d-flex justify-content-end align-items-center mb-3 gap-2">
                {isDeveloper && (
                    selectedVendors.length > 0 ? (
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={openDeleteModal}
                        >
                            <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={openAddModal}>
                            <i className="ri-add-line me-1 align-bottom"></i> Add Vendor
                        </button>
                    )
                )}
            </div>

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
                    ...(isDeveloper ? [{ style: { width: '3rem' } }] : []),
                    { style: { width: '50%' } },       // Name
                    { style: { width: '40%' } },       // Category
                    { style: { width: '10%' } }        // Actions
                ]} />
            ) : (
                <DataTable
                    value={vendors || []}
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
                    onSelectionChange={(e) => setSelectedVendors(e.value)}
                    selectionMode={isDeveloper ? "multiple" : null}
                    dataKey="id"
                    filters={filters}
                    filterDisplay="menu"
                    onFilter={onFilter}
                >
                    {isDeveloper && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false} />}
                    <Column field="name" header="Name" body={nameBodyTemplate} sortable filter filterPlaceholder="Search Name" style={{ width: '20%' }} />
                    <Column field="category" header="Category" sortable filter filterPlaceholder="Search Category" style={{ width: '15%' }} />
                    <Column field="requirements" header="Requirements" body={(rowData) => arrayBadgeBodyTemplate(rowData, 'requirements', 'bg-info')} style={{ width: '20%' }} />
                    <Column field="benefits" header="Benefits" body={(rowData) => arrayBadgeBodyTemplate(rowData, 'benefits', 'bg-success')} style={{ width: '20%' }} />
                    <Column field="report_to" header="Report To" body={(rowData) => arrayBadgeBodyTemplate(rowData, 'report_to', 'bg-primary')} style={{ width: '15%' }} />
                    {isDeveloper && <Column header="Actions" body={actionBodyTemplate} style={{ width: '10%' }} />}
                </DataTable>
            )}

            <TierVendorModal
                show={showModal}
                onHide={() => setShowModal(false)}
                onSubmit={handleModalSubmit}
                vendor={editVendor}
                tierId={tierId}
                loadingSave={loadingSave}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                onConfirm={handleDeleteConfirm}
                onClose={() => setShowDeleteModal(false)}
                loading={loading}
                text="The selected vendors will be deleted."
            />
        </React.Fragment>
    );

});

export default TierVendors;
