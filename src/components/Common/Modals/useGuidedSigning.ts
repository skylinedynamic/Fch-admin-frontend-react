import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  listSigningFields,
  placeSignature,
  prefillSigningDates,
  SIGNING_GUIDE_CSS,
  type SigningField,
} from '../../../utils/agreementSigning'

const STYLE_ID = 'asg-guide-css'

// The agreement page's own script calls this on the page showing it when a
// signing line ("Sign here") is clicked (Agreement Builder PREVIEW_JS: in the
// builder it opens the file manager). Here it opens "Adopt your signature".
const SIGN_HOOK = '__openFmForBlock'

/**
 * Guided signing of the agreement shown in `frameRef`: which fields are left,
 * a "Next field" that takes the signer to the next one, the date signed filled
 * with today, and signatures adopted in SignatureDialog put on their lines.
 *
 * The agreement page lays itself out again once its fonts and images load,
 * rebuilding its fields: what was filled here is put back when that happens.
 */
export function useGuidedSigning(frameRef: RefObject<HTMLIFrameElement | null>, resetKey: unknown) {
  const [fields, setFields] = useState<SigningField[]>([])
  const [currentKey, setCurrentKey] = useState<string | null>(null)
  const [signingBlock, setSigningBlock] = useState<string | null>(null)
  const signatures = useRef(new Map<string, string>())
  const cleanup = useRef<(() => void) | null>(null)

  const docOf = () => frameRef.current?.contentDocument || null

  const refresh = useCallback(() => {
    const doc = docOf()
    if (!doc) return
    prefillSigningDates(doc)
    signatures.current.forEach((image, blockId) => {
      const pad = doc.querySelector(`.preview-dropzone[data-block-id="${CSS.escape(blockId)}"]`)
      if (pad && !pad.classList.contains('is-signed')) placeSignature(doc, blockId, image)
    })
    const list = listSigningFields(doc)
    doc.querySelectorAll('.asg-todo').forEach((el) => el.classList.remove('asg-todo'))
    list.forEach((field) => { if (field.required && !field.filled) field.target.classList.add('asg-todo') })
    setFields(list)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFrameLoad = useCallback(() => {
    cleanup.current?.()
    const doc = docOf()
    if (!doc?.body) return
    if (!doc.getElementById(STYLE_ID)) {
      const style = doc.createElement('style')
      style.id = STYLE_ID
      style.textContent = SIGNING_GUIDE_CSS
      ;(doc.head || doc.body).appendChild(style)
    }
    doc.addEventListener('input', refresh)
    doc.addEventListener('change', refresh)
    const form = doc.getElementById('agreement-form')
    const relaid = form ? new MutationObserver(() => refresh()) : null
    if (form && relaid) relaid.observe(form, { childList: true })
    cleanup.current = () => {
      doc.removeEventListener('input', refresh)
      doc.removeEventListener('change', refresh)
      relaid?.disconnect()
    }
    refresh()
  }, [refresh])

  // A new agreement (or version) starts with nothing signed.
  useEffect(() => {
    signatures.current.clear()
    setCurrentKey(null)
    setFields([])
  }, [resetKey])

  useEffect(() => {
    const host = window as unknown as Record<string, unknown>
    host[SIGN_HOOK] = (blockId: string) => {
      const pad = docOf()?.querySelector(`.preview-dropzone[data-block-id="${CSS.escape(blockId)}"]`)
      // A logo is a drop zone too, but has no field to sign.
      if (pad?.querySelector('input')) setSigningBlock(blockId)
    }
    return () => {
      delete host[SIGN_HOOK]
      cleanup.current?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusField = (field: SigningField) => {
    const doc = docOf()
    doc?.querySelectorAll('.asg-current').forEach((el) => el.classList.remove('asg-current'))
    field.target.classList.add('asg-current')
    field.target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    if (field.kind === 'text' || field.kind === 'checkbox') field.input.focus({ preventScroll: true })
    setCurrentKey(field.key)
  }

  /** The next required field left to fill, after the current one (wrapping round). */
  const next = () => {
    const doc = docOf()
    const list = doc ? listSigningFields(doc) : fields
    const todo = list.filter((f) => f.required && !f.filled)
    if (!todo.length) return
    const at = list.findIndex((f) => f.key === currentKey)
    const after = todo.find((f) => list.indexOf(f) > at) || todo[0]
    focusField(after)
    if (after.kind === 'signature') setSigningBlock(after.target.getAttribute('data-block-id'))
  }

  const applySignature = (image: string) => {
    const doc = docOf()
    if (!doc || !signingBlock) return
    signatures.current.set(signingBlock, image)
    placeSignature(doc, signingBlock, image)
    setSigningBlock(null)
    refresh()
  }

  const required = fields.filter((f) => f.required)
  return {
    onFrameLoad,
    next,
    /** The signer has been taken to a field at least once. */
    started: currentKey !== null,
    total: required.length,
    done: required.filter((f) => f.filled).length,
    signingBlock,
    applySignature,
    closeSignature: () => setSigningBlock(null),
  }
}
