import { execFileSync } from 'node:child_process'
import path from 'node:path'

// A few live specs need local test data the panel cannot create itself (e.g. a
// manual payment awaiting approval). It comes from local-only `E2E*Seeder`s in
// fch-backend-api, run here through artisan.
export const BACKEND_PATH = process.env.E2E_BACKEND_PATH || path.resolve(process.cwd(), '../fch-api')
const PHP = process.env.E2E_PHP || 'php'

export function runSeeder(seederClass: string, env: Record<string, string> = {}): string {
  return execFileSync(PHP, ['artisan', 'db:seed', `--class=${seederClass}`, '--no-interaction'], {
    cwd: BACKEND_PATH,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 120_000,
  })
}

// Seeds the processing Cash payment and returns its id.
export function seedProcessingManualPayment(environment: 'sandbox' | 'production'): number {
  const output = runSeeder('E2EProcessingManualPaymentSeeder', { E2E_PAYMENT_ENVIRONMENT: environment })
  const id = output.match(/E2E_PAYMENT_ID=(\d+)/)?.[1]
  if (!id) throw new Error(`E2EProcessingManualPaymentSeeder printed no payment id:\n${output}`)
  return Number(id)
}

// Seeds a borrower fee a partner still owes the host; returns its invoice id and partner.
export function seedUnpaidBorrowerFee(): { invoiceId: number; partner: string } {
  // artisan colours its output; drop the ANSI codes around the values.
  // eslint-disable-next-line no-control-regex
  const output = runSeeder('E2EUnpaidBorrowerFeeSeeder').replace(/\u001b\[[0-9;]*m/g, '')
  const invoiceId = output.match(/E2E_FEE_INVOICE_ID=(\d+)/)?.[1]
  const partner = output.match(/E2E_FEE_PARTNER=(.+)/)?.[1]?.trim()
  if (!invoiceId || !partner) throw new Error(`E2EUnpaidBorrowerFeeSeeder printed no fee:\n${output}`)
  return { invoiceId: Number(invoiceId), partner }
}
