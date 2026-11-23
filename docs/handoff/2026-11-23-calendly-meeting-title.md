# Calendly: meeting title and length from the appointment

Date: 2026-11-23

## Problem
A meeting booked in Calendly from Add Appointment was named after the event type ("30 Minute Meeting"), not the appointment's title, and always lasted the event type's length: a 3-hour appointment on a 30-minute event type became 30 minutes. Calendly's booking API (`POST /invitees`) has no title or length field.

## Solution
- New checkbox under "Sync with Calendly": **Use the title and length in Calendly** (off by default).
- When it is ticked, the API first creates a **one-off event type** (`POST /one_off_event_types`):
  - name: the appointment title;
  - duration: the appointment's length;
  - `date_setting`: one `spots` window, exactly the appointment's start to end;
  - location kind: from the chosen event type.
- It then books the meeting on that one-off. The chosen event type still supplies the place.
- Verified against the real Calendly API (connection 12):
  - the scheduled event takes the one-off's name;
  - it lasts the one-off's length (3h);
  - with `date_range`, only starts on a duration-sized step are bookable (another start gets 400);
  - with `spots`, the exact chosen start is offered.
- While the box is ticked, the form neither forces the end to the event type length nor shows the "not an open time" check. Both apply to the event type, not the one-off.
- The app now requests the `event_types:write` scope (`CalendlyAppConfig::SCOPES`).
- If Calendly refuses the one-off with 403 (a connection made without the scope), a 422 appears under `calendly_use_title` asking the user to reconnect. Nothing is saved.
- Also fixed: the Sync modal disposed Bootstrap's modal mid-animation, which made Bootstrap's focus callback throw. It now disposes once the animation ends.

## Files changed
- fch-api:
  - `app/Services/Global/Calendly/CalendlyAppConfig.php`: `event_types:write` scope.
  - `app/Services/FCH/Common/Calendly/CalendlyBookingService.php`: `book(..., bool $useTitle)` and `oneOff()`.
  - `app/Services/FCH/Common/Appointment/AppointmentService.php`: passes `calendly_use_title`.
  - `app/Http/Requests/Api/V1/FCH/Common/Appointment/StoreAppointmentRequest.php`: the `calendly_use_title` rule.
  - `lang/en/calendly.php`: `title_needs_reconnect`.
- react-fch:
  - `src/components/Appointment/CalendlyBookingFields.tsx`: `useTitle` and the checkbox.
  - `assets/css/calendly-appointments.css`: `.cb-own-title`.
  - `src/components/Common/Modals/AppointmentModal.jsx`: payload and error field.
  - `src/components/Appointment/CalendlySyncModal.tsx`: dispose timing.
- borrower-fch:
  - `src/pages/appointment/components/CalendlyBookingFields.tsx`;
  - `src/pages/appointment/AppointmentModal.tsx`;
  - `src/pages/appointment/components/CalendlySyncModal.tsx`.

## Testing
- fch-api:
  - `CalendlyConnectionTest`: the sign-in link asks for `event_types:write`.
  - `CalendlyBookingTest`, 4 new tests: one-off body and booking; none without the box; 403 asks to reconnect; 400 under the time.
  - `--filter="Appointment|Calendly"`: 196 passed.
- react-fch:
  - `CalendlyBookingFields.test.tsx`: +3.
  - e2e `sidebar/appointments/calendly.spec.ts`: +1, sends `calendly_use_title`.
  - Results: Vitest `tests/components/Appointment` 45 passed, `tests/components` 406 passed; e2e `sidebar/appointments` 38 passed, 1 skipped; typecheck clean.
- borrower-fch:
  - `CalendlyBookingFields.test.tsx`: +2.
  - `AppointmentModal.attendees.test.tsx`: +1.
  - Results: `tests/pages/appointment` 68 passed, no unhandled errors; typecheck clean.

## Open items
- **Every partner's Calendly app must tick `event_types:write`**, and existing connections must reconnect, before the box works. Without it the user gets the reconnect message.
- **Booking on a `spots` one-off is not yet confirmed end to end.** The one-off was created and offered exactly the chosen start, but the test account then hit Calendly's booking rate limit (429). Retry one real booking with the box ticked.
- **Unknown:** whether a spot outside the host's Calendly availability is offered. If it isn't, Calendly answers 400 and the error appears under the time.
- **One-off event types can't be deleted** through the API (no endpoint). They close once their spot has passed. If the invitee booking fails after the one-off was made, the one-off is left behind until then.
- **Not yet used** by Add to Calendly (an existing appointment) or the Sync modal's Push. Both still book on the event type.

## Follow-up (same day): form wording and layout
- **Checkbox:**
  - label: "Use this appointment's title in Calendly";
  - help text when off: `Calendly will name it "<event type>" and book <N> min.`
- **When the box is ticked:**
  - the event type is hidden: no chip or dropdown, no length, no place chip;
  - a short note with a warning background appears instead: "Calendly creates a one-time meeting with this title and the whole time slot, on Zoom." The place is named from the event type;
  - the place still goes to Calendly, because the one-off copies the event type's location kind. Without it the meeting would have no Zoom or Meet link.
- **Errors:** Calendly's refusal (`sync_with_calendly`, e.g. the booking limit) now shows at the bottom of the Calendly section, not under its header.
- **borrower-fch:** gained `CALENDLY_LOCATION_DISPLAY` in `src/modules/calendly/types.ts`.
- **Tests:**
  - new tests for the error position and for hiding the event type and place, with the note;
  - admin Appointment components 47 passed, Calendly e2e 7 passed; borrower appointment 70 passed;
  - typecheck clean in both.

## Follow-up (same day): Pull / Push split, per-meeting title, modal redesign
- **Per-meeting title on push:**
  - each row in Push to Calendly has a "Use this title in Calendly" checkbox, off by default;
  - fch-api: `CalendlySyncRequest` takes `push_use_title` (appointment ids) and `CalendlySyncReviewService::apply()` passes it per meeting to `book(..., $useTitle)`;
  - test: `CalendlySyncReviewTest::a_meeting_ticked_to_use_its_title_goes_out_on_its_own_one_off_the_others_on_the_event_type`.
- **Two buttons instead of Sync now:** **Pull from Calendly** and **Push to Calendly**. Each opens the modal for one direction (`CALENDLY_SYNC_DIRECTIONS` in `modules/calendly/types.ts`, the modal's `direction` prop) and sends only its own list. The other list is sent empty.
- **Modal redesign (both portals):**
  - header: an icon tile, the date range and a subtitle;
  - rows: one card per meeting with a date tile, time and people icons, and pill badges;
  - push: the event type sits in a highlighted panel, and the per-meeting title box is a pill that lights up when ticked;
  - an "All caught up" empty state;
  - footer: shows what will happen, an outlined Cancel and the primary button;
  - accent: the theme primary (`--vz-primary`); 4px radius; buttons 37.5px tall.
  - Styles: admin `assets/css/calendly-appointments.css`; borrower `assets/css/calendly-sync.css`, rewritten except the calendar conflict stripe.
- **Admin connection card:**
  - account panel: an initials avatar on a light Calendly-blue panel;
  - Pull and Push: soft Calendly-blue buttons as two equal halves; on a narrow card (container under 300px) they drop their icons;
  - Disconnect: moved to the footer row as a red link (still `aria-label="Disconnect"`).
  - The borrower card only swapped its buttons; it wasn't recoloured.
- **Tests:**
  - modal tests rewritten for Pull and Push (8 per portal);
  - the card tests cover both buttons;
  - admin e2e: Pull, then Push with "Use this title in Calendly".
  - Results: admin Appointment components 52 passed; admin e2e `sidebar/appointments` 38 passed, 1 skipped; borrower appointment and Calendly 86 passed; typecheck clean in both.
- **Open:** one admin modal test (`lists only what would come in from Calendly`) failed once under a parallel run and passed on two re-runs. Probably a timeout under load; keep an eye on it.

## Follow-up (same day): smooth closing
- **Problem:** closing the Pull/Push modal was jumpy. Two things changed during the fade-out:
  - the list emptied at once, because the preview query was disabled as soon as `show` went false (its `gcTime` is 0);
  - the card reset the direction to Pull, so a closing Push modal flipped its title.
- **Fix:**
  - the modal keeps the dates it opened with (`openDates`) until Bootstrap's `hidden.bs.modal`;
  - the card keeps `sync` (direction and dates) and toggles a separate `syncOpen`.
- **Tests:** a modal test (the list stays after `show` goes false) and a card test (a closing Push modal stays "Push to Calendly"). Admin Appointment components 54 passed, Calendly e2e 7 passed; borrower 88 passed.

## Follow-up (same day): the "how connecting went" toast showed twice and stayed
- **Problem:** after coming back from Calendly (e.g. `?calendly=in_use`), the borrower portal showed the toast twice, and it stayed until the page was reloaded.
- **Causes:**
  - `pages/appointment/Appointments.tsx` rendered a second `<ToastContainer>` on top of the one in `App.jsx`, so every toast on that page was drawn in both;
  - React StrictMode runs the result effect twice in development, so the toast was also requested twice.
- **Fix:**
  - removed the page's own container in borrower-fch;
  - both portals' cards give the result toast a fixed id (`CALENDLY_RETURN_TOAST_ID` in `modules/calendly/types.ts`), so react-toastify shows it once.
- **Tests:**
  - card: the toast carries the id, also when rendered under StrictMode;
  - borrower `Appointments.test.tsx`: the page renders no `ToastContainer`;
  - admin Appointment components 55 passed; borrower appointment and Calendly 90 passed; typecheck clean.
- **Why the message appeared at all:** the borrower signed in to a Calendly account that another portal user had already connected. One Calendly account can be connected by only one portal user.

## Follow-up (same day): borrower card matches the partner portal card
- **borrower-fch `CalendlyConnectionCard`** now uses the admin card's markup and styles:
  - Calendly wordmark and a status pill;
  - account panel with an initials avatar;
  - Pull from / Push to Calendly as two equal soft-blue buttons;
  - footer with Last synced, Open and Disconnect.
  - Added `assets/images/logo/calendly.png`; the card styles were copied into `assets/css/calendly-sync.css`. Checked in a screenshot of the dev server.
- **Modal dispose fix (both portals):** unmounting while a close was still in progress made Bootstrap's backdrop callback hit a disposed modal (`_resetAdjustments` on null). `CalendlySyncModal` now tracks `hiding` and disposes only after `hidden.bs.modal`.
- **Tests:**
  - borrower card design test added;
  - borrower appointment and Calendly 91 passed, admin Appointment components 55 passed, no unhandled errors;
  - typecheck clean in both.
- **Note:** `e2e/.auth/borrower.json` was refreshed by running `e2e/auth.setup.ts` (the old session had expired). It is a tracked file, so leave it out of commits.
