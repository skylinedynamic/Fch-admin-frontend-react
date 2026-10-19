import { MultiSelect } from 'primereact/multiselect'

export interface ChipMultiSelectOption {
  label: string
  value: string
}

interface ChipMultiSelectProps {
  inputId: string
  value: string[]
  options: ChipMultiSelectOption[]
  onChange: (value: string[]) => void
  placeholder?: string
  invalid?: boolean
  /** A search box at the top of the list, for long lists. */
  filter?: boolean
  filterPlaceholder?: string
}

/**
 * The portal's several-at-once picker (Purpose of Funds, Additional Funding
 * Types): chips inside the field, a search-only header, no "select all" box.
 * Styled by `.chip-multiselect` in custom.css, after the admin portal's
 * taxonomy pickers, at this portal's field size.
 */
export default function ChipMultiSelect({
  inputId,
  value,
  options,
  onChange,
  placeholder,
  invalid = false,
  filter = false,
  filterPlaceholder,
}: ChipMultiSelectProps) {
  return (
    <div className="chip-multiselect">
      <MultiSelect
        inputId={inputId}
        value={value}
        options={options}
        onChange={(e) => onChange(e.value ?? [])}
        optionLabel="label"
        optionValue="value"
        placeholder={placeholder}
        className={`w-100${invalid ? ' p-invalid' : ''}`}
        panelClassName="chip-multiselect-panel"
        appendTo="self"
        display="chip"
        showSelectAll={false}
        removeIcon="ri-close-line"
        maxSelectedLabels={30}
        filter={filter}
        filterPlaceholder={filterPlaceholder}
      />
    </div>
  )
}
