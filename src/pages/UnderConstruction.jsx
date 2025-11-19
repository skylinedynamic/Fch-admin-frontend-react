import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

export default function UnderConstruction() {
  const [visible, setVisible] = useState(false)
  const { feature } = useParams()
  const name = (feature || 'page')
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const bgStyle = {
    minHeight: 'calc(100vh - 160px)',
    background:
      'radial-gradient(900px 900px at 85% -200px, rgba(13,110,253,.08), transparent 55%), radial-gradient(700px 700px at -120px 50%, rgba(255,193,7,.06), transparent 60%)'
  }

  const cardStyle = {
    transition: 'opacity .3s ease, transform .3s ease',
    boxShadow: '0 10px 24px rgba(28,39,60,.08)',
    border: '1px solid rgba(28,39,60,.06)',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(6px)'
  }

  return (
    <div className="page-content" style={bgStyle}>
      <div className="container-fluid d-flex align-items-center justify-content-center" style={{ minHeight: 'inherit' }}>
        <div className="row w-100 justify-content-center">
          <div className="col-xl-8 col-lg-9">
            <div className="card card-animate shadow-sm rounded-4" style={cardStyle}>
              <div className="card-body text-center py-5">
                <div className="avatar-lg mx-auto mb-3">
                  <span className="avatar-title bg-warning-subtle rounded fs-1">
                    <i className="ri-tools-line text-warning"></i>
                  </span>
                </div>
                <h4 className="fs-24 mb-2">{name} – Under Construction</h4>
                <p className="text-muted mb-4">We're Building Something Awesome</p>
                <div className="d-flex gap-2 justify-content-center">
                  <Link to="/" className="btn btn-primary fw-medium px-4">Back to Dashboard</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}