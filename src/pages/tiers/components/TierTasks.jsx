import React, { useEffect, useState } from 'react';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Dropdown } from 'primereact/dropdown';
import { Column } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { toast } from 'react-toastify';

import {
    fetchTierTasks,
    createTierTask,
    updateTierTask,
    deleteTierTask,
    deleteTierTasks
} from '../../../modules/tiers/services';
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import TableLoader from '../../../components/Loader/TableLoader';
import TierTaskModal from './TierTaskModal';
import { useAuthStore } from '../../../store/auth/authStore';

export default function TierTasks({ tierId }) {
    const { user } = useAuthStore();
    const isDeveloper = user?.role_name === 'Developer';

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination & Sort
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sortField, setSortField] = useState('title');
    const [sortOrder, setSortOrder] = useState('asc');

    // Filters
    const [searchText, setSearchText] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [filters, setFilters] = useState({
        title: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        subtitle: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        estimated_completion_days: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        order: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
    });

    // Selection
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [deleteRows, setDeleteRows] = useState([]);

    // Add/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [editTask, setEditTask] = useState(null);
    const [loadingSave, setLoadingSave] = useState(false);

    // Removed statusOptions

    const loadTasks = async () => {
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

            const result = await fetchTierTasks(payload);

            if (result.status) {
                setTasks(Array.isArray(result.data) ? result.data : []);
                const meta = result.meta;
                if (meta) {
                    setTotalRecords(meta.total);
                } else {
                    setTotalRecords((result.data || []).length);
                }
            } else {
                setTasks([]);
                setError(result.message);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load tasks');
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTasks();
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
        setEditTask(null);
        setShowModal(true);
    };

    const openEditModal = (task) => {
        setEditTask(task);
        setShowModal(true);
    };

    const handleModalSubmit = async (formData) => {
        setLoadingSave(true);
        try {
            if (editTask) {
                await updateTierTask(editTask.id, formData);
                toast.success('Task updated successfully');
            } else {
                await createTierTask(formData);
                toast.success('Task created successfully');
            }
            setShowModal(false);
            loadTasks();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || 'Failed to save task';
            toast.error(msg);
        } finally {
            setLoadingSave(false);
        }
    };

    // Delete Handlers
    const openDeleteModal = () => {
        if (!selectedTasks || selectedTasks.length === 0) {
            toast.warn('Please select at least one task to delete.');
            return;
        }
        setDeleteRows(selectedTasks);
        setDeleteId(null);
        setShowDeleteModal(true);
    };

    const handleDeleteClick = (task) => {
        setDeleteId(task.id);
        setDeleteRows([]);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        let idsToDelete = [];
        if (deleteId) {
            idsToDelete = [deleteId];
        } else if (deleteRows && deleteRows.length > 0) {
            idsToDelete = deleteRows.map(t => t.id);
        }

        if (idsToDelete.length === 0) return;

        try {
            setLoading(true); // Re-use main loading state or create a deleting state? 
            // Better to just show loading in modal, but modal handles its own loading prop if passed? 
            // DeleteConfirmationModal has loading prop.

            if (idsToDelete.length === 1) {
                // Actually fetchTierTasks service has deleteTierTask (single) and deleteTierTasks (multiple)
                // But wait, my logic handles both array.
                // Service has `deleteTierTask` (single ID) and `deleteTierTasks` (array).
                if (deleteId) {
                    await deleteTierTask(deleteId);
                } else {
                    await deleteTierTasks(idsToDelete);
                }
            } else {
                await deleteTierTasks(idsToDelete);
            }

            toast.success("Task(s) deleted successfully");
            setShowDeleteModal(false);
            setDeleteId(null);
            setDeleteRows([]);
            setSelectedTasks([]);
            loadTasks();
        } catch (err) {
            console.error('Delete error:', err);
            toast.error(err.message || 'Failed to delete tasks');
        } finally {
            setLoading(false);
        }
    };


    const titleBodyTemplate = (rowData) => {
        return (
            <span
                className="fw-medium cursor-pointer"
                style={{ cursor: 'pointer' }}
                onClick={() => openEditModal(rowData)}
            >
                {rowData.title}
            </span>
        );
    };


    // Removed statusBodyTemplate

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
                    selectedTasks.length > 0 ? (
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={openDeleteModal}
                        >
                            <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={openAddModal}>
                            <i className="ri-add-line me-1 align-bottom"></i> Add Task
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
                                placeholder="Search tasks..."
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
                    { style: { width: '35%' } },       // Title
                    { style: { width: '35%' } },       // Subtitle
                    { style: { width: '15%' } },       // Estimated Days
                    { style: { width: '15%' } }        // Order
                ]} />
            ) : (
                <DataTable
                    value={tasks || []}
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
                    selection={selectedTasks}
                    onSelectionChange={(e) => setSelectedTasks(e.value)}
                    selectionMode={isDeveloper ? "multiple" : null}
                    dataKey="id"
                    filters={filters}
                    filterDisplay="menu"
                    onFilter={onFilter}
                >
                    {isDeveloper && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false} />}
                    <Column field="title" header="Title" body={titleBodyTemplate} sortable filter filterPlaceholder="Search Title" style={{ width: '35%' }} />
                    <Column field="subtitle" header="Subtitle" sortable filter filterPlaceholder="Search Subtitle" style={{ width: '35%' }} />
                    <Column field="estimated_completion_days" header="Estimated Days" sortable filter filterPlaceholder="Search Days" headerStyle={{ width: '15%', textAlign: 'center' }} bodyClassName="text-center" style={{ width: '15%' }} />
                    <Column field="order" header="Order" sortable filter filterPlaceholder="Search Order" headerStyle={{ width: '15%', textAlign: 'center' }} bodyClassName="text-center" style={{ width: '15%' }} />
                </DataTable>
            )}

            <TierTaskModal
                show={showModal}
                onHide={() => setShowModal(false)}
                onSubmit={handleModalSubmit}
                task={editTask}
                tierId={tierId}
                loadingSave={loadingSave}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                onConfirm={handleDeleteConfirm}
                onClose={() => setShowDeleteModal(false)}
                loading={loading} // Modal might not use loading prop? Checked: it does "loading={loading}" in TiersList.jsx
                text="The selected tasks will be deleted."
            />
        </React.Fragment>
    );
}
