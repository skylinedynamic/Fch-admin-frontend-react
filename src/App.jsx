import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from '../src/components/Layout/Layout.jsx'
import Dashboard from '../src/pages/dashboard/Dashboard.jsx'
import Employees from '../src/pages/employees/Employees.jsx'
import EmployeeDetails from '../src/pages/employees/EmployeeDetails.jsx'
import SignIn from '../src/pages/singin/SignIn.jsx'
import Users from '../src/pages/users/Users.jsx'
import ProtectedRoute from './lib/ProtectedRoute'

function DashboardPage() {
  return (
    <div className="page-content">
      <div className="container-fluid">
        <h4 className="fs-20 mb-1">Dashboard</h4>
        <p className="text-muted">Welcome to your React app.</p>
      </div>
    </div>
  )
}

function PartnersPage() {
  return (
    <div className="page-content">
      <div className="container-fluid">
        <h4 className="fs-20 mb-1">Partners</h4>
        <p className="text-muted">This is a placeholder Partners page.</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<SignIn />} />
      <Route element={<ProtectedRoute />}> 
        <Route element={<Layout />}> 
          <Route index element={<Dashboard />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="employees" element={<Employees />} />
          <Route path="users" element={<Users />} />
          <Route path="employee-details" element={<EmployeeDetails />} />
        </Route>
      </Route>
    </Routes>
  )
}