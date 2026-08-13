import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { usePermissions } from "../../lib/auth/usePermissions";
import { useAuthStore } from "../../store/auth/authStore";
import { useConfigStore } from "../../store/config";
import faviconImg from "../../../assets/images/Favicon.png";
import avatarDefault from "../../../assets/images/users/avatar-1.jpg";
import { ENTITY_TYPE_PARTNER } from "../../config/appConfig";

// Menu item configuration with required permissions
const menuItems = [
  {
    to: "/",
    icon: "ri-dashboard-2-line",
    label: "Dashboard",
    permission: "",
    exact: true,
  },
  {
    to: "/partners",
    icon: "las la-handshake",
    label: "Partners",
    permission: "view partners",
  },
  // ... (Keeping other items, replacing Tiers with Submenu)
  // {
  //   to: '/under-construction/demo-requests',
  //   icon: 'las la-calendar-check',
  //   label: 'Demo Requests',
  //   permission: 'view demo request',
  // },
  {
    to: "/leads",
    icon: "las la-chart-pie",
    label: "Leads",
    permission: "view leads",
  },
  {
    to: "/clients",
    icon: "las la-user-friends",
    label: "Clients",
    permission: "view clients",
  },
  {
    label: "Intake & Review",
    icon: "ri-file-list-3-line",
    id: "intake-review",
    subItems: [
      {
        to: '/intake-review/pre-qualification',
        label: 'Pre-Qualification',
        permission: 'view pre qualification',
      },
      {
        to: '/intake-review/funding-application',
        label: 'Funding Application',
        permission: 'view funding application',
      },
      {
        to: '/intake-review/funding-request',
        label: 'Funding Request',
        permission: 'view funding request',
      },
      {
        to: '/intake-review/change-requests',
        label: 'Change Requests',
        permission: 'view change requests',
      },
      {
        to: '/intake-review/credit-profile-requests',
        label: 'Request Credit Profile',
        permission: '',
      }
    ]
  },

  {
    to: "/capital-access",
    icon: "ri-funds-line",
    label: "Capital Access",
    permission: "view credit accounts",
    isHostOnly: true,
  },
  {
    to: "/lenders",
    icon: "ri-money-dollar-box-line",
    label: "Lenders",
    isHostOnly: true,
    permission: "view lenders",
  },
  {
    to: "/funding",
    icon: "ri-money-dollar-circle-line",
    label: "Funding Sequence",
    isHostOnly: true,
    permission: "view funding",
  },
  {
    label: "Credit Builder",
    icon: "ri-building-2-line",
    id: "credit-builder",
    subItems: [
      {
        to: "/tiers",
        label: "Manage Tier",
        permission: "view tier",
        isHostOnly: true,
      },
      {
        to: "/verification-center",
        label: "Verification Center",
        permission: "view verification request", // Reuse permission or add new one
        isHostOnly: true,
      },
      {
        to: "/credit-accounts",
        label: "Credit Accounts",
        permission: "view credit accounts", // Temporary permission or add new one
        isHostOnly: true,
      },
    ],
  },
  {
    to: "/commissions",
    icon: "bx bx-dollar",
    label: "Commisions",
    permission: "view commission",
  },

  {
    to: "/invoices",
    icon: "ri-file-text-line",
    label: "Invoices",
    permission: "view invoices",
  },
  {
    to: "/payments",
    icon: "ri-bank-card-2-line",
    label: "Payments",
    permission: "view payments",
  },

  {
    to: "/subscriptions",
    icon: "bx bx-sync",
    label: "Subscriptions",
    permission: "view subscriptions",
  },
  {
    to: "/billing",
    icon: "ri-bill-line",
    label: "Upcoming Billings",
    permission: "view subscriptions",
  },

  {
    to: "/appointments",
    icon: "ri-calendar-2-line",
    label: "Appointments",
    permission: "view appointments",
  },
  // {
  //   to: '/under-construction/training-courses',
  //   icon: 'ri-live-fill',
  //   label: 'Training & Courses',
  //   permission: 'view training & courses',
  // },
  // {
  //   to: '/under-construction/support-tickets',
  //   icon: 'las la-life-ring',
  //   label: 'Support Tickets',
  //   permission: 'view support tickets',
  // },
  {
    to: '/resources',
    icon: 'ri-folder-fill',
    label: 'Resources',
    permission: 'view resources',
  },
  {
    to: "/employees",
    icon: "ri-user-2-fill",
    label: "Employees",
    permission: "view employees",
  },
  {
    to: "/users",
    icon: "ri-user-3-fill",
    label: "Users",
    permission: "view users",
  },
  {
    to: "/plan-and-fee",
    icon: "ri-bank-card-line",
    label: "Plan & Fee",
    isHostOnly: true,
    isPartnerOnly: true,
  },
  {
    to: "/roles-permissions",
    icon: "ri-shield-user-fill",
    label: "Roles & Permissions",
    permission: "view roles & permissions",
    isHostOnly: false,
  },
  {
    label: "CMS",
    icon: "ri-layout-grid-line",
    id: "cms-menu",
    isHostOnly: true,
    subItems: [
      {
        to: "/cms/site-settings",
        label: "Site Settings",
        permission: "view site settings",
      },
      {
        to: "/cms/blogs",
        label: "Blogs",
        permission: "view blogs",
      },
      {
        to: "/cms/seo-settings",
        label: "SEO Settings",
        permission: "view seo settings",
      },
    ],
  },
  {
    to: "/admin/settings",
    icon: "ri-file-settings-fill",
    label: "Settings",
    permission: ["update payment settings", "update partner agreement settings", "update borrower agreement settings"],
    isHostOnly: false,
  },
];

export default function Sidebar() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 992 : false,
  );
  const [open, setOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null); // State for expanded submenus
  const { hasPermission, isRestricted, hasAnyPermission } = usePermissions();
  const location = useLocation();
  const { branding: settings } = useConfigStore();

  const dynamicLogoWide = settings?.primary_logo_full_url;
  const dynamicLogo = settings?.secondary_logo_full_url;
  const dynamicFavicon = settings?.favicon_full_url;

  // Auto-expand menu on route change
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.subItems) {
        const isChildActive = item.subItems.some((sub) => {
          // Direct match
          if (
            location.pathname === sub.to ||
            (location.pathname.startsWith(sub.to) && sub.to !== "/")
          )
            return true;

          // Special case for Funding Request/Application details
          if (
            sub.to === "/intake-review/funding-application" &&
            location.pathname.includes("/intake-review/funding-applications/")
          )
            return true;

          if (
            sub.to === "/intake-review/funding-request" &&
            location.pathname.includes("/intake-review/funding-requests/")
          )
            return true;

          return false;
        });
        if (isChildActive) {
          setExpandedMenu(item.id);
        }
      }
    });
  }, [location.pathname]);

  // Get current user and check if is_host
  const currentUser = useAuthStore((state) => state.user);
  const userSubscription = useAuthStore((state) => state.userSubscription);
  const isHost = currentUser?.is_host == 1;

  const isFreeTrial = !!userSubscription?.is_free_trail;
  const trialEndDate = userSubscription?.free_trail_end_date;

  const formatTrialDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (!mobile) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const menuClass = useMemo(() => "app-menu navbar-menu", []);

  const toggleOpen = () => {
    const body = typeof document !== "undefined" ? document.body : null;
    const cls = "vertical-sidebar-enable";
    const next = !open;
    setOpen(next);
    if (body) {
      if (next) body.classList.add(cls);
      else body.classList.remove(cls);
    }
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 992) {
      document.body.classList.remove("vertical-sidebar-enable");
      setOpen(false);
    }
  };

  const toggleSubMenu = (menuId, e) => {
    e.preventDefault();
    // Close the menu if it's already open, otherwise open it and close others
    setExpandedMenu(expandedMenu === menuId ? null : menuId);
  };

  // Filter menu items based on permissions AND special rules
  const visibleMenuItems = useMemo(() => {
    const checkVisibility = (item) => {
      // 1. Basic permission check
      if (Array.isArray(item.permission)) {
        if (!hasAnyPermission(item.permission)) {
          return false;
        }
      } else if (item.permission && !hasPermission(item.permission)) {
        return false;
      }

      // 4. Special rule for Partners menu
      if (item.label === "Partners" && !isHost) {
        return false;
      }

      // 5. Generic rule: Check isHostOnly flag
      if (item.isHostOnly && !isHost) {
        return false;
      }

      // 6. Generic rule: Check isPartnerOnly flag
      if (item.isPartnerOnly && currentUser?.entity_type !== ENTITY_TYPE_PARTNER) {
        return false;
      }

      // 7. Generic rule: Check isNonHostPartnerOnly flag
      if (item.isNonHostPartnerOnly && (isHost || currentUser?.entity_type !== ENTITY_TYPE_PARTNER)) {
        return false;
      }

      return true;
    };

    return menuItems
      .map((item) => {
        // If it has subItems, filter them first
        if (item.subItems) {
          // First check if the parent itself is visible
          if (!checkVisibility(item)) {
            return null;
          }

          const filteredSubItems = item.subItems.filter((sub) =>
            checkVisibility(sub),
          );

          // If no subItems are visible, the parent itself shouldn't be visible
          if (filteredSubItems.length === 0) {
            return null;
          }

          return { ...item, subItems: filteredSubItems };
        }

        // Check top-level item visibility (non-dropdown items)
        return checkVisibility(item) ? item : null;
      })
      .filter((item) => item !== null);
  }, [menuItems, hasPermission, isHost, currentUser]);

  return (
    <div className={menuClass}>
      <div className="navbar-brand-box py-2">
        <Link
          to="/"
          className="logo logo-dark"
          onClick={closeSidebarOnMobile}
        >
          <span className="logo-sm">
            <img src={dynamicFavicon} alt="" className="sidebar-logo-sm" />
          </span>
          <span className="logo-lg">
            <img src={dynamicLogo} alt="" className="sidebar-logo-lg" />
          </span>
        </Link>
        <Link
          to="/"
          className="logo logo-light"
          onClick={closeSidebarOnMobile}
        >
          <span className="logo-sm">
            <img src={dynamicFavicon} alt="" className="sidebar-logo-sm" />
          </span>
          <span className="logo-lg">
            <img src={dynamicLogoWide} alt="" className="sidebar-logo-lg" />
          </span>
        </Link>
        <button
          type="button"
          className="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover"
          onClick={toggleOpen}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <i className="ri-menu-line"></i>
        </button>
      </div>

      <div className="dropdown sidebar-user m-1 rounded">
        <button
          type="button"
          className="btn material-shadow-none"
          id="page-header-user-dropdown"
          data-bs-toggle="dropdown"
          aria-haspopup="true"
          aria-expanded="false"
        >
          <span className="d-flex align-items-center gap-2">
            <img
              className="rounded header-profile-user"
              src={avatarDefault}
              alt="Header Avatar"
            />
            <span className="text-start">
              <span className="d-block fw-medium sidebar-user-name-text">
                Anna Adame
              </span>
              <span className="d-block fs-14 sidebar-user-name-sub-text">
                <i className="ri ri-circle-fill fs-10 text-success align-baseline"></i>{" "}
                <span className="align-middle">Online</span>
              </span>
            </span>
          </span>
        </button>
        <div className="dropdown-menu dropdown-menu-end">
          <h6 className="dropdown-header">Welcome Anna!</h6>
          <a className="dropdown-item" href="#">
            <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i>{" "}
            <span className="align-middle">Profile</span>
          </a>
          <a className="dropdown-item" href="#">
            <i className="mdi mdi-message-text-outline text-muted fs-16 align-middle me-1"></i>{" "}
            <span className="align-middle">Messages</span>
          </a>
          <a className="dropdown-item" href="#">
            <i className="mdi mdi-lifebuoy text-muted fs-16 align-middle me-1"></i>{" "}
            <span className="align-middle">Help</span>
          </a>
          <div className="dropdown-divider"></div>
          <a className="dropdown-item" href="#">
            <i className="mdi mdi-wallet text-muted fs-16 align-middle me-1"></i>{" "}
            <span className="align-middle">
              Balance : <b>$5971.67</b>
            </span>
          </a>
          <a className="dropdown-item" href="#">
            <span className="badge bg-success-subtle text-success mt-1 float-end">
              New
            </span>
            <i className="mdi mdi-cog-outline text-muted fs-16 align-middle me-1"></i>{" "}
            <span className="align-middle">Settings</span>
          </a>
          <Link className="dropdown-item" to="/profile" onClick={closeSidebarOnMobile}>
            <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i>{" "}
            <span className="align-middle">Profile</span>
          </Link>
          <a
            className="dropdown-item"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              closeSidebarOnMobile();
              import("../../lib/auth").then(({ logout, clearAuth }) => {
                logout()
                  .catch(() => { })
                  .finally(() => {
                    clearAuth();
                    window.location.href = "/login";
                  });
              });
            }}
          >
            <i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i>{" "}
            <span className="align-middle">Logout</span>
          </a>
        </div>
      </div>

      <div id="scrollbar" data-simplebar className="h-100">
        <div className="container-fluid">
          <div id="two-column-menu"></div>
          <ul className="navbar-nav partner-sidebar" id="navbar-nav">
            {visibleMenuItems.map((item) => {
              const itemIsRestricted =
                isRestricted &&
                !["Dashboard", "Invoices", "Payments"].includes(item.label);

              if (item.subItems) {
                const isExpanded = expandedMenu === item.id;
                const isChildActive = item.subItems.some((sub) => {
                  // Direct match
                  if (
                    location.pathname === sub.to ||
                    (location.pathname.startsWith(sub.to) && sub.to !== "/")
                  )
                    return true;

                  // Special case for Funding Application and Review details
                  if (
                    sub.to === "/intake-review/funding-application" &&
                    location.pathname.includes("/intake-review/funding-application/")
                  )
                    return true;

                  if (
                    sub.to === "/intake-review/funding-request" &&
                    location.pathname.includes("/intake-review/funding-request/")
                  )
                    return true;

                  return false;
                });
                return (
                  <li className="nav-item" key={item.id}>
                    <button
                      className={`nav-link menu-link ${!itemIsRestricted && isExpanded ? "" : "collapsed"} ${!itemIsRestricted && isChildActive ? "active" : ""} ${itemIsRestricted ? "locked-item-link" : ""}`}
                      onClick={(e) =>
                        !itemIsRestricted && toggleSubMenu(item.id, e)
                      }
                      aria-expanded={!itemIsRestricted && isExpanded}
                      aria-controls={
                        itemIsRestricted ? undefined : `sidebar-${item.id}`
                      }
                      type="button"
                      style={{
                        border: "none",
                        background: "none",
                        width: "100%",
                        textAlign: "left",
                        cursor: itemIsRestricted ? "default" : "pointer",
                      }}
                    >
                      <i className={item.icon}></i> <span>{item.label}</span>
                      {itemIsRestricted && (
                        <i className="ri-lock-fill float-end fs-14 opacity-50"></i>
                      )}
                    </button>
                    {!itemIsRestricted && (
                      <div
                        className={`menu-dropdown sidebar-submenu-wrapper ${isExpanded ? "open" : ""}`}
                        id={`sidebar-${item.id}`}
                      >
                        <div className="sidebar-submenu-inner">
                          <ul className="flex-column py-0">
                            {item.subItems.map((subItem) => (
                              <li className="nav-item" key={subItem.to}>
                                <NavLink
                                  onClick={() => {
                                    closeSidebarOnMobile();
                                  }}
                                  to={subItem.to}
                                  className={({ isActive }) => {
                                    // Default active check
                                    let isPathActive = isActive;

                                    // Special check for active state on Child Routes
                                    if (
                                      subItem.to ===
                                      "/intake-review/pre-qualification" &&
                                      location.pathname.startsWith(
                                        "/intake-review/pre-qualification/",
                                      )
                                    ) {
                                      isPathActive = true;
                                    }
                                    if (
                                      subItem.to ===
                                      "/intake-review/funding-application" &&
                                      location.pathname.startsWith(
                                        "/intake-review/funding-application/",
                                      )
                                    ) {
                                      isPathActive = true;
                                    }
                                    if (
                                      subItem.to ===
                                      "/intake-review/funding-request" &&
                                      location.pathname.startsWith(
                                        "/intake-review/funding-request/",
                                      )
                                    ) {
                                      isPathActive = true;
                                    }


                                    return isPathActive
                                      ? "nav-link active"
                                      : "nav-link";
                                  }}
                                >
                                  <i className="ri-subtract-line align-bottom"></i>
                                  {subItem.icon && (
                                    <i
                                      className={`${subItem.icon} align-bottom me-1`}
                                    ></i>
                                  )}
                                  <span>{subItem.label}</span>
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </li>
                );
              }

              return (
                <li className="nav-item" key={item.to}>
                  <NavLink
                    end={item.exact}
                    className={({ isActive }) => {
                      const isActiveState = !itemIsRestricted && isActive;
                      return `${isActiveState ? "nav-link menu-link active" : "nav-link menu-link"} ${itemIsRestricted ? "locked-item-link" : ""}`;
                    }}
                    to={itemIsRestricted ? "#" : item.to}
                    onClick={(e) => {
                      if (itemIsRestricted) {
                        e.preventDefault();
                        return;
                      }
                      setExpandedMenu(null);
                      closeSidebarOnMobile();
                    }}
                    style={
                      itemIsRestricted
                        ? { pointerEvents: "none", cursor: "default" }
                        : {}
                    }
                  >
                    <i className={item.icon}></i> <span>{item.label}</span>
                    {itemIsRestricted && (
                      <i className="ri-lock-fill float-end fs-14 opacity-50"></i>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {isFreeTrial && (
        <div className="sidebar-trial-panel">
          <div className="trial-panel-inner">
            <div className="trial-icon-wrap">
              <i className="ri-vip-crown-2-fill"></i>
            </div>
            <div className="trial-text-wrap">
              <span className="trial-label">Free Trial</span>
              {trialEndDate && (
                <span className="trial-expires">Expires {formatTrialDate(trialEndDate)}</span>
              )}
            </div>
            <span className="trial-badge">FREE</span>
          </div>
        </div>
      )}

      <div className="sidebar-background"></div>
    </div>
  );
}
