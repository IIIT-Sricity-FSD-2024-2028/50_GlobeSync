# What Changed From Your Zip

Compared with the zip you sent (`50_GlobeSync-main (3).zip`). 119 code files changed (about 1,900 lines added, 570 removed), plus the new `audit-reports/` folder.
Full line-by-line diff: `audit-fixes.patch` (in the same project-files folder).

## A. New files (6 code files + reports)

| File | What it does |
|---|---|
| `back-end/src/auth/guards/global-auth.guard.ts` | Every private API now needs a valid login token. Before, most data was open to anyone. |
| `back-end/src/auth/identity.util.ts` | Connects a login account to its traveler / guide / agency record, so users can see their own trips and bookings. |
| `back-end/src/trips/trip-permissions.ts` | Rules for who may change what in a trip (for example, only the guide can accept; travelers cannot confirm or complete their own trip). |
| `back-end/src/trips/trip-lifecycle.ts` | Trip confirms itself automatically when all its bookings are paid. |
| `back-end/src/realtime/user-room.ts` | Live notifications go only to the right person (traveler 1 and guide 1 no longer share messages). |
| `back-end/src/test/audit-regression.e2e-spec.ts` | 25 new automatic checks. Run with `npm run test:audit`. |
| `audit-reports/` | All audit reports, evidence logs and test scripts. |

Note: `back-end/src/uploads/storage.service.ts` and `virus-scanner.service.ts` show as "new" in git only because the old `.gitignore` was hiding them. Their content is unchanged.

## B. Back-end changes (most important)

| Area | Files | What changed |
|---|---|---|
| Login | `auth/auth.service.ts`, `auth.controller.ts`, `jwt.strategy.ts`, interfaces | Token carries the correct profile id. Refresh, logout and password reset work without a database. Deactivated staff and unapproved agencies blocked. No duplicate emails across roles. Reset token no longer printed in logs. |
| Access control | `common/guards/roles.guard.ts`, `current-user.decorator.ts`, `admins`, `agency-api`, `packages`, `support-tickets`, `system-config` controllers | Fake `x-user-role` header no longer works (only in unit-test mode). Identity comes only from the login token. |
| Payments | `payments/payments.service.ts`, `payments.controller.ts`, `gateway-payment.service.ts` | Must pay the exact server price. Travelers cannot record cash. Expired holds refused. |
| Bookings | `bookings/bookings.service.ts`, `bookings.controller.ts`, `hold-expiry.service.ts` | Travelers cannot change price or status. Must own the trip to book on it. Guides can no longer list all bookings. |
| Cancellation / refunds | `policy/policy.service.ts` | Cancellation uses the trip start date (before, it always said "already departed"). Refund linked to the real payment and shown to admin/support. |
| Trips | `trips/trips.service.ts`, `trips.controller.ts`, `trips.module.ts` | Date, traveler count, package and guide checks. Cancel trip → bookings cancelled and guide dates freed. Complete trip → bookings completed (so reviews work). |
| Guides | `guides/guide-availability.service.ts`, `guides.service.ts` | No double booking (boundary day counted). Dates released on cancel/decline. Passwords hashed. |
| Travelers | `travelers/travelers.controller.ts`, `travelers.service.ts` | Guides see only their own travelers. Passwords hashed; password change also updates login. |
| Reviews | `reviews/reviews.service.ts` | Review always goes to the trip's real guide. |
| Notifications / live | `notifications/*`, `realtime/*`, `messages.service.ts`, `support-tickets.service.ts`, `agencies.service.ts` | Notifications kept per role; no mix-ups between users. |
| Dashboard | `dashboard/dashboard.service.ts` | "Pending bookings" now counts bookings waiting for payment. |
| Settings | `app.module.ts`, `config/env-validation.ts`, `.env.example`, `main.ts` | Rate limit raised from 120 to 600 per minute (pages were failing with 429). Login works on any localhost port in development. |
| Setup | `package.json`, `.gitignore` (both), `prisma/schema.prisma` | `npm ci` works without errors and generates the Prisma client automatically. Source folder `src/uploads` no longer hidden from git. Database schema valid. New `test:audit` command. |

## C. Front-end changes

| Area | Files | What changed |
|---|---|---|
| API address | `services/api.js` | Notifications address fixed (every page had a 404 before). |
| Payment | `components/bookings/PaymentModal.jsx` | Pays the server price; no longer changes trip status from the browser. |
| Bookings page | `pages/traveler/TravelerBookingsPage.jsx` | Removed hidden shortcut that cancelled without refund rules. Review uses the correct guide. |
| Phone layout | `Navbar.jsx`, `Header.jsx`, `styles/index.css`, `styles/landing.css`, `guide.css`, and about 45 page/component files | Menu button on phones; header wraps; grids and tabs fit 390 px screens. Before, 65 of 66 pages scrolled sideways on a phone. |
| Contact page | `pages/public/ContactPage.jsx` | No longer falsely says "Message Sent!". |
| Accessibility | `LoginPage.jsx`, `TravelerSignupPage.jsx`, `AgencySignupPage.jsx`, `ContactPage.jsx` | Form labels linked to their fields (screen readers). |
| Browser test | `e2e/full-journey.spec.ts` | Uses the real guide id and the real flow (guide completes the trip) instead of relying on bugs. |

## C2. Latest changes (your feedback, 23 Nov 2026)

| What you asked | What changed | Files |
|---|---|---|
| Traveler cannot save Edit Trip | Budget box (which only allowed multiples of 500) removed, so Save works | `components/trips/TripEditModal.jsx` |
| Remove Trip Status from Edit Trip | Removed; status shown read-only | same |
| Budget cannot be changed after booking | Budget removed from the pop-up; server also refuses a traveler budget change | same, `back-end/src/trips/trip-permissions.ts` |
| Trip must start from tomorrow | Today cannot be picked in Create Trip or Edit Trip; server checks it too (rule changed from "24 hours ahead" to "from tomorrow") | `TripForm.jsx`, `TravelerCreateTripPage.jsx`, `trips.service.ts`, `bookings.service.ts` |
| Payment pop-up should fit the screen | Pop-up now fits and scrolls inside (also Edit Trip) | `styles/shared.css`, `TripEditModal.jsx` |
| Show "trip cancelled" in Bookings | Red "Trip cancelled" tag; Pay Now hidden | `components/bookings/BookingList.jsx` |

## C3. Second round of your feedback (24 Nov 2026)

| What you asked | What changed |
|---|---|
| Cancel Trip pop-up did not fit | It fits and scrolls inside. Same fix for 12 other pop-ups. |
| Budget summary showed SkyHigh price at start | It starts at ₹0 and adds items as you pick them. |
| Remove Cash payment | Traveler sees only UPI and Card. |
| Can't edit ticket price or category in Edit Expense | Booked items are locked ("🔒 Booked"); only the booked category is shown. |
| Can't add persons after payment | Traveler count is locked once a booking is paid. |
| Guide must accept first (within 3 hours), trip saved as draft, resume later | New flow: draft trip, then the guide request (3 hours), then **Continue booking** in My Trips after the guide accepts. Booking is blocked until then. |

## D. Tests changed (none weakened)
`realtime.spec.ts`, `backend-fixes.spec.ts`, `booking-concurrency.spec.ts`, `full-lifecycle.integration.spec.ts`, and 5 guard/service specs: test data updated to match the new safety rules (for example, a guide must exist before a trip can use them). Reasons are in `FIXES_IMPLEMENTED.md` section 6.

## E. Not changed
- Look and design of the pages (colours, layout on desktop).
- Business rules such as the refund percentages and 12-hour cut-off.
- Seed demo data and demo accounts.
