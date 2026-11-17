import React from 'react';
import { PARTNER_COMMISSION_TYPE } from '../../../../config/partnerCommission';
import type { FundingApplicationDetails } from '../../../../modules/application/types';

type Props = {
    app: FundingApplicationDetails;
    /** Host: the whole summary. Partner: only their own commission. */
    viewer: 'host' | 'partner';
    /** The application belongs to another partner, so the success fee is split. */
    partnerApplication: boolean;
    /** The amount the page shows as requested (the request's, for an application from one). */
    requestedAmount: number;
};

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/** "75000.00", "$75,000.00", 75000 or nothing - as a number. */
const amount = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

const rate = (value: string | number | null | undefined) => `${+amount(value).toFixed(2)}%`;

const fundedOn = (date?: string | null) => {
    if (!date) return null;
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime())
        ? null
        : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// A light shadow only - the theme's card shadow reads heavy under this card.
// Inner boxes take the theme's light border colour, not Bootstrap's darker .border.
const card: React.CSSProperties = { borderRadius: 4, boxShadow: '0 1px 2px rgba(56, 65, 74, .15)' };
const innerBox: React.CSSProperties = { borderRadius: 4, border: '1px solid var(--vz-border-color, #e9ebec)' };
// The theme's subtle success header, edged in success so it reads at a glance.
const head: React.CSSProperties = {
    background: 'var(--vz-success-bg-subtle, #daf4f0)',
    border: '1px solid var(--vz-success-border-subtle, #9de1d7)',
    borderRadius: '4px 4px 0 0',
};
const headTitle: React.CSSProperties = { color: 'var(--vz-success-text-emphasis, #099885)' };
const tile: React.CSSProperties = { borderRadius: 4, background: 'var(--vz-light, #f3f6f9)' };

/**
 * Shown once the application is Closed (Completed): what was asked for, what
 * was funded and the commission - the host the whole commission, a partner
 * only their own (no success fee or admin figures).
 */
export default function ClosedApplicationSummary({ app, viewer, partnerApplication, requestedAmount }: Props) {
    const funded = amount(app.total_funded_amount);
    const successFeeRate = amount(app.total_commission);
    const hasCommission = successFeeRate > 0;
    const date = fundedOn((app as FundingApplicationDetails & { funded_date?: string | null }).funded_date);

    const header = (title: string, icon: string) => (
        <div className="card-header d-flex align-items-center gap-3 py-3" style={head} data-testid="closed-summary-header">
            <span className="avatar-xs flex-shrink-0">
                <span className="avatar-title rounded-circle bg-success text-white fs-16"><i className={icon}></i></span>
            </span>
            <div className="min-w-0">
                <h5 className="card-title fs-16 fw-semibold mb-0" style={headTitle}>{title}</h5>
                <p className="fs-13 mb-0 text-body">
                    Closed (Completed){date ? ` · Funded on ${date}` : ''}
                </p>
            </div>
            <span className="badge bg-success ms-auto fs-12">
                <i className="ri-checkbox-circle-line me-1"></i>Completed
            </span>
        </div>
    );

    // What was asked for and what was funded - for the host and the partner alike.
    const amountTiles = (
        <div className="row g-3">
            <div className="col-sm-6">
                <div className="p-3 h-100" style={tile}>
                    <div className="text-muted fs-13">Total Requested Amount</div>
                    <div className="fs-18 fw-bold text-dark">{money(requestedAmount)}</div>
                </div>
            </div>
            <div className="col-sm-6">
                <div className="p-3 h-100" style={tile}>
                    <div className="text-muted fs-13">Total Funded Amount</div>
                    <div className="fs-18 fw-bold text-success">{money(funded)}</div>
                </div>
            </div>
        </div>
    );

    // From the partner's Flat Amount tier: a fixed $, so no "% of success fee".
    const flatPartnerShare = app.partner_commission_type === PARTNER_COMMISSION_TYPE.FLAT;

    if (viewer === 'partner') {
        const partnerAmount = amount(app.partner_commission_amount);
        const partnerRate = amount(app.partner_commission);

        return (
            <div className="card mb-4 overflow-hidden" style={card} data-testid="closed-summary">
                {header('Partner Commission Details', 'ri-shake-hands-line')}
                <div className="card-body p-4">
                    {amountTiles}
                    {partnerAmount > 0 ? (
                        <div className="d-flex flex-wrap align-items-center gap-3 mt-3 p-3" style={innerBox}>
                            <div className="flex-grow-1">
                                <div className="text-muted fs-13">Your commission</div>
                                <div className="fs-22 fw-bold text-success">{money(partnerAmount)}</div>
                                <div className="text-muted fs-13">
                                    {flatPartnerShare
                                        ? 'A flat amount on this funded application.'
                                        : `${rate(partnerRate)} of the success fee on this funded application.`}
                                </div>
                            </div>
                            {app.payment_status && (
                                <span className="badge bg-light text-dark fs-12 px-3 py-2">Payment: {app.payment_status}</span>
                            )}
                        </div>
                    ) : (
                        <p className="text-muted fs-14 mt-3 mb-0">
                            <i className="ri-information-line me-1"></i>
                            No partner commission was set for this application.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    const rows: Array<{ label: React.ReactNode; value: string; strong?: boolean }> = hasCommission
        ? [
            { label: <>Success Fee <span className="badge bg-success-subtle text-success ms-1">{rate(successFeeRate)}</span></>, value: money(amount(app.total_commission_amount)), strong: true },
            {
                label: flatPartnerShare
                    ? <>Admin Commission</>
                    : <>Admin Commission <span className="badge bg-light text-dark ms-1">{rate(app.admin_commission)} of success fee</span></>,
                value: money(amount(app.admin_commission_amount)),
            },
            ...(partnerApplication
                ? [{
                    label: flatPartnerShare
                        ? <>Partner Commission <span className="badge bg-light text-dark ms-1">Flat amount</span></>
                        : <>Partner Commission <span className="badge bg-light text-dark ms-1">{rate(app.partner_commission)} of success fee</span></>,
                    value: money(amount(app.partner_commission_amount)),
                }]
                : []),
        ]
        : [];

    return (
        <div className="card mb-4 overflow-hidden" style={card} data-testid="closed-summary">
            {header('Funding Completed', 'ri-check-double-line')}
            <div className="card-body p-4">
                {amountTiles}

                {hasCommission ? (
                    <div className="mt-3 overflow-hidden" style={innerBox}>
                        {rows.map((row, index) => (
                            <div
                                key={index}
                                className="d-flex align-items-center justify-content-between px-3 py-2 fs-14"
                                style={index < rows.length - 1 ? { borderBottom: innerBox.border } : undefined}
                                data-row
                            >
                                <span className={row.strong ? 'fw-semibold text-dark' : 'text-muted'}>{row.label}</span>
                                <span className={`fw-semibold ${row.strong ? 'text-success' : 'text-dark'}`}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted fs-14 mt-3 mb-0">
                        <i className="ri-information-line me-1"></i>
                        No commission was set for this application.
                    </p>
                )}
            </div>
        </div>
    );
}
