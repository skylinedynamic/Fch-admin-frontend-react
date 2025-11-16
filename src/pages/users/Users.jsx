import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchUsers } from '../../modules/user/services';
import '../../../assets/css/bootstrap.min.css';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);

  // Filters & selection
  const [filters, setFilters] = useState({});
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [selection, setSelection] = useState([]);

  // Add User Modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone_number: '',
    role: '',
    password: '',
  });

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

  // Fetch users on component mount
  useEffect(() => {
    initFilters();
    loadUsers();
  }, []);

  const loadUsers = async (page = 1, search = '') => {
    try {
      const response = await fetchUsers({
        page,
        per_page: 10,
        search,
      });
      setUsers(response.data || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    let _filters = { ...filters };
    _filters['global'].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
    loadUsers(1, value);
  };

  const nameBodyTemplate = (rowData) => (
    <Link to="/user-details" className="fw-medium link-primary">{rowData.name}</Link>
  );

const statusBodyTemplate = (rowData) => {
  let badgeClass = '';
  if (rowData.status === 'active') badgeClass = 'success'; // green
  else if (rowData.status === 'inactive') badgeClass = 'danger'; // red
  else badgeClass = 'secondary'; // fallback color

  return <span className={`badge bg-${badgeClass}`}>{rowData.status}</span>;
};

  const handleAddUserInput = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetchUsers({}, '/users'); // Adjust endpoint as needed
      loadUsers();
      setNewUser({ name: '', email: '', phone_number: '', role: '', password: '' });
      setShowAddUser(false);
    } catch (error) {
      console.error('Failed to add user:', error);
    }
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
              <button
                className="btn btn-primary fw-medium"
                onClick={() => setShowAddUser(true)}
              >
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
              <option value="Admin">Admin</option>
              <option value="User">User</option>
              <option value="Moderator">Moderator</option>
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-control">
              <option value="">Select Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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
                onPage={(e) => {
                  const pageNumber = e.first / e.rows + 1;
                  loadUsers(pageNumber, globalFilterValue);
                }}
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
                <Column field="name" header="Name" sortable filter showFilterMatchModes filterPlaceholder="Search name" body={nameBodyTemplate} />
                <Column field="email" header="Email" sortable filter showFilterMatchModes />
                <Column field="phone_number" header="Phone" sortable filter showFilterMatchModes />
                <Column field="role" header="Role" sortable filter showFilterMatchModes />
                <Column field="status" header="Status" sortable filter showFilterMatchModes body={statusBodyTemplate} />
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
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
                      <select name="role" className="form-control" value={newUser.role} onChange={handleAddUserInput} required>
                        <option value="">Select Role</option>
                        <option value="Admin">Admin</option>
                        <option value="User">User</option>
                        <option value="Moderator">Moderator</option>
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
