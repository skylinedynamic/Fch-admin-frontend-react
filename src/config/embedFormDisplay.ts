/**
 * How a partner's embedded application form draws itself, chosen in Embed Form
 * Settings and carried in the embed code's link.
 *
 * Mirrors fch-api `App\Support\EmbedForm\EmbedFormDisplay` (link parameters)
 * and `App\Support\EmbedForm\EmbedSnippet` (height/radius bounds) - the form
 * reads only these names and values, so keep both sides in step.
 */

/** Link parameter names the form reads. */
export const EMBED_PARAM = {
  HEADER: 'header',
  FOOTER: 'footer',
  BACKGROUND: 'bg',
  FRAME: 'frame',
  /** Primary colour (buttons, steps, links), to match the partner's site. */
  PRIMARY: 'color',
} as const

export const EMBED_BACKGROUND = {
  GREY: 'grey',
  WHITE: 'white',
  TRANSPARENT: 'transparent',
  /** A colour code, sent as six hex digits without the '#' (bg=f5f7fa). */
  CUSTOM: 'custom',
} as const

export type EmbedBackground = (typeof EMBED_BACKGROUND)[keyof typeof EMBED_BACKGROUND]

export const EMBED_BACKGROUND_OPTIONS: { value: EmbedBackground; label: string }[] = [
  { value: EMBED_BACKGROUND.GREY, label: 'Light grey' },
  { value: EMBED_BACKGROUND.WHITE, label: 'White' },
  { value: EMBED_BACKGROUND.TRANSPARENT, label: 'Transparent (your page shows through)' },
  { value: EMBED_BACKGROUND.CUSTOM, label: 'Colour code' },
]

/** A colour code the form reads: '#' and six hex digits (the form takes them without the '#'). */
export const EMBED_COLOUR_PATTERN = /^#?[0-9a-f]{6}$/i

export const DEFAULT_EMBED_BACKGROUND_COLOUR = '#ffffff'

/** Where the primary colour picker starts; until chosen, the form keeps the brand colour. */
export const DEFAULT_EMBED_PRIMARY_COLOUR = '#0d6efd'

/** Fixed iframe height bounds, in px. */
export const EMBED_HEIGHT = {
  MIN: 400,
  MAX: 3000,
  DEFAULT: 800,
} as const

export const EMBED_RADIUS_MAX = 24

/** Height of the preview on the settings page; it scrolls inside. */
export const EMBED_PREVIEW_HEIGHT = 600

export type EmbedDisplayOptions = {
  header: boolean
  footer: boolean
  background: EmbedBackground
  /** Used when `background` is CUSTOM; '#rrggbb'. */
  backgroundColor: string
  frame: boolean
  /** '#rrggbb' instead of the partner's brand colour; '' keeps the brand colour. */
  primaryColor: string
  /** Grow the iframe to the form (needs the embed script) instead of a fixed height. */
  autoHeight: boolean
  height: number
  radius: number
}

/** The form's own defaults - a link with these options has no parameters. */
export const DEFAULT_EMBED_OPTIONS: EmbedDisplayOptions = {
  header: true,
  footer: true,
  background: EMBED_BACKGROUND.GREY,
  backgroundColor: DEFAULT_EMBED_BACKGROUND_COLOUR,
  frame: true,
  primaryColor: '',
  autoHeight: true,
  height: EMBED_HEIGHT.DEFAULT,
  radius: 8,
}
