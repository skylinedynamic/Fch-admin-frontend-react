import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { toast } from 'react-toastify'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import PageHeader from '../../common/PageHeader'
import TableLoader from '../../../components/Loader/TableLoader'
import { AUDIT_PAGE_SIZES, AUDIT_TEXT, type AuditEventType, type AuditExportFormat } from '../../../config/auditConfig'
import {
  useDownloadAuditEventFile,
  useExportFundingApplicationAuditTrail,
  useFundingApplicationAuditTrail,
  type AuditEvent,
} from '../../../modules/application-audit'
import { ActorCell, DetailsCell, EventCell, FileCell, WhenCell } from './components/audit/AuditEventCells'
import AuditTrailActions from './components/audit/AuditTrailActions'
import AuditTrailFilters from './components/audit/AuditTrailFilters'

const apiMessage = (error: unknown, fallback: string) =>
  (isAxiosError(error) && typeof error.response?.data?.message === 'string' && error.response.data.message) || fallback

/**
 * A funding application's audit trail: every change to its data, signing,
 * documents, commission and downloads - who, when, from where, and each
 * field before and after. Laid out as the other Intake & Review lists. The
 * host reads every application's trail, a partner its own; the API decides.
 */
const FundingApplicationAuditTrail: React.FC = () => {
  const { id = '' } = useParams()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(AUDIT_PAGE_SIZES[0])
  // Typed in the filter row; applied with Filters.
  const [searchText, setSearchText] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<AuditEventType | ''>('')
  const [applied, setApplied] = useState<{ search: string; event: AuditEventType | '' }>({ search: '', event: '' })

  const { data, isLoading, isFetching, error } = useFundingApplicationAuditTrail(id, { page, per_page: perPage, ...applied })
  const exportTrail = useExportFundingApplicationAuditTrail(id)
  const downloadFile = useDownloadAuditEventFile(id)

  useEffect(() => {
    document.body.classList.add('table-page-fit-active')
    return () => document.body.classList.remove('table-page-fit-active')
  }, [])

  const events = data?.data ?? []
  const integrity = data?.integrity

  const applyFilters = () => {
    setApplied({ search: searchText.trim(), event: selectedEvent })
    setPage(1)
  }

  const clearFilters = () => {
    setSearchText('')
    setSelectedEvent('')
    setApplied({ search: '', event: '' })
    setPage(1)
  }

  const onDownloadFile = (row: AuditEvent) =>
    downloadFile.mutate(
      { eventId: row.id, fallbackName: String(row.context?.name ?? `audit-file-${row.id}`) },
      { onError: (e) => toast.error(apiMessage(e, AUDIT_TEXT.ERROR_DOWNLOAD)) }
    )

  const onExport = (format: AuditExportFormat) =>
    exportTrail.mutate(
      { params: applied, format },
      { onError: (e) => toast.error(apiMessage(e, AUDIT_TEXT.ERROR_EXPORT)) }
    )

  return (
    <div className="page-content page-content-fit">
      <div className="container-fluid">
        <PageHeader
          title={AUDIT_TEXT.TITLE}
          breadcrumbs={[
            { label: AUDIT_TEXT.BREADCRUMB_LIST, path: '/intake-review/funding-application' },
            { label: AUDIT_TEXT.BREADCRUMB_DETAILS, path: `/intake-review/funding-application/${id}` },
            { label: AUDIT_TEXT.TITLE },
          ]}
        >
          <div className="page-actions d-flex align-items-center flex-wrap gap-2 mt-3 mt-lg-0">
            {integrity && (
              <span
                className={`badge fs-12 py-2 px-3 ${integrity.valid ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
                role="status"
                title={integrity.valid ? AUDIT_TEXT.INTEGRITY_VALID_HINT : AUDIT_TEXT.INTEGRITY_BROKEN_HINT}
              >
                <i className={`${integrity.valid ? 'ri-shield-check-line' : 'ri-error-warning-line'} align-middle me-1`}></i>
                {integrity.valid
                  ? AUDIT_TEXT.INTEGRITY_VALID(integrity.checked)
                  : AUDIT_TEXT.INTEGRITY_BROKEN(integrity.broken_at)}
              </span>
            )}
            <AuditTrailActions onExport={onExport} disabled={exportTrail.isPending} />
            <Link to={`/intake-review/funding-application/${id}`} className="btn btn-outline-secondary waves-effect">
              <i className="ri-arrow-left-line align-middle me-1"></i> {AUDIT_TEXT.BACK}
            </Link>
          </div>
        </PageHeader>

        <div className="row row-table-fit">
          <div className="col-lg-12">
            <div className="card">
              <div className="card-body">
                <AuditTrailFilters
                  search={searchText}
                  event={selectedEvent}
                  onSearchChange={setSearchText}
                  onEventChange={setSelectedEvent}
                  onApply={applyFilters}
                  onClear={clearFilters}
                />

                {error ? (
                  <div className="text-center text-danger py-4">{apiMessage(error, AUDIT_TEXT.ERROR_LOAD)}</div>
                ) : isLoading ? (
                  <TableLoader rows={10} columns={new Array(5).fill({ style: { minWidth: '140px' } })} />
                ) : (
                  <div className="table-responsive table-card mt-1">
                    <DataTable
                      scrollable
                      scrollHeight="flex"
                      value={events}
                      loading={isFetching}
                      lazy
                      paginator
                      totalRecords={data?.pagination.total ?? 0}
                      first={(page - 1) * perPage}
                      rows={perPage}
                      rowsPerPageOptions={[...AUDIT_PAGE_SIZES]}
                      onPage={(e) => {
                        setPage((e.page ?? 0) + 1)
                        setPerPage(e.rows)
                      }}
                      dataKey="id"
                      rowClassName={() => 'audit-event-row'}
                      responsiveLayout="scroll"
                      className="p-datatable-sm"
                      emptyMessage={AUDIT_TEXT.EMPTY}
                    >
                      <Column header={AUDIT_TEXT.COLUMN_DATE} body={WhenCell} style={{ minWidth: '170px' }} />
                      <Column header={AUDIT_TEXT.COLUMN_EVENT} body={EventCell} style={{ minWidth: '190px' }} />
                      <Column header={AUDIT_TEXT.COLUMN_BY} body={ActorCell} style={{ minWidth: '160px' }} />
                      <Column header={AUDIT_TEXT.COLUMN_DETAILS} body={DetailsCell} style={{ minWidth: '280px' }} />
                      <Column header={AUDIT_TEXT.COLUMN_FILE} body={(row: AuditEvent) => FileCell(row, onDownloadFile, downloadFile.isPending)} style={{ minWidth: '190px' }} />
                    </DataTable>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FundingApplicationAuditTrail
