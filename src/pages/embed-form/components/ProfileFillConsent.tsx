import { useMemo } from 'react';
import type { ProfileFieldToFill } from '../../../modules/embed-form';
import { groupProfileFields } from '../../../utils/profileFillDisplay';

type Props = {
    fields: ProfileFieldToFill[];
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
};

/**
 * Converting onto an existing client: which of its blank profile fields this
 * application would fill, grouped and formatted, and the partner's yes or no
 * to filling them. Nothing on the profile changes unless the box is ticked
 * (BUG-064).
 */
export default function ProfileFillConsent({ fields, checked, onChange, disabled = false }: Props) {
    const groups = useMemo(() => groupProfileFields(fields), [fields]);
    const count = groups.reduce((total, group) => total + group.items.length, 0);

    if (count === 0) {
        return (
            <p className="ef-fill__unchanged mt-3 mb-0">
                <i className="ri-shield-check-line" aria-hidden="true" />
                The client's profile is not changed.
            </p>
        );
    }

    return (
        <section className={`ef-fill mt-3 ${checked ? 'is-on' : ''}`} aria-labelledby="ef-fill-title">
            <header className="ef-fill__head">
                <span className="ef-fill__icon" aria-hidden="true"><i className="ri-file-user-line" /></span>
                <div className="ef-fill__heading">
                    <h6 className="ef-fill__title" id="ef-fill-title">Client profile has empty fields</h6>
                    <p className="ef-fill__sub">This application can fill them. Fields with a value are never changed.</p>
                </div>
                <span className="ef-fill__count">{count === 1 ? '1 field' : `${count} fields`}</span>
            </header>

            <ul className="ef-fill__groups" aria-label="Empty profile fields this application can fill">
                {groups.map((group) => (
                    <li key={group.title} className="ef-fill__group">
                        <div className="ef-fill__group-title">
                            <i className={group.icon} aria-hidden="true" /> {group.title}
                        </div>
                        <dl className="ef-fill__grid">
                            {group.items.map((item) => (
                                <div key={item.key} className={`ef-fill__item ${item.wide ? 'is-wide' : ''}`}>
                                    <dt>{item.label}</dt>
                                    <dd>{item.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </li>
                ))}
            </ul>

            <label className="ef-fill__consent" htmlFor="ef-profile-fill-consent">
                <input
                    className="form-check-input"
                    type="checkbox"
                    id="ef-profile-fill-consent"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span>
                    <span className="ef-fill__consent-title">Also fill these empty fields on the client's profile</span>
                    <span className="ef-fill__consent-hint">
                        {checked
                            ? 'They will be filled and noted in the client’s Activity.'
                            : 'Left unticked, only the funding application is added.'}
                    </span>
                </span>
            </label>
        </section>
    );
}
