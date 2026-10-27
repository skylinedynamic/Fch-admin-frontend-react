import React from 'react';
import { toast } from 'react-toastify';

import { useEmployeeList } from './hooks/useEmployeeList';
import EmployeeListHeader from './components/EmployeeListHeader';
import EmployeeFilters from './components/EmployeeFilters';
import EmployeeTable from './components/EmployeeTable';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import { useEffect } from 'react';

export default function Employees() {
  const {
    filters,
    setFilters,
    globalFilterValue,
    setGlobalFilterValue,
    selection,
    setSelection,
    rows,
    loading,
    deptFilter,
    setDeptFilter,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    perPage,
    setPerPage,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    totalRecords,
    departments,
    showDeleteModal,
    onApplyFilters,
    onClearFilters,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteConfirm,
    handleColumnFilter
  } = useEmployeeList();

  useEffect(() => {
    // Add class to body to prevent global scroll
    document.body.classList.add('table-page-fit-active');

    return () => {
      document.body.classList.remove('table-page-fit-active');
    };
  }, []);

  // Event handlers
  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    let _filters = { ...filters };
    _filters['global'].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const onJobStatusChange = (e) => {
    const val = e.target.value;
    setStatusFilter(val === 'Select Employee Status' ? '' : val);
  };

  const onDeptChange = (e) => {
    const val = e.target.value;
    setDeptFilter(val === 'all' || val === 'Select Department' ? '' : val);
  };

  const onPage = (event) => {
    const nextPerPage = event.rows;
    const nextPage = Math.floor(event.first / event.rows) + 1;
    setPerPage(nextPerPage);
    setPage(nextPage);
  };

  const onSort = (event) => {
    const field = event.sortField;
    const order = event.sortOrder === 1 ? 'asc' : 'desc';
    setSortField(field || sortField);
    setSortOrder(order);
  };

  return (
    <div className="page-content page-content-fit employee-section">
      <div className="container-fluid">
        <EmployeeListHeader
          selection={selection}
          onDeleteSelected={openDeleteModal}
        />

        <div className="row row-table-fit">
          <div className="col-lg-12">
            <div className="card">
              <div className="card-body list-fluid-card">
                <EmployeeFilters
                  globalFilterValue={globalFilterValue}
                  onGlobalFilterChange={onGlobalFilterChange}
                  statusFilter={statusFilter}
                  onStatusChange={onJobStatusChange}
                  deptFilter={deptFilter}
                  onDeptChange={onDeptChange}
                  departments={departments}
                  onApplyFilters={onApplyFilters}
                  onClearFilters={onClearFilters}
                  loading={loading}
                />

                <EmployeeTable
                  rows={rows}
                  loading={loading}
                  totalRecords={totalRecords}
                  page={page}
                  perPage={perPage}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  filters={filters}
                  selection={selection}
                  onSelectionChange={(e) => setSelection(e.value)}
                  onFilter={handleColumnFilter}
                  onPage={onPage}
                  onSort={onSort}
                />
              </div>
            </div>
          </div>
        </div>

        <DeleteConfirmationModal
          show={showDeleteModal}
          onConfirm={handleDeleteConfirm}
          onClose={closeDeleteModal}
          loading={loading}
          text="Deleting employees will remove all information."
        />
      </div>
    </div>
  );
}