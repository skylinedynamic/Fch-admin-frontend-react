import { MultiSelect } from 'primereact/multiselect';
import { USES_OPTIONS, type SelectOption } from '../../../config/funding';

interface UsesFieldProps {
    value: string[];
    onChange: (value: string[]) => void;
}

/**
 * The standard uses, plus any saved use not on that list (older sequences
 * hold free-text uses such as "Travel"), so it shows and is kept on save.
 */
export function usesOptionsFor(selected: string[]): SelectOption[] {
    const extra = selected
        .filter((use) => !USES_OPTIONS.some((option) => option.value === use))
        .map((use) => ({ label: use, value: use }));

    return extra.length ? [...USES_OPTIONS, ...extra] : USES_OPTIONS;
}

/**
 * A funding sequence's uses: several can apply, so the field selects several.
 * Styled as the shared taxonomy picker (`.taxonomy-field`), like Lenders ->
 * Product Categories.
 */
export default function UsesField({ value, onChange }: UsesFieldProps) {
    return (
        <div className="mb-2 taxonomy-field">
            <label className="form-label text-dark fw-medium mb-2" htmlFor="uses">Uses</label>
            <MultiSelect
                inputId="uses"
                value={value}
                options={usesOptionsFor(value)}
                onChange={(e) => onChange(e.value ?? [])}
                optionLabel="label"
                optionValue="value"
                placeholder="Select uses"
                className="w-100"
                panelClassName="taxonomy-field-panel"
                appendTo="self"
                filter
                filterPlaceholder="Search uses"
                display="chip"
                showSelectAll={false}
                removeIcon="ri-close-line"
                maxSelectedLabels={20}
                emptyFilterMessage="No matching use"
            />
        </div>
    );
}
