import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { cleanup, render, screen } from '@testing-library/react'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))
vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))
// The File Manager: picking a file hands back its path inside the vendors folder.
vi.mock('../../../src/components/FileManagerModal/FileManagerModal', () => ({
  FileManagerModal: (props: { isOpen: boolean; entityType: string; zIndex?: number; onSelectFiles: (files: { path: string; url: string }[]) => void }) =>
    props.isOpen ? (
      <div data-testid="file-manager" data-entity-type={props.entityType} data-z-index={String(props.zIndex ?? '')}>
        <button type="button" onClick={() => props.onSelectFiles([{ path: 'uline.png', url: 'vendors/uline.png' }])}>Pick uline.png</button>
        <button type="button" onClick={() => props.onSelectFiles([{ path: 'notes.pdf', url: 'vendors/notes.pdf' }])}>Pick notes.pdf</button>
      </div>
    ) : null,
}))

import type { ComponentType } from 'react'
import { toast } from 'react-toastify'
import TierVendorModalJsx from '../../../src/pages/tiers/components/TierVendorModal'

const TierVendorModal = TierVendorModalJsx as unknown as ComponentType<Record<string, unknown>>

/**
 * A vendor's logo (shown on the client's Credit Guide) is chosen in the File
 * Manager, like a credit account's image: the form sends the file's storage
 * path. A vendor saved without choosing one keeps the logo it has.
 */
const VENDOR = { id: 7, name: 'Uline', general_url: 'https://www.uline.com', status: 'active', logo: 'http://api.test/storage/vendors/old.png' }

const open = (props: Record<string, unknown> = {}) => {
  const onSubmit = vi.fn()
  render(<TierVendorModal show onHide={() => {}} onSubmit={onSubmit} tierId={2} serverErrors={{}} {...props} />)
  return { onSubmit }
}

describe('TierVendorModal › logo from the File Manager', () => {
  afterEach(() => cleanup())

  it('opens the File Manager on the vendors folder and sends the chosen path', async () => {
    const user = userEvent.setup()
    const { onSubmit } = open()

    await user.click(screen.getByRole('button', { name: 'Choose logo' }))
    expect(screen.getByTestId('file-manager')).toHaveAttribute('data-entity-type', 'vendors')
    // Above the vendor dialog (a Bootstrap modal, z-index 1055), not behind it.
    expect(Number(screen.getByTestId('file-manager').dataset.zIndex)).toBeGreaterThan(1055)
    await user.click(screen.getByRole('button', { name: 'Pick uline.png' }))

    expect(screen.queryByTestId('file-manager')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Logo' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ logo: 'vendors/uline.png' }))
  })

  it('refuses a file that is not an image', async () => {
    const user = userEvent.setup()
    const { onSubmit } = open()

    await user.click(screen.getByRole('button', { name: 'Choose logo' }))
    await user.click(screen.getByRole('button', { name: 'Pick notes.pdf' }))

    expect(toast.error).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('logo')
  })

  it('an edit shows the logo on file and, left alone, does not send one', async () => {
    const user = userEvent.setup()
    const { onSubmit } = open({ vendor: VENDOR })

    expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute('src', VENDOR.logo)
    expect(screen.getByRole('button', { name: 'Change logo' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Update' }))
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('logo')
  })
})
