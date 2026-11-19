import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// The edit modal's summernote import crashes under jsdom (no <canvas>).
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: ActivitySidebar } = await import('../../../../src/components/Common/Activity/ActivitySidebar')

/**
 * A sent email and a logged event: the row shows only who created it and when
 * (no To / Subject, no event date); opening it shows the full details.
 */

const today = (time: string) => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`
}

const email = {
  id: 1,
  log_type: 'Email Sent',
  log_type_raw: 'email',
  event_label: 'Email Sent',
  causer_name: 'Host Admin',
  to_emails: ['xekased@mailinator.com', 'second@example.test'],
  subject: 'Domain activation process',
  description: 'Please point your domain at us.',
  created_at: today('17:37:00'),
  attachments: [],
}

const event = {
  id: 2,
  log_type: 'Activity Created',
  log_type_raw: 'activity',
  event_label: 'Activity Created',
  causer_name: 'Host Admin',
  reference: 'Meeting',
  subject: 'Kick-off',
  description: 'Walk through the funding options',
  activity_date: today('18:30:00'),
  assigned_user: { id: 5, name: 'Sam Staff' },
  created_at: today('17:00:00'),
  attachments: [],
}

const serve = (rows: unknown[]) =>
  server.use(
    http.post('*/common/activity-logs/fetch-all-activities', () => HttpResponse.json({ status: true, data: rows }))
  )

const props = { entityId: 175, entityType: 'Lead', partnerId: null, borrowerEmail: null, partnerEmail: null, hostEmail: null, isHost: true }

const rowOf = async (title: string) => (await screen.findByText(title)).closest('.accordion-button') as HTMLElement
const bodyOf = (row: HTMLElement) => row.closest('.accordion-item')!.querySelector('.accordion-body') as HTMLElement

describe('ActivitySidebar - a sent email', () => {
  afterEach(() => server.resetHandlers())

  it('shows only who sent it and when on its row, no To or Subject', async () => {
    serve([email])
    renderWithProviders(<ActivitySidebar {...props} />)

    const row = await rowOf('Email Sent')
    expect(row).toHaveTextContent('by Host Admin')
    expect(row).toHaveTextContent('Today at 05:37 PM')
    expect(row).not.toHaveTextContent('To:')
    expect(row).not.toHaveTextContent('Subject:')
    expect(row).not.toHaveTextContent('xekased@mailinator.com')
  })

  it('opens to the full email: recipients, subject and message', async () => {
    serve([email])
    renderWithProviders(<ActivitySidebar {...props} />)

    const row = await rowOf('Email Sent')
    await userEvent.click(row)
    const body = within(bodyOf(row))
    expect(body.getByText('To')).toBeInTheDocument()
    expect(body.getByText('xekased@mailinator.com, second@example.test')).toBeInTheDocument()
    expect(body.getByText('Subject')).toBeInTheDocument()
    expect(body.getByText('Domain activation process')).toBeInTheDocument()
    expect(body.getByText('Please point your domain at us.')).toBeInTheDocument()
  })
})

describe('ActivitySidebar - a logged event', () => {
  afterEach(() => server.resetHandlers())

  it('shows its name, who created it and when it was created, not the event date', async () => {
    serve([event])
    renderWithProviders(<ActivitySidebar {...props} />)

    const row = await rowOf('Meeting: Kick-off')
    expect(row).toHaveTextContent('by Host Admin')
    expect(row).toHaveTextContent('Today at 05:00 PM')
    expect(row).not.toHaveTextContent('06:30 PM')
  })

  it('opens to its details: type, date, assignee and description', async () => {
    serve([event])
    renderWithProviders(<ActivitySidebar {...props} />)

    const row = await rowOf('Meeting: Kick-off')
    await userEvent.click(row)
    const body = within(bodyOf(row))
    expect(body.getByText('Type')).toBeInTheDocument()
    expect(body.getByText('Meeting')).toBeInTheDocument()
    expect(body.getByText('Date')).toBeInTheDocument()
    expect(body.getByText('Today at 06:30 PM')).toBeInTheDocument()
    expect(body.getByText('Assigned to')).toBeInTheDocument()
    expect(body.getByText('Sam Staff')).toBeInTheDocument()
    expect(body.getByText('Walk through the funding options')).toBeInTheDocument()
  })
})
