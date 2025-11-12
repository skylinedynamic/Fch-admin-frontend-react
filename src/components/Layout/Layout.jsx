import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'
import Footer from './Footer.jsx'

export default function Layout() {
  return (
    <div id="layout-wrapper">
      <Header />
      <div className="app-menu">
        <Sidebar />
      </div>
      <div className="main-content">
        <Outlet />
        <Footer />
      </div>
    </div>
  )
}