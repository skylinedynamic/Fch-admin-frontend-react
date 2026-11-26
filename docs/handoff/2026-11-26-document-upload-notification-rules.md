# Document upload notifications: partner and staff bell (E2E)

**Date:** 2026-11-26
**Author:** Awlad Hossain

## Problem
A document upload from the Clients menu notified no one. A client's own upload notified only the client's partner, never the host partner or the client's assigned staff.

## Solution
The change is backend only: see fch-api `docs/handoff/2026-11-26-document-upload-notification-rules.md` for the recipient table. The client's partner, the host partner and the assigned staff now receive the `partner.documents.uploaded` bell ("<uploader> uploaded N document(s) for <client>.") linking to `/clients/{id}`, plus an email. No one is notified of their own upload.

No portal code changed.

Changing a client's Assigned To now also notifies the client's partner and the host (`partner.client.assignee_changed`) and the new assignee (`staff.client.assigned`). Both bells link to `/clients/{id}`, and both audiences also get an email.

## Files changed
- `e2e/sidebar/clients/client-documents-uploaded-notification.spec.ts`: new mocked spec.
- `e2e/sidebar/clients/client-assigned-notification.spec.ts`: new mocked spec, one test per assignment notification.

## Tests
- **E2E:** clicking each notification opens the client.
- **Run:** `E2E_BASE_URL= npx playwright test e2e/sidebar/clients/client-documents-uploaded-notification.spec.ts e2e/sidebar/clients/client-assigned-notification.spec.ts --project=mock` gave 3 passed. `.env.e2e` points at the dev server on :5174; when that server is not running, clearing `E2E_BASE_URL` makes the spec use the local preview build instead.

## Open / follow-up
- None in this repo.
