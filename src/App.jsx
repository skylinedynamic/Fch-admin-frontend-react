import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
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
import { ProtectedRoute, GuestRoute, checkSession, PermissionRoute } from './lib/auth';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Partners from './pages/partners/Partners.jsx';
import PartnerProfile from './pages/partners/PartnerProfile.jsx';
import Clients from './pages/clients/Clients.jsx';
import ClientDetails from './pages/clients/ClientDetails';
import TiersList from './pages/tiers/TiersList.jsx';
import TierForm from './pages/tiers/TierForm.jsx';
import VerificationCenter from './pages/credit-builder/VerificationCenter.jsx';
import BorrowerVerificationRequests from './pages/credit-builder/BorrowerVerificationRequests.jsx';

// Import jQuery and expose to window (Summernote requires this)
import $ from 'jquery';
window.jQuery = window.$ = $;

// Import Summernote CSS globally
import 'summernote/dist/summernote-lite.css';

export default function App() {
  useEffect(() => {
    // Check session immediately on app load
    checkSession();

    // Optional: Set up periodic session validation (every 5 minutes)
    const intervalId = setInterval(() => {
      checkSession();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <ToastContainer theme="colored" />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="login" element={<SignIn />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />

            {/* Partners Routes - requires 'view partners' permission */}
            <Route element={<PermissionRoute permission="view partners" />}>
              <Route path="partners" element={<Partners />} />
              <Route path="partners/create" element={<PartnerProfile />} />
              <Route path="partners/:id" element={<PartnerProfile />} />
            </Route>

            {/* Employees Routes - requires 'view employees' permission */}
            <Route element={<PermissionRoute permission="view employees" />}>
              <Route path="employees" element={<Employees />} />
              <Route path="employee-details/:id?" element={<EmployeeDetails />} />
            </Route>

            {/* Clients Routes - requires 'view clients' permission */}
            <Route element={<PermissionRoute permission="view clients" />}>
              <Route path="clients" element={<Clients />} />
              <Route path="clients/create" element={<ClientDetails />} />
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

            {/* Credit Builder Menu Routes */}
            <Route>
              <Route path="tiers" element={<TiersList />} />
              <Route path="tiers/create" element={<TierForm />} />
              <Route path="tiers/:id" element={<TierForm />} />
              <Route path="verification-center" element={<VerificationCenter />} />
              <Route path="verification-center/borrower-requests/:borrower_id" element={<BorrowerVerificationRequests />} />
            </Route>

            {/* Under Construction - accessible to all authenticated users */}
            <Route path="under-construction/:feature" element={<UnderConstruction />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}