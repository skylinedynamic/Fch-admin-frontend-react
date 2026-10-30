import { makeBlock } from './utils';
import type { AgreementBlock } from './types';
import { CLIENT_ENROLLMENT_AGREEMENT, PARTNER_MASTER_AGREEMENT, type TemplateNode } from './masterTemplates';

/**
 * Starting points offered by the builder's "Templates" button. Each builds
 * fresh blocks (new ids) and reads like a real agreement: a header with the
 * company's details, a title, the parties named once - after that the text
 * says "the Company" and "the Client" - numbered sections, a consent box and
 * a signing card. Merge fields (the blue fields) fill in each signer's details.
 */
export interface StarterTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    /** Which agreement it is for; the Templates dialog shows each on its own tab. */
    audience: AgreementAudience[];
    blocks: () => AgreementBlock[];
}

export type AgreementAudience = 'partner' | 'borrower';

const INK = '#0f172a';
const BODY = '#334155';
const MUTED = '#64748b';

const block = (type: string, props: Partial<AgreementBlock> = {}) => ({ ...makeBlock(type), ...props }) as AgreementBlock;

const header = () => block('header', { logoWidth: 130 });
const title = (text: string) => block('text', { content: text, textAlign: 'center', fontSize: 21, fontWeight: '800', color: INK, letterSpacing: 1.2, marginTop: 8, marginBottom: 4 });
const subtitle = (text: string) => block('text', { content: text, textAlign: 'center', fontSize: 11, color: MUTED, marginBottom: 22 });
const section = (text: string) => block('heading', { content: text, fontSize: 13.5, fontWeight: '800', color: INK, marginTop: 16, marginBottom: 6 });
const clause = (text: string) => block('text', { content: text, textAlign: 'justify', fontSize: 12, lineHeight: 1.75, color: BODY, marginBottom: 8 });
const bullets = (items: string[]) => block('bullet-list', { content: `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`, fontSize: 12, lineHeight: 1.7, color: BODY, marginBottom: 8 });
const numbered = (items: string[]) => block('numbered-list', { content: `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`, fontSize: 12, lineHeight: 1.7, color: BODY, marginBottom: 8 });
const table = (head: string[] | null, rows: string[][]) => block('table', {
    content: '<table>' + (head ? `<thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>` : '') + '<tbody>'
        + rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')
        + '</tbody></table>',
    fontSize: 12, color: BODY, marginBottom: 10,
});
const subsection = (text: string) => block('heading', { content: text, fontSize: 12.5, fontWeight: '700', color: INK, marginTop: 10, marginBottom: 4 });
const label = (text: string) => block('text', { content: text, fontSize: 12, fontWeight: '700', color: INK, marginTop: 8, marginBottom: 4 });
const field = (text: string, required: boolean) => block('input', { fieldLabel: text, fieldRequired: required, marginTop: 14, marginBottom: 14 });
// Fields stand apart from the text around them, and leave room for their toolbar in the canvas.
const consent = (label: string) => block('checkbox', { fieldLabel: label, fieldRequired: true, fontSize: 12.5, marginTop: 14, marginBottom: 14 });
const signature = (role: string) => block('signature', { fieldLabel: role, fieldRequired: true, marginTop: 24, marginBottom: 16 });

// The master agreements are long: a shaded band marks where each section starts,
// and the parties' details sit in a panel.
const BAND = '#eef2f7';
const PANEL = '#f8fafc';
const sectionBand = (text: string) => block('heading', {
    content: text, fontSize: 12.5, fontWeight: '800', color: INK, letterSpacing: 0.4,
    bgColor: BAND, padding: 8, borderRadius: 4, marginTop: 18, marginBottom: 8,
});
const panel = (text: string) => block('text', { content: text, fontSize: 12, lineHeight: 1.75, color: BODY, bgColor: PANEL, padding: 14, borderRadius: 4, marginBottom: 10 });
const partyLabel = (text: string) => block('text', { content: text, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: MUTED, marginTop: 12, marginBottom: 6 });

/** Builds a master agreement (masterTemplates.ts) from its nodes. */
const fromNodes = (nodes: TemplateNode[]): AgreementBlock[] => nodes.map((node) => {
    switch (node[0]) {
        case 'header': return header();
        case 'title': return title(node[1]);
        case 'subtitle': return subtitle(node[1]);
        case 'h1': return sectionBand(node[1]);
        case 'h2': return subsection(node[1]);
        case 'h3': return /^THE (COMPANY|PARTNER|CLIENT)/.test(node[1]) ? partyLabel(node[1]) : label(node[1]);
        case 'p': return clause(node[1]);
        case 'lines': return panel(node[1]);
        case 'ul': return bullets(node[1]);
        case 'table': return table(node[1], node[2]);
        case 'field': return field(node[1], node[2]);
        case 'consent': return consent(node[1]);
        case 'sign': return signature(node[1]);
    }
});

/** For a funding broker: what the Company does for the Client, and on what terms. */
const businessFundingAgreement = (): AgreementBlock[] => [
    header(),
    title('BUSINESS FUNDING AGREEMENT'),
    subtitle('Agreement date: {{today}}'),
    clause('This Business Funding Agreement (the "Agreement") is made between {{owner.company_name}} (the "Company") and {{signer.business_name}}, represented by {{signer.name}} (the "Client").'),
    section('Client details'),
    table(['Detail', 'Information'], [
        ['Name', '{{signer.name}}'],
        ['Business', '{{signer.business_name}}'],
        ['Business address', '{{signer.business_address}}'],
        ['Email', '{{signer.email}}'],
        ['Phone', '{{signer.phone}}'],
    ]),
    section('1. Purpose'),
    clause('The Company helps the Client find and apply for business funding, such as loans, lines of credit and other financing offered by its lending partners. The Company is not a lender and does not promise that any funding will be approved.'),
    section('2. Services'),
    clause('The Company will:'),
    bullets([
        'review the Client\'s business profile and funding needs;',
        'prepare and submit funding applications on the Client\'s behalf;',
        'explain each offer received, including its amount, cost and repayment terms;',
        'support the Client until the funding is received or the application is closed.',
    ]),
    section('3. Client responsibilities'),
    numbered([
        'Give true, complete and current information and documents.',
        'Tell the Company promptly about any change to the business, its ownership or its finances.',
        'Use any funds received for lawful business purposes only.',
        'Read every offer before accepting it. The Client alone decides whether to accept an offer.',
    ]),
    section('4. Fees'),
    clause('Any fee for the Company\'s services is shown to the Client in writing before it is charged. Lenders may charge their own fees and interest, set out in the lender\'s own agreement with the Client.'),
    section('5. Credit checks and information sharing'),
    clause('The Client authorises the Company and its lending partners to obtain business and personal credit reports and to verify the information provided, to evaluate funding applications. The Company shares the Client\'s information only with lenders and service providers involved in the Client\'s applications.'),
    section('6. Communications'),
    clause('The Client agrees that the Company may contact the Client by email, phone or text message, at the details given above, about this Agreement and the Client\'s applications. The Client may withdraw this consent at any time by writing to the Company.'),
    section('7. Confidentiality'),
    clause('Each party keeps the other\'s non-public information confidential and uses it only to carry out this Agreement, unless the law requires otherwise.'),
    section('8. Term and termination'),
    clause('This Agreement starts when it is signed and continues until the Client\'s funding is received or either party ends it by written notice. Ending it does not cancel a fee already earned or any agreement the Client has signed with a lender.'),
    section('9. Limitation of liability'),
    clause('The Company is not responsible for a lender\'s decision, or for any loss arising from a funding product the Client chooses to accept. The Company\'s total liability under this Agreement is limited to the fees the Client has paid to the Company.'),
    section('10. General'),
    clause('This Agreement is governed by the laws of the state in which the Company has its principal place of business. It is the whole agreement between the parties on its subject, and a change to it is valid only if made in writing and accepted by both parties.'),
    section('Agreement'),
    clause('By signing below, the Client confirms that they have read this Agreement, that the information they have given is true, and that they are authorised to sign for the business named above.'),
    consent('I have read and agree to this Business Funding Agreement'),
    consent('I agree to be contacted by email, phone and text as described in section 6'),
    signature('Client signature'),
];

/** For a lender. The loan's terms are written into the summary table before the template is published. */
const masterLoanAgreement = (): AgreementBlock[] => [
    header(),
    title('MASTER LOAN AGREEMENT'),
    subtitle('Agreement date: {{today}}'),
    clause('This Master Loan Agreement (the "Agreement") is made between {{owner.company_name}} (the "Lender") and {{signer.business_name}}, represented by {{signer.name}} (the "Borrower").'),
    section('Loan summary'),
    table(['Term', 'Detail'], [
        ['Principal amount', '$ ______________'],
        ['Annual interest rate (APR)', '______ %'],
        ['Term', '______ months'],
        ['Repayment', 'Equal monthly instalments'],
        ['Late payment fee', '$ ______ per late instalment'],
    ]),
    section('1. The loan'),
    clause('The Lender agrees to lend the Borrower the principal amount above, to be paid out once this Agreement is signed and any conditions the Lender has set are met.'),
    section('2. Interest'),
    clause('Interest accrues on the unpaid principal at the annual rate above, calculated monthly, from the day the funds are paid out until the loan is repaid in full.'),
    section('3. Repayment'),
    clause('The Borrower repays the principal and interest in equal monthly instalments over the term above. The first instalment is due thirty (30) days after the funds are paid out.'),
    section('4. Prepayment'),
    clause('The Borrower may repay all or part of the loan early without penalty. An early payment is applied first to interest due and then to principal.'),
    section('5. Late payments and default'),
    clause('An instalment more than ten (10) days late incurs the late payment fee above. The Borrower is in default if an instalment is more than thirty (30) days late, or if information the Borrower has given proves to be false. On default, the Lender may require the whole unpaid balance to be repaid at once.'),
    section('6. Borrower\'s confirmations'),
    numbered([
        'The Borrower is authorised to enter into this Agreement for the business named above.',
        'The information the Borrower has given the Lender is true and complete.',
        'The loan will be used for lawful business purposes only.',
    ]),
    section('7. General'),
    clause('This Agreement is governed by the laws of the state in which the Lender has its principal place of business. It is the whole agreement between the parties on its subject, and a change to it is valid only if made in writing and accepted by both parties.'),
    section('Agreement'),
    clause('By signing below, the Borrower agrees to the terms of this Agreement, including the loan summary above.'),
    consent('I have read and agree to this Master Loan Agreement'),
    signature('Borrower signature'),
];

/** A one-page confirmation that the signer accepts the Company's terms. */
const termsAcknowledgement = (): AgreementBlock[] => [
    header(),
    title('TERMS ACKNOWLEDGEMENT'),
    subtitle('Date: {{today}}'),
    clause('I, {{signer.name}}, on behalf of {{signer.business_name}}, confirm the following to {{owner.company_name}} (the "Company"):'),
    numbered([
        'I have read and understood the Company\'s terms of service, and I agree to be bound by them.',
        'The information I have given the Company is true and complete.',
        'The Company may contact me by email, phone or text message about my application.',
        'I will tell the Company promptly if any of the information I have given changes.',
    ]),
    consent('I have read and agree to these terms'),
    signature('Signature'),
];

export const STARTER_TEMPLATES: StarterTemplate[] = [
    {
        id: 'partner-master',
        audience: ['partner'],
        name: 'Master partner agreement',
        description: 'The agreement FCH signs with its partners: all 23 sections, the tier addenda, commercial terms and signature.',
        icon: 'ri-shake-hands-line',
        blocks: () => fromNodes(PARTNER_MASTER_AGREEMENT),
    },
    {
        id: 'client-enrollment',
        audience: ['borrower'],
        name: 'Client enrollment agreement',
        description: 'The master client enrollment & services agreement that borrowers sign, with its schedules.',
        icon: 'ri-file-user-line',
        blocks: () => fromNodes(CLIENT_ENROLLMENT_AGREEMENT),
    },
    {
        id: 'business-funding',
        audience: ['borrower'],
        name: 'Business funding agreement',
        description: 'For brokers: services, client duties, fees, credit checks and consent, over two pages.',
        icon: 'ri-briefcase-4-line',
        blocks: businessFundingAgreement,
    },
    {
        id: 'loan',
        audience: ['borrower'],
        name: 'Master loan agreement',
        description: 'For lenders: a loan summary to fill in, interest, repayment and default terms.',
        icon: 'ri-file-list-3-line',
        blocks: masterLoanAgreement,
    },
    {
        id: 'terms',
        audience: ['borrower'],
        name: 'Terms acknowledgement',
        description: 'One page: the signer confirms they accept your terms.',
        icon: 'ri-shield-check-line',
        blocks: termsAcknowledgement,
    },
    {
        id: 'blank',
        audience: ['partner', 'borrower'],
        name: 'Blank page',
        description: 'Start from an empty page and add your own blocks.',
        icon: 'ri-file-line',
        blocks: () => [],
    },
];

/** What a new partner or borrower agreement starts from, before anything is saved. */
export const defaultTemplateFor = (type: AgreementAudience): AgreementBlock[] =>
    fromNodes(type === 'partner' ? PARTNER_MASTER_AGREEMENT : CLIENT_ENROLLMENT_AGREEMENT);
