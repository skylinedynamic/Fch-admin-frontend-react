import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'
import Footer from './Footer.jsx'
import MailNotVerifiedBanner from './MailNotVerifiedBanner.tsx'
import GlobalModals from '../Common/Modals/GlobalModals.jsx'
import SupportChatWidget from '../Common/ChatWidget/SupportChatWidget.tsx'

export default function Layout() {
  return (
    <div id="layout-wrapper">
      <Header />
      <Sidebar />
      <div
        className="vertical-overlay"
        onClick={() => {
          document.body.classList.remove('vertical-sidebar-enable')
        }}
      />
      <div className="main-content">
        <MailNotVerifiedBanner />
        <Outlet />
        <Footer />
      </div>
      <GlobalModals />
      <SupportChatWidget />
    </div>
  )
}