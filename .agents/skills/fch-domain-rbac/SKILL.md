---
name: fch-domain-rbac
description: Comprehensive domain knowledge, multi-tenant RBAC permissions, host vs white-label partner rules, billing, capital access, credit builder, and entity relationships across the FCH platform. Use when working on tenant isolation, user permissions, branding, or domain workflows.
---

# FCH Platform Domain & Multi-Tenant Architecture

## 1. Multi-Tenant Role Hierarchy & Scoping
- **Host Partner (`is_host == 1`)**: Primary platform owner (Four Corner Holdings). Has super-admin access across white-label partners, global platform settings, and platform subscription billing.
- **White-Label Partner (`is_host == 0`)**: Partner organization operating under custom branding. Manages its own borrowers, team members, applications, and billing.
- **Borrower / Client**: End customers enrolled under a partner or directly with the host.
- **Employee / Staff**: Internal team members assigned to specific departments and permission roles.

## 2. White-Label Branding System
- Branding configurations are stored per partner in `AppConfiguration` (`module = AppConfiguration::MODULE_BRANDING`).
- Dynamic branding assets include site name, primary logo, secondary logo, favicon, primary/secondary theme colors, address, and support contact details.

## 3. Core Functional Domains
- **Invoices & Billing**: Manages enrollment fees, down payments, installments, platform fees, user seat fees, and commission payouts (`is_partner_paying` flag distinguishes partner vs borrower payable invoices).
- **Invoice Ownership Filter (`is_mine`)**:
  - `All Invoice` (`value: null`)
  - `Mine Only` (`value: true`)
  - `Borrower Only` (`value: false`)
- **Capital Access & Sequencing**: Dynamic funding strategy roadmap, pre-flight checklists, playbooks, step progression, and execution verification.
- **Credit Builder**: Vendor credit accounts, vendor application wizards, credit monitoring progress tracking, and educational credit resources.
- **Fund Application & Pre-Qualification**: Multi-step borrower application wizards (Personal Info, Business Details, Financial Information, Ownership Structure, Co-Borrower Modal).
