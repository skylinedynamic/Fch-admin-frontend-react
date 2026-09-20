import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import SeoSettingEdit from '../../../src/pages/cms/SeoSettingEdit'

vi.mock('primereact/dropdown', () => ({
  Dropdown: (props: any) => (
    <select
      data-testid="page-dropdown"
      value={props.value}
      onChange={(e) => props.onChange({ value: e.target.value })}
    >
      <option value="" />
      {props.options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}))

afterEach(() => server.resetHandlers())

describe('SeoSettingEdit page options', () => {
  it(
    'REGRESSION: blogsData?.data?.data (double-nested) meant the blog picker was always empty — ' +
      'corrected to blogsData?.data (commit 48e8e7c) to match the real single-level API envelope',
    async () => {
      server.use(
        http.post('*/admin/cms/blogs/fetch', () =>
          HttpResponse.json({ data: [{ id: 1, title: 'Test Blog', slug: 'test-blog' }] })
        ),
        http.post('*/admin/cms/seo-settings', () => HttpResponse.json({ data: [] }))
      )

      renderWithProviders(<SeoSettingEdit />)

      const dropdown = await screen.findByTestId('page-dropdown')
      await waitFor(() => {
        expect(screen.getByText('Blog: Test Blog — /blog/test-blog')).toBeInTheDocument()
      })
      expect(dropdown.querySelectorAll('option')).not.toHaveLength(1)
    }
  )
})
