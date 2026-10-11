import { authFile } from './personas'

/** The default session for live specs: the host account. */
export const LIVE_AUTH_FILE = authFile('host')

/** API-enforcement findings recorded by persona-access.spec.ts (git-ignored). */
export const FINDINGS_FILE = 'e2e-live/.results/access-findings.json'
