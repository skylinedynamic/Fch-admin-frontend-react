import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { clearAuth } from '../../lib/auth'
import { useAuthStore } from '../../store/auth/authStore'
import { useConfigStore } from '../../store/config'
import { logout } from '../../lib/auth'
import avatarDefault from '../../../assets/images/users/avatar-1.jpg'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { usePermissions } from '../../lib/auth/usePermissions'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { hasPermission } = usePermissions()
  const { branding: settings } = useConfigStore()
  const BASE_URL = import.meta.env.VITE_BASE_API_URL || ''
  const user = useAuthStore((state) => state.user)

  // ─── Avatar dropdown state ───────────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef(null)           // the trigger button
  const menuRef = useRef(null)          // the portal menu

  const getLogoUrl = (path, fallback) => {
    if (!path || path === 'null') return fallback
    if (typeof path !== 'string') return fallback
    if (path.startsWith('http')) return path
    const clean = path.replace(/^\//, '')
    return `${BASE_URL}/storage/${clean}`
  }

  const dynamicLogo = getLogoUrl(settings?.secondary_logo || settings?.primary_logo, `${BASE_URL}/storage/site-settings/black-logo.png`)
  const dynamicLogoLight = getLogoUrl(settings?.primary_logo, `${BASE_URL}/storage/site-settings/logo-white.png`)
  const dynamicFavicon = getLogoUrl(settings?.favicon, `${BASE_URL}/storage/site-settings/Favicon.png`)
  const siteName = settings?.site_name || ''

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof document !== 'undefined') {
      return (document.documentElement.getAttribute('data-sidebar-size') || 'lg') === 'sm'
    }
    return false
  })

  const handleLogout = async (e) => {
    e?.preventDefault?.()
    try {
      await logout()
    } catch (err) {
      console.error('Logout request failed', err)
    } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  const avatarSrc = user?.image || avatarDefault
  const displayName = user?.name
  const displayRole = user?.role

  // ─── Open dropdown: calculate fixed position from button rect ────────────
  const openDropdown = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 6,                          // 6px below the button
        right: window.innerWidth - rect.right,         // flush with the button's right edge
      })
    }
    setDropdownOpen(true)
  }, [])

  const closeDropdown = useCallback(() => setDropdownOpen(false), [])

  const toggleDropdown = useCallback(() => {
    if (dropdownOpen) {
      closeDropdown()
    } else {
      openDropdown()
    }
  }, [dropdownOpen, openDropdown, closeDropdown])

  // ─── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    if (!dropdownOpen) return
    const onMouseDown = (e) => {
      const clickedBtn = btnRef.current && btnRef.current.contains(e.target)
      const clickedMenu = menuRef.current && menuRef.current.contains(e.target)
      if (!clickedBtn && !clickedMenu) closeDropdown()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [dropdownOpen, closeDropdown])

  // ─── Close on route change ────────────────────────────────────────────────
  useEffect(() => { closeDropdown() }, [location.pathname])

  // ─── Recalculate position on scroll / resize (keeps it anchored) ─────────
  useEffect(() => {
    if (!dropdownOpen) return
    const reposition = () => {
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect()
        setDropdownPos({
          top: rect.bottom + 6,
          right: window.innerWidth - rect.right,
        })
      }
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [dropdownOpen])

  // ─── Sidebar toggle ───────────────────────────────────────────────────────
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
    try { sessionStorage.setItem('data-sidebar-size', next) } catch (e) { }
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

  // ─── Portal dropdown menu ─────────────────────────────────────────────────
  const dropdownMenu = dropdownOpen
    ? ReactDOM.createPortal(
      <div
        ref={menuRef}
        className="dropdown-menu show"
        style={{
          position: 'fixed',
          top: dropdownPos.top,
          right: dropdownPos.right,
          left: 'auto',
          zIndex: 99999,
          minWidth: '190px',
          padding: '6px 0',
          borderRadius: '10px',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
          background: '#fff',
          animation: 'headerDropdownIn 0.15s ease',
        }}
      >
        {/* ── Profile ─────────────────────────────────────── */}
        <Link
          className="dropdown-item d-flex align-items-center gap-2 py-2 px-3"
          to="/profile"
          onClick={closeDropdown}
        >
          <i className="mdi mdi-account-circle text-muted fs-16"></i>
          <span>Profile</span>
        </Link>

        {/* ── Contacts (permission-gated) ──────────────────── */}
        {hasPermission('view contacts') && (
          <Link
            className="dropdown-item d-flex align-items-center gap-2 py-2 px-3"
            to="/contacts"
            onClick={closeDropdown}
          >
            <i className="mdi mdi-account-outline text-muted fs-16"></i>
            <span>Contacts</span>
          </Link>
        )}

        {/* ── My Agreement (partner-only) ──────────────────── */}
        {user?.is_agreement_signed &&
          user?.entity_type === 'Partner' &&
          Number(user?.is_host) === 0 && (
            <Link
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3"
              to={`/partners/download-agreement/${user.id}`}
              target="_blank"
              onClick={closeDropdown}
            >
              <i className="mdi mdi-file-document-outline text-muted fs-16"></i>
              <span>My Agreement</span>
            </Link>
          )}

        <div className="dropdown-divider my-1"></div>

        {/* ── Logout ──────────────────────────────────────── */}
        <a
          className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 text-danger"
          href="#"
          onClick={(e) => { e.preventDefault(); closeDropdown(); handleLogout(e) }}
        >
          <i className="mdi mdi-logout fs-16"></i>
          <span>Logout</span>
        </a>
      </div>,
      document.body,
    )
    : null

  return (
    <>
      {/* Keyframe injected once — tiny, no separate file needed */}
      <style>{`
        @keyframes headerDropdownIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      <header id="page-topbar">
        <style>{`
          #page-topbar .app-search .form-control{background-color:var(--vz-topbar-search-bg);color:var(--vz-topbar-search-color)}
          #page-topbar .app-search .form-control:focus{background-color:var(--vz-topbar-search-bg);box-shadow:none}
          #page-topbar .btn-topbar{display:inline-flex;align-items:center;justify-content:center;padding:0}
          #page-topbar .btn-topbar:hover,#page-topbar .btn-topbar:focus{background-color:var(--vz-header-item-bg)}
        `}</style>

        <div className="layout-width">
          <div className="navbar-header">

            {/* ── Left: hamburger + logo ────────────────────── */}
            <div className="d-flex">
              <button
                type="button"
                className="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger material-shadow-none"
                id="topnav-hamburger-icon"
                onClick={toggleSidebar}
              >
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

              <div className="horizontal-logo">
                <a href="/" className="logo">
                  <span className="logo-sm">
                    <img src={dynamicFavicon} alt={siteName} height="22" />
                  </span>
                  <span className="logo-lg">
                    <img src={dynamicLogo} alt={siteName} height="35" />
                  </span>
                </a>
              </div>
            </div>

            {/* ── Right: avatar button ──────────────────────── */}
            <div className="d-flex align-items-center">
              <div className="ms-sm-3 header-item topbar-user">
                <button
                  ref={btnRef}
                  type="button"
                  className="btn material-shadow-none d-flex align-items-center"
                  id="page-header-user-dropdown"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  onClick={toggleDropdown}
                >
                  <img
                    className="rounded-circle header-profile-user"
                    src={avatarSrc}
                    alt="Header Avatar"
                  />
                  <span className="text-start ms-xl-2">
                    <span className="d-none d-xl-inline-block ms-1 fw-medium user-name-text">
                      {displayName}
                    </span>
                    <span className="d-none d-xl-block ms-1 fs-12 user-name-sub-text">
                      {displayRole}
                    </span>
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Portal: renders directly on <body>, bypasses ALL overflow:hidden */}
      {dropdownMenu}
    </>
  )
}