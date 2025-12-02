import React from 'react';
import PersonalInfoSection from './form-sections/PersonalInfoSection';
import AddressSection from './form-sections/AddressSection';
import IdentificationSection from './form-sections/IdentificationSection';
import PersonalDetailsSection from './form-sections/PersonalDetailsSection';
import AccountSection from './form-sections/AccountSection';
import EmergencyContactSection from './form-sections/EmergencyContactSection';

export default function EmployeeForm({
    employee,
    errors,
    onChange,
    departments,
    roles,
    countries,
    states,
    cities,
    countryCodeOptions,
    phonePrefix,
    onPhonePrefixChange,
    onAddDepartment,
    isEditMode
}) {
    return (
        <form onSubmit={(e) => e.preventDefault()}>
            <div className="row">
                <PersonalInfoSection
                    employee={employee}
                    errors={errors}
                    onChange={onChange}
                    departments={departments}
                    onAddDepartment={onAddDepartment}
                    countryCodeOptions={countryCodeOptions}
                    phonePrefix={phonePrefix}
                    onPhonePrefixChange={onPhonePrefixChange}
                />

                <AddressSection
                    employee={employee}
                    errors={errors}
                    onChange={onChange}
                    countries={countries}
                    states={states}
                    cities={cities}
                />

                <IdentificationSection employee={employee} onChange={onChange} />

                <PersonalDetailsSection employee={employee} onChange={onChange} />

                <AccountSection
                    employee={employee}
                    roles={roles}
                    onChange={onChange}
                    isEditMode={isEditMode}
                    errors={errors}
                />

                <EmergencyContactSection employee={employee} onChange={onChange} />
            </div>
        </form>
    );
}
