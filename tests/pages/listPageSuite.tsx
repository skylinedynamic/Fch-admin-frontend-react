import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../test-utils'
import { allowBackgroundCalls, api, paginated, renderPage, signIn, type TestUser } from './pageHarness'

/**
 * The behaviour every list screen shares: load rows from the API, show an
 * empty state, send the search term, reset it, gate "Add" and row selection
 * on permissions, and bulk-delete after confirmation.
 *
 * A page test calls describeListPage() with what is specific to that screen
 * and adds its own tests for anything beyond this contract.
 *
 * The calling file must mock react-toastify and bootstrap's Modal itself
 * (vi.mock is hoisted per file) - see any *.list.test.tsx.
 */
export type ListPageSpec = {
  name: string
  page: () => ReactElement
  path: string
  /** The list call. `wrap` shapes the rows into this endpoint's response. */
  list: { method: 'get' | 'post'; path: string; wrap?: (rows: unknown[]) => unknown }
  rows: Record<string, unknown>[]
  /** Text that must be on screen once the rows have loaded. */
  shows: string[]
  emptyText?: string
  /** Permissions needed just to see the page content. */
  view?: string[]
  /** Extra properties for the signed-in user (host flag, role, ...). */
  user?: TestUser
  search?: {
    placeholder: string | RegExp
    /** How the term is applied. Defaults to the "Filters" button. */
    apply?: 'button' | 'enter'
    /** Reads the term back out of the recorded request. */
    read?: (request: { body: any; url: string }) => unknown
  }
  /** Set to false for pages with no Clear button. */
  clear?: boolean
  sort?: {
    /** The first request, before any header is clicked. */
    initial: { field: string; order: 'asc' | 'desc' }
    /** A sortable column: its first click must ask for ascending (A-Z). */
    header: string
    field: string
  }
  create?: { permission?: string; label: RegExp; role: 'button' | 'link'; target: string }
  selection?: { permission: string }
  bulkDelete?: {
    permission: string
    method: 'post' | 'delete'
    path: string
    /** Expected request body, given the ids of the selected rows. */
    body?: (ids: unknown[]) => unknown
    successToast: string
    errorToast?: string
  }
}

export function describeListPage(spec: ListPageSpec, toast: { success: unknown; error: unknown }) {
  const wrap = spec.list.wrap ?? ((rows: unknown[]) => paginated(rows))
  const view = spec.view ?? []

  const mount = (permissions: string[], rows: unknown[] = spec.rows) => {
    signIn({ ...spec.user, permissions: [...view, ...permissions] })
    allowBackgroundCalls()
    const list = api(spec.list.method, spec.list.path, wrap(rows))
    const rendered = renderPage(spec.page(), { path: spec.path })
    return { list, ...rendered }
  }

  const loaded = () => screen.findByText(spec.shows[0])
  const applyButton = () =>
    screen.getAllByRole('button').find((button) => /^\W*filters?$/i.test(button.textContent?.trim() ?? '')) as HTMLElement

  describe(`${spec.name} - list`, () => {
    beforeEach(() => vi.clearAllMocks())

    it('renders the rows returned by the API', async () => {
      const { list } = mount([])

      await loaded()
      for (const text of spec.shows) expect(screen.getAllByText(text).length).toBeGreaterThan(0)
      expect(list.calls).toBeGreaterThan(0)
    })

    if (spec.emptyText) {
      it('shows the empty message when the API returns no rows', async () => {
        mount([], [])

        expect(await screen.findByText(spec.emptyText!)).toBeInTheDocument()
      })
    }

    if (spec.sort) {
      const sort = spec.sort
      const sortOf = (list: { bodies: any[]; urls: string[] }, index: number) => {
        const body = list.bodies[index] ?? {}
        const params = new URL(list.urls[index] ?? '', 'http://x').searchParams
        return { field: body.sort_field ?? params.get('sort_field'), order: body.sort_order ?? params.get('sort_order') }
      }

      it(`loads sorted by ${sort.initial.field} ${sort.initial.order}`, async () => {
        const { list } = mount([])
        await loaded()

        expect(sortOf(list, 0)).toEqual(sort.initial)
      })

      it(`the first click on "${sort.header}" asks for ascending`, async () => {
        const user = userEvent.setup()
        const { list } = mount([])
        await loaded()

        const header = screen.getAllByRole('columnheader').find((th) => th.textContent?.trim().startsWith(sort.header))!
        await user.click(header.querySelector('.p-column-title') ?? header)

        await waitFor(() => expect(sortOf(list, list.bodies.length - 1)).toEqual({ field: sort.field, order: 'asc' }))
      })
    }

    if (spec.search) {
      const search = spec.search
      const read = search.read ?? (({ body, url }) => `${JSON.stringify(body ?? {})} ${decodeURIComponent(url)}`)

      it('sends the search term to the API', async () => {
        const user = userEvent.setup()
        const { list } = mount([])
        await loaded()

        const box = screen.getByPlaceholderText(search.placeholder)
        await user.type(box, 'needle')
        if (search.apply === 'enter') await user.keyboard('{Enter}')
        else await user.click(applyButton())

        await waitFor(() => {
          const last = { body: list.bodies[list.bodies.length - 1], url: list.urls[list.urls.length - 1] ?? '' }
          expect(String(read(last))).toContain('needle')
        })
      })

      if (spec.clear !== false) {
        it('Clear empties the search box', async () => {
          const user = userEvent.setup()
          mount([])
          await loaded()
          const box = screen.getByPlaceholderText(search.placeholder)

          await user.type(box, 'needle')
          await user.click(screen.getAllByRole('button').find((button) => /^\W*clear$/i.test(button.textContent?.trim() ?? ''))!)

          expect(box).toHaveValue('')
        })
      }
    }
  })

  if (spec.create) {
    const create = spec.create

    describe(`${spec.name} - create`, () => {
      beforeEach(() => vi.clearAllMocks())

      if (create.permission) {
        it(`hides "${create.label.source}" without "${create.permission}"`, async () => {
          mount([])

          await loaded()
          expect(screen.queryByRole(create.role, { name: create.label })).not.toBeInTheDocument()
        })
      }

      it('opens the create page', async () => {
        const user = userEvent.setup()
        mount(create.permission ? [create.permission] : [])
        await loaded()
        const control = screen.getByRole(create.role, { name: create.label })

        if (create.role === 'link') {
          expect(control).toHaveAttribute('href', create.target)
          return
        }
        await user.click(control)
        expect(await screen.findByTestId('landing')).toHaveTextContent(`navigated:${create.target}`)
      })
    })
  }

  if (spec.selection) {
    const selection = spec.selection
    const boxes = (container: HTMLElement) => container.querySelectorAll('.p-datatable-tbody .p-checkbox')

    describe(`${spec.name} - row selection`, () => {
      it(`offers no selection without "${selection.permission}"`, async () => {
        const { container } = mount([])

        await loaded()
        expect(boxes(container)).toHaveLength(0)
      })

      it(`offers selection with "${selection.permission}"`, async () => {
        const { container } = mount([selection.permission])

        await loaded()
        expect(boxes(container).length).toBeGreaterThan(0)
      })
    })
  }

  if (spec.bulkDelete) {
    const remove = spec.bulkDelete

    const selectAndConfirm = async (user: ReturnType<typeof userEvent.setup>, container: HTMLElement) => {
      await loaded()
      await user.click(container.querySelector('.p-datatable-tbody .p-checkbox')!)
      await user.click(await screen.findByRole('button', { name: /delete selected/i }))
      await user.click(await screen.findByRole('button', { name: 'Yes, Delete It' }))
    }

    describe(`${spec.name} - bulk delete`, () => {
      beforeEach(() => vi.clearAllMocks())

      it('deletes the selected row once confirmed', async () => {
        const user = userEvent.setup()
        const { container } = mount([remove.permission])
        const call = api(remove.method, remove.path, { status: true, message: remove.successToast })

        await selectAndConfirm(user, container)

        await waitFor(() => expect(call.calls).toBeGreaterThan(0))
        if (remove.body) expect(call.bodies[0]).toEqual(remove.body([spec.rows[0].id]))
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith(remove.successToast))
      })

      it('does nothing when the confirmation is closed', async () => {
        const user = userEvent.setup()
        const { container } = mount([remove.permission])
        const call = api(remove.method, remove.path, { status: true })

        await loaded()
        await user.click(container.querySelector('.p-datatable-tbody .p-checkbox')!)
        await user.click(await screen.findByRole('button', { name: /delete selected/i }))
        await user.click(await screen.findByRole('button', { name: 'Close' }))

        expect(call.calls).toBe(0)
      })

      if (remove.errorToast) {
        it('reports a failed delete', async () => {
          const user = userEvent.setup()
          const { container } = mount([remove.permission])
          api(remove.method, remove.path, { status: false, message: remove.errorToast }, 500)

          await selectAndConfirm(user, container)

          await waitFor(() => expect(toast.error).toHaveBeenCalledWith(remove.errorToast))
        })
      }
    })
  }
}
