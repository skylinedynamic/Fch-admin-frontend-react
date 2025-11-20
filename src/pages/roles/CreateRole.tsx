import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGroupedPermissions, useCreateRole } from '../../modules/role/queries'
import type { ApiModulePermissions } from '../../modules/role/types'
import PermissionCardsLoader from '../../components/Loader/PermissionCardsLoader'
import ErrorState from '../../components/Loader/ErrorState'
import { toast } from 'react-toastify'

type PermissionItem = { id?: number; key: string; label: string; icon: string }
type ModuleDef = { key: string; name: string; icon: string; desc: string; permissions: PermissionItem[] }

// Api types now imported from role module

const toKey = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const titleCase = (text: string) => text.replace(/(^|\s)\w/g, (m) => m.toUpperCase())
const permIconByVerb: Record<string, string> = {
  view: 'ri-eye-line',
  create: 'ri-add-line',
  update: 'ri-edit-line',
  delete: 'ri-delete-bin-line',
}

const mapApiModuleToDef = (m: ApiModulePermissions): ModuleDef => {
  const key = toKey(m.module)
  const name = titleCase(m.module)
  const icon = '' // Icon not shown per requirement
  const desc = `Manage ${name}`
  const permissions: PermissionItem[] = (m.permissions || []).map((p) => {
    const verb = (p.name.split(' ')[0] || '').toLowerCase()
    return {
      id: p.id,
      key: verb || toKey(p.name),
      label: titleCase(p.name),
      icon: permIconByVerb[verb] || 'ri-checkbox-line',
    }
  })
  return { key, name, icon, desc, permissions }
}

export default function CreateRole() {
  const navigate = useNavigate()
  const [modules, setModules] = useState<ModuleDef[]>([])

  const [roleName, setRoleName] = useState('')
  const [adminAccess, setAdminAccess] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Record<string, Record<string, boolean>>>({})
  const [errors, setErrors] = useState<{ name?: string; permission_ids?: string }>({})

  // Fetch grouped permissions via React Query
  const { data: groupedPerms, isLoading: permsLoading, isError: permsError } = useGroupedPermissions()
  const { mutateAsync: createRole, isPending: creating } = useCreateRole()

  // Map API data to UI modules and open all cards by default
  useEffect(() => {
    if (!groupedPerms || !Array.isArray(groupedPerms)) return
    const mapped = groupedPerms.map(mapApiModuleToDef)
    setModules(mapped)
    setExpanded(Object.fromEntries(mapped.map((m) => [m.key, true])))
    if (adminAccess) {
      const allSelected: Record<string, Record<string, boolean>> = {}
      mapped.forEach((mod) => {
        allSelected[mod.key] = mod.permissions.reduce<Record<string, boolean>>((acc, p) => {
          acc[p.key] = true
          return acc
        }, {})
      })
      setSelected(allSelected)
    }
  }, [groupedPerms])

  const toggleExpand = (key: string) => {
    setExpanded((e) => ({ ...e, [key]: !e[key] }))
  }

  const toggleModuleAll = (mod: ModuleDef, checked: boolean) => {
    setSelected((sel) => {
      const next = {
        ...sel,
        [mod.key]: mod.permissions.reduce<Record<string, boolean>>((acc, p) => {
          acc[p.key] = checked
          return acc
        }, {})
      }
      const allSelected = modules.every((m) => m.permissions.every((p) => next[m.key]?.[p.key]))
      setAdminAccess(allSelected)
      return next
    })
  }

  const togglePerm = (mod: ModuleDef, permKey: string, checked: boolean) => {
    setSelected((sel) => {
      const next = {
        ...sel,
        [mod.key]: { ...(sel[mod.key] || {}), [permKey]: checked }
      }
      const allSelected = modules.every((m) => m.permissions.every((p) => next[m.key]?.[p.key]))
      setAdminAccess(allSelected)
      return next
    })
  }

  const isModuleAllChecked = (mod: ModuleDef) => {
    const s = selected[mod.key] || {}
    return mod.permissions.every((p) => s[p.key])
  }

  const toggleAllPermissions = (checked: boolean) => {
    const allSelected: Record<string, Record<string, boolean>> = {}
    modules.forEach((mod) => {
      allSelected[mod.key] = mod.permissions.reduce<Record<string, boolean>>((acc, p) => {
        acc[p.key] = checked
        return acc
      }, {})
    })
    setSelected(allSelected)
  }

  const handleSave = async () => {
    const name = roleName.trim()
    setErrors({})
    if (!name) return

    const permissionIds: number[] = []
    if (adminAccess) {
      modules.forEach((mod) => {
        mod.permissions.forEach((p) => {
          if (typeof p.id === 'number') permissionIds.push(p.id)
        })
      })
    } else {
      modules.forEach((mod) => {
        mod.permissions.forEach((p) => {
          if (selected[mod.key]?.[p.key] && typeof p.id === 'number') {
            permissionIds.push(p.id)
          }
        })
      })
    }

    try {
      const res = await createRole({ name, permission_ids: permissionIds })
      const successMsg = (res as any)?.message || 'Role created successfully.'
      toast(successMsg,)
      navigate('/roles-permissions')
    } catch (err: any) {
      const data = err?.response?.data
      const serverErrors = data?.errors || {}
      const nextErrors: { name?: string; permission_ids?: string } = {}
      if (serverErrors.name) {
        nextErrors.name = Array.isArray(serverErrors.name) ? serverErrors.name[0] : String(serverErrors.name)
      }
      if (serverErrors.permission_ids) {
        nextErrors.permission_ids = Array.isArray(serverErrors.permission_ids) ? serverErrors.permission_ids[0] : String(serverErrors.permission_ids)
      }
      setErrors(nextErrors)
    }
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
                <button type="button" className="btn btn-primary w-lg" onClick={handleSave} disabled={creating}>
                  {creating ? (
                    <>
                      <span className="spinner-border spinner-border-sm align-middle me-2" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ri-save-3-line align-middle me-1"></i> Save
                    </>
                  )}
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
                    {errors.name && <div className="text-danger mt-1 small">{errors.name}</div>}
                  </div>

                  <div className="mb-3">
                    <label className="form-label" style={{ fontSize: '.90rem' }}>Role Permissions</label>
                    <div className="d-flex align-items-center gap-3">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="adminAccessToggle"
                          checked={adminAccess}
                          onChange={(e) => {
                            const next = e.target.checked
                            setAdminAccess(next)
                            toggleAllPermissions(next)
                          }}
                        />
                        <label className="form-check-label" htmlFor="adminAccessToggle">Administrator Access</label>
                      </div>
                    </div>
                  </div>

                  <div className="row g-4">
                    <div className="col-lg-12">
                      <div className="perm-card">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="section-title">Module Permissions</h6>
                        </div>
                        {errors.permission_ids && <div className="text-danger small mb-2">{errors.permission_ids}</div>}
                        {/* Loading and error states */}
                        {permsLoading && <PermissionCardsLoader />}
                        {permsError && !permsLoading && <ErrorState message="Failed to load permissions. Please try again." />}
                        <div className="row g-3 module-grid" style={{ display: permsLoading ? 'none' : undefined }}>
                          {!permsLoading && modules.map((mod) => {
                            const allChecked = isModuleAllChecked(mod)
                            return (
                              <div className="col-xl-6 col-lg-6" key={mod.key}>
                                <div className={`module-card perm-section module-accent ${expanded[mod.key] ? 'open' : ''}`}>
                                  <div className="module-header" role="button" aria-expanded={expanded[mod.key] ? 'true' : 'false'} onClick={() => toggleExpand(mod.key)}>
                                    <div className="title-wrap">
                                      <div>
                                        <strong>{mod.name}</strong>
                                        <div className="desc">{mod.desc}</div>
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