import { Skeleton } from 'primereact/skeleton'

interface PartnerMailNotificationLoaderProps {
  /** How many recipient fields to sketch - the count isn't known until the API answers. */
  fields?: number
}

/**
 * Partner profile › Mail Notification while its recipients load: the heading,
 * the intro line, then each field's label, input and help on a line of its
 * own, as in the tab (PartnerMailNotificationTab).
 */
export default function PartnerMailNotificationLoader({ fields = 2 }: PartnerMailNotificationLoaderProps) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading mail notification recipients">
      <Skeleton width="150px" height="20px" className="mb-2" />
      <Skeleton width="60%" height="14px" className="mb-4" />

      <div className="row g-3">
        {Array.from({ length: fields }).map((_, i) => (
          <div className="col-12" key={i}>
            <Skeleton width="180px" height="15px" className="mb-2" />
            <Skeleton width="100%" height="38px" borderRadius="4px" className="mb-2" />
            <Skeleton width="85%" height="12px" />
          </div>
        ))}
      </div>
    </div>
  )
}
