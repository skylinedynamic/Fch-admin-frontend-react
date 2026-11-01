import { describe, expect, it } from 'vitest'
import { COMMISSION_VIEWER, resolveCommissionViewer } from '../../../src/modules/commission'

describe('resolveCommissionViewer', () => {
  it('takes the viewer the API sends', () => {
    expect(resolveCommissionViewer('host_staff', { is_host: 1 })).toBe(COMMISSION_VIEWER.HOST_STAFF)
    expect(resolveCommissionViewer('partner_staff', { is_host: 0 })).toBe(COMMISSION_VIEWER.PARTNER_STAFF)
  })

  // An older API (or a cached response) sends no viewer: fall back to the host flag.
  it('falls back to host owner or partner owner when the API sends none', () => {
    expect(resolveCommissionViewer(undefined, { is_host: 1 })).toBe(COMMISSION_VIEWER.HOST_OWNER)
    expect(resolveCommissionViewer(undefined, { is_host: true })).toBe(COMMISSION_VIEWER.HOST_OWNER)
    expect(resolveCommissionViewer(undefined, { is_host: 0 })).toBe(COMMISSION_VIEWER.PARTNER_OWNER)
    expect(resolveCommissionViewer(undefined, null)).toBe(COMMISSION_VIEWER.PARTNER_OWNER)
  })

  it('ignores a viewer it does not know', () => {
    expect(resolveCommissionViewer('someone_else', { is_host: 1 })).toBe(COMMISSION_VIEWER.HOST_OWNER)
  })
})
