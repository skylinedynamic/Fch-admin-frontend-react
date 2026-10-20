import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { Route, Routes, useLocation } from 'react-router-dom'
import { fireEvent, renderWithProviders, screen, waitFor } from '../../test-utils'
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

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

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
        http.get('*/admin/cms/seo-settings', () => HttpResponse.json({ data: [] }))
      )

      renderWithProviders(<SeoSettingEdit />)

      const dropdown = await screen.findByTestId('page-dropdown')
      await waitFor(() => {
        expect(screen.getByText('Blog: Test Blog — /blog/test-blog')).toBeInTheDocument()
      })
      expect(dropdown.querySelectorAll('option')).not.toHaveLength(1)
    }
  )

  it(
    'REGRESSION: a record on page 2 of the list opened as an empty form because the edit page ' +
      'searched the first page of the paginated list — it now loads the record by id',
    async () => {
      server.use(
        http.post('*/admin/cms/blogs/fetch', () => HttpResponse.json({ data: [] })),
        http.get('*/admin/cms/seo-settings', () => HttpResponse.json({ data: [] })),
        http.get('*/admin/cms/seo-settings/19', () =>
          HttpResponse.json({
            data: {
              id: 19,
              page_name: 'Pre-Qualification',
              path: '/pre-qualification',
              meta_title: 'Pre-Qualification Title',
              meta_description: 'Pre-Qualification description',
              keywords: 'funding',
              og_image: 'http://localhost/storage/seo-settings/pre-qual.png',
            },
          })
        )
      )

      renderWithProviders(
        <Routes>
          <Route path="/cms/seo-settings/edit/:id" element={<SeoSettingEdit />} />
        </Routes>,
        { route: '/cms/seo-settings/edit/19' }
      )

      expect(await screen.findByDisplayValue('Pre-Qualification Title')).toBeInTheDocument()
      expect(screen.getByTestId('page-dropdown')).toHaveValue('Pre-Qualification')
      expect(screen.getByAltText('OG Preview')).toHaveAttribute(
        'src',
        'http://localhost/storage/seo-settings/pre-qual.png'
      )
    }
  )

  it('updates a page-2 record with its loaded values and returns to the same list page', async () => {
    let posted: Record<string, FormDataEntryValue> | null = null
    server.use(
      http.post('*/admin/cms/blogs/fetch', () => HttpResponse.json({ data: [] })),
      http.get('*/admin/cms/seo-settings', () => HttpResponse.json({ data: [] })),
      http.get('*/admin/cms/seo-settings/19', () =>
        HttpResponse.json({
          data: {
            id: 19,
            page_name: 'Pre-Qualification',
            path: '/pre-qualification',
            meta_title: 'Old Title',
            meta_description: 'Old description',
            keywords: 'funding',
            og_image: 'http://localhost/storage/seo-settings/pre-qual.png',
          },
        })
      ),
      http.post('*/admin/cms/seo-settings/19', async ({ request }) => {
        const form = await request.formData()
        posted = {}
        form.forEach((value, key) => { posted![key] = value })
        return HttpResponse.json({ data: { id: 19 } })
      })
    )

    renderWithProviders(
      <Routes>
        <Route path="/cms/seo-settings/edit/:id" element={<SeoSettingEdit />} />
        <Route path="/cms/seo-settings" element={<LocationProbe />} />
      </Routes>,
      { route: { pathname: '/cms/seo-settings/edit/19', state: { listSearch: '?page=2' } } as any }
    )

    const title = await screen.findByDisplayValue('Old Title')
    fireEvent.change(title, { target: { value: 'New Title' } })
    fireEvent.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByTestId('location')).toHaveTextContent('/cms/seo-settings?page=2')
    expect(posted).toMatchObject({
      page_name: 'Pre-Qualification',
      path: '/pre-qualification',
      meta_title: 'New Title',
      meta_description: 'Old description',
      keywords: 'funding',
      og_image: 'seo-settings/pre-qual.png',
    })
  })
})
