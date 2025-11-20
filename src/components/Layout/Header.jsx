import React, { useEffect, useState } from 'react'
import { clearAuth, getUser } from '../../lib/auth'
import { logout } from '../../lib/auth'
import avatarDefault from '../../../assets/images/users/avatar-1.jpg'
import { useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof document !== 'undefined') {
      return (document.documentElement.getAttribute('data-sidebar-size') || 'lg') === 'sm'
    }
    return false
  })

  useEffect(() => {
    setUser(getUser())
  }, [])

  const handleLogout = async (e) => {
    e?.preventDefault?.()
    try {
      // Call API to invalidate server session/token
      await logout()
    } catch (err) {
      // Even if API fails, proceed to clear local auth
      console.error('Logout request failed', err)
    } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  const avatarSrc = user?.image || avatarDefault
  const displayName = user?.name 
  const displayRole = user?.role 

  const toggleSidebar = () => {
    const w = window.innerWidth
    if (w < 768) {
      document.body.classList.toggle('vertical-sidebar-enable')
      return
    }
    document.body.classList.remove('vertical-sidebar-enable')
    const docEl = document.documentElement
    const current = docEl.getAttribute('data-sidebar-size') || 'lg'
    const next = current === 'lg' ? 'sm' : 'lg'
    docEl.setAttribute('data-sidebar-size', next)
    setIsSidebarCollapsed(next === 'sm')
    try {
      sessionStorage.setItem('data-sidebar-size', next)
    } catch (e) {}
  }

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        document.body.classList.remove('vertical-sidebar-enable')
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return (
    <header id="page-topbar">
      <style>{`
        #page-topbar .app-search .form-control{background-color:var(--vz-topbar-search-bg);color:var(--vz-topbar-search-color)}
        #page-topbar .app-search .form-control:focus{background-color:var(--vz-topbar-search-bg);box-shadow:none}
        #page-topbar .btn-topbar{display:inline-flex;align-items:center;justify-content:center;padding:0}
        #page-topbar .btn-topbar:hover,#page-topbar .btn-topbar:focus{background-color:var(--vz-header-item-bg)}
      `}</style>
      <div className="layout-width">
        <div className="navbar-header">
          <div className="d-flex">
            <div className="navbar-brand-box horizontal-logo">
              <a href="/" className="logo logo-dark">
                <span className="logo-sm">
                  <img src="/assets/images/Favicon.png" alt="" height="22" />
                </span>
                <span className="logo-lg">
                  <img src="/assets/images/logo.png" alt="" height="17" />
                </span>
              </a>

              <a href="/" className="logo logo-light">
                <span className="logo-sm">
                  <img src="/assets/images/Favicon.png" alt="" height="22" />
                </span>
                <span className="logo-lg">
                  <img src="/assets/images/logo.png" alt="" height="17" />
                </span>
              </a>
            </div>

            <button type="button" className="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger material-shadow-none" id="topnav-hamburger-icon" onClick={toggleSidebar}>
              {isSidebarCollapsed ? (
                <i className="bx bx-chevron-right fs-20"></i>
              ) : (
                <span className="hamburger-icon">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              )}
            </button>

            <form className="app-search d-none d-md-block">
              <div className="position-relative">
                <input type="text" className="form-control" placeholder="Search..." autoComplete="off" id="search-options" defaultValue="" />
                <span className="mdi mdi-magnify search-widget-icon"></span>
                <span className="mdi mdi-close-circle search-widget-icon search-widget-icon-close d-none" id="search-close-options"></span>
              </div>
              <div className="dropdown-menu dropdown-menu-lg" id="search-dropdown">
                <div data-simplebar style={{ maxHeight: 320 }}>
                  <div className="dropdown-header">
                    <h6 className="text-overflow text-muted mb-0 text-uppercase">Recent Searches</h6>
                  </div>
                  <div className="dropdown-item bg-transparent text-wrap">
                    <a href="#" className="btn btn-soft-secondary btn-sm rounded-pill">how to setup <i className="mdi mdi-magnify ms-1"></i></a>
                    <a href="#" className="btn btn-soft-secondary btn-sm rounded-pill">buttons <i className="mdi mdi-magnify ms-1"></i></a>
                  </div>
                </div>
                <div className="text-center pt-3 pb-1">
                  <a href="#" className="btn btn-primary btn-sm">View All Results <i className="ri-arrow-right-line ms-1"></i></a>
                </div>
              </div>
            </form>
          </div>

          <div className="d-flex align-items-center">
            <div className="dropdown d-md-none topbar-head-dropdown header-item">
              <button type="button" className="btn btn-icon btn-topbar material-shadow-none btn-ghost-secondary rounded-circle" id="page-header-search-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <i className="bx bx-search fs-22"></i>
              </button>
              <div className="dropdown-menu dropdown-menu-lg dropdown-menu-end p-0" aria-labelledby="page-header-search-dropdown">
                <form className="p-3">
                  <div className="form-group m-0">
                    <div className="input-group">
                      <input type="text" className="form-control" placeholder="Search ..." aria-label="Recipient's username" />
                      <button className="btn btn-primary" type="submit"><i className="mdi mdi-magnify"></i></button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <div className="ms-1 header-item d-none d-sm-flex">
              <button type="button" className="btn btn-icon btn-topbar material-shadow-none btn-ghost-secondary rounded-circle" data-toggle="fullscreen">
                <i className='bx bx-fullscreen fs-22'></i>
              </button>
            </div>

            <div className="dropdown topbar-head-dropdown ms-1 header-item" id="notificationDropdown">
              <button type="button" className="btn btn-icon btn-topbar material-shadow-none btn-ghost-secondary rounded-circle" id="page-header-notifications-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-haspopup="true" aria-expanded="false">
                <i className='bx bx-bell fs-22'></i>
                <span className="position-absolute topbar-badge fs-10 translate-middle badge rounded-pill bg-danger">3<span className="visually-hidden">unread messages</span></span>
              </button>
              <div className="dropdown-menu dropdown-menu-lg dropdown-menu-end p-0" aria-labelledby="page-header-notifications-dropdown">
                <div className="dropdown-head bg-primary bg-pattern rounded-top">
                  <div className="p-3">
                    <div className="row align-items-center">
                      <div className="col">
                        <h6 className="m-0 fs-16 fw-semibold text-white"> Notifications </h6>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="dropdown ms-sm-3 header-item topbar-user">
              <button type="button" className="btn material-shadow-none" id="page-header-user-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <span className="d-flex align-items-center">
                  <img className="rounded-circle header-profile-user" src={avatarSrc} alt="Header Avatar" />
                  <span className="text-start ms-xl-2">
                    <span className="d-none d-xl-inline-block ms-1 fw-medium user-name-text">{displayName}</span>
                    <span className="d-none d-xl-block ms-1 fs-12 user-name-sub-text">{displayRole}</span>
                  </span>
                </span>
              </button>
              <div className="dropdown-menu dropdown-menu-end">
                <a className="dropdown-item" href="#"><i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Profile</span></a>
                <a className="dropdown-item" href="#"><i className="mdi mdi-lifebuoy text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Help</span></a>
                <div className="dropdown-divider"></div>
                <a className="dropdown-item" href="#"><i className="mdi mdi-cog-outline text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Settings</span></a>
                <a className="dropdown-item" href="#" onClick={handleLogout}><i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Logout</span></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}