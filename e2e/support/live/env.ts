// Shared settings for the real-API E2E specs (`*.live.spec.ts`). They run
// against the local fch-backend-api dev server - the same API the build was
// compiled against (VITE_API_URL) - and the host account in the local
// `fch_dev` database. Values come from the environment or `.env.e2e`.
export const API_BASE_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/+$/, '')

export const HOST_EMAIL = process.env.E2E_HOST_EMAIL || ''
export const HOST_PASSWORD = process.env.E2E_HOST_PASSWORD || ''

// Saved by auth.setup.ts and reused by every live spec.
export const AUTH_STATE_PATH = 'e2e/.auth/host.json'

// Local Passport token issuance and the un-pooled PHP dev server are slow.
export const SLOW_TIMEOUT = 30_000
