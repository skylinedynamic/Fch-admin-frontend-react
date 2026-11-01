# Partner profile › Configuration — agreement builder opens full screen

2026-10-30

## Problem

In Partner profile › Configuration › Agreement, **Edit Agreement** opened the Agreement Builder inside the Configuration panel. That panel sits in a narrow column. The profile card is only `col-xxl-8`, because the Activity sidebar takes the other third. The card adds `p-4` padding, and the Configuration menu takes about 200px. Inside that space the builder still shows its Palette and Document Settings panels, so the document canvas between them was squeezed to a sliver and the agreement could hardly be edited. Settings › Agreement Builder was fine, because there the builder gets the whole page.

## Solution

- When the builder is used inside a `ConfigPartnerProvider` (partner profile › Configuration) and is on its builder screen, it renders as a **full-screen overlay**. The agreement list (dashboard) stays inline in the panel. Only the editor goes full screen.
- The overlay is portalled to `<body>` (`createPortal`), so no ancestor's width, padding or overflow can clip it. React context still reaches it, so every call still names the partner (`partner_id`) and nothing about saving or activity logging changed.
- It is a `role="dialog"` with `aria-modal="true"`, labelled e.g. "Acme Funding's borrower agreement". The toolbar's sub-title names the partner ("Editing Acme Funding's active template for borrower onboarding"). The back arrow becomes **Close editor**, which returns to the agreement list.
- The page behind it does not scroll while it is open (`body` overflow hidden, restored on close/unmount).
- `z-index: 1045` puts it above the app's topbar and sidebar and below Bootstrap modals (1050+), so the builder's File Manager modal still opens on top. Toasts stay on top too.
- Settings › Agreement Builder (no provider) is unchanged and still edits in place.

Alternatives considered: hiding the Activity sidebar and collapsing the menu while Agreement is open (gains only ~600px, and the layout jumps), a separate route (more routing and re-loading the partner), and starting with the side panels collapsed (awkward to edit).

## Files changed

- `src/pages/settings/components/AgreementBuilder/index.tsx`: full-screen portal when a config partner is set; body scroll lock; partner name in the sub-title; "Close editor" label on the back button.
- `assets/css/agreement-builder.css`: `.ab4-fullscreen` overlay, and the builder root fills it.
- `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx`: new "full-screen editor" tests.
- `tests/pages/partners/PartnerConfigurationSection.test.tsx`: new open/close integration test.
- `e2e/sidebar/partners/partner-configuration.spec.ts`: the agreement flow checks that the editor covers the viewport, saves with `partner_id` and closes back to the list.

## Testing

- Red first: the 3 new unit tests and 1 integration test failed (no dialog / no "Close editor") before the change.
- Unit: Settings edits in place (no dialog); a partner's editor is a named modal dialog outside the component tree, with body scroll locked; Close returns to the list and restores scroll.
- Integration: Partner › Configuration › Agreement › Edit Agreement opens the dialog, and Close editor returns to "Borrower Agreement Paper".
- E2E (mock project, after `npm run build`): `partner-configuration.spec.ts` 6/6 passed with `--workers=1`. The editor's bounding box equals the viewport. A screenshot at 1600×900 was checked by eye: the editor covers the topbar and sidebar, the full A4 canvas is visible, and toasts show on top.
- `npm run typecheck` clean. `npx vitest run`: 216 files, 1608 passed (+2 expected fail).

## Open items

- Closing (button) discards unsaved edits without asking. This is the same as the existing back button under Settings. An "unsaved changes" prompt would help both.
- Escape does not close the editor. This is deliberate, so that Escape in the File Manager modal or a text field cannot drop the editor.
- Image uploads from the builder still use the signed-in host's File Manager, not the partner's (carried over from 2026-10-29).
