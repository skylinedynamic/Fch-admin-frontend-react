/**
 * The six kinds of account that use the admin panel. Each one is signed in
 * for real by auth.setup.ts when its credentials are configured.
 *
 * `expect` is what the account must look like after login; persona-access
 * checks it first, so a mis-assigned account cannot silently pass as another
 * persona.
 */
export type PersonaKey = 'host' | 'whiteLabel' | 'certified' | 'hostUser' | 'whiteLabelUser' | 'certifiedUser'

export type Persona = {
  key: PersonaKey
  label: string
  /** Prefix of the E2E_<PREFIX>_EMAIL / _PASSWORD variables. */
  env: string
  expect: { isHost: boolean; entityType: 'Partner' | 'Employee'; partnerType: 'White-Label Partner (WL)' | 'Certified Partner' }
}

export const PERSONAS: Persona[] = [
  { key: 'host', label: 'Host', env: 'HOST', expect: { isHost: true, entityType: 'Partner', partnerType: 'White-Label Partner (WL)' } },
  { key: 'whiteLabel', label: 'White-label partner', env: 'WL_PARTNER', expect: { isHost: false, entityType: 'Partner', partnerType: 'White-Label Partner (WL)' } },
  { key: 'certified', label: 'Certified partner', env: 'CERTIFIED_PARTNER', expect: { isHost: false, entityType: 'Partner', partnerType: 'Certified Partner' } },
  { key: 'hostUser', label: 'Host user', env: 'HOST_USER', expect: { isHost: true, entityType: 'Employee', partnerType: 'White-Label Partner (WL)' } },
  { key: 'whiteLabelUser', label: 'White-label partner user', env: 'WL_USER', expect: { isHost: false, entityType: 'Employee', partnerType: 'White-Label Partner (WL)' } },
  { key: 'certifiedUser', label: 'Certified partner user', env: 'CERTIFIED_USER', expect: { isHost: false, entityType: 'Employee', partnerType: 'Certified Partner' } },
]

export function credentialsFor(persona: Persona): { email: string; password: string } {
  // E2E_ADMIN_* is the original single-account setting and still works for the host.
  const fallback = persona.key === 'host' ? { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD } : {}
  return {
    email: process.env[`E2E_${persona.env}_EMAIL`] || fallback.email || '',
    password: process.env[`E2E_${persona.env}_PASSWORD`] || fallback.password || '',
  }
}

export const isConfigured = (persona: Persona) => {
  const { email, password } = credentialsFor(persona)
  return Boolean(email && password)
}

/** Where auth.setup.ts stores each persona's signed-in browser state (git-ignored). */
export const authFile = (key: PersonaKey) => `e2e-live/.auth/${key}.json`
