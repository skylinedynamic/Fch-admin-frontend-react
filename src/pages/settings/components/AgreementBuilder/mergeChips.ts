import { AGREEMENT_MERGE_FIELDS, mergeFieldToken, type AgreementMergeField } from '../../../../config/agreementMergeFields';

/**
 * Merge fields in the builder's canvas: a {{signer.name}} in a text block shows
 * as a labelled chip ("Signer's name") that can't be half-deleted, and is saved
 * back as the bare {{signer.name}} the server fills (fch-api AgreementMergeFields).
 */
const CHIP_CLASS = 'ab4-merge-chip';
// Plan & Fee keys may hold digits (an "11-month" plan).
const TOKEN = /\{\{\s*([a-z0-9_.]+)\s*\}\}/g;
const labels = new Map(AGREEMENT_MERGE_FIELDS.map((f) => [f.key, f.label]));

const PLAN_KEY_PREFIX = 'plan.';
const PLAN_FALLBACK_LABEL = 'Plan & Fee value';

/** Adds the labels of the Plan & Fee values the builder loaded from the API. */
export const registerMergeFieldLabels = (fields: AgreementMergeField[]): void => {
    fields.forEach((f) => labels.set(f.key, f.label));
};

/**
 * The chip's label. A Plan & Fee value not loaded yet, or whose plan was
 * switched off, is still a chip (never text to type over), labelled generically.
 */
const labelFor = (key: string): string | undefined =>
    labels.get(key) ?? (key.startsWith(PLAN_KEY_PREFIX) ? PLAN_FALLBACK_LABEL : undefined);

export const createMergeChip = (key: string, doc: Document = document): HTMLSpanElement => {
    const chip = doc.createElement('span');
    chip.className = CHIP_CLASS;
    chip.setAttribute('contenteditable', 'false');
    chip.setAttribute('data-merge', key);
    chip.title = `Filled in automatically with ${(labelFor(key) ?? key).replace(/^Your /, 'your ').replace(/^Signer/, 'the signer').replace(/^Today/, 'today')} when the agreement is signed (${mergeFieldToken(key)}). Click to change.`;
    chip.textContent = labelFor(key) ?? key;
    return chip;
};

/** Known merge fields in the text (not inside tags) become chips. */
export const decorateMergeFields = (html: string): string => {
    if (!html.includes('{{')) return html;
    const root = document.createElement('div');
    root.innerHTML = html;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    while (walker.nextNode()) texts.push(walker.currentNode as Text);

    texts.forEach((text) => {
        const value = text.nodeValue || '';
        if (!TOKEN.test(value)) return;
        TOKEN.lastIndex = 0;
        const fragment = document.createDocumentFragment();
        let last = 0;
        value.replace(TOKEN, (token, key: string, at: number) => {
            fragment.appendChild(document.createTextNode(value.slice(last, at)));
            fragment.appendChild(labelFor(key) ? createMergeChip(key) : document.createTextNode(token));
            last = at + token.length;
            return token;
        });
        fragment.appendChild(document.createTextNode(value.slice(last)));
        text.replaceWith(fragment);
    });

    return root.innerHTML;
};

/** Chips go back to bare merge fields; everything else is left as it is. */
export const undecorateMergeFields = (html: string): string => {
    if (!html.includes(CHIP_CLASS)) return html;
    const root = document.createElement('div');
    root.innerHTML = html;
    root.querySelectorAll(`.${CHIP_CLASS}[data-merge]`).forEach((chip) => {
        chip.replaceWith(document.createTextNode(mergeFieldToken(chip.getAttribute('data-merge') || '')));
    });
    return root.innerHTML;
};
