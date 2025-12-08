import React, { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { usePermissions } from '../../lib/auth/usePermissions'
import { useAuthStore } from '../../store/auth/authStore'
import faviconImg from '../../../assets/images/Favicon.png'
import logoImg from '../../../assets/images/logo.png'
import avatarDefault from '../../../assets/images/users/avatar-1.jpg'

// Menu item configuration with required permissions
const menuItems = [
  {
    to: '/',
    icon: 'ri-dashboard-2-line',
    label: 'Dashboard',
    permission: 'view dashboard',
    exact: true,
  },
  {
    to: '/partners',
    icon: 'las la-handshake',
    label: 'Partners',
    permission: 'view partners',
  },
  {
    to: '/under-construction/demo-requests',
    icon: 'las la-calendar-check',
    label: 'Demo Requests',
    permission: 'view demo request',
  },
  {
    to: '/under-construction/leads',
    icon: 'las la-chart-pie',
    label: 'Leads',
    permission: 'view leads',
  },
  {
    to: '/under-construction/contacts',
    icon: 'las la-clipboard-list',
    label: 'Contacts',
    permission: 'view contacts',
  },
  {
    to: '/clients',
    icon: 'las la-user-friends',
    label: 'Clients',
    permission: 'view clients',
  },
  {
    to: '/under-construction/commissions',
    icon: 'bx bx-dollar',
    label: 'Commisions',
    permission: 'view commission',
  },
  {
    to: '/under-construction/payments',
    icon: 'bx bx-credit-card',
    label: 'Payments',
    permission: 'view payments',
  },
  {
    to: '/under-construction/invoices',
    icon: 'bx bx-file',
    label: 'Invoices',
    permission: 'view invoices',
  },
  {
    to: '/under-construction/subscriptions',
    icon: 'bx bx-sync',
    label: 'Subscriptions',
    permission: 'view subscriptions',
  },
  {
    to: '/under-construction/appointments',
    icon: 'ri-calendar-2-line',
    label: 'Appointments',
    permission: 'view appointments',
  },
  {
    to: '/under-construction/training-courses',
    icon: 'ri-live-fill',
    label: 'Training & Courses',
    permission: 'view training & courses',
  },
  {
    to: '/under-construction/support-tickets',
    icon: 'las la-life-ring',
    label: 'Support Tickets',
    permission: 'view support tickets',
  },
  {
    to: '/under-construction/resources',
    icon: 'ri-folder-fill',
    label: 'Resources',
    permission: 'view resources',
  },
  {
    to: '/employees',
    icon: 'ri-user-2-fill',
    label: 'Employees',
    permission: 'view employees',
  },
  {
    to: '/users',
    icon: 'ri-user-3-fill',
    label: 'Users',
    permission: 'view users',
  },
  {
    to: '/roles-permissions',
    icon: 'ri-shield-user-fill',
    label: 'Roles & Permissions',
    permission: 'view roles & permissions',
  },
  {
    to: '/under-construction/settings',
    icon: 'ri-file-settings-fill',
    label: 'Settings',
    permission: 'view settings',
  },
]

export default function Sidebar() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 992 : false)
  const [open, setOpen] = useState(false)
  const { hasPermission } = usePermissions()

  // Get current user and check if is_host
  const currentUser = useAuthStore((state) => state.user)
  const isHost = currentUser?.is_host === 1

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

  // Filter menu items based on permissions AND special rules
  const visibleMenuItems = useMemo(() => {
    const filtered = menuItems.filter((item) => {
      // Safety check: ensure hasPermission is a function
      if (typeof hasPermission !== 'function') {
        console.warn('⚠️ hasPermission is not a function, showing all menus')
        return true
      }

      // Check if user has the required permission
      const hasRequiredPermission = hasPermission(item.permission)

      if (!hasRequiredPermission) {
        // User doesn't have permission - hide this menu
        return false
      }

      // Special rule: Partners menu only visible if user is host (is_host === 1)
      if (item.label === 'Partners' && !isHost) {
        console.log(`🔒 Hiding Partners menu: user is not host (is_host: ${currentUser?.is_host})`)
        return false
      }

      // All checks passed - show this menu
      return true
    })

    // Debug log (remove after testing)
    console.log('📋 Sidebar Menu Filter:', {
      userType: currentUser?.user_type,
      isHost: isHost,
      totalMenus: menuItems.length,
      visibleMenus: filtered.length,
      hiddenMenus: menuItems.filter(item => !filtered.includes(item)).map(m => m.label)
    })

    return filtered
  }, [hasPermission, isHost, currentUser])

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
          <a
            className="dropdown-item"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              import('../../lib/auth').then(({ logout, clearAuth }) => {
                logout().catch(() => { }).finally(() => {
                  clearAuth();
                  window.location.href = '/login';
                });
              });
            }}
          >
            <i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Logout</span>
          </a>
        </div>
      </div>

      <div id="scrollbar" data-simplebar className="h-100">
        <div className="container-fluid">
          <div id="two-column-menu"></div>
          <ul className="navbar-nav partner-sidebar" id="navbar-nav">
            {visibleMenuItems.map((item) => (
              <li className="nav-item" key={item.to}>
                <NavLink
                  end={item.exact}
                  className={({ isActive }) => isActive ? 'nav-link menu-link active' : 'nav-link menu-link'}
                  to={item.to}
                >
                  <i className={item.icon}></i> <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="sidebar-background"></div>
    </div>
  )
}