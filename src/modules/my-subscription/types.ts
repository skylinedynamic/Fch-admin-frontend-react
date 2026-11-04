/** What resuming a cancelled subscription did (BUG-069). */
export const RESUME_RESULT = {
  /** Active again: nothing to pay first. */
  ACTIVE: 'active',
  /** Still cancelled until `invoice_id` is paid. */
  PAYMENT_REQUIRED: 'payment_required',
} as const;

export type ResumeResultStatus = (typeof RESUME_RESULT)[keyof typeof RESUME_RESULT];

export interface ResumeSubscriptionResult {
  status: ResumeResultStatus;
  invoice_id: number | null;
  /** The API's own wording of the outcome. */
  message: string;
}
