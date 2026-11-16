/**
 * Merge fields offered by the Agreement Builder's "Insert field" menu. The
 * server fills them with the signer's details when the agreement is shown and
 * signed (fch-api AgreementMergeFields::KEYS - keep the two lists the same).
 * "Signer" is whoever signs; "your company" is the partner whose agreement it is.
 */
export interface AgreementMergeField {
  key: string
  label: string
  /** 'Signer', 'Your company', 'Other', or a Plan & Fee group from the API. */
  group: string
  /** Shown in the builder's preview in place of the field. */
  sample: string
  /**
   * The value is markup, not text - the partner's commission table
   * (fch-api AgreementCommissionFields). The preview shows it sanitized.
   */
  html?: boolean
}

/** The signing partner's commission tiers as a table - partner agreement only, listed by the API. */
export const AGREEMENT_COMMISSION_TABLE_FIELD_KEY = 'signer.commission_table'

/**
 * Inserted above the commission table as ordinary text, so the host can edit
 * or remove it; the table itself is filled per partner when they sign.
 */
export const AGREEMENT_COMMISSION_TABLE_INTRO = {
  title: 'Commission Structure',
  description: 'For each funded deal, Partner earns the commission shown below for the tier that matches its number of funded deals.',
}

/**
 * Text that goes in with a field, around its token: the commission table gets
 * its title and description, then the token alone in its own paragraph (the
 * server's table takes that paragraph's place). Other fields go in on their own.
 */
const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const mergeFieldSnippet = (key: string): string | null =>
  key === AGREEMENT_COMMISSION_TABLE_FIELD_KEY
    ? `<p><strong>${escapeText(AGREEMENT_COMMISSION_TABLE_INTRO.title)}</strong></p>`
      + `<p>${escapeText(AGREEMENT_COMMISSION_TABLE_INTRO.description)}</p>`
      + `<p>${mergeFieldToken(key)}</p>`
    : null

export const AGREEMENT_MERGE_FIELDS: AgreementMergeField[] = [
  { key: 'signer.name', label: "Signer's name", group: 'Signer', sample: 'Jane Doe' },
  { key: 'signer.email', label: "Signer's email", group: 'Signer', sample: 'jane@doebakery.com' },
  { key: 'signer.phone', label: "Signer's phone", group: 'Signer', sample: '(555) 123-4567' },
  { key: 'signer.address', label: "Signer's address", group: 'Signer', sample: '9 Elm Rd, Dallas, TX 75201' },
  { key: 'signer.business_name', label: "Signer's business name", group: 'Signer', sample: 'Doe Bakery LLC' },
  { key: 'signer.business_address', label: "Signer's business address", group: 'Signer', sample: '5 Oak Ave, Dallas, TX 75202' },
  { key: 'owner.company_name', label: 'Your company name', group: 'Your company', sample: 'Acme Lending' },
  { key: 'owner.email', label: 'Your company email', group: 'Your company', sample: 'hello@acmelending.com' },
  { key: 'owner.phone', label: 'Your company phone', group: 'Your company', sample: '(444) 444-4444' },
  { key: 'owner.address', label: 'Your company address', group: 'Your company', sample: '1 Main St, Austin, TX 78701' },
  { key: 'today', label: "Today's date", group: 'Other', sample: new Date().toLocaleDateString('en-US') },
]

export const mergeFieldToken = (key: string): string => `{{${key}}}`
