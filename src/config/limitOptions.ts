export const USER_LIMIT_MONTH_OPTIONS = [1, 3, 6, 12, 24];

/**
 * Shown after a paid seat is bought by someone without "Pay Invoice" (BUG-202):
 * the record is created, and its seat invoice waits on Invoices for someone who
 * may pay it.
 */
export const SEAT_INVOICE_WAITING = (created: string): string =>
  `${created} created. Its seat invoice is still unpaid - someone with the Pay Invoice permission can pay it from Invoices.`;
