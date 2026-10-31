import { describe, expect, it } from 'vitest'
import { categoryState, groupDocumentsByCategory, OTHER_DOCUMENTS_CATEGORY } from '../../src/utils/documentCategories'

const TYPES = [
  { id: 1, name: "Driver's License", sort_order: 1, is_required: true },
  { id: 2, name: 'Voided Business Check', sort_order: 2, is_required: true },
  { id: 3, name: 'Business Plan', sort_order: 3, is_required: false },
  { id: 4, name: 'Tax Returns', sort_order: 4, is_required: false },
]
const doc = (id: number, type: string, status?: string) => ({ id, document_name: `f${id}.pdf`, type, size: '1 KB', date: '2026-10-29', status })

describe('categoryState', () => {
  it('is missing with no file, re-upload with only rejected ones', () => {
    expect(categoryState([])).toBe('missing')
    expect(categoryState([doc(1, 'x', 'Rejected')])).toBe('reupload')
  })

  it('is accepted once any file is accepted, else in review', () => {
    expect(categoryState([doc(1, 'x', 'Rejected'), doc(2, 'x', 'Accepted')])).toBe('accepted')
    expect(categoryState([doc(1, 'x', 'Uploaded')])).toBe('review')
    expect(categoryState([doc(1, 'x', 'Under Review'), doc(2, 'x', 'Rejected')])).toBe('review')
    expect(categoryState([doc(1, 'x')])).toBe('review')
  })
})

describe('groupDocumentsByCategory', () => {
  it('puts each file under its category, the required ones first in their order', () => {
    const { categories } = groupDocumentsByCategory(
      [doc(1, 'Business Plan', 'Uploaded'), doc(2, "Driver's License", 'Accepted'), doc(3, "Driver's License", 'Rejected')],
      TYPES
    )

    expect(categories.map((c) => c.name)).toEqual(["Driver's License", 'Voided Business Check', 'Business Plan'])
    expect(categories[0]).toMatchObject({ required: true, state: 'accepted', typeId: 1 })
    expect(categories[0].documents.map((d) => d.id)).toEqual([2, 3])
    expect(categories[1]).toMatchObject({ required: true, state: 'missing', documents: [] })
    expect(categories[2]).toMatchObject({ required: false, state: 'review', typeId: 3 })
  })

  it('leaves empty optional categories out of the cards, as a list to upload into', () => {
    const { categories, emptyOptional } = groupDocumentsByCategory([doc(1, 'Business Plan')], TYPES)

    expect(categories.map((c) => c.name)).not.toContain('Tax Returns')
    expect(emptyOptional).toEqual([{ id: 4, name: 'Tax Returns' }])
  })

  it('matches category names loosely (case, curly apostrophe) and keeps unknown ones under Other', () => {
    const { categories } = groupDocumentsByCategory(
      [doc(1, 'DRIVER’S LICENSE', 'Accepted'), doc(2, 'Something Old', 'Uploaded')],
      TYPES
    )

    expect(categories[0].documents.map((d) => d.id)).toEqual([1])
    const other = categories.find((c) => c.name === OTHER_DOCUMENTS_CATEGORY)!
    expect(other).toMatchObject({ required: false, typeId: null })
    expect(other.documents.map((d) => d.id)).toEqual([2])
  })

  it('counts the required categories that are done (accepted or in review)', () => {
    const { requiredDone, requiredTotal, counts } = groupDocumentsByCategory(
      [doc(1, "Driver's License", 'Accepted'), doc(2, 'Voided Business Check', 'Rejected'), doc(3, 'Business Plan', 'Uploaded')],
      TYPES
    )

    expect([requiredDone, requiredTotal]).toEqual([1, 2])
    expect(counts).toEqual({ accepted: 1, review: 1, rejected: 1 })
  })
})
