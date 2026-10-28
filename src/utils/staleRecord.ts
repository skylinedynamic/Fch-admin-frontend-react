/**
 * A save or decision made from a page showing an older copy of a record: the
 * API refuses it with 409 rather than silently undoing what someone else (or
 * another tab) changed in the meantime (R2 BUG-041 / 045 / 058 / 079).
 */

const FALLBACK = 'This record was changed by someone else since you opened it. Reload to see the latest.'

export const isStaleRecordError = (error: any): boolean => error?.response?.status === 409

export const staleRecordMessage = (error: any): string => error?.response?.data?.message || FALLBACK

/** A status change carries the status the page was showing; the API refuses it if that is no longer the stored one. */
export const withExpectedStatus = <T extends object>(payload: T, shownStatus: string | null | undefined): T & { expected_status?: string } =>
  shownStatus ? { ...payload, expected_status: shownStatus } : payload
