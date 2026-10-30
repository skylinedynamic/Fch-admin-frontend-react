# Agreement: text flows across pages, letterhead, signing line and guided partner signing

**Date:** 2026-10-30
**Branch:** agreement-in-config

## Problem
- **Gaps between pages.** A block that did not fit the rest of a page moved whole to the next page and left a gap. A heading could also end up alone at the bottom of a page, with its text on the next one.
- **Long text was refused.** Typing or pasting past the end of a page was undone with "Page limit reached!", so long clauses could not be pasted. Pasting from Word also brought its fonts and colours.
- **Logo and signature looked plain.** The logo was a lone centred image. The signature was a grey box with an icon, and the date was a separate "Click here" box.
- **Partner signing was not guided.** Partners had no help finding the fields left to fill. The signature was picked from the file manager as a URL, which the server's signed record does not accept (it takes only a base64 image).

## Solution
- **One page layout (`pagination.ts`).**
  - `planPages` lays out blocks on A4 pages. A text block that does not fit the rest of a page is cut between lines (table rows are kept whole). A heading, or a short bold line, stays with the first line after it. A top margin is not counted at the top of a page.
  - `measureLineBoxes` reads a block's lines.
  - The builder canvas uses both functions directly. The saved template's script (PREVIEW_JS) embeds them with `.toString()`, so the canvas, the preview and the signing page lay out the same way.
- **Editing long text.**
  - The page-limit guard is gone. Every page slice of a split block can be edited.
  - When typing pushes the caret off its slice, it moves to the next slice at the same place in the text.
  - Paste comes in as plain text with its line breaks.
- **Letterhead.** New logo blocks default to a letterhead: the logo on the left, and the company name, address, email and phone (merge fields) on the right, with a rule below. Property panel › Style switches between Letterhead and Logo only. Logo blocks saved earlier keep their old look.
- **Signing line.**
  - A yellow "Sign here" flag sits on a rule, with the signer's name (`{{signer.name}}`, can be switched off) and the role under it. "Date signed" sits beside it.
  - The builder shows where the date goes instead of a date picker.
  - Letterhead and signing-line CSS live in `LAYOUT_CSS`, shared by the canvas and the template. They are laid out as tables so the server's PDF renderer can draw them.
- **Starter template.** "Business funding agreement" uses the letterhead and the new signing line.
- **Guided partner signing** (`AgreementSignModal.tsx`, the same as the borrower portal):
  - A bar shows "N of M required fields completed" with Start / Next field. Fields still to fill are flagged and the current one is ringed.
  - The date signed fills itself and cannot be changed.
  - "Sign here" opens "Adopt your signature" (Type or Draw), which produces a PNG. The file-manager signature is gone.
  - Files: `utils/agreementSigning.ts`, `components/Common/Modals/useGuidedSigning.ts`, `SignatureDialog.tsx`/`.css`. These are identical copies of the client-fch files; keep them in sync.

## Files changed
- `src/pages/settings/components/AgreementBuilder/pagination.ts`: new; page layout and line measuring.
- `.../AgreementBuilder/utils.ts`:
  - PREVIEW_JS lays out with `planPages`;
  - adds `keepsWithNext` (gen writes `data-keep="1"`), `LAYOUT_CSS`, the letterhead and the signing line in `gen()`;
  - `makeBlock` defaults `logoLayout: 'letterhead'` and `showSignerName: true`.
- `.../AgreementBuilder/BlockComponents.tsx`:
  - distribute() uses `planPages`;
  - adds caret follow, plain-text paste, editable continuation slices, letterhead and signing line in the canvas, and the `LAYOUT_CSS` style tag;
  - removes the page-limit guard and the old split helper.
- `.../AgreementBuilder/PropertyPanel.tsx`: logo Style (Letterhead / Logo only); signature "Print the signer's name under the line".
- `.../AgreementBuilder/types.ts`: `logoLayout`, `showSignerName`.
- `.../AgreementBuilder/starterTemplates.ts`: Business funding agreement (new, then letterhead logo).
- `src/components/Common/Modals/AgreementSignModal.tsx`: guide bar, signature dialog; file manager removed.
- `src/components/Common/Modals/useGuidedSigning.ts`, `SignatureDialog.tsx`, `SignatureDialog.css`, `src/utils/agreementSigning.ts`: new.
- `assets/css/agreement-builder.css`: letterhead placeholder, segmented control, hint and signing-guide bar.

## Tests
- **Added:**
  - `tests/.../AgreementBuilder/pagination.test.ts` (10): fit, cut between lines, move unsplittable blocks, keep headings with the next line, page breaks, multi-page flow with nothing lost or repeated, cut mid-gap, hard cut, margins. Written before the module, but not run red first: the module did not exist yet.
  - `tests/.../AgreementBuilder/TextBlock.longText.test.tsx` (2, was `TextBlock.pageLimit.test.tsx`): typing past the page is kept; paste is plain text. Run red first.
  - `tests/utils/agreementSigning.test.ts` (8): copied from client-fch.
  - `tests/components/Common/Modals/SignatureDialog.test.tsx` (5): copied from client-fch.
  - `AgreementSignModal.test.tsx` +3 (guided signing). Run red first.
- **Updated:**
  - `utils.test.ts` +9: keepsWithNext, the script embeds the layout, letterhead, signing line.
  - `PropertyPanel.mergeFields.test.tsx` +2: logo style, signer name.
  - `BlockComponents.test.tsx`: the signature shows its line and no date picker.
  - `AgreementBuilder.test.tsx`: logo placeholder text and the business funding template (+1).
- **Run:**
  - `npx vitest run`: 225 files, 1704 passed, 2 expected fail.
  - `npm run typecheck`: clean.
  - E2E mock `agreement-builder.spec.ts` + `partner-configuration.spec.ts`: 11 passed.
  - Checked in a real browser against the local API: canvas and preview with 14 pasted paragraphs, the letterhead, and the signing line.

## Open / follow-up
- **Templates saved earlier** keep their old script (old page layout and old signing box) until they are opened and saved again in the builder.
- **Local demo template:** the local demo template (host borrower agreement, id 1) was saved before the signing line's columns were top-aligned. Save it once more to line up the signature and date rules.
- **Editing a split block:** the block toolbar shows on each page slice of a split block. Only the first slice should show it.
- **Draft/autosave and the shared renderer (2f)** are still open.

## Follow-up (same day): Header block and signature card
**Problem (review):**
- The letterhead's right-hand details could not be edited in the builder.
- "Company Logo" should place only a logo.
- The signing line looked plain.

**Solution:**
- **Company Logo** is the logo alone again; new logo blocks no longer default to a letterhead.
- **New Header block** (Layout › Header, type `header`):
  - the logo on the left (click to pick it from the file manager; width in the property panel);
  - its own text on the right, edited in place like a text block, with text styling and Insert field. It starts as the company name, address, email and phone (merge fields).
  - The page layout never splits a header across pages (`measureLineBoxes` skips `.p-letterhead`).
- **Logo blocks saved as a letterhead:** they still show as one; editing their text turns them into a Header.
- **Signing card:**
  - the signature now sits in a bordered card headed by the role ("CLIENT SIGNATURE *") with a pen icon;
  - a "×" mark before the signing line, the signer's name and "Signature" under the line;
  - "Date signed" beside it.
  - Field ids and the drop zone are unchanged, so signing and the server's signed record work as before.
- **Business funding agreement** starter template uses the Header block.
- **Local demo template** (host borrower agreement) re-saved with both changes.

**Tests:**
- `utils.test.ts`: logo-only, header (default text, own text, in the palette), legacy letterhead logo; signing card. Run red first.
- `PropertyPanel.mergeFields.test.tsx`: header Insert field, header logo width, logo has no text styling. Run red first.
- `BlockComponents.test.tsx` +2: header text edited in place, logo opens the file manager. Written after the change, so not run red first.
- `AgreementBuilder.test.tsx`: the demo template's logo placeholder is "Click to browse" again.
- Run:
  - `npx vitest run`: 225 files, 1711 passed, 2 expected fail;
  - typecheck clean;
  - E2E mock builder + partner configuration: 11 passed.
- Checked in a real browser against the local API: header edited in place (an extra line added), saved and shown in the preview; signing card in the canvas and the preview.

## Follow-up (same day): better starter templates, no name on the signature, the blue fields explained
**Problem (review):**
- The starter templates looked poor: company details appeared three times (header, parties row, table), blue fields cluttered the text, and a forced page break left half a page empty.
- The signer's name under the signature was not wanted.
- It was not clear what the blue fields are.

**Solution:**
- **`starterTemplates.ts` rewritten.**
  - Each document opens with a Header, a title and the date. The parties are named once; after that the text says "the Company" / "the Client" (or "the Lender" / "the Borrower").
  - The documents have numbered sections and end with a required consent box and the signing card. There are no forced page breaks.
  - The three templates:
    - **Business funding agreement:** a client details table and 10 sections.
    - **Master loan agreement:** its own blocks now, not `getDemoTemplate`. It has a loan summary with blanks to fill in before publishing.
    - **Terms acknowledgement:** one page with a numbered list.
  - `getDemoTemplate` (the builder's default for an agreement never saved) is unchanged.
- **Signing card:** the signer's name is off by default (`showSignerName: false`); "Print the signer's name under the line" turns it on.
- **Blue fields:**
  - each chip's tooltip says "Filled in automatically with the signer's name when the agreement is signed ({{signer.name}})";
  - new `MergeFieldsHint` above the canvas explains them while the agreement has any, until "Got it" (remembered in localStorage).
- **Local demo template** re-saved with the new Business funding agreement.

**Tests:**
- New `starterTemplates.test.ts` (9): the four templates; each opens with a header and ends with consent and signature; each detail is named at most twice; no page break; client details table; no name on the signing card. Run red first.
- New `MergeFieldsHint.test.tsx` (3). Run red first.
- `mergeChips.test.tsx` +1 (tooltip). Run red first.
- Updated: `utils.test.ts` and `PropertyPanel.mergeFields.test.tsx` (name off by default); `AgreementBuilder.test.tsx` (business funding: no home address, no page break).
- Run:
  - `npx vitest run`: 227 files, 1724 passed, 2 expected fail;
  - typecheck clean;
  - E2E mock builder + partner configuration: 11 passed.
- Checked all three templates in a real browser (editor and preview).

## Follow-up (same day): FCH master templates, paste from AI chats, field mapping, upload signature, 4px modals, phone layout

**Problem.** The user asked for: FCH's two Word agreements (`FCH_Partner_Agreement_FCH-7618.docx`, `FCH_Master_WLP_Client_Enrollment_Agreement.docx`) as the master partner and borrower templates; partner and borrower templates kept apart (each builder offers only its own); pasting from ChatGPT/Claude into a text block; clicking a blue field to choose what fills it; uploading a picture of a signature (with a minimum size); 4px corners and the app's own primary buttons on every agreement modal; a better signature card and signature certificate; a builder usable on a phone; a wider label column in tables.

**Solution.**
- `masterTemplates.ts` (new): both documents as data (`TemplateNode[]`), generated from the .docx with the wording unchanged. Adapted only where a template works differently: the company's details are merge fields (`[A-1 Partner Legal Name]` → `{{owner.company_name}}`, address/email/phone, effective date → `{{today}}`, client name/company/address/email/phone → `{{signer.*}}`); blanks the signer fills (partner details, client EIN/entity, payment option, initials, title) are text fields; the signature is the signing card; the docx's own note on its blue/yellow highlighting, the "(Continued)" heading repeated at a page break, the 👉 markers and the "SCHEDULE COMPLETION INSTRUCTIONS … REMOVE THIS PAGE" page are left out. Schedule values (`[B-1 Program Fee]`, `[C-1 Governing State]` …) stay bracketed for the partner to write in.
- `starterTemplates.ts`: `fromNodes()` builds blocks (sections on a shaded band, the company details in a panel); each template has an `audience`; `defaultTemplateFor(type)` — a new partner agreement starts from the master partner agreement, a borrower one from the client enrollment agreement (was the old "MASTER LOAN AGREEMENT" demo, `getDemoTemplate`, now unused by the builder).
- `StarterTemplatesDialog.tsx`: offers only the templates for the agreement being edited — the partner agreement shows Master partner agreement and Blank page; the borrower agreement shows Client enrollment, Business funding, Master loan, Terms acknowledgement and Blank page. (A first version used Partner/Borrower tabs; the user asked for filtering instead.)
- `pastedText.ts` (new) + `TextBlock.handlePaste`: HTML pasted from ChatGPT/Claude/Word/web keeps bold, italics, headings (as bold lines), lists, tables and paragraphs; styles, classes, links, images and scripts are dropped; markdown from a chat's Copy button is converted the same way.
- `MergeChipMenu.tsx` (new): clicking a blue field opens "Fill this field with" (the merge fields with example values) and "Remove field".
- `SignatureDialog` (here and in client-fch, kept identical): Upload tab — PNG/JPG/WebP, at least 300 × 100 px, up to 5 MB; fitted into the same 720×200 PNG as typed/drawn signatures, with near-white paper made transparent. Buttons are the app's `btn btn-primary` / `btn btn-light`; colours follow `--vz-primary`.
- Agreement modals (signing, adopt signature, templates, confirm, preview, field menu): every corner 4px (guarded by `tests/assets/css/agreementModalRadius.test.ts`); the signing modal's Start/Next field, Accept & Continue and proceed buttons are `btn btn-primary`; the guide bar uses the primary colour.
- Signing card (`utils.ts` gen + canvas): 4px corners, primary top accent, tinted signing area, footer "Recorded in the signature certificate at the end of this agreement".
- Phone (≤767px): toolbar actions scroll in one row, the A4 page scrolls instead of being cut off, block properties open as a bottom sheet only while a block is selected (`ab4-layout--selected`).
- Tables: the first of 2–3 columns is 30% wide and words break only when one does not fit (preview/signed copy and canvas).
- fch-api `SignedAgreementBuilder::appendCertificate`: redesigned certificate (Audit trail / Signature certificate / ✓ Completed, the adopted signature beside the signer details, an ESIGN/UETA note), tables only for dompdf. See the fch-api handoff.
- `.claude/hooks/session-handoff.sh` (all three repos): the headless `claude --resume -p` the hook starts is itself a session whose end fired the hook again — a loop that left 257 empty `*_212a4b07.md` notes in client-fch (deleted). The note-writing run is now marked (`CLAUDE_HANDOFF_RUN`) and skips the hook, and the note is written to a temp file and moved in only when it has content.

**Tests.** New: `pastedText.test.ts` (7), mapping tests in `mergeChips.test.tsx` (4), master-template, per-agreement template and look tests in `starterTemplates.test.ts` / `AgreementBuilder.test.tsx`, phone layout, signing-card and table CSS tests in `utils.test.ts`, `tests/assets/css/agreementModalRadius.test.ts`, upload/button tests in `SignatureDialog.test.tsx` (+4), button test in `AgreementSignModal.test.tsx`; tests that assumed the old demo default now expect the master agreements. Each new test was seen failing before the code, except `pastedText.test.ts` (written first, but the implementation was written before it was run). Results: admin 229 files, 1760 passed + 2 expected fail; `npm run typecheck` clean; E2E `e2e/sidebar/settings` agreement-builder spec 5/5 (updated for the new defaults; the Terms test opens the borrower agreement). client-fch 155 files, 1205 passed, typecheck clean. fch-api full suite 3200 passed, 20 skipped.

**Open.**
- The master partner agreement's text (Section 22, Electronic Signature Acknowledgment, the final consent) says the partner signs by uploading a Driver's License / State ID / Articles; the builder has no document-upload field, so the template ends with the signing card instead. The wording was not changed — legal/product need to decide: add an ID-upload field, or reword those clauses for a drawn/typed signature.
- The client enrollment agreement names a Company Representative who countersigns; the platform has one signer, so the representative is listed (Schedule A-11) but does not sign.
- The partner agreement keeps "Four Corner Holdings, LLC" and its address as written (FCH is always the party), so it has no blue fields; the header still shows the template owner's merge fields.
- The signed record now carries the signature image twice (on the signing line and on the certificate).
- On a phone the A4 page is edited at full size (scroll sideways); it is not scaled to fit, because scaling would upset page measurement.
- Templates saved before this change keep their old look until re-saved.
- Later the same day: the client enrollment agreement's parties table (both parties crammed into two cells, squeezed by the 30% label column) is now two label/value tables, "The Company" and "The Client / Borrower entity" (`masterTemplates.ts`; test in `starterTemplates.test.ts`, seen failing first).
- Later the same day: every field, consent box and signature in the starter/master templates has space above and below (fields and consents 14px each side, the signing card 24px above and 16px below), so a field no longer runs into the table or paragraph next to it and its toolbar in the canvas stays clear of the block above (test "room around the fields" in `starterTemplates.test.ts`, seen failing first).
- Later the same day:
  - **Empty page drop.** A palette block dropped on an empty page was lost unless it hit the thin insert line. The whole empty page is now a drop target, outlined while a block is held over it (`index.tsx`, `ab4-doc--drop`). Unit test "adds a block dropped anywhere on an empty page" and E2E "drops a palette block anywhere on an empty page" (real pointer drag), both seen failing first.
  - **Palette redesign.** "Blocks" header with a hint; groups as two-column tiles; Layout slate, Text the primary colour, Fields amber (like the Sign here tag); 4px corners; a collapsed mode with one column of icons.
  - **Insert lines.** They no longer grow to 24px on hover: the page jumped down, then back up when a drag began, so a block dropped where the pointer had been landed on the wrong side. This made the E2E drag test flaky (2 of 8 runs, then 6 of 6 once it waited for layout). Insert lines now take no room and their line and + button float over the gap. The spec passed 36/36 with `--repeat-each=6`.
- Later the same day: **real company details in the preview.** The builder's preview showed example values (Acme Lending, Jane Doe) in every blue field. The company fields (`{{owner.*}}`, `{{today}}`) now show the template owner's real details from fch-api's new `POST common/agreement-templates/preview-values` (same values signing fills; same owner and on-behalf rules as `show`). The query is `useAgreementPreviewValues`, used only while the preview is open, and `withMergeSamples(html, real)` takes the values (escaped; examples kept where the profile is empty). Signer fields keep the examples: there is no signer while a template is built. Tests: `services.test.ts`, `utils.test.ts` (2), `AgreementBuilder.test.tsx`, all seen failing first. Suite 1771 passed; typecheck clean. The settings/partners E2E shows 15 failures, all outside the agreement area: 14 are the known E2E-014, and 1 is new — E2E-015, a login title suffix from the committed `portalMeta.ts`, logged in `docs/e2e/ISSUES.md`.
- Later the same day:
  - **Templates checked again against the .docx.** Both files are unchanged since they were first read, compared byte for byte. A word-for-word paragraph check finds every paragraph of both documents in the templates, except the deliberate adaptations listed above: partner 15 (blanks as fields, the "(Continued)" heading, 👉 markers, the ID upload line); client 74 (placeholders as merge fields, the signature table, the instructions page).
  - **Client signature moved to the end.** At the user's request, the client enrollment agreement is now signed at the very end, after Schedule C: Acknowledgment of authorized signature, then the company representative, the consent, Title, and the signing card last. In the .docx the signature table sits between Exhibit A and the Schedules. Test "signs at the very end, after the schedules", seen failing first.
