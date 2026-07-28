import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'
import Footer from './Footer.jsx'
import GlobalModals from '../Common/Modals/GlobalModals.jsx'

export default function Layout() {
  return (
    <div id="layout-wrapper" style={{ overflow: 'visible' }}>
      <Header />
      <Sidebar />
      <div
        className="vertical-overlay"
        onClick={() => {
          document.body.classList.remove('vertical-sidebar-enable')
        }}
      />
      <div className="main-content" style={{ overflow: 'visible' }}>
        <Outlet />
        <Footer />
      </div>
      <GlobalModals />
    </div>
  )
}