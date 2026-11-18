import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { mergeFieldToken, type AgreementMergeField } from '../../../../config/agreementMergeFields';

/**
 * Dynamic values (merge fields) shown by group - Signer, Your company, each
 * Plan & Fee group ... - and a group's values in a modal. Shared by Insert
 * Dynamic Value (InsertFieldMenu) and a field's own menu (MergeChipMenu).
 */

/** An icon for each group; every Plan & Fee group shares the price tag. */
export const groupIcon = (group: string): string => {
    // "Signer" and the signer's own enrollment amounts ("Signer: Enrollment").
    if (group === 'Signer' || group.startsWith('Signer:')) return 'ri-user-3-line';
    if (group === 'Your company') return 'ri-building-2-line';
    if (group.startsWith('Plan & Fee')) return 'ri-price-tag-3-line';
    return 'ri-calendar-event-line';
};

/**
 * Shown over a Plan & Fee group's values: they are the current Plan & Fee
 * prices, filled when the agreement is shown to the signer, and the signed copy
 * keeps what was signed (fch-api builds the signed record with the values in).
 */
export const PLAN_AND_FEE_WARNING = [
    'These values come from your current Plan & Fee.',
    'They update automatically when you change them there, until the agreement is signed.',
    'A signed agreement keeps the values it was signed with.',
];

export const isPlanAndFeeGroup = (group: string) => group.startsWith('Plan & Fee');

/**
 * Shown over a value whose rows depend on the signer's enrollment type (the
 * enrollment table): how it works, then the rows each type shows (from the API).
 */
const VARIANTS_INFO = {
    title: "Shows a table of the signer's own enrollment, filled in when they sign.",
    lead: 'The rows depend on their enrollment type:',
};

/** Plan & Fee values carry a real price; the rest are only examples while a template is built. */
export const showsValue = (field: AgreementMergeField) => field.key.startsWith('plan.');

/**
 * A Plan & Fee label is "<plan>: <field>" ("Certified Partner · One Time Payment:
 * Total amount"). Shown as the plan's name heading short rows, it never wraps
 * into the price; other labels stay whole.
 */
export const splitLabel = (field: AgreementMergeField): { plan: string | null; name: string } => {
    const at = showsValue(field) ? field.label.lastIndexOf(': ') : -1;
    return at > 0 ? { plan: field.label.slice(0, at), name: field.label.slice(at + 2) } : { plan: null, name: field.label };
};

/** A group's rows in order, with a heading wherever the plan changes. */
const withPlanHeadings = (fields: AgreementMergeField[]) =>
    fields.map((field, i) => {
        const { plan, name } = splitLabel(field);
        const previous = i > 0 ? splitLabel(fields[i - 1]).plan : null;
        return { field, name, heading: plan && plan !== previous ? plan : null };
    });

/** The label with the searched text marked. */
const Highlighted: React.FC<{ text: string; needle: string }> = ({ text, needle }) => {
    const at = needle ? text.toLowerCase().indexOf(needle) : -1;
    if (at < 0) return <>{text}</>;
    return (
        <>
            {text.slice(0, at)}
            <mark>{text.slice(at, at + needle.length)}</mark>
            {text.slice(at + needle.length)}
        </>
    );
};

interface ValueRowsProps {
    fields: AgreementMergeField[];
    needle?: string;
    /** The row the arrow keys are on (search results); -1 for none. */
    active?: number;
    onActive?: (index: number) => void;
    onPick: (key: string) => void;
    /** A field's current value (MergeChipMenu): the rows are choices, this one checked. */
    current?: string | null;
}

/** A group's values (with each plan's name over its rows), as menu items. */
export const ValueRows: React.FC<ValueRowsProps> = ({ fields, needle = '', active = -1, onActive, onPick, current }) => {
    const choosing = current !== undefined;
    return (
        <>
            {withPlanHeadings(fields).map(({ field: f, name, heading }, index) => (
                <React.Fragment key={f.key}>
                    {heading && (
                        <div className="ab4-insert-popover__plan" role="presentation">
                            <i className="ri-stack-line" aria-hidden="true" />
                            <span><Highlighted text={heading} needle={needle} /></span>
                        </div>
                    )}
                    <button
                        type="button"
                        role={choosing ? 'menuitemradio' : 'menuitem'}
                        aria-checked={choosing ? f.key === current : undefined}
                        aria-label={f.label}
                        title={mergeFieldToken(f.key)}
                        className={`ab4-insert-popover__item ${splitLabel(f).plan ? 'ab4-insert-popover__item--plan' : ''} ${index === active ? 'is-active' : ''} ${choosing && f.key === current ? 'is-current' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => onActive?.(index)}
                        onClick={() => onPick(f.key)}
                    >
                        <span className="ab4-insert-popover__label"><Highlighted text={name} needle={needle} /></span>
                        {showsValue(f) && <span className="ab4-insert-popover__value">{f.sample}</span>}
                        {choosing && f.key === current
                            ? <i className="ri-check-line ab4-insert-popover__check" aria-hidden="true" />
                            : <i className="ri-corner-down-left-line ab4-insert-popover__enter" aria-hidden="true" />}
                    </button>
                </React.Fragment>
            ))}
        </>
    );
};

interface GroupModalProps {
    group: string;
    /** The group's values. */
    fields: AgreementMergeField[];
    onPick: (key: string) => void;
    onClose: () => void;
    /** A field's current value (MergeChipMenu), checked in the list. */
    current?: string | null;
}

/**
 * A group's values in a modal over the page: the Plan & Fee warning for a Plan
 * & Fee group, the cursor on the current (or first) value, arrow keys between
 * values. A click beside it closes it; Escape is the opener's to handle (it
 * may have its own menu to close next).
 */
export const GroupModal: React.FC<GroupModalProps> = ({ group, fields, onPick, onClose, current }) => {
    const titleId = useId();
    const modalRef = useRef<HTMLDivElement>(null);
    // A table filled per signer (rows by enrollment type) is one button; the rest a list.
    const tables = fields.filter((f) => f.variants?.length);
    const rows = fields.filter((f) => !f.variants?.length);

    useEffect(() => {
        const items = modalRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]');
        const checked = modalRef.current?.querySelector<HTMLElement>('[aria-checked="true"]');
        const add = modalRef.current?.querySelector<HTMLElement>('.ab4-insert-group__add');
        (checked ?? items?.[0] ?? add)?.focus();
    }, [group]);

    const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const items = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]') ?? []);
        const at = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === 'ArrowDown' ? Math.min(at + 1, items.length - 1) : Math.max(at - 1, 0);
        items[next]?.focus();
    };

    return createPortal(
        <div className="ab4-insert-group-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="ab4-insert-group" onKeyDown={onKey}>
                <div className="ab4-insert-group__head">
                    <span className="ab4-insert-popover__group-icon" aria-hidden="true"><i className={groupIcon(group)} /></span>
                    <div className="ab4-insert-group__heading">
                        <h6 id={titleId} className="ab4-insert-group__title">{group}</h6>
                        <div className="ab4-insert-group__sub">
                            {rows.length > 0
                                ? `${fields.length} ${fields.length === 1 ? 'value' : 'values'} · click one to ${current !== undefined ? 'fill the field with it' : 'insert it'}`
                                : 'Filled in for each signer when they sign'}
                        </div>
                    </div>
                    <button type="button" className="ab4-insert-popover__close" aria-label="Close group" onClick={onClose}>
                        <i className="ri-close-line" aria-hidden="true" />
                    </button>
                </div>
                {isPlanAndFeeGroup(group) && (
                    <div role="note" className="ab4-insert-group__warning">
                        <i className="ri-error-warning-line" aria-hidden="true" />
                        <div>
                            <strong>{PLAN_AND_FEE_WARNING[0]}</strong>
                            <p>{PLAN_AND_FEE_WARNING[1]} {PLAN_AND_FEE_WARNING[2]}</p>
                        </div>
                    </div>
                )}
                {/* A value whose rows depend on the enrollment type (the enrollment table):
                    a warning saying what each type shows, then one button to add it. */}
                {tables.map((f) => (
                    <div key={f.key} className="ab4-insert-group__table-value">
                        <div role="note" className="ab4-insert-group__warning ab4-insert-group__variants">
                            <i className="ri-error-warning-line" aria-hidden="true" />
                            <div>
                                <strong>{VARIANTS_INFO.title}</strong>
                                <p>{VARIANTS_INFO.lead}</p>
                                <ul>
                                    {f.variants!.map((variant) => (
                                        <li key={variant.type}><strong>{variant.type}</strong>: {variant.rows.join(', ')}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="ab4-insert-group__actions">
                            <button type="button" className="btn btn-primary ab4-insert-group__add"
                                aria-pressed={current !== undefined ? f.key === current : undefined}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => onPick(f.key)}>
                                <i className="ri-add-line me-1" aria-hidden="true" />{current !== undefined ? `Use ${f.label}` : `Add ${f.label}`}
                            </button>
                        </div>
                    </div>
                ))}
                {rows.length > 0 && (
                    <div role="menu" aria-label={group} className="ab4-insert-group__list">
                        <ValueRows fields={rows} onPick={onPick} current={current} />
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
};
