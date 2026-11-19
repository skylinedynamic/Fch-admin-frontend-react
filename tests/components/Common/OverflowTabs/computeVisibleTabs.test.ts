import { describe, expect, it } from 'vitest'
import { computeVisibleTabs } from '../../../../src/components/Common/OverflowTabs'

/**
 * Which tabs fit on the one line, the rest going into More: tabs keep their
 * order, the More button's width is kept free once anything overflows, and the
 * open tab is always on the line.
 */
describe('computeVisibleTabs', () => {
  it('shows every tab when they all fit - no More button needed', () => {
    expect(computeVisibleTabs([100, 100, 100], 300, 80, 0)).toEqual([0, 1, 2])
  })

  it('leaves room for More once the tabs overflow', () => {
    // 300 for the tabs, minus 80 for More: two 100px tabs fit.
    expect(computeVisibleTabs([100, 100, 100, 100], 300, 80, 0)).toEqual([0, 1])
  })

  it('keeps tabs in order and stops at the first that does not fit', () => {
    expect(computeVisibleTabs([100, 150, 50], 260, 60, 0)).toEqual([0])
  })

  it('brings the open tab onto the line, in place of the last tab that fitted', () => {
    expect(computeVisibleTabs([100, 100, 100, 100, 100], 300, 80, 4)).toEqual([0, 4])
  })

  it('keeps an open tab that already fits where it is', () => {
    expect(computeVisibleTabs([100, 100, 100, 100], 300, 80, 1)).toEqual([0, 1])
  })

  it('shows at least the open tab, however narrow the line', () => {
    expect(computeVisibleTabs([200, 200], 100, 80, 1)).toEqual([1])
  })

  it('shows everything before anything is measured (no layout yet)', () => {
    expect(computeVisibleTabs([0, 0, 0], 0, 0, 0)).toEqual([0, 1, 2])
  })
})
