/**
 * Keeping the page's title, description, Open Graph / Twitter tags and favicon
 * in step with the tenant's branding while the app runs.
 *
 * Link previews read these from the raw HTML, which Nginx already fills in per
 * domain from the API (see index.html). This keeps the running page saying the
 * same thing - including where SSI is not on yet, and for crawlers that do run
 * JavaScript - so the choices below mirror App\Support\Branding\PortalMeta.
 */
import type { BrandingConfig } from '../store/config/configStore'
import { DEFAULT_SITE_NAME, PORTAL_LABEL, portalDescription } from '../config/portalMeta'

export type PortalMetaBranding = Partial<Pick<BrandingConfig,
  | 'site_name'
  | 'site_slogan'
  | 'logo_document_full_url'
  | 'logo_mail_full_url'
  | 'logo_mobile_full_url'
  | 'logo_sidebar_full_url'
  | 'favicon_full_url'
>>

export type PortalMeta = {
  title: string
  siteName: string
  description: string
  image: string | null
  /** Null keeps the portal's packaged icon, which index.html declares. */
  favicon: string | null
}

/** The sidebar logo - the tenant's main mark - first; the others stand in for it. */
const IMAGE_KEYS = ['logo_sidebar_full_url', 'logo_document_full_url', 'logo_mail_full_url', 'logo_mobile_full_url'] as const

/** The placeholder service's SVG default, which previews cannot show. */
const PLACEHOLDER = /^(https:\/\/placehold\.co\/\d+x\d+)(?=\?|$)/

/** An unset key arrives as the string "null", not as null. */
const text = (value?: string | null): string | null =>
  typeof value === 'string' && value.trim() !== '' && value !== 'null' && value !== 'undefined' ? value.trim() : null

const isSvg = (url: string): boolean => {
  try {
    return new URL(url, 'https://x.invalid').pathname.toLowerCase().endsWith('.svg')
  } catch {
    return false
  }
}

const previewImage = (branding: PortalMetaBranding): string | null => {
  for (const key of IMAGE_KEYS) {
    const url = text(branding[key])
    if (!url) continue
    if (PLACEHOLDER.test(url)) return url.replace(PLACEHOLDER, '$1/png')
    if (!isSvg(url)) return url
  }
  return null
}

export const portalMeta = (branding: PortalMetaBranding): PortalMeta => {
  const siteName = text(branding.site_name) ?? DEFAULT_SITE_NAME

  return {
    title: `${siteName} | ${PORTAL_LABEL}`,
    siteName,
    description: text(branding.site_slogan) ?? portalDescription(siteName),
    image: previewImage(branding),
    favicon: text(branding.favicon_full_url),
  }
}

/** Sets a <meta>, creating it once; a null value removes it. */
const setMeta = (attribute: 'name' | 'property', key: string, value: string | null) => {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (value === null) {
    tag?.remove()
    return
  }
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', value)
}

export const applyPortalMeta = (branding?: PortalMetaBranding | null): void => {
  if (!branding) return

  const meta = portalMeta(branding)

  document.title = meta.title
  setMeta('name', 'description', meta.description)
  setMeta('property', 'og:site_name', meta.siteName)
  setMeta('property', 'og:title', meta.title)
  setMeta('property', 'og:description', meta.description)
  setMeta('property', 'og:image', meta.image)
  setMeta('name', 'twitter:title', meta.title)
  setMeta('name', 'twitter:description', meta.description)
  setMeta('name', 'twitter:image', meta.image)

  if (!meta.favicon) return

  // Replaced rather than edited, with a cache-buster: browsers hold on to a tab
  // icon even after its href changes.
  document.head.querySelectorAll("link[rel~='icon']").forEach((el) => el.remove())
  const icon = document.createElement('link')
  icon.rel = 'icon'
  icon.href = `${meta.favicon}${meta.favicon.includes('?') ? '&' : '?'}_t=${Date.now()}`
  document.head.appendChild(icon)
}
