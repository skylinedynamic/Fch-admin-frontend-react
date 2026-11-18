import type { MonthlyPoint } from '../../../modules/owner-summary';
import { compactMoney, monthShort } from './format';

interface MonthlyChartProps {
    title: string;
    sub: string;
    points: MonthlyPoint[];
    field: 'funded' | 'cash';
    testId: string;
}

const BAR_AREA = 120;

/** "2.1× since Jun", when the first month had something to grow from. */
function growth(points: MonthlyPoint[], field: 'funded' | 'cash'): { text: string; tone: 'up' | 'down' | 'flat' } | null {
    const first = points.find((point) => point[field] > 0);
    const last = points[points.length - 1];
    if (!first || !last || first === last || first[field] === 0) return null;
    const ratio = last[field] / first[field];
    const since = `since ${monthShort(first.month)}`;
    if (ratio >= 2) return { text: `${ratio.toFixed(1)}× ${since}`, tone: 'up' };
    const pct = Math.round((ratio - 1) * 100);
    return { text: `${pct > 0 ? '+' : ''}${pct}% ${since}`, tone: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

/** One series by month; the period's own month is the dark bar. Values are printed, so no hover is needed. */
export default function MonthlyChart({ title, sub, points, field, testId }: MonthlyChartProps) {
    const most = Math.max(1, ...points.map((point) => point[field]));
    const trend = growth(points, field);

    return (
        <div className="os-card" data-testid={testId}>
            <div className="os-line" style={{ alignItems: 'baseline' }}>
                <h2 className="os-card-title">{title}</h2>
                {trend && <span className={`os-tag os-tag--${trend.tone}`}>{trend.text}</span>}
            </div>
            <p className="os-card-sub">{sub}</p>
            <div
                className="os-chart"
                style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
                role="img"
                aria-label={`${title}: ${points.map((point) => `${monthShort(point.month)} ${compactMoney(point[field])}`).join(', ')}`}
            >
                {points.map((point, i) => (
                    <div className="os-chart__col" key={point.month}>
                        <span className="os-chart__value">{point[field] > 0 ? compactMoney(point[field]) : '—'}</span>
                        <div
                            className={`os-chart__bar ${i === points.length - 1 ? 'os-chart__bar--current' : ''}`}
                            style={{ height: Math.round((point[field] / most) * BAR_AREA) }}
                        ></div>
                        <span className="os-chart__month">{monthShort(point.month)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
