import React from 'react'
import logoImg from "../../../assets/images/fch-logo-wide.png"
import { APP_CONFIG, MODULE_BRANDING } from '../../config/appConfig'
import { fetchBranding } from '../../modules/settings/services'
import { applyBrandTheme } from '../../utils/brandingTheme'

export default function Auth({ header, children, belowCard, colClass = 'col-xl-5 col-lg-6 col-md-8' }) {
  const [settings, setSettings] = React.useState(null);

  React.useEffect(() => {
    // Branding only. The login screen needs nothing from get-theme's email and
    // payment freshness flags, and waiting on those queries delayed the brand.
    fetchBranding()
      .then((payload) => {
        const res = { status: payload?.success, data: payload?.data?.branding };
        if (res.status && res.data) {
          setSettings(res.data);

          // One call for every brand variable. The login page used to set only
          // --primary-color/--secondary-color, so Bootstrap's primary stayed the
          // stock theme colour here while the dashboard was branded.
          //
          // The server's precomputed map is passed through so this matches what
          // /api/branding.css already painted before React mounted.
          applyBrandTheme(res.data, payload?.data?.css_vars);
          const faviconUrl = res.data.favicon_full_url || res.data.favicon;
          if (faviconUrl && faviconUrl !== 'null') {
            document.querySelectorAll("link[rel~='icon']").forEach(el => el.remove());
            const link = document.createElement('link');
            link.rel = 'icon';
            link.href = faviconUrl.includes('?') ? `${faviconUrl}&_t=${Date.now()}` : `${faviconUrl}?_t=${Date.now()}`;
            document.head.appendChild(link);
          }
          if (res.data.site_name) {
            document.title = res.data.site_name;
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch theme configurations", err);
      });
  }, []);

  const dynamicLogo = settings?.primary_logo_full_url;
  const siteName = settings?.site_name ;
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
              <div className="text-center text-white-50 mt-5 mb-3">
                <div>
                  <a href="/" className="d-inline-block auth-logo">
                    <img src={dynamicLogo} alt={siteName} className="auth-logo-img" />
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
                <p className="mb-0 text-muted">&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}