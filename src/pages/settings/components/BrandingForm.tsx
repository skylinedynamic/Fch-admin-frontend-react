import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchAppConfigurations,
    saveAppConfigurations
} from '../../../modules/settings/services';
import { MODULE_BRANDING } from '../../../config/appConfig';
import { toast } from 'react-toastify';
import { BrandingSkeleton } from '../../../components/Loader/SpecificSkeletons';
import { useAuthStore } from '../../../store/auth/authStore';
import { useConfigPartner } from '../../../modules/settings/configPartner';
import { FileManagerModal } from '../../../components/FileManagerModal/FileManagerModal';
import { useQueryClient } from '@tanstack/react-query';
import {
    buildBrandVars,
    contrastRatio,
    isUsableColor,
    resolveSidebarColors,
    contrastColor,
    randomBrandPalette,
    DEFAULT_PRIMARY_COLOR,
    DEFAULT_SECONDARY_COLOR,
} from '../../../utils/brandingTheme';

const BASE_URL = (import.meta as any).env.VITE_BASE_API_URL || '';

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Below this a WCAG AA body-text pairing is considered failing. */
const AA_CONTRAST = 4.5;

/* Email chrome. Mirrors resources/views/emails/layouts/mail.blade.php, where the
   header and footer are white with a hairline rule rather than a brand band. */
const MAIL_SURFACE = '#FFFFFF';
const MAIL_RULE = '#F0F0F0';
const MAIL_FOOTER_TEXT = '#605D5D';

/* The top bar keeps the stock white chrome below 992px, so the phone preview
   must not show the tenant colour. Mirrors brand-tokens.css. */
const TOPBAR_DEFAULT_BG = '#FFFFFF';
const TOPBAR_DEFAULT_COLOR = '#495057';

function resolveLogoUrl(path: string | null | undefined) {
    if (!path || path === 'null' || path === 'undefined') return null;
    if (typeof path !== 'string') return null;
    if (path.startsWith('http')) return path;

    let clean = path.replace(/^\//, '');
    if (clean.startsWith('storage/')) {
        clean = clean.replace(/^storage\//, '');
    }

    return `${BASE_URL}/storage/${clean}`;
}

interface BrandingState {
    // Identity
    site_name: string;
    site_slogan: string;
    // Logos, one per surface
    logo_sidebar: string;
    logo_document: string;
    logo_mail: string;
    logo_mobile: string;
    favicon: string;
    // Colours
    primary_color: string;
    secondary_color: string;
    sidebar_bg_color: string;
    // Top bar
    topbar_bg_color: string;
    topbar_text_color: string;
    // Optional sidebar overrides
    sidebar_text_color: string;
    sidebar_icon_color: string;
    sidebar_hover_bg_color: string;
    sidebar_text_hover_color: string;
    sidebar_icon_hover_color: string;
    sidebar_active_bg_color: string;
    sidebar_active_text_color: string;
    sidebar_active_icon_color: string;
}

type LogoFieldKey = 'logo_sidebar' | 'logo_document' | 'logo_mail' | 'logo_mobile' | 'favicon';

/** The shape every logo slot is designed around; shown on each slot. */
const RECOMMENDED_LOGO_SIZE = '420 x 127 px';
const RECOMMENDED_MARK_SIZE = '60 x 60 px';

const EMPTY_BRANDING: BrandingState = {
    site_name: '',
    site_slogan: '',
    logo_sidebar: '',
    logo_document: '',
    logo_mail: '',
    logo_mobile: '',
    favicon: '',
    primary_color: DEFAULT_PRIMARY_COLOR,
    secondary_color: DEFAULT_SECONDARY_COLOR,
    sidebar_bg_color: '',
    topbar_bg_color: '',
    topbar_text_color: '',
    sidebar_text_color: '',
    sidebar_icon_color: '',
    sidebar_hover_bg_color: '',
    sidebar_text_hover_color: '',
    sidebar_icon_hover_color: '',
    sidebar_active_bg_color: '',
    sidebar_active_text_color: '',
    sidebar_active_icon_color: '',
};


/**
 * The sidebar menu, one row per state a menu item can be in. `auto` names the
 * resolved colour shown as the placeholder when the field is left blank, so an
 * admin can always see what they are overriding.
 */
const SIDEBAR_ROWS: Array<{
    state: string;
    describes: string;
    bgKey?: keyof BrandingState;
    bgAuto?: keyof SidebarAuto;
    textKey: keyof BrandingState;
    textAuto: keyof SidebarAuto;
    iconKey?: keyof BrandingState;
    iconAuto?: keyof SidebarAuto;
}> = [
        {
            // No background of its own: a resting item sits on the menu background,
            // which is set above this grid rather than inside it.
            state: 'Normal',
            describes: 'A menu item you are not touching',
            textKey: 'sidebar_text_color',
            textAuto: 'text',
            iconKey: 'sidebar_icon_color',
            iconAuto: 'icon',
        },
        {
            state: 'Hover',
            describes: 'While the mouse is over it',
            bgKey: 'sidebar_hover_bg_color',
            bgAuto: 'hoverBg',
            textKey: 'sidebar_text_hover_color',
            textAuto: 'textHover',
            iconKey: 'sidebar_icon_hover_color',
            iconAuto: 'iconHover',
        },
        {
            state: 'Selected',
            describes: 'The page you are currently on',
            bgKey: 'sidebar_active_bg_color',
            bgAuto: 'activeBg',
            textKey: 'sidebar_active_text_color',
            textAuto: 'active',
            iconKey: 'sidebar_active_icon_color',
            iconAuto: 'activeIcon',
        },
    ];

type SidebarAuto = {
    bg: string;
    text: string;
    icon: string;
    hoverBg: string;
    textHover: string;
    iconHover: string;
    activeBg: string;
    active: string;
    activeIcon: string;
};

/**
 * Every colour that is an override rather than a base choice, blanked together.
 * Blank means "work it out from the two brand colours", so clearing these is
 * what lets a new palette reach every surface.
 */
const CLEARED_COLOURS = {
    sidebar_bg_color: '',
    topbar_bg_color: '',
    topbar_text_color: '',
    sidebar_text_color: '',
    sidebar_icon_color: '',
    sidebar_hover_bg_color: '',
    sidebar_text_hover_color: '',
    sidebar_icon_hover_color: '',
    sidebar_active_bg_color: '',
    sidebar_active_text_color: '',
    sidebar_active_icon_color: '',
} as const;

/** Every sidebar key, for clearing them together when the section is switched off. */
const SIDEBAR_OVERRIDES: Array<keyof BrandingState> = [
    'sidebar_text_color',
    'sidebar_icon_color',
    'sidebar_hover_bg_color',
    'sidebar_text_hover_color',
    'sidebar_icon_hover_color',
    'sidebar_active_bg_color',
    'sidebar_active_text_color',
    'sidebar_active_icon_color',
];

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                      */
/* -------------------------------------------------------------------------- */

const SectionCard: React.FC<{
    icon: string;
    title: string;
    subtitle: string;
    children: React.ReactNode;
    aside?: React.ReactNode;
}> = React.memo(({ icon, title, subtitle, children, aside }) => (
    <div className="card border shadow-none mb-3">
        <div className="card-header bg-light-subtle border-bottom-dashed py-2 d-flex align-items-center gap-2">
            <i className={`${icon} fs-16 text-primary`}></i>
            <div className="flex-grow-1">
                <h6 className="mb-0 fs-13">{title}</h6>
                <span className="text-muted fs-11">{subtitle}</span>
            </div>
            {aside}
        </div>
        <div className="card-body p-3">{children}</div>
    </div>
));
SectionCard.displayName = 'SectionCard';

/**
 * A colour field. `onBackground` turns on a live contrast read-out, which is the
 * only way an admin can tell before saving that a colour pairing will be illegible.
 */
const ColorField: React.FC<{
    /** Which branding key this edits. Passed back to a stable onChange so the
        component can be memoised - an inline arrow per field would give every
        render a new prop identity and defeat memo entirely. */
    name: keyof BrandingState;
    label?: string;
    hint?: string;
    value: string;
    placeholder: string;
    error?: string;
    disabled?: boolean;
    onChange: (name: keyof BrandingState, value: string) => void;
    onBackground?: string;
}> = React.memo(({ name, label, hint, value, placeholder, error, disabled, onChange, onBackground }) => {
    const shown = value || placeholder;
    const ratio = onBackground ? contrastRatio(shown, onBackground) : null;

    const swatch = HEX_PATTERN.test(shown) ? shown : placeholder;

    return (
        <div className="py-1">
            {label && (
                <label className="form-label fw-semibold fs-12 mb-1 text-truncate d-block">{label}</label>
            )}

            {/* One compact control: a small swatch butted against the hex field.
                The checkerboard behind the swatch is what makes white read as a
                chosen colour rather than an empty box. */}
            <div
                className={`d-flex align-items-stretch rounded overflow-hidden ${error ? 'border border-danger' : 'border'}`}
                style={{ minWidth: '150px' }}
            >
                {/* The swatch floats on a white gap with its own border, so the
                    colour reads as a distinct chip rather than bleeding into the
                    field edge — and a white colour still shows its own outline. */}
                <label
                    className="position-relative flex-shrink-0 mb-0 d-flex align-items-center justify-content-center"
                    style={{
                        width: '40px',
                        minHeight: '36px',
                        padding: '5px',
                        background: '#ffffff',
                        borderRight: '1px solid rgba(0,0,0,.12)',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                    title={swatch}
                >
                    <span
                        className="d-block w-100 h-100 rounded-1 position-relative overflow-hidden"
                        style={{
                            border: '1px solid rgba(0,0,0,.28)',
                            // Checkerboard sits under the colour so white and pale
                            // shades still read as a chosen value.
                            backgroundImage:
                                'linear-gradient(45deg, #dee2e6 25%, transparent 25%, transparent 75%, #dee2e6 75%),' +
                                'linear-gradient(45deg, #dee2e6 25%, transparent 25%, transparent 75%, #dee2e6 75%)',
                            backgroundSize: '8px 8px',
                            backgroundPosition: '0 0, 4px 4px',
                            backgroundColor: '#ffffff',
                        }}
                    >
                        <span
                            className="position-absolute top-0 start-0 w-100 h-100"
                            style={{ background: swatch }}
                        ></span>
                    </span>
                    <input
                        type="color"
                        className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
                        style={{ border: 0, padding: 0, cursor: 'inherit' }}
                        value={swatch}
                        disabled={disabled}
                        onChange={e => onChange(name, e.target.value.toUpperCase())}
                    />
                </label>
                <input
                    type="text"
                    className="form-control border-0 rounded-0 shadow-none font-monospace px-2"
                    style={{
                        fontSize: '12.5px',
                        minHeight: '36px',
                        // Read-only, not faded: the value shown is the one in use.
                        background: disabled ? '#f8f9fa' : undefined,
                        cursor: disabled ? 'not-allowed' : undefined,
                    }}
                    placeholder={placeholder}
                    value={shown}
                    readOnly={disabled}
                    onChange={e => onChange(name, e.target.value)}
                />
            </div>

            {error && <div className="text-danger fs-11 mt-1">{error}</div>}
            {!error && ratio !== null && (
                <div
                    className={`fs-11 mt-1 text-truncate ${ratio >= AA_CONTRAST ? 'text-success' : 'text-danger'}`}
                    title={ratio >= AA_CONTRAST ? 'Readable' : 'Hard to read - pick a lighter or darker shade'}
                >
                    <i className={`ri-${ratio >= AA_CONTRAST ? 'checkbox-circle' : 'error-warning'}-line align-middle me-1`}></i>
                    {ratio.toFixed(1)}:1 {ratio >= AA_CONTRAST ? 'readable' : 'hard to read'}
                </div>
            )}
            {!error && ratio === null && hint && <div className="text-muted fs-11 mt-1">{hint}</div>}
        </div>
    );
});
ColorField.displayName = 'ColorField';

/**
 * Explains the contrast numbers shown under every colour field. Without this the
 * "9.8:1" reads as noise, and the one number on the page that predicts whether a
 * theme is usable gets ignored.
 */
const ContrastLegend: React.FC = React.memo(() => (
    <div className="border rounded bg-light-subtle p-3 mt-1">
        <div className="fw-semibold fs-12 mb-1">
            <i className="ri-question-line align-middle me-1"></i>
            What does “9.8:1” mean?
        </div>
        <p className="text-muted fs-11 mb-2">
            It is how far a text colour stands out from the colour behind it. Higher is easier to
            read. We check every pair for you as you type, so you can tell before saving whether
            your customers will be able to read the screen.
        </p>
        <div className="d-flex flex-wrap gap-3 fs-11">
            <span className="text-success">
                <i className="ri-checkbox-circle-line align-middle me-1"></i>
                <strong>4.5:1 or higher</strong> — comfortable to read
            </span>
            <span className="text-danger">
                <i className="ri-error-warning-line align-middle me-1"></i>
                <strong>Below 4.5:1</strong> — too faint; pick a lighter or darker shade
            </span>
        </div>
        <div className="text-muted fs-11 mt-2">
            You can still save a low score if you want to — nothing is blocked.
        </div>
    </div>
));
ContrastLegend.displayName = 'ContrastLegend';

/**
 * A logo slot. The preview sits on the background the logo will actually be used
 * on, so a white-on-transparent logo can never look fine here and vanish in the app.
 */
const LogoField: React.FC<{
    field: LogoFieldKey;
    title: string;
    usedFor: string;
    value: string;
    previewBg: string;
    /** Defaults to the wordmark size; the square mark overrides it. */
    recommended?: string;
    required?: boolean;
    error?: string;
    onSelect: (field: LogoFieldKey) => void;
    onClear: (field: LogoFieldKey) => void;
}> = React.memo(({ field, title, usedFor, value, previewBg, recommended, required, error, onSelect, onClear }) => {
    const [imgError, setImgError] = useState(false);
    const preview = resolveLogoUrl(value);

    useEffect(() => { setImgError(false); }, [value]);

    const emptyInk = contrastColor(previewBg, '#FFFFFF', '#1B1F2B');

    return (
        <div
            className={`d-flex align-items-center gap-3 rounded p-2 h-100 ${error ? 'border border-danger' : 'border'}`}
        >
            {/* The tile is the size of a real logo slot and carries the background
                the file will actually sit on, so a white logo cannot look fine
                here and then vanish in the app. */}
            <button
                type="button"
                onClick={() => onSelect(field)}
                className="border-0 rounded p-0 flex-shrink-0 d-flex align-items-center justify-content-center position-relative"
                style={{ background: previewBg, width: '96px', height: '58px', cursor: 'pointer' }}
                title="Choose a file"
            >
                {preview && !imgError ? (
                    <img
                        src={preview}
                        alt={title}
                        style={{ maxHeight: '44px', maxWidth: '84px', objectFit: 'contain' }}
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <i className="ri-image-add-line fs-20" style={{ color: emptyInk, opacity: 0.7 }}></i>
                )}
            </button>

            <div className="flex-grow-1 min-w-0">
                <div className="fw-semibold fs-12 text-truncate">
                    {title} {required && <span className="text-danger">*</span>}
                </div>
                <div className="text-muted fs-11 lh-sm">{usedFor}</div>
                <div className="text-muted fs-11 lh-sm">Recommended {recommended || RECOMMENDED_LOGO_SIZE}</div>

                <div className="d-flex align-items-center gap-2 mt-1">
                    <button type="button" className="btn btn-sm btn-light py-0 px-2 fs-11" onClick={() => onSelect(field)}>
                        {preview && !imgError ? 'Change' : 'Choose'}
                    </button>
                    {preview && !imgError && (
                        <button
                            type="button"
                            className="btn btn-sm btn-link text-danger p-0 fs-11 text-decoration-none"
                            onClick={() => onClear(field)}
                        >
                            Remove
                        </button>
                    )}
                </div>

                {error && <div className="text-danger fs-11 mt-1">{error}</div>}
            </div>
        </div>
    );
});
LogoField.displayName = 'LogoField';

/* -------------------------------------------------------------------------- */
/* Live preview                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Renders the surfaces this one page controls, using the same token map the
 * portals use at runtime. Everything here is driven by `vars`, so what an admin
 * sees is what both portals, the emails and the documents will render.
 */
/** Declared at module scope: nesting this inside BrandPreview gave it a fresh
    identity on every render, which remounted each caption's DOM on every keystroke. */
const Caption: React.FC<{ icon: string; children: React.ReactNode }> = React.memo(({ icon, children }) => (
    <div className="fs-11 text-muted mb-1 d-flex align-items-center gap-1">
        <i className={icon}></i>
        <span>{children}</span>
    </div>
));
Caption.displayName = 'Caption';

const BrandPreview: React.FC<{ branding: BrandingState; vars: Record<string, string> }> = React.memo(({ branding, vars }) => {
    // Each surface prefers its own logo and borrows a sibling only when unset, so
    // the preview shows what actually renders rather than an idealised setup.
    const anyLogo = branding.logo_sidebar || branding.logo_document || branding.logo_mail || branding.logo_mobile;
    const logoSidebar = resolveLogoUrl(branding.logo_sidebar || branding.logo_mail || anyLogo);
    const logoDocument = resolveLogoUrl(branding.logo_document || branding.logo_mobile || anyLogo);
    const logoMail = resolveLogoUrl(branding.logo_mail || branding.logo_sidebar || anyLogo);
    const logoMobile = resolveLogoUrl(branding.logo_mobile || branding.logo_document || anyLogo);

    const sidebarBg = vars['--brand-sidebar-bg'];
    const onSidebar = vars['--sidebar-text-color'];
    const onSidebarIcon = vars['--sidebar-icon-color'];
    const primary = vars['--brand-primary'];
    const onPrimary = vars['--brand-on-primary'];
    const ink = vars['--brand-primary-ink'];
    const topbarBg = vars['--brand-topbar-bg'];
    const topbarText = vars['--brand-topbar-color'];
    const btnPrimaryBg = vars['--brand-btn-primary-bg'];
    const btnPrimaryText = vars['--brand-btn-primary-color'];
    const btnSecondaryBg = vars['--brand-btn-secondary-bg'];
    const btnSecondaryText = vars['--brand-btn-secondary-color'];

    const name = branding.site_name || 'Your company';

    const menu = [
        { icon: 'ri-dashboard-2-line', label: 'Dashboard', state: 'active' },
        { icon: 'ri-file-list-3-line', label: 'Applications', state: 'hover' },
        { icon: 'ri-bill-line', label: 'Invoices', state: 'normal' },
        { icon: 'ri-group-line', label: 'Clients', state: 'normal' },
    ];

    /** Resolves one menu item to the colours its state actually renders in. */
    const menuColors = (state: string) => ({
        bg: state === 'active' ? vars['--sidebar-active-bg']
            : state === 'hover' ? vars['--sidebar-hover-bg'] : 'transparent',
        text: state === 'active' ? vars['--sidebar-active-text-color']
            : state === 'hover' ? vars['--sidebar-text-hover-color'] : onSidebar,
        icon: state === 'active' ? vars['--sidebar-active-icon-color']
            : state === 'hover' ? vars['--sidebar-icon-hover-color'] : onSidebarIcon,
    });

    return (
        <div className="row g-3">
            {/* ---------- Desktop portal ---------- */}
            <div className="col-xl-8">
                <Caption icon="ri-computer-line">Partner &amp; borrower portal</Caption>

                <div className="rounded overflow-hidden border d-flex" style={{ height: '272px' }}>
                    <div style={{ background: sidebarBg, width: '36%', minWidth: '148px', padding: '10px 0' }}>
                        <div className="px-3 pb-3 d-flex align-items-center" style={{ minHeight: '34px' }}>
                            {logoSidebar
                                ? <img src={logoSidebar} alt="" style={{ maxHeight: '26px', maxWidth: '100%', objectFit: 'contain' }} />
                                : <span className="fw-semibold fs-12 text-truncate" style={{ color: onSidebar }}>{name}</span>}
                        </div>
                        {menu.map(item => {
                            const c = menuColors(item.state);
                            return (
                                <div
                                    key={item.label}
                                    className="d-flex align-items-center gap-2 px-3 py-2"
                                    style={{ background: c.bg }}
                                >
                                    <i className={`${item.icon} fs-14`} style={{ color: c.icon }}></i>
                                    <span className="fs-11 text-truncate" style={{ color: c.text }}>{item.label}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex-grow-1 d-flex flex-column bg-body">
                        <div
                            className="d-flex align-items-center justify-content-between px-3 border-bottom"
                            style={{ background: topbarBg, minHeight: '38px' }}
                        >
                            <i className="ri-menu-line fs-16" style={{ color: topbarText }}></i>
                            <span className="d-flex align-items-center gap-2">
                                <span className="fs-11" style={{ color: topbarText }}>Alex Morgan</span>
                                <span
                                    className="rounded-circle d-inline-flex align-items-center justify-content-center"
                                    style={{ width: '22px', height: '22px', background: 'rgba(128,128,128,.18)' }}
                                >
                                    <i className="ri-user-3-fill fs-12" style={{ color: topbarText }}></i>
                                </span>
                            </span>
                        </div>

                        <div className="p-3 flex-grow-1">
                            <div className="fw-semibold fs-13 mb-1" style={{ color: ink }}>Funding overview</div>
                            <p className="fs-11 text-muted mb-2">
                                Body text stays neutral so it reads on any theme.
                            </p>

                            <div className="d-flex gap-2 mb-3">
                                <div className="border rounded p-2 flex-grow-1">
                                    <div className="fs-11 text-muted">Approved</div>
                                    <div className="fw-semibold fs-14" style={{ color: ink }}>$1.2M</div>
                                </div>
                                <div className="rounded p-2 flex-grow-1" style={{ background: vars['--brand-primary-subtle'] }}>
                                    <div className="fs-11" style={{ color: ink, opacity: 0.75 }}>Pending</div>
                                    <div className="fw-semibold fs-14" style={{ color: ink }}>$340K</div>
                                </div>
                            </div>

                            <span
                                className="d-inline-block rounded px-3 py-1 fs-11 fw-medium"
                                style={{ background: btnPrimaryBg, color: btnPrimaryText }}
                            >
                                Submit application
                            </span>
                            <span
                                className="d-inline-block rounded px-3 py-1 fs-11 fw-medium ms-2"
                                style={{ background: btnSecondaryBg, color: btnSecondaryText }}
                            >
                                View details
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ---------- Mobile ---------- */}
            <div className="col-xl-4">
                <Caption icon="ri-smartphone-line">On a phone — the bar stays white</Caption>
                <div
                    className="rounded overflow-hidden border mx-auto d-flex flex-column"
                    style={{ height: '272px', maxWidth: '196px' }}
                >
                    <div
                        className="d-flex align-items-center justify-content-between px-2 border-bottom"
                        style={{ background: TOPBAR_DEFAULT_BG, minHeight: '38px' }}
                    >
                        <i className="ri-menu-line fs-15" style={{ color: TOPBAR_DEFAULT_COLOR }}></i>
                        {logoMobile
                            ? <img src={logoMobile} alt="" style={{ maxHeight: '22px', maxWidth: '94px', objectFit: 'contain' }} />
                            : <span className="fs-11 fw-semibold text-truncate" style={{ color: TOPBAR_DEFAULT_COLOR }}>{name}</span>}
                        <i className="ri-user-3-line fs-15" style={{ color: TOPBAR_DEFAULT_COLOR }}></i>
                    </div>
                    <div className="p-2 flex-grow-1 bg-body">
                        <div className="fw-semibold fs-12 mb-2" style={{ color: ink }}>Applications</div>
                        {['Acme Ltd', 'Northwind'].map(row => (
                            <div key={row} className="border rounded p-2 mb-2">
                                <div className="fs-11 fw-medium">{row}</div>
                                <div className="fs-11 text-muted">Under review</div>
                            </div>
                        ))}
                        <span
                            className="d-block text-center rounded px-2 py-1 fs-11 fw-medium"
                            style={{ background: btnPrimaryBg, color: btnPrimaryText }}
                        >
                            New application
                        </span>
                    </div>
                </div>
            </div>

            {/* ---------- Email ---------- */}
            <div className="col-lg-6">
                <Caption icon="ri-mail-line">Email</Caption>
                {/* Header and footer are plain white with a hairline rule; only the
                    button and headings carry the brand. */}
                <div className="rounded overflow-hidden border" style={{ background: '#FFFFFF' }}>
                    <div
                        className="px-2 py-3 text-center"
                        style={{ background: MAIL_SURFACE, borderBottom: `1px solid ${MAIL_RULE}` }}
                    >
                        {logoMail
                            ? <img src={logoMail} alt="" style={{ maxHeight: '24px', maxWidth: '55%', objectFit: 'contain' }} />
                            : <span className="fs-12 fw-semibold" style={{ color: ink }}>{name}</span>}
                        {branding.site_slogan && (
                            <div className="fs-11 mt-1" style={{ color: MAIL_FOOTER_TEXT }}>
                                {branding.site_slogan}
                            </div>
                        )}
                    </div>
                    <div className="p-3" style={{ background: MAIL_SURFACE }}>
                        <div className="fs-11 mb-2" style={{ color: '#495057' }}>Hi Alex, your invoice is ready.</div>
                        <span
                            className="d-inline-block rounded px-3 py-1 fs-11 fw-medium"
                            style={{ background: btnPrimaryBg, color: btnPrimaryText }}
                        >
                            Pay invoice
                        </span>
                    </div>
                    <div
                        className="px-3 py-2 text-center fs-11"
                        style={{ background: MAIL_SURFACE, color: MAIL_FOOTER_TEXT, borderTop: `1px solid ${MAIL_RULE}` }}
                    >
                        © {new Date().getFullYear()} {name}. All rights reserved.
                    </div>
                </div>
            </div>

            {/* ---------- Invoice / documents ---------- */}
            <div className="col-lg-6">
                <Caption icon="ri-file-text-line">Invoice &amp; documents</Caption>
                <div className="rounded overflow-hidden border p-3" style={{ background: '#FFFFFF' }}>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        {logoDocument
                            ? <img src={logoDocument} alt="" style={{ maxHeight: '26px', maxWidth: '50%', objectFit: 'contain' }} />
                            : <span className="fs-12 fw-semibold" style={{ color: ink }}>{name}</span>}
                        <span className="fs-12 fw-semibold" style={{ color: ink }}>INVOICE</span>
                    </div>
                    <div className="d-flex justify-content-between fs-11 border-top pt-2" style={{ color: '#495057' }}>
                        <span>Invoice #1042</span>
                        <span className="fw-semibold" style={{ color: ink }}>$1,250.00</span>
                    </div>
                    <div className="d-flex justify-content-between fs-11 pt-1" style={{ color: '#495057' }}>
                        <span>Service fee</span>
                        <span>$95.00</span>
                    </div>
                    <div
                        className="rounded mt-3 px-3 py-2 fs-11"
                        style={{ background: vars['--brand-primary-subtle'], color: ink }}
                    >
                        Due 30 September
                    </div>
                </div>
            </div>
        </div>
    );
});
BrandPreview.displayName = 'BrandPreview';

/* -------------------------------------------------------------------------- */
/* The page                                                                   */
/* -------------------------------------------------------------------------- */

const BrandingForm: React.FC = () => {
    const user = useAuthStore((s) => s.user);
    // Partner profile › Configuration edits that partner's brand; otherwise it is the user's own.
    const configPartner = useConfigPartner();
    const partnerId = configPartner?.id ?? ((user?.partner_id as string | number | undefined) || user?.entity_id);
    const queryClient = useQueryClient();

    const [fetching, setFetching] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [showFileManager, setShowFileManager] = useState<boolean>(false);
    const [activeField, setActiveField] = useState<LogoFieldKey | null>(null);
    const [errors, setErrors] = useState<any>({});
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
    const [matchSidebarToPrimary, setMatchSidebarToPrimary] = useState<boolean>(true);

    const [branding, setBranding] = useState<BrandingState>(EMPTY_BRANDING);

    useEffect(() => {
        loadBranding();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadBranding = async () => {
        try {
            setFetching(true);
            const res: any = await fetchAppConfigurations(MODULE_BRANDING, configPartner?.id);
            const saved = res?.data || {};

            const clean = (value: any, fallback = '') =>
                isUsableColor(value) || (typeof value === 'string' && value.trim() !== '' && value !== 'null')
                    ? String(value).trim()
                    : fallback;

            setBranding({
                site_name: clean(saved.site_name),
                site_slogan: clean(saved.site_slogan),
                // One key per surface. The legacy names (primary_logo,
                // secondary_logo, logo_on_light, logo_on_dark, logo_mark) were
                // backfilled into these and removed, so there is nothing left to
                // fall back through here.
                logo_sidebar: clean(saved.logo_sidebar),
                logo_document: clean(saved.logo_document),
                logo_mail: clean(saved.logo_mail),
                logo_mobile: clean(saved.logo_mobile),
                favicon: clean(saved.favicon),
                primary_color: clean(saved.primary_color, DEFAULT_PRIMARY_COLOR),
                secondary_color: clean(saved.secondary_color, DEFAULT_SECONDARY_COLOR),
                sidebar_bg_color: clean(saved.sidebar_bg_color),
                topbar_bg_color: clean(saved.topbar_bg_color),
                topbar_text_color: clean(saved.topbar_text_color),
                sidebar_text_color: clean(saved.sidebar_text_color),
                sidebar_icon_color: clean(saved.sidebar_icon_color),
                sidebar_hover_bg_color: clean(saved.sidebar_hover_bg_color),
                sidebar_text_hover_color: clean(saved.sidebar_text_hover_color),
                sidebar_icon_hover_color: clean(saved.sidebar_icon_hover_color),
                sidebar_active_bg_color: clean(saved.sidebar_active_bg_color),
                sidebar_active_text_color: clean(saved.sidebar_active_text_color),
                sidebar_active_icon_color: clean(saved.sidebar_active_icon_color),
            });

            setMatchSidebarToPrimary(!isUsableColor(saved.sidebar_bg_color));
            setShowAdvanced(SIDEBAR_OVERRIDES.some((key) => isUsableColor(saved[key])));
        } catch (e) {
            console.error(e);
            toast.error('Could not load your brand settings.');
        } finally {
            setFetching(false);
        }
    };

    const set = useCallback(<K extends keyof BrandingState>(key: K, value: BrandingState[K]) => {
        setBranding(prev => ({ ...prev, [key]: value }));
        setErrors((prev: any) => ({ ...prev, [key]: null }));
    }, []);

    /** Passed straight to every ColorField, so their memo holds across renders. */
    const setColor = useCallback((name: keyof BrandingState, value: string) => {
        set(name, value);
    }, [set]);

    const openLogoPicker = useCallback((field: LogoFieldKey) => {
        setActiveField(field);
        setShowFileManager(true);
    }, []);

    const clearLogo = useCallback((field: LogoFieldKey) => {
        set(field, '');
    }, [set]);

    /** The effective palette, with every unset value resolved exactly as the portals resolve it. */
    const vars = useMemo(
        () => buildBrandVars({
            primary_color: branding.primary_color || DEFAULT_PRIMARY_COLOR,
            secondary_color: branding.secondary_color || DEFAULT_SECONDARY_COLOR,
            sidebar_bg_color: matchSidebarToPrimary ? '' : branding.sidebar_bg_color,
            sidebar_text_color: showAdvanced ? branding.sidebar_text_color : '',
            sidebar_icon_color: showAdvanced ? branding.sidebar_icon_color : '',
            sidebar_hover_bg_color: showAdvanced ? branding.sidebar_hover_bg_color : '',
            sidebar_text_hover_color: showAdvanced ? branding.sidebar_text_hover_color : '',
            sidebar_icon_hover_color: showAdvanced ? branding.sidebar_icon_hover_color : '',
            sidebar_active_bg_color: showAdvanced ? branding.sidebar_active_bg_color : '',
            sidebar_active_text_color: showAdvanced ? branding.sidebar_active_text_color : '',
            sidebar_active_icon_color: showAdvanced ? branding.sidebar_active_icon_color : '',
            topbar_bg_color: branding.topbar_bg_color,
            topbar_text_color: branding.topbar_text_color,
        }),
        [branding, matchSidebarToPrimary, showAdvanced]
    );

    const sidebarBg = vars['--brand-sidebar-bg'];

    const handleFileSelection = (selectedFiles: any[]) => {
        if (!selectedFiles?.length || !activeField) return;
        const file = selectedFiles[0];

        const allowed = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
        const isMark = activeField === 'favicon';
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext && !allowed.includes(ext) && !(isMark && ext === 'ico')) {
            setErrors((prev: any) => ({
                ...prev,
                [activeField]: isMark
                    ? 'Choose a PNG, JPG, SVG, ICO or WebP file'
                    : 'Choose a PNG, JPG, SVG or WebP file',
            }));
            setShowFileManager(false);
            return;
        }

        if (file.size && file.size > 2 * 1024 * 1024) {
            setErrors((prev: any) => ({ ...prev, [activeField]: 'File size must not exceed 2MB' }));
            setShowFileManager(false);
            return;
        }

        const cleanPath = file.path.trim().replace(/^\/+/, '');
        // Another partner's logos live in that partner's folder.
        const eType = configPartner ? 'partners' : (user?.entity_type || 'site-settings');
        const isPartner = eType.includes('Partner') || eType === 'partners';
        const prefix = isPartner ? `partners/${partnerId}` : 'site-settings';

        let finalPath = cleanPath;
        if (!cleanPath.startsWith(prefix) && !cleanPath.startsWith('http')) {
            finalPath = `${prefix}/${cleanPath}`;
        }
        finalPath = finalPath.replace(/\/+/g, '/').replace(/^storage\//, '');

        set(activeField, finalPath);
        setShowFileManager(false);
    };

    const validate = () => {
        const next: any = {};

        if (!branding.site_name.trim()) {
            next.site_name = 'Site name is required.';
        }

        // At least one logo, rather than one per surface: partners onboarded under
        // the old schema have only a single logo, and requiring all three would
        // lock every one of them out of saving. Unset surfaces borrow a sibling.
        if (!branding.logo_sidebar.trim() && !branding.logo_document.trim()
            && !branding.logo_mail.trim() && !branding.logo_mobile.trim()) {
            next.logo_sidebar = 'Upload at least one logo.';
        }

        const colorFields: Array<keyof BrandingState> = [
            'primary_color', 'secondary_color', 'sidebar_bg_color',
            'topbar_bg_color', 'topbar_text_color',
            ...SIDEBAR_OVERRIDES,
        ];
        colorFields.forEach((key) => {
            const value = String(branding[key] || '').trim();
            if (value && !HEX_PATTERN.test(value)) {
                next[key] = 'Use a 6-digit hex colour, e.g. #1A2B3C';
            }
        });

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!validate()) {
            toast.error('Please fix the highlighted fields.');
            return;
        }

        try {
            setSaving(true);

            const payload: Record<string, string> = {
                ...branding,
                // Unchecking "match primary" is what makes the sidebar independent;
                // an empty value means "follow the primary colour".
                sidebar_bg_color: matchSidebarToPrimary ? '' : branding.sidebar_bg_color,
            };

            // Blank overrides mean "derive from the brand colours", which is what an
            // admin who turned this section off is asking for.
            if (!showAdvanced) {
                SIDEBAR_OVERRIDES.forEach((key) => { payload[key] = ''; });
            }

            const response: any = await saveAppConfigurations(MODULE_BRANDING, payload, configPartner?.id);
            queryClient.invalidateQueries({ queryKey: ['globalConfigurations'] });
            queryClient.invalidateQueries({ queryKey: ['public-site-settings'] });
            toast.success(response?.message || 'Brand settings saved');
            setErrors({});
        } catch (err: any) {
            if (err?.response?.status === 422) {
                setErrors(err.response.data.errors || {});
                toast.error('Please fix the highlighted fields.');
            } else {
                toast.error('Failed to save brand settings.');
            }
        } finally {
            setSaving(false);
        }
    };

    /** Everything back to the colours the product ships with. */
    const handleResetColors = () => {
        setMatchSidebarToPrimary(true);
        setShowAdvanced(false);
        setBranding(prev => ({
            ...prev,
            primary_color: DEFAULT_PRIMARY_COLOR,
            secondary_color: DEFAULT_SECONDARY_COLOR,
            ...CLEARED_COLOURS,
        }));
    };

    /**
     * A fresh pair of brand colours.
     *
     * Only the two base colours are set; every override is cleared so the new
     * pair actually takes effect everywhere rather than being masked by a colour
     * left over from the previous theme.
     */
    const handleRandomPalette = () => {
        const { primary, secondary } = randomBrandPalette();
        setMatchSidebarToPrimary(true);
        setShowAdvanced(false);
        setBranding(prev => ({
            ...prev,
            primary_color: primary,
            secondary_color: secondary,
            ...CLEARED_COLOURS,
        }));
        setErrors((prev: any) => ({ ...prev, primary_color: null, secondary_color: null }));
    };

    /**
     * What each sidebar colour resolves to right now. Shown as the placeholder in
     * every field, so a blank field always displays the value it would inherit
     * rather than leaving the admin guessing.
     */
    const resolved = useMemo(() => resolveSidebarColors({
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        sidebar_bg_color: matchSidebarToPrimary ? '' : branding.sidebar_bg_color,
        ...(showAdvanced ? {
            sidebar_text_color: branding.sidebar_text_color,
            sidebar_icon_color: branding.sidebar_icon_color,
            sidebar_hover_bg_color: branding.sidebar_hover_bg_color,
            sidebar_text_hover_color: branding.sidebar_text_hover_color,
            sidebar_icon_hover_color: branding.sidebar_icon_hover_color,
            sidebar_active_bg_color: branding.sidebar_active_bg_color,
            sidebar_active_text_color: branding.sidebar_active_text_color,
            sidebar_active_icon_color: branding.sidebar_active_icon_color,
        } : {}),
    }), [branding, matchSidebarToPrimary, showAdvanced]);

    const autoSidebar: SidebarAuto = useMemo(() => ({
        bg: vars['--brand-sidebar-bg'],
        text: resolved.text,
        icon: resolved.icon,
        hoverBg: resolved.hoverBg,
        textHover: resolved.textHover,
        iconHover: resolved.iconHover,
        activeBg: resolved.activeBg,
        active: resolved.active,
        activeIcon: resolved.activeIcon,
    }), [resolved, vars]);

    return (
        <div className="animate__animated animate__fadeIn">
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center gap-3">
                    <div className="avatar-sm flex-shrink-0">
                        <div className="avatar-title bg-info-subtle text-info rounded fs-20">
                            <i className="ri-brush-line"></i>
                        </div>
                    </div>
                    <div>
                        <h5 className="card-title mb-0 fs-15">Brand Settings</h5>
                        <p className="text-muted mb-0 fs-13">
                            One place for your logos and colours. Applies to the partner portal, the borrower
                            portal, your emails and your invoices.
                        </p>
                    </div>
                </div>

                <div className="card-body p-4">
                    {fetching ? (
                        <BrandingSkeleton />
                    ) : (
                        <form onSubmit={handleSave}>
                            {/* ---------------- Live preview ---------------- */}
                            <SectionCard
                                icon="ri-eye-line"
                                title="Preview"
                                subtitle="Updates as you edit — this is what your customers will see"
                            >
                                <BrandPreview branding={branding} vars={vars} />
                            </SectionCard>

                            {/* ---------------- Identity ---------------- */}
                            <SectionCard
                                icon="ri-profile-line"
                                title="Identity"
                                subtitle="Your name as it appears in the portals, emails and documents"
                            >
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold fs-13 mb-1">
                                            Site name <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.site_name ? 'is-invalid' : ''}`}
                                            placeholder="Acme Capital"
                                            value={branding.site_name}
                                            onChange={e => set('site_name', e.target.value)}
                                        />
                                        {errors.site_name
                                            ? <div className="invalid-feedback fs-11">{errors.site_name}</div>
                                            : <div className="text-muted fs-11 mt-1">Browser tab, email sender name, invoice header.</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold fs-13 mb-1">Slogan</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Funding, simplified"
                                            value={branding.site_slogan}
                                            onChange={e => set('site_slogan', e.target.value)}
                                        />
                                        <div className="text-muted fs-11 mt-1">Shown under your logo in emails and documents.</div>
                                    </div>
                                </div>
                            </SectionCard>

                            {/* ---------------- Logos ---------------- */}
                            <SectionCard
                                icon="ri-image-2-line"
                                title="Logos"
                                subtitle="One per place your logo appears, each previewed on the background it actually sits on. PNG, JPG, SVG or WebP, up to 2MB."
                            >
                                <div className="row g-2 row-cols-1 row-cols-lg-2">
                                    <div>
                                        <LogoField
                                            title="Sidebar"
                                            usedFor="The menu in both portals. Usually your white version."
                                            value={branding.logo_sidebar}
                                            previewBg={sidebarBg}
                                            error={errors.logo_sidebar}
                                            field="logo_sidebar"
                                            onSelect={openLogoPicker}
                                            onClear={clearLogo}
                                        />
                                    </div>
                                    <div>
                                        <LogoField
                                            title="Mobile"
                                            usedFor="Phones and tablets, where the logo moves into the top bar."
                                            value={branding.logo_mobile}
                                            previewBg={TOPBAR_DEFAULT_BG}
                                            error={errors.logo_mobile}
                                            field="logo_mobile"
                                            onSelect={openLogoPicker}
                                            onClear={clearLogo}
                                        />
                                    </div>
                                    <div>
                                        <LogoField
                                            title="Documents"
                                            usedFor="Invoices, PDFs and the login card. Usually your dark version."
                                            value={branding.logo_document}
                                            previewBg="#FFFFFF"
                                            error={errors.logo_document}
                                            field="logo_document"
                                            onSelect={openLogoPicker}
                                            onClear={clearLogo}
                                        />
                                    </div>
                                    <div>
                                        <LogoField
                                            title="Email"
                                            usedFor="The header of every email you send. On white, so usually your dark version."
                                            value={branding.logo_mail}
                                            previewBg="#FFFFFF"
                                            error={errors.logo_mail}
                                            field="logo_mail"
                                            onSelect={openLogoPicker}
                                            onClear={clearLogo}
                                        />
                                    </div>
                                    <div>
                                        <LogoField
                                            title="Square mark"
                                            usedFor="Browser tab and collapsed menu. Must read on both backgrounds."
                                            recommended={RECOMMENDED_MARK_SIZE}
                                            value={branding.favicon}
                                            previewBg={`linear-gradient(90deg, ${sidebarBg} 0 50%, #FFFFFF 50% 100%)`}
                                            error={errors.favicon}
                                            field="favicon"
                                            onSelect={openLogoPicker}
                                            onClear={clearLogo}
                                        />
                                    </div>
                                </div>

                                {(() => {
                                    const missing = ([
                                        ['logo_sidebar', 'sidebar'],
                                        ['logo_mobile', 'mobile'],
                                        ['logo_document', 'documents'],
                                        ['logo_mail', 'email'],
                                    ] as const).filter(([key]) => !branding[key].trim()).map(([, label]) => label);
                                    const hasAny = !!(branding.logo_sidebar || branding.logo_document
                                        || branding.logo_mail || branding.logo_mobile);

                                    if (!hasAny || missing.length === 0) return null;

                                    return (
                                        <div className="alert alert-warning fs-12 mt-3 mb-0 py-2">
                                            <i className="ri-alert-line align-middle me-1"></i>
                                            No logo set for <strong>{missing.join(', ')}</strong> — those places will
                                            borrow one of your other logos. That works, but a white logo on a white
                                            invoice will be invisible, so set each one to be sure.
                                        </div>
                                    );
                                })()}
                            </SectionCard>

                            {/* ---------------- Base colours ---------------- */}
                            <SectionCard
                                icon="ri-palette-line"
                                title="Your two brand colours"
                                subtitle="Everything below starts from these. Set them once, then only change a section further down if you want it to differ."
                                aside={
                                    <div className="d-flex gap-2 flex-shrink-0">
                                        <button type="button" className="btn btn-sm btn-soft-primary" onClick={handleRandomPalette}>
                                            <i className="ri-shuffle-line align-middle me-1"></i> Surprise me
                                        </button>
                                        <button type="button" className="btn btn-sm btn-soft-danger" onClick={handleResetColors}>
                                            <i className="ri-refresh-line align-middle me-1"></i> Reset all colours
                                        </button>
                                    </div>
                                }
                            >
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="border rounded p-3 h-100">
                                            <ColorField
                                                label="Main colour"
                                                value={branding.primary_color}
                                                placeholder={DEFAULT_PRIMARY_COLOR}
                                                error={errors.primary_color}
                                                name="primary_color"
                                                onChange={setColor}
                                                onBackground={vars['--brand-on-primary']}
                                            />
                                            <div className="fs-11 text-muted mt-2">
                                                Main buttons, links, the sidebar and your email header.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="border rounded p-3 h-100">
                                            <ColorField
                                                label="Accent colour"
                                                value={branding.secondary_color}
                                                placeholder={DEFAULT_SECONDARY_COLOR}
                                                error={errors.secondary_color}
                                                name="secondary_color"
                                                onChange={setColor}
                                                onBackground={vars['--brand-on-secondary']}
                                            />
                                            <div className="fs-11 text-muted mt-2">
                                                Secondary buttons, badges and the selected menu item.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="alert alert-info fs-12 mt-3 mb-0 py-2">
                                    <i className="ri-information-line align-middle me-1"></i>
                                    Text colours are worked out for you: anything sitting on these colours flips
                                    between light and dark to stay readable. You can override any of it below.
                                </div>
                            </SectionCard>

                            {/* ---------------- Top bar ---------------- */}
                            <SectionCard
                                icon="ri-layout-top-line"
                                title="Top bar"
                                subtitle="The bar across the top of both portals, on desktop. On phones and tablets it always stays white."
                            >
                                <div className="row g-3 align-items-start">
                                    <div className="col-sm-6 col-lg-3">
                                        <ColorField
                                            label="Background"
                                            value={branding.topbar_bg_color}
                                            placeholder={vars['--brand-topbar-bg']}
                                            error={errors.topbar_bg_color}
                                            name="topbar_bg_color"
                                            onChange={setColor}
                                            onBackground={vars['--brand-topbar-color']}
                                        />
                                        <div className="text-muted fs-11 mt-1">Leave blank to keep it white.</div>
                                    </div>
                                    <div className="col-sm-6 col-lg-3">
                                        <ColorField
                                            label="Text &amp; icons"
                                            value={branding.topbar_text_color}
                                            placeholder={vars['--brand-topbar-color']}
                                            error={errors.topbar_text_color}
                                            name="topbar_text_color"
                                            onChange={setColor}
                                            onBackground={vars['--brand-topbar-bg']}
                                        />
                                        <div className="text-muted fs-11 mt-1">
                                            Leave blank and this follows the background.
                                        </div>
                                    </div>
                                    <div className="col-lg-6">
                                        <div className="fs-11 text-muted mb-1">Preview (desktop)</div>
                                        <div
                                            className="rounded border d-flex align-items-center justify-content-between px-3 py-2"
                                            style={{ background: vars['--brand-topbar-bg'], minHeight: '46px' }}
                                        >
                                            <span className="d-flex align-items-center gap-2">
                                                <i className="ri-menu-line fs-16" style={{ color: vars['--brand-topbar-color'] }}></i>
                                                <span className="fs-11" style={{ color: vars['--brand-topbar-color'] }}>
                                                    {branding.site_name || 'Your company'}
                                                </span>
                                            </span>
                                            <span className="fs-11" style={{ color: vars['--brand-topbar-color'] }}>Alex</span>
                                        </div>
                                    </div>
                                </div>
                            </SectionCard>

                            {/* ---------------- Sidebar ---------------- */}
                            <SectionCard
                                icon="ri-layout-left-line"
                                title="Sidebar menu"
                                subtitle="The menu down the left of both portals"
                            >
                                <div className="row g-3">
                                    {/* A real menu on the left showing all three states at once, so the
                                        table on the right is read as "these rows are those items". */}
                                    <div className="col-lg-4">
                                        <div className="fs-11 text-muted mb-1">Your menu</div>
                                        <div
                                            className="rounded overflow-hidden border"
                                            style={{ background: autoSidebar.bg, padding: '10px 0' }}
                                        >
                                            {SIDEBAR_ROWS.map(row => {
                                                const rowBg = row.bgAuto ? autoSidebar[row.bgAuto] : 'transparent';
                                                const rowText = autoSidebar[row.textAuto];
                                                const rowIcon = row.iconAuto ? autoSidebar[row.iconAuto] : rowText;

                                                return (
                                                    <div
                                                        key={row.state}
                                                        className="d-flex align-items-center justify-content-between px-3 py-2"
                                                        style={{ background: rowBg }}
                                                    >
                                                        <span className="d-flex align-items-center gap-2">
                                                            <i className="ri-dashboard-2-line fs-15" style={{ color: rowIcon }}></i>
                                                            <span className="fs-12" style={{ color: rowText }}>Dashboard</span>
                                                        </span>
                                                        <span className="fs-11" style={{ color: rowText, opacity: 0.6 }}>
                                                            {row.state.toLowerCase()}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-3">
                                            <ColorField
                                                label="Menu background"
                                                value={matchSidebarToPrimary ? branding.primary_color || DEFAULT_PRIMARY_COLOR : branding.sidebar_bg_color}
                                                placeholder={DEFAULT_PRIMARY_COLOR}
                                                error={errors.sidebar_bg_color}
                                                disabled={matchSidebarToPrimary}
                                                name="sidebar_bg_color"
                                                onChange={setColor}
                                                onBackground={autoSidebar.text}
                                            />
                                            <div className="form-check mt-1">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="matchSidebar"
                                                    checked={matchSidebarToPrimary}
                                                    onChange={e => setMatchSidebarToPrimary(e.target.checked)}
                                                />
                                                <label className="form-check-label fs-12" htmlFor="matchSidebar">
                                                    Same as my main colour
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* States as rows, the three things you can colour as columns, so
                                        each label is written once instead of repeated per state. */}
                                    <div className="col-lg-8">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="fw-semibold fs-13">Menu item colours</span>
                                            <div className="form-check form-switch mb-0">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    role="switch"
                                                    id="advancedToggle"
                                                    checked={showAdvanced}
                                                    onChange={e => setShowAdvanced(e.target.checked)}
                                                />
                                                <label className="form-check-label fs-11 text-muted" htmlFor="advancedToggle">
                                                    Set manually
                                                </label>
                                            </div>
                                        </div>

                                        {showAdvanced ? (
                                            <div className="table-responsive">
                                                <table className="table table-sm align-middle mb-0">
                                                    <thead>
                                                        <tr className="fs-11 text-muted">
                                                            <th className="border-0 ps-0" style={{ width: '18%' }}>State</th>
                                                            <th className="border-0">Background</th>
                                                            <th className="border-0">Text</th>
                                                            <th className="border-0 pe-0">Icon</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {SIDEBAR_ROWS.map(row => {
                                                            const rowBg = row.bgAuto ? autoSidebar[row.bgAuto] : autoSidebar.bg;
                                                            const rowText = autoSidebar[row.textAuto];
                                                            const rowIcon = row.iconAuto ? autoSidebar[row.iconAuto] : rowText;

                                                            return (
                                                                <tr key={row.state}>
                                                                    <td className="ps-0">
                                                                        <div className="fw-semibold fs-12">{row.state}</div>
                                                                        <div className="text-muted fs-11 lh-sm">{row.describes}</div>
                                                                    </td>
                                                                    <td>
                                                                        {row.bgKey ? (
                                                                            <ColorField
                                                                                value={String(branding[row.bgKey] || '')}
                                                                                placeholder={rowBg}
                                                                                error={errors[row.bgKey]}
                                                                                name={row.bgKey!}
                                                                                onChange={setColor}
                                                                            />
                                                                        ) : (
                                                                            <span className="text-muted fs-11">
                                                                                uses the menu background
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <ColorField
                                                                            value={String(branding[row.textKey] || '')}
                                                                            placeholder={rowText}
                                                                            error={errors[row.textKey]}
                                                                            name={row.textKey!}
                                                                            onChange={setColor}
                                                                            onBackground={rowBg}
                                                                        />
                                                                    </td>
                                                                    <td className="pe-0">
                                                                        {row.iconKey && (
                                                                            <ColorField
                                                                                value={String(branding[row.iconKey] || '')}
                                                                                placeholder={rowIcon}
                                                                                error={errors[row.iconKey]}
                                                                                name={row.iconKey!}
                                                                                onChange={setColor}
                                                                                onBackground={rowBg}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="border rounded p-3">
                                                <div className="text-muted fs-12 mb-2">
                                                    These are worked out from your menu background and accent colour.
                                                    Turn on <em>Set manually</em> to choose each one.
                                                </div>
                                                <div className="d-flex flex-wrap gap-3">
                                                    {SIDEBAR_ROWS.map(row => {
                                                        const rowText = autoSidebar[row.textAuto];
                                                        const rowIcon = row.iconAuto ? autoSidebar[row.iconAuto] : rowText;
                                                        const rowBg = row.bgAuto ? autoSidebar[row.bgAuto] : autoSidebar.bg;

                                                        return (
                                                            <div key={row.state} className="d-flex align-items-center gap-2">
                                                                <span className="d-inline-flex">
                                                                    {[rowBg, rowText, rowIcon].map((c, i) => (
                                                                        <span
                                                                            key={i}
                                                                            className="d-inline-block border"
                                                                            style={{
                                                                                width: '16px',
                                                                                height: '16px',
                                                                                background: c,
                                                                                marginLeft: i ? '-1px' : 0,
                                                                            }}
                                                                        ></span>
                                                                    ))}
                                                                </span>
                                                                <span className="fs-11 text-muted">{row.state}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </SectionCard>

                            <ContrastLegend />

                            {/* ---------------- Save ---------------- */}
                            <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-4">
                                <button
                                    type="button"
                                    className="btn btn-light"
                                    disabled={saving}
                                    onClick={loadBranding}
                                >
                                    Discard changes
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-primary px-4 d-flex align-items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            <span>Saving…</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-save-line fs-16"></i>
                                            <span>Save brand settings</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <FileManagerModal
                isOpen={showFileManager}
                toggle={() => setShowFileManager(!showFileManager)}
                selectionMode={true}
                onSelectFiles={handleFileSelection}
                entityType="partners"
                entityId={partnerId || 0}
                getAll={false}
            />
        </div>
    );
};

export default BrandingForm;
