import React from 'react'
import { Dropdown } from 'primereact/dropdown'
import { AUDIT_EVENT_OPTIONS, AUDIT_SORT_OPTIONS, type AuditEventType, type AuditSortDirection, AUDIT_TEXT } from '../../../../../config/auditConfig'

interface Props {
  search: string
  event: AuditEventType | ''
  onSearchChange: (search: string) => void
  onEventChange: (event: AuditEventType | '') => void
  sort: AuditSortDirection
  /** Applied at once, unlike the filters (R3-BUG-051). */
  onSortChange: (sort: AuditSortDirection) => void
  onApply: () => void
  onClear: () => void
}

const EVENT_OPTIONS = [{ label: AUDIT_TEXT.ALL_EVENTS, value: '' }, ...AUDIT_EVENT_OPTIONS]

/** The list's filter row, as on the other Intake & Review lists: applied with Filters, reset with Clear. */
const AuditTrailFilters: React.FC<Props> = ({ search, event, onSearchChange, onEventChange, sort, onSortChange, onApply, onClear }) => (
  <form
    className="table-filter"
    onSubmit={(e) => {
      e.preventDefault()
      onApply()
    }}
  >
    <div className="row g-3 mb-3">
      <div className="col-lg-3 col-md-6 col-12">
        <div className="search-box">
          <input
            type="text"
            className="form-control search bg-light border-light"
            placeholder={AUDIT_TEXT.SEARCH_PLACEHOLDER}
            aria-label={AUDIT_TEXT.SEARCH_LABEL}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <i className="ri-search-line search-icon"></i>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 col-12">
        <Dropdown
          value={event}
          options={EVENT_OPTIONS}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => onEventChange(e.value)}
          placeholder={AUDIT_TEXT.ALL_EVENTS}
          className="w-100 employee-filter-dropdown audit-event-filter"
          ariaLabel={AUDIT_TEXT.EVENT_LABEL}
        />
      </div>
      <div className="col-lg-2 col-md-6 col-12">
        <Dropdown
          value={sort}
          options={AUDIT_SORT_OPTIONS}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => onSortChange(e.value)}
          className="w-100 employee-filter-dropdown audit-sort-filter"
          ariaLabel={AUDIT_TEXT.SORT_LABEL}
        />
      </div>
      <div className="col-lg-3 col-md-6 col-12 ms-lg-auto">
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-warning flex-grow-1">
            <i className="ri-equalizer-fill me-1 align-bottom"></i> {AUDIT_TEXT.FILTERS}
          </button>
          <button type="button" className="btn btn-default flex-grow-1" onClick={onClear}>
            <i className="ri-close-line me-1 align-bottom"></i> {AUDIT_TEXT.CLEAR}
          </button>
        </div>
      </div>
    </div>
  </form>
)

export default AuditTrailFilters
