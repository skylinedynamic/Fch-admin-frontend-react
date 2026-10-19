# 2026-10-13 — Real-database create for the remaining host modules

**Date:** 2026-10-13  
**Title:** Real-database create for the remaining host modules  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-13-summary-pending-and-test-data.md](2026-10-13-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 2 | Blog create had only been exercised up to "The content field is required" (2026-10-12, pending item T2), because the test script could not type into the rich-text editor. | The script was extended to type into rich-text editors. | None in the repositories (test script only). | Done |
| 3 | These create forms had no real-database save yet. | A driver was written for each control, and each form was saved and deleted again as host: | None in the repositories (test scripts only). | Done |
| 4 | The SEO setting create form had no real-database save yet. | Tried as host. The form offers 17 pages, and every one of them already has a setting (19 exist), so there is no page left to create one for. Choosing a page that already has a setting opens that page's existing record instead. An empty form is blocked in the browser. | None changed. | Information — not possible without overwriting a real page's settings. |

## 2026-10-13 — 2. Blog post: create and delete on the real database

- **Problem:** Blog create had only been exercised up to "The content field is required" (2026-10-12, pending item T2), because the test script could not type into the rich-text editor.
- **Solution:** The script was extended to type into rich-text editors. As host, the blog form was then filled and published, and the post was deleted again through the Blogs screen: searched by title, exactly one matching row, "Delete Selected", confirmed. The API answers 404 for the post afterwards.
- **Files:** None in the repositories (test script only).
- **Verified:** Browser, host, `http://localhost:5174`. Created post id 32 with content and slug; delete request sent `ids: [32]`, answered 200; the row is gone from the list.
- **Issue faced during the run:** The script did not recognise that the save had succeeded, so it did not clean up. The test post stayed published in `fch_dev` for about fifteen minutes until it was noticed on a screenshot and deleted. A database check for `E2E …` rows was then run across blogs, SEO settings, funding sequences, capital access, credit accounts, tiers, resources and lenders: nothing else is live.
- **Status:** Done

## 2026-10-13 — 3. Funding sequence, Credit account, Tier and Capital access: create and delete on the real database

- **Problem:** These create forms had no real-database save yet. A generic script could not finish them: Funding sequence needs an icon from a custom picker, Credit account needs a card image chosen in the File Manager dialog, Tier saves with a button labelled "Update" on a tabbed form, and Capital access needs a card added with its own step dialog plus a checklist requirement.
- **Solution:** A driver was written for each control, and each form was saved and deleted again as host:
  - **Funding sequence** — icon chosen in the picker ("Credit Card"); the API first answered 422 for the remaining fields, then 201. Created id 17, deleted (200).
  - **Credit account** — image chosen by opening the File Manager dialog and double-clicking an image; 422 for the remaining fields, then 201. Created id 87, deleted (200).
  - **Tier** — saved with the form's own button; 422 for the missing fields, then 201. Created id 6, deleted (200).
  - **Capital access** — a card added with its plus button, its "Edit Step Details" dialog filled (why this card, limit range, requirement), one pre-flight checklist requirement chosen; the API answered 201 "Capital access created successfully." Created id 12, deleted (200).
- **Files:** None in the repositories (test scripts only).
- **Verified:** Browser, host, `http://localhost:5174`; each create and delete answered by the real API. Database check afterwards: no live `E2E …` rows in any of the four tables.
- **Issues faced during the runs:**
  - The script first typed test text into the "Search by name or lender" box on the Capital access form, which filtered the available cards to none. The box is now left empty.
  - One Capital access run stopped with an error after the programme had been created (id 11); it was deleted and is soft-deleted in the database.
  - The Tier API answered with raw message keys ("tier.success_created") — fixed in entry 5.
- **Observed, not changed:** The "Edit Step Details" dialog closes on "Save Details" with its three required-marked fields empty. The dialog itself does no checking; the fields are checked by the API when the programme is saved.
- **Status:** Done

## 2026-10-13 — 4. SEO setting: a new one cannot be created in this data

- **Problem:** The SEO setting create form had no real-database save yet.
- **Solution:** Tried as host. The form offers 17 pages, and every one of them already has a setting (19 exist), so there is no page left to create one for. Choosing a page that already has a setting opens that page's existing record instead. An empty form is blocked in the browser.
- **Files:** None changed.
- **Verified:** Browser, host. Nothing was written: 19 settings before and after, none with test content, and the existing records' update times are unchanged.
- **Status:** Information — not possible without overwriting a real page's settings. The save path is covered by the mocked spec (`e2e/cms.spec.ts`).
