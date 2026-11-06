/**
 * Which copy of the funding application this wizard is editing.
 *
 * Every step save sends the whole step, so a tab left open on an older copy
 * used to overwrite what another tab (or the borrower) had saved since, with no
 * warning (R2 BUG-033). The API gives each copy a `version`; the wizard sends
 * the one it is working from as `expected_version`, and the API refuses a save
 * from an older copy with 409.
 *
 * The version is taken from the first load, then from each save's response -
 * never from a later background refetch, which could carry someone else's
 * change that this page does not show.
 */
let current: string | null = null

const versionOf = (data: unknown): string | null => {
  const version = (data as { version?: unknown } | null | undefined)?.version
  return typeof version === 'string' && version !== '' ? version : null
}

/** A step loaded: its version is used only if the wizard has none yet. */
export function adoptLoadedVersion(data: unknown): void {
  if (current === null) {
    current = versionOf(data)
  }
}

/** A save went through: the application is now at the version it returned. */
export function rememberSavedVersion(data: unknown): void {
  const version = versionOf(data)
  if (version !== null) {
    current = version
  }
}

/** The payload, with the version this page is working from when it has one. */
export function withExpectedVersion<T extends object>(payload: T): T & { expected_version?: string } {
  return current ? { ...payload, expected_version: current } : payload
}

/** A new wizard (another request, or the page opened again) starts over. */
export function resetApplicationVersion(): void {
  current = null
}

export function currentApplicationVersion(): string | null {
  return current
}

/** The API refused a save made from an older copy. */
export const isStaleApplicationError = (error: unknown): boolean =>
  (error as { response?: { status?: number } } | null)?.response?.status === 409
