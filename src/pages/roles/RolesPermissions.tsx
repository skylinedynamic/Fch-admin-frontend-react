import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import newDocImg from '../../../assets/images/new-document.png'

type User = { id: number; name: string; email: string; role: string; joined: string }
type Role = { name: string; usersCount: number; permissions: string[] }

export default function RolesPermissions() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState<Role[]>([
    {
      name: 'Admin',
      usersCount: 12,
      permissions: [
        'Delete product','Delete attribute','View blog','Edit product','View product','Manage users','Create award','Financial annual report','Delete slider','Quality audit innovation','Delete blog category','Access reports','Edit orders','Refund orders','Manage categories','Manage tags','Publish posts','Unpublish posts','Edit settings','View analytics','Manage discounts','Edit customer','Delete customer','Export data','Import data','Manage inventory','Approve reviews','Moderate comments','Access all areas','View logs','Manage roles','Assign permissions','Backup database','Restore backups','View revenue','Edit invoices','Delete invoices','Mark payments','Manage subscriptions','Cancel subscriptions','View tickets','Reply tickets','Close tickets','Create survey','Edit survey','Delete survey','View leads','Edit leads','Delete leads','Manage partners','Approve partners','Suspend partners','Create events','Edit events','Delete events'
      ]
    }
  ])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showAllPerms, setShowAllPerms] = useState(false)

  const usersByRole: Record<string, User[]> = useMemo(() => ({
    Admin: [
      { id: 1, name: 'Admin', email: 'admin@mail.com', role: 'Admin', joined: '10 Jul 2025, 04:24 am' },
      { id: 2, name: 'Alex Carter', email: 'alex@example.com', role: 'Admin', joined: '12 Aug 2025, 01:10 pm' }
    ]
  }), [])

  const initials = (s: string) => (s || '?').trim().charAt(0).toUpperCase()

  const handleViewUsers = (role: Role) => {
    setSelectedRole(role)
    setShowAllPerms(false)
    setModalOpen(true)
  }

  const handleAddRole = () => {
    const name = window.prompt('Role name') || ''
    if (!name.trim()) return
    const exists = roles.some(r => r.name.toLowerCase() === name.trim().toLowerCase())
    if (exists) return
    const next: Role = { name: name.trim(), usersCount: 0, permissions: [] }
    const insertIndex = roles.length
    const copy = roles.slice()
    copy.splice(insertIndex, 0, next)
    setRoles(copy)
  }

  const previewPermissions = (perms: string[]) => perms.slice(0, 6)
  const remainingCount = (perms: string[]) => Math.max(perms.length - 6, 0)

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between flex-row">
              <div className="flex-grow-1">
                <h4 className="fs-20 mb-1">Roles &amp; Permissions</h4>
                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                  <ol className="breadcrumb m-0">
                    <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                    <li className="breadcrumb-item active" aria-current="page">Roles &amp; Permissions</li>
                  </ol>
                </nav>
              </div>
              <div className="page-actions d-flex align-items-center gap-2 mt-0">
                <button type="button" className="btn btn-outline-secondary w-lg" onClick={() => navigate(-1)}>
                  <i className="ri-arrow-left-line align-middle me-1"></i> Back
                </button>
                <button type="button" className="btn btn-primary w-lg">
                  <i className="ri-save-3-line align-middle me-1"></i> Save
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-xxl-12">
            <div className="card">
              <div className="card-body" style={{ minHeight: '73vh' }}>
                <style>{`
                  .roles-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
                  @media (max-width:1399.98px){.roles-grid{grid-template-columns:repeat(2,1fr)}}
                  @media (max-width:767.98px){.roles-grid{grid-template-columns:1fr}}
                  .role-summary-card{border:1px solid var(--vz-border-color);box-shadow:0 2px 6px rgba(0,0,0,.06);border-radius:.75rem;background:var(--bs-body-bg);padding:24px}
                  .role-summary-card h5{font-weight:700;margin-bottom:12px}
                  .role-meta{color:var(--vz-gray)}
                  .role-header{display:flex;align-items:center;justify-content:space-between;gap:12px}
                  .count-badge{background:var(--bs-primary-bg-subtle);color:var(--bs-primary);border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600}
                  .count-badge.solid{background:#d4af37;box-shadow:0 2px 6px rgba(0,0,0,.06)}
                  .bullet-list{list-style:none;padding-left:0;margin:16px 0}
                  .bullet-list li{display:flex;align-items:center;gap:10px;padding:8px 0;color:var(--vz-body-color)}
                  .bullet-list li::before{content:'•';color:var(--bs-primary)}
                  .card-actions{display:flex;gap:12px}
                  .add-role-card{border:1px dashed var(--vz-border-color);border-radius:.75rem;box-shadow: 0 2px 6px rgba(0, 0, 0, .06);background:var(--bs-body-bg);padding:24px;display:flex;align-items:center;justify-content:center;min-height:220px;flex-direction:column}
                  .add-role-card img{max-width:120px;opacity:.9;margin-bottom:12px}
                  .users-modal .card{border:1px solid var(--vz-border-color);box-shadow:0 4px 14px rgba(0,0,0,0.06);border-radius:12px}
                  .section-title{font-weight:600;font-size:16px;margin:0}
                  .user-table{width:100%;border-collapse:separate;border-spacing:0 10px}
                  .user-table thead th{font-size:12px;text-transform:uppercase;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;padding:10px 12px}
                  .user-table tbody tr{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.04)}
                  .user-table tbody td{padding:12px;border-top:1px solid #f3f4f6;vertical-align:middle}
                  .avatar-dot{width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:600;color:#fff;background:linear-gradient(135deg,#ef4444,#f59e0b);margin-right:10px}
                  .user-identity{display:flex;align-items:center;gap:10px}
                  .user-identity .name{font-weight:600;color:#111827}
                  .user-identity .email{color:#6b7280;font-size:12px}
                  .table-actions .btn{padding:6px 10px}
                  .modal-header .badge-count{font-size:12px;color:#6b7280;margin-left:8px}
                  .permissions-scroll{max-height:300px;overflow:auto;border:1px solid var(--vz-border-color);border-radius:.5rem;padding:12px;background:var(--bs-body-bg)}
                  .modal-backdrop-custom{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1040}
                  .users-modal{z-index:1055}
                `}</style>

                <div className="roles-grid">
                  {roles.map((r, idx) => (
                    <div className="role-summary-card" key={r.name + idx}>
                      <div className="role-header"><h5>{r.name}</h5><span className="count-badge solid">{r.usersCount} users</span></div>
                      <p className="role-meta mb-2">Total users with this role: <strong>{r.usersCount}</strong></p>
                      <ul className="bullet-list">
                        {previewPermissions(r.permissions).map((p, i) => (<li key={p + i}>{p}</li>))}
                        {remainingCount(r.permissions) > 0 && (
                          <li className="text-muted">and {remainingCount(r.permissions)} more...</li>
                        )}
                      </ul>
                      <div className="card-actions">
                        <button className="btn btn-light" onClick={() => handleViewUsers(r)}>View All Users</button>
                        <button className="btn btn-primary">Edit Role</button>
                      </div>
                    </div>
                  ))}

                  <div className="add-role-card text-center">
                    <img src={newDocImg} alt="Add role" />
                    <h6 className="mb-1">Add New Role</h6>
                    <p className="text-muted mb-3">Create a role and assign permissions.</p>
                    <Link to="/roles-permissions/create" className="btn btn-outline-primary"><i className="ri-add-line me-1"></i> New Role</Link>
                  </div>
                </div>

                {modalOpen && selectedRole && (
                  <>
                    <div className="modal-backdrop-custom" onClick={() => setModalOpen(false)}></div>
                    <div className="modal d-block users-modal" tabIndex={-1} role="dialog" aria-modal="true">
                      <div className="modal-dialog modal-lg" style={{ maxWidth: '980px' }}>
                        <div className="modal-content border-0" style={{ boxShadow: '0 12px 28px rgba(16,24,40,.18)' }}>
                          <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                              <i className="ri-user-3-line fs-18"></i> {selectedRole.name} Users Assigned <span className="badge-count">({(usersByRole[selectedRole.name]||[]).length})</span>
                            </h5>
                            <button type="button" className="btn-close" onClick={() => setModalOpen(false)} aria-label="Close"></button>
                          </div>
                          <div className="modal-body p-4">
                            <div className="row g-4">
                              <div className="col-lg-4">
                                <div className="card" style={{ borderRadius: '12px' }}>
                                  <div className="card-body position-relative">
                                    <span className="badge bg-warning-subtle text-warning position-absolute" style={{ right: 16, top: 16 }}>Details</span>
                                    <h6 className="section-title mb-3">{selectedRole.name}</h6>
                                    <ul className="bullet-list mb-3">
                                      {previewPermissions(selectedRole.permissions).map((p, i) => (<li key={p + i}>{p}</li>))}
                                      {remainingCount(selectedRole.permissions) > 0 && !showAllPerms && (
                                        <li><button className="btn btn-link p-0 text-muted" onClick={() => setShowAllPerms(true)}>and {remainingCount(selectedRole.permissions)} more...</button></li>
                                      )}
                                    </ul>
                                    {showAllPerms && (
                                      <div className="permissions-scroll mt-2">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                          <h6 className="section-title mb-0">All Permissions</h6>
                                        </div>
                                        <ul className="bullet-list mb-0">
                                          {selectedRole.permissions.map((p, i) => (<li key={p + i}>{p}</li>))}
                                        </ul>
                                        <div className="mt-2 text-end">
                                          <button className="btn btn-link p-0 text-primary" onClick={() => setShowAllPerms(false)}>Show less</button>
                                        </div>
                                      </div>
                                    )}
                                    <button className="btn btn-primary w-100 mt-3">Edit Role</button>
                                  </div>
                                </div>
                              </div>
                              <div className="col-lg-8">
                                <div className="card" style={{ borderRadius: '12px' }}>
                                  <div className="card-body">
                                    <table className="user-table w-100">
                                      <thead>
                                        <tr>
                                          <th>ID</th>
                                          <th>User</th>
                                          <th>Name</th>
                                          <th>Joined Date</th>
                                          <th>Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(usersByRole[selectedRole.name] || []).map(u => (
                                          <tr key={u.id}>
                                            <td>{u.id}</td>
                                            <td>
                                              <span className="avatar-dot">{initials(u.name)}</span>
                                            </td>
                                            <td>
                                              <div className="user-identity" style={{ gap: 4 }}>
                                                <div>
                                                  <div className="name">{u.name}</div>
                                                  <div className="email">{u.email}</div>
                                                </div>
                                              </div>
                                            </td>
                                            <td>{u.joined}</td>
                                            <td className="table-actions">
                                              <button className="btn btn-sm btn-outline-primary">View</button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}