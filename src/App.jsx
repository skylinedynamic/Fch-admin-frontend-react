import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './Fch/layout/Layout.jsx'
import Dashboard from './Fch/pages/Dashboard.jsx'
import Employees from './Fch/pages/Employees.jsx'
import EmployeeDetails from './Fch/pages/EmployeeDetails.jsx'
import SignIn from './Fch/pages/SignIn.jsx'
import Users from './Fch/pages/Users.jsx'
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