import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import faviconImg from '../../../assets/images/Favicon.png'
import logoImg from '../../../assets/images/logo.png'
import avatarDefault from '../../../assets/images/users/avatar-1.jpg'

export default function Sidebar() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 992 : false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 992
      setIsMobile(mobile)
      if (!mobile) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const menuClass = useMemo(() => 'app-menu navbar-menu', [])

  const toggleOpen = () => {
    const body = typeof document !== 'undefined' ? document.body : null
    const cls = 'vertical-sidebar-enable'
    const next = !open
    setOpen(next)
    if (body) {
      if (next) body.classList.add(cls)
      else body.classList.remove(cls)
    }
  }

  return (
    <div className={menuClass}>
      <style>{`
        @media (max-width: 991.98px){
          .navbar-brand-box{position:sticky;top:0;z-index:1;background:var(--bs-body-bg);display:block!important}
        }
      `}</style>
      <div className="navbar-brand-box">
        <a href="/" className="logo logo-dark">
          <span className="logo-sm">
            <img src={faviconImg} alt="" height="22" />
          </span>
          <span className="logo-lg">
            <img src={logoImg} alt="" height="17" />
          </span>
        </a>
        <a href="/" className="logo logo-light">
          <span className="logo-sm">
            <img src={faviconImg} alt="" height="40" />
          </span>
          <span className="logo-lg">
            <img src={logoImg} alt="" height="30" />
          </span>
        </a>
        <button type="button" className="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover" onClick={toggleOpen} aria-label="Toggle menu" aria-expanded={open}>
          <i className="ri-menu-line"></i>
        </button>
      </div>

      <div className="dropdown sidebar-user m-1 rounded">
        <button type="button" className="btn material-shadow-none" id="page-header-user-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          <span className="d-flex align-items-center gap-2">
            <img className="rounded header-profile-user" src={avatarDefault} alt="Header Avatar" />
            <span className="text-start">
              <span className="d-block fw-medium sidebar-user-name-text">Anna Adame</span>
              <span className="d-block fs-14 sidebar-user-name-sub-text"><i className="ri ri-circle-fill fs-10 text-success align-baseline"></i> <span className="align-middle">Online</span></span>
            </span>
          </span>
        </button>
        <div className="dropdown-menu dropdown-menu-end">
          <h6 className="dropdown-header">Welcome Anna!</h6>
          <a className="dropdown-item" href="#"><i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Profile</span></a>
          <a className="dropdown-item" href="#"><i className="mdi mdi-message-text-outline text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Messages</span></a>
          <a className="dropdown-item" href="#"><i className="mdi mdi-lifebuoy text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Help</span></a>
          <div className="dropdown-divider"></div>
          <a className="dropdown-item" href="#"><i className="mdi mdi-wallet text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Balance : <b>$5971.67</b></span></a>
          <a className="dropdown-item" href="#"><span className="badge bg-success-subtle text-success mt-1 float-end">New</span><i className="mdi mdi-cog-outline text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Settings</span></a>
          <a className="dropdown-item" href="#"><i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Logout</span></a>
        </div>
      </div>

      <div id="scrollbar" data-simplebar className="h-100">
        <div className="container-fluid">
          <div id="two-column-menu"></div>
          <ul className="navbar-nav partner-sidebar" id="navbar-nav">
            <li className="nav-item">
              <NavLink end className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/">
                <i className="ri-dashboard-2-line"></i> <span>Dashboard</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/partners">
                <i className="las la-handshake"></i> <span>Partners</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/demo-requests">
                <i className="las la-calendar-check"></i> <span>Demo Requests</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/leads">
                <i className="las la-chart-pie"></i> <span>Leads</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/contacts">
                <i className="las la-clipboard-list"></i> <span>Contacts</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/clients">
                <i className="las la-user-friends"></i> <span>Clients</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/commissions">
                <i className="bx bx-dollar"></i> <span>Commisions</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/payments">
                <i className="bx bx-credit-card"></i> <span>Payments</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/invoices">
                <i className="bx bx-file"></i> <span>Invoices</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/subscriptions">
                <i className="bx bx-sync"></i> <span>Subscriptions</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/appointments">
                <i className="ri-calendar-2-line"></i> <span>Appointments</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/training-courses">
                <i className="ri-live-fill"></i> <span>Training &amp; Courses</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/support-tickets">
                <i className="las la-life-ring"></i> <span>Support Tickets</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/resources">
                <i className="ri-folder-fill"></i> <span>Resources</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/employees">
                <i className="ri-user-2-fill"></i> <span>Employees</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/users">
                <i className="ri-user-3-fill"></i> <span>Users</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/roles-permissions">
                <i className="ri-shield-user-fill"></i> <span>Roles &amp; Permissions</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'} to="/under-construction/settings">
                <i className="ri-file-settings-fill"></i> <span>Settings</span>
              </NavLink>
            </li>
          </ul>
        </div>
      </div>

      <div className="sidebar-background"></div>
    </div>
  )
}