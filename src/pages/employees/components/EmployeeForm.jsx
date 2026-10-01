import React from 'react';
import PersonalInfoSection from './form-sections/PersonalInfoSection';
import AddressSection from './form-sections/AddressSection';

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
    isEditMode,
    onOpenFileManager,
    employeeId,
    loadingLimitCheck,
    isPurchaseFlow = false,
    purchaseMonths = 1,
    purchasePrice = 0,
    emailNotice = null
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
                    onOpenFileManager={onOpenFileManager}
                    employeeId={employeeId}
                    emailNotice={emailNotice}
                />

                <AddressSection
                    employee={employee}
                    errors={errors}
                    onChange={onChange}
                    countries={countries}
                    states={states}
                    cities={cities}
                />



                <PersonalDetailsSection employee={employee} onChange={onChange} errors={errors} />

                <AccountSection
                    employee={employee}
                    roles={roles}
                    onChange={onChange}
                    isEditMode={isEditMode}
                    errors={errors}
                    loadingLimitCheck={loadingLimitCheck}
                    isPurchaseFlow={isPurchaseFlow}
                    purchaseMonths={purchaseMonths}
                    purchasePrice={purchasePrice}
                />

                <EmergencyContactSection employee={employee} onChange={onChange} errors={errors} />
            </div>
        </form>
    );
}
