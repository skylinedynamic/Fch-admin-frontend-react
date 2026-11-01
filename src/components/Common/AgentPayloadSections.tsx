import React from 'react';
import '../../../assets/css/underwriting-result.css';
import { readableLabel } from '../../utils/underwritingLabels';

/**
 * Renders the parts of an agent's result that no designed section covers.
 *
 * The pre-qualification schemas live on the OpenAI agents, not in this
 * codebase: a host can add or rename a field on the platform without a deploy.
 * The screens above bind to the fields they were designed for, so anything else
 * the agent returns would be dropped silently — a reviewer would be looking at
 * a partial evaluation with no sign that part of it was missing, which is worse
 * than an unstyled section.
 *
 * The shape decides how a field reads, never a guess at what its name means:
 * text becomes a paragraph, a list of strings becomes bullets, a list of
 * records becomes a table, and an object becomes labelled rows. A field with
 * nothing in it renders nothing at all, rather than a heading over an empty
 * card.
 */

/** "routing_recommendation" -> "Routing Recommendation". */
export const humanizeKey = (key: string): string =>
    key
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase());

const isFilledString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/**
 * A plain scalar the agent can state as a value: shown as written, except a
 * field key or source code, which is put into words (BUG-061).
 */
const asScalarText = (value: unknown): string | null => {
    if (isFilledString(value)) return readableLabel(value.trim());
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return null;
};

const Bullets: React.FC<{ items: string[] }> = ({ items }) => (
    <div className="d-flex flex-column uw-corrections">
        {items.map((item, idx) => (
            <div
                className="d-flex align-items-start rounded-3 uw-item uw-item--neutral uw-item--compact"
                key={idx}
            >
                <i className="ri-arrow-right-circle-fill text-primary fs-16 flex-shrink-0 uw-item-icon"></i>
                <span className="uw-item-text uw-item-text--neutral">
                    {item}
                </span>
            </div>
        ))}
    </div>
);

const SectionCard: React.FC<{ title: string; icon: string; children: React.ReactNode; badge?: string }> = ({
    title,
    icon,
    children,
    badge,
}) => (
    <div className="card shadow-sm mb-4 rounded-3 border">
        <div className="card-header bg-light py-3 px-3 px-md-4 border-bottom d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
                <i className={`${icon} text-primary fs-18`}></i>
                <h6 className="fw-bold mb-0 text-dark fs-15">{title}</h6>
            </div>
            {badge && <span className="badge bg-white text-primary border fs-12 fw-semibold px-2 py-1 rounded-pill">{badge}</span>}
        </div>
        <div className="card-body p-3 p-md-4">{children}</div>
    </div>
);

/** One field the agent returned that has no section designed for it. */
export function renderAgentField(key: string, value: unknown): React.ReactNode {
    const scalar = asScalarText(value);

    if (scalar !== null) {
        return (
            <SectionCard title={humanizeKey(key)} icon="ri-file-text-line" key={key}>
                <p className="mb-0 fs-14 uw-prose">{scalar}</p>
            </SectionCard>
        );
    }

    if (Array.isArray(value)) {
        const bullets = value.map(asScalarText).filter(isFilledString);

        if (bullets.length === value.length && bullets.length > 0) {
            return (
                <SectionCard
                    title={humanizeKey(key)}
                    icon="ri-stack-line"
                    badge={`${bullets.length} ${bullets.length === 1 ? 'Item' : 'Items'}`}
                    key={key}
                >
                    <Bullets items={bullets} />
                </SectionCard>
            );
        }

        // A list of records: the union of their keys becomes the columns, so a
        // row that omits one is blank there rather than shifting the table.
        const rows = value.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row));

        if (rows.length === 0) return null;

        const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
        if (columns.length === 0) return null;

        const cellText = (cell: unknown): string =>
            asScalarText(cell) ?? (Array.isArray(cell) ? cell.map(asScalarText).filter(isFilledString).join(', ') : '');

        return (
            <div className="card shadow-sm mb-4 rounded-3 border" key={key}>
                <div className="card-header bg-light py-3 px-3 px-md-4 border-bottom d-flex align-items-center gap-2">
                    <i className="ri-table-line text-primary fs-18"></i>
                    <h6 className="fw-bold mb-0 text-dark fs-15">{humanizeKey(key)}</h6>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    {columns.map(column => (
                                        <th scope="col" className="py-3 px-4 text-muted text-uppercase fs-11 fw-bold" key={column}>
                                            {humanizeKey(column)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr key={idx}>
                                        {columns.map(column => (
                                            <td className="py-3 px-4 fs-13 uw-cell" key={column}>
                                                {cellText(row[column])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    if (value && typeof value === 'object') {
        const groups = Object.entries(value as Record<string, unknown>)
            .map(([childKey, childValue]) => ({
                childKey,
                scalarChild: asScalarText(childValue),
                listChild: Array.isArray(childValue) ? childValue.map(asScalarText).filter(isFilledString) : [],
            }))
            .filter(group => group.scalarChild !== null || group.listChild.length > 0);

        if (groups.length === 0) return null;

        return (
            <SectionCard title={humanizeKey(key)} icon="ri-list-check-2" key={key}>
                <div className="d-flex flex-column gap-3">
                    {groups.map(({ childKey, scalarChild, listChild }) => (
                        <div key={childKey}>
                            <div className="fw-bold text-dark fs-13 mb-2">{humanizeKey(childKey)}</div>
                            {scalarChild !== null ? (
                                <p className="mb-0 fs-13 uw-prose-sm">{scalarChild}</p>
                            ) : (
                                <Bullets items={listChild} />
                            )}
                        </div>
                    ))}
                </div>
            </SectionCard>
        );
    }

    return null;
}

/**
 * Every field of an agent payload that `sectioned` does not already cover.
 *
 * @param payload   The agent's result, as it was stored.
 * @param sectioned The keys a designed section above already renders.
 */
export function renderAgentExtraSections(payload: unknown, sectioned: ReadonlySet<string>): React.ReactNode {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return null;
    }

    return Object.entries(payload as Record<string, unknown>)
        .filter(([key]) => !sectioned.has(key))
        .map(([key, value]) => renderAgentField(key, value));
}
