// Predefined list of all website pages with their paths.
// 'value' MUST match 'page_name' in seo_settings / SeoSettingSeeder exactly.
// Used in SEO settings to map page names to URL paths.
export const WEBSITE_PAGES = [
    // ── Core pages ──────────────────────────────────────────────────────────
    { label: 'Home — /',                                               value: 'Home',                     path: '/' },
    { label: 'Funding Options — /funding-options',                     value: 'Funding Options',           path: '/funding-options' },
    { label: 'Credit Builder — /credit-builder',                       value: 'Credit Builder',            path: '/credit-builder' },
    { label: 'Partner Program — /partner-program',                     value: 'Partner Program',           path: '/partner-program' },
    { label: 'Pre-Qualification — /pre-qualification',                 value: 'Pre-Qualification',         path: '/pre-qualification' },

    // ── Funding sub-pages ────────────────────────────────────────────────────
    { label: 'SBA Programs — /sba-programs',                          value: 'SBA Programs',              path: '/sba-programs' },
    { label: 'Business Acquisition — /business-acquisition',          value: 'Business Acquisition',      path: '/business-acquisition' },
    { label: 'Working Capital & Growth — /working-capital-and-growth', value: 'Working Capital & Growth', path: '/working-capital-and-growth' },
    { label: 'Real Estate — /real-estate',                            value: 'Real Estate',               path: '/real-estate' },
    { label: 'Asset & Equipment — /asset-and-equipment',              value: 'Asset & Equipment',         path: '/asset-and-equipment' },
    { label: 'Receivables & Cash Flow — /receivables-and-cash-flow',  value: 'Receivables & Cash Flow',   path: '/receivables-and-cash-flow' },
    { label: 'Bridge & Short Term — /bridge-short-term',              value: 'Bridge & Short Term',       path: '/bridge-short-term' },

    // ── Support & Info ───────────────────────────────────────────────────────
    { label: 'FAQ — /faq',                                            value: 'FAQ',                       path: '/faq' },
    { label: 'Contact Us — /contact',                                 value: 'Contact Us',                path: '/contact' }
];

export type WebsitePage = typeof WEBSITE_PAGES[number];

