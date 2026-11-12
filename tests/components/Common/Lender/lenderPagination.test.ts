import { describe, expect, it } from 'vitest'
import { LENDER_PAGE_SIZES, paginate } from '../../../../src/components/Common/Lender/lenderPagination'

/** The Lender Information table's pages: which rows, and the "Showing x to y of n" numbers. */
const twelve = Array.from({ length: 12 }, (_, i) => i + 1)

describe('paginate', () => {
  it('offers 10, 25 and 50 per page', () => {
    expect(LENDER_PAGE_SIZES).toEqual([10, 25, 50])
  })

  it('shows the first ten of twelve on page 1', () => {
    expect(paginate(twelve, 1, 10)).toEqual({ rows: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], page: 1, pageCount: 2, total: 12, from: 1, to: 10 })
  })

  it('shows the remaining two of twelve on page 2', () => {
    expect(paginate(twelve, 2, 10)).toEqual({ rows: [11, 12], page: 2, pageCount: 2, total: 12, from: 11, to: 12 })
  })

  it('pages any count: 25 at 10 a page is 1-10, 11-20, 21-25', () => {
    const many = Array.from({ length: 25 }, (_, i) => i + 1)
    expect(paginate(many, 2, 10)).toMatchObject({ pageCount: 3, from: 11, to: 20 })
    expect(paginate(many, 3, 10)).toMatchObject({ rows: [21, 22, 23, 24, 25], from: 21, to: 25 })
  })

  it('shows all twelve on one page at 25 per page', () => {
    expect(paginate(twelve, 1, 25)).toMatchObject({ page: 1, pageCount: 1, from: 1, to: 12 })
  })

  it('keeps a page past the end on the last page (a filter left fewer rows)', () => {
    expect(paginate(twelve, 5, 10)).toMatchObject({ rows: [11, 12], page: 2 })
  })

  it('keeps a page before the start on page 1', () => {
    expect(paginate(twelve, 0, 10)).toMatchObject({ page: 1, from: 1, to: 10 })
  })

  it('has one empty page when nothing matches', () => {
    expect(paginate([], 1, 10)).toEqual({ rows: [], page: 1, pageCount: 1, total: 0, from: 0, to: 0 })
  })
})
