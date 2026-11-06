import { describe, expect, it } from 'vitest'
import { groupProfileFields } from '../../src/utils/profileFillDisplay'

/**
 * BUG-064 follow-up: the Convert dialog listed every field the application
 * would fill as one flat, raw list (2008-11-01, 2000.00, "+1", an address in
 * six rows). groupProfileFields() shapes it for reading.
 */
const f = (field: string, value: string, label = field) => ({ field, label, value })

describe('groupProfileFields', () => {
  it('groups the fields, gives them readable labels and formats dates and amounts', () => {
    const groups = groupProfileFields([
      f('date_of_birth', '2008-11-01', 'Date Of Birth'),
      f('ssn', '***-**-6789', 'SSN'),
      f('business_entity_type', 'Partnership'),
      f('number_of_employees', '388'),
      f('currency', 'USD'),
      f('monthly_revenue', '2000.00'),
      f('annual_revenue', '20000.00'),
    ])

    expect(groups.map((g) => g.title)).toEqual(['Personal', 'Business', 'Revenue'])
    expect(groups[0].items).toEqual([
      { key: 'date_of_birth', label: 'Date of birth', value: 'Nov 1, 2008', wide: false },
      { key: 'ssn', label: 'SSN', value: '***-**-6789', wide: false },
    ])
    expect(groups[1].items.map((i) => [i.label, i.value])).toEqual([['Entity type', 'Partnership'], ['Employees', '388']])
    expect(groups[2].items.map((i) => [i.label, i.value])).toEqual([
      ['Currency', 'USD'], ['Monthly revenue', '$2,000.00'], ['Annual revenue', '$20,000.00'],
    ])
  })

  it('puts an address on one line and leaves out the country calling code', () => {
    const groups = groupProfileFields([
      f('business_address', 'Exercitationem tenet'),
      f('business_city', 'Georgetown'),
      f('business_state', 'Delaware'),
      f('business_postal_code', '56756'),
      f('business_country', 'United States'),
      f('business_country_code', '+1'),
    ])

    expect(groups).toEqual([{
      title: 'Business address',
      icon: 'ri-map-pin-line',
      items: [{ key: 'business_address', label: 'Business address', value: 'Exercitationem tenet, Georgetown, Delaware 56756, United States', wide: true }],
    }])
  })

  it('keeps a field it does not know, under its API label', () => {
    expect(groupProfileFields([f('duns_number', '123', 'Duns Number')])).toEqual([
      { title: 'Other', icon: 'ri-more-line', items: [{ key: 'duns_number', label: 'Duns Number', value: '123', wide: false }] },
    ])
  })
})
