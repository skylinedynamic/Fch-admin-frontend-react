import React from 'react'
import logoImg from '../../../assets/images/logo.png'

export default function Auth({ header, children, belowCard, colClass = 'col-xl-5 col-lg-6 col-md-8' }) {
  return (
    <div className="auth-page-wrapper pt-5">
      
      <div className="auth-one-bg-position auth-one-bg" id="auth-particles">
      <div className="bg-overlay"></div>
      <div className="shape">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          viewBox="0 0 1440 120"
        >
          <path d="M 0,36 C 144,53.6 432,123.2 720,124 C 1008,124.8 1296,56.8 1440,40L1440 140L0 140z"></path>
        </svg>
      </div>
    </div>

      <div className="auth-page-content">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="text-center mt-sm-5 mb-4 text-white-50">
                <div>
                  <a href="/" className="d-inline-block auth-logo">
                    <img src={logoImg} alt="FourCorner" height="40" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="row justify-content-center">
            <div className={colClass}>
              <div className="card mt-4">
                <div className="card-body p-4">
                  {header}
                  {children}
                </div>
              </div>

              {belowCard}
            </div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="text-center">
                <p className="mb-0 text-muted">&copy; {new Date().getFullYear()} Four Corner Holding. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}