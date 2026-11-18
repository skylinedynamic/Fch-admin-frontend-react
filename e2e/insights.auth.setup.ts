import { test as setup } from '@playwright/test'
import { INSIGHTS_AUTH_STATE_PATH, INSIGHTS_EMAIL, INSIGHTS_PASSWORD } from './support/live/env'
import { signInAndSave } from './support/live/login'

// Business Insights is for logins holding the developer-only Business Insights
// permissions - the Developer role's alone (fch-api BusinessInsightsPermissionSeeder) -
// so its live specs sign in as a Developer rather than the usual host.
setup('authenticate as the Business Insights login', async ({ page, request }) => {
  await signInAndSave(setup, page, request, { email: INSIGHTS_EMAIL, password: INSIGHTS_PASSWORD, envNames: 'E2E_INSIGHTS_EMAIL and E2E_INSIGHTS_PASSWORD' }, INSIGHTS_AUTH_STATE_PATH)
})
