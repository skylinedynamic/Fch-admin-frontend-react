/**
 * Merge fields offered by the Agreement Builder's "Insert field" menu. The
 * server fills them with the signer's details when the agreement is shown and
 * signed (fch-api AgreementMergeFields::KEYS - keep the two lists the same).
 * "Signer" is whoever signs; "your company" is the partner whose agreement it is.
 */
export interface AgreementMergeField {
  key: string
  label: string
  group: 'Signer' | 'Your company' | 'Other'
  /** Shown in the builder's preview in place of the field. */
  sample: string
}

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
