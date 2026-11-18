import { STALLED_AFTER_DAYS } from '../../../config/ownerSummary';

/** What each number means - so the summary is read the same way by everyone. */
export default function Definitions({ timezone }: { timezone: string }) {
    return (
        <div className="os-foot">
            <p><strong>How These Numbers Are Counted.</strong> Dates and times are in {timezone}.</p>
            <p>
                Funded = Closed (Completed), dated by its funded date. Net Earnings = all succeeded payments received on invoices
                Four Corner bills (partner enrollment, platform fees, user seats, borrower fees, its own clients' enrollment), in the payments
                mode chosen above, commission payouts not taken off. The weekly report always uses Production. Owed to us = Four Corner invoices raised in the period that are still unpaid or whose payment failed. Every figure follows the period chosen, except suspended partners, stalled deals, open applications and the partner and client totals, which are as of now. Funding
                commissions are amounts booked on funded deals, not money received. Lead sources are the source chosen on each lead;
                embedded-form applications and pre-qualification requests are counted separately. Stalled = open with no status change
                for {STALLED_AFTER_DAYS} days or more (status history is kept from 3 Nov 2026, so stage counts and days idle before then are incomplete). FCH and Partners split deals and leads by who they belong to.
                Partners and Clients: Active = Active status, archived ones left out. Active partners (lead in 30 days) = sent a lead in the
                last 30 days. Lead-To-Funded = client leads from this period that converted and whose client, matched by email, has a funded
                deal; a client whose email changed after converting is not matched.
            </p>
            <p>
                Churn is not shown: the system does not record when a subscription was cancelled.
            </p>
        </div>
    );
}
