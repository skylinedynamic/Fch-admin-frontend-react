import {
  DEFAULT_EMBED_OPTIONS,
  EMBED_BACKGROUND,
  EMBED_COLOUR_PATTERN,
  EMBED_HEIGHT,
  EMBED_PARAM,
  EMBED_RADIUS_MAX,
  type EmbedDisplayOptions,
} from '../config/embedFormDisplay'

/**
 * The embed code a partner pastes into their own site, built from the options
 * chosen in Embed Form Settings. fch-api reads it back for the website's
 * /apply page (EmbedSnippet), so the shape here is the one it accepts: one
 * iframe and, for automatic height, the embed script.
 */

/** Marks the iframe the embed script sizes. */
const AUTO_HEIGHT_ATTRIBUTE = 'data-fch-embed'

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)))

const escapeAttribute = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The `bg` value, or null for the form's default. A colour code goes without
 * its '#' (a link would read it as the fragment); one the form would not read
 * is left out, so the form keeps its default.
 */
const backgroundParam = (options: EmbedDisplayOptions): string | null => {
  if (options.background === EMBED_BACKGROUND.CUSTOM) {
    const colour = options.backgroundColor.trim()
    return EMBED_COLOUR_PATTERN.test(colour) ? colour.replace('#', '').toLowerCase() : null
  }
  return options.background !== DEFAULT_EMBED_OPTIONS.background ? options.background : null
}

/** The form link with only the options that differ from the form's defaults. */
export const buildEmbedUrl = (directUrl: string, options: EmbedDisplayOptions): string => {
  let url: URL
  try {
    url = new URL(directUrl)
  } catch {
    return directUrl
  }

  const flag = (on: boolean) => (on ? '1' : '0')
  if (options.header !== DEFAULT_EMBED_OPTIONS.header) url.searchParams.set(EMBED_PARAM.HEADER, flag(options.header))
  if (options.footer !== DEFAULT_EMBED_OPTIONS.footer) url.searchParams.set(EMBED_PARAM.FOOTER, flag(options.footer))
  const background = backgroundParam(options)
  if (background) url.searchParams.set(EMBED_PARAM.BACKGROUND, background)
  if (options.frame !== DEFAULT_EMBED_OPTIONS.frame) url.searchParams.set(EMBED_PARAM.FRAME, flag(options.frame))
  const primary = options.primaryColor.trim()
  if (EMBED_COLOUR_PATTERN.test(primary)) url.searchParams.set(EMBED_PARAM.PRIMARY, primary.replace('#', '').toLowerCase())

  return url.toString()
}

/**
 * The iframe, plus the script when it should grow to the form. Without a
 * script address there is no automatic height, so the fixed height is used.
 */
export const buildEmbedSnippet = (
  directUrl: string,
  scriptUrl: string | null | undefined,
  options: EmbedDisplayOptions,
  title = 'Application form',
): string => {
  const autoHeight = options.autoHeight && Boolean(scriptUrl)
  const height = autoHeight ? EMBED_HEIGHT.DEFAULT : clamp(options.height, EMBED_HEIGHT.MIN, EMBED_HEIGHT.MAX)
  const radius = clamp(options.radius, 0, EMBED_RADIUS_MAX)

  const iframe = `<iframe src="${escapeAttribute(buildEmbedUrl(directUrl, options))}"`
    + (autoHeight ? ` ${AUTO_HEIGHT_ATTRIBUTE}` : '')
    + ` width="100%" height="${height}" frameborder="0" style="border:none;border-radius:${radius}px;"`
    + ` title="${escapeAttribute(title)}"></iframe>`

  return autoHeight ? `${iframe}\n<script src="${escapeAttribute(scriptUrl as string)}" async></script>` : iframe
}
