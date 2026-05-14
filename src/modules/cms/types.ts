export interface Category {
    id: number;
    name: string;
    slug?: string;
    created_at?: string;
}

export interface Tag {
    id: number;
    name: string;
    slug?: string;
}

export interface Blog {
    id?: number;
    title: string;
    slug: string;
    category_id: number | string;
    summary: string;
    content: string;
    is_published: boolean | number;
    is_featured: boolean | number;
    featured_image?: string;
    meta_title?: string;
    meta_description?: string;
    keywords?: string;
    blog_tag_id?: (number | string)[];
    category?: Category;
    tag?: Tag;
    created_at?: string;
}

export interface BlogFormData {
    title: string;
    slug: string;
    category_id: string | number;
    summary: string;
    content: string;
    is_published: boolean;
    is_featured: boolean;
    meta_title: string;
    meta_description: string;
    keywords: string;
    blog_tag_id: (string | number)[];
}

// ─── Site Settings ───────────────────────────────────────────────────────────

export interface SocialLink {
    platform: string;
    icon: string;
    url: string;
    isCustom?: boolean;
}

export interface SiteSettingsData {
    site_name: string;
    site_slogan: string;
    address: string;
    phone_number: string;
    email: string;
    map_iframe: string;
}

export interface SiteSetting extends SiteSettingsData {
    id?: number;
    partner_id?: number;
    header_logo?: string;
    footer_logo?: string;
    partner_logo?: string;
    favicon?: string;
    partner_favicon?: string;
    borrower_favicon?: string;
    social_links?: string | SocialLink[];
    agreement_signing_enabled?: string;
    google_measurement_id?: string;
    recaptcha_site_key?: string;
    recaptcha_secret_key?: string;
    created_at?: string;
    updated_at?: string;
}

export const SOCIAL_PLATFORMS: { label: string; value: string; icon: string }[] = [
    { label: 'Facebook',     value: 'Facebook',     icon: 'ri-facebook-fill' },
    { label: 'LinkedIn',     value: 'LinkedIn',     icon: 'ri-linkedin-fill' },
    { label: 'Twitter (X)',  value: 'Twitter (X)',  icon: 'ri-twitter-x-fill' },
    { label: 'Instagram',    value: 'Instagram',    icon: 'ri-instagram-fill' },
    { label: 'YouTube',      value: 'YouTube',      icon: 'ri-youtube-fill' },
    { label: 'Pinterest',    value: 'Pinterest',    icon: 'ri-pinterest-fill' },
    { label: 'TikTok',       value: 'TikTok',       icon: 'ri-tiktok-fill' },
    { label: 'GitHub',       value: 'GitHub',       icon: 'ri-github-fill' },
    { label: 'Discord',      value: 'Discord',      icon: 'ri-discord-fill' },

    // Important additions
    { label: 'WhatsApp',     value: 'WhatsApp',     icon: 'ri-whatsapp-fill' },
    { label: 'Telegram',     value: 'Telegram',     icon: 'ri-telegram-fill' },
    { label: 'Messenger',    value: 'Messenger',    icon: 'ri-messenger-fill' },
    { label: 'Reddit',       value: 'Reddit',       icon: 'ri-reddit-fill' },
    { label: 'Snapchat',     value: 'Snapchat',     icon: 'ri-snapchat-fill' },

    // Business / portfolio
    { label: 'Behance',      value: 'Behance',      icon: 'ri-behance-fill' },
    { label: 'Dribbble',     value: 'Dribbble',     icon: 'ri-dribbble-fill' },

    { label: 'IMO',          value: 'IMO',          icon: 'ri-chat-3-fill' },
];
