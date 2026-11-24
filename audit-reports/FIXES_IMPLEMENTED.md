# Fixes Implemented

Audit date: 23 Nov 2026. Branch: `audit/baseline`, compared with baseline commit `ccd3fe0` (the zip as supplied).

How to read this file:
- Every fix below was first **proved** on the original code (a probe script or test that failed), then fixed, then **re-tested**.
- "Evidence" names the test that now guards it. Test files are listed in `AUTOMATED_TEST_RESULTS.md`.
- Severity: **P0** = blocks a demo or loses money/data/security; **P1** = major feature broken or serious risk; **P2** = smaller defect.
- No test was weakened to hide a failure. Where an old test had to change, the reason is written down (section 9).

---

## 1. Login, identity and access control

### SEC-001 (P0) Most private data was open without login
- **Symptom:** `GET /travelers` (names, emails, phone numbers) answered without any token. Same for trips, bookings, payments, refunds, reviews, messages.
- **Root cause:** `@Roles(...)` was written on routes, but most controllers had no guard, so the decorator did nothing.
- **Fix:** new global guard `back-end/src/auth/guards/global-auth.guard.ts` (registered as `APP_GUARD` in `app.module.ts`). Any route with `@Roles` now needs a valid token. Routes without `@Roles` (health, login, sign-up, catalogue) stay public.
- **Evidence:** `test:audit` SEC-001 (401 without token). Fails on original code, passes now.

### SEC-002 (P0) Anyone could become "superuser" by sending a header
- **Symptom:** sending `x-user-role: superuser` and `x-user-id: 1` gave full admin powers with no password.
- **Root cause:** the legacy `RolesGuard` trusted these client headers.
- **Fix:** headers are only read when `NODE_ENV === 'test'` (unit tests). In every other mode the identity comes only from the verified token. Controllers that read `@Headers('x-user-id')` now use `@AuthUserId()` / `@AuthRole()` from `common/decorators/current-user.decorator.ts`.
- **Evidence:** `test:audit` SEC-002, SEC-003.

### ID-001 (P0) Users could not see their own trips, bookings or profile
- **Symptom:** Arjun (traveler) and Devansh (guide) saw empty dashboards and 404 profile pages; owners were told "access denied" on their own records.
- **Root cause:** two id systems. The login store uses one account id per person (Arjun = 3, Devansh = 4). All business data uses role ids (Arjun = traveler 1, Devansh = guide 1). The token carried the account id.
- **Fix:** new `back-end/src/auth/identity.util.ts` maps an account to its role profile id. The token now carries `pid` (profile id); the API checks ownership with it. The login reply includes `travelerId` / `guideId` / `adminId` / `careId` / `agencyId`.
- **Evidence:** `test:audit` ID-001; crawl run 2 showed 0 pages with 403/404 (baseline had many).

### AUTH-001 (P1) Refresh, logout and password reset crashed in demo mode
- **Root cause:** they only worked with PostgreSQL; with no database they threw 500.
- **Fix:** in-memory refresh-token store with rotation and reuse rejection; logout and reset work without a database.
- **Evidence:** `test:audit` AUTH-004; workflows AUTH-1..3.

### AUTH-002 (P1) Guides and staff created by an admin could not log in
- **Fix:** login checks the business records too, verifies the password, then creates the login record.

### AUTH-003 (P0) Deactivated admins / support staff could still log in
- **Fix:** login and every protected request reject accounts marked deactivated (checked only after the password is verified, so it does not leak which emails exist). Agencies that are not "approved" cannot log in.

### AUTH-004 (P1) Two accounts could be registered with the same email in different roles
- **Fix:** sign-up and admin create check every role list.

### AUTH-005 (P1) Password-reset token was printed to the server log
- **Fix:** removed the `console.log`.

### AUTH-006 (P1) New traveler / guide / staff passwords were stored as plain text
- **Fix:** they are now hashed with bcrypt (`hashLegacyPassword`). Changing a password on a profile screen now also updates the login record (before, the old password kept working).
- **Still open:** seeded agency passwords are plain text in the demo data file (see open items).

### RATE-001 (P1) Normal use hit "429 Too Many Requests"
- **Root cause:** a global limit of 120 requests a minute; one dashboard page makes many calls.
- **Fix:** limit is now set by `RATE_LIMIT_TTL` / `RATE_LIMIT_MAX` (default 600 a minute). The stricter limits on login and sign-up stay (10 and 5 a minute).

### RT-001 (P1) Live notifications could reach the wrong person
- **Root cause:** live rooms were named by number only (`user:1`). Traveler 1, guide 1 and admin 1 shared a room.
- **Fix:** rooms are now `user:<role>:<id>` (`realtime/user-room.ts`); notifications are stored with the role.
- **Evidence:** `realtime.spec.ts`; workflows WA-7, WA-8.

### NOTIF-001 (P1) Every page called a missing notifications address
- **Root cause:** front end called `/api/notifications`; the server has `/notifications`.
- **Fix:** corrected path in `front-end/src/services/api.js`.

---

## 2. Payments and bookings

### PAY-001 (P0) ₹1 could confirm a ₹21,400 booking
- **Root cause:** the server accepted any amount the browser sent.
- **Fix:** `payments.service.ts` now requires the exact server price (`total_minor`), a booking that is still open and a hold that has not expired.
- **Evidence:** `test:audit` PAY-001, PAY-003, PAY-004; workflows WA-9, WA-11, WA-12.

### PAY-002 (P1) A traveler could mark their own booking "paid in cash"
- **Fix:** only staff or the partner agency can record cash.

### BOOK-001 (P0) A traveler could change the booking price or status
- **Fix:** `restrictOwnerUpdate` in `bookings.service.ts`: owners cannot change price, status or ownership. They may only drop optional protection while the booking is on hold, and then the server recalculates the price.
- **Evidence:** `test:audit` BOOK-002.

### BOOK-002 (P0) Traveler B could add a booking to traveler A's trip
- **Fix:** creating a booking checks that the caller owns the trip.
- **Evidence:** `test:audit` ISO-001.

### BOOK-003 (P1) Traveler B could see A's cancellation and refund preview
- **Fix:** ownership check on cancel and preview.

### BOOK-004 (P0) Bookings made in the app could never be cancelled
- **Root cause:** the "departure time" used for the cancellation rules was the booking date (today), so the system said "trip already departed".
- **Fix:** departure is taken from the trip start date (00:00 India time).
- **Evidence:** workflows WB-4..WB-9; `test:audit` REF-001; browser test step 6–7.

### BOOK-005 (P1) Bookings never became "completed", so nobody could write a review
- **Fix:** when a trip is marked Completed, its paid / confirmed bookings become COMPLETED.
- **Evidence:** workflows WD-8, WE-2; browser test step 8.

### BOOK-006 (P1) A guide could list every booking on the platform
- **Fix:** `GET /bookings` (all) is now staff-only; guides use their own list.

### REF-001 (P1) Refunds from cancellations were invisible to admin and support
- **Root cause:** cancellation refunds were saved in a separate store that the Refunds screens never read. The record also always said payment #1.
- **Fix:** `policy.service.ts` now links the refund to the real payment and also adds it to the refunds list used by `GET /refunds`.
- **Evidence:** `test:audit` REF-001.

### UI-001 (P1) The bookings screen secretly bypassed the cancellation rules
- **Root cause:** if the proper cancel call failed, the page silently set the status to "Cancelled" directly (no refund rules).
- **Fix:** removed the fallback; the user now sees the real error.

### UI-002 (P1) The payment screen changed the trip status from the browser
- **Fix:** `PaymentModal.jsx` now pays the server price and then reads the result back. The server confirms the trip when all bookings are paid (`trips/trip-lifecycle.ts`).

---

## 3. Trips and guides

### TRIP-001 (P0) A traveler could confirm or complete their own trip without paying
### TRIP-002 (P0) A traveler could accept the guide request themselves, or move the trip to another traveler
### TRIP-003 (P1) A guide could change the trip budget and other money fields
### TRIP-004 (P0) `PATCH /trips/:id` had no ownership check
- **Fix (all four):** new `trips/trip-permissions.ts` with field-level rules:
  - Guide: may only accept / decline (while pending), add notes, start and complete an accepted trip.
  - Traveler / agency: may edit planning fields; after confirmation only title, notes, category, itinerary; may set Pending or Cancelled only.
  - Confirmation happens automatically once all bookings are paid.
  - Ownership cannot be transferred.
- **Evidence:** `test:audit` TRIP-002..TRIP-006; workflows WD-1..WD-7.

### TRIP-005 (P2) Bad input was accepted
- **Symptom:** dates like "not-a-date", minus 2 travelers, a package or guide that does not exist.
- **Fix:** `trips.service.ts` checks date format and order, 1–50 travelers, package exists and is active, guide exists, and the 24-hour lead time from the policy.
- **Evidence:** `test:audit` TRIP-VAL (2 tests).

### TRIP-006 / GUIDE-001 (P1) Cancelling a trip left bookings active and the guide blocked forever
- **Fix:** cancelling a trip cancels its bookings through the refund rules and frees the guide's dates; changing or declining a guide also frees dates. Overlap check now counts the boundary day.
- **Evidence:** `test:audit` GUIDE-001; workflows WB-3, WB-6, WB-7.

### GUIDE-002 (P1) A guide could list every traveler's personal details
- **Fix:** guides see only travelers on their own trips.
- **Evidence:** `test:audit` ISO-002.

### REV-001 (P2) A review could be credited to the wrong guide
- **Fix:** the server uses the trip's accepted guide. The bookings screen no longer falls back to guide 1.
- **Evidence:** workflows WE-1.

### DASH-001 (P2) Admin dashboard "pending bookings" always showed 0
- **Root cause:** it counted status "Pending", but bookings use "HELD".
- **Fix:** counts PENDING, HELD and DRAFT.
- **Evidence:** `test:audit` DASH-001.

---

## 4. Build and setup

### BUILD-001 (P2) `npm ci` failed on a clean machine
- **Root cause:** `@nestjs/passport@12` and `@nestjs/testing@12` need NestJS 11/12, but the app uses NestJS 10.
- **Fix:** pinned `@nestjs/passport@^10.0.3` and `@nestjs/testing@^10.4.15`. A clean `npm ci` now works with no `--legacy-peer-deps`.

### BUILD-002 (P1) Part of the source code was hidden from git
- **Root cause:** `.gitignore` had `uploads/`, which also matched `back-end/src/uploads/` (the uploads module code). A fresh clone from git would not compile.
- **Fix:** both `.gitignore` files now ignore only the runtime upload folders.

### BUILD-004 (P1) Login failed when the front end started on port 5174
- **Symptom:** if port 5173 was busy, Vite moved to 5174 and every API call (including login) was blocked by CORS.
- **Fix:** outside production, the back end now allows any `localhost` / `127.0.0.1` port. Production still uses the `CORS_ORIGINS` allow-list only.
- **Evidence:** browser login on http://localhost:5174 reaches the traveler dashboard with no console errors; an unknown origin is still refused.

### BUILD-005 (P1) Fresh install failed to compile: "@prisma/client has no exported member Role"
- **Root cause:** nothing ran `prisma generate` after install, so the database types (`Role`, `UserStatus`, `AgencyApprovalStatus`) did not exist.
- **Fix:** `back-end/package.json` now runs `prisma generate` on `postinstall`, `prebuild`, `prestart` and `prestart:dev`. No database is needed for this step.
- **Evidence:** clean copy → `npm ci` → `npm run start:dev` compiles with 0 errors.

### BUILD-006 (P1) Login page had no demo account buttons on a fresh copy
- **Root cause:** the buttons depend on `VITE_SHOW_DEMO_ACCOUNTS=true` in `front-end/.env`. That file is not shipped (it is ignored by git), and `.env.example` did not mention it and pointed the API at the wrong port (3000 instead of 3001).
- **Fix:** `.env.example` now has the right API address and the demo switch. If the switch is not set at all, the buttons show in local development only; production builds still need it set to `true`.
- **Evidence:** fresh front end with no `.env` → login page shows 6 role buttons → traveler login reaches the dashboard.

### BUILD-007 (P1) Back end would not start from a fresh unzip
- **Root cause:** nothing in the app loaded `back-end/.env` (only Prisma did, as a side effect), and `.env` is not shipped, so the required token secrets were missing.
- **Fix:** new `src/config/load-env.ts`, loaded first in `main.ts`. It reads `.env`; if there is none and the mode is not production, it uses `.env.example` (development values) and prints a warning. Added `START_HERE.md`.
- **Evidence:** fresh copy with no `.env` in either folder → `npm ci` → back end starts, front end shows 6 role buttons, traveler login reaches the dashboard.

### BUILD-003 (P2) Prisma schema did not validate
- **Fix:** booking status default changed from `PENDING` (not in the enum) to `HELD`.

---

## 5. Phone-size screens and honesty in the UI

### UX-001 (P1) Every page scrolled sideways on a phone (390 px wide)
- **Root cause:** (a) the public top menu had a hidden "open" state but no menu button; (b) the signed-in header did not wrap; (c) grids used fixed minimum widths up to 440 px; (d) some tab rows did not wrap.
- **Fix:** menu button for the public navbar (`Navbar.jsx`, `landing.css`); header wraps and shortens long emails (`Header.jsx`); 57 grid rules changed to `minmax(min(Npx, 100%), 1fr)`; two-column layouts stack on phones (`.responsive-two-col`); tab rows wrap.
- **Evidence:** phone-size crawl, see `AUTOMATED_TEST_RESULTS.md`.

### UX-002 (P2) Contact form said "Message Sent!" when nothing was sent
- **Root cause:** there is no contact endpoint; the form only showed a success box.
- **Fix:** the message now says plainly that the demo cannot deliver the form and asks the visitor to use the email shown. (A real contact endpoint is still an open item.)

### UX-003 (P1) Traveler could not save "Edit Trip" (owner feedback, 23 Nov 2026)
- **Root cause:** the Budget box had `step="500"`, so any budget not a multiple of 500 (for example 29,924) made the browser block saving with "Please enter a valid value". The pop-up also let the traveler pick a Trip Status and change the budget.
- **Fix (owner's request):** Budget and Trip Status removed from the Edit Trip pop-up (`TripEditModal.jsx`). Budget and status are shown read-only. Only cities and dates are sent. The server also refuses a budget change from a traveler (`trip-permissions.ts`). Status changes were already limited by role.
- **Evidence:** API check: budget edit gives 400 "The trip budget is set when the trip is booked and cannot be edited."; city/date edit saves. Browser check: pop-up has no budget box or status list, and Save works.

### RULE-001 (business rule change, owner's request) Trip must start tomorrow or later
- **Before:** a trip had to start at least 24 hours ahead (time based).
- **Now:** the earliest start date is **tomorrow** (India date). Today cannot be chosen.
  - Date pickers in Create Trip and Edit Trip start from tomorrow (local date, not UTC).
  - Server: create and edit refuse today or past start dates (`trips.service.ts`). A booking on a trip uses the same date rule (`bookings.service.ts`); the 24-hour check stays only when a booking gives its own exact departure time.
- **Evidence:** API check: start today gives 400; start tomorrow is created; booking on that trip is accepted.

### UX-004 (P2) Payment and Edit Trip pop-ups were cut off on short screens
- **Root cause:** the boxes had no maximum height, so tall content went past the screen edge.
- **Fix:** both boxes now fit the window and scroll inside (`styles/shared.css` `.modal-box-custom`, `TripEditModal.jsx`).
- **Evidence:** browser check at 1366 x 520: payment box 480 px high and scrolls; Edit Trip box 480 px high.

### UX-005 (P2) Bookings of a cancelled trip did not say the trip was cancelled
- **Fix:** the Bookings page shows a red "Trip cancelled" tag and status "Cancelled" for bookings whose trip is cancelled, and hides Pay Now and Cancel for them (`BookingList.jsx`).
- **Evidence:** browser check: cancelled trip's booking shows the tag; Pay Now hidden.

### RULE-002 (business rule change, owner's request) A trip with a guide is booked only after the guide accepts
- **Before:** bookings and payment could happen before the guide answered.
- **Now:**
  - If the traveler picks a guide, the trip is saved as a **draft** (status Planning) with the full plan (transport, hotel, guide). A request goes to the guide.
  - The guide has **3 hours** to accept or decline (`guideResponseDueAt`). After that the guide cannot accept, and the traveler is told to choose another guide.
  - The server refuses bookings on a trip whose guide has not accepted (`bookings.service.ts`).
  - My Trips shows "Waiting for guide reply (by time)", "Guide accepted" or "Guide declined", plus a **Continue booking** button. It reopens the saved plan (`/traveler/plan?resumeTripId=ID`). After acceptance, the traveler books and pays from there.
- **Files:** `trips.service.ts`, `trip-permissions.ts`, trip DTOs (`draftPlan`), `trips.data.ts`, `TravelerCreateTripPage.jsx`, `TripForm.jsx`, `TripCard.jsx`, `TripCreationSuccessView.jsx`.
- **Evidence:** a booking before acceptance gives 400 "waiting for the guide". Browser check: waiting banner, then guide accepts, then Continue booking creates the bookings and the trip moves to Pending.

### UX-006 (P2) Budget summary started with a flight price nobody chose
- **Root cause:** the planner pre-selected "SkyHigh Airlines ₹7,800", re-picked a default carrier on every city change, and always added a ₹500 platform fee.
- **Fix:** nothing is pre-selected. The summary starts at ₹0 and adds each item as it is chosen. Choosing a package no longer pre-fills a "Grand <city> Hotel", and changing the destination clears the old hotel. The platform fee is added only after something is picked (`TravelerCreateTripPage.jsx`, `tripCalculations.js`).

### PAY-004 (P2) Traveler payment showed a Cash option
- **Fix:** the traveler payment pop-up offers only UPI and Card (`PaymentModal.jsx`). The server already refused cash from travelers.

### EXP-001 (P2) Booked items could be edited as expenses
- **Root cause:** paid bookings appear as expenses, and the Edit pop-up let the traveler change their price, category and trip.
- **Fix:**
  - Booked rows show "🔒 Booked" instead of Edit.
  - If the edit pop-up is opened for a booking-linked expense, price, trip and category are locked; the category list shows only the booked type.
  - The server refuses price, category or trip changes on booking-linked expenses (`expenses.service.ts`).

### TRIP-010 (P2) Travelers could be added after payment
- **Fix:** once any booking of a trip is paid, the traveler count and passenger list are locked (`trip-permissions.ts`).
- **Evidence:** API check gives 400 "Payment is already complete for this trip, so travelers cannot be added or removed."

### UX-007 (P2) Cancel Trip and 12 other pop-ups were cut off on short screens
- **Fix:** every pop-up box now has a maximum height and scrolls inside. Examples: trip cancel, booking cancel, expense, passenger, support ticket, guide requests and agency pop-ups.
- **Evidence:** the Cancel Trip box is 600 px high inside a 640 px window and scrolls.

---

## 6. Tests changed, and why (no test was weakened)

| Test | Change | Why it is honest |
|---|---|---|
| `front-end/e2e/full-journey.spec.ts` | Uses Devansh's real guide id from the login reply instead of `4`; step 8 now pays the exact price and lets the **guide** start and complete the trip | The old test only passed because of ID-001 and BOOK-001 (traveler set PAID/COMPLETED themselves). It now follows the real business flow and checks more, not less. |
| `realtime.spec.ts` | Adds guide #5 to the fixture; room names now `user:<role>:<id>` | Trips now reject unknown guides (TRIP-005); rooms are role-scoped (RT-001). |
| `trips/backend-fixes.spec.ts`, `bookings/booking-concurrency.spec.ts`, `test/full-lifecycle.integration.spec.ts` | Add the trips/guides the tests refer to | Bookings now require a real trip, trips a real guide. |
| Older guard specs | Set `NODE_ENV=test` first | They test the header-based path, which is now test-only by design. |

- `full-lifecycle.integration.spec.ts` and `e2e/full-journey.spec.ts` (23 Nov, second round): the guide now accepts the trip **before** the booking is made, because of the new owner rule RULE-002. The checks themselves are unchanged.

## 7. New tests added
- `back-end/src/test/audit-regression.e2e-spec.ts` (`npm run test:audit`): 25 HTTP checks that start the real app in non-test mode. **On the original code 12 of 25 fail; now 25 of 25 pass.**
- Scratch scripts used during the audit (not part of the app): defect probes (≈45 checks) and cross-actor workflow script (50 checks). Their results are in `AUTOMATED_TEST_RESULTS.md`.

## 8. Not fixed (on purpose, needs a decision or bigger work)
See `COMPLETE_FUNCTIONAL_AUDIT.md` section "Open defects" and `INVESTOR_DEMO_READINESS.md`. Short list:
- Data is kept in memory and lost on restart; the PostgreSQL path is incomplete.
- Payments are simulated (test mode); no real gateway.
- Guide fee and platform fee shown in the trip budget are never charged.
- Custom-trip hotel and transport prices come from the browser (no server price list).
- 35 backend dependency warnings (16 high), mostly fixed only by moving to NestJS 11.
- Seeded agency passwords are plain text in demo data.
