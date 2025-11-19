import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable } from '../../components/Table/DataTableWrapper'
import { Column } from 'primereact/column'
import { Dropdown } from 'primereact/dropdown'
import { FilterMatchMode, FilterOperator } from 'primereact/api'
import { fetchUsers, createUser, fetchRoles, updateUser, deleteUsers } from '../../modules/user/services';
import '../../../assets/css/bootstrap.min.css';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Users() {
  const [filters, setFilters] = useState({})
  const [globalFilterValue, setGlobalFilterValue] = useState('')
  const [selection, setSelection] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortField, setSortField] = useState('id')
  const [sortOrder, setSortOrder] = useState('desc')
  const [totalRecords, setTotalRecords] = useState(0)
  const [appliedFilters, setAppliedFilters] = useState({})
  const [appliedGlobalFilterValue, setAppliedGlobalFilterValue] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [appliedRoleFilter, setAppliedRoleFilter] = useState('')
  const [appliedStatusFilter, setAppliedStatusFilter] = useState('')

  const [showAddUser, setShowAddUser] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roles, setRoles] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null); 
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [loadingSave, setLoadingSave] = useState(false); 
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone_number: '',
    role_id: '',
    status: '',
    password: '',
    new_password: '',
    confirm_password: '',
  });

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' }
  ]

  const initFilters = () => {
    const initial = {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      phone_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      role_name: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
      status: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
    }
    setFilters(initial)
    setAppliedFilters(initial)
    setGlobalFilterValue('')
    setAppliedGlobalFilterValue('')
  }

  useEffect(() => {
    initFilters()
    loadRoles();
  }, [])

  const loadRoles = async () => {
    const roleList = await fetchRoles();
    setRoles(roleList);
  };

  const loadUsers = async () => {
    setLoading(true)
    try {
      const payload = {
        role: appliedRoleFilter || '',
        status: appliedStatusFilter || '',
        search: appliedGlobalFilterValue || '',
        filters: appliedFilters,
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
      }
      const res = await fetchUsers(payload)
      const next = Array.isArray(res) ? res : (res?.data ?? [])
      const meta = Array.isArray(res) ? undefined : res?.meta

      setRows(next)
      if (meta) {
        setTotalRecords(typeof meta.total === 'number' ? meta.total : next.length)
        if (typeof meta.current_page === 'number') setPage(meta.current_page)
        if (typeof meta.per_page === 'number') setPerPage(meta.per_page)
      } else {
        setTotalRecords(next.length)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!appliedFilters || Object.keys(appliedFilters).length === 0) return
    const timeout = setTimeout(() => {
      loadUsers()
    }, 300)
    return () => clearTimeout(timeout)
  }, [appliedRoleFilter, appliedStatusFilter, appliedGlobalFilterValue, appliedFilters, page, perPage, sortField, sortOrder])

  const onGlobalFilterChange = (e) => {
    const value = e.target.value
    setFilters(prev => ({ ...prev, global: { ...prev.global, value } }))
    setGlobalFilterValue(value)
  }

  const onStatusChange = (e) => {
    const val = e.target.value
    setStatusFilter(val === 'Select User Status' ? '' : val)
  }

  const onRoleChange = (e) => {
    const val = e.target.value
    setRoleFilter(val === 'all' || val === 'Select Role' ? '' : val)
  }

  const onApplyFilters = () => {
    setAppliedGlobalFilterValue(globalFilterValue || '')
    setAppliedStatusFilter(statusFilter || '')
    setAppliedRoleFilter(roleFilter || '')
    setAppliedFilters(filters)
    setPage(1)
  }

  const onClearFilters = () => {
    initFilters()
    setAppliedRoleFilter('')
    setAppliedStatusFilter('')
    setRoleFilter('')
    setPage(1)
  }

  const nameBody = (rowData) => (
    <span
      className="fw-medium link-primary"
      style={{ cursor: 'pointer' }}
      onClick={() => {
        setEditingUserId(rowData.id);
        setNewUser({
          name: rowData.name || '',
          email: rowData.email || '',
          phone_number: rowData.phone_number || '',
          role_id: rowData.role_id != null ? String(rowData.role_id) : '',
          status: rowData.status || '',
          password: rowData.password || '',
          new_password: '',
          confirm_password: '',
        });
        setShowAddUser(true);
      }}
    >
      {rowData.name}
    </span>
  )

  const statusBodyTemplate = (rowData) => {
      const active = rowData?.status === 'active';
      return (
        <span className={`badge ${active ? 'border border-success text-success' : 'badge border border-danger text-danger'}`}>
        {active ? 'Active' : 'Inactive'}
        </span>
      );
  }

  const statusRowFilterTemplate = (options) => (
    <Dropdown
      value={options.value}
      options={statusOptions}
      onChange={(e) => options.filterCallback(e.value)}
      placeholder="Select status"
      className="p-column-filter"
      showClear
    />
  )

  const onPage = (event) => {
    setPerPage(event.rows)
    setPage(Math.floor(event.first / event.rows) + 1)
  }

  const onSort = (event) => {
    // setSortField(event.sortField || sortField)
    // setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc')
      setSortField(event.sortField || sortField)
      setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc')
  }

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (editingUserId && newUser.new_password && newUser.new_password !== newUser.confirm_password) {
      toast.error("New password and confirm password do not match");
      return;
    }

    const payload = {
      name: newUser.name,
      email: newUser.email,
      phone_number: newUser.phone_number,
      role_id: newUser.role_id ? Number(newUser.role_id) : null,
      status: newUser.status,
      ...(editingUserId
    ? showPasswordFields && newUser.new_password
      ? { password: newUser.new_password }
      : {}
    : { password: newUser.password })
    }

    try {
       setLoadingSave(true);
      if (editingUserId) await updateUser(editingUserId, payload)
      else await createUser(payload)
      toast.success(`User ${editingUserId ? 'updated' : 'created'} successfully`);
      setShowAddUser(false)
      setEditingUserId(null)
      loadUsers() // refresh table
    } catch (error) {
      toast.error("Failed to save user")
      console.error(error)
    }
     finally {
      setLoadingSave(false); // stop loading
    }
  };

  const handleAddUserInput = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

const handleDeleteSelectedUsers = async () => {
  if (!selection || selection.length === 0) {
    toast.info("No users selected for deletion");
    return;
  }

  try {
    setLoading(true); // show spinner if needed
    const idsToDelete = selection.map(user => user.id);

    // Call API to delete users
    await deleteUsers(idsToDelete);

    toast.success(`Users deleted successfully`);

    setSelection([]);          // clear selected users
    setShowDeleteModal(false); // hide modal
    loadUsers();               // refresh table
  } catch (error) {
    console.error(error);
    toast.error(error?.response?.data?.message || "Failed to delete users");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="page-content">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="container-fluid">
        <div className="row bg-body">
          <div className="col">
            <div className="h-100">
              <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                <div className="col-12">
                  <div className="d-flex align-items-center justify-content-between flex-row">
                    <div className="flex-grow-1">
                      <h4 className="fs-20 mb-1">Users</h4>
                      <nav aria-label="breadcrumb" className="d-none d-sm-block">
                        <ol className="breadcrumb m-0">
                          <li className="breadcrumb-item"><a href="/">Dashboard</a></li>
                          <li className="breadcrumb-item active" aria-current="page">Users</li>
                        </ol>
                      </nav>
                    </div>
                    <div className="mt-0">
                      <form onSubmit={(e) => e.preventDefault()}>
                        <div className="row g-3 mb-0 align-items-center">
                          <div className="col-sm-auto">
                          <div className="btn-group">
                              {Array.isArray(selection) && selection.length > 0 ? (
                                <>
                                  <button type="button" id="primaryActionBtn" className="btn bg-success text-white fw-medium">
                                    Actions
                                  </button>
                                  <button type="button" id="primaryActionToggleBtn" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                    <span className="visually-hidden">Toggle dropdown</span>
                                  </button>
                                  <ul className="dropdown-menu dropdown-menu-end" id="primaryActionMenu">
                                    <li><a className="dropdown-item" href="#" id="exportCsv"><i className="ri-file-text-line me-1 align-bottom"></i> Export CSV</a></li>
                                    <li><a className="dropdown-item" href="#" id="exportExcel"><i className="ri-file-excel-2-line me-1 align-bottom"></i> Export Excel</a></li>
                                    <li><a className="dropdown-item" href="#" id="exportPdf"><i className="ri-file-pdf-2-line me-1 align-bottom"></i> Export PDF</a></li>
                                    <li><hr className="dropdown-divider" /></li>
                                   <li>
                                      <button
                                        className="dropdown-item text-danger"
                                        type="button"
                                        onClick={() => {
                                          if (selection.length === 0) {
                                            toast.warn("Please select at least one user");
                                            return;
                                          }
                                          setShowDeleteModal(true);
                                        }}
                                      >
                                        <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                      </button>
                                    </li>
                                  </ul>
                                </>
                              ) : (
                               <button className="btn btn-primary fw-medium" onClick={() => {
                                  setShowAddUser(true);
                                  setEditingUserId(null);
                                  setNewUser({ name: '', email: '', phone_number: '', role_id: '', password: '', new_password: '', confirm_password: '' });
                                }}>
                                  <i className="ri-add-fill me-1 align-bottom"></i> Add User
                              </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-lg-12">
                  <div className="card">
                    <div className="card-body list-fluid-card">
                      <form>
                        <div className="row g-3 mb-3">
                          <div className="col-xxl-4 col-sm-12">
                            <div className="search-box">
                              <input
                                type="text"
                                className="form-control search bg-light border-light"
                                id="searchStatus"
                                autoComplete="off"
                                placeholder="Search here..."
                                value={globalFilterValue}
                                onChange={onGlobalFilterChange}
                              />
                              <i className="ri-search-line search-icon"></i>
                            </div>
                          </div>
                          <div className="col-xxl-3 col-sm-4">
                            <div className="input-light">
                              <select className="form-control" data-choices data-choices-search-false name="choices-idType" id="idType" onChange={onStatusChange}>
                                <option value="Select User Status" defaultValue>Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                          </div>
                          <div className="col-xxl-3 col-sm-4">
                              <div className="input-light">
                                <select
                                  className="form-control"
                                  data-choices
                                  data-choices-search-false
                                  name="roleFilter"
                                  id="roleFilter"
                                  value={roleFilter || 'all'}
                                   onChange={onRoleChange}
                                >
                                  <option value="all" defaultValue>Select Role</option>
                                  {roles.map((role) => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                  ))}
                                </select>
                              </div>
                          </div>
                          <div className="col-xxl-2 col-sm-4">
                            <div className="d-flex gap-2">
                              <button type="button" className="btn btn-warning flex-grow-1" onClick={onApplyFilters}>
                                <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                              </button>
                              <button type="button" className="btn btn-outline-secondary flex-grow-1" onClick={onClearFilters}>
                                <i className="ri-close-line me-1 align-bottom"></i> Clear
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>
                      <div>
                        <div className="table-responsive table-card mt-1">
                          <DataTable
                            scrollable 
                            scrollHeight="calc(100vh - 370px)"   
                            value={rows}
                            paginator
                            lazy
                            totalRecords={totalRecords}
                            first={(page - 1) * perPage}
                            rows={perPage}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            sortMode="single"
                            sortField={sortField}
                            sortOrder={sortOrder === 'asc' ? 1 : -1}
                            filterDisplay="menu"
                            filters={filters}
                            onFilter={(e) => { setFilters(e.filters); setAppliedFilters(e.filters); setPage(1); }}
                            onPage={onPage}
                            onSort={onSort}
                            globalFilterFields={[
                              'name',
                              'phone_number',
                              'email',
                              'role',
                              'status',
                            ]}
                            selection={selection}
                            onSelectionChange={(e) => setSelection(e.value)}
                            dataKey="id"
                            responsiveLayout="scroll"
                            className="p-datatable-sm"
                            loading={loading}
                            emptyMessage="No Users found"
                          >
                            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false}></Column>
                            <Column field="name" header="User Name" sortable filter showFilterMatchModes filterPlaceholder="Search name" body={nameBody}></Column>
                            <Column field="phone_number" header="Phone" sortable filter showFilterMatchModes filterPlaceholder="(xxx) xxx-xxxx"></Column>
                            <Column field="email" header="Email" sortable filter showFilterMatchModes filterPlaceholder="Search email"></Column>
                            <Column field="role_name" header="Role" sortable filter showFilterMatchModes filterPlaceholder="Search Role"></Column>
                            {/* <Column field="status" header="Status" sortable filter showFilterMatchModes filterPlaceholder="Search Status"></Column> */}
                            {/* <Column field="status" header="Status" sortable filter showFilterMatchModes filterPlaceholder="Search Status"></Column> */}
                            <Column field="status" header="Status" sortable filter showFilterMatchModes filterPlaceholder="Search Status" body={statusBodyTemplate}></Column>
                            {/* <Column
                              field="status"
                              header="Status"
                              showFilterMenu
                              filterMenuStyle={{ width: '14rem' }}
                              body={statusBodyTemplate}
                              filter
                              filterElement={statusRowFilterTemplate}
                            /> */}
                            <Column
                              header="Action"
                              body={(rowData) => (
                                <div className="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
                                  <button
                                    className="btn btn-sm btn-primary"
                                    aria-label="Edit user"
                                    onClick={() => {
                                      setEditingUserId(rowData.id);
                                      setNewUser({
                                        name: rowData.name || '',
                                        email: rowData.email || '',
                                        phone_number: rowData.phone_number || '',
                                        role_id: rowData.role_id != null ? String(rowData.role_id) : '',
                                        password: rowData.password || '',
                                        status: rowData.status || '',
                                        new_password: '',
                                        confirm_password: '',
                                      });
                                      setShowAddUser(true);
                                    }}
                                  >
                                     <i className="ri-edit-2-fill align-bottom"></i>
                                    <span className="d-none d-sm-inline ms-1">Edit</span>
                                  </button>
                                  <button
                                    className="btn btn-sm btn-danger me-2"
                                    aria-label="Delete user"
                                    onClick={() => {
                                      setDeletingUserId(rowData.id);
                                      setShowDeleteModal(true);
                                    }}
                                  >
                                     <i className="ri-delete-bin-6-fill align-bottom"></i>
                                    <span className="d-none d-sm-inline ms-1">Delete</span>
                                  </button>
                               </div>
                              )}
                              style={{ textAlign: 'center', width: '12rem' }}
                            />
                          </DataTable>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                {showAddUser && (
                  <>
                    <div className="modal fade show d-block" tabIndex="-1" role="dialog">
                      <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                          <div className="modal-header">
                            <h5 className="modal-title">{editingUserId ? 'Update User' : 'Add User'}</h5>
                            <button type="button" className="btn-close" onClick={() => {
                              setShowAddUser(false);
                              setEditingUserId(null);
                            }}></button>
                          </div>
                          <div className="modal-body">
                            <form onSubmit={handleAddUserSubmit}>
                              <div className="mb-3">
                                <label className="form-label">Name </label>
                                <input type="text" name="name" className="form-control" value={newUser.name} onChange={handleAddUserInput} required />
                              </div>
                              <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input type="email" name="email" className="form-control" value={newUser.email} onChange={handleAddUserInput} required />
                              </div>
                              <div className="mb-3">
                                <label className="form-label">Phone</label>
                                <input type="text" name="phone_number" className="form-control" value={newUser.phone_number} onChange={handleAddUserInput} required />
                              </div>
                             
                              <div className="mb-3">
                                <label className="form-label">Role</label>
                                <select
                                  name="role_id"
                                  className="form-control"
                                  value={newUser.role_id || ''}
                                  onChange={handleAddUserInput}
                                  required
                                >
                                  <option value="">Select Role</option>
                                  {roles.map((role) => (
                                    <option key={role.id} value={String(role.id)}>
                                      {role.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {editingUserId && (
                               <div className="mb-3">
                                  <label className="form-label"> Status </label>
                                  <select
                                    name="status"
                                    className="form-control"
                                    value={newUser.status}
                                    onChange={handleAddUserInput}
                                    required
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                  </select>
                                </div>
                              )}
                            {/* ADD MODE – Password Required */}
                            {!editingUserId && (
                              <div className="mb-3">
                                <label className="form-label">Password</label>
                                <input
                                  type="password"
                                  name="password"
                                  className="form-control"
                                  value={newUser.password}
                                  onChange={handleAddUserInput}
                                  required
                                />
                              </div>
                            )}

                            {/* EDIT MODE – Password Update Checkbox */}
                            {editingUserId && (
                              <div className="form-check mb-3">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  id="changePasswordCheck"
                                  checked={showPasswordFields}
                                  onChange={(e) => setShowPasswordFields(e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="changePasswordCheck">
                                  Change Password
                                </label>
                              </div>
                            )}

                            {/* EDIT MODE – Show Inputs Only When Checkbox Checked */}
                            {editingUserId && showPasswordFields && (
                              <>
                                <div className="mb-3">
                                  <label className="form-label">New Password</label>
                                  <input
                                    type="password"
                                    name="new_password"
                                    className="form-control"
                                    value={newUser.new_password}
                                    onChange={handleAddUserInput}
                                    placeholder="Enter new password"
                                  />
                                </div>

                                <div className="mb-3">
                                  <label className="form-label">Confirm Password</label>
                                  <input
                                    type="password"
                                    name="confirm_password"
                                    className="form-control"
                                    value={newUser.confirm_password}
                                    onChange={handleAddUserInput}
                                    placeholder="Re-enter new password"
                                  />
                                </div>
                              </>
                            )}
                              <div className="d-flex justify-content-end">
                                  <button type="button" className="btn btn-secondary me-2" onClick={() => {
                                    setShowAddUser(false);
                                    setEditingUserId(null);
                                  }}>Cancel</button>
                                  <button type="submit" className="btn btn-primary" disabled={loadingSave}>
                                    {loadingSave && <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>}
                                    <i className="ri-save-3-fill me-1 align-bottom"></i> {editingUserId ? 'Update' : 'Save'}
                                  </button>
                                </div>
                            </form>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                  </>
                )}
                {showDeleteModal && (
                  <>
                    <div className="modal fade show d-block">
                      <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                          <div className="modal-header">
                            <h5 className="modal-title">Confirm Delete</h5>
                            <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
                          </div>
                          <div className="modal-body">
                            Are you sure you want to delete the selected users?
                          </div>
                          <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button type="button" className="btn btn-danger" onClick={handleDeleteSelectedUsers}>Delete</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                  </>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}