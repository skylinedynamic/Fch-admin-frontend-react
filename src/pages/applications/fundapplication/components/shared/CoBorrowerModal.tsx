import React, { useState, useEffect } from 'react'
import type { CoBorrower } from '../../types'
import CustomDropdown from '../../../../../components/Common/CustomDropdown'
import { countries } from '../../../../../data/countries'
import { useValidateCoBorrower } from '../../../../../modules/funding-application/queries'
import { getCountryCodeByName, getPhoneCodeByName } from '../../../../../utils/countryHelpers'
import { formatPhoneNumber, formatSSN, unformatSSN } from '../../../../../utils/borrowerFormatters'
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/themes/material_blue.css'
import { yearDropdownPlugin } from '../../../../../utils/flatpickrPlugins'
import { toast } from 'react-toastify'

type CoBorrowerModalProps = {
  coDraft: CoBorrower
  setCoDraft: (data: CoBorrower) => void
  onSubmit: (e: React.FormEvent) => void
  isEditing: boolean
}

export default function CoBorrowerModal({ coDraft, setCoDraft, onSubmit, isEditing }: CoBorrowerModalProps) {
  const [availableStates, setAvailableStates] = useState<{ name: string; code: string; cities?: string[] }[]>([])
  const [availableCities, setAvailableCities] = useState<{ name: string; code: string }[]>([])
  const [showCityInput, setShowCityInput] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [validating, setValidating] = useState(false)
  const { mutateAsync: validateCoBorrower } = useValidateCoBorrower()

  useEffect(() => {
    if (coDraft.country) {
      const code = getCountryCodeByName(coDraft.country)
      const selectedCountry = countries.find((c) => c.code === code)
      if (selectedCountry && selectedCountry.states) {
        setAvailableStates(selectedCountry.states.map((s) => ({ name: s.name, code: s.code, cities: s.cities })))
      } else {
        setAvailableStates([])
      }
    }
  }, [coDraft.country])

  // Update available cities when state changes
  useEffect(() => {
    if (coDraft.state) {
      const selectedState = availableStates.find((s) => s.name === coDraft.state || s.code === coDraft.state)
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
  }, [coDraft.state, availableStates])

  // Sync showCityInput with coDraft.city
  useEffect(() => {
    if (coDraft.city && availableCities.length > 0) {
      const exists = availableCities.find((c) => c.code === coDraft.city && c.code !== 'Others')
      if (!exists) {
        setShowCityInput(true)
      } else {
        setShowCityInput(false)
      }
    }
  }, [coDraft.city, availableCities])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setValidating(true)

    const payload = {
      first_name: coDraft.firstName,
      last_name: coDraft.lastName,
      role: coDraft.role,
      ownership: coDraft.ownershipPct,
      email: coDraft.email,
      mobile_phone: coDraft.mobilePhone,
      home_phone: coDraft.homePhone,
      date_of_birth: coDraft.dob,
      ssn: unformatSSN(coDraft.ssn),
      street_address: coDraft.streetAddress,
      country: coDraft.country,
      state: coDraft.state,
      city: coDraft.city,
      zip_code: coDraft.zip,
      drivers_license_number: coDraft.driversLicenseNumber,
      drivers_license_state: coDraft.driversLicenseState,
      phone_country_code: countries.find(c => c.name === coDraft.country)?.phone_code || '+1',
    }

    try {
      await validateCoBorrower(payload)
      // If validation successful, call the original onSubmit which likely adds the co-borrower to state
      onSubmit(e)
      setErrors({})
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        const validationErrors = error.response.data.errors
        setErrors(validationErrors)
      } else {
        toast.error(error.response?.data?.message || 'An error occurred during validation. Please try again.')
      }
    } finally {
      setValidating(false)
    }
  }

  // Helper to check if field has error
  const hasError = (fieldName: string) => !!errors[fieldName]
  const getError = (fieldName: string) => errors[fieldName]

  return (
    <div className="modal fade" id="coBorrowerModal" tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Co-Borrower</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">
                    First Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${hasError('first_name') ? 'is-invalid' : ''}`}
                    placeholder="Enter Your First Name"
                    value={coDraft.firstName}
                    onChange={(e) => setCoDraft({ ...coDraft, firstName: e.target.value })}
                  />
                  {hasError('first_name') && <div className="invalid-feedback">{getError('first_name')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Last Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${hasError('last_name') ? 'is-invalid' : ''}`}
                    placeholder="Enter Your Last Name"
                    value={coDraft.lastName}
                    onChange={(e) => setCoDraft({ ...coDraft, lastName: e.target.value })}
                  />
                  {hasError('last_name') && <div className="invalid-feedback">{getError('last_name')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Title/Role <span className="text-danger">*</span>
                  </label>
                  <CustomDropdown
                    value={coDraft.role}
                    onChange={(value) => setCoDraft({ ...coDraft, role: value })}
                    options={[
                      { label: 'Owner', value: 'Owner' },
                      { label: 'Partner', value: 'Partner' },
                      { label: 'Guarantor', value: 'Guarantor' },
                    ]}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select Role"
                    className={`w-100 ${hasError('role') ? 'is-invalid' : ''}`}
                  />
                  {hasError('role') && <div className="invalid-feedback d-block">{getError('role')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Ownership % <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className={`form-control ${hasError('ownership') ? 'is-invalid' : ''}`}
                    placeholder="Enter Ownership %"
                    value={coDraft.ownershipPct}
                    onChange={(e) => {
                      let val = e.target.value
                      if (val !== '' && Number(val) > 100) val = '100'
                      setCoDraft({ ...coDraft, ownershipPct: val })
                    }}
                    min="1"
                    max="100"
                  />
                  {hasError('ownership') && <div className="invalid-feedback">{getError('ownership')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className={`form-control ${hasError('email') ? 'is-invalid' : ''}`}
                    placeholder="Enter your Email"
                    value={coDraft.email}
                    onChange={(e) => setCoDraft({ ...coDraft, email: e.target.value })}
                  />
                  {hasError('email') && <div className="invalid-feedback">{getError('email')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Mobile Phone <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border">
                      <span className="me-1">{getCountryCodeByName(coDraft.country) || 'US'}</span>
                      <span className="text-muted">{getPhoneCodeByName(coDraft.country) || '+1'}</span>
                    </span>
                    <input
                      type="tel"
                      className={`form-control ${hasError('mobile_phone') ? 'is-invalid' : ''}`}
                      placeholder="(123) 456-7890"
                      value={coDraft.mobilePhone}
                      onChange={(e) => setCoDraft({ ...coDraft, mobilePhone: formatPhoneNumber(e.target.value) })}
                      maxLength={14}
                    />
                    {hasError('mobile_phone') && <div className="invalid-feedback">{getError('mobile_phone')}</div>}
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Home Phone</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border">
                      <span className="me-1">{getCountryCodeByName(coDraft.country) || 'US'}</span>
                      <span className="text-muted">{getPhoneCodeByName(coDraft.country) || '+1'}</span>
                    </span>
                    <input
                      type="tel"
                      className={`form-control ${hasError('home_phone') ? 'is-invalid' : ''}`}
                      placeholder="(123) 456-7890"
                      value={coDraft.homePhone}
                      onChange={(e) => setCoDraft({ ...coDraft, homePhone: formatPhoneNumber(e.target.value) })}
                      maxLength={14}
                    />
                    {hasError('home_phone') && <div className="invalid-feedback">{getError('home_phone')}</div>}
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Date of Birth <span className="text-danger">*</span>
                  </label>
                  <div className="input-group-flatpickr">
                    <Flatpickr
                      className={`form-control ${hasError('date_of_birth') ? 'is-invalid' : ''}`}
                      value={coDraft.dob}
                      onChange={(dates, dateStr) => {
                        setCoDraft({ ...coDraft, dob: dateStr })
                      }}
                      options={{
                        dateFormat: "Y-m-d",
                        altInput: true,
                        altFormat: "m-d-Y",
                        maxDate: "today",
                        yearRange: "1900:" + new Date().getFullYear(),
                        monthSelectorType: "dropdown",
                        plugins: [yearDropdownPlugin(1900)],
                      } as any}
                      placeholder="Select date of birth"
                    />
                    <span className="input-group-text">
                      <i className="ri-calendar-line"></i>
                    </span>
                  </div>
                  {hasError('date_of_birth') && <div className="invalid-feedback d-block">{getError('date_of_birth')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Social Security Number (SSN) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${hasError('ssn') ? 'is-invalid' : ''}`}
                    placeholder="xxx-xx-xxxx"
                    value={coDraft.ssn}
                    onChange={(e) => setCoDraft({ ...coDraft, ssn: formatSSN(e.target.value) })}
                  />
                  {hasError('ssn') && <div className="invalid-feedback">{getError('ssn')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Street Address <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${hasError('street_address') ? 'is-invalid' : ''}`}
                    placeholder="Enter Home Street Address"
                    value={coDraft.streetAddress}
                    onChange={(e) => setCoDraft({ ...coDraft, streetAddress: e.target.value })}
                  />
                  {hasError('street_address') && <div className="invalid-feedback">{getError('street_address')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Country <span className="text-danger">*</span>
                  </label>
                  <CustomDropdown
                    value={coDraft.country}
                    onChange={(value) => {
                      setCoDraft({ ...coDraft, country: value, state: '', city: '' })
                    }}
                    options={countries}
                    optionLabel="name"
                    optionValue="name"
                    placeholder="Select Country"
                    searchable={false}
                    className={`w-100 ${hasError('country') ? 'is-invalid' : ''}`}
                  />
                  {hasError('country') && <div className="invalid-feedback d-block">{getError('country')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    State <span className="text-danger">*</span>
                  </label>
                  <CustomDropdown
                    value={coDraft.state}
                    onChange={(value) => {
                      const selectedStateObj = availableStates.find((s) => s.code === value || s.name === value)
                      let defaultCity = ''
                      if (selectedStateObj && selectedStateObj.cities && selectedStateObj.cities.length > 0) {
                        defaultCity = selectedStateObj.cities[0]
                      }
                      setCoDraft({ ...coDraft, state: value, city: defaultCity })
                    }}
                    options={availableStates}
                    optionLabel="name"
                    optionValue="name"
                    placeholder="Select State"
                    className={`w-100 ${hasError('state') ? 'is-invalid' : ''}`}
                    disabled={!coDraft.country}
                  />
                  {hasError('state') && <div className="invalid-feedback d-block">{getError('state')}</div>}
                </div>
                <div className={showCityInput ? 'col-md-3' : 'col-md-6'}>
                  <label className="form-label">
                    City <span className="text-danger">*</span>
                  </label>
                  <CustomDropdown
                    value={showCityInput ? 'Others' : coDraft.city}
                    onChange={(value) => {
                      if (value === 'Others') {
                        setShowCityInput(true)
                        setCoDraft({ ...coDraft, city: '' })
                      } else {
                        setShowCityInput(false)
                        setCoDraft({ ...coDraft, city: value })
                      }
                    }}
                    options={availableCities}
                    optionLabel="name"
                    optionValue="code"
                    placeholder="Select City"
                    searchable={true}
                    className={`w-100 ${hasError('city') ? 'is-invalid' : ''}`}
                    disabled={!coDraft.state}
                  />
                  {hasError('city') && <div className="invalid-feedback d-block">{getError('city')}</div>}
                </div>

                {showCityInput && (
                  <div className="col-md-3">
                    <label className="form-label">
                      City Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${hasError('city') ? 'is-invalid' : ''}`}
                      placeholder="Enter City Name"
                      value={coDraft.city}
                      onChange={(e) => setCoDraft({ ...coDraft, city: e.target.value })}
                    />
                    {hasError('city') && <div className="invalid-feedback">{getError('city')}</div>}
                  </div>
                )}

                <div className="col-md-6">
                  <label className="form-label">
                    Zip Code <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${hasError('zip_code') ? 'is-invalid' : ''}`}
                    placeholder="Enter Zip Code"
                    value={coDraft.zip}
                    onChange={(e) => setCoDraft({ ...coDraft, zip: e.target.value })}
                  />
                  {hasError('zip_code') && <div className="invalid-feedback">{getError('zip_code')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Driver's License Number
                  </label>
                  <input
                    type="text"
                    className={`form-control ${hasError('drivers_license_number') ? 'is-invalid' : ''}`}
                    placeholder="Enter Driver's License Number"
                    value={coDraft.driversLicenseNumber}
                    onChange={(e) => setCoDraft({ ...coDraft, driversLicenseNumber: e.target.value })}
                  />
                  {hasError('drivers_license_number') && <div className="invalid-feedback">{getError('drivers_license_number')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Driver's License State
                  </label>
                  <CustomDropdown
                    value={coDraft.driversLicenseState}
                    onChange={(value) => setCoDraft({ ...coDraft, driversLicenseState: value })}
                    options={availableStates}
                    optionLabel="name"
                    optionValue="name"
                    placeholder="Select State"
                    className={`w-100 ${hasError('drivers_license_state') ? 'is-invalid' : ''}`}
                  />
                  {hasError('drivers_license_state') && <div className="invalid-feedback d-block">{getError('drivers_license_state')}</div>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="submit" className="btn btn-primary" disabled={validating}>
                {validating ? 'Validating...' : isEditing ? 'Update Co-Borrower' : '+ Add Co-Borrower'}
              </button>
              <button type="button" className="btn btn-light" data-bs-dismiss="modal">
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
