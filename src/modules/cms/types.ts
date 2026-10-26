import type { PaginatedApiResponse, SingleApiResponse } from '../application/types';

export interface Category {
    id: number;
    name: string;
    slug?: string;
    description?: string;
    blogs_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface Tag {
    id: number;
    name: string;
    slug?: string;
    blogs_count?: number;
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
    og_image?: string;
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

// ─── Blog list / mutation payloads ───────────────────────────────────────────

export interface BlogListParams {
    page?: number;
    per_page?: number;
    search?: string;
    category_id?: string | number;
    status?: string;
    is_featured?: boolean | string;
    sort_field?: string;
    sort_order?: string;
}

export interface BlogStatistics {
    total: number;
    published: number;
    featured: number;
    categories: number;
}

export interface BlogListResponse extends PaginatedApiResponse<Blog> {
    statistics: BlogStatistics;
}

export interface CategoryPayload {
    name: string;
    slug?: string;
}

export interface TagPayload {
    name: string;
    slug?: string;
}

// ─── SEO Settings ─────────────────────────────────────────────────────────────

export interface SeoSetting {
    id?: number;
    partner_id?: number;
    page_name: string;
    path: string;
    meta_title?: string;
    meta_description?: string;
    keywords?: string;
    og_image?: string;
    // Not present in the current seo_settings schema/resource (see BlogController/SeoRequest
    // in fch-backend-api) — kept optional here only because SeoSettingEdit.tsx still reads/writes
    // them; they are always undefined coming back from the API today.
    entity_type?: string;
    entity_id?: number;
    created_at?: string;
    updated_at?: string;
}

export interface SeoListParams {
    page?: number;
    per_page?: number;
    search?: string;
    sort_field?: string;
    sort_order?: string;
    /** Column filters: field => {value, match_mode} (BUG-124). */
    filters?: Record<string, { value: string; match_mode: string }>;
}

export type SeoListResponse = PaginatedApiResponse<SeoSetting>;
export type BlogResponse = SingleApiResponse<Blog>;
export type CategoryResponse = SingleApiResponse<Category>;
export type CategoryListResponse = SingleApiResponse<Category[]>;
export type TagResponse = SingleApiResponse<Tag>;
export type TagListResponse = SingleApiResponse<Tag[]>;
export type SeoSettingResponse = SingleApiResponse<SeoSetting>;

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
    primary_logo?: string;
    secondary_logo?: string;
    favicon?: string;
    header_logo?: string;
    footer_logo?: string;
    website_favicon?: string;
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
