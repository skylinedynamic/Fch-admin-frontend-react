import { useState, useCallback } from 'react'
import Modal from 'bootstrap/js/dist/modal'
import { toast } from 'react-toastify'
import type { CoBorrower } from '../types'

// Constants
const CO_BORROWER_MODAL_ID = 'coBorrowerModal'

const EMPTY_CO_BORROWER: CoBorrower = {
  firstName: '',
  lastName: '',
  role: '',
  ownershipPct: '',
  email: '',
  mobilePhone: '',
  homePhone: '',
  streetAddress: '',
  country: 'United States',
  city: '',
  state: '',
  zip: '',
  ssn: '',
  dob: '',
  driversLicenseNumber: '',
  driversLicenseState: '',
}

export const useCoBorrowers = () => {
  const [coBorrowers, setCoBorrowers] = useState<CoBorrower[]>([])
  const [coDraft, setCoDraft] = useState<CoBorrower>(EMPTY_CO_BORROWER)
  const [editIndex, setEditIndex] = useState<number | null>(null)

  const showModal = useCallback(() => {
    const modalEl = document.getElementById(CO_BORROWER_MODAL_ID)
    if (modalEl) {
      Modal.getOrCreateInstance(modalEl).show()
    }
  }, [])

  const hideCoModal = useCallback(() => {
    const modalEl = document.getElementById(CO_BORROWER_MODAL_ID)
    if (modalEl) {
      Modal.getInstance(modalEl)?.hide()
    }
  }, [])

  const addCoBorrower = useCallback(() => {
    setEditIndex(null)
    setCoDraft(EMPTY_CO_BORROWER)
    showModal()
  }, [showModal])

  const editCoBorrower = useCallback(
    (idx: number) => {
      setEditIndex(idx)
      setCoDraft(coBorrowers[idx])
      showModal()
    },
    [coBorrowers, showModal]
  )

  const submitCoBorrower = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (editIndex !== null) {
        setCoBorrowers((prev) => {
          const updated = [...prev]
          updated[editIndex] = coDraft
          return updated
        })
      } else {
        setCoBorrowers((prev) => [...prev, coDraft])
      }

      setCoDraft(EMPTY_CO_BORROWER)
      setEditIndex(null)
      hideCoModal()
      toast.success(editIndex !== null ? 'Co-borrower updated' : 'Co-borrower added')
    },
    [coDraft, editIndex, hideCoModal]
  )

  const deleteCoBorrower = useCallback((idx: number) => {
    setCoBorrowers((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  return {
    coBorrowers,
    setCoBorrowers,
    coDraft,
    setCoDraft,
    addCoBorrower,
    submitCoBorrower,
    deleteCoBorrower,
    editCoBorrower,
    isEditing: editIndex !== null,
    emptyCoDraft: EMPTY_CO_BORROWER,
  }
}
