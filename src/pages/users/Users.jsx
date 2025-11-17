import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchUsers, createUser, fetchRoles, updateUser, deleteUser } from '../../modules/user/services';
import '../../../assets/css/bootstrap.min.css';

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [filters, setFilters] = useState({});
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [selection, setSelection] = useState([]);

  const [showAddUser, setShowAddUser] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roles, setRoles] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null); 
  const [deletingUserId, setDeletingUserId] = useState(null);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone_number: '',
    role_id: '',
    status: 'active',
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    initFilters();
    loadUsers();
    loadRoles();
  }, []);

  const loadRoles = async () => {
    const roleList = await fetchRoles();
    setRoles(roleList);
  };

  const initFilters = () => {
    setFilters({
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      phone_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      role: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
      status: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
    });
    setGlobalFilterValue('');
  };

  const loadUsers = async (page = 1, search = '') => {
    try {
      const response = await fetchUsers({ page, per_page: 10, search });
      setUsers(response.data || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    const _filters = { ...filters };
    _filters['global'].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
    loadUsers(1, value);
  };

  const handleAddUserInput = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();

    // Password validation only if new password is provided
    if (editingUserId && newUser.new_password) {
      if (newUser.new_password !== newUser.confirm_password) {
        toast.error("New password and confirm password do not match");
        return;
      }
    }

    // Prepare payload, only send new_password if filled
    const payload = {
      name: newUser.name,
      email: newUser.email,
      phone_number: newUser.phone_number,
      role_id: newUser.role_id,
      status: newUser.status,
    };

    if (editingUserId && newUser.new_password) {
      payload.password = newUser.new_password;
    }

    if (!editingUserId) {
      payload.password = newUser.old_password; // For new user, password is required
    }

    try {
      if (editingUserId) {
        await updateUser(editingUserId, payload);
        toast.success("User updated successfully");
      } else {
        await createUser(payload);
        toast.success("User created successfully");
      }

      loadUsers();
      setNewUser({
        name: '',
        email: '',
        phone_number: '',
        role_id: '',
        status: 'active',
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
      setShowAddUser(false);
      setEditingUserId(null);
    } catch (error) {
      toast.error("Failed to save user");
      console.error(error);
    }
  };

  const handleDeleteUser = async () => {
    try {
      await deleteUser(deletingUserId);
      toast.success("User deleted successfully");
      setShowDeleteModal(false);
      setDeletingUserId(null);
      loadUsers();
    } catch (error) {
      toast.error("Failed to delete user");
      console.error(error);
    }
  };

  const nameBodyTemplate = (rowData) => (
    <span
      className="fw-medium link-primary"
      style={{ cursor: 'pointer' }}
      onClick={() => {
        setEditingUserId(rowData.id);
        setNewUser({
          name: rowData.name || '',
          email: rowData.email || '',
          phone_number: rowData.phone_number || '',
          role_id: rowData.role_id || '',
          status: rowData.status || 'active',
          old_password: '',
          new_password: '',
          confirm_password: '',
        });
        setShowAddUser(true);
      }}
    >
      {rowData.name}
    </span>
  );

  const statusBodyTemplate = (rowData) => {
    let badgeClass = '';
    if (rowData.status === 'active') badgeClass = 'success';
    else if (rowData.status === 'inactive') badgeClass = 'danger';
    else badgeClass = 'secondary';
    return <span className={`badge bg-${badgeClass}`}>{rowData.status}</span>;
  };

  return (
    <div className="page-content">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="container-fluid">
        {/* Page Header */}
        <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
          <div className="col-12 d-flex align-items-center justify-content-between">
            <div>
              <h4 className="fs-20 mb-1">Users</h4>
            </div>
            <div>
              <button className="btn btn-primary fw-medium" onClick={() => {
                setShowAddUser(true);
                setEditingUserId(null);
                setNewUser({ name: '', email: '', phone_number: '', role_id: '', status: 'active', old_password: '', new_password: '', confirm_password: '' });
              }}>
                <i className="ri-add-fill me-1 align-bottom"></i> Add User
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="Search users..."
              value={globalFilterValue}
              onChange={onGlobalFilterChange}
            />
          </div>
          <div className="col-md-3">
            <select className="form-control">
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-control">
              <option value="">Select Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-md-2">
            <button type="button" className="btn btn-warning w-100">
              <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
            </button>
          </div>
        </div>

        {/* DataTable */}
        <div className="card">
          <div className="card-body">
            <div className="table-responsive table-card mt-1">
              <DataTable
                value={users}
                paginator
                first={(pagination?.current_page - 1) * pagination?.per_page || 0}
                rows={pagination?.per_page || 10}
                totalRecords={pagination?.total || 0}
                lazy
                onPage={(e) => loadUsers(e.first / e.rows + 1, globalFilterValue)}
                sortMode="multiple"
                filterDisplay="menu"
                filters={filters}
                onFilter={(e) => setFilters(e.filters)}
                globalFilterFields={['name', 'email', 'phone_number', 'role', 'status']}
                selection={selection}
                onSelectionChange={(e) => setSelection(e.value)}
                dataKey="id"
                responsiveLayout="scroll"
                className="p-datatable-sm"
                emptyMessage="No users found"
              >
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                <Column field="name" header="Name" sortable filter body={nameBodyTemplate} />
                <Column field="email" header="Email" sortable filter />
                <Column field="phone_number" header="Phone" sortable filter />
                <Column field="role" header="Role" sortable filter />
                <Column field="status" header="Status" sortable filter body={statusBodyTemplate} />
                <Column
                  header="Action"
                  body={(rowData) => (
                    <>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => {
                          setEditingUserId(rowData.id);
                          setNewUser({
                            name: rowData.name || '',
                            email: rowData.email || '',
                            phone_number: rowData.phone_number || '',
                            role_id: rowData.role_id || '',
                            status: rowData.status || 'active',
                            old_password: '',
                            new_password: '',
                            confirm_password: '',
                          });
                          setShowAddUser(true);
                        }}
                      >
                        <i className="ri-edit-2-fill me-1 align-bottom"></i> Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          setDeletingUserId(rowData.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <i className="ri-delete-bin-6-fill me-1 align-bottom"></i> Delete
                      </button>
                    </>
                  )}
                  style={{ textAlign: 'center', width: '12rem' }}
                />
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
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
                      <label className="form-label">Name</label>
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
                        value={newUser.role_id}
                        onChange={handleAddUserInput}
                        required
                      >
                        <option value="">Select Role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Status</label>
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

                    {/* Password Fields - optional on edit */}
                    {editingUserId ? (
                      <>
                        <div className="mb-3">
                          <label className="form-label">Old Password</label>
                          <input type="password" name="old_password" className="form-control" value={newUser.old_password} onChange={handleAddUserInput} placeholder="Optional" />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">New Password</label>
                          <input type="password" name="new_password" className="form-control" value={newUser.new_password} onChange={handleAddUserInput} placeholder="Optional" />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Confirm Password</label>
                          <input type="password" name="confirm_password" className="form-control" value={newUser.confirm_password} onChange={handleAddUserInput} placeholder="Optional" />
                        </div>
                      </>
                    ) : (
                      <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input type="password" name="old_password" className="form-control" value={newUser.old_password} onChange={handleAddUserInput} required />
                      </div>
                    )}

                    <div className="d-flex justify-content-end">
                      <button type="button" className="btn btn-secondary me-2" onClick={() => {
                        setShowAddUser(false);
                        setEditingUserId(null);
                      }}>Cancel</button>
                      <button type="submit" className="btn btn-primary">
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Delete</h5>
                  <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
                </div>
                <div className="modal-body">
                  Are you sure you want to delete this user?
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={handleDeleteUser}>Delete</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

    </div>
  );
}
