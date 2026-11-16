import { test as setup } from '@playwright/test'
import { AUTH_STATE_PATH, HOST_EMAIL, HOST_PASSWORD } from './support/live/env'
import { signInAndSave } from './support/live/login'

// Logs the host in once and saves the session every live spec reuses.
setup('authenticate as host', async ({ page, request }) => {
  await signInAndSave(setup, page, request, { email: HOST_EMAIL, password: HOST_PASSWORD, envNames: 'E2E_HOST_EMAIL and E2E_HOST_PASSWORD' }, AUTH_STATE_PATH)
})
