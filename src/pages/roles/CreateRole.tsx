import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type PermissionItem = { key: string; label: string}
type ModuleDef = { key: string; name: string; desc: string; icon: string; permissions: PermissionItem[] }

export default function CreateRole() {
  const navigate = useNavigate()
  const modules: ModuleDef[] = useMemo(() => ([
    {
      key: 'partners', name: 'Partners', icon: 'las la-handshake', desc: 'Manage partner directory and profiles',
      permissions: [
        { key: 'view', label: 'View Partners' },
        { key: 'create', label: 'Create Partner' },
        { key: 'edit', label: 'Edit Partner' },
        { key: 'delete', label: 'Delete Partner' }
      ]
    },
    {
      key: 'demo', name: 'Demo Requests', icon: 'ri-clipboard-line', desc: 'Capture and manage demo inquiries',
      permissions: [
        { key: 'view', label: 'View Demo Requests' },
        { key: 'create', label: 'Create Demo Request' },
        { key: 'edit', label: 'Edit Demo Request' },
        { key: 'delete', label: 'Delete Demo Request' }
      ]
    },
    {
      key: 'leads', name: 'Leads', icon: 'ri-user-2-line', desc: 'Track and update potential customers',
      permissions: [
        { key: 'view', label: 'View Leads' },
        { key: 'create', label: 'Create Lead'},
        { key: 'edit', label: 'Edit Lead'},
        { key: 'delete', label: 'Delete Lead'}
      ]
    },
    {
      key: 'contacts', name: 'Contacts', icon: 'ri-contacts-line', desc: 'Maintain contact records and updates',
      permissions: [
        { key: 'view', label: 'View Contacts'},
        { key: 'create', label: 'Create Contact' },   
        { key: 'edit', label: 'Edit Contact' },
        { key: 'delete', label: 'Delete Contact' }
      ]
    }
  ]), [])

  const [roleName, setRoleName] = useState('')
  const [adminAccess, setAdminAccess] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Record<string, Record<string, boolean>>>({})

  const toggleExpand = (key: string) => {
    setExpanded((e) => ({ ...e, [key]: !e[key] }))
  }

  const toggleModuleAll = (mod: ModuleDef, checked: boolean) => {
    setSelected((sel) => ({
      ...sel,
      [mod.key]: mod.permissions.reduce((acc, p) => ({ ...acc, [p.key]: checked }), {})
    }))
  }

  const togglePerm = (mod: ModuleDef, permKey: string, checked: boolean) => {
    setSelected((sel) => ({
      ...sel,
      [mod.key]: { ...(sel[mod.key] || {}), [permKey]: checked }
    }))
  }

  const isModuleAllChecked = (mod: ModuleDef) => {
    const s = selected[mod.key] || {}
    return mod.permissions.every((p) => s[p.key])
  }

  const handleSave = () => {
    const payload = {
      name: roleName.trim(),
      admin_access: adminAccess,
      permissions: Object.fromEntries(modules.map((m) => [m.key, Object.keys(selected[m.key] || {}).filter((k) => selected[m.key]?.[k])]))
    }
    console.log('create-role', payload)
  }

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between flex-row">
              <div className="flex-grow-1">
                <h4 className="fs-20 mb-1">Create Roles &amp; Permissions</h4>
                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                  <ol className="breadcrumb m-0">
                    <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                    <li className="breadcrumb-item active" aria-current="page">Create Roles &amp; Permissions</li>
                  </ol>
                </nav>
              </div>
              <div className="page-actions d-flex align-items-center gap-2 mt-0">
                <button type="button" className="btn btn-outline-secondary w-lg" onClick={() => navigate(-1)}>
                  <i className="ri-arrow-left-line align-middle me-1"></i> Back
                </button>
                <button type="button" className="btn btn-primary w-lg" onClick={handleSave}>
                  <i className="ri-save-3-line align-middle me-1"></i> Save
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-xxl-12">
            <div className="card">
              <div className="card-body fluid-card">
                <div className="role-form">
                  <div className="mb-4">
                    <label className="form-label" style={{ fontSize: '.90rem' }}>Role name *</label>
                    <input type="text" className="form-control" placeholder="Enter a role name" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
                  </div>

                  <div className="mb-3">
                    <label className="form-label" style={{ fontSize: '.90rem' }}>Role Permissions</label>
                    <div className="d-flex align-items-center gap-3">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="adminAccessToggle" checked={adminAccess} onChange={(e) => setAdminAccess(e.target.checked)} />
                        <label className="form-check-label" htmlFor="adminAccessToggle">Administrator Access</label>
                      </div>
                    </div>
                  </div>

                  <div className="row g-4">
                    <div className="col-lg-12">
                      <div className="perm-card">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <h6 className="section-title">Module Permissions</h6>
                        </div>
                        <div className="row g-3 module-grid">
                          {modules.map((mod) => {
                            const allChecked = isModuleAllChecked(mod)
                            return (
                              <div className="col-xl-6 col-lg-6" key={mod.key}>
                                <div className={`module-card perm-section module-accent ${expanded[mod.key] ? 'open' : ''}`}>
                                  <div className="module-header" role="button" aria-expanded={expanded[mod.key] ? 'true' : 'false'} onClick={() => toggleExpand(mod.key)}>
                                    <div className="title-wrap">
                                      <span className="module-icon"><i className={mod.icon}></i></span>
                                      <div>
                                        <strong>{mod.name}</strong>
                                        <div className="desc small">{mod.desc}</div>
                                      </div>
                                    </div>
                                    <div className="accordion-actions">
                                      <div className="form-check form-switch m-0" onClick={(e) => e.stopPropagation()}>
                                        <input className="form-check-input" type="checkbox" id={`selectAll-${mod.key}`} checked={allChecked} onChange={(e) => toggleModuleAll(mod, e.target.checked)} />
                                        <label className="form-check-label" htmlFor={`selectAll-${mod.key}`}>Select all</label>
                                      </div>
                                      <span className="accordion-caret"><i className="ri-arrow-down-s-line"></i></span>
                                    </div>
                                  </div>
                                  <div className="module-body" style={{ height: expanded[mod.key] ? 'auto' : '0px', opacity: expanded[mod.key] ? 1 : 0 }}>
                                    <div className="perm-grid">
                                      {mod.permissions.map((p) => {
                                        const checked = !!selected[mod.key]?.[p.key]
                                        return (
                                          <label className="checkbox-pill" key={mod.key + '-' + p.key}>
                                            <input type="checkbox" checked={checked} onChange={(e) => togglePerm(mod, p.key, e.target.checked)} /><span>{p.label}</span>
                                          </label>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}