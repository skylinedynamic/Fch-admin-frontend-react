/**
 * What the partner dashboard's <head> says about it - the same wording the API's
 * /api/portal-meta gives Nginx for the raw HTML (App\Support\Branding\PortalMeta)
 * and the stub in index.html. Change all three together.
 */
export const PORTAL_LABEL = 'Partner Dashboard'

export const DEFAULT_SITE_NAME = 'Four Corner Funding'

export const portalDescription = (siteName: string): string =>
  `Sign in to the ${siteName} partner dashboard to manage your borrowers and their funding.`
