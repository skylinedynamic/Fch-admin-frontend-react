import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../src/components/Layout/Layout.jsx';
import Dashboard from '../src/pages/dashboard/Dashboard.jsx';
import Employees from '../src/pages/employees/Employees.jsx';
import EmployeeDetails from '../src/pages/employees/EmployeeDetails.jsx';
import SignIn from '../src/pages/singin/SignIn.jsx';
import ForgotPassword from '../src/pages/singin/ForgotPassword.jsx';
import ResetPassword from '../src/pages/singin/ResetPassword.jsx';
import Users from '../src/pages/users/Users.jsx';
import UnderConstruction from '../src/pages/UnderConstruction.jsx';
import RolesPermissions from '../src/pages/roles/RolesPermissions.tsx';
import CreateRole from '../src/pages/roles/CreateRole.tsx';
import EditRole from '../src/pages/roles/EditRole.tsx';
import { ProtectedRoute, GuestRoute, checkSession, PermissionRoute, refreshSubscription, HostRoute } from './lib/auth';
import { useAuthStore } from './store/auth';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Partners from './pages/partners/Partners.jsx';
import PartnerProfile from './pages/partners/PartnerProfile.jsx';
import Clients from './pages/clients/Clients';
import ClientDetails from './pages/clients/ClientDetails';
import TiersList from './pages/tiers/TiersList.jsx';
import TierForm from './pages/tiers/TierForm.jsx';
import CreditAccountsList from './pages/credit-builder/CreditAccountsList.jsx';
import CreditAccountForm from './pages/credit-builder/components/CreditAccountForm.jsx';
import VerificationCenter from './pages/credit-builder/VerificationCenter.jsx';
import BorrowerVerificationRequests from './pages/credit-builder/BorrowerVerificationRequests.jsx';
import Appointments from './pages/appointments/Appointments.jsx';
import Contacts from './pages/contacts/Contacts.jsx';
import ContactDetails from './pages/contacts/ContactDetails.jsx';
import ErrorPage from './pages/Utility/ErrorPage.tsx';
import Leads from './pages/leads/Leads.jsx';
import LeadDetails from './pages/leads/LeadDetails.jsx';
import PreQualificationApplication from './pages/applications/pre-qualification/PreQualificationApplication.tsx';
import FundingApplication from './pages/applications/funding/FundingApplication.tsx';
import PreQualificationDetails from './pages/applications/pre-qualification/PreQualificationDetails.tsx';
import FundingApplicationDetails from './pages/applications/funding/FundingApplicationDetails.tsx';
import Settings from './pages/settings/Settings.tsx';
import ChangeRequests from './pages/applications/change-requests/ChangeRequests.tsx';
import Invoices from './pages/invoices/Invoices.jsx';
import Payments from './pages/payments/Payments.jsx';
import Subscriptions from './pages/subscriptions/Subscriptions.jsx';
import Profile from './pages/auth-profile/Profile';
import CommissionList from './pages/commissions/CommissionList';
import CommissionDetails from './pages/commissions/CommissionDetails';
import DownloadAgreement from './pages/partners/DownloadAgreement.jsx';
import BlogList from './pages/cms/BlogList.tsx';
import BlogEdit from './pages/cms/BlogEdit.tsx';
import BlogCategories from './pages/cms/BlogCategories.tsx';
import BlogTags from './pages/cms/BlogTags.tsx';
import SeoSettings from './pages/cms/SeoSettings.tsx';
import SeoSettingEdit from './pages/cms/SeoSettingEdit.tsx';
import SiteSettings from './pages/cms/SiteSettings.tsx';
import { useSiteSettings, usePublicSiteSettings } from './modules/cms/queries';
import Resource from './pages/resources/Resource.tsx';
import ManageResources from './pages/resources/ManageResources.tsx';
import ResourceForm from './pages/resources/ResourceForm.tsx';
import ResourceServiceDetail from './pages/resources/ResourceServiceDetail.tsx';


// Import jQuery and expose to window (Summernote requires this)
import $ from 'jquery';
window.jQuery = window.$ = $;

// Import Summernote CSS globally
import 'summernote/dist/summernote-lite.css';
import "../assets/css/summernote-fixes.css";

// Icon Libraries
import 'remixicon/fonts/remixicon.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import Flatpickr CSS
import 'flatpickr/dist/flatpickr.css';

export default function App() {
  useEffect(() => {
    // Check session immediately on app load
    checkSession();
    // Refresh user details to ensure permissions/subscription are up to date
    refreshSubscription();

    // Optional: Set up periodic session validation (every 5 minutes)
    const intervalId = setInterval(() => {
      checkSession();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, []);

  const user = useAuthStore((state) => state.user);
  const { data: publicSettingsData } = usePublicSiteSettings();

  useEffect(() => {
    if (publicSettingsData?.data) {
      const { site_name, partner_favicon, primary_color } = publicSettingsData.data;

      // 1. Dynamic Browser Title
      if (site_name) {
        document.title = site_name;
      }

      // 2. Dynamic Favicon
      let favicon = publicSettingsData.data.partner_favicon || publicSettingsData.data.favicon;

      // Clean up 'null' or empty strings
      if (favicon === 'null' || !favicon) {
        favicon = publicSettingsData.data.favicon;
      }

      if (favicon && favicon !== 'null') {
        const BASE_URL = import.meta.env.VITE_BASE_URL || '';
        const faviconPath = favicon.replace(/^\//, '');
        const faviconUrl = favicon.startsWith('http') ? favicon : `${BASE_URL}/storage/${faviconPath}`;

        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = faviconUrl;
      }

      // 3. Dynamic Sidebar Styling (Primary Color BG + Secondary Color Icons)
      if (primary_color && primary_color !== 'null') {
        const secondary = publicSettingsData.data.secondary_color || '#F7B84B';
        const styleId = 'dynamic-sidebar-overrides';
        let style = document.getElementById(styleId);
        if (!style) {
          style = document.createElement('style');
          style.id = styleId;
          document.head.appendChild(style);
        }
        style.innerHTML = `
          /* SIDEBAR BACKGROUND */
          .app-menu, .navbar-brand-box {
            background: ${primary_color} !important;
          }
          
          /* NAVIGATION TEXT (WHITE) */
          .navbar-menu .navbar-nav .nav-link, 
          .navbar-menu .navbar-nav .nav-sm .nav-link,
          .navbar-menu .navbar-title {
            color: #ffffff !important;
          }
          
          /* NAVIGATION ICONS (SECONDARY COLOR) */
          .navbar-menu .navbar-nav .nav-link i {
            color: ${secondary} !important;
          }
          
          /* ACTIVE STATE (SECONDARY BG + WHITE TEXT/ICON) */
          /* HOVER & ACTIVE EFFECTS (SECONDARY COLOR) */
          .navbar-menu .navbar-nav .nav-link:hover,
          .navbar-menu .navbar-nav .nav-sm .nav-link:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
          }

          /* DYNAMIC UI BUTTONS (PRIMARY & SECONDARY) */
          .btn-primary {
            background-color: ${primary_color} !important;
            border-color: ${primary_color} !important;
          }
          .btn-primary:hover, .btn-primary:active, .btn-primary:focus {
            background-color: ${primary_color} !important;
            filter: brightness(90%);
            border-color: ${primary_color} !important;
          }

          .btn-warning {
            background-color: ${secondary} !important;
            border-color: ${secondary} !important;
            color: #ffffff !important; /* Ensure text is readable on secondary color */
          }
          .btn-warning:hover, .btn-warning:active, .btn-warning:focus {
            background-color: ${secondary} !important;
            filter: brightness(90%);
            border-color: ${secondary} !important;
            color: #ffffff !important;
          }

          /* Ensure filter icon stays white */
          .btn-warning i {
            color: #ffffff !important;
          }
          
          .navbar-menu .navbar-nav .nav-link.active,
          .navbar-menu .navbar-nav .nav-sm .nav-link.active {
            background-color: ${secondary} !important;
            color: #ffffff !important;
          }
          
          .navbar-menu .navbar-nav .nav-link.active i,
          .navbar-menu .navbar-nav .nav-sm .nav-link.active::before {
            color: #ffffff !important;
          }

          /* Ensure sub-menu indicators also follow white/secondary theme */
          .navbar-menu .navbar-nav .nav-sm .nav-link::before {
            background-color: rgba(255, 255, 255, 0.5) !important;
          }
          .navbar-menu .navbar-nav .nav-sm .nav-link.active::before {
            background-color: #ffffff !important;
          }
        `;
      }
    }
  }, [publicSettingsData]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="login" element={<SignIn />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="partners/download-agreement/:userId" element={<DownloadAgreement />} />
          <Route path="borrowers/download-agreement/:userId" element={<DownloadAgreement />} />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />

            {/* Commissions Routes */}
            <Route element={<PermissionRoute permission="view commission" />}>
              <Route path="commissions" element={<CommissionList />} />
              <Route path="commissions/:id" element={<CommissionDetails />} />
            </Route>

            {/* Partners Routes - requires 'view partners' permission */}
            <Route element={<PermissionRoute permission="view partners" />}>
              <Route path="partners" element={<Partners />} />

              <Route element={<PermissionRoute permission="create partners" />}>
                <Route path="partners/create" element={<PartnerProfile />} />
              </Route>

              <Route path="partners/:id" element={<PartnerProfile />} />

            </Route>

            {/* Employees Routes - requires 'view employees' permission */}
            <Route element={<PermissionRoute permission="view employees" />}>
              <Route path="employees" element={<Employees />} />
              <Route path="employee-details/:id" element={<EmployeeDetails />} />
              <Route element={<PermissionRoute permission="create employees" />}>
                <Route path="employees/create" element={<EmployeeDetails />} />
              </Route>

            </Route>

            {/* Clients Routes - requires 'view clients' permission */}
            <Route element={<PermissionRoute permission="view clients" />}>
              <Route path="clients" element={<Clients />} />

              <Route element={<PermissionRoute permission="create clients" />}>
                <Route path="clients/create" element={<ClientDetails />} />
              </Route>

              <Route path="clients/:id" element={<ClientDetails />} />
            </Route>

            {/* Users Routes - requires 'view users' permission */}
            <Route element={<PermissionRoute permission="view users" />}>
              <Route path="users" element={<Users />} />
            </Route>


            {/* Roles & Permissions Routes - requires 'view roles & permissions' permission */}

            <Route element={<PermissionRoute permission="view roles & permissions" />}>
              <Route path="roles-permissions" element={<RolesPermissions />} />
              <Route path="roles-permissions/create" element={<CreateRole />} />
              <Route path="roles-permissions/edit/:id" element={<EditRole />} />
            </Route>


            {/* CMS Routes */}
            <Route path="cms">
              <Route element={<PermissionRoute permission="view blogs" />}>
                <Route path="blogs" element={<BlogList />} />
                <Route path="blog-categories" element={<BlogCategories />} />
                <Route path="blog-tags" element={<BlogTags />} />
                <Route element={<PermissionRoute permission="create blogs" />}>
                  <Route path="blogs/create" element={<BlogEdit />} />
                </Route>
                <Route element={<PermissionRoute permission="update blogs" />}>
                  <Route path="blogs/edit/:id" element={<BlogEdit />} />
                </Route>
              </Route>
              <Route element={<PermissionRoute permission="view seo settings" />}>
                <Route path="seo-settings" element={<SeoSettings />} />
                <Route element={<PermissionRoute permission="update seo settings" />}>
                  <Route path="seo-settings/create" element={<SeoSettingEdit />} />
                  <Route path="seo-settings/edit/:id" element={<SeoSettingEdit />} />
                </Route>
              </Route>
              <Route element={<PermissionRoute permission="view site settings" />}>
                <Route path="site-settings" element={<SiteSettings />} />
              </Route>
            </Route>
            {/* Settings Route */}
            <Route element={<PermissionRoute permission={["update payment settings", "update partner agreement settings", "update borrower agreement settings"]} />}>
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="profile" element={<Profile />} />


            {/* Credit Builder Menu Routes - Host Only */}
            <Route element={<HostRoute />}>
              <Route path="tiers" element={<TiersList />} />
              <Route path="tiers/create" element={<TierForm />} />
              <Route path="tiers/:id" element={<TierForm />} />
              <Route path="credit-accounts" element={<CreditAccountsList />} />
              <Route path="credit-accounts/create" element={<CreditAccountForm />} />
              <Route path="credit-accounts/:id" element={<CreditAccountForm />} />
              <Route path="verification-center" element={<VerificationCenter />} />
              <Route path="verification-center/borrower-requests" element={<BorrowerVerificationRequests />} />
              <Route path="verification-center/borrower-requests/:borrower_id" element={<BorrowerVerificationRequests />} />
            </Route>

            {/* Appointments Routes - requires 'view appointments' permission */}
            <Route element={<PermissionRoute permission="view appointments" />}>
              <Route path="appointments" element={<Appointments />} />
            </Route>

            {/* Contacts Routes - requires 'view contacts' permission */}
            <Route element={<PermissionRoute permission="view contacts" />}>
              <Route path="contacts" element={<Contacts />} />

              <Route element={<PermissionRoute permission="create contacts" />}>
                <Route path="contacts/create" element={<ContactDetails />} />
              </Route>

              <Route path="contacts/:id" element={<ContactDetails />} />
            </Route>

            <Route element={<PermissionRoute permission="view leads" />}>
              <Route path="leads" element={<Leads />} />
              <Route element={<PermissionRoute permission="create leads" />}>
                <Route path="leads/create" element={<LeadDetails />} />
              </Route>
              <Route path="leads/:id" element={<LeadDetails />} />
            </Route>


            <Route path="intake-review">

              <Route element={<PermissionRoute permission="view pre qualification" />}>
                <Route path="pre-qualification" element={<PreQualificationApplication />} />
                <Route path="pre-qualification/:id" element={<PreQualificationDetails />} />
              </Route>

              <Route element={<PermissionRoute permission="view funding application" />}>
                <Route path="funding-review" element={<FundingApplication />} />
                <Route path="funding-review/:id" element={<FundingApplicationDetails />} />
              </Route>

              <Route element={<PermissionRoute permission="view change requests" />}>
                <Route path="change-requests" element={<ChangeRequests />} />
              </Route>

            </Route>





            {/* Invoices Routes */}
            <Route element={<PermissionRoute permission="view invoices" />}>
              <Route path="invoices" element={<Invoices />} />
            </Route>

            {/* Payments Routes */}
            <Route element={<PermissionRoute permission="view payments" />}>
              <Route path="payments" element={<Payments />} />
            </Route>

            {/* Subscriptions Routes */}
            <Route element={<HostRoute />}>
              <Route element={<PermissionRoute permission="view subscriptions" />}>
                <Route path="subscriptions" element={<Subscriptions />} />
              </Route>
            </Route>

            {/* General Settings */}
            <Route element={<PermissionRoute permission="update borrower agreement settings" />}>
              <Route path="settings" element={<Settings />} />
              <Route path="admin/settings" element={<Settings />} />
            </Route>

            {/* Resources Modules */}
            <Route element={<PermissionRoute permission="view resources" />}>
              <Route path="resources" element={<Resource />} />
              <Route path="resources/service/:id" element={<ResourceServiceDetail />} />
              <Route path="resources/create" element={<ResourceForm />} />
              <Route path="resources/edit/:id" element={<ResourceForm />} />
              <Route path="manage-resources" element={<ManageResources />} />
            </Route>



            {/* Under Construction - accessible to all authenticated users */}
            <Route path="under-construction/:feature" element={<UnderConstruction />} />

            {/* Error Pages */}
            <Route path="access-denied" element={<ErrorPage status={403} />} />
            <Route path="not-found" element={<ErrorPage status={404} />} />
            <Route path="*" element={<ErrorPage status={404} />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}