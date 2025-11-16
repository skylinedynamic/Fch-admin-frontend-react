// src/Fch/pages/Users.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchUsers, createUser, fetchRoles } from '../../modules/user/services';
import '../../../assets/css/bootstrap.min.css';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);

  // Filters & selection
  const [filters, setFilters] = useState({});
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [selection, setSelection] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Roles for filter & add user
  const [roles, setRoles] = useState([]);

  // Add User Modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone_number: '',
    role_id: '',
    password: '',
  });

  // Load roles and users on mount
  useEffect(() => {
    initFilters();
    loadRoles();
    loadUsers();
  }, []);

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

  const loadRoles = async () => {
    const roleList = await fetchRoles();
    setRoles(roleList); // [{id, name}, ...]
  };

  const loadUsers = async (
    page = 1,
    search = '',
    role_id = selectedRole,
    status = selectedStatus
  ) => {
    try {
      const response = await fetchUsers({ page, per_page: 10, search, role_id, status });
      setUsers(response.data || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // Handlers for search and filters
  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    loadUsers(1, value, selectedRole, selectedStatus);
  };

  const onRoleFilterChange = (e) => {
    const value = e.target.value;
    setSelectedRole(value);
    loadUsers(1, globalFilterValue, value, selectedStatus);
  };

  const onStatusFilterChange = (e) => {
    const value = e.target.value;
    setSelectedStatus(value);
    loadUsers(1, globalFilterValue, selectedRole, value);
  };

  const handleAddUserInput = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await createUser(newUser); // ✅ API call with role_id
      loadUsers(); // Refresh table
      setNewUser({ name: '', email: '', phone_number: '', role_id: '', password: '' });
      setShowAddUser(false);
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  const nameBodyTemplate = (rowData) => (
    <Link to="/user-details" className="fw-medium link-primary">{rowData.name}</Link>
  );

  const statusBodyTemplate = (rowData) => {
    let badgeClass = '';
    if (rowData.status === 'active') badgeClass = 'success';
    else if (rowData.status === 'inactive') badgeClass = 'danger';
    else badgeClass = 'secondary';
    return <span className={`badge bg-${badgeClass}`}>{rowData.status}</span>;
  };

  const roleBodyTemplate = (rowData) => {
    const role = roles.find((r) => r.id === rowData.role_id);
    return role ? role.name : '-';
  };

  return (
    <div className="page-content">
      <div className="container-fluid">
        {/* Page Header */}
        <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
          <div className="col-12 d-flex align-items-center justify-content-between">
            <div>
              <h4 className="fs-20 mb-1">Users</h4>
              <nav aria-label="breadcrumb" className="d-none d-sm-block">
                <ol className="breadcrumb m-0">
                  <li className="breadcrumb-item"><a href="/">Dashboard</a></li>
                  <li className="breadcrumb-item active" aria-current="page">Users</li>
                </ol>
              </nav>
            </div>
            <div>
              <button className="btn btn-primary fw-medium" onClick={() => setShowAddUser(true)}>
                <i className="ri-add-fill me-1 align-bottom"></i> Add User
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
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
            <select className="form-control" value={selectedRole} onChange={onRoleFilterChange}>
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-control" value={selectedStatus} onChange={onStatusFilterChange}>
              <option value="">Select Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-md-2">
            <button
              type="button"
              className="btn btn-warning w-100"
              onClick={() => {
                setGlobalFilterValue('');
                setSelectedRole('');
                setSelectedStatus('');
                loadUsers(1);
              }}
            >
              <i className="ri-equalizer-fill me-1 align-bottom"></i> Reset
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
                onPage={(e) => loadUsers(e.first / e.rows + 1, globalFilterValue, selectedRole, selectedStatus)}
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
                <Column field="role_id" header="Role" sortable filter body={roleBodyTemplate} />
                <Column field="status" header="Status" sortable filter body={statusBodyTemplate} />
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add User</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddUser(false)}></button>
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
                      <label className="form-label">Password</label>
                      <input type="password" name="password" className="form-control" value={newUser.password} onChange={handleAddUserInput} required />
                    </div>
                    <div className="d-flex justify-content-end">
                      <button type="button" className="btn btn-secondary me-2" onClick={() => setShowAddUser(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Add User</button>
                    </div>
                  </form>
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
