# Partner Profile - Component Architecture

## ✅ Complete Separation Achieved

### 📁 File Structure

```
src/
├── assets/css/
│   └── dropdown-validation.css          # Dropdown red border styling
├── config/
│   ├── locations.js                     # Country/State/City data
│   └── relations.js                     # Contact person relations
├── components/errors/
│   └── validation.js                    # Validation utilities
├── modules/partner/
│   └── services.ts                      # API services
└── pages/partners/
    ├── PartnerProfile.jsx               # Main container (450 lines)
    └── components/
        ├── PartnerForm.jsx              # Tab wrapper component
        ├── PartnerInformationSection.jsx # Partner info fields
        ├── StatusAgentSection.jsx       # Agent & partner type
        ├── DocumentsSection.jsx         # Documents table
        ├── ClientListSection.jsx        # Client list table
        └── SubscriptionSection.jsx      # Subscription fields
```

## 📋 Main Component: PartnerProfile.jsx

**Purpose:** Container component managing state and business logic

**Responsibilities:**
- ✅ State management (formData, errors, locations, activeTab)
- ✅ Data fetching (useEffect for partner data)
- ✅ Validation logic (validateField function)
- ✅ Event handlers (handleInputChange, handleAgentChange, handleSave)
- ✅ Cascading location dropdowns logic
- ✅ Form submission with validation
- ✅ Page layout (breadcrumbs, metrics, tabs, activity sidebar)

**Props Passed to PartnerForm:**
```javascript
<PartnerForm
    activeTab={activeTab}
    formData={formData}
    errors={errors}
    profileImage={profileImage}
    handleInputChange={handleInputChange}
    handleAgentChange={handleAgentChange}
    countries={countries}
    states={states}
    cities={cities}
/>
```

## 🎯 Component: PartnerForm.jsx

**Purpose:** Tab content wrapper

**Responsibilities:**
- ✅ Determines which tab section to display
- ✅ Passes props down to section components
- ✅ Clean conditional rendering

**Renders:**
- `PartnerInformationSection` for personalDetails tab
- `StatusAgentSection` for statusAgent tab
- `DocumentsSection` for documents tab
- `ClientListSection` for clientList tab
- `SubscriptionSection` for subscription tab

## 📝 Section: PartnerInformationSection.jsx

**Fields Included:**
- ✅ Profile image upload
- ✅ Full Name* (with validation & red border)
- ✅ Company Name* (with validation & red border)
- ✅ Phone Number* (with validation & red border)
- ✅ Email* (with validation & red border)
- ✅ **Country* Dropdown** (with red border when invalid)
- ✅ **State* Dropdown** (with red border when invalid, disabled until country selected)
- ✅ **City* Dropdown** (with red border when invalid, disabled until state selected)
- ✅ Zip Code
- ✅ Address
- ✅ Joining Date (Flatpickr)
- ✅ Tax ID
- ✅ Website
- ✅ **Secondary Contact Section:**
  - Name
  - Phone
  - Email
  - **Relation Dropdown** (using relationOptions from config)
  - Other Relation (shown conditionally)

## 👔 Section: StatusAgentSection.jsx

**Fields Included:**
- ✅ Agent (select dropdown)
- ✅ Agent Email (auto-filled, readonly)
- ✅ Agent Phone (auto-filled, readonly)
- ✅ Partner Type (select dropdown)

## 📄 Section: DocumentsSection.jsx

**Content:**
- ✅ Documents table with sample data
- ✅ File name, type, size, upload date
- ✅ Action dropdown (View, Download, Delete)

## 👥 Section: ClientListSection.jsx

**Content:**
- ✅ Client list table
- ✅ Name, Company, Email, Phone, Joining Date
- ✅ Pagination controls

## 💳 Section: SubscriptionSection.jsx

**Fields Included:**
- ✅ Partner URL
- ✅ Billing Term (select)
- ✅ First Registration Date (Flatpickr)
- ✅ First Registration Amount ($)
- ✅ First Payment Amount ($)
- ✅ First Registration Amount 2 ($)
- ✅ Recurring Amount ($)
- ✅ Total Amount ($)
- ✅ Subscription Start Date (Flatpickr)
- ✅ Subscription End Date (Flatpickr)
- ✅ Expiry Date (Flatpickr)
- ✅ Termination Date (Flatpickr)

## 🎨 Validation & Styling

### Required Fields (Red Asterisk):
- Full Name*
- Company Name*
- Phone Number*
- Email*
- Country*
- State*
- City*

### Error Display:
**Text Inputs:**
```jsx
className={`form-control ${errors.full_name ? 'is-invalid' : ''}`}
{errors.full_name && <div className="invalid-feedback">{errors.full_name}</div>}
```

**PrimeReact Dropdowns:**
```jsx
className={`w-100 ${errors.country ? 'p-invalid' : ''}`}
{errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
```

### CSS for Red Border on Dropdowns:
```css
/* dropdown-validation.css */
.p-dropdown.p-invalid {
    border-color: #f06548 !important;
}

.p-dropdown.p-invalid:hover,
.p-dropdown.p-invalid:focus {
    border-color: #f06548 !important;
    box-shadow: 0 0 0 0.2rem rgba(240, 101, 72, 0.25) !important;
}
```

## 🔄 Data Flow

```
PartnerProfile.jsx (Container)
    ↓ (passes props)
PartnerForm.jsx (Wrapper)
    ↓ (passes props to active section)
[Section Components]
    ↓ (render fields)
Form Fields
    ↓ (onChange events)
handleInputChange in PartnerProfile
    ↓ (updates state & validates)
formData & errors state updated
    ↓ (re-render with updated props)
Section components show validation
```

## 📦 Config Files

### relations.js
```javascript
export const relationOptions = [
    { label: 'Partner', value: 'Partner' },
    { label: 'Co-Owner', value: 'Co-Owner' },
    { label: 'Wife/Husband', value: 'Wife/Husband' },
    { label: 'Employee', value: 'Employee' },
    { label: 'Other', value: 'Other' }
];
```

## ✅ Validation Rules

| Field | Validation | Error Message |
|-------|-----------|---------------|
| full_name | Required | "Full name is required." |
| company_name | Required | "Company name is required." |
| phone_number | Required + Format | "Phone number is required." / Format error |
| email | Required + Format | "Email is required." / Format error |
| country | Required | "Country is required." |
| state | Required | "State is required." |
| city | Required | "City is required." |

## 🚀 Form Submission

**Pre-submission Validation:**
1. Validates all required fields
2. Shows toast error if validation fails
3. Prevents submission with invalid data

**Submission Flow:**
1. FormData object created
2. All form fields appended
3. Image file appended if selected
4. POST/PUT request based on ID
5. Success toast → Navigate to /partners
6. Error toast if failed

## 🎯 Benefits of This Architecture

✅ **Separation of Concerns:** Each section is isolated
✅ **Reusability:** Components can be reused
✅ **Maintainability:** Easy to update individual sections
✅ **Testability:** Components can be tested independently
✅ **Scalability:** Easy to add new sections
✅ **Clean Code:** Main file is focused on logic
✅ **Consistent Validation:** Same pattern across all fields
✅ **Error Feedback:** Clear visual indicators (red borders)

## 📊 Component Sizes

| File | Lines | Purpose |
|------|-------|---------|
| PartnerProfile.jsx | 450 | Main container & logic |
| PartnerForm.jsx | ~75 | Tab wrapper |
| PartnerInformationSection.jsx | ~270 | Partner info fields |
| StatusAgentSection.jsx | ~70 | Agent & type |
| DocumentsSection.jsx | ~90 | Documents table |
| ClientListSection.jsx | ~80 | Client list |
| SubscriptionSection.jsx | ~220 | Subscription fields |

**Total:** Well-organized, maintainable codebase matching EmployeeDetails.jsx pattern!
