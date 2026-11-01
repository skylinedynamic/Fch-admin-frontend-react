import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AttachmentPicker from '../../../../../src/components/Common/Modals/activity-create/AttachmentPicker'

const file = (name: string, size = 2048) => new File([new Uint8Array(size)], name)

describe('AttachmentPicker', () => {
  it("uses New Event's label and ids by default", () => {
    render(<AttachmentPicker files={[]} onAdd={() => { }} onRemove={() => { }} errors={{}} />)

    expect(screen.getByText('Select Attachments')).toBeInTheDocument()
    expect(document.getElementById('activityAttachmentBtn')).toHaveTextContent('Add Attachment')
    expect(document.getElementById('activityAttachmentInput')).toHaveAttribute('type', 'file')
  })

  it('takes its own label and ids, so New Email can use it too', () => {
    render(
      <AttachmentPicker
        files={[file('a.pdf')]}
        onAdd={() => { }}
        onRemove={() => { }}
        errors={{}}
        label="Attachments"
        inputId="emailFile"
        buttonId="emailAttachmentBtn"
        listId="emailAttachmentList"
      />
    )

    expect(screen.getByText('Attachments')).toBeInTheDocument()
    expect(document.getElementById('emailFile')).not.toBeNull()
    expect(document.getElementById('emailAttachmentBtn')).not.toBeNull()
    expect(document.getElementById('emailAttachmentList')).toHaveTextContent('a.pdf')
  })

  it('adds the picked files and removes one', () => {
    const onAdd = vi.fn()
    const onRemove = vi.fn()
    render(<AttachmentPicker files={[file('bank.pdf'), file('id.png', 512)]} onAdd={onAdd} onRemove={onRemove} errors={{}} />)

    expect(screen.getByText('2.0 KB')).toBeInTheDocument()
    expect(screen.getByText('512 B')).toBeInTheDocument()

    const picked = file('new.docx')
    fireEvent.change(document.getElementById('activityAttachmentInput')!, { target: { files: [picked] } })
    expect(onAdd).toHaveBeenCalledWith([picked])

    fireEvent.click(screen.getByRole('button', { name: 'Remove id.png' }))
    expect(onRemove).toHaveBeenCalledWith(1)
  })

  it("shows the API's errors for the list and for a single file", () => {
    render(
      <AttachmentPicker
        files={[file('huge.zip')]}
        onAdd={() => { }}
        onRemove={() => { }}
        errors={{ attachments: ['Total attachment size may not be greater than 5MB.'], 'attachments.0': ['Allowed: pdf'] }}
      />
    )

    expect(screen.getByText('Total attachment size may not be greater than 5MB.')).toBeInTheDocument()
    expect(screen.getByText('Allowed: pdf')).toBeInTheDocument()
    expect(document.getElementById('activityAttachmentBtn')).toHaveClass('is-invalid')
  })
})
