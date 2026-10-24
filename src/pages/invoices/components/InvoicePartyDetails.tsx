import type { InvoiceParty } from '../../../modules/invoice/types';

/** "City, ST 12345" - whichever of the three are present. */
const formatLocality = ({ city, state, postal_code }: Partial<InvoiceParty>) => {
    const region = [state, postal_code].filter(Boolean).join(' ');
    return [city, region].filter(Boolean).join(', ');
};

/**
 * The contact lines of one side of an invoice. A line the party has no value
 * for is left out rather than shown empty.
 */
export function InvoicePartyLines({ party }: { party: Partial<InvoiceParty> }) {
    const locality = formatLocality(party);
    // A company that only goes by the owner's name would print the same line twice.
    const company = party.company_name !== party.name ? party.company_name : null;

    return (
        <>
            {party.name && <p className="fw-medium mb-1">{party.name}</p>}
            {company && <p className="text-muted mb-1">{company}</p>}
            {party.address && <p className="text-muted mb-1">{party.address}</p>}
            {locality && <p className="text-muted mb-1">{locality}</p>}
            {party.country && <p className="text-muted mb-1">{party.country}</p>}
            {party.phone && (
                <p className="text-muted mb-1">
                    <span>Phone: </span>
                    <span>{party.phone}</span>
                </p>
            )}
            {party.email && (
                <p className="text-muted mb-0">
                    <span>Email: </span>
                    <span>{party.email}</span>
                </p>
            )}
        </>
    );
}

interface InvoicePartyDetailsProps {
    title: string;
    party: Partial<InvoiceParty>;
    className?: string;
}

/** One side of an invoice under its heading: who it is billed from, or to. */
export default function InvoicePartyDetails({ title, party, className = '' }: InvoicePartyDetailsProps) {
    return (
        <div className={className}>
            <h6 className="text-muted text-uppercase fw-semibold mb-3">{title}</h6>
            <InvoicePartyLines party={party} />
        </div>
    );
}
