import { STALLED_AFTER_DAYS } from '../../../config/ownerSummary';

/** What each number means - so the summary is read the same way by everyone. */
export default function Definitions({ timezone }: { timezone: string }) {
    return (
        <div className="os-foot">
            <p><strong>How these numbers are counted.</strong> Dates and times are in {timezone}.</p>
            <p>
                Funded = Closed (Completed), dated by its funded date. Cash collected = succeeded payments on invoices Four Corner bills
                (partner enrollment, platform fees, user seats, borrower fees, its own clients' enrollment), in the payments mode chosen
                above, commission payouts excluded. Owed to us = Four Corner invoices that are unpaid or whose payment failed. Funding
                commissions are amounts booked on funded deals, not money received. Lead sources are the source chosen on each lead;
                embedded-form applications and pre-qualification requests are counted separately. Stalled = open with no status change
                for {STALLED_AFTER_DAYS} days or more (status history is kept from 3 Nov 2026, so stage counts and days idle before then are incomplete). Active partner = sent a lead in the last 30 days.
            </p>
            <p>
                Churn and lead-to-funded conversion are not shown: the system does not record when a subscription was cancelled, or
                which lead a client came from.
            </p>
        </div>
    );
}
