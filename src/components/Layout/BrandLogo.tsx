import { useEffect, useState, type CSSProperties } from 'react'

interface BrandLogoProps {
  src?: string | null
  /** Shown instead of the image when it fails to load - the site's own name. */
  fallbackText?: string | null
  /** The image's alt text; defaults to the fallback text. */
  alt?: string | null
  style?: CSSProperties
  className?: string
}

/**
 * A branding logo that degrades to the site's name when the file can't be
 * loaded (deleted upload, 403, storage outage), instead of an empty
 * broken-image box (BUG-170; the borrower portals do the same since BUG-141).
 * It never falls back to the packaged host logo: on a white-label portal that
 * would show another company's mark.
 */
export default function BrandLogo({ src, fallbackText, alt, style, className }: BrandLogoProps) {
  const [failed, setFailed] = useState(false)

  // A new URL (branding refreshed, logo re-uploaded) deserves a fresh attempt.
  useEffect(() => setFailed(false), [src])

  if (failed || !src) {
    return fallbackText ? <span className="brand-logo-text fw-semibold text-truncate d-inline-block mw-100">{fallbackText}</span> : null
  }

  return <img src={src} alt={alt ?? fallbackText ?? ''} style={style} className={className} onError={() => setFailed(true)} />
}
