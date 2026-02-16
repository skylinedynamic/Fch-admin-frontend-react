import React from 'react'
import { APP_CONFIG } from '../../config'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container-fluid">
        <div className="row">
          <div className="col-sm-12 text-end">
            <span>Copyright © {new Date().getFullYear()} {APP_CONFIG.name}. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}