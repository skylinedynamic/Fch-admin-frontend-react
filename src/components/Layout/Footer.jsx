import React from 'react'
import { APP_CONFIG } from '../../config'
import { useConfigStore } from '../../store/config'

export default function Footer() {
  const { branding: settings } = useConfigStore()
  const siteName = settings?.site_name || APP_CONFIG.name
  return (
    <footer className="footer">
      <div className="container-fluid">
        <div className="row">
          <div className="col-sm-12 text-end">
            <span>Copyright © {new Date().getFullYear()} {siteName}. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}