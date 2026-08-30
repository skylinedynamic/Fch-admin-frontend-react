import React, { useState, useEffect, useCallback } from 'react'
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/themes/material_blue.css'
import type { OwnerInfo, CoBorrower } from '../../types'
import StepNavigation from '../shared/StepNavigation'
import FormSkeleton from '../../../../../components/Loader/FormSkeleton'
import CoBorrowerTable from '../shared/CoBorrowerTable'
import CustomDropdown from '../../../../../components/Common/CustomDropdown'
import { countries } from '../../../../../data/countries'
import { useOwnershipInfo, useSaveOwnershipInfo } from '../../../../../modules/funding-application/queries'
import { citizenshipOptions } from '../../../../../data/profile'
import { toast } from 'react-toastify'
import { formatPhoneNumber, formatSSN, unformatSSN } from '../../../../../utils/borrowerFormatters'
import { getCountryCodeByName, getPhoneCodeByName, getCountryNameByCode, getDefaultCountry } from '../../../../../utils/countryHelpers'
import { yearDropdownPlugin } from '../../../../../utils/flatpickrPlugins'

interface OwnershipInformationStepProps {
  owner: OwnerInfo
  setOwner: React.Dispatch<React.SetStateAction<OwnerInfo>>
  coBorrowers: CoBorrower[]
  setCoBorrowers: React.Dispatch<React.SetStateAction<CoBorrower[]>>
  onShowCoModal: () => void
  onDeleteCoBorrower: (idx: number) => void
  coDraft: CoBorrower
  setCoDraft: (data: CoBorrower) => void
  onAddCoBorrower: (e: React.FormEvent) => void
  onEditCoBorrower: (idx: number) => void
  onNext: () => void
  onBack: () => void
  loading: boolean
  isValid: boolean
  onRegisterSave?: (fn: (() => Promise<boolean>) | null) => void
  fundingSequenceId?: number | string | null
  fundingRequestId?: number | string | null
}

export default function OwnershipInformationStep({
  owner,
  setOwner,
  coBorrowers,
  setCoBorrowers,
  onShowCoModal,
  onDeleteCoBorrower,
  coDraft,
  setCoDraft,
  onAddCoBorrower,
  onEditCoBorrower,
  onNext,
  onBack,
  loading,
  isValid,
  onRegisterSave,
  fundingSequenceId,
  fundingRequestId,
}: OwnershipInformationStepProps) {
  const [availableStates, setAvailableStates] = useState<{ name: string; code: string; cities?: string[] }[]>([])
  const [availableCities, setAvailableCities] = useState<{ name: string; code: string }[]>([])
  const [showCityInput, setShowCityInput] = useState(false)
  const [lastCustomCity, setLastCustomCity] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const { data: apiData, isLoading: isApiLoading, isSuccess } = useOwnershipInfo(fundingRequestId, { enabled: !!fundingRequestId })
  const { mutateAsync: saveOwnershipInfo, isPending: isSaving } = useSaveOwnershipInfo()

  // Memoized save handler
  const handleSave = useCallback(async (): Promise<boolean> => {
    setValidationErrors({})

    const payload = {
      id: owner.id ?? null,
      funding_request_id: fundingRequestId || null,
      first_name: owner.firstName,
      last_name: owner.lastName,
      date_of_birth: owner.dob,
      ssn: unformatSSN(owner.ssn),
      citizenship_status: owner.citizenship,
      street_address: owner.streetAddress,
      country: owner.country,
      city: owner.city,
      state: owner.state,
      zip_code: owner.zip,
      ownership: owner.ownershipPct,
      has_co_borrower: owner.hasCoBorrower,
      phone_number: owner.phoneNumber,
      phone_country_code: getPhoneCodeByName(owner.country) || '+1',
      co_borrowers: owner.hasCoBorrower
        ? coBorrowers.map((cb) => ({
          id: cb.id,
          first_name: cb.firstName,
          last_name: cb.lastName,
          role: cb.role,
          ownership: cb.ownershipPct,
          email: cb.email,
          mobile_phone: cb.mobilePhone,
          home_phone: cb.homePhone,
          street_address: cb.streetAddress,
          city: cb.city,
          state: cb.state,
          zip_code: cb.zip,
          ssn: unformatSSN(cb.ssn),
          date_of_birth: cb.dob,
          drivers_license_number: cb.driversLicenseNumber,
          drivers_license_state: cb.driversLicenseState,
        }))
        : [],
    }

    try {
      await saveOwnershipInfo(payload)
      setOwner((prev) => ({ ...prev, isSaved: true }))
      return true
    } catch (error: any) {
      const errors = error.response?.data?.errors
      if (errors) {
        setValidationErrors(errors)
      } else {
        toast.error(error.response?.data?.message || 'Failed to save ownership information. Please try again.')
      }
      return false
    }
  }, [owner, coBorrowers, saveOwnershipInfo])

  // Register save function
  useEffect(() => {
    if (onRegisterSave) {
      onRegisterSave(handleSave)
    }
    return () => {
      if (onRegisterSave) onRegisterSave(null)
    }
  }, [onRegisterSave, handleSave])

  // Pre-fill form from API
  useEffect(() => {
    if (isSuccess && apiData) {
      setOwner((prev) => ({
        ...prev,
        id: apiData.id || null,
        firstName: apiData.first_name || prev.firstName,
        lastName: apiData.last_name || prev.lastName,
        dob: apiData.date_of_birth || prev.dob,
        ssn: apiData.ssn ? formatSSN(apiData.ssn) : prev.ssn,
        citizenship: apiData.citizenship_status || prev.citizenship || citizenshipOptions[0].value,
        streetAddress: apiData.street_address || prev.streetAddress,
        country: apiData.country || prev.country || getDefaultCountry().name,
        city: apiData.city || prev.city,
        state: apiData.state || prev.state,
        zip: apiData.zip_code || prev.zip,
        ownershipPct: apiData.ownership || prev.ownershipPct,
        hasCoBorrower: apiData.has_co_borrower ?? prev.hasCoBorrower,
        phoneNumber: apiData.phone_number || prev.phoneNumber,
        isSaved: apiData.is_ownership_info_saved,
      }))

      if (apiData.co_borrowers && apiData.co_borrowers.length > 0) {
        setCoBorrowers(
          apiData.co_borrowers.map((cb: any) => ({
            id: cb.id,
            firstName: cb.first_name,
            lastName: cb.last_name,
            role: cb.role,
            ownershipPct: cb.ownership,
            email: cb.email,
            mobilePhone: cb.mobile_phone,
            homePhone: cb.home_phone,
            streetAddress: cb.street_address,
            country: getDefaultCountry().name,
            city: cb.city,
            state: cb.state,
            zip: cb.zip_code,
            ssn: cb.ssn ? formatSSN(cb.ssn) : '',
            dob: cb.date_of_birth,
            driversLicenseNumber: cb.drivers_license_number,
            driversLicenseState: cb.drivers_license_state,
          }))
        )
      }
    }
  }, [isSuccess, apiData, setOwner, setCoBorrowers])

  // Helper to get field error
  const getFieldError = (fieldName: string): string | undefined => {
    return validationErrors[fieldName]
  }

  // Helper to check if field has error
  const hasError = (fieldName: string): boolean => {
    return !!validationErrors[fieldName]
  }

  // Helper to clear field error on change
  const clearError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  // Update available states when country changes
  useEffect(() => {
    if (owner.country) {
      // Use helper to verify name, or if owner.country is code (unlikely given Dropdown value='name')
      // Original: const selectedCountry = countries.find((c) => c.name === owner.country || c.code === owner.country)
      const code = getCountryCodeByName(owner.country)
      const selectedCountry = countries.find((c) => c.code === code)

      if (selectedCountry && selectedCountry.states) {
        setAvailableStates(selectedCountry.states.map((s) => ({ name: s.name, code: s.code, cities: s.cities })))
      } else {
        setAvailableStates([])
      }
    }
  }, [owner.country])

  // Update available cities when state changes
  useEffect(() => {
    if (owner.state) {
      const selectedState = availableStates.find((s) => s.name === owner.state || s.code === owner.state)
      if (selectedState && selectedState.cities) {
        const cities = selectedState.cities.map((city) => ({ name: city, code: city }))
        cities.push({ name: 'Others', code: 'Others' })
        setAvailableCities(cities)
      } else {
        setAvailableCities([{ name: 'Others', code: 'Others' }])
      }
    } else {
      setAvailableCities([])
    }
  }, [owner.state, availableStates])

  // Sync showCityInput with owner.city
  useEffect(() => {
    if (owner.city && availableCities.length > 0) {
      const exists = availableCities.find((c) => c.code === owner.city && c.code !== 'Others')
      if (!exists) {
        setShowCityInput(true)
        setLastCustomCity(owner.city)
      } else {
        setShowCityInput(false)
      }
    }
  }, [owner.city, availableCities])

  // Uncheck hasCoBorrower if modal is closed without adding anyone
  useEffect(() => {
    const modalEl = document.getElementById('coBorrowerModal')
    if (modalEl) {
      const handleHidden = () => {
        if (coBorrowers.length === 0) {
          setOwner((prev) => ({ ...prev, hasCoBorrower: false }))
        }
      }
      modalEl.addEventListener('hidden.bs.modal', handleHidden)
      return () => {
        modalEl.removeEventListener('hidden.bs.modal', handleHidden)
      }
    }
  }, [coBorrowers, setOwner])

  const dynamicStates = React.useMemo(() => {
    const opts = [...availableStates]
    if (owner.state && !opts.some((s) => s.name.toLowerCase() === owner.state.toLowerCase() || s.code.toLowerCase() === owner.state.toLowerCase())) {
      opts.unshift({ name: owner.state, code: owner.state })
    }
    return opts
  }, [availableStates, owner.state])

  const dynamicCities = React.useMemo(() => {
    const opts = [...availableCities]
    if (owner.city && !opts.some((c) => c.name.toLowerCase() === owner.city.toLowerCase() || c.code.toLowerCase() === owner.city.toLowerCase())) {
      opts.unshift({ name: owner.city, code: owner.city })
    }
    return opts
  }, [availableCities, owner.city])

  const dynamicCitizenshipOptions = React.useMemo(() => {
    const opts = [...citizenshipOptions]
    if (owner.citizenship && !opts.some((c) => c.value.toLowerCase() === owner.citizenship.toLowerCase())) {
      opts.unshift({ label: owner.citizenship, value: owner.citizenship })
    }
    return opts
  }, [owner.citizenship])

  if (loading || isApiLoading) {
    return <FormSkeleton fieldCount={10} />
  }

  const handleNext = async () => {
    const success = await handleSave()
    if (success) {
      toast.success('Ownership information saved successfully')
      onNext()
    }
  }

  return (
    <>
      <form className="row g-3">
        <div className="col-md-6">
          <label className="form-label">
            First Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${hasError('first_name') ? 'is-invalid' : ''}`}
            placeholder="Enter first name"
            value={owner.firstName}
            onChange={(e) => setOwner({ ...owner, firstName: e.target.value })}
          />
          {hasError('first_name') && <div className="invalid-feedback">{getFieldError('first_name')}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label">
            Last Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${hasError('last_name') ? 'is-invalid' : ''}`}
            placeholder="Enter last name"
            value={owner.lastName}
            onChange={(e) => setOwner({ ...owner, lastName: e.target.value })}
          />
          {hasError('last_name') && <div className="invalid-feedback">{getFieldError('last_name')}</div>}
        </div>

        <div className="col-md-6">
          <label className="form-label">
            Date of Birth <span className="text-danger">*</span>
          </label>
          <Flatpickr
            className={`form-control ${hasError('date_of_birth') ? 'is-invalid' : ''}`}
            value={owner.dob}
            onChange={(dates, dateStr) => {
              setOwner({ ...owner, dob: dateStr })
            }}
            options={{
              dateFormat: 'Y-m-d',
              altInput: true,
              altFormat: 'j M, Y',
              maxDate: 'today',
              yearRange: '1900:' + new Date().getFullYear(),
              monthSelectorType: 'dropdown',
              plugins: [yearDropdownPlugin(1900)],
            } as any}
            placeholder="Select date of birth"
          />
          {hasError('date_of_birth') && <div className="invalid-feedback d-block">{getFieldError('date_of_birth')}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label">
            Social Security Number (SSN) <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${hasError('ssn') ? 'is-invalid' : ''}`}
            placeholder="xxx-xx-xxxx"
            value={owner.ssn}
            onChange={(e) => {
              setOwner({ ...owner, ssn: formatSSN(e.target.value) })
              clearError('ssn')
            }}
          />
          {hasError('ssn') && <div className="invalid-feedback">{getFieldError('ssn')}</div>}
        </div>

        <div className="col-md-6">
          <label className="form-label">
            Phone Number <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light border">
              <span className="me-1">{getCountryCodeByName(owner.country) || 'US'}</span>
              <span className="text-muted">{getPhoneCodeByName(owner.country) || '+1'}</span>
            </span>
            <input
              type="tel"
              className={`form-control ${hasError('phone_number') ? 'is-invalid' : ''}`}
              placeholder="(123) 456-7890"
              value={owner.phoneNumber}
              onChange={(e) => setOwner({ ...owner, phoneNumber: formatPhoneNumber(e.target.value) })}
              maxLength={14}
            />
            {hasError('phone_number') && <div className="invalid-feedback">{getFieldError('phone_number')}</div>}
          </div>
        </div>

        <div className="col-md-6">
          <label className="form-label">
            Citizenship Status <span className="text-danger">*</span>
          </label>
          <CustomDropdown
            value={owner.citizenship}
            onChange={(value) => setOwner({ ...owner, citizenship: value })}
            options={dynamicCitizenshipOptions}
            optionLabel="label"
            optionValue="value"
            placeholder="Select citizenship status"
            className={`w-100 ${hasError('citizenship_status') ? 'is-invalid' : ''}`}
          />
          {hasError('citizenship_status') && (
            <div className="invalid-feedback d-block">{getFieldError('citizenship_status')}</div>
          )}
        </div>
        <div className="col-md-6">
          <label className="form-label">
            Street Address <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${hasError('street_address') ? 'is-invalid' : ''}`}
            placeholder="Enter street address"
            value={owner.streetAddress}
            onChange={(e) => setOwner({ ...owner, streetAddress: e.target.value })}
          />
          {hasError('street_address') && <div className="invalid-feedback">{getFieldError('street_address')}</div>}
        </div>

        <div className="col-md-6">
          <label className="form-label">
            Country <span className="text-danger">*</span>
          </label>
          <CustomDropdown
            value={owner.country}
            onChange={(value) => {
              setOwner({ ...owner, country: value, state: '', city: '' })
            }}
            options={countries}
            optionLabel="name"
            optionValue="name"
            placeholder="Select country"
            searchable={false}
            className={`w-100 ${hasError('country') ? 'is-invalid' : ''}`}
          />
          {hasError('country') && <div className="invalid-feedback d-block">{getFieldError('country')}</div>}
        </div>

        <div className="col-md-6">
          <label className="form-label">
            State <span className="text-danger">*</span>
          </label>
          <CustomDropdown
            value={owner.state}
            onChange={(value) => {
              const selectedStateObj = availableStates.find((s) => s.code === value || s.name === value)
              let defaultCity = ''
              if (selectedStateObj && selectedStateObj.cities && selectedStateObj.cities.length > 0) {
                defaultCity = selectedStateObj.cities[0]
              }
              setOwner({ ...owner, state: value, city: defaultCity })
            }}
            options={dynamicStates}
            optionLabel="name"
            optionValue="name"
            placeholder="Select state"
            className={`w-100 ${hasError('state') ? 'is-invalid' : ''}`}
          />
          {hasError('state') && <div className="invalid-feedback d-block">{getFieldError('state')}</div>}
        </div>

        <div className={showCityInput ? 'col-md-3' : 'col-md-6'}>
          <label className="form-label">
            City <span className="text-danger">*</span>
          </label>
          <CustomDropdown
            value={showCityInput ? 'Others' : owner.city}
            onChange={(value) => {
              if (value === 'Others') {
                setShowCityInput(true)
                setOwner({ ...owner, city: lastCustomCity })
              } else {
                setShowCityInput(false)
                setOwner({ ...owner, city: value })
              }
            }}
            options={dynamicCities}
            optionLabel="name"
            optionValue="code"
            placeholder="Select city"
            searchable={true}
            className={`w-100 ${hasError('city') ? 'is-invalid' : ''}`}
          />
          {hasError('city') && <div className="invalid-feedback d-block">{getFieldError('city')}</div>}
        </div>

        {showCityInput && (
          <div className="col-md-3">
            <label className="form-label">
              City Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${hasError('city') ? 'is-invalid' : ''}`}
              placeholder="Enter city name"
              value={owner.city}
              onChange={(e) => {
                const val = e.target.value
                setLastCustomCity(val)
                setOwner({ ...owner, city: val })
              }}
              required
            />
            {hasError('city') && <div className="invalid-feedback">{getFieldError('city')}</div>}
          </div>
        )}

        <div className="col-md-6">
          <label className="form-label">
            Zip Code <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${hasError('zip_code') ? 'is-invalid' : ''}`}
            placeholder="Enter zip code"
            value={owner.zip}
            onChange={(e) => setOwner({ ...owner, zip: e.target.value })}
          />
          {hasError('zip_code') && <div className="invalid-feedback">{getFieldError('zip_code')}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label">
            Ownership % <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            className={`form-control ${hasError('ownership') ? 'is-invalid' : ''}`}
            placeholder="Enter ownership %"
            value={owner.ownershipPct}
            onChange={(e) => {
              let val = e.target.value
              if (val !== '' && Number(val) > 100) val = '100'
              setOwner({ ...owner, ownershipPct: val })
            }}
            min="1"
            max="100"
          />
          {hasError('ownership') && <div className="invalid-feedback">{getFieldError('ownership')}</div>}
        </div>

        <div className="col-12 d-flex align-items-center">
          <div className="form-check">
            <input
              id="hasCoBorrower"
              className="form-check-input"
              type="checkbox"
              checked={owner.hasCoBorrower}
              onChange={(e) => {
                const checked = e.target.checked
                setOwner((prev: OwnerInfo) => ({ ...prev, hasCoBorrower: checked }))
                if (checked) {
                  setTimeout(onShowCoModal, 150)
                }
              }}
            />
            <label htmlFor="hasCoBorrower" className="form-check-label">
              Has Co-Borrower?
            </label>
          </div>
        </div>

        {owner.hasCoBorrower && (
          <div className="col-12 mt-2">
            <CoBorrowerTable
              coBorrowers={coBorrowers}
              onDelete={onDeleteCoBorrower}
              onEdit={onEditCoBorrower}
              onAdd={onShowCoModal}
            />
          </div>
        )}

        <StepNavigation
          onBack={onBack}
          onNext={handleNext}
          isNextDisabled={!isValid || isSaving}
          loading={loading || isApiLoading || isSaving}
        />
      </form>

    </>
  )
}
