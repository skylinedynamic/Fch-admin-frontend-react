import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import { ProtectedRoute, GuestRoute, checkSession, PermissionRoute, refreshSubscription, HostRoute, PartnerHostRoute, NonHostPartnerRoute } from './lib/auth';
import { useAuthStore } from './store/auth';
import { ENTITY_TYPE_BORROWER } from './config/appConfig';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Partners from './pages/partners/Partners.jsx';
import PartnerProfile from './pages/partners/PartnerProfile.jsx';
import Clients from './pages/clients/Clients';
import ClientDetails from './pages/clients/ClientDetails';
import TiersList from './pages/tiers/TiersList.jsx';
import TierForm from './pages/tiers/TierForm.jsx';
import CreditAccountsList from './pages/credit-builder/credit-accounts/CreditAccountsList.jsx';
import CreditAccountForm from './pages/credit-builder/credit-accounts/components/CreditAccountForm.jsx';
import CapitalAccessList from './pages/capital-access/CapitalAccessList.tsx';
import CapitalAccessForm from './pages/capital-access/components/CapitalAccessForm.tsx';
import VerificationCenter from './pages/credit-builder/verifications/VerificationCenter.jsx';
import BorrowerVerificationRequests from './pages/credit-builder/verifications/BorrowerVerificationRequests.jsx';
import Appointments from './pages/appointments/Appointments.jsx';
import Contacts from './pages/contacts/Contacts.jsx';
import ContactDetails from './pages/contacts/ContactDetails.jsx';
import ErrorPage from './pages/Utility/ErrorPage.tsx';
import Leads from './pages/leads/Leads.jsx';
import LeadDetails from './pages/leads/LeadDetails.jsx';
import PreQualificationApplication from './pages/applications/pre-qualification/PreQualificationApplication.tsx';
import PreQualificationDetails from './pages/applications/pre-qualification/PreQualificationDetails.tsx';
import FundingApplication from './pages/applications/funding/FundingApplication.tsx';
import FundingApplicationDetails from './pages/applications/funding/FundingApplicationDetails.tsx';
import FundingSequence from './pages/applications/funding-request/FundingSequence.tsx';
import FundingRequestDetail from './pages/applications/funding-request/FundingRequestDetail.tsx';
import FundingApplicationAuditHistory from './pages/applications/funding/FundingApplicationAuditHistory.tsx';
import FundApplication from './pages/applications/fundapplication/FundApplication.tsx';
import Settings from './pages/settings/Settings.tsx';
import ChangeRequests from './pages/applications/change-requests/ChangeRequests.tsx';
import CreditProfileRequests from './pages/applications/credit-profile-requests/CreditProfileRequests.tsx';
import CreditProfileRequestDetails from './pages/applications/credit-profile-requests/CreditProfileRequestDetails.tsx';
import Invoices from './pages/invoices/Invoices.jsx';
import InvoiceDetails from './pages/invoices/InvoiceDetails.jsx';
import Payments from './pages/payments/Payments.jsx';
import PaymentDetails from './pages/payments/PaymentDetails.jsx';
import Subscriptions from './pages/subscriptions/Subscriptions.jsx';
import SubscriptionDetails from './pages/subscriptions/SubscriptionDetails.tsx';
import PlanFee from './pages/plan-fee/PlanFee.tsx';
import Billing from './pages/billing/Billing.jsx';
import BillingDetails from './pages/billing/BillingDetails.jsx';
import MySubscription from './pages/my-subscription/MySubscription';
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
import { applyBrandTheme } from './utils/brandingTheme';
import { useQueryClient } from '@tanstack/react-query';
import Resource from './pages/resources/Resource.tsx';
import ManageResources from './pages/resources/ManageResources.tsx';
import ResourceForm from './pages/resources/ResourceForm.tsx';
import ResourceServiceDetail from './pages/resources/ResourceServiceDetail.tsx';
import ConfigurationGuardModal from './components/Common/ConfigurationGuardModal';
import FundingList from './pages/funding/FundingList';
import FundingSequencingForm from './pages/funding/components/FundingSequencingForm';
import LendersList from './pages/lenders/LendersList';
import LenderForm from './pages/lenders/LenderForm';
import EmbedFormSettings from './pages/embed-form/EmbedFormSettings.tsx';
import EmbedFormSubmissions from './pages/embed-form/EmbedFormSubmissions.tsx';
import EmbedFormSubmissionDetails from './pages/embed-form/EmbedFormSubmissionDetails.tsx';

import PaymentMethods from './pages/payment-methods/PaymentMethods.tsx';
import ReminderModal from './components/Common/ReminderModal';
import ReminderList from './pages/reminders/ReminderList';

// Import jQuery and expose to window (Summernote requires this)
import $ from 'jquery';
window.jQuery = window.$ = $;

import { initEcho } from './lib/echo';
import { clearAuth } from './lib/auth';

// Import Summernote CSS globally
import 'summernote/dist/summernote-lite.css';
import "../assets/css/summernote-fixes.css";

// Icon Libraries
import 'remixicon/fonts/remixicon.css';
import 'bootstrap-icons/font/bootstrap-icons.css';


// Icon Libraries

// Preserves the :id param when redirecting the old /embed-form/submissions/:id
// bookmark to its renamed route.
function RedirectToLoanApplication() {
  const { id } = useParams();
  return <Navigate to={`/embed-form/loan-applications/${id}`} replace />;
}

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

      // Initialize Reverb WebSocket listener for Trial Expiration
      if (user) {
        const echo = initEcho();
        if (echo) {
          echo.private(`App.Models.User.${user.id}`)
            .listen('.trial.expired', () => {
              clearAuth();
              const expiredMessage = user.entity_type === ENTITY_TYPE_BORROWER
                ? 'Your free plan has expired. You have been logged out.'
                : 'Your free trial has expired. You have been logged out.';
              toast.error(expiredMessage, { toastId: 'reverb-trial-expired' });
              window.location.assign('/login');
            });
            
          return () => {
            echo.leave(`App.Models.User.${user.id}`);
          };
        }
      }
    }
  }, [token, user]);

  // Fetch authenticated global configurations (branding + status flags)
  const { data: globalConfigData } = useGlobalConfigurations(!!user);

  const setGlobalConfigs = useConfigStore((state) => state.setGlobalConfigs);

  useEffect(() => {
    if (user && globalConfigData?.data) {
      const activeBranding = globalConfigData.data.branding;
      const activeFlags = globalConfigData.data.status_flags;

      // Persist global config in Zustand
      setGlobalConfigs(activeBranding, activeFlags);

      const { site_name, favicon_full_url } = activeBranding;

      // Every brand colour, including the derived contrast tokens that keep text
      // readable on a light brand colour.
      applyBrandTheme(activeBranding);

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
    }
  }, [globalConfigData, user, setGlobalConfigs]);

  return (
    <>
      <ConfigurationGuardModal />
      <ReminderModal />
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
            <Route path="fund-application/:id" element={<FundApplication />} />

            {/* Reminders Route - requires 'view reminders' permission */}
            <Route element={<PermissionRoute permission="view reminders" />}>
              <Route path="reminders" element={<ReminderList />} />
            </Route>

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
              <Route path="capital-access" element={<CapitalAccessList />} />
              <Route path="capital-access/create" element={<CapitalAccessForm />} />
              <Route path="capital-access/:id" element={<CapitalAccessForm />} />
              <Route path="verification-center" element={<VerificationCenter />} />
              <Route path="verification-center/borrower-requests" element={<BorrowerVerificationRequests />} />
              <Route path="verification-center/borrower-requests/:borrower_id" element={<BorrowerVerificationRequests />} />
              <Route path="funding" element={<FundingList />} />
              <Route path="funding/create" element={<FundingSequencingForm />} />
              <Route path="funding/:id" element={<FundingSequencingForm />} />
              <Route path="funding/visibility-rules/:id/*" element={<FundingSequencingForm />} />
              <Route path="lenders" element={<LendersList />} />
              <Route path="lenders/create" element={<LenderForm />} />
              <Route path="lenders/:id" element={<LenderForm />} />
            </Route>

            {/* Payment Method Routes - Host Partner Only */}
            <Route element={<PartnerHostRoute />}>
              <Route path="payment-methods" element={<PaymentMethods />} />
              <Route path="plan-and-fee" element={<PlanFee />} />
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
                <Route path="funding-application" element={<FundingApplication />} />
                <Route path="funding-application/:id" element={<FundingApplicationDetails />} />
                <Route path="funding-application/:id/audit-history" element={<FundingApplicationAuditHistory />} />
              </Route>

              <Route element={<PermissionRoute permission="view funding request" />}>
                <Route path="funding-request" element={<FundingSequence />} />
                <Route path="funding-request/:id" element={<FundingRequestDetail />} />
              </Route>

              <Route element={<PermissionRoute permission="view change requests" />}>
                <Route path="change-requests" element={<ChangeRequests />} />
              </Route>

              <Route element={<HostRoute />}>
                <Route path="credit-profile-requests" element={<CreditProfileRequests />} />
                <Route path="credit-profile-requests/:id" element={<CreditProfileRequestDetails />} />
              </Route>

            </Route>





            {/* Invoices Routes */}
            <Route element={<PermissionRoute permission="view invoices" />}>
              <Route path="invoices" element={<Invoices />} />
              <Route path="invoices/:id" element={<InvoiceDetails />} />
            </Route>

            {/* Payments Routes */}
            <Route element={<PermissionRoute permission="view payments" />}>
              <Route path="payments" element={<Payments />} />
              <Route path="payments/:id" element={<PaymentDetails />} />
            </Route>

            {/* Subscriptions Routes */}
            <Route element={<PermissionRoute permission="view subscriptions" />}>
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="subscriptions/:id" element={<SubscriptionDetails />} />
              <Route path="billing" element={<Billing />} />
              <Route path="billing/:id" element={<BillingDetails />} />
            </Route>

            {/* Non-Host Partner My Subscription Route */}
            <Route element={<NonHostPartnerRoute />}>
              <Route path="my-subscription" element={<MySubscription />} />
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


            {/* Embed Form Module */}
            <Route element={<PermissionRoute permission="view configuration" />}>
              <Route path="embed-form/settings" element={<EmbedFormSettings />} />
            </Route>
            <Route element={<PermissionRoute permission="view application" />}>
              <Route path="embed-form/loan-applications" element={<EmbedFormSubmissions />} />
              <Route path="embed-form/loan-applications/:id" element={<EmbedFormSubmissionDetails />} />
              {/* Renamed from /embed-form/submissions - keep old links/bookmarks working. */}
              <Route path="embed-form/submissions" element={<Navigate to="/embed-form/loan-applications" replace />} />
              <Route path="embed-form/submissions/:id" element={<RedirectToLoanApplication />} />
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
