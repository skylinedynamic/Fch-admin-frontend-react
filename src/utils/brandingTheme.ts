/**
 * Brand theme tokens.
 *
 * MIRROR: this file is kept byte-identical with borrower-fch/src/utils/brandingTheme.ts.
 * Change one, copy to the other. The colour maths is also mirrored in PHP
 * (app/Support/Branding/BrandPalette.php) so Blade-rendered mail and PDFs, which
 * cannot run JS, derive exactly the same values. A shared fixture guards the drift.
 *
 * The problem this solves: the sidebar canvas and every `.btn-primary` background
 * are the tenant's brand colour, but the text on top was hard coded white. That
 * makes a light brand colour unusable. Instead of storing a text colour per
 * surface, we derive one per background:
 *
 *   on_X       text/icon colour that contrasts with X   (for text ON the brand colour)
 *   X_ink      X darkened until it is legible ON WHITE  (for `.text-primary`)
 *   X_hover    X nudged darker or lighter, whichever direction has room
 *   X_subtle   X washed out for tinted backgrounds
 *
 * `on_X` and `X_ink` are different answers to different questions, and conflating
 * them is why light themes looked broken in two separate ways.
 */

export type SidebarBranding = {
    primary_color?: string | null;
    secondary_color?: string | null;
    sidebar_bg_color?: string | null;
    sidebar_text_color?: string | null;
    sidebar_icon_color?: string | null;
    sidebar_hover_bg_color?: string | null;
    sidebar_text_hover_color?: string | null;
    sidebar_icon_hover_color?: string | null;
    sidebar_active_bg_color?: string | null;
    sidebar_active_text_color?: string | null;
    sidebar_active_icon_color?: string | null;
    topbar_bg_color?: string | null;
    topbar_text_color?: string | null;
} | null | undefined;

export type SidebarColors = {
    text: string;
    icon: string;
    hoverBg: string;
    textHover: string;
    iconHover: string;
    activeBg: string;
    active: string;
    activeIcon: string;
};

export type ButtonColors = {
    bg: string;
    text: string;
    hoverBg: string;
};

/** Resting sidebar label colour the theme shipped with. */
export const SIDEBAR_LIGHT_TEXT = '#D3D8E5';
export const SIDEBAR_DARK_TEXT = '#1B1F2B';

/** Candidates for text sitting directly on a brand colour. */
export const ON_BRAND_LIGHT = '#FFFFFF';
export const ON_BRAND_DARK = '#1B1F2B';

export const DEFAULT_PRIMARY_COLOR = '#001F3F';
export const DEFAULT_SECONDARY_COLOR = '#D4AF37';

/** The top bar shipped white with grey text; unset settings reproduce that. */
export const DEFAULT_TOPBAR_BG = '#FFFFFF';
export const TOPBAR_DARK_TEXT = '#495057';

/** Minimum WCAG AA ratio for body text. */
const AA_CONTRAST = 4.5;

export const isUsableColor = (value?: string | null): boolean =>
    typeof value === 'string' && value.trim() !== '' && value !== 'null' && value !== 'undefined';

export const hexToRgb = (hex?: string | null): [number, number, number] | null => {
    if (!isUsableColor(hex)) return null;

    const expanded = (hex as string).trim().replace(
        /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
        (_match, r, g, b) => `${r}${r}${g}${g}${b}${b}`
    );
    const parsed = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expanded);

    return parsed
        ? [parseInt(parsed[1], 16), parseInt(parsed[2], 16), parseInt(parsed[3], 16)]
        : null;
};

const toHex = ([r, g, b]: [number, number, number]): string =>
    '#' + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase();

/** WCAG relative luminance, 0 for black through 1 for white. */
export const luminance = ([r, g, b]: [number, number, number]): number => {
    const [lr, lg, lb] = [r, g, b].map((channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

/** WCAG contrast ratio between two colours, 1 (identical) to 21 (black on white). */
export const contrastRatio = (a?: string | null, b?: string | null): number => {
    const rgbA = hexToRgb(a);
    const rgbB = hexToRgb(b);
    if (!rgbA || !rgbB) return 1;

    const lumA = luminance(rgbA);
    const lumB = luminance(rgbB);

    return (Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05);
};

/** Blend `color` toward `target`; `weight` is how much of `target` to take. */
export const mix = (color: string, target: string, weight: number): string => {
    const from = hexToRgb(color);
    const to = hexToRgb(target);
    if (!from || !to) return color;

    const w = Math.min(1, Math.max(0, weight));
    return toHex([
        from[0] + (to[0] - from[0]) * w,
        from[1] + (to[1] - from[1]) * w,
        from[2] + (to[2] - from[2]) * w,
    ]);
};

/**
 * Whichever of `light`/`dark` contrasts better against `background`.
 *
 * The soft defaults are deliberately not pure black/white, which reads better in
 * the common case but cannot clear AA against a mid-tone background (a 50% grey
 * tops out around 4.1:1). When that happens we escalate to pure black or white
 * rather than knowingly return an unreadable colour, so the result is always the
 * most legible option available — AA whenever the background allows it at all.
 */
export const contrastColor = (
    background?: string | null,
    light: string = SIDEBAR_LIGHT_TEXT,
    dark: string = SIDEBAR_DARK_TEXT
): string => {
    if (!hexToRgb(background)) return light;

    const preferred = contrastRatio(background, light) >= contrastRatio(background, dark) ? light : dark;
    if (contrastRatio(background, preferred) >= AA_CONTRAST) return preferred;

    return contrastRatio(background, '#000000') >= contrastRatio(background, '#FFFFFF')
        ? '#000000'
        : '#FFFFFF';
};

/**
 * `color` darkened until it clears AA against white.
 *
 * This is the colour for brand-coloured TEXT on a white page (`.text-primary`),
 * which a light brand colour otherwise renders invisible. Distinct from
 * `contrastColor`, which answers the opposite question.
 */
export const inkColor = (color?: string | null, onBackground: string = '#FFFFFF'): string => {
    if (!isUsableColor(color) || !hexToRgb(color)) return ON_BRAND_DARK;

    const base = (color as string).trim();
    if (contrastRatio(base, onBackground) >= AA_CONTRAST) return base;

    // 4% steps toward black; 20 steps (80%) is enough for even pure yellow.
    for (let step = 1; step <= 20; step++) {
        const candidate = mix(base, '#000000', step * 0.04);
        if (contrastRatio(candidate, onBackground) >= AA_CONTRAST) return candidate;
    }

    return ON_BRAND_DARK;
};

/**
 * A hover shade with room to move: darken a light colour, lighten a dark one.
 * Always shading darker turns an already-near-white brand colour to mud.
 */
export const hoverColor = (color?: string | null): string => {
    const rgb = hexToRgb(color);
    if (!rgb) return DEFAULT_PRIMARY_COLOR;

    const target = luminance(rgb) > 0.5 ? '#000000' : '#FFFFFF';
    return mix((color as string).trim(), target, 0.12);
};

/** A washed-out tint of `color`, for subtle backgrounds. */
export const subtleColor = (color?: string | null): string =>
    hexToRgb(color) ? mix((color as string).trim(), '#FFFFFF', 0.88) : '#F3F3F9';

/** HSL to hex, for generating palettes rather than reading stored colours. */
export const hslToHex = (h: number, s: number, l: number): string => {
    const hue = ((h % 360) + 360) % 360;
    const sat = Math.min(1, Math.max(0, s));
    const lig = Math.min(1, Math.max(0, l));

    const c = (1 - Math.abs(2 * lig - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lig - c / 2;

    const [r, g, b] =
        hue < 60 ? [c, x, 0] :
            hue < 120 ? [x, c, 0] :
                hue < 180 ? [0, c, x] :
                    hue < 240 ? [0, x, c] :
                        hue < 300 ? [x, 0, c] : [c, 0, x];

    return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
};

/**
 * A random but deliberately safe brand pair.
 *
 * Random hex values produce muddy, unreadable themes, so the hue is the only
 * thing genuinely random here. Saturation and lightness are pinned to ranges
 * that read as a brand: a deep, rich main colour that white text sits on
 * comfortably, and an accent rotated well away from it so the two never look
 * like a mistake. The pair is re-rolled if it lands too close together.
 */
export const randomBrandPalette = (): { primary: string; secondary: string } => {
    for (let attempt = 0; attempt < 12; attempt++) {
        const hue = Math.floor(Math.random() * 360);
        // Deep and saturated: dark enough that white labels clear AA on it.
        const primary = hslToHex(hue, 0.45 + Math.random() * 0.35, 0.14 + Math.random() * 0.12);

        // Rotate 140-220 degrees away, then lift it so it reads as a highlight.
        const accentHue = hue + 140 + Math.random() * 80;
        const secondary = hslToHex(accentHue, 0.5 + Math.random() * 0.35, 0.45 + Math.random() * 0.15);

        // The two must be clearly different, and each must carry readable text.
        if (
            contrastRatio(primary, secondary) >= 2.5 &&
            contrastRatio(primary, '#FFFFFF') >= AA_CONTRAST &&
            Math.max(
                contrastRatio(secondary, '#FFFFFF'),
                contrastRatio(secondary, ON_BRAND_DARK)
            ) >= AA_CONTRAST
        ) {
            return { primary, secondary };
        }
    }

    return { primary: DEFAULT_PRIMARY_COLOR, secondary: DEFAULT_SECONDARY_COLOR };
};

const rgbString = (color: string): string => {
    const rgb = hexToRgb(color);
    return rgb ? rgb.join(', ') : '0, 0, 0';
};

const firstUsable = (...values: Array<string | null | undefined>): string => {
    const found = values.find((value) => isUsableColor(value));
    return found ? found.trim() : SIDEBAR_LIGHT_TEXT;
};

/** The sidebar canvas: its own setting when present, otherwise the brand colour. */
export const resolveSidebarBg = (branding: SidebarBranding): string =>
    firstUsable(branding?.sidebar_bg_color, branding?.primary_color, DEFAULT_PRIMARY_COLOR);

/**
 * Every colour the sidebar menu needs, with each unset setting derived from the
 * ones above it.
 *
 * The hover and selected backgrounds are real settings rather than a hard coded
 * wash, because they are the two things an admin can actually see going wrong.
 * Their defaults reproduce what shipped before: hover is a 12% lift of the menu
 * colour toward the label colour, and the selected item sits on the accent.
 */
export const resolveSidebarColors = (branding: SidebarBranding): SidebarColors => {
    const sidebarBg = resolveSidebarBg(branding);
    const text = firstUsable(branding?.sidebar_text_color, contrastColor(sidebarBg));
    const icon = firstUsable(branding?.sidebar_icon_color, text);

    const hoverBg = firstUsable(branding?.sidebar_hover_bg_color, mix(sidebarBg, text, 0.12));
    // Derived against the hover background, not the canvas, so a light hover
    // colour flips the label instead of leaving it unreadable.
    const textHover = firstUsable(
        branding?.sidebar_text_hover_color,
        contrastColor(hoverBg, text, SIDEBAR_DARK_TEXT)
    );

    const activeBg = firstUsable(
        branding?.sidebar_active_bg_color,
        branding?.secondary_color,
        DEFAULT_SECONDARY_COLOR
    );

    const active = firstUsable(
        branding?.sidebar_active_text_color,
        contrastColor(activeBg, ON_BRAND_LIGHT, ON_BRAND_DARK)
    );

    return {
        text,
        icon,
        hoverBg,
        textHover,
        iconHover: firstUsable(branding?.sidebar_icon_hover_color, textHover),
        activeBg,
        active,
        // Follows the selected label unless set, the same way the resting icon
        // follows the resting label.
        activeIcon: firstUsable(branding?.sidebar_active_icon_color, active),
    };
};

/**
 * A button's fill, label and hover shade, all derived from one brand colour.
 *
 * Buttons deliberately have no settings of their own: the main button is the
 * main colour and the secondary button is the accent, so there is one fewer
 * place for the two to drift apart.
 */
export const resolveButtonColors = (base: string): ButtonColors => ({
    bg: base,
    text: contrastColor(base, ON_BRAND_LIGHT, ON_BRAND_DARK),
    hoverBg: hoverColor(base),
});

/** The top bar canvas and the text and icons sitting on it. */
export const resolveTopbarColors = (branding: SidebarBranding): { bg: string; text: string } => {
    const bg = firstUsable(branding?.topbar_bg_color, DEFAULT_TOPBAR_BG);
    return {
        bg,
        text: firstUsable(
            branding?.topbar_text_color,
            contrastColor(bg, ON_BRAND_LIGHT, TOPBAR_DARK_TEXT)
        ),
    };
};

/** Every CSS custom property the brand stylesheets read, as a flat map. */
export const buildBrandVars = (branding: SidebarBranding): Record<string, string> => {
    const primary = firstUsable(branding?.primary_color, DEFAULT_PRIMARY_COLOR);
    const secondary = firstUsable(branding?.secondary_color, DEFAULT_SECONDARY_COLOR);
    const sidebarBg = resolveSidebarBg(branding);
    const sidebar = resolveSidebarColors(branding);

    const onPrimary = contrastColor(primary, ON_BRAND_LIGHT, ON_BRAND_DARK);
    const onSecondary = contrastColor(secondary, ON_BRAND_LIGHT, ON_BRAND_DARK);

    const primaryButton = resolveButtonColors(primary);
    const secondaryButton = resolveButtonColors(secondary);
    const topbar = resolveTopbarColors(branding);

    return {
        '--brand-topbar-bg': topbar.bg,
        '--brand-topbar-bg-rgb': rgbString(topbar.bg),
        '--brand-topbar-color': topbar.text,
        '--brand-topbar-color-rgb': rgbString(topbar.text),

        '--brand-btn-primary-bg': primaryButton.bg,
        '--brand-btn-primary-rgb': rgbString(primaryButton.bg),
        '--brand-btn-primary-color': primaryButton.text,
        '--brand-btn-primary-hover-bg': primaryButton.hoverBg,

        '--brand-btn-secondary-bg': secondaryButton.bg,
        '--brand-btn-secondary-rgb': rgbString(secondaryButton.bg),
        '--brand-btn-secondary-color': secondaryButton.text,
        '--brand-btn-secondary-hover-bg': secondaryButton.hoverBg,

        '--brand-primary': primary,
        '--brand-primary-rgb': rgbString(primary),
        '--brand-primary-hover': hoverColor(primary),
        '--brand-primary-ink': inkColor(primary),
        '--brand-primary-subtle': subtleColor(primary),
        '--brand-on-primary': onPrimary,
        '--brand-on-primary-rgb': rgbString(onPrimary),

        '--brand-secondary': secondary,
        '--brand-secondary-rgb': rgbString(secondary),
        '--brand-secondary-hover': hoverColor(secondary),
        '--brand-secondary-ink': inkColor(secondary),
        '--brand-secondary-subtle': subtleColor(secondary),
        '--brand-on-secondary': onSecondary,

        '--brand-sidebar-bg': sidebarBg,
        '--brand-sidebar-bg-rgb': rgbString(sidebarBg),
        '--brand-on-sidebar': sidebar.text,
        '--brand-on-sidebar-rgb': rgbString(sidebar.text),
        '--sidebar-hover-bg': sidebar.hoverBg,
        '--sidebar-active-bg': sidebar.activeBg,

        // Names the existing stylesheets already use. Kept until phase 6 folds them in.
        '--primary-color': primary,
        '--secondary-color': secondary,
        '--sidebar-text-color': sidebar.text,
        '--sidebar-icon-color': sidebar.icon,
        '--sidebar-text-hover-color': sidebar.textHover,
        '--sidebar-icon-hover-color': sidebar.iconHover,
        '--sidebar-active-text-color': sidebar.active,
        '--sidebar-active-icon-color': sidebar.activeIcon,
        '--sidebar-text-color-rgb': rgbString(sidebar.text),
    };
};

/**
 * localStorage key holding a ready-to-apply variable map.
 *
 * The boot script in index.html runs before React mounts and needs the tenant's
 * colours immediately. Rather than duplicating the colour maths there — which is
 * how the old inline script drifted from this file — we persist the computed map
 * and let the boot script apply it blindly. Bump `v` if the map's shape changes,
 * so a stale blob is ignored rather than applied.
 */
export const BRAND_VARS_KEY = 'brand-css-vars';
export const BRAND_VARS_VERSION = 1;

/**
 * Publishes the brand on :root.
 *
 * Every entry point calls this and nothing else, so the login page can no longer
 * drift from the dashboard the way it did when only App.jsx set --vz-primary.
 */
export const applyBrandTheme = (branding: SidebarBranding): void => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const vars = buildBrandVars(branding);

    Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));

    // Velzon reads these with !important in custom.css, so match the priority.
    root.style.setProperty('--vz-primary', vars['--brand-primary'], 'important');
    root.style.setProperty('--vz-primary-rgb', vars['--brand-primary-rgb'], 'important');

    try {
        localStorage.setItem(BRAND_VARS_KEY, JSON.stringify({ v: BRAND_VARS_VERSION, vars }));
    } catch {
        // Private browsing or a full quota: the next load falls back to the
        // stylesheet defaults and repaints once the theme request lands.
    }
};

/** Drops the persisted brand so one tenant's colours cannot survive into another's session. */
export const clearBrandTheme = (): void => {
    try {
        localStorage.removeItem(BRAND_VARS_KEY);
    } catch {
        // Nothing to do — the value is only a paint-ahead cache.
    }
};
