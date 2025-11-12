import React from 'react'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container-fluid">
        <div className="row">
          <div className="col-sm-6">
            <span>{new Date().getFullYear()} © Four Corner Holdings.</span>
          </div>
          <div className="col-sm-6">
            <div className="text-sm-end d-none d-sm-block">
              Design &amp; Develop by Skyline Dynamic AI.
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}