import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useOwnerSummary, type OwnerSummary as OwnerSummaryData, type OwnerSummaryParams } from '../../modules/owner-summary';
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
import CustomRangePanel, { type CustomRange, type CustomRangeErrors } from './components/CustomRangePanel';
import ReportSettingsModal from './components/ReportSettingsModal';
import OwnerSummarySkeleton from './components/OwnerSummarySkeleton';
import { dateRange, daysInRange, firstMessage } from './components/format';
import './ownerSummary.css';

const HTTP_FORBIDDEN = 403;
const HTTP_UNPROCESSABLE = 422;

const rangeErrorsFrom = (error: unknown): CustomRangeErrors | null => {
    if (!isAxiosError(error) || error.response?.status !== HTTP_UNPROCESSABLE) return null;
    const errors = error.response.data?.errors ?? {};
    return { from: firstMessage(errors.from), to: firstMessage(errors.to) };
};

/**
 * The host owner's business summary: money in and owed, what needs attention,
 * the pipeline, where business comes from and how partners are doing - for a
 * chosen period, against the one before. Only what the system records today.
 */
export default function OwnerSummary() {
    // Choosing Custom only opens the dates; the numbers change on Apply.
    const [selected, setSelected] = useState<OwnerSummaryPeriodKey>(OWNER_SUMMARY_PERIOD.THIS_MONTH);
    const [requested, setRequested] = useState<OwnerSummaryParams>({ period: OWNER_SUMMARY_PERIOD.THIS_MONTH });
    const [environment, setEnvironment] = useState<OwnerSummaryEnvironment>(OWNER_SUMMARY_ENVIRONMENT.PRODUCTION);
    const [reportSettingsOpen, setReportSettingsOpen] = useState(false);
    const { data: response, isLoading, isFetching, error } = useOwnerSummary({ ...requested, environment });

    const forbidden = isAxiosError(error) && error.response?.status === HTTP_FORBIDDEN;
    const rangeErrors = rangeErrorsFrom(error);

    // A failed request has no data, not even the previous one: when only the
    // chosen range was refused, the numbers already on screen stay.
    const lastSummary = useRef<OwnerSummaryData | undefined>(undefined);
    if (response) lastSummary.current = response;
    const data = response ?? (rangeErrors ? lastSummary.current : undefined);

    const showingCustom = data?.period.key === OWNER_SUMMARY_PERIOD.CUSTOM;
    const comparedDays = data ? daysInRange(data.period.previous_from, data.period.previous_to) : 0;
    const periodLabel = showingCustom
        ? 'Selected range'
        : OWNER_SUMMARY_PERIOD_OPTIONS.find((option) => option.value === data?.period.key)?.label ?? '';

    // From the response, so it always describes the numbers on screen.
    const environmentShowing = OWNER_SUMMARY_ENVIRONMENT_OPTIONS.find((option) => option.value === data?.environment)?.showing;

    const choosePeriod = (period: OwnerSummaryPeriodKey) => {
        setSelected(period);
        if (period !== OWNER_SUMMARY_PERIOD.CUSTOM) setRequested({ period });
    };

    const applyRange = (range: CustomRange) => setRequested({ period: OWNER_SUMMARY_PERIOD.CUSTOM, ...range });

    return (
        <div className="page-content os-page">
            <div className="container-fluid">
                <div className="os-stack">
                    <div className="os-header">
                        <div>
                            <div className="os-legend" style={{ gap: 10 }}>
                                <h1 className="os-title">Owner Summary</h1>
                                <span className="os-tag os-tag--owner">FCH owner only</span>
                            </div>
                            <p className="os-subtitle">Four Corner Funding · business summary</p>
                        </div>
                        <div className="os-controls">
                            <div className="os-seg" role="group" aria-label="Period">
                                {OWNER_SUMMARY_PERIOD_OPTIONS.map((option) => (
                                    <button type="button" key={option.value} aria-pressed={selected === option.value} onClick={() => choosePeriod(option.value)}>
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
                            <button type="button" className="os-btn" onClick={() => setReportSettingsOpen(true)}>
                                <i className="ri-mail-line" aria-hidden="true"></i>
                                Report settings
                            </button>
                            <button type="button" className="os-btn os-btn--primary" onClick={() => window.print()} disabled={!data}>
                                <i className="ri-download-2-line" aria-hidden="true"></i>
                                Export PDF
                            </button>
                        </div>
                    </div>

                    <ReportSettingsModal visible={reportSettingsOpen} onHide={() => setReportSettingsOpen(false)} />

                    {selected === OWNER_SUMMARY_PERIOD.CUSTOM && (
                        <CustomRangePanel errors={rangeErrors ?? {}} busy={isFetching} onApply={applyRange} />
                    )}

                    {error && !data ? (
                        <div className="os-card">
                            <p className="os-empty">
                                {forbidden ? 'Only the FCH owner can see this summary.' : 'The summary could not be loaded. Please try again.'}
                            </p>
                        </div>
                    ) : isLoading || !data ? (
                        <OwnerSummarySkeleton />
                    ) : (
                        <>
                            <p className="os-showing">
                                {showingCustom ? (
                                    <>
                                        Showing <strong>{dateRange(data.period.from, data.period.to)} (custom)</strong> · compared with {comparedDays} {comparedDays === 1 ? 'day' : 'days'} before ({dateRange(data.period.previous_from, data.period.previous_to)})
                                    </>
                                ) : (
                                    <>
                                        Showing <strong>{periodLabel} ({dateRange(data.period.from, data.period.to)})</strong> · compared with {dateRange(data.period.previous_from, data.period.previous_to)}
                                    </>
                                )}
                                {' '}· {environmentShowing} · times in {data.period.timezone}
                                {isFetching && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-label="Updating"></span>}
                            </p>

                            {environment !== OWNER_SUMMARY_ENVIRONMENT.PRODUCTION && (
                                <p className="os-note os-environment-note" data-testid="owner-environment-note">
                                    This switch only changes payment numbers: Net Earnings, its chart, and failed or disputed payments. Invoices, deals, commissions, clients and leads aren't marked sandbox or production, so they always show everything.
                                </p>
                            )}

                            <KpiCards data={data.kpis} />

                            <div className="os-row">
                                <CashCard streams={data.cash_by_stream} periodLabel={periodLabel} />
                                <div className="os-grow-side">
                                    <CommissionsCard data={data.commissions} />
                                    <OwedCard data={data.receivables} />
                                </div>
                            </div>

                            <NeedsAttention data={data.attention} />

                            <div className="os-row">
                                <PipelineCard data={data.pipeline} />
                                <LeadSourcesCard data={data.lead_sources} />
                            </div>

                            <div className="os-charts">
                                <MonthlyChart title="Funded Volume By Month" sub="Closed (Completed), by funded date" points={data.monthly} field="funded" testId="owner-chart-funded" />
                                <MonthlyChart title="Net Earnings By Month" sub="Succeeded payments on Four Corner invoices" points={data.monthly} field="cash" testId="owner-chart-cash" />
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
