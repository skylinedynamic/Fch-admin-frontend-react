---
name: fch-react-frontend
description: Component conventions, PrimeReact DataTable alignment & filters, Zustand state management, form state handling, and API integration for the FCH React frontends (react-fch & borrower-fch). Use when modifying React UI components, PrimeReact Dropdowns, DataTables, forms, or modals.
---

# FCH React Frontend Architecture & Conventions

## 1. PrimeReact Dropdowns & Filter Controls
- **Always specify `optionLabel="label"` and `optionValue="value"`** on `<Dropdown>` components when options are objects `{ label, value }`.
- Example:
  ```jsx
  <Dropdown 
      value={selectedStatus}
      options={INVOICE_STATUS_OPTIONS} 
      optionLabel="label"
      optionValue="value"
      placeholder="All Status" 
      onChange={(e) => setSelectedStatus(e.value)}
  />
  ```
- **Filter Payload Sanitization**: In `loadData()`, use `extractValue(val)` helper to safely unwrap object values if any dropdown state holds `{ label, value }`.

## 2. PrimeReact DataTable & Column Alignment
- Action / last columns MUST always be center aligned:
  ```jsx
  <Column 
      header="Action" 
      body={actionBodyTemplate} 
      style={{ minWidth: '150px' }} 
      alignHeader="center" 
      align="center"
      headerClassName="text-center"
      bodyClassName="text-center"
  ></Column>
  ```
- Inside `actionBodyTemplate`, wrap action buttons in:
  ```jsx
  <div className="d-flex align-items-center justify-content-center gap-2">...</div>
  ```

## 3. Local Timezone Date Range Formatting
- Format Date Range parameters using local timezone (`YYYY-MM-DD`) before sending to backend to prevent date shifting:
  ```js
  const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };
  ```

## 4. State Management & API Architecture
- **Zustand Stores**:
  - `useAuthStore`: Manages user profile (`is_host`, `entity_type`, `partner_id`), auth token, session checking.
  - `useBrandingStore`: Manages dynamic white-label branding, logos, site title, theme colors.
- **API Client**: `apiClient` instance configured with base URL, authorization headers, and timezone headers.
- **Skeleton Loaders**: Use `ListSkeletonLoader`, `DetailsSkeletonLoader`, and `TableLoader` during loading states to prevent layout shifts.
