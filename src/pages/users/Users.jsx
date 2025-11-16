import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import '../../../assets/css/bootstrap.min.css';

export default function Users() {
const [users, setUsers] = useState([
  { id: 'USR001', name: 'Kazi Arafat', email: 'arafat@example.com', phone: '+880123456001', role: 'Admin', status: 'Active' },
  { id: 'USR002', name: 'Sabbir Hossain', email: 'sabbir@example.com', phone: '+880123456002', role: 'User', status: 'Inactive' },
  { id: 'USR003', name: 'Mina Akter', email: 'mina@example.com', phone: '+880123456003', role: 'Moderator', status: 'Active' },
  { id: 'USR004', name: 'Rahim Uddin', email: 'rahim@example.com', phone: '+880123456004', role: 'User', status: 'Active' },
  { id: 'USR005', name: 'Anika Rahman', email: 'anika@example.com', phone: '+880123456005', role: 'User', status: 'Inactive' },
  { id: 'USR006', name: 'Tariq Islam', email: 'tariq@example.com', phone: '+880123456006', role: 'Admin', status: 'Active' },
  { id: 'USR007', name: 'Nabila Sultana', email: 'nabila@example.com', phone: '+880123456007', role: 'User', status: 'Active' },
  { id: 'USR008', name: 'Imran Khan', email: 'imran@example.com', phone: '+880123456008', role: 'Moderator', status: 'Inactive' },
  { id: 'USR009', name: 'Farhana Khatun', email: 'farhana@example.com', phone: '+880123456009', role: 'User', status: 'Active' },
  { id: 'USR010', name: 'Rafiq Ahmed', email: 'rafiq@example.com', phone: '+880123456010', role: 'User', status: 'Active' },
  { id: 'USR011', name: 'Sadia Akter', email: 'sadia@example.com', phone: '+880123456011', role: 'User', status: 'Inactive' },
  { id: 'USR012', name: 'Jamil Hossain', email: 'jamil@example.com', phone: '+880123456012', role: 'Admin', status: 'Active' },
  { id: 'USR013', name: 'Rumana Begum', email: 'rumana@example.com', phone: '+880123456013', role: 'Moderator', status: 'Active' },
  { id: 'USR014', name: 'Sakib Khan', email: 'sakib@example.com', phone: '+880123456014', role: 'User', status: 'Inactive' },
  { id: 'USR015', name: 'Mousumi Sultana', email: 'mousumi@example.com', phone: '+880123456015', role: 'User', status: 'Active' },
  { id: 'USR016', name: 'Fahim Ahmed', email: 'fahim@example.com', phone: '+880123456016', role: 'Admin', status: 'Active' },
  { id: 'USR017', name: 'Lamia Akter', email: 'lamia@example.com', phone: '+880123456017', role: 'User', status: 'Inactive' },
  { id: 'USR018', name: 'Shahriar Khan', email: 'shahriar@example.com', phone: '+880123456018', role: 'Moderator', status: 'Active' },
  { id: 'USR019', name: 'Tanjim Hossain', email: 'tanjim@example.com', phone: '+880123456019', role: 'User', status: 'Active' },
  { id: 'USR020', name: 'Anwar Ali', email: 'anwar@example.com', phone: '+880123456020', role: 'User', status: 'Inactive' },
]);

  // Filters & selection
  const [filters, setFilters] = useState({});
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [selection, setSelection] = useState([]);

  // Add User Modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
  });

  const initFilters = () => {
    setFilters({
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      phone: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      role: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
      status: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
    });
    setGlobalFilterValue('');
  };

  useEffect(() => initFilters(), []);

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    let _filters = { ...filters };
    _filters['global'].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const nameBodyTemplate = (rowData) => (
    <Link to="/user-details" className="fw-medium link-primary">{rowData.name}</Link>
  );

  const handleAddUserInput = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    const id = `USR${(users.length + 1).toString().padStart(3, '0')}`;
    setUsers([...users, { id, ...newUser, status: 'Active' }]);
    setNewUser({ name: '', email: '', phone: '', role: '', password: '' });
    setShowAddUser(false);
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
                rows={10}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sortMode="multiple"
                filterDisplay="menu"
                filters={filters}
                onFilter={(e) => setFilters(e.filters)}
                globalFilterFields={['name', 'email', 'phone', 'role', 'status']}
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
                <Column field="phone" header="Phone" sortable filter showFilterMatchModes />
                <Column field="role" header="Role" sortable filter showFilterMatchModes />
                <Column field="status" header="Status" sortable filter showFilterMatchModes />
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
                      <input type="text" name="phone" className="form-control" value={newUser.phone} onChange={handleAddUserInput} required />
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
