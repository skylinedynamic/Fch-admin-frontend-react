import React from 'react'
import { APP_CONFIG } from '../../config'
import { useSiteSettings } from '../../modules/cms/queries'

export default function Footer() {
  const { data: settingsData } = useSiteSettings()
  const siteName = settingsData?.data?.site_name || APP_CONFIG.name
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