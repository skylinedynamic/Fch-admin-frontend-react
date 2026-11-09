import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useOwnerSummary } from '../../modules/owner-summary';
import {
    OWNER_SUMMARY_ENVIRONMENT,
    OWNER_SUMMARY_ENVIRONMENT_OPTIONS,
    OWNER_SUMMARY_PERIOD,
    OWNER_SUMMARY_PERIOD_OPTIONS,
    type OwnerSummaryEnvironment,
    type OwnerSummaryPeriodKey,
} from '../../config/ownerSummary';
import KpiCards from './components/KpiCards';
import NeedsAttention from './components/NeedsAttention';
import CashCard from './components/CashCard';
import CommissionsCard from './components/CommissionsCard';
import OwedCard from './components/OwedCard';
import PipelineCard from './components/PipelineCard';
import LeadSourcesCard from './components/LeadSourcesCard';
import MonthlyChart from './components/MonthlyChart';
import PartnerNetworkCard from './components/PartnerNetworkCard';
import PartnersCard from './components/PartnersCard';
import StalledDealsCard from './components/StalledDealsCard';
import Definitions from './components/Definitions';
import { dateRange } from './components/format';
import './ownerSummary.css';

const HTTP_FORBIDDEN = 403;

/**
 * The host owner's business summary: money in and owed, what needs attention,
 * the pipeline, where business comes from and how partners are doing - for a
 * chosen period, against the one before. Only what the system records today.
 */
export default function OwnerSummary() {
    const [period, setPeriod] = useState<OwnerSummaryPeriodKey>(OWNER_SUMMARY_PERIOD.THIS_MONTH);
    const [environment, setEnvironment] = useState<OwnerSummaryEnvironment>(OWNER_SUMMARY_ENVIRONMENT.PRODUCTION);
    const { data, isLoading, isFetching, error } = useOwnerSummary({ period, environment });

    const forbidden = isAxiosError(error) && error.response?.status === HTTP_FORBIDDEN;
    const periodLabel = OWNER_SUMMARY_PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? '';

    return (
        <div className="page-content os-page">
            <div className="container-fluid">
                <div className="os-stack">
                    <div className="os-header">
                        <div>
                            <div className="os-legend" style={{ gap: 10 }}>
                                <h1 className="os-title">Owner Summary</h1>
                                <span className="os-tag os-tag--owner">Host owner only</span>
                            </div>
                            <p className="os-subtitle">Four Corner Funding · business summary</p>
                        </div>
                        <div className="os-controls">
                            <div className="os-seg" role="group" aria-label="Period">
                                {OWNER_SUMMARY_PERIOD_OPTIONS.map((option) => (
                                    <button type="button" key={option.value} aria-pressed={period === option.value} onClick={() => setPeriod(option.value)}>
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <div className="os-seg" role="group" aria-label="Payments">
                                {OWNER_SUMMARY_ENVIRONMENT_OPTIONS.map((option) => (
                                    <button type="button" key={option.value} aria-pressed={environment === option.value} onClick={() => setEnvironment(option.value)}>
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <button type="button" className="os-btn os-btn--primary" onClick={() => window.print()} disabled={!data}>
                                <i className="ri-download-2-line" aria-hidden="true"></i>
                                Export PDF
                            </button>
                        </div>
                    </div>

                    {error && !data ? (
                        <div className="os-card">
                            <p className="os-empty">
                                {forbidden ? 'Only the host owner can see this summary.' : 'The summary could not be loaded. Please try again.'}
                            </p>
                        </div>
                    ) : isLoading || !data ? (
                        <div className="os-kpis" aria-busy="true">
                            {Array.from({ length: 6 }, (_, i) => <div className="os-skeleton" key={i}></div>)}
                        </div>
                    ) : (
                        <>
                            <p className="os-showing">
                                Showing <strong>{periodLabel} ({dateRange(data.period.from, data.period.to)})</strong> · compared with {dateRange(data.period.previous_from, data.period.previous_to)} · times in {data.period.timezone}
                                {isFetching && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-label="Updating"></span>}
                            </p>

                            <KpiCards data={data.kpis} overdueInvoices={data.receivables.unpaid_over_30_days.invoices} />
                            <NeedsAttention data={data.attention} />

                            <div className="os-row">
                                <CashCard streams={data.cash_by_stream} periodLabel={periodLabel} />
                                <div className="os-grow-side">
                                    <CommissionsCard data={data.commissions} />
                                    <OwedCard data={data.receivables} />
                                </div>
                            </div>

                            <div className="os-row">
                                <PipelineCard data={data.pipeline} />
                                <LeadSourcesCard data={data.lead_sources} />
                            </div>

                            <div className="os-charts">
                                <MonthlyChart title="Funded volume by month" sub="Closed (Completed), by funded date" points={data.monthly} field="funded" testId="owner-chart-funded" />
                                <MonthlyChart title="Cash collected by month" sub="Succeeded payments on Four Corner invoices" points={data.monthly} field="cash" testId="owner-chart-cash" />
                            </div>

                            <div className="os-row">
                                <PartnerNetworkCard network={data.partners} active={data.kpis.active_partners} trialsEnding={data.attention.trials_ending} />
                                <PartnersCard top={data.top_partners} />
                            </div>

                            <StalledDealsCard deals={data.stalled_deals} total={data.attention.stalled_deals} totalRequested={data.attention.stalled_requested} />
                            <Definitions timezone={data.period.timezone} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
