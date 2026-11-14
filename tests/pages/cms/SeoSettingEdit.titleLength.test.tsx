import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { Route, Routes } from 'react-router-dom'
import { fireEvent, renderWithProviders, screen, waitFor } from '../../test-utils'
import SeoSettingEdit from '../../../src/pages/cms/SeoSettingEdit'
import { SEO_META_TITLE_MAX_LENGTH } from '../../../src/config/seo'

// R3-BUG-015: the SEO title shows how many of its 120 characters are used and
// stops at 120; the API's refusal is shown under the field.

vi.mock('primereact/dropdown', () => ({
  Dropdown: (props: any) => (
    <select data-testid="page-dropdown" value={props.value} onChange={(e) => props.onChange({ value: e.target.value })}>
      <option value="" />
      {props.options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
}))

afterEach(() => server.resetHandlers())

const ORIGINAL = 'About Four Corner Funding | Fintech Funding Platform'

function mockRecord(metaTitle: string, onSave?: (form: FormData) => Response | Promise<Response>) {
  server.use(
    http.post('*/admin/cms/blogs/fetch', () => HttpResponse.json({ data: [] })),
    http.get('*/admin/cms/seo-settings', () => HttpResponse.json({ data: [] })),
    http.get('*/admin/cms/seo-settings/9', () =>
      HttpResponse.json({ data: { id: 9, page_name: 'About Us', path: '/about-us', meta_title: metaTitle, meta_description: 'd', keywords: '' } })
    ),
    http.post('*/admin/cms/seo-settings/9', async ({ request }) => {
      const form = await request.formData()
      return onSave ? onSave(form) : HttpResponse.json({ data: { id: 9 } })
    })
  )
}

function renderEdit() {
  return renderWithProviders(
    <Routes>
      <Route path="/cms/seo-settings/edit/:id" element={<SeoSettingEdit />} />
      <Route path="/cms/seo-settings" element={<div>SEO list</div>} />
    </Routes>,
    { route: '/cms/seo-settings/edit/9' }
  )
}

describe('SeoSettingEdit SEO title length', () => {
  it('the limit is 120 characters', () => {
    expect(SEO_META_TITLE_MAX_LENGTH).toBe(120)
  })

  it('shows how many characters the title uses and stops typing at 120', async () => {
    mockRecord(ORIGINAL)
    renderEdit()

    const input = await screen.findByDisplayValue(ORIGINAL)
    expect(input).toHaveAttribute('maxLength', '120')
    expect(screen.getByTestId('meta-title-count')).toHaveTextContent(`${ORIGINAL.length} / 120`)

    fireEvent.change(input, { target: { value: 'x'.repeat(120) } })
    expect(screen.getByTestId('meta-title-count')).toHaveTextContent('120 / 120')
  })

  it('flags an older title that is already over the limit, and still saves it unchanged', async () => {
    const long = 'c'.repeat(150)
    let sent: FormDataEntryValue | null = null
    mockRecord(long, (form) => {
      sent = form.get('meta_title')
      return HttpResponse.json({ data: { id: 9 } })
    })
    renderEdit()

    await screen.findByDisplayValue(long)
    const count = screen.getByTestId('meta-title-count')
    expect(count).toHaveTextContent('150 / 120')
    expect(count).toHaveClass('text-danger')
    expect(screen.getByText(/over the 120-character limit/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /update/i }))
    expect(await screen.findByText('SEO list')).toBeInTheDocument()
    expect(sent).toBe(long)
  })

  it("shows the API's refusal under the title", async () => {
    mockRecord(ORIGINAL, () =>
      HttpResponse.json(
        { message: 'The SEO title may not be longer than 120 characters.', errors: { meta_title: ['The SEO title may not be longer than 120 characters.'] } },
        { status: 422 }
      )
    )
    renderEdit()

    await screen.findByDisplayValue(ORIGINAL)
    fireEvent.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByText('The SEO title may not be longer than 120 characters.')).toBeInTheDocument()
  })

  it('a suggested title for a long page name stays within 120 characters', async () => {
    const title = 'How to Build Business Credit Fast With Net-30 Vendor Accounts and Keep Your Personal Credit Out of It'
    server.use(
      http.post('*/admin/cms/blogs/fetch', () => HttpResponse.json({ data: [{ id: 1, title, slug: 'net-30' }] })),
      http.get('*/admin/cms/seo-settings', () => HttpResponse.json({ data: [] }))
    )
    renderWithProviders(<SeoSettingEdit />)

    const dropdown = await screen.findByTestId('page-dropdown')
    await waitFor(() => expect(screen.getByText(`Blog: ${title} — /blog/net-30`)).toBeInTheDocument())
    fireEvent.change(dropdown, { target: { value: `Blog: ${title}` } })

    const input = screen.getByPlaceholderText('SEO optimized title') as HTMLInputElement
    expect(input.value.length).toBeGreaterThan(0)
    expect(input.value.length).toBeLessThanOrEqual(120)
  })

  it('a short page name still gets the brand suffix', async () => {
    server.use(
      http.post('*/admin/cms/blogs/fetch', () => HttpResponse.json({ data: [{ id: 1, title: 'Net-30', slug: 'net-30' }] })),
      http.get('*/admin/cms/seo-settings', () => HttpResponse.json({ data: [] }))
    )
    renderWithProviders(<SeoSettingEdit />)

    const dropdown = await screen.findByTestId('page-dropdown')
    await waitFor(() => expect(screen.getByText('Blog: Net-30 — /blog/net-30')).toBeInTheDocument())
    fireEvent.change(dropdown, { target: { value: 'Blog: Net-30' } })

    expect(screen.getByPlaceholderText('SEO optimized title')).toHaveValue('Blog: Net-30 | Four Corner Funding')
  })
})
