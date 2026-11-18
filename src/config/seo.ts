/** Longest SEO title the CMS accepts; the API refuses more (R3-BUG-015). */
export const SEO_META_TITLE_MAX_LENGTH = 120;

/** Brand added to a suggested SEO title. */
export const SEO_TITLE_BRAND_SUFFIX = ' | Four Corner Funding';

/** A suggested SEO title for a page: with the brand when it fits, never over the limit. */
export const suggestSeoTitle = (pageName: string): string => {
    const branded = `${pageName}${SEO_TITLE_BRAND_SUFFIX}`;
    if (branded.length <= SEO_META_TITLE_MAX_LENGTH) return branded;
    return pageName.slice(0, SEO_META_TITLE_MAX_LENGTH).trim();
};
