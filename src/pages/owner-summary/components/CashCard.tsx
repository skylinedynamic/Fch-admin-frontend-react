import type { CashStreamRow } from '../../../modules/owner-summary';
import { CASH_STREAM, CASH_STREAM_LABELS, type CashStream } from '../../../config/ownerSummary';
import { count, money } from './format';

const STREAM_NOTES: Record<CashStream, string> = {
    [CASH_STREAM.PARTNER_ENROLLMENT]: 'New partners, one-time or installments',
    [CASH_STREAM.PLATFORM_FEE]: 'Monthly white-label and certified fees',
    [CASH_STREAM.USER_SEAT]: 'Extra partner users',
    [CASH_STREAM.BORROWER_FEE]: 'Paid by partners for each client they enroll',
    [CASH_STREAM.CLIENT_ENROLLMENT]: 'Clients enrolled directly with Four Corner',
};

/** Money received in the period, by what it paid for. */
export default function CashCard({ streams, periodLabel }: { streams: CashStreamRow[]; periodLabel: string }) {
    const total = streams.reduce((sum, row) => sum + row.amount, 0);
    const payments = streams.reduce((sum, row) => sum + row.payments, 0);

    return (
        <div className="os-card os-grow-wide" data-testid="owner-cash">
            <h2 className="os-card-title">Cash collected</h2>
            <p className="os-card-sub">Payments that succeeded on invoices billed by Four Corner (commission payouts excluded)</p>
            <div className="os-scroll">
                <table className="os-tbl">
                    <thead>
                        <tr>
                            <th scope="col">Stream</th>
                            <th scope="col" className="os-num">Payments</th>
                            <th scope="col" className="os-num">{periodLabel}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {streams.map((row) => (
                            <tr key={row.stream}>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{CASH_STREAM_LABELS[row.stream] ?? row.stream}</div>
                                    <div className="os-tbl__sub">{STREAM_NOTES[row.stream]}</div>
                                </td>
                                <td className="os-num">{row.payments}</td>
                                <td className="os-num">{money(row.amount)}</td>
                            </tr>
                        ))}
                        <tr className="os-tbl__total">
                            <td>Total collected</td>
                            <td className="os-num">{count(payments, 'payment', 'payments')}</td>
                            <td className="os-num">{money(total)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p className="os-note">A partner's own clients pay that partner, not Four Corner; for them Four Corner earns the borrower fee.</p>
        </div>
    );
}
