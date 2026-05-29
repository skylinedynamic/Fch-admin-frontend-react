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
import { useSiteSettings } from './modules/cms/queries';
import { useGlobalConfigurations } from './modules/settings/queries';
import { useConfigStore } from './store/config';
import { useQueryClient } from '@tanstack/react-query';
import Resource from './pages/resources/Resource.tsx';
import ManageResources from './pages/resources/ManageResources.tsx';
import ResourceForm from './pages/resources/ResourceForm.tsx';
import ResourceServiceDetail from './pages/resources/ResourceServiceDetail.tsx';
import ConfigurationGuardModal from './components/Common/ConfigurationGuardModal';


// Import jQuery and expose to window (Summernote requires this)
import $ from 'jquery';
window.jQuery = window.$ = $;

// Import Summernote CSS globally
import 'summernote/dist/summernote-lite.css';
import "../assets/css/summernote-fixes.css";

// Icon Libraries
import 'remixicon/fonts/remixicon.css';
import 'bootstrap-icons/font/bootstrap-icons.css';


// Icon Libraries

export default function App() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    checkSession();

    const intervalId = setInterval(() => {
      checkSession();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (token) {
      refreshSubscription();
      queryClient.invalidateQueries({ queryKey: ['globalConfigurations'] });
    }
  }, [token]);

  // Fetch authenticated global configurations (branding + status flags)
  const { data: globalConfigData } = useGlobalConfigurations(!!user);

  const setGlobalConfigs = useConfigStore((state) => state.setGlobalConfigs);

  useEffect(() => {
    if (user && globalConfigData?.data) {
      const activeBranding = globalConfigData.data.branding;
      const activeFlags = globalConfigData.data.status_flags;

      // Persist global config in Zustand
      setGlobalConfigs(activeBranding, activeFlags);

      const { site_name, favicon_full_url, primary_color, secondary_color } = activeBranding;

      // 1. Dynamic Browser Title
      if (site_name) {
        document.title = site_name;
      }

      // 2. Dynamic Favicon
      if (favicon_full_url && favicon_full_url !== 'null') {
        document.querySelectorAll("link[rel~='icon']").forEach(el => el.remove());
        const favLink = document.createElement('link');
        favLink.rel = 'icon';
        favLink.href = favicon_full_url.includes('?') ? `${favicon_full_url}&_t=${Date.now()}` : `${favicon_full_url}?_t=${Date.now()}`;
        document.head.appendChild(favLink);
      }

      // 3. Dynamic CSS Variables
      if (primary_color && primary_color !== 'null') {
        const secondary = secondary_color || '#F7B84B';

        // Dynamic CSS variables set on :root
        document.documentElement.style.setProperty('--primary-color', primary_color);
        document.documentElement.style.setProperty('--secondary-color', secondary);

        // Also dynamically set Bootstrap/Velzon primary variables
        document.documentElement.style.setProperty('--vz-primary', primary_color, 'important');

        const hexToRgb = (hex) => {
          const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
          const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
          return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
        };

        const rgbVal = hexToRgb(primary_color);
        if (rgbVal) {
          document.documentElement.style.setProperty('--vz-primary-rgb', rgbVal, 'important');
        }
      }
    }
  }, [globalConfigData, user, setGlobalConfigs]);

  return (
    <>
      <ConfigurationGuardModal />
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
