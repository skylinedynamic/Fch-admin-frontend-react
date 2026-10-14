# 2026-10-13 — API — message files that did not exist

**Date:** 2026-10-13  
**Title:** API — message files that did not exist  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-13-summary-pending-and-test-data.md](2026-10-13-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 5 | Creating and deleting a Tier answered with "tier.success_created" and "tier.success_deleted" instead of readable messages. | The four files were added, with one message for every key the code uses (17 for tiers, 18 for tier tasks, 4 for the borrower activity log, 9 for settings validation). | `lang/en/tier.php`, `lang/en/tier_task.php`, `lang/en/borrower_activity_log.php`, `lang/en/setting_validation.php` (all new) | Fixed |

## 2026-10-13 — 5. Four message files were missing, so the API answered with raw message keys

- **Problem:** Creating and deleting a Tier answered with "tier.success_created" and "tier.success_deleted" instead of readable messages. The controllers and request classes read their messages from `lang/en/tier.php`, which did not exist. A search of the API for other message files that are used but missing found three more: `tier_task.php`, `borrower_activity_log.php` and `setting_validation.php`.
- **Solution:** The four files were added, with one message for every key the code uses (17 for tiers, 18 for tier tasks, 4 for the borrower activity log, 9 for settings validation). The length limits named in the messages match the validation rules (255 for names and titles, 50 for status).
- **Files:** `lang/en/tier.php`, `lang/en/tier_task.php`, `lang/en/borrower_activity_log.php`, `lang/en/setting_validation.php` (all new)
- **Verified:** Each file passes a syntax check and its messages resolve (for example "Tier created successfully."). The tier messages were not re-checked through the browser after the change.
- **Status:** Fixed
